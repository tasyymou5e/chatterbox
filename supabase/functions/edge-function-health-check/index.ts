import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { getCorsHeaders } from '../_shared/cors.ts'

/**
 * Edge Function Health Check with Automatic Recovery
 * 
 * Tests all edge functions periodically, logs results, and performs
 * automatic warm-up recovery for failing functions.
 * 
 * Recovery Logic:
 * - 3+ consecutive failures: Attempt warm-up recovery
 * - 5+ consecutive failures: Escalate to critical alert
 * - Max 3 recovery attempts per function per 24h
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
  warmup_threshold: number;
  critical_threshold: number;
  max_recovery_attempts: number;
  recovery_cooldown_minutes: number;
  is_enabled: boolean;
}

interface RecoveryStatus {
  needs_recovery: boolean;
  is_critical: boolean;
  consecutive_failures: number;
  last_recovery_attempt: string | null;
  recovery_attempts_today: number;
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
  { name: 'edge-function-health-check', hasHealthEndpoint: true },
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
const FUNCTION_TIMEOUT_MS = 10000;
const WARMUP_RETRY_DELAY_MS = 2000;
const WARMUP_MAX_RETRIES = 3;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint
  const url = new URL(req.url);
  if (url.searchParams.get('health') === 'true' || url.pathname.endsWith('/health')) {
    return new Response(JSON.stringify({ status: 'healthy', timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    let checkType = 'scheduled';
    let specificFunctions: string[] | null = null;
    let skipRecovery = false;
    
    try {
      const body = await req.json();
      checkType = body.checkType || 'scheduled';
      specificFunctions = body.functions || null;
      skipRecovery = body.skipRecovery || false;
    } catch {
      // No body or invalid JSON
    }

    console.log(`[${new Date().toISOString()}] Starting health check (type: ${checkType}, recovery: ${!skipRecovery})`);

    // Get alert configurations
    const { data: alertConfigs } = await supabase
      .from('edge_function_alert_config')
      .select('*');

    const configMap = new Map<string, AlertConfig>();
    const defaultConfig = alertConfigs?.find((c: AlertConfig) => c.function_name === '_default');
    alertConfigs?.forEach((c: AlertConfig) => configMap.set(c.function_name, c));

    // Filter functions
    const functionsToCheck = specificFunctions 
      ? EDGE_FUNCTIONS.filter(f => specificFunctions.includes(f.name))
      : EDGE_FUNCTIONS;

    // Get previous statuses
    const { data: previousLogs } = await supabase
      .from('edge_function_health_logs')
      .select('function_name, status')
      .in('function_name', functionsToCheck.map(f => f.name))
      .order('created_at', { ascending: false });

    const previousStatusMap = new Map<string, string>();
    previousLogs?.forEach((log: { function_name: string; status: string }) => {
      if (!previousStatusMap.has(log.function_name)) {
        previousStatusMap.set(log.function_name, log.status);
      }
    });

    // Check all functions in batches
    const BATCH_SIZE = 5;
    const results: HealthCheckResult[] = [];

    for (let i = 0; i < functionsToCheck.length; i += BATCH_SIZE) {
      const batch = functionsToCheck.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(func => checkFunctionHealth(func))
      );
      results.push(...batchResults);
    }

    // Process results with recovery logic
    const alertsCreated: string[] = [];
    const recoveries: string[] = [];
    const recoveryAttempts: string[] = [];
    const criticalFunctions: string[] = [];

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

      // Skip recovery and alerting if disabled
      if (config?.is_enabled === false) continue;

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

      // Handle failures with recovery
      if (result.status === 'unhealthy' || result.status === 'timeout') {
        // Get recovery status
        const { data: recoveryStatusData } = await supabase.rpc('get_function_recovery_status', {
          p_function_name: result.functionName
        });

        const recoveryStatus: RecoveryStatus = recoveryStatusData?.[0] || {
          needs_recovery: false,
          is_critical: false,
          consecutive_failures: 1,
          last_recovery_attempt: null,
          recovery_attempts_today: 0,
        };

        const warmupThreshold = config?.warmup_threshold || 3;
        const criticalThreshold = config?.critical_threshold || 5;
        const maxRecoveryAttempts = config?.max_recovery_attempts || 3;
        const cooldownMinutes = config?.recovery_cooldown_minutes || 30;

        // Check if we should attempt recovery
        const shouldAttemptRecovery = !skipRecovery &&
          recoveryStatus.consecutive_failures >= warmupThreshold &&
          recoveryStatus.recovery_attempts_today < maxRecoveryAttempts &&
          (!recoveryStatus.last_recovery_attempt || 
           new Date().getTime() - new Date(recoveryStatus.last_recovery_attempt).getTime() > cooldownMinutes * 60 * 1000);

        if (shouldAttemptRecovery) {
          console.log(`🔄 Attempting recovery for ${result.functionName} (${recoveryStatus.consecutive_failures} failures)`);
          
          const recoveryResult = await attemptWarmupRecovery(
            EDGE_FUNCTIONS.find(f => f.name === result.functionName)!,
            supabase,
            recoveryStatus.consecutive_failures
          );

          if (recoveryResult.success) {
            recoveryAttempts.push(`${result.functionName} (recovered)`);
            recoveries.push(result.functionName);
            
            await createAlert(supabase, {
              functionName: result.functionName,
              type: 'recovery',
              severity: 'info',
              responseTimeMs: recoveryResult.responseTimeMs,
            });
          } else {
            recoveryAttempts.push(`${result.functionName} (failed)`);
          }
        }

        // Check for critical threshold
        if (recoveryStatus.consecutive_failures >= criticalThreshold) {
          criticalFunctions.push(result.functionName);
          
          await createAlert(supabase, {
            functionName: result.functionName,
            type: 'critical',
            severity: 'error',
            failureCount: recoveryStatus.consecutive_failures,
            errorMessage: result.errorMessage,
            recoveryAttempts: recoveryStatus.recovery_attempts_today,
          });
          alertsCreated.push(`${result.functionName} (CRITICAL: ${recoveryStatus.consecutive_failures} failures)`);
        } else if (recoveryStatus.consecutive_failures >= (config?.consecutive_failures_threshold || 2)) {
          await createAlert(supabase, {
            functionName: result.functionName,
            type: 'consecutive_failures',
            severity: 'warning',
            failureCount: recoveryStatus.consecutive_failures,
            errorMessage: result.errorMessage,
          });
          alertsCreated.push(`${result.functionName} (${recoveryStatus.consecutive_failures} failures)`);
        }
      }

      // Check for recovery (was failing, now healthy)
      if (result.status === 'healthy' && 
          (previousStatus === 'unhealthy' || previousStatus === 'timeout')) {
        recoveries.push(result.functionName);
        
        await createAlert(supabase, {
          functionName: result.functionName,
          type: 'recovery',
          severity: 'info',
          responseTimeMs: result.responseTimeMs,
        });
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
      recoveryAttempts: recoveryAttempts.length,
      criticalFunctions: criticalFunctions.length,
    };

    console.log(`[${new Date().toISOString()}] Health check complete:`, summary);

    return new Response(JSON.stringify({
      success: true,
      summary,
      results,
      alertsCreated,
      recoveries,
      recoveryAttempts,
      criticalFunctions,
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
      response = await fetch(`${functionUrl}?health=true`, {
        method: 'GET',
        signal: controller.signal,
      });
    } else {
      response = await fetch(functionUrl, {
        method: 'OPTIONS',
        signal: controller.signal,
      });
    }

    clearTimeout(timeoutId);
    const responseTimeMs = Date.now() - startTime;

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

interface RecoveryResult {
  success: boolean;
  responseTimeMs: number;
  attempts: number;
  error?: string;
}

async function attemptWarmupRecovery(
  func: FunctionConfig,
  supabase: ReturnType<typeof createClient>,
  consecutiveFailures: number
): Promise<RecoveryResult> {
  const functionUrl = `${SUPABASE_URL}/functions/v1/${func.name}`;
  let lastError: string | undefined;
  let lastResponseTime = 0;

  for (let attempt = 1; attempt <= WARMUP_MAX_RETRIES; attempt++) {
    console.log(`  Warmup attempt ${attempt}/${WARMUP_MAX_RETRIES} for ${func.name}`);
    
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FUNCTION_TIMEOUT_MS);

      let response: Response;
      if (func.hasHealthEndpoint) {
        response = await fetch(`${functionUrl}?health=true`, {
          method: 'GET',
          signal: controller.signal,
        });
      } else {
        response = await fetch(functionUrl, {
          method: 'OPTIONS',
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);
      lastResponseTime = Date.now() - startTime;

      const isHealthy = func.hasHealthEndpoint 
        ? response.ok 
        : response.status >= 200 && response.status < 400;

      // Log recovery attempt
      await supabase.from('edge_function_recovery_attempts').insert({
        function_name: func.name,
        attempt_number: attempt,
        attempt_type: 'warmup',
        status: isHealthy ? 'success' : 'failed',
        response_time_ms: lastResponseTime,
        error_message: isHealthy ? null : `HTTP ${response.status}`,
        triggered_by: 'auto_recovery',
        consecutive_failures_before: consecutiveFailures,
        metadata: { http_status: response.status }
      });

      if (isHealthy) {
        console.log(`  ✅ Recovery successful for ${func.name} (attempt ${attempt})`);
        return { success: true, responseTimeMs: lastResponseTime, attempts: attempt };
      }

      lastError = `HTTP ${response.status}`;

    } catch (error) {
      lastResponseTime = Date.now() - startTime;
      lastError = error instanceof Error ? error.message : 'Unknown error';

      // Log failed recovery attempt
      await supabase.from('edge_function_recovery_attempts').insert({
        function_name: func.name,
        attempt_number: attempt,
        attempt_type: 'warmup',
        status: 'failed',
        response_time_ms: lastResponseTime,
        error_message: lastError,
        triggered_by: 'auto_recovery',
        consecutive_failures_before: consecutiveFailures,
      });
    }

    // Wait before next attempt (exponential backoff)
    if (attempt < WARMUP_MAX_RETRIES) {
      await new Promise(resolve => setTimeout(resolve, WARMUP_RETRY_DELAY_MS * attempt));
    }
  }

  console.log(`  ❌ Recovery failed for ${func.name} after ${WARMUP_MAX_RETRIES} attempts`);
  return { 
    success: false, 
    responseTimeMs: lastResponseTime, 
    attempts: WARMUP_MAX_RETRIES,
    error: lastError 
  };
}

interface AlertParams {
  functionName: string;
  type: 'slow_response' | 'consecutive_failures' | 'recovery' | 'critical';
  severity: 'info' | 'warning' | 'error';
  responseTimeMs?: number;
  threshold?: number;
  failureCount?: number;
  errorMessage?: string | null;
  recoveryAttempts?: number;
}

async function createAlert(supabase: ReturnType<typeof createClient>, params: AlertParams) {
  const titles: Record<string, string> = {
    slow_response: `Edge Function Slow: ${params.functionName}`,
    consecutive_failures: `Edge Function Failing: ${params.functionName}`,
    recovery: `Edge Function Recovered: ${params.functionName}`,
    critical: `🚨 CRITICAL: ${params.functionName} Down`,
  };

  const messages: Record<string, string> = {
    slow_response: `Response time ${params.responseTimeMs}ms exceeded threshold of ${params.threshold}ms`,
    consecutive_failures: `${params.failureCount} consecutive failures. Error: ${params.errorMessage || 'Unknown'}`,
    recovery: `Function is now healthy (response time: ${params.responseTimeMs}ms)`,
    critical: `${params.failureCount} consecutive failures after ${params.recoveryAttempts || 0} recovery attempts. Requires manual intervention. Error: ${params.errorMessage || 'Unknown'}`,
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
        recovery_attempts: params.recoveryAttempts,
        is_critical: params.type === 'critical',
      },
    });

    console.log(`Alert created: ${titles[params.type]}`);
  } catch (error) {
    console.error('Failed to create alert:', error);
  }
}
