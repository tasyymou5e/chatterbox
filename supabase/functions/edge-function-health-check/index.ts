import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { getCorsHeaders } from '../_shared/cors.ts'

/**
 * Edge Function Health Check
 * 
 * Tests all edge functions periodically and logs results.
 * Creates alerts when functions are unavailable or responding slowly.
 */

interface FunctionConfig {
  name: string;
  hasHealthEndpoint: boolean;
}

interface HealthCheckResult {
  functionName: string;
  status: 'healthy' | 'unhealthy' | 'timeout' | 'unknown';
  responseTimeMs: number;
  errorMessage: string | null;
  httpStatusCode: number | null;
}

interface AlertConfig {
  function_name: string;
  response_time_threshold_ms: number;
  consecutive_failures_threshold: number;
  is_enabled: boolean;
}

// List of all edge functions to check
const EDGE_FUNCTIONS: FunctionConfig[] = [
  { name: 'admin-add-family-member', hasHealthEndpoint: false },
  { name: 'admin-create-user', hasHealthEndpoint: false },
  { name: 'admin-remove-family-member', hasHealthEndpoint: false },
  { name: 'admin-update-user', hasHealthEndpoint: false },
  { name: 'api-integration-status', hasHealthEndpoint: false },
  { name: 'cleanup-test-families', hasHealthEndpoint: false },
  { name: 'create-child-account', hasHealthEndpoint: false },
  { name: 'create-test-family', hasHealthEndpoint: false },
  { name: 'delete-family-comprehensive', hasHealthEndpoint: false },
  { name: 'error-collector', hasHealthEndpoint: false },
  { name: 'grok-chat', hasHealthEndpoint: false },
  { name: 'llm-with-failover', hasHealthEndpoint: true },
  { name: 'manage-llm-provider', hasHealthEndpoint: false },
  { name: 'process-recurring-chores', hasHealthEndpoint: false },
  { name: 'scheduled-health-check', hasHealthEndpoint: false },
  { name: 'security-monitoring', hasHealthEndpoint: true },
  { name: 'security-testing', hasHealthEndpoint: true },
  { name: 'send-family-email', hasHealthEndpoint: false },
  { name: 'supabase-analytics-query', hasHealthEndpoint: false },
  { name: 'text-to-speech', hasHealthEndpoint: false },
  { name: 'update-site-settings', hasHealthEndpoint: false },
];

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://lxuqfgbukrrickanmmic.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const FUNCTION_TIMEOUT_MS = 10000; // 10 second timeout

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint for this function itself
  const url = new URL(req.url);
  if (url.searchParams.get('health') === 'true' || url.pathname.endsWith('/health')) {
    return new Response(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse request body for options
    let checkType = 'scheduled';
    let specificFunctions: string[] | null = null;
    
    try {
      const body = await req.json();
      checkType = body.checkType || 'scheduled';
      specificFunctions = body.functions || null;
    } catch {
      // No body or invalid JSON, use defaults
    }

    console.log(`[${new Date().toISOString()}] Starting edge function health check (type: ${checkType})`);

    // Get alert configurations
    const { data: alertConfigs } = await supabase
      .from('edge_function_alert_config')
      .select('*');

    const configMap = new Map<string, AlertConfig>();
    const defaultConfig = alertConfigs?.find(c => c.function_name === '_default');
    alertConfigs?.forEach(c => configMap.set(c.function_name, c));

    // Filter functions if specific ones requested
    const functionsToCheck = specificFunctions 
      ? EDGE_FUNCTIONS.filter(f => specificFunctions.includes(f.name))
      : EDGE_FUNCTIONS;

    // Get previous status for each function
    const { data: previousLogs } = await supabase
      .from('edge_function_health_logs')
      .select('function_name, status')
      .in('function_name', functionsToCheck.map(f => f.name))
      .order('created_at', { ascending: false });

    const previousStatusMap = new Map<string, string>();
    previousLogs?.forEach(log => {
      if (!previousStatusMap.has(log.function_name)) {
        previousStatusMap.set(log.function_name, log.status);
      }
    });

    // Check all functions in parallel batches
    const BATCH_SIZE = 5;
    const results: HealthCheckResult[] = [];

    for (let i = 0; i < functionsToCheck.length; i += BATCH_SIZE) {
      const batch = functionsToCheck.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(func => checkFunctionHealth(func))
      );
      results.push(...batchResults);
    }

    // Log results and create alerts
    const alertsCreated: string[] = [];
    const recoveries: string[] = [];

    for (const result of results) {
      const previousStatus = previousStatusMap.get(result.functionName);
      const config = configMap.get(result.functionName) || defaultConfig;

      // Insert health log
      await supabase.from('edge_function_health_logs').insert({
        function_name: result.functionName,
        status: result.status,
        response_time_ms: result.responseTimeMs,
        error_message: result.errorMessage,
        check_type: checkType,
        previous_status: previousStatus || null,
        http_status_code: result.httpStatusCode,
        metadata: {
          threshold_ms: config?.response_time_threshold_ms,
          consecutive_threshold: config?.consecutive_failures_threshold,
        }
      });

      // Check if we need to create an alert
      if (config?.is_enabled !== false) {
        // Check for slow response
        if (result.status === 'healthy' && 
            result.responseTimeMs > (config?.response_time_threshold_ms || 5000)) {
          await createAlert(supabase, {
            functionName: result.functionName,
            type: 'slow_response',
            severity: 'warning',
            responseTimeMs: result.responseTimeMs,
            threshold: config?.response_time_threshold_ms || 5000,
          });
          alertsCreated.push(`${result.functionName} (slow)`);
        }

        // Check for failures
        if (result.status === 'unhealthy' || result.status === 'timeout') {
          // Get consecutive failure count
          const { data: failureCount } = await supabase.rpc('get_consecutive_failures', {
            p_function_name: result.functionName
          });

          if (failureCount >= (config?.consecutive_failures_threshold || 2)) {
            await createAlert(supabase, {
              functionName: result.functionName,
              type: 'consecutive_failures',
              severity: 'error',
              failureCount,
              errorMessage: result.errorMessage,
            });
            alertsCreated.push(`${result.functionName} (${failureCount} failures)`);
          }
        }

        // Check for recovery
        if (result.status === 'healthy' && 
            (previousStatus === 'unhealthy' || previousStatus === 'timeout')) {
          await createAlert(supabase, {
            functionName: result.functionName,
            type: 'recovery',
            severity: 'info',
            responseTimeMs: result.responseTimeMs,
          });
          recoveries.push(result.functionName);
        }
      }
    }

    // Calculate summary
    const summary = {
      total: results.length,
      healthy: results.filter(r => r.status === 'healthy').length,
      unhealthy: results.filter(r => r.status === 'unhealthy').length,
      timeout: results.filter(r => r.status === 'timeout').length,
      unknown: results.filter(r => r.status === 'unknown').length,
      averageResponseTimeMs: Math.round(
        results.reduce((sum, r) => sum + (r.responseTimeMs || 0), 0) / results.length
      ),
      alertsCreated: alertsCreated.length,
      recoveries: recoveries.length,
    };

    console.log(`[${new Date().toISOString()}] Health check complete:`, summary);

    return new Response(JSON.stringify({
      success: true,
      summary,
      results,
      alertsCreated,
      recoveries,
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in edge-function-health-check:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function checkFunctionHealth(func: FunctionConfig): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const functionUrl = `${SUPABASE_URL}/functions/v1/${func.name}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FUNCTION_TIMEOUT_MS);

    let response: Response;

    if (func.hasHealthEndpoint) {
      // Use health endpoint
      response = await fetch(`${functionUrl}?health=true`, {
        method: 'GET',
        signal: controller.signal,
      });
    } else {
      // Use OPTIONS request (CORS preflight)
      response = await fetch(functionUrl, {
        method: 'OPTIONS',
        signal: controller.signal,
      });
    }

    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - startTime;

    // For OPTIONS, any 2xx response means the function is reachable
    // For health endpoints, we expect a 200 with JSON body
    const isHealthy = func.hasHealthEndpoint 
      ? response.ok 
      : response.status >= 200 && response.status < 400;

    return {
      functionName: func.name,
      status: isHealthy ? 'healthy' : 'unhealthy',
      responseTimeMs,
      errorMessage: isHealthy ? null : `HTTP ${response.status}`,
      httpStatusCode: response.status,
    };

  } catch (error) {
    const responseTimeMs = Date.now() - startTime;
    
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        functionName: func.name,
        status: 'timeout',
        responseTimeMs,
        errorMessage: `Timeout after ${FUNCTION_TIMEOUT_MS}ms`,
        httpStatusCode: null,
      };
    }

    return {
      functionName: func.name,
      status: 'unhealthy',
      responseTimeMs,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      httpStatusCode: null,
    };
  }
}

interface AlertParams {
  functionName: string;
  type: 'slow_response' | 'consecutive_failures' | 'recovery';
  severity: 'info' | 'warning' | 'error';
  responseTimeMs?: number;
  threshold?: number;
  failureCount?: number;
  errorMessage?: string | null;
}

async function createAlert(supabase: any, params: AlertParams) {
  const titles = {
    slow_response: `Edge Function Slow: ${params.functionName}`,
    consecutive_failures: `Edge Function Critical: ${params.functionName}`,
    recovery: `Edge Function Recovered: ${params.functionName}`,
  };

  const messages = {
    slow_response: `Response time ${params.responseTimeMs}ms exceeded threshold of ${params.threshold}ms`,
    consecutive_failures: `${params.failureCount} consecutive failures. Error: ${params.errorMessage || 'Unknown'}`,
    recovery: `Function is now healthy (response time: ${params.responseTimeMs}ms)`,
  };

  try {
    await supabase.from('system_alerts').insert({
      title: titles[params.type],
      message: messages[params.type],
      severity: params.severity,
      source: 'edge-function-health-check',
      metadata: {
        function_name: params.functionName,
        alert_type: params.type,
        response_time_ms: params.responseTimeMs,
        threshold_ms: params.threshold,
        failure_count: params.failureCount,
        error_message: params.errorMessage,
      },
    });

    console.log(`Alert created: ${titles[params.type]}`);
  } catch (error) {
    console.error('Failed to create alert:', error);
  }
}
