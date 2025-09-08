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
 */
export const validateChildAccountAccess = async (
  familyCode: string, 
  email: string
): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('validate_child_account_access', {
      p_family_code: familyCode,
      p_email: email
    });

    if (error) {
      console.error('Error validating child account access:', error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error('Error in validateChildAccountAccess:', error);
    return false;
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
  lastName: string
): Promise<{ success: boolean; childAccount?: ChildAccountInfo; error?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Use the secure RPC function instead of direct insert
    const { data, error } = await supabase.rpc('create_child_account_secure', {
      p_family_id: familyId,
      p_first_name: firstName,
      p_last_name: lastName
    });

    if (error) {
      console.error('Error creating child account:', error);
      return { success: false, error: error.message };
    }

    // Fetch the created account details
    const childAccount = await getChildAccountDetails(data);
    if (!childAccount) {
      return { success: false, error: 'Failed to retrieve created account' };
    }

    return { success: true, childAccount };
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
    // First validate access
    const isValid = await validateChildAccountAccess(familyCode, email);
    if (!isValid) {
      return { success: false, error: 'Invalid family code or email' };
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