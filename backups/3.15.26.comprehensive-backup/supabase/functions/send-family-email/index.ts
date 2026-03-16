import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders } from "../_shared/cors.ts";
import { validateJWT, getUserClient, getServiceClient, createUnauthorizedResponse, createForbiddenResponse } from '../_shared/auth-validator.ts';

// Rate limiting for bulk emails (in-memory, resets on function restart)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT_MAX = 10; // 10 bulk emails per hour per admin

function checkRateLimit(adminId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(adminId);
  
  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(adminId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }
  
  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }
  
  entry.count++;
  rateLimitStore.set(adminId, entry);
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

interface EmailRequest {
  subject: string;
  message: string;
  recipientEmails: string[];
  familyName: string;
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'));
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT using getClaims() - local verification with asymmetric keys
    const auth = await validateJWT(req);
    if (!auth.success || !auth.userId) {
      console.error('JWT validation failed:', auth.error);
      return createUnauthorizedResponse(auth.error || 'Authorization required', corsHeaders);
    }

    const user = { id: auth.userId, email: auth.email };
    console.log('User authenticated:', user.id);

    // Create user-scoped client for RLS-respecting operations
    const authHeader = req.headers.get('authorization')!;
    const supabase = getUserClient(authHeader);

    console.log('User authenticated:', user.id);

    // Verify admin role using secure RPC function
    const { data: isAdmin, error: roleError } = await supabase.rpc('check_admin_role_secure');
    if (roleError || !isAdmin) {
      console.error('Admin role check failed:', roleError);
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Admin role verified');

    // Check rate limit
    const rateLimit = checkRateLimit(user.id);
    if (!rateLimit.allowed) {
      console.warn('Rate limit exceeded for admin:', user.id);
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          message: 'You can send a maximum of 10 bulk emails per hour. Please try again later.'
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    const body: EmailRequest = await req.json();
    const { subject, message, recipientEmails, familyName } = body;

    // Input validation
    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Subject is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (subject.length > 200) {
      return new Response(
        JSON.stringify({ error: 'Subject must be 200 characters or less' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (message.length > 5000) {
      return new Response(
        JSON.stringify({ error: 'Message must be 5000 characters or less' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(recipientEmails) || recipientEmails.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one recipient email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate email format for each recipient
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = recipientEmails.filter(email => !emailRegex.test(email));
    if (invalidEmails.length > 0) {
      return new Response(
        JSON.stringify({ error: `Invalid email format: ${invalidEmails.join(', ')}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Sending email to ${recipientEmails.length} recipients for family: ${familyName}`);

    // Check if Resend API key is configured
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ 
          error: 'Email service not configured',
          message: 'Please add RESEND_API_KEY to the edge function secrets.'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendApiKey);

    // Format message with line breaks
    const formattedMessage = message.replace(/\n/g, '<br>');

    // Build HTML email template
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Message from ${familyName}</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
            <h2 style="color: #1f2937; margin-top: 0;">${subject}</h2>
            <div style="color: #4b5563; white-space: pre-wrap;">
              ${formattedMessage}
            </div>
          </div>
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p>This email was sent via Family Management System</p>
          </div>
        </body>
      </html>
    `;

    // Send emails to all recipients
    const results: { email: string; success: boolean; error?: string }[] = [];
    
    for (const email of recipientEmails) {
      try {
        const { data, error } = await resend.emails.send({
          from: 'Family Management <onboarding@resend.dev>',
          to: [email],
          subject: subject,
          html: htmlContent,
        });

        if (error) {
          console.error(`Failed to send email to ${email}:`, error);
          results.push({ email, success: false, error: error.message });
        } else {
          console.log(`Email sent successfully to ${email}:`, data);
          results.push({ email, success: true });
        }
      } catch (emailError) {
        const errorMessage = emailError instanceof Error ? emailError.message : 'Unknown error';
        console.error(`Error sending email to ${email}:`, errorMessage);
        results.push({ email, success: false, error: errorMessage });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Email send complete: ${successCount} successful, ${failCount} failed`);

    // Log activity to user_activity_logs using service role
    try {
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (serviceRoleKey) {
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
        await supabaseAdmin.from('user_activity_logs').insert({
          user_id: user.id,
          activity_type: 'bulk_email_sent',
          metadata: {
            family_name: familyName,
            recipient_count: recipientEmails.length,
            success_count: successCount,
            fail_count: failCount,
            subject: subject.substring(0, 50) // Truncate for logging
          },
          success: failCount === 0,
          failure_reason: failCount > 0 ? `${failCount} emails failed to send` : null
        });
      }
    } catch (logError) {
      console.error('Failed to log activity:', logError);
      // Don't fail the request if logging fails
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sent ${successCount} of ${recipientEmails.length} emails`,
        results,
        remaining: rateLimit.remaining
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in send-family-email function:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
