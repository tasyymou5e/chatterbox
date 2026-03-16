import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from '../_shared/cors.ts';
import { validateJWT, createUnauthorizedResponse } from '../_shared/auth-validator.ts';

interface FailoverConfig {
  id: string;
  primary_provider_key: string;
  backup_provider_key: string;
  priority: number;
  trigger_on_rate_limit: boolean;
  trigger_on_timeout: boolean;
  trigger_on_error: boolean;
  timeout_threshold_ms: number;
  max_retries_before_failover: number;
  cooldown_seconds: number;
  is_active: boolean;
}

interface LLMCallRequest {
  provider: string;
  model: string;
  messages: Array<{ role: string; content: string }>;
  max_tokens?: number;
  temperature?: number;
  function_name?: string;
}

interface ProviderConfig {
  provider_key: string;
  api_endpoint: string;
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint (unauthenticated for monitoring)
  const url = new URL(req.url);
  if (url.pathname.endsWith('/health')) {
    return new Response(JSON.stringify({ status: 'healthy' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Require authentication for LLM calls (prevents abuse/cost exposure)
  const authResult = await validateJWT(req);
  if (!authResult.success) {
    console.warn('LLM call rejected: unauthorized access attempt');
    return createUnauthorizedResponse(authResult.error || 'Authentication required', corsHeaders);
  }

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json() as LLMCallRequest;
    const { provider, model, messages, max_tokens = 1024, temperature = 0.7, function_name = 'unknown' } = body;

    if (!provider || !model || !messages) {
      return json({ error: 'Missing required fields: provider, model, messages' }, 400);
    }

    console.log(`User ${authResult.userId} calling LLM provider: ${provider}, model: ${model}`);

    // Get failover configurations for this provider
    const { data: failoverConfigs } = await supabase
      .from('llm_failover_config')
      .select('id, primary_provider_key, backup_provider_key, priority, trigger_on_rate_limit, trigger_on_timeout, trigger_on_error, timeout_threshold_ms, max_retries_before_failover, cooldown_seconds, is_active')
      .eq('primary_provider_key', provider)
      .eq('is_active', true)
      .order('priority', { ascending: true });

    // Check if primary provider is in cooldown
    const { data: providerStatus } = await supabase
      .from('llm_provider_status')
      .select('provider_key, is_healthy, failure_count, cooldown_until, last_failure_at, updated_at')
      .eq('provider_key', provider)
      .single();

    const isInCooldown = providerStatus?.cooldown_until && 
      new Date(providerStatus.cooldown_until) > new Date();

    // If in cooldown and we have failover configs, use backup directly
    let effectiveProvider = provider;
    let usedFailover = false;
    let failoverConfig: FailoverConfig | null = null;

    if (isInCooldown && failoverConfigs && failoverConfigs.length > 0) {
      effectiveProvider = failoverConfigs[0].backup_provider_key;
      failoverConfig = failoverConfigs[0] as FailoverConfig;
      usedFailover = true;
      console.log(`Provider ${provider} in cooldown, using backup: ${effectiveProvider}`);
    }

    // Get provider configuration
    const { data: providerConfig } = await supabase
      .from('llm_providers')
      .select('provider_key, api_endpoint')
      .eq('provider_key', effectiveProvider)
      .single();

    if (!providerConfig) {
      return json({ error: `Provider ${effectiveProvider} not found` }, 404);
    }

    // Get API key from environment
    const secretName = `LLM_${effectiveProvider.toUpperCase()}_API_KEY`;
    const apiKey = Deno.env.get(secretName);

    if (!apiKey) {
      return json({ error: `API key not configured for ${effectiveProvider}` }, 500);
    }

    // Make the LLM call with timeout
    const startTime = Date.now();
    let response: Response | null = null;
    let error: Error | null = null;
    let triggerReason: string | null = null;

    try {
      const timeoutMs = failoverConfig?.timeout_threshold_ms || 30000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      response = await fetch(`${providerConfig.api_endpoint}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens,
          temperature
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Check for rate limit
      if (response.status === 429) {
        triggerReason = 'rate_limit';
        error = new Error('Rate limit exceeded');
      } else if (!response.ok) {
        triggerReason = 'error';
        const errorText = await response.text();
        error = new Error(`API error ${response.status}: ${errorText}`);
      }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') {
        triggerReason = 'timeout';
        error = new Error('Request timeout');
      } else {
        triggerReason = 'error';
        error = e instanceof Error ? e : new Error('Unknown error');
      }
    }

    const responseTime = Date.now() - startTime;

    // Handle failover if there was an error
    if (error && !usedFailover && failoverConfigs && failoverConfigs.length > 0) {
      const config = failoverConfigs[0] as FailoverConfig;
      
      // Check if this trigger type is enabled
      const shouldFailover = (
        (triggerReason === 'rate_limit' && config.trigger_on_rate_limit) ||
        (triggerReason === 'timeout' && config.trigger_on_timeout) ||
        (triggerReason === 'error' && config.trigger_on_error)
      );

      if (shouldFailover) {
        console.log(`Triggering failover from ${provider} to ${config.backup_provider_key} due to ${triggerReason}`);

        // Update provider status
        await supabase
          .from('llm_provider_status')
          .upsert({
            provider_key: provider,
            is_healthy: false,
            last_failure_at: new Date().toISOString(),
            failure_count: (providerStatus?.failure_count || 0) + 1,
            cooldown_until: new Date(Date.now() + config.cooldown_seconds * 1000).toISOString(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'provider_key' });

        // Get backup provider config
        const { data: backupConfig } = await supabase
          .from('llm_providers')
          .select('provider_key, api_endpoint')
          .eq('provider_key', config.backup_provider_key)
          .single();

        if (backupConfig) {
          const backupSecretName = `LLM_${config.backup_provider_key.toUpperCase()}_API_KEY`;
          const backupApiKey = Deno.env.get(backupSecretName);

          if (backupApiKey) {
            const backupStartTime = Date.now();
            let backupSuccess = false;
            let backupResponse: Response | null = null;

            try {
              backupResponse = await fetch(`${backupConfig.api_endpoint}/chat/completions`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${backupApiKey}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  model,
                  messages,
                  max_tokens,
                  temperature
                })
              });

              backupSuccess = backupResponse.ok;
            } catch (e) {
              console.error('Backup provider also failed:', e);
            }

            const backupResponseTime = Date.now() - backupStartTime;

            // Log failover event
            await supabase
              .from('llm_failover_events')
              .insert({
                config_id: config.id,
                primary_provider: provider,
                backup_provider: config.backup_provider_key,
                trigger_reason: triggerReason,
                original_error: error.message,
                backup_success: backupSuccess,
                response_time_ms: backupResponseTime
              });

            // Log the API call
            await supabase
              .from('llm_api_calls')
              .insert({
                provider: config.backup_provider_key,
                model,
                function_name: `${function_name} (failover)`,
                status: backupSuccess ? 'success' : 'error',
                response_time_ms: backupResponseTime,
                error_message: backupSuccess ? null : 'Backup provider failed'
              });

            if (backupSuccess && backupResponse) {
              const data = await backupResponse.json();
              return json({
                ...data,
                _failover: {
                  occurred: true,
                  from: provider,
                  to: config.backup_provider_key,
                  reason: triggerReason
                }
              });
            }
          }
        }

        // Both providers failed
        return json({ 
          error: 'All providers failed', 
          primary_error: error.message,
          failover_attempted: true 
        }, 503);
      }
    }

    // No failover or primary succeeded
    if (error) {
      // Log the failed call
      await supabase
        .from('llm_api_calls')
        .insert({
          provider: effectiveProvider,
          model,
          function_name,
          status: 'error',
          response_time_ms: responseTime,
          error_message: error.message
        });

      return json({ error: error.message }, 500);
    }

    // Success - parse and return response
    const data = await response!.json();
    
    // Log successful call
    const totalTokens = data.usage?.total_tokens || 0;
    await supabase
      .from('llm_api_calls')
      .insert({
        provider: effectiveProvider,
        model,
        function_name,
        input_tokens: data.usage?.prompt_tokens || 0,
        output_tokens: data.usage?.completion_tokens || 0,
        total_tokens: totalTokens,
        status: 'success',
        response_time_ms: responseTime
      });

    // Reset provider status if it was failing before
    if (providerStatus && !providerStatus.is_healthy) {
      await supabase
        .from('llm_provider_status')
        .update({
          is_healthy: true,
          failure_count: 0,
          cooldown_until: null,
          updated_at: new Date().toISOString()
        })
        .eq('provider_key', effectiveProvider);
    }

    return json({
      ...data,
      _failover: usedFailover ? {
        occurred: true,
        from: provider,
        to: effectiveProvider,
        reason: 'cooldown'
      } : undefined
    });

  } catch (error) {
    console.error('LLM call with failover error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
