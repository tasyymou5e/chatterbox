import { supabase } from '@/integrations/supabase/client';

/**
 * Secure family access utilities
 * These functions use the enhanced security functions to ensure strict data isolation
 */

export interface SecureFamilyInfo {
  id: string;
  display_name: string;
  created_at: string;
}

export interface FamilyMemberInfo {
  user_id: string;
  family_id: string;
  role: string;
  joined_at: string;
  first_name?: string;
  last_name?: string;
}

/**
 * Securely get family information using the secure access function
 */
export const getSecureFamilyInfo = async (familyId: string): Promise<SecureFamilyInfo | null> => {
  try {
    const { data, error } = await supabase.rpc('get_family_safe_data', {
      family_id_param: familyId
    });

    if (error) {
      console.error('Error fetching secure family info:', error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error('Error in getSecureFamilyInfo:', error);
    return null;
  }
};

/**
 * Check if current user has access to a specific family
 */
export const checkFamilyAccess = async (familyId: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase.rpc('has_family_access', {
      family_id_param: familyId
    });

    if (error) {
      console.error('Error checking family access:', error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error('Error in checkFamilyAccess:', error);
    return false;
  }
};

/**
 * Securely get family members (only for users with proper access)
 */
export const getSecureFamilyMembers = async (familyId: string): Promise<FamilyMemberInfo[]> => {
  try {
    // First check if user has access
    const hasAccess = await checkFamilyAccess(familyId);
    if (!hasAccess) {
      console.warn('Access denied to family members for family:', familyId);
      return [];
    }

    // Fetch family members with profile data
    const { data: members, error } = await supabase
      .from('family_members')
      .select('user_id, family_id, role, joined_at')
      .eq('family_id', familyId);

    if (error) {
      console.error('Error fetching family members:', error);
      return [];
    }

    if (!members || members.length === 0) {
      return [];
    }

    // Fetch profiles for all members
    const userIds = members.map(m => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name')
      .in('user_id', userIds);

    // Merge profile data with member data
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    
    return members.map(member => ({
      ...member,
      first_name: profileMap.get(member.user_id)?.first_name || undefined,
      last_name: profileMap.get(member.user_id)?.last_name || undefined,
    }));
  } catch (error) {
    console.error('Error in getSecureFamilyMembers:', error);
    return [];
  }
};

/**
 * Securely get current user's families
 */
export const getCurrentUserFamilies = async (): Promise<SecureFamilyInfo[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get families where user is creator or member
    const { data: families, error } = await supabase
      .from('families')
      .select('id, display_name, created_at')
      .or(`created_by.eq.${user.id},id.in.(select family_id from family_members where user_id=${user.id})`);

    if (error) {
      console.error('Error fetching user families:', error);
      return [];
    }

    return families || [];
  } catch (error) {
    console.error('Error in getCurrentUserFamilies:', error);
    return [];
  }
};

/**
 * Validate family access before performing operations
 */
export const validateFamilyOperation = async (
  familyId: string,
  operation: string,
  requiresCreatorAccess: boolean = false
): Promise<{ allowed: boolean; reason?: string }> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { allowed: false, reason: 'User not authenticated' };
    }

    // Check general family access first
    const hasAccess = await checkFamilyAccess(familyId);
    if (!hasAccess) {
      return { allowed: false, reason: 'Not a member of this family' };
    }

    // If creator access is required, check that too
    if (requiresCreatorAccess) {
      const { data: isCreator, error } = await supabase.rpc('is_family_creator_secure', {
        family_id_param: familyId,
        user_id_param: user.id
      });

      if (error || !isCreator) {
        return { allowed: false, reason: 'Operation requires family creator privileges' };
      }
    }

    return { allowed: true };
  } catch (error) {
    console.error('Error validating family operation:', error);
    return { allowed: false, reason: 'Validation failed' };
  }
};

/**
 * Securely create family invitation with enhanced validation
 */
export const createSecureFamilyInvitation = async (
  familyId: string,
  invitedEmail: string,
  connectionRole: 'admin' | 'parent' | 'child' | 'therapist' | 'teacher' | 'grandparent' | 'family_friend',
  permissions: Record<string, boolean> = {}
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Validate the operation first
    const validation = await validateFamilyOperation(familyId, 'create_invitation', true);
    if (!validation.allowed) {
      return { success: false, error: validation.reason };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    const { error } = await supabase
      .from('family_invitations')
      .insert({
        family_id: familyId,
        invited_email: invitedEmail,
        connection_role: connectionRole,
        permissions: permissions as any,
        invited_by: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      });

    if (error) {
      console.error('Error creating family invitation:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Error in createSecureFamilyInvitation:', error);
    return { success: false, error: 'An unexpected error occurred' };
  }
};

/**
 * Get family invitations with secure access control
 */
export const getSecureFamilyInvitations = async (familyId: string) => {
  try {
    // Validate access first
    const validation = await validateFamilyOperation(familyId, 'view_invitations', true);
    if (!validation.allowed) {
      console.warn('Access denied to family invitations:', validation.reason);
      return [];
    }

    const { data, error } = await supabase
      .from('family_invitations')
      .select('id, invited_email, connection_role, permissions, created_at, expires_at, accepted_at')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching family invitations:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getSecureFamilyInvitations:', error);
    return [];
  }
};

/**
 * Monitor for suspicious family access patterns (for admin use)
 */
export const getSecurityAlerts = async (hoursBack: number = 24) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Check if user is admin
    const { data: isAdmin } = await supabase.rpc('has_role', {
      _user_id: user.id,
      _role: 'admin'
    });

    if (!isAdmin) {
      console.warn('Access denied: Admin role required for security alerts');
      return [];
    }

    const { data, error } = await supabase
      .from('security_audit_logs')
      .select('*')
      .eq('event_type', 'family_access_attempt')
      .eq('severity', 'high')
      .gte('created_at', new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching security alerts:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getSecurityAlerts:', error);
    return [];
  }
};