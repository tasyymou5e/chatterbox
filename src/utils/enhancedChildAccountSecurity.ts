import { supabase } from '@/integrations/supabase/client';

interface ChildAccountValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  securityScore: number;
}

interface ChildAccountSecurityConfig {
  maxAccountsPerDay: number;
  maxAccountsPerFamily: number;
  codeExpirationHours: number;
  minCodeComplexity: number;
}

const DEFAULT_SECURITY_CONFIG: ChildAccountSecurityConfig = {
  maxAccountsPerDay: 3,
  maxAccountsPerFamily: 8,
  codeExpirationHours: 168, // 7 days
  minCodeComplexity: 8
};

/**
 * Enhanced validation for child account creation
 */
export const validateChildAccountSecurity = async (
  familyId: string,
  firstName: string,
  lastName: string
): Promise<ChildAccountValidation> => {
  const validation: ChildAccountValidation = {
    isValid: true,
    errors: [],
    warnings: [],
    securityScore: 100
  };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      validation.errors.push('User not authenticated');
      validation.isValid = false;
      return validation;
    }

    // Check rate limiting - accounts created today
    const { data: todayAccounts } = await supabase
      .from('child_accounts')
      .select('id')
      .eq('created_by', user.id)
      .gte('created_at', new Date().toISOString().split('T')[0]);

    if (todayAccounts && todayAccounts.length >= DEFAULT_SECURITY_CONFIG.maxAccountsPerDay) {
      validation.errors.push(`Maximum ${DEFAULT_SECURITY_CONFIG.maxAccountsPerDay} child accounts per day exceeded`);
      validation.isValid = false;
      validation.securityScore -= 30;
    }

    // Check total accounts per family
    const { data: familyAccounts } = await supabase
      .from('child_accounts')
      .select('id')
      .eq('family_id', familyId)
      .neq('status', 'deleted');

    if (familyAccounts && familyAccounts.length >= DEFAULT_SECURITY_CONFIG.maxAccountsPerFamily) {
      validation.errors.push(`Maximum ${DEFAULT_SECURITY_CONFIG.maxAccountsPerFamily} child accounts per family exceeded`);
      validation.isValid = false;
      validation.securityScore -= 25;
    }

    // Validate name inputs
    if (firstName.length < 2 || lastName.length < 2) {
      validation.errors.push('First name and last name must be at least 2 characters long');
      validation.isValid = false;
      validation.securityScore -= 15;
    }

    // Check for suspicious patterns in names
    const suspiciousPatterns = /[<>{}[\]\\\/\+\*\?\.]/;
    if (suspiciousPatterns.test(firstName) || suspiciousPatterns.test(lastName)) {
      validation.errors.push('Invalid characters in name fields');
      validation.isValid = false;
      validation.securityScore -= 20;
    }

    // Check recent failed attempts
    const { data: recentAttempts } = await supabase
      .from('security_audit_logs')
      .select('id')
      .eq('user_id', user.id)
      .eq('event_type', 'child_account_creation_failed')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString()); // Last hour

    if (recentAttempts && recentAttempts.length > 3) {
      validation.warnings.push('Multiple failed child account creation attempts detected');
      validation.securityScore -= 10;
    }

  } catch (error) {
    validation.errors.push('Security validation failed');
    validation.isValid = false;
    validation.securityScore = 0;
  }

  return validation;
};

/**
 * Enhanced child account code validation
 */
export const validateChildAccountAccess = async (
  familyCode: string,
  email: string
): Promise<{ valid: boolean; expired?: boolean; error?: string }> => {
  try {
    // Input sanitization
    const sanitizedCode = familyCode.trim().toUpperCase();
    const sanitizedEmail = email.trim().toLowerCase();

    // Basic format validation
    if (!/^CHILD-[A-Z0-9]{8}$/.test(sanitizedCode)) {
      return { valid: false, error: 'Invalid family code format' };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitizedEmail)) {
      return { valid: false, error: 'Invalid email format' };
    }

    // Check account exists and is valid
    const { data: account } = await supabase
      .from('child_accounts')
      .select('id, expires_at, status, creation_attempt_count')
      .eq('family_code', sanitizedCode)
      .eq('generated_email', sanitizedEmail)
      .single();

    if (!account) {
      // Log security event for invalid access attempt
      await supabase.functions.invoke('error-collector', {
        body: {
          errorType: 'child_account_access_invalid',
          severity: 'high',
          message: 'Invalid child account access attempt',
          metadata: {
            family_code: sanitizedCode,
            email: sanitizedEmail,
            timestamp: new Date().toISOString()
          }
        }
      });
      return { valid: false, error: 'Invalid family code or email' };
    }

    // Check expiration
    if (new Date(account.expires_at) < new Date()) {
      return { valid: false, expired: true, error: 'Account access has expired' };
    }

    // Check status
    if (account.status !== 'pending') {
      return { valid: false, error: 'Account is no longer available for activation' };
    }

    // Check attempt count (security feature)
    if (account.creation_attempt_count > 5) {
      return { valid: false, error: 'Too many access attempts. Please contact your parent.' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Error validating child account access:', error);
    return { valid: false, error: 'Validation failed. Please try again.' };
  }
};

/**
 * Secure child account cleanup
 */
export const cleanupExpiredChildAccounts = async (): Promise<number> => {
  try {
    const { data: expiredAccounts } = await supabase
      .from('child_accounts')
      .select('id, family_code')
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString());

    if (!expiredAccounts || expiredAccounts.length === 0) {
      return 0;
    }

    // Delete expired accounts
    const { error } = await supabase
      .from('child_accounts')
      .delete()
      .in('id', expiredAccounts.map(acc => acc.id));

    if (error) {
      console.error('Error cleaning up expired accounts:', error);
      return 0;
    }

    // Log cleanup for audit
    await supabase.functions.invoke('error-collector', {
      body: {
        errorType: 'child_account_cleanup',
        severity: 'low',
        message: 'Expired child accounts cleaned up',
        metadata: {
          cleaned_count: expiredAccounts.length,
          timestamp: new Date().toISOString()
        }
      }
    });

    return expiredAccounts.length;
  } catch (error) {
    console.error('Error in cleanup process:', error);
    return 0;
  }
};

/**
 * Enhanced security monitoring for child accounts
 */
export const monitorChildAccountSecurity = async (): Promise<{
  suspiciousActivity: boolean;
  alerts: string[];
}> => {
  try {
    const alerts: string[] = [];
    let suspiciousActivity = false;

    // Check for rapid account creation attempts
    const { data: recentCreations } = await supabase
      .from('child_accounts')
      .select('created_by, created_at')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .order('created_at', { ascending: false });

    if (recentCreations && recentCreations.length > 10) {
      alerts.push('High volume of child account creation detected');
      suspiciousActivity = true;
    }

    // Check for accounts with many failed access attempts
    const { data: failedAttempts } = await supabase
      .from('child_accounts')
      .select('family_code, creation_attempt_count')
      .gt('creation_attempt_count', 3);

    if (failedAttempts && failedAttempts.length > 0) {
      alerts.push(`${failedAttempts.length} child accounts with multiple failed access attempts`);
    }

    return { suspiciousActivity, alerts };
  } catch (error) {
    console.error('Error monitoring child account security:', error);
    return { suspiciousActivity: false, alerts: ['Security monitoring check failed'] };
  }
};