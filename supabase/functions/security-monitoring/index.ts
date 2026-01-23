import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { adminActionLimiter, RateLimiter } from '../_shared/rate-limiter.ts';
import { 
  validateAdminJWT, 
  getServiceClient, 
  createUnauthorizedResponse,
  createForbiddenResponse
} from '../_shared/auth-validator.ts';

interface SecurityAlert {
  type: 'suspicious_access' | 'rls_violation' | 'brute_force' | 'data_exfiltration' | 'policy_bypass';
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  details: Record<string, any>;
  timestamp: string;
  metadata: Record<string, any>;
}

interface AccessPattern {
  userId: string;
  activityType: string;
  frequency: number;
  timeWindow: number;
  familyIds: string[];
  ipAddresses: string[];
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Health check endpoint - no auth required
  const url = new URL(req.url);
  if (req.method === 'GET' && (url.pathname.endsWith('/health') || url.searchParams.get('health') === 'true')) {
    return new Response(JSON.stringify({ 
      status: 'ok', 
      function: 'security-monitoring',
      timestamp: new Date().toISOString() 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // Apply rate limiting
  const rateCheck = adminActionLimiter.check(req);
  if (!rateCheck.allowed) {
    console.warn('Rate limit exceeded for security-monitoring');
    return RateLimiter.createRateLimitResponse(rateCheck.resetTime);
  }

  try {
    // Validate admin JWT using getClaims() for fast local verification
    const auth = await validateAdminJWT(req);
    
    if (!auth.success) {
      console.error('Authentication failed:', auth.error);
      return createUnauthorizedResponse(auth.error || 'Unauthorized', corsHeaders);
    }
    
    if (!auth.isAdmin) {
      console.error('Admin access required for security monitoring');
      return createForbiddenResponse('Admin access required', corsHeaders);
    }

    const supabase = getServiceClient();
    const { action, data } = await req.json();
    console.log(`[security-monitoring] action=${action}`);

    switch (action) {
      case 'analyze_access_patterns':
        return await analyzeAccessPatterns(supabase, corsHeaders);
      
      case 'detect_rls_violations':
        return await detectRLSViolations(supabase, corsHeaders);
      
      case 'check_suspicious_activity':
        return await checkSuspiciousActivity(supabase, data, corsHeaders);
      
      case 'generate_security_report':
        return await generateSecurityReport(supabase, corsHeaders);
      
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Security monitoring error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function analyzeAccessPatterns(supabase: any, corsHeaders: Record<string, string>): Promise<Response> {
  // Analyze user activity patterns for the last hour
  const { data: activities, error } = await supabase
    .from('user_activity_logs')
    .select('*')
    .gte('created_at', new Date(Date.now() - 3600000).toISOString());

  if (error) throw error;

  const patterns: AccessPattern[] = [];
  const userPatterns = new Map<string, AccessPattern>();

  activities?.forEach(activity => {
    const key = activity.user_id;
    if (!userPatterns.has(key)) {
      userPatterns.set(key, {
        userId: activity.user_id,
        activityType: activity.activity_type,
        frequency: 0,
        timeWindow: 3600,
        familyIds: [],
        ipAddresses: []
      });
    }
    
    const pattern = userPatterns.get(key)!;
    pattern.frequency++;
    
    if (activity.metadata?.family_id && !pattern.familyIds.includes(activity.metadata.family_id)) {
      pattern.familyIds.push(activity.metadata.family_id);
    }
    
    if (activity.ip_address && !pattern.ipAddresses.includes(activity.ip_address)) {
      pattern.ipAddresses.push(activity.ip_address);
    }
  });

  // Detect suspicious patterns
  const suspiciousPatterns = Array.from(userPatterns.values()).filter(pattern => 
    pattern.frequency > 50 || // More than 50 actions per hour
    pattern.familyIds.length > 5 || // Accessing more than 5 families
    pattern.ipAddresses.length > 3 // Multiple IP addresses
  );

  // Generate alerts for suspicious patterns
  for (const pattern of suspiciousPatterns) {
    await createSecurityAlert(supabase, {
      type: 'suspicious_access',
      severity: pattern.frequency > 100 ? 'critical' : 'high',
      userId: pattern.userId,
      details: {
        pattern_type: 'excessive_activity',
        frequency: pattern.frequency,
        families_accessed: pattern.familyIds.length,
        ip_addresses: pattern.ipAddresses.length
      },
      timestamp: new Date().toISOString(),
      metadata: {
        detection_method: 'pattern_analysis',
        time_window: '1_hour'
      }
    });
  }

  return new Response(JSON.stringify({ 
    suspicious_patterns: suspiciousPatterns.length,
    alerts_generated: suspiciousPatterns.length 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function detectRLSViolations(supabase: any, corsHeaders: Record<string, string>): Promise<Response> {
  // Check for potential RLS policy violations in security audit logs
  const { data: violations, error } = await supabase
    .from('security_audit_logs')
    .select('*')
    .eq('event_type', 'rls_violation')
    .gte('created_at', new Date(Date.now() - 3600000).toISOString());

  if (error) throw error;

  const criticalViolations = violations?.filter(v => 
    v.severity === 'critical' || v.severity === 'high'
  ) || [];

  // Generate alerts for critical violations
  for (const violation of criticalViolations) {
    await createSecurityAlert(supabase, {
      type: 'rls_violation',
      severity: 'critical',
      userId: violation.user_id,
      details: {
        violation_type: 'rls_policy_bypass',
        table_accessed: violation.event_details?.table,
        operation: violation.event_details?.operation
      },
      timestamp: new Date().toISOString(),
      metadata: {
        original_violation_id: violation.id,
        detection_method: 'rls_monitoring'
      }
    });
  }

  return new Response(JSON.stringify({ 
    violations_detected: criticalViolations.length 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function checkSuspiciousActivity(supabase: any, data: any, corsHeaders: Record<string, string>): Promise<Response> {
  const { userId, activityType, metadata } = data;
  
  // Check for rapid repeated actions
  const { data: recentActivity, error } = await supabase
    .from('user_activity_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('activity_type', activityType)
    .gte('created_at', new Date(Date.now() - 60000).toISOString()); // Last minute

  if (error) throw error;

  const isSuspicious = (recentActivity?.length || 0) > 10;

  if (isSuspicious) {
    await createSecurityAlert(supabase, {
      type: 'suspicious_access',
      severity: 'high',
      userId,
      details: {
        activity_type: activityType,
        frequency: recentActivity?.length || 0,
        time_window: '1_minute'
      },
      timestamp: new Date().toISOString(),
      metadata: {
        detection_method: 'real_time_analysis',
        additional_context: metadata
      }
    });
  }

  return new Response(JSON.stringify({ 
    suspicious: isSuspicious,
    activity_count: recentActivity?.length || 0 
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function generateSecurityReport(supabase: any, corsHeaders: Record<string, string>): Promise<Response> {
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 3600000);
  
  // Get security metrics for the last 24 hours
  const [
    { data: alerts },
    { data: violations },
    { data: activities },
    { data: errors }
  ] = await Promise.all([
    supabase.from('security_audit_logs').select('*').gte('created_at', last24Hours.toISOString()),
    supabase.from('security_audit_logs').select('*').eq('event_type', 'rls_violation').gte('created_at', last24Hours.toISOString()),
    supabase.from('user_activity_logs').select('*').eq('success', false).gte('created_at', last24Hours.toISOString()),
    supabase.from('system_errors').select('*').gte('created_at', last24Hours.toISOString())
  ]);

  const report = {
    period: '24_hours',
    generated_at: now.toISOString(),
    summary: {
      total_alerts: alerts?.length || 0,
      rls_violations: violations?.length || 0,
      failed_activities: activities?.length || 0,
      system_errors: errors?.length || 0
    },
    severity_breakdown: {
      critical: alerts?.filter(a => a.severity === 'critical').length || 0,
      high: alerts?.filter(a => a.severity === 'high').length || 0,
      medium: alerts?.filter(a => a.severity === 'medium').length || 0,
      low: alerts?.filter(a => a.severity === 'low').length || 0
    },
    top_threat_indicators: alerts?.slice(0, 10) || []
  };

  console.log(`[security-monitoring] Report generated: alerts=${report.summary.total_alerts}`);

  return new Response(JSON.stringify(report), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function createSecurityAlert(supabase: any, alert: SecurityAlert) {
  const { error } = await supabase
    .from('security_audit_logs')
    .insert({
      user_id: alert.userId,
      event_type: 'security_alert',
      severity: alert.severity,
      event_details: {
        alert_type: alert.type,
        details: alert.details,
        metadata: alert.metadata
      }
    });

  if (error) {
    console.error('Failed to create security alert:', error);
  }

  // Send real-time notification
  await supabase
    .channel('security_alerts')
    .send({
      type: 'broadcast',
      event: 'new_alert',
      payload: alert
    });
}