/**
 * useChildProfile - Reusable hook for fetching child profile with caching
 */

import { useQuery } from '@tanstack/react-query';
import { cWarn } from '@/utils/conditionalLogger';
import { supabase } from '@/integrations/supabase/client';
import type { ChildProfile, AgeGroup } from '@/types/kidsPortal';

interface UseChildProfileResult {
  profile: ChildProfile | null;
  familyId: string | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useChildProfile(userId: string | undefined): UseChildProfileResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['child-profile', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Get profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      // Get family membership
      const { data: membership, error: membershipError } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', userId)
        .limit(1)
        .single();

      // Family membership is optional
      if (membershipError && membershipError.code !== 'PGRST116') {
        cWarn('Could not fetch family membership', membershipError);
      }

      const childProfile: ChildProfile = {
        id: profile.user_id,
        firstName: profile.first_name || 'Friend',
        lastName: profile.last_name || undefined,
        ageGroup: '6-8' as AgeGroup, // Default age group
        avatarUrl: undefined,
        totalStars: 0,
        totalMoons: 0,
      };

      return {
        profile: childProfile,
        familyId: membership?.family_id || null,
      };
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    profile: data?.profile || null,
    familyId: data?.familyId || null,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
