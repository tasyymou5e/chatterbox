import { supabase } from '@/integrations/supabase/client';
import { logSupabaseQuery, logDataAccessIssue, logDataFetchSuccess } from '@/utils/parentPortalLogger';
import { secureLog } from '@/utils/secureLogging';
import { cLog, cWarn } from '@/utils/conditionalLogger';

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
      secureLog.error('Error fetching secure family info', error, 'SecureFamilyAccess');
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    secureLog.error('Error in getSecureFamilyInfo', error, 'SecureFamilyAccess');
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
      secureLog.error('Error checking family access', error, 'SecureFamilyAccess');
      return false;
    }

    return data || false;
  } catch (error) {
    secureLog.error('Error in checkFamilyAccess', error, 'SecureFamilyAccess');
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
      logDataAccessIssue('secureFamilyAccess', 'Access denied to family members', {
        familyId,
        expectedData: 'family member access',
        actualResult: 'access denied'
      });
      return [];
    }

    // Fetch family members with profile data
    const { data: members, error } = await supabase
      .from('family_members')
      .select('user_id, family_id, role, joined_at')
      .eq('family_id', familyId);

    logSupabaseQuery(
      { component: 'secureFamilyAccess', operation: 'getSecureFamilyMembers', table: 'family_members', familyId },
      { success: !error, error, rowCount: members?.length || 0 }
    );

    if (error) {
      secureLog.error('Error fetching family members', error, 'SecureFamilyAccess');
      return [];
    }

    if (!members || members.length === 0) {
      logDataAccessIssue('secureFamilyAccess', 'No family members found', {
        familyId,
        expectedData: 'at least 1 member',
        actualResult: '0 members'
      });
      return [];
    }

    // Fetch profiles for all members
    const userIds = members.map(m => m.user_id);
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name')
      .in('user_id', userIds);

    logSupabaseQuery(
      { component: 'secureFamilyAccess', operation: 'fetchMemberProfiles', table: 'profiles', familyId },
      { success: !profileError, error: profileError, rowCount: profiles?.length || 0 }
    );

    if (profileError) {
      secureLog.error('Error fetching profiles for family members', profileError, 'SecureFamilyAccess');
      // Still return members even if profile fetch fails
      logDataAccessIssue('secureFamilyAccess', 'Profile fetch failed, returning members without names', {
        familyId,
        expectedData: `profiles for ${userIds.length} members`,
        actualResult: 'profile query failed'
      });
      return members.map(member => ({
        ...member,
        first_name: undefined,
        last_name: undefined,
        joined_at: member.joined_at ?? new Date().toISOString(),
      })) as FamilyMemberInfo[];
    }

    // Merge profile data with member data
    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    
    const result: FamilyMemberInfo[] = members.map(member => ({
      ...member,
      first_name: profileMap.get(member.user_id)?.first_name || undefined,
      last_name: profileMap.get(member.user_id)?.last_name || undefined,
      joined_at: member.joined_at ?? new Date().toISOString(),
    }));

    // Log if some profiles are missing
    const missingProfiles = members.filter(m => !profileMap.has(m.user_id));
    if (missingProfiles.length > 0) {
      logDataAccessIssue('secureFamilyAccess', 'Some member profiles not found', {
        familyId,
        expectedData: `${members.length} profiles`,
        actualResult: `${profiles?.length || 0} profiles found, ${missingProfiles.length} missing`
      });
    }

    logDataFetchSuccess('secureFamilyAccess.getSecureFamilyMembers', {
      recordCount: result.length,
    });

    return result;
  } catch (error) {
    secureLog.error('Error in getSecureFamilyMembers', error, 'SecureFamilyAccess');
    logDataAccessIssue('secureFamilyAccess', 'Exception in getSecureFamilyMembers', {
      familyId,
      actualResult: error instanceof Error ? error.message : 'Unknown error'
    });
    return [];
  }
};

/**
 * Get family IDs where user is a member
 */
