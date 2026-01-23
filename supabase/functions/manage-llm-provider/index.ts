import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from '../_shared/cors.ts';
import { validateJWT, getServiceClient } from '../_shared/auth-validator.ts';
import { adminActionLimiter, RateLimiter } from '../_shared/rate-limiter.ts';

interface ProviderData {
  displayName?: string;
  providerKey: string;
  apiEndpoint?: string;
  apiKey?: string;
  models?: string[];
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

    // Test connection to a provider
    if (action === 'test' && provider) {
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

    // Health check for configured providers (uses stored secret)
    if (action === 'health_check' && provider?.providerKey) {
      console.log(`Health check for ${provider.providerKey}`);
      
      try {
        // Get provider details
        const { data: providerData, error: providerError } = await adminClient
          .from('llm_providers')
          .select('*')
          .eq('provider_key', provider.providerKey)
          .single();

        if (providerError || !providerData) {
          return json({ healthy: false, error: 'Provider not found' });
        }

        // Get API key from environment
        const secretName = `LLM_${provider.providerKey.toUpperCase()}_API_KEY`;
        const apiKey = Deno.env.get(secretName);

        if (!apiKey) {
          // Update provider status
          await adminClient
            .from('llm_providers')
            .update({ 
              health_status: 'unhealthy',
              last_health_check: new Date().toISOString(),
              api_key_configured: false
            })
            .eq('provider_key', provider.providerKey);

          return json({ healthy: false, error: 'API key not configured' });
        }

        // Test the endpoint
        const testEndpoint = `${providerData.api_endpoint}/models`;
        const response = await fetch(testEndpoint, {
          headers: { 
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        });

        const isHealthy = response.ok;
        
        // Update provider status
        await adminClient
          .from('llm_providers')
          .update({ 
            health_status: isHealthy ? 'healthy' : 'unhealthy',
            last_health_check: new Date().toISOString()
          })
          .eq('provider_key', provider.providerKey);

        if (isHealthy) {
          return json({ healthy: true, message: 'Provider is healthy' });
        } else {
          const errorText = await response.text();
          return json({ healthy: false, error: `API returned ${response.status}: ${errorText}` });
        }
      } catch (e) {
        // Update provider status on error
        await adminClient
          .from('llm_providers')
          .update({ 
            health_status: 'unhealthy',
            last_health_check: new Date().toISOString()
          })
          .eq('provider_key', provider.providerKey);

        return json({ healthy: false, error: e instanceof Error ? e.message : 'Health check failed' });
      }
    }

    // Update API key for a provider
    if (action === 'update_api_key' && provider?.providerKey && provider?.apiKey) {
      console.log(`Updating API key for ${provider.providerKey}`);
      
      // Store the secret name for reference
      const secretName = `LLM_${provider.providerKey.toUpperCase()}_API_KEY`;
      
      // Test the key before marking as configured
      const { data: providerData } = await adminClient
        .from('llm_providers')
        .select('api_endpoint')
        .eq('provider_key', provider.providerKey)
        .single();

      if (providerData) {
        try {
          const testEndpoint = `${providerData.api_endpoint}/models`;
          const response = await fetch(testEndpoint, {
            headers: { 
              'Authorization': `Bearer ${provider.apiKey}`,
              'Content-Type': 'application/json'
            }
          });

          const isValid = response.ok;
          
          // Update provider to mark API key as configured
          const { error: updateError } = await adminClient
            .from('llm_providers')
            .update({ 
              api_key_configured: true,
              health_status: isValid ? 'healthy' : 'unchecked',
              last_health_check: new Date().toISOString()
            })
            .eq('provider_key', provider.providerKey);

          if (updateError) {
            return json({ error: updateError.message }, 500);
          }

          return json({ 
            success: true, 
            secretName,
            message: `API key validated. Please add it as a secret named "${secretName}" in your Supabase project settings.`,
            keyValid: isValid
          });
        } catch (e) {
          // Key couldn't be validated but we still mark it as configured
          await adminClient
            .from('llm_providers')
            .update({ 
              api_key_configured: true,
              health_status: 'unchecked'
            })
            .eq('provider_key', provider.providerKey);

          return json({ 
            success: true, 
            secretName,
            message: `Please add the API key as a secret named "${secretName}" in your Supabase project settings.`,
            keyValid: false,
            warning: 'Could not validate key: ' + (e instanceof Error ? e.message : 'Unknown error')
          });
        }
      }

      return json({ error: 'Provider not found' }, 404);
    }

    // Create new provider
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

      const { data: newProvider, error: insertError } = await adminClient
        .from('llm_providers')
        .insert({
          provider_key: provider.providerKey,
          display_name: provider.displayName,
          api_endpoint: provider.apiEndpoint,
          models: provider.models,
          is_active: true,
          is_custom: true,
          pricing_config: provider.pricingConfig || { inputPricePer1k: 0.001, outputPricePer1k: 0.002 },
          api_key_configured: false
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to create provider:', insertError);
        return json({ error: insertError.message }, 500);
      }

      const secretName = `LLM_${provider.providerKey.toUpperCase()}_API_KEY`;
      console.log(`Provider created. API key should be stored as secret: ${secretName}`);

      return json({ 
        success: true, 
        provider: newProvider,
        secretName,
        message: `Provider added. Please configure the API key.`
      });
    }

    // Update existing provider
    if (action === 'update' && provider?.providerKey) {
      console.log(`Updating provider: ${provider.providerKey}`);
      
      const updateData: Record<string, unknown> = {};
      
      if (provider.displayName) updateData.display_name = provider.displayName;
      if (provider.apiEndpoint) updateData.api_endpoint = provider.apiEndpoint;
      if (provider.models) updateData.models = provider.models;
      if (provider.pricingConfig) updateData.pricing_config = provider.pricingConfig;
      updateData.updated_at = new Date().toISOString();

      const { data: updated, error: updateError } = await adminClient
        .from('llm_providers')
        .update(updateData)
        .eq('provider_key', provider.providerKey)
        .eq('is_custom', true) // Only allow updating custom providers
        .select()
        .single();

      if (updateError) {
        return json({ error: updateError.message }, 500);
      }

      if (!updated) {
        return json({ error: 'Provider not found or is not a custom provider' }, 404);
      }

      return json({ success: true, provider: updated });
    }

    // List all providers
    if (action === 'list') {
      const { data: providers, error: listError } = await adminClient
        .from('llm_providers')
        .select('*')
        .order('is_custom', { ascending: true })
        .order('display_name', { ascending: true });

      if (listError) {
        return json({ error: listError.message }, 500);
      }

      return json({ providers: providers || [] });
    }

    // Delete custom provider
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

    // Toggle provider active status
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
