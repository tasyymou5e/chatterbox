/**
 * Data Health Alerter Edge Function
 * 
 * Calculates the data health score and sends email alerts to admins
 * when the score drops below thresholds:
 * - Warning: Score < 60 (Fair) - 6 hour cooldown
 * - Critical: Score < 40 (Critical) - 2 hour cooldown
 * 
 * Designed to be called hourly via pg_cron or manually for testing.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { sendEmailNonBlocking } from "../_shared/email-sender.ts";
import { dataHealthAlertTemplate, type DataHealthAlertData } from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Alert thresholds and cooldowns
const THRESHOLDS = {
  critical: { score: 40, cooldownHours: 2 },
  warning: { score: 60, cooldownHours: 6 },
} as const;

interface HealthScoreResult {
  overall_score: number;
  integrity_score: number;
  repair_score: number;
  system_score: number;
  grade: string;
  integrity_details: Record<string, unknown>;
  repair_details: Record<string, unknown>;
  system_details: Record<string, unknown>;
  factors_impacting: Array<{
    category: string;
    severity: string;
    description: string;
    impact_points: number;
  }>;
  calculated_at: string;
}

interface AlertResult {
  success: boolean;
  alertType: 'warning' | 'critical' | null;
  score: number;
  grade: string;
  message: string;
  emailsSent?: number;
  emailErrors?: string[];
}

async function handler(req: Request): Promise<Response> {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[data-health-alerter] Starting health check");

  try {
    // Initialize Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Step 1: Calculate current health score
    console.log("[data-health-alerter] Calculating health score...");
    const { data: scoreData, error: scoreError } = await supabase.rpc('calculate_data_health_score');
    
    if (scoreError) {
      console.error("[data-health-alerter] Failed to calculate score:", scoreError);
      throw new Error(`Score calculation failed: ${scoreError.message}`);
    }

    if (!scoreData || scoreData.length === 0) {
      throw new Error("No score data returned from calculation");
    }

    const score: HealthScoreResult = scoreData[0];
    console.log(`[data-health-alerter] Score calculated: ${score.overall_score}/100 (${score.grade})`);

    // Step 2: Store the calculated score
    const { error: storeError } = await supabase
      .from('data_health_scores')
      .insert({
        overall_score: score.overall_score,
        integrity_score: score.integrity_score,
        repair_score: score.repair_score,
        system_score: score.system_score,
        grade: score.grade,
        integrity_details: score.integrity_details,
        repair_details: score.repair_details,
        system_details: score.system_details,
        factors_impacting: score.factors_impacting,
        calculated_at: score.calculated_at
      });

    if (storeError) {
      console.warn("[data-health-alerter] Failed to store score (non-blocking):", storeError);
    }

    // Step 3: Determine if alert is needed
    let alertType: 'warning' | 'critical' | null = null;
    if (score.overall_score < THRESHOLDS.critical.score) {
      alertType = 'critical';
    } else if (score.overall_score < THRESHOLDS.warning.score) {
      alertType = 'warning';
    }

    if (!alertType) {
      const result: AlertResult = {
        success: true,
        alertType: null,
        score: score.overall_score,
        grade: score.grade,
        message: "Score is healthy, no alert needed"
      };
      console.log(`[data-health-alerter] ${result.message}`);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Step 4: Check cooldown - has an alert of this type been sent recently?
    const cooldownHours = alertType === 'critical' 
      ? THRESHOLDS.critical.cooldownHours 
      : THRESHOLDS.warning.cooldownHours;
    
    const cooldownCutoff = new Date(Date.now() - cooldownHours * 60 * 60 * 1000).toISOString();
    
    const { data: recentAlerts, error: alertCheckError } = await supabase
      .from('data_health_alerts')
      .select('id, created_at')
      .eq('alert_type', alertType)
      .gte('created_at', cooldownCutoff)
      .limit(1);

    if (alertCheckError) {
      console.warn("[data-health-alerter] Error checking recent alerts:", alertCheckError);
    }

    if (recentAlerts && recentAlerts.length > 0) {
      const result: AlertResult = {
        success: true,
        alertType,
        score: score.overall_score,
        grade: score.grade,
        message: `${alertType} alert already sent within ${cooldownHours}h cooldown window`
      };
      console.log(`[data-health-alerter] ${result.message}`);
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Step 5: Get admin email addresses
    console.log("[data-health-alerter] Fetching admin users...");
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (rolesError) {
      throw new Error(`Failed to fetch admin roles: ${rolesError.message}`);
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.warn("[data-health-alerter] No admin users found");
      const result: AlertResult = {
        success: false,
        alertType,
        score: score.overall_score,
        grade: score.grade,
        message: "No admin users found to send alerts to"
      };
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Get emails from auth.users for the admin user IDs
    const adminUserIds = adminRoles.map(r => r.user_id);
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      throw new Error(`Failed to fetch admin emails: ${authError.message}`);
    }

    const adminEmails = authUsers.users
      .filter(u => adminUserIds.includes(u.id) && u.email)
      .map(u => u.email!);

    if (adminEmails.length === 0) {
      console.warn("[data-health-alerter] No admin emails found");
      const result: AlertResult = {
        success: false,
        alertType,
        score: score.overall_score,
        grade: score.grade,
        message: "No admin emails found"
      };
      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`[data-health-alerter] Sending ${alertType} alerts to ${adminEmails.length} admins`);

    // Step 6: Prepare email content
    const dashboardUrl = "https://chatterboxlife.lovable.app/admin/data-health";
    const timestamp = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const emailData: DataHealthAlertData = {
      alertType,
      score: score.overall_score,
      grade: score.grade,
      timestamp,
      topFactors: (score.factors_impacting || []).slice(0, 5).map(f => ({
        category: f.category,
        severity: f.severity,
        description: f.description
      })),
      dashboardUrl
    };

    const subject = alertType === 'critical'
      ? `🚨 Critical: System Health Score at ${score.overall_score}/100`
      : `⚠️ Warning: System Health Score at ${score.overall_score}/100`;

    const html = dataHealthAlertTemplate(emailData);

    // Step 7: Send emails to all admins
    const emailResults: { email: string; success: boolean; error?: string }[] = [];
    
    await Promise.all(adminEmails.map(async (email) => {
      try {
        await sendEmailNonBlocking({
          to: email,
          subject,
          html
        });
        emailResults.push({ email, success: true });
        console.log(`[data-health-alerter] Email sent to ${email}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        emailResults.push({ email, success: false, error: errorMsg });
        console.error(`[data-health-alerter] Failed to send to ${email}:`, errorMsg);
      }
    }));

    const successCount = emailResults.filter(r => r.success).length;
    const errors = emailResults.filter(r => !r.success).map(r => `${r.email}: ${r.error}`);

    // Step 8: Log the alert to history
    const { error: logError } = await supabase
      .from('data_health_alerts')
      .insert({
        alert_type: alertType,
        score: score.overall_score,
        grade: score.grade,
        recipients: adminEmails,
        emails_sent: successCount,
        email_errors: errors,
        factors_summary: score.factors_impacting || []
      });

    if (logError) {
      console.error("[data-health-alerter] Failed to log alert:", logError);
    }

    const result: AlertResult = {
      success: true,
      alertType,
      score: score.overall_score,
      grade: score.grade,
      message: `${alertType} alert sent to ${successCount}/${adminEmails.length} admins`,
      emailsSent: successCount,
      emailErrors: errors.length > 0 ? errors : undefined
    };

    console.log(`[data-health-alerter] Complete: ${result.message}`);
    
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("[data-health-alerter] Error:", error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}

Deno.serve(handler);