export const getUserFamilyIds = async (userId: string): Promise<string[]> => {
  try {
    const { data: memberFamilies, error } = await supabase
      .from('family_members')
      .select('family_id')
      .eq('user_id', userId);

    if (error) {
      secureLog.error('Error fetching family memberships', error, 'SecureFamilyAccess');
      return [];
    }

    return memberFamilies?.map(mf => mf.family_id) || [];
  } catch (error) {
    secureLog.error('Error in getUserFamilyIds', error, 'SecureFamilyAccess');
    return [];
  }
};

/**
 * Securely get current user's families (where user is creator OR member)
 */
export const getCurrentUserFamilies = async (): Promise<SecureFamilyInfo[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      cWarn('getCurrentUserFamilies: No authenticated user');
      return [];
    }

    // Step 1: Get family IDs where user is a member
    const memberFamilyIds = await getUserFamilyIds(user.id);

    // Step 2: Get families where user is creator
    const { data: creatorFamilies, error: creatorError } = await supabase
      .from('families')
      .select('id, display_name, created_at')
      .eq('created_by', user.id);

    if (creatorError) {
      secureLog.error('Error fetching created families', creatorError, 'SecureFamilyAccess');
    }

    // Step 3: Get families by member IDs (if any)
    let memberFamiliesData: SecureFamilyInfo[] = [];
    if (memberFamilyIds.length > 0) {
      const { data: familiesById, error: familiesError } = await supabase
        .from('families')
        .select('id, display_name, created_at')
        .in('id', memberFamilyIds);

      if (familiesError) {
        secureLog.error('Error fetching member families', familiesError, 'SecureFamilyAccess');
      } else {
        memberFamiliesData = familiesById || [];
      }
    }

    // Step 4: Merge and deduplicate results
    const allFamilies = [...(creatorFamilies || []), ...memberFamiliesData];
    const uniqueFamilies = allFamilies.filter((family, index, self) =>
      index === self.findIndex(f => f.id === family.id)
    );

    cLog('getCurrentUserFamilies: Found ' + uniqueFamilies.length + ' families for user');
    return uniqueFamilies;
  } catch (error) {
    secureLog.error('Error in getCurrentUserFamilies', error, 'SecureFamilyAccess');
    return [];
  }
};

/**
 * Validate family access before performing operations
 */
export const validateFamilyOperation = async (
  familyId: string,
  _operation: string,
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
    secureLog.error('Error validating family operation', error, 'SecureFamilyAccess');
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
        invited_email: invitedEmail.toLowerCase().trim(),
        connection_role: connectionRole,
        permissions: permissions as any,
        invited_by: user.id,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
      });

    if (error) {
      secureLog.error('Error creating family invitation', error, 'SecureFamilyAccess');
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    secureLog.error('Error in createSecureFamilyInvitation', error, 'SecureFamilyAccess');
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
      cWarn('Access denied to family invitations: ' + validation.reason);
      return [];
    }

    const { data, error } = await supabase
      .from('family_invitations')
      .select('id, invited_email, connection_role, permissions, created_at, expires_at, accepted_at')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false });

    if (error) {
      secureLog.error('Error fetching family invitations', error, 'SecureFamilyAccess');
      return [];
    }

    return data || [];
  } catch (error) {
    secureLog.error('Error in getSecureFamilyInvitations', error, 'SecureFamilyAccess');
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
      cWarn('Access denied: Admin role required for security alerts');
      return [];
    }

    const { data, error } = await supabase
      .from('security_audit_logs')
      .select('id, event_type, severity, user_id, ip_address, user_agent, event_details, session_id, resolved, resolved_at, resolved_by, created_at')
      .eq('event_type', 'family_access_attempt')
      .eq('severity', 'high')
      .gte('created_at', new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      secureLog.error('Error fetching security alerts', error, 'SecureFamilyAccess');
      return [];
    }

    return data || [];
  } catch (error) {
    secureLog.error('Error in getSecurityAlerts', error, 'SecureFamilyAccess');
    return [];
  }
};