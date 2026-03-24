import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from '../_shared/cors.ts';
import { adminActionLimiter, RateLimiter } from '../_shared/rate-limiter.ts';
import { validateJWT, getServiceClient } from '../_shared/auth-validator.ts';

interface IntegrationStatus {
  provider: string;
  displayName: string;
  configured: boolean;
  lastChecked: string | null;
  healthy: boolean | null;
  models: string[];
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Apply rate limiting
  const rateCheck = adminActionLimiter.check(req);
  if (!rateCheck.allowed) {
    console.warn('Rate limit exceeded for api-integration-status');
    return RateLimiter.createRateLimitResponse(rateCheck.resetTime);
  }

  try {
    const json = (payload: unknown, status = 200) =>
      new Response(JSON.stringify(payload), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    // Validate JWT using getClaims() - local verification with asymmetric keys
    const auth = await validateJWT(req);
    if (!auth.success || !auth.userId) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const user = { id: auth.userId, email: auth.email };

    // Verify admin role using service role (avoids any RLS/RPC edge-cases)
    const adminClient = getServiceClient();

    const { data: roles, error: rolesError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'read_only'])
      .limit(1);

    if (rolesError) {
      console.error('Role lookup failed:', rolesError);
      return json({ error: 'Role lookup failed' }, 500);
    }

    const hasAdminRole = roles && roles.length > 0;
    console.log(`[api-integration-status] user=${user.id.slice(0, 8)}… role_found=${hasAdminRole}`);

    if (!hasAdminRole) {
      return json({ error: 'Admin access required' }, 403);
    }

    const { action, provider } = await req.json();

    // Check which API keys are configured
    const grokKey = Deno.env.get('GROK_API_KEY');
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const lovableKey = Deno.env.get('LOVABLE_API_KEY');

    const integrations: IntegrationStatus[] = [
      {
        provider: 'grok',
        displayName: 'Grok (xAI)',
        configured: !!grokKey && grokKey.length > 10,
        lastChecked: null,
        healthy: null,
        models: ['grok-3', 'grok-3-mini', 'grok-2-audio']
      },
      {
        provider: 'openai',
        displayName: 'OpenAI',
        configured: !!openaiKey && openaiKey.length > 10,
        lastChecked: null,
        healthy: null,
        models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']
      },
      {
        provider: 'lovable',
        displayName: 'Lovable AI Gateway',
        configured: !!lovableKey && lovableKey.length > 10,
        lastChecked: null,
        healthy: null,
        models: ['google/gemini-2.5-flash', 'openai/gpt-5']
      }
    ];

    if (action === 'status') {
      console.log('Returning integration status');
      return new Response(
        JSON.stringify({ integrations }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'test' && provider) {
      console.log(`Testing integration: ${provider}`);
      
      let healthy = false;
      let error = null;

      try {
        if (provider === 'grok' && grokKey) {
          // Test Grok API with a simple models list call
          const response = await fetch('https://api.x.ai/v1/models', {
            headers: { 'Authorization': `Bearer ${grokKey}` }
          });
          healthy = response.ok;
          if (!response.ok) {
            error = `API returned ${response.status}`;
          }
        } else if (provider === 'openai' && openaiKey) {
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: { 'Authorization': `Bearer ${openaiKey}` }
          });
          healthy = response.ok;
          if (!response.ok) {
            error = `API returned ${response.status}`;
          }
        } else if (provider === 'lovable' && lovableKey) {
          // Test Lovable AI Gateway
          const response = await fetch('https://ai.gateway.lovable.dev/v1/models', {
            headers: { 'Authorization': `Bearer ${lovableKey}` }
          });
          healthy = response.ok;
          if (!response.ok) {
            error = `API returned ${response.status}`;
          }
        } else {
          error = 'Provider not configured';
        }
      } catch (e) {
        error = e instanceof Error ? e.message : 'Connection failed';
      }

      // Log the test result
      await adminClient.from('llm_api_calls').insert({
        provider,
        model: 'health-check',
        function_name: 'api-integration-status',
        status: healthy ? 'success' : 'error',
        error_message: error,
        user_id: user.id,
        response_time_ms: 0
      });

      return new Response(
        JSON.stringify({ 
          provider, 
          healthy, 
          error,
          lastChecked: new Date().toISOString()
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ integrations }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('API integration status error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
