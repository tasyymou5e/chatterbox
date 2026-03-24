import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
import { getServiceClient } from '../_shared/auth-validator.ts';
import { validateSchedulerSecret, createSchedulerUnauthorizedResponse } from '../_shared/scheduler-validator.ts';

interface ProviderHealthResult {
  provider_key: string;
  previous_status: string | null;
  new_status: 'healthy' | 'unhealthy';
  response_time_ms: number;
  error_message?: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  // Health check endpoint (unauthenticated for monitoring probes)
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ status: 'healthy', function: 'scheduled-health-check' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Validate scheduler secret for cron-triggered POST requests
  if (!validateSchedulerSecret(req)) {
    return createSchedulerUnauthorizedResponse(corsHeaders);
  }
  }

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    console.log('Starting scheduled health check for all LLM providers');
    
    const adminClient = getServiceClient();
    
    // Get all active providers with API keys configured
    const { data: providers, error: providersError } = await adminClient
      .from('llm_providers')
      .select('provider_key, display_name, api_endpoint, health_status, api_key_configured')
      .eq('is_active', true)
      .eq('api_key_configured', true);

    if (providersError) {
      console.error('Failed to fetch providers:', providersError);
      return json({ error: 'Failed to fetch providers' }, 500);
    }

    if (!providers || providers.length === 0) {
      console.log('No active providers with API keys configured');
      return json({ message: 'No providers to check', checked: 0 });
    }

    console.log(`Checking ${providers.length} providers`);

    const results: ProviderHealthResult[] = [];
    const statusChanges: ProviderHealthResult[] = [];

    // Check each provider
    for (const provider of providers) {
      const startTime = Date.now();
      let newStatus: 'healthy' | 'unhealthy' = 'unhealthy';
      let errorMessage: string | undefined;

      try {
        // Get API key from environment
        const secretName = `LLM_${provider.provider_key.toUpperCase()}_API_KEY`;
        const apiKey = Deno.env.get(secretName);

        if (!apiKey) {
          errorMessage = 'API key not found in environment';
          console.log(`${provider.provider_key}: ${errorMessage}`);
        } else {
          // Test the endpoint
          const testEndpoint = `${provider.api_endpoint}/models`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

          try {
            const response = await fetch(testEndpoint, {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
              },
              signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
              newStatus = 'healthy';
              console.log(`${provider.provider_key}: healthy`);
            } else {
              const errorText = await response.text();
              errorMessage = `API returned ${response.status}: ${errorText.slice(0, 200)}`;
              console.log(`${provider.provider_key}: unhealthy - ${errorMessage}`);
            }
          } catch (fetchError) {
            clearTimeout(timeoutId);
            if (fetchError instanceof Error && fetchError.name === 'AbortError') {
              errorMessage = 'Request timed out after 10 seconds';
            } else {
              errorMessage = fetchError instanceof Error ? fetchError.message : 'Connection failed';
            }
            console.log(`${provider.provider_key}: unhealthy - ${errorMessage}`);
          }
        }
      } catch (e) {
        errorMessage = e instanceof Error ? e.message : 'Unknown error';
        console.error(`${provider.provider_key}: error - ${errorMessage}`);
      }

      const responseTime = Date.now() - startTime;
      const previousStatus = provider.health_status;

      const result: ProviderHealthResult = {
        provider_key: provider.provider_key,
        previous_status: previousStatus,
        new_status: newStatus,
        response_time_ms: responseTime,
        error_message: errorMessage
      };

      results.push(result);

      // Track status changes
      if (previousStatus !== newStatus) {
        statusChanges.push(result);
      }

      // Update provider status in database
      await adminClient
        .from('llm_providers')
        .update({
          health_status: newStatus,
          last_health_check: new Date().toISOString()
        })
        .eq('provider_key', provider.provider_key);

      // Also update llm_provider_status table for failover system
      await adminClient
        .from('llm_provider_status')
        .upsert({
          provider_key: provider.provider_key,
          is_healthy: newStatus === 'healthy',
          failure_count: newStatus === 'unhealthy' ? 1 : 0,
          last_failure_at: newStatus === 'unhealthy' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        }, { onConflict: 'provider_key' });

      // Log the health check result
      await adminClient
        .from('llm_health_check_logs')
        .insert({
          provider_key: provider.provider_key,
          check_type: 'scheduled',
          previous_status: previousStatus,
          new_status: newStatus,
          response_time_ms: responseTime,
          error_message: errorMessage,
          metadata: {
            display_name: provider.display_name,
            api_endpoint: provider.api_endpoint
          }
        });
    }

    // Log summary
    const healthyCount = results.filter(r => r.new_status === 'healthy').length;
    const unhealthyCount = results.filter(r => r.new_status === 'unhealthy').length;
    
    console.log(`Health check complete: ${healthyCount} healthy, ${unhealthyCount} unhealthy, ${statusChanges.length} status changes`);

    return json({
      success: true,
      checked: results.length,
      healthy: healthyCount,
      unhealthy: unhealthyCount,
      statusChanges: statusChanges.length,
      results: results.map(r => ({
        provider: r.provider_key,
        status: r.new_status,
        responseTime: r.response_time_ms,
        changed: r.previous_status !== r.new_status
      }))
    });

  } catch (error) {
    console.error('Scheduled health check error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
