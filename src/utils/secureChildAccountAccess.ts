import { supabase } from '@/integrations/supabase/client';

/**
 * Secure utility functions for child account access
 * These functions ensure proper authentication and authorization for child accounts
 */

export interface ChildAccountInfo {
  id: string;
  family_id: string;
  first_name: string;
  last_name: string;
  family_code: string;
  generated_email: string;
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

/**
 * Validate child account access using family code and email (for account completion)
 * Now includes expiration checking
 */
export const validateChildAccountAccess = async (
  familyCode: string, 
  email: string
): Promise<{ valid: boolean; expired?: boolean; error?: string }> => {
  try {
    // First check if the account exists and get expiration info
    const { data: account, error: fetchError } = await supabase
      .from('child_accounts')
      .select('id, expires_at, status')
      .eq('family_code', familyCode)
      .eq('generated_email', email)
      .single();

    if (fetchError) {
      console.error('Error fetching child account:', fetchError);
      return { valid: false, error: 'Account not found' };
    }

    if (!account) {
      return { valid: false, error: 'Invalid family code or email' };
    }

    // Check if account has expired
    if (account.expires_at && new Date(account.expires_at) < new Date()) {
      return { valid: false, expired: true, error: 'Account access code has expired' };
    }

    // Check if already completed
    if (account.status !== 'pending') {
      return { valid: false, error: 'Account has already been activated' };
    }

    // Use RPC for additional security validation
    const { data, error } = await supabase.rpc('validate_child_account_access', {
      p_family_code: familyCode,
      p_email: email
    });

    if (error) {
      console.error('Error validating child account access:', error);
      return { valid: false, error: 'Validation failed' };
    }

    return { valid: data || false };
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
  password?: string
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
        password: password || undefined
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
 */
export const getCurrentChildAccount = async (): Promise<SafeChildAccountInfo | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // RLS policies ensure children can only see their own account
    const { data, error } = await supabase
      .from('child_accounts')
      .select('id, first_name, last_name, status, created_at')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching current child account:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getCurrentChildAccount:', error);
    return null;
  }
};