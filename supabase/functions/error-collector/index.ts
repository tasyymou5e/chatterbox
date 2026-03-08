import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { errorCollectionLimiter, RateLimiter } from '../_shared/rate-limiter.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { getServiceClient, validateJWT } from '../_shared/auth-validator.ts'

interface ErrorReport {
  errorType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  stackTrace?: string;
  userId?: string;
  sessionId?: string;
  componentName?: string;
  routePath?: string;
  browserInfo?: Record<string, unknown>;
  deviceInfo?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Apply rate limiting for error collection
  const rateCheck = errorCollectionLimiter.check(req);
  if (!rateCheck.allowed) {
    console.warn('Error collection rate limit exceeded');
    return RateLimiter.createRateLimitResponse(rateCheck.resetTime);
  }

  try {
    // Use service client for error logging (no auth required for error collection)
    const supabase = getServiceClient();

    const errorReport: ErrorReport = await req.json();

    // Determine verified userId: use JWT if present, otherwise null
    // Never trust client-supplied userId to prevent attribution spoofing
    let verifiedUserId: string | null = null;
    const auth = await validateJWT(req);
    if (auth.success && auth.userId) {
      verifiedUserId = auth.userId;
    }
    
    console.log(`[${new Date().toISOString()}] Error received:`, {
      type: errorReport.errorType,
      severity: errorReport.severity,
      component: errorReport.componentName,
      message: errorReport.message.substring(0, 100) + '...'
    });

    // Validate required fields
    if (!errorReport.errorType || !errorReport.severity || !errorReport.message) {
      console.error('Missing required fields in error report');
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Create pattern hash for error deduplication
    const patternString = `${errorReport.errorType}:${errorReport.message}:${errorReport.componentName || ''}`;
    const patternHash = Array.from(
      new Uint8Array(
        await crypto.subtle.digest('SHA-256', new TextEncoder().encode(patternString))
      )
    ).map(b => b.toString(16).padStart(2, '0')).join('');

    // Log the error using the secure database function with data sanitization
    const { data: errorId, error: logError } = await supabase.rpc('log_system_error_secure', {
      p_error_type: errorReport.errorType,
      p_severity: errorReport.severity,
      p_message: errorReport.message,
      p_stack_trace: errorReport.stackTrace,
      p_user_id: verifiedUserId,
      p_session_id: errorReport.sessionId,
      p_component_name: errorReport.componentName,
      p_route_path: errorReport.routePath,
      p_browser_info: errorReport.browserInfo || {},
      p_device_info: errorReport.deviceInfo || {},
      p_metadata: {
        ...errorReport.metadata,
        timestamp: errorReport.timestamp,
        pattern_hash: patternHash,
      }
    });

    if (logError) {
      console.error('Failed to log error to database:', logError);
      return new Response(
        JSON.stringify({ error: 'Failed to store error' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if this is a critical error that needs immediate attention
    if (errorReport.severity === 'critical') {
      console.warn(`🚨 CRITICAL ERROR DETECTED: ${errorReport.message} in ${errorReport.componentName}`);
      
      // You could add additional alerting here (email, Slack, etc.)
      // For now, we're just creating a system alert in the database
    }

    // Log successful error collection
    console.log(`✅ Error logged successfully with ID: ${errorId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        errorId,
        message: 'Error logged successfully' 
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in error-collector function:', error);
    
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
