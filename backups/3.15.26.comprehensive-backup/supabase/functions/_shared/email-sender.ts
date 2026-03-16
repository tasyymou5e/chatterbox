/**
 * Shared Email Sending Utility
 * 
 * Uses Resend for email delivery with proper error handling
 * and non-blocking behavior for parent notifications.
 */

import { Resend } from "npm:resend@2.0.0";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using Resend
 * 
 * @param options - Email options including recipient, subject, and HTML content
 * @returns Promise with success status and optional error message
 */
export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  
  if (!resendApiKey) {
    console.warn('[email-sender] RESEND_API_KEY not configured - email not sent');
    return { 
      success: false, 
      error: 'Email service not configured' 
    };
  }

  try {
    const resend = new Resend(resendApiKey);
    
    const { data, error } = await resend.emails.send({
      from: options.from || 'Chatterbox <onboarding@resend.dev>',
      to: [options.to],
      subject: options.subject,
      html: options.html,
    });

    if (error) {
      console.error('[email-sender] Resend API error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }

    console.log('[email-sender] Email sent successfully:', data?.id);
    return { 
      success: true, 
      messageId: data?.id 
    };
    
  } catch (error) {
    console.error('[email-sender] Unexpected error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

/**
 * Send email without blocking the main request
 * Logs errors but doesn't throw
 */
export async function sendEmailNonBlocking(options: EmailOptions): Promise<void> {
  try {
    const result = await sendEmail(options);
    if (!result.success) {
      console.warn('[email-sender] Non-blocking email failed:', result.error);
    }
  } catch (error) {
    console.warn('[email-sender] Non-blocking email error:', error);
  }
}
