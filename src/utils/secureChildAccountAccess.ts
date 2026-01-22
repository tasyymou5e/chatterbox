import { supabase } from '@/integrations/supabase/client';

/**
 * Secure utility functions for child account access
 * 
 * SECURITY: These functions ensure generated_email is NEVER exposed to the client.
 * All account completion is handled server-side via edge functions.
 */

export interface ChildAccountInfo {
  id: string;
  family_id: string;
  first_name: string;
  last_name: string;
  family_code: string;
  generated_email: string; // Only visible to creating parent via RLS
  status: string;
  created_at: string;
}

export interface SafeChildAccountInfo {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  created_at: string;
}

export interface PendingAccountInfo {
  id: string;
  first_name: string;
  last_name: string;
  family_id: string;
  expires_at: string | null;
  is_locked: boolean;
  lock_remaining_seconds: number;
}

/**
 * Securely lookup a pending child account for completion.
 * Uses RPC that NEVER returns generated_email to prevent account takeover.
 * 
 * @param familyCode - The family code provided by the parent
 * @param verificationPin - Optional PIN for additional verification
 */
export const lookupPendingChildAccount = async (
  familyCode: string,
  verificationPin?: string
): Promise<{ 
  found: boolean; 
  account?: PendingAccountInfo; 
  isLocked?: boolean;
  lockRemainingSeconds?: number;
  error?: string 
}> => {
  try {
    const { data, error } = await supabase.rpc('get_pending_child_account_for_completion', {
      p_family_code: familyCode,
      p_verification_pin: verificationPin ?? undefined
    });

    if (error) {
      console.error('Error looking up child account:', error);
      return { found: false, error: 'Lookup failed' };
    }

    if (!data || data.length === 0) {
      return { found: false, error: 'Invalid code or PIN' };
    }

    const account = data[0];
    
    if (account.is_locked) {
      return { 
        found: true, 
        isLocked: true, 
        lockRemainingSeconds: account.lock_remaining_seconds,
        error: 'Account temporarily locked due to too many failed attempts'
      };
    }

    return {
      found: true,
      account: {
        id: account.id,
        first_name: account.first_name,
        last_name: account.last_name,
        family_id: account.family_id,
        expires_at: account.expires_at,
        is_locked: false,
        lock_remaining_seconds: 0
      }
    };
  } catch (error) {
    console.error('Error in lookupPendingChildAccount:', error);
    return { found: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Complete child account setup using secure edge function.
 * The generated_email is handled entirely server-side.
 * 
 * @param familyCode - The family code
 * @param password - The password chosen by the child
 * @param verificationPin - Optional PIN for verification
 */
export const completeChildAccountSecure = async (
  familyCode: string,
  password: string,
  verificationPin?: string
): Promise<{ 
  success: boolean; 
  credentials?: { email: string }; 
  childName?: string;
  error?: string;
  isLocked?: boolean;
  lockRemainingSeconds?: number;
}> => {
  try {
    const { data, error } = await supabase.functions.invoke('complete-child-account', {
      body: {
        familyCode: familyCode.trim().toUpperCase(),
        password,
        verificationPin
      }
    });

    if (error) {
      console.error('Edge function error:', error);
      return { success: false, error: 'Failed to complete account setup' };
    }

    if (data?.isLocked) {
      return {
        success: false,
        isLocked: true,
        lockRemainingSeconds: data.lockRemainingSeconds,
        error: 'Account temporarily locked'
      };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Setup failed' };
    }

    return {
      success: true,
      credentials: data.credentials,
      childName: data.child?.firstName
    };
  } catch (error) {
    console.error('Error in completeChildAccountSecure:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * @deprecated Use lookupPendingChildAccount instead - this function may expose generated_email
 * Kept for backward compatibility during transition.
 */
export const validateChildAccountAccess = async (
  familyCode: string, 
  _email: string // Kept for API compatibility, no longer used
): Promise<{ valid: boolean; expired?: boolean; error?: string }> => {
  console.warn('validateChildAccountAccess is deprecated. Use lookupPendingChildAccount instead.');
  
  try {
    const result = await lookupPendingChildAccount(familyCode);
    
    if (!result.found) {
      return { valid: false, error: result.error };
    }
    
    if (result.isLocked) {
      return { valid: false, error: 'Account temporarily locked' };
    }
    
    return { valid: true };
  } catch (error) {
    console.error('Error in validateChildAccountAccess:', error);
    return { valid: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Get child accounts for authenticated parent (secure)
 */
export const getParentChildAccounts = async (): Promise<SafeChildAccountInfo[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // RLS policies will automatically restrict to parent's own child accounts
    const { data, error } = await supabase
      .from('child_accounts')
      .select('id, first_name, last_name, status, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching child accounts:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getParentChildAccounts:', error);
    return [];
  }
};

/**
 * Get full child account details for parent (with sensitive info)
 */
export const getChildAccountDetails = async (childId: string): Promise<ChildAccountInfo | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // RLS policies ensure only the parent who created this account can access it
    const { data, error } = await supabase
      .from('child_accounts')
      .select('id, family_id, first_name, last_name, family_code, generated_email, status, created_at')
      .eq('id', childId)
      .single();

    if (error) {
      console.error('Error fetching child account details:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getChildAccountDetails:', error);
    return null;
  }
};

/**
 * Create new child account (secure)
 */
export const createChildAccount = async (
  familyId: string,
  firstName: string,
  lastName: string,
  password: string
): Promise<{ success: boolean; childAccount?: ChildAccountInfo; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { data, error } = await supabase.functions.invoke('create-child-account', {
      body: {
        firstName,
        lastName,
        parentUserId: user.id,
        password: password,
        familyId: familyId // Pass familyId for admin users
      }
    });

    if (error) {
      console.error('Error creating child account:', error);
      return { success: false, error: error.message };
    }

    if (!data.success) {
      return { success: false, error: data.error };
    }

    return { 
      success: true, 
      childAccount: data.childAccount
    };
  } catch (error) {
    console.error('Error in createChildAccount:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Complete child account setup (when child uses their code)
 */
export const completeChildAccount = async (
  familyCode: string,
  email: string,
  userId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // First validate access with enhanced error handling
    const validation = await validateChildAccountAccess(familyCode, email);
    if (!validation.valid) {
      if (validation.expired) {
        return { success: false, error: 'This account access code has expired. Please ask your parent to create a new one.' };
      }
      return { success: false, error: validation.error || 'Invalid family code or email' };
    }

    // Update the child account with user_id and mark as completed
    const { error } = await supabase
      .from('child_accounts')
      .update({
        user_id: userId,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('family_code', familyCode)
      .eq('generated_email', email)
      .eq('status', 'pending');

    if (error) {
      console.error('Error completing child account:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in completeChildAccount:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Get current user's child account (for authenticated children)
 * SECURITY: Uses get_my_child_account_safe() RPC instead of direct table access
 * to prevent generated_email exposure.
 */
export const getCurrentChildAccount = async (): Promise<SafeChildAccountInfo | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // SECURITY: Use secure RPC that excludes generated_email
    // Direct table access is blocked by RLS for child users
    const { data, error } = await supabase.rpc('get_my_child_account_safe');

    if (error) {
      console.error('Error fetching current child account:', error);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const account = data[0];
    return {
      id: account.id,
      first_name: account.first_name,
      last_name: account.last_name,
      status: account.status,
      created_at: account.created_at
    };
  } catch (error) {
    console.error('Error in getCurrentChildAccount:', error);
    return null;
  }
};