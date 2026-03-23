import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  const url = new URL(req.url);
  if (url.pathname.endsWith('/health')) {
    return new Response(JSON.stringify({ status: 'healthy', function: 'run-vitest' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Validate JWT - admin only
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user is admin
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    const body = await req.json().catch(() => ({}));
    const filter = body.filter || '';

    // Note: In Deno edge functions, we cannot directly run npx/vitest.
    // Instead, this function acts as a test orchestrator that records
    // the intent and returns a command for the admin to execute,
    // or runs predefined validation checks.

    const startTime = Date.now();
    const validationResults = await runValidationChecks(supabase);
    const duration = Date.now() - startTime;

    const result = {
      totalTests: validationResults.total,
      passed: validationResults.passed,
      failed: validationResults.failed,
      skipped: 0,
      durationMs: duration,
      details: validationResults.details,
      cliCommand: filter 
        ? `npx vitest run --reporter=json ${filter}` 
        : 'npx vitest run --reporter=json',
      note: 'Validation checks ran in-edge. For full Vitest suite, use the CLI command above.',
    };

    // Store results
    await supabase.from('test_run_results').insert({
      run_type: 'vitest',
      total_tests: result.totalTests,
      passed: result.passed,
      failed: result.failed,
      skipped: 0,
      duration_ms: result.durationMs,
      results: result,
      triggered_by: user.id,
    });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function runValidationChecks(supabase: ReturnType<typeof createClient>) {
  const details: Array<{ name: string; passed: boolean; message: string }> = [];

  // Check 1: Database connectivity
  try {
    const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    details.push({ name: 'Database Connectivity', passed: !error, message: error ? error.message : `Connected, ${count} profiles` });
  } catch (e) {
    details.push({ name: 'Database Connectivity', passed: false, message: String(e) });
  }

  // Check 2: System errors table accessible
  try {
    const { error } = await supabase.from('system_errors').select('id').limit(1);
    details.push({ name: 'System Errors Table', passed: !error, message: error ? error.message : 'Accessible' });
  } catch (e) {
    details.push({ name: 'System Errors Table', passed: false, message: String(e) });
  }

  // Check 3: User roles table integrity
  try {
    const { data, error } = await supabase.from('user_roles').select('role').limit(10);
    details.push({ name: 'User Roles Table', passed: !error, message: error ? error.message : `${data?.length || 0} roles found` });
  } catch (e) {
    details.push({ name: 'User Roles Table', passed: false, message: String(e) });
  }

  // Check 4: Test run results table
  try {
    const { error } = await supabase.from('test_run_results').select('id').limit(1);
    details.push({ name: 'Test Results Table', passed: !error, message: error ? error.message : 'Accessible' });
  } catch (e) {
    details.push({ name: 'Test Results Table', passed: false, message: String(e) });
  }

  // Check 5: Edge function health logs
  try {
    const { error } = await supabase.from('edge_function_health_logs').select('id').limit(1);
    details.push({ name: 'Edge Function Health Logs', passed: !error, message: error ? error.message : 'Accessible' });
  } catch (e) {
    details.push({ name: 'Edge Function Health Logs', passed: false, message: String(e) });
  }

  // Check 6: Error patterns table
  try {
    const { error } = await supabase.from('error_patterns').select('id').limit(1);
    details.push({ name: 'Error Patterns Table', passed: !error, message: error ? error.message : 'Accessible' });
  } catch (e) {
    details.push({ name: 'Error Patterns Table', passed: false, message: String(e) });
  }

  return {
    total: details.length,
    passed: details.filter(d => d.passed).length,
    failed: details.filter(d => !d.passed).length,
    details,
  };
}
