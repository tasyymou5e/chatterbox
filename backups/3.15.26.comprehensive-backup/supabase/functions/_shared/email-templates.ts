/**
 * Email Templates for Parent Notifications
 * 
 * All templates are designed to:
 * - Be mobile-responsive
 * - Never expose sensitive data (PINs, generated emails, family codes)
 * - Use consistent branding
 */

// ============================================================================
// Template Data Interfaces
// ============================================================================

export interface ChildCompletionSuccessData {
  parentName: string;
  childName: string;
  familyName: string;
  completedAt: string;
}

export interface ChildCompletionFailedData {
  parentName: string;
  childName: string;
  familyName: string;
  failureReason: string;
  attemptCount?: number;
  isLocked?: boolean;
  lockMinutes?: number;
}

export interface SecurityAlertData {
  parentName: string;
  alertType: string;
  description: string;
  timestamp: string;
  actionRequired?: string;
}

export interface DataHealthAlertData {
  alertType: 'warning' | 'critical';
  score: number;
  grade: string;
  timestamp: string;
  topFactors: Array<{
    category: string;
    severity: string;
    description: string;
  }>;
  dashboardUrl: string;
}

// ============================================================================
// Base Template Wrapper
// ============================================================================

function baseTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <title>Chatterbox Notification</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #374151;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
          ${content}
        </table>
        <!-- Footer -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px;">
          <tr>
            <td align="center" style="padding: 24px 20px; color: #9ca3af; font-size: 12px;">
              <p style="margin: 0;">This is an automated notification from Chatterbox</p>
              <p style="margin: 8px 0 0 0;">You're receiving this because you're a parent in a Chatterbox family</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// ============================================================================
// Success Template: Child Account Completed
// ============================================================================

export function childAccountCompletedTemplate(data: ChildCompletionSuccessData): string {
  const content = `
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 40px; border-radius: 12px 12px 0 0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ✓ Account Setup Complete
              </h1>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding: 32px 40px;">
        <p style="margin: 0 0 16px 0; font-size: 16px;">
          Hi ${escapeHtml(data.parentName)},
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px;">
          Great news! <strong style="color: #059669;">${escapeHtml(data.childName)}</strong> has successfully completed their account setup for the <strong>${escapeHtml(data.familyName)}</strong> family.
        </p>
        
        <!-- Success Box -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
          <tr>
            <td style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 20px;">
              <p style="margin: 0; color: #065f46; font-size: 15px;">
                🎉 They can now sign in and start using Chatterbox!
              </p>
            </td>
          </tr>
        </table>
        
        <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px;">
          Completed at: ${escapeHtml(data.completedAt)}
        </p>
      </td>
    </tr>
  `;
  
  return baseTemplate(content);
}

// ============================================================================
// Warning Template: Failed Attempt
// ============================================================================

