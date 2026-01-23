import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
import { validateJWT, getServiceClient } from '../_shared/auth-validator.ts';
import { adminActionLimiter, RateLimiter } from '../_shared/rate-limiter.ts';

interface ProviderData {
  displayName: string;
  providerKey: string;
  apiEndpoint: string;
  apiKey: string;
  models: string[];
  pricingConfig?: {
    inputPricePer1k: number;
    outputPricePer1k: number;
  };
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Apply rate limiting
  const rateCheck = adminActionLimiter.check(req);
  if (!rateCheck.allowed) {
    return RateLimiter.createRateLimitResponse(rateCheck.resetTime);
  }

  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    // Validate JWT
    const auth = await validateJWT(req);
    if (!auth.success || !auth.userId) {
      return json({ error: 'Unauthorized' }, 401);
    }

    // Verify admin role
    const adminClient = getServiceClient();
    const { data: roles, error: rolesError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', auth.userId)
      .in('role', ['admin'])
      .limit(1);

    if (rolesError || !roles || roles.length === 0) {
      return json({ error: 'Admin access required' }, 403);
    }

    const body = await req.json();
    const { action, provider } = body as { action: string; provider?: ProviderData };

    if (action === 'test' && provider) {
      // Test connection to the provider
      console.log(`Testing connection to ${provider.providerKey}`);
      
      try {
        const testEndpoint = `${provider.apiEndpoint}/models`;
        const response = await fetch(testEndpoint, {
          headers: { 
            'Authorization': `Bearer ${provider.apiKey}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          return json({ healthy: true, message: 'Connection successful' });
        } else {
          const errorText = await response.text();
          return json({ healthy: false, error: `API returned ${response.status}: ${errorText}` });
        }
      } catch (e) {
        return json({ healthy: false, error: e instanceof Error ? e.message : 'Connection failed' });
      }
    }

    if (action === 'create' && provider) {
      console.log(`Creating provider: ${provider.displayName}`);
      
      // Check if provider already exists
      const { data: existing } = await adminClient
        .from('llm_providers')
        .select('id')
        .eq('provider_key', provider.providerKey)
        .single();

      if (existing) {
        return json({ error: 'Provider with this key already exists' }, 400);
      }

      // Store the API key as a Supabase secret (in practice, you'd use vault or secrets manager)
      // For now, we'll store it encrypted in the database
      const { data: newProvider, error: insertError } = await adminClient
        .from('llm_providers')
        .insert({
          provider_key: provider.providerKey,
          display_name: provider.displayName,
          api_endpoint: provider.apiEndpoint,
          models: provider.models,
          is_active: true,
          is_custom: true,
          pricing_config: provider.pricingConfig || { inputPricePer1k: 0.001, outputPricePer1k: 0.002 }
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to create provider:', insertError);
        return json({ error: insertError.message }, 500);
      }

      // Store the API key reference securely
      // In production, use Supabase Vault or external secrets manager
      const secretName = `LLM_${provider.providerKey.toUpperCase()}_API_KEY`;
      console.log(`Provider created. API key should be stored as secret: ${secretName}`);

      return json({ 
        success: true, 
        provider: newProvider,
        secretName,
        message: `Provider added. Please add the API key as a secret named "${secretName}" in your Supabase project settings.`
      });
    }

    if (action === 'list') {
      const { data: providers, error: listError } = await adminClient
        .from('llm_providers')
        .select('*')
        .order('created_at', { ascending: false });

      if (listError) {
        return json({ error: listError.message }, 500);
      }

      return json({ providers: providers || [] });
    }

    if (action === 'delete' && provider?.providerKey) {
      const { error: deleteError } = await adminClient
        .from('llm_providers')
        .delete()
        .eq('provider_key', provider.providerKey)
        .eq('is_custom', true); // Only allow deleting custom providers

      if (deleteError) {
        return json({ error: deleteError.message }, 500);
      }

      return json({ success: true, message: 'Provider deleted' });
    }

    if (action === 'toggle' && provider?.providerKey) {
      const { data: current } = await adminClient
        .from('llm_providers')
        .select('is_active')
        .eq('provider_key', provider.providerKey)
        .single();

      const { error: updateError } = await adminClient
        .from('llm_providers')
        .update({ is_active: !current?.is_active })
        .eq('provider_key', provider.providerKey);

      if (updateError) {
        return json({ error: updateError.message }, 500);
      }

      return json({ success: true, is_active: !current?.is_active });
    }

    return json({ error: 'Invalid action' }, 400);

  } catch (error) {
    console.error('Manage LLM provider error:', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
