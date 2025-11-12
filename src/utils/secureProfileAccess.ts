import { supabase } from '@/integrations/supabase/client';

/**
 * Secure utility functions for accessing profile data
 * These functions ensure proper authentication and authorization
 */

export interface SafeProfile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  created_at: string;
}

export interface AdminProfile extends SafeProfile {
  updated_at: string;
}

/**
 * Get current user's own profile (authenticated users only)
 */
export const getCurrentUserProfile = async (): Promise<AdminProfile | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, created_at, updated_at')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getCurrentUserProfile:', error);
    return null;
  }
};

/**
 * Get family member profiles (for parents and admins only)
 */
export const getFamilyMemberProfiles = async (familyId: string): Promise<SafeProfile[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Get family member user IDs first
    const { data: members, error: membersError } = await supabase
      .from('family_members')
      .select('user_id')
      .eq('family_id', familyId);

    if (membersError || !members) return [];

    // Get safe profile data for family members
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, created_at')
      .in('user_id', members.map(m => m.user_id));

    if (error) {
      console.error('Error fetching family profiles:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getFamilyMemberProfiles:', error);
    return [];
  }
};

/**
 * Admin-only function to get all profiles (without email for security)
 */
export const getAdminProfiles = async (): Promise<AdminProfile[]> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, first_name, last_name, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admin profiles:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAdminProfiles:', error);
    return [];
  }
};

/**
 * Admin-only function to get profile counts for statistics
 */
export const getProfileCounts = async (): Promise<{
  total: number;
  recent: number;
  daily: number;
  weekly: number;
  monthly: number;
} | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalResult, dailyResult, weeklyResult, monthlyResult] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true })
        .gte('created_at', oneDayAgo.toISOString()),
      supabase.from('profiles').select('*', { count: 'exact', head: true })
        .gte('created_at', oneWeekAgo.toISOString()),
      supabase.from('profiles').select('*', { count: 'exact', head: true })
        .gte('created_at', oneMonthAgo.toISOString())
    ]);

    return {
      total: totalResult.count || 0,
      recent: oneWeekAgo ? (totalResult.count || 0) : 0,
      daily: dailyResult.count || 0,
      weekly: weeklyResult.count || 0,
      monthly: monthlyResult.count || 0
    };
  } catch (error) {
    console.error('Error in getProfileCounts:', error);
    return null;
  }
};

/**
 * Update current user's own profile
 */
export const updateUserProfile = async (updates: {
  first_name?: string;
  last_name?: string;
}): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating profile:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateUserProfile:', error);
    return false;
  }
};