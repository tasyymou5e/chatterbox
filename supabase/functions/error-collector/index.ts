import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ErrorReport {
  errorType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  stackTrace?: string;
  userId?: string;
  sessionId?: string;
  componentName?: string;
  routePath?: string;
  browserInfo?: Record<string, any>;
  deviceInfo?: Record<string, any>;
  metadata?: Record<string, any>;
  timestamp: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const errorReport: ErrorReport = await req.json();
    
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

    // Log the error using the database function
    const { data: errorId, error: logError } = await supabase.rpc('log_system_error', {
      p_error_type: errorReport.errorType,
      p_severity: errorReport.severity,
      p_message: errorReport.message,
      p_stack_trace: errorReport.stackTrace,
      p_user_id: errorReport.userId,
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
        JSON.stringify({ error: 'Failed to store error', details: logError.message }),
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
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});