export function childAccountFailedTemplate(data: ChildCompletionFailedData): string {
  const lockWarning = data.isLocked ? `
    <!-- Lock Warning Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
      <tr>
        <td style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px;">
          <p style="margin: 0 0 4px 0; color: #dc2626; font-weight: 600; font-size: 14px;">
            🔒 Account Temporarily Locked
          </p>
          <p style="margin: 0; color: #991b1b; font-size: 14px;">
            The account is locked for ${data.lockMinutes || 15} minutes due to multiple failed attempts.
          </p>
        </td>
      </tr>
    </table>
  ` : '';

  const content = `
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 32px 40px; border-radius: 12px 12px 0 0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ⚠️ Account Setup Attempt
              </h1>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding: 32px 40px;">
        <p style="margin: 0 0 16px 0; font-size: 16px;">
          Hi ${escapeHtml(data.parentName)},
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px;">
          Someone attempted to complete the account setup for <strong style="color: #d97706;">${escapeHtml(data.childName)}</strong> in the <strong>${escapeHtml(data.familyName)}</strong> family, but the attempt was unsuccessful.
        </p>
        
        <!-- Reason Box -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
          <tr>
            <td style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px;">
              <p style="margin: 0; color: #92400e; font-size: 14px;">
                <strong>Reason:</strong> ${escapeHtml(data.failureReason)}
              </p>
            </td>
          </tr>
        </table>
        
        ${lockWarning}
        
        <!-- Help Text -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0 0 0;">
          <tr>
            <td style="border-top: 1px solid #e5e7eb; padding-top: 20px;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px;">
                <strong>If this was your child:</strong> You may need to provide them with the correct verification PIN or check the family code.
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                <strong>If you don't recognize this activity:</strong> Please review your child accounts in the parent dashboard.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
  
  return baseTemplate(content);
}

// ============================================================================
// Security Alert Template
// ============================================================================

export function securityAlertTemplate(data: SecurityAlertData): string {
  const actionBox = data.actionRequired ? `
    <!-- Action Required Box -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
      <tr>
        <td style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px;">
          <p style="margin: 0 0 4px 0; color: #dc2626; font-weight: 600; font-size: 14px;">
            Action Required
          </p>
          <p style="margin: 0; color: #991b1b; font-size: 14px;">
            ${escapeHtml(data.actionRequired)}
          </p>
        </td>
      </tr>
    </table>
  ` : '';

  const content = `
    <!-- Header -->
    <tr>
      <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 32px 40px; border-radius: 12px 12px 0 0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                🚨 Security Alert
              </h1>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding: 32px 40px;">
        <p style="margin: 0 0 16px 0; font-size: 16px;">
          Hi ${escapeHtml(data.parentName)},
        </p>
        <p style="margin: 0 0 16px 0; font-size: 16px;">
          We detected a security event on your Chatterbox account:
        </p>
        
        <!-- Alert Details Box -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
          <tr>
            <td style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px;">
              <p style="margin: 0 0 8px 0; color: #991b1b; font-weight: 600; font-size: 15px;">
                ${escapeHtml(data.alertType)}
              </p>
              <p style="margin: 0; color: #7f1d1d; font-size: 14px;">
                ${escapeHtml(data.description)}
              </p>
            </td>
          </tr>
        </table>
        
        ${actionBox}
        
        <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px;">
          Detected at: ${escapeHtml(data.timestamp)}
        </p>
      </td>
    </tr>
  `;
  
  return baseTemplate(content);
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Escape HTML to prevent XSS in email content
 */
export function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, char => htmlEscapes[char]);
}

// ============================================================================
// Data Health Alert Template (Admin Notifications)
// ============================================================================

export function dataHealthAlertTemplate(data: DataHealthAlertData): string {
  const isWarning = data.alertType === 'warning';
  const headerGradient = isWarning 
    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
    : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
  const emoji = isWarning ? '⚠️' : '🚨';
  const title = isWarning ? 'Data Health Warning' : 'Critical System Health Alert';
  const headerColor = isWarning ? '#92400e' : '#991b1b';
  const borderColor = isWarning ? '#fde68a' : '#fecaca';
  const bgColor = isWarning ? '#fffbeb' : '#fef2f2';

  // Build factors list HTML
  const factorsHtml = data.topFactors.length > 0 
    ? data.topFactors.slice(0, 5).map(factor => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
            <span style="display: inline-block; background-color: ${
              factor.severity === 'critical' ? '#fef2f2' : 
              factor.severity === 'high' ? '#fff7ed' : 
              factor.severity === 'medium' ? '#fffbeb' : '#f0fdf4'
            }; color: ${
              factor.severity === 'critical' ? '#dc2626' : 
              factor.severity === 'high' ? '#ea580c' : 
              factor.severity === 'medium' ? '#ca8a04' : '#16a34a'
            }; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; margin-right: 8px;">
              ${escapeHtml(factor.severity)}
            </span>
            <span style="color: #6b7280; font-size: 12px;">${escapeHtml(factor.category)}</span>
            <p style="margin: 4px 0 0 0; color: #374151; font-size: 14px;">${escapeHtml(factor.description)}</p>
          </td>
        </tr>
      `).join('')
    : '<tr><td style="padding: 8px 0; color: #6b7280; font-style: italic;">No specific factors identified</td></tr>';

  const content = `
    <!-- Header -->
    <tr>
      <td style="background: ${headerGradient}; padding: 32px 40px; border-radius: 12px 12px 0 0;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ${emoji} ${title}
              </h1>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding: 32px 40px;">
        <p style="margin: 0 0 16px 0; font-size: 16px;">
          The system data health score has dropped to a ${isWarning ? 'concerning' : 'critical'} level that requires attention.
        </p>
        
        <!-- Score Box -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
          <tr>
            <td style="background-color: ${bgColor}; border: 2px solid ${borderColor}; border-radius: 12px; padding: 24px; text-align: center;">
              <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Current Score</p>
              <p style="margin: 0; color: ${headerColor}; font-size: 48px; font-weight: 700; line-height: 1;">
                ${data.score}<span style="font-size: 24px; color: #9ca3af;">/100</span>
              </p>
              <p style="margin: 8px 0 0 0; color: ${headerColor}; font-size: 18px; font-weight: 600;">
                ${escapeHtml(data.grade.toUpperCase())}
              </p>
            </td>
          </tr>
        </table>
        
        <!-- Factors Section -->
        <h3 style="margin: 24px 0 12px 0; color: #374151; font-size: 16px; font-weight: 600;">
          Top Issues Impacting Score:
        </h3>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0;">
          ${factorsHtml}
        </table>
        
        <!-- CTA Button -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 24px 0;">
          <tr>
            <td align="center">
              <a href="${escapeHtml(data.dashboardUrl)}" style="display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                View Dashboard →
              </a>
            </td>
          </tr>
        </table>
        
        <p style="margin: 24px 0 0 0; color: #6b7280; font-size: 14px;">
          Detected at: ${escapeHtml(data.timestamp)}
        </p>
      </td>
    </tr>
  `;
  
  return baseTemplate(content);
}
