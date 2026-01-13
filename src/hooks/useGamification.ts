// Bridge adapter - migrated to use Zustand store internally
import { useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGamificationStore } from '@/stores/gamificationStore';
import { useStoreResult } from '@/hooks/useStoreResult';
import { useUIStore } from '@/stores/uiStore';
import { withRetry } from '@/services/storeUtils';

// Re-export interfaces for backward compatibility
export interface UserLevel {
  id: string;
  user_id: string;
  level: number;
  experience_points: number;
  level_name: string;
  next_level_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface UserPoints {
  id: string;
  user_id: string;
  family_id: string;
  total_points: number;
  available_points: number;
  lifetime_points: number;
  created_at: string;
  updated_at: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  points_reward: number;
  requirements: any;
  is_active: boolean;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  earned_at: string;
  points_earned: number;
}

export interface WishlistItem {
  id: string;
  user_id: string;
  family_id: string;
  title: string;
  description?: string;
  points_cost: number;
  category?: string;
  is_redeemed: boolean;
  redeemed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DailyStreak {
  id: string;
  user_id: string;
  family_id: string;
  streak_count: number;
  last_activity_date: string;
  longest_streak: number;
  total_days_active: number;
  created_at: string;
  updated_at: string;
}

export interface FamilyLeaderboard {
  user_id: string;
  user_name: string;
  total_points: number;
  level: number;
  achievements_count: number;
  current_streak: number;
  rank: number;
}

// Individual loading states interface
interface GamificationLoadingStates {
  addWishlistItem: boolean;
  redeemWishlistItem: boolean;
  checkAchievements: boolean;
  fetchUserLevel: boolean;
  fetchUserPoints: boolean;
  fetchAchievements: boolean;
  fetchLeaderboard: boolean;
}

// Bridge adapter hook that uses Zustand store internally  
export const useGamification = (familyId?: string) => {
  const { user } = useAuth();
  const {
    userLevel,
    userPoints,
    achievements,
    userAchievements,
    wishlistItems,
    dailyStreaks,
    leaderboard,
    loading,
    error,
    setUserId,
    setFamilyId,
    addWishlistItem: storeAddWishlistItem,
    redeemWishlistItem: storeRedeemWishlistItem,
    checkAchievements: storeCheckAchievements,
    refetch
  } = useGamificationStore();

  const { setLoading, getLoading } = useUIStore();
  const handleResult = useStoreResult();

  // Generate loading keys for this user/family
  const getLoadingKey = useCallback((operation: string) => 
    `gamification-${operation}-${user?.id || 'unknown'}-${familyId || 'global'}`, [user?.id, familyId]);

  // Individual loading state getters
  const loadingStates: GamificationLoadingStates = {
    addWishlistItem: getLoading(getLoadingKey('add-wishlist')),
    redeemWishlistItem: getLoading(getLoadingKey('redeem-wishlist')),
    checkAchievements: getLoading(getLoadingKey('check-achievements')),
    fetchUserLevel: getLoading(getLoadingKey('fetch-level')),
    fetchUserPoints: getLoading(getLoadingKey('fetch-points')),
    fetchAchievements: getLoading(getLoadingKey('fetch-achievements')),
    fetchLeaderboard: getLoading(getLoadingKey('fetch-leaderboard')),
  };

  // Set user ID and family ID when available
  useEffect(() => {
    if (user?.id) {
      setUserId(user.id);
    }
  }, [user?.id, setUserId]);

  useEffect(() => {
    if (familyId) {
      setFamilyId(familyId);
    }
  }, [familyId, setFamilyId]);

  // Enhanced wrapper functions with individual loading states and retry logic
  const addWishlistItem = async (itemData: {
    item_name: string;
    description?: string;
    point_cost: number;
    reward_type?: 'points' | 'custom' | 'privilege' | 'activity';
    image_url?: string;
  }): Promise<any> => {
    const loadingKey = getLoadingKey('add-wishlist');
    setLoading(loadingKey, true);
    
    try {
      const result = await withRetry(
        () => storeAddWishlistItem(itemData),
        { maxRetries: 2 }
      );
      
      return handleResult(result, {
        successTitle: 'Item Added to Wishlist',
        errorTitle: 'Failed to add wishlist item'
      });
    } finally {
      setLoading(loadingKey, false);
    }
  };

  const redeemWishlistItem = async (itemId: string): Promise<any> => {
    const loadingKey = getLoadingKey('redeem-wishlist');
    setLoading(loadingKey, true);
    
    try {
      const result = await withRetry(
        () => storeRedeemWishlistItem(itemId),
        { maxRetries: 2 }
      );
      
      return handleResult(result, {
        successTitle: 'Item Redeemed Successfully!',
        errorTitle: 'Failed to redeem item'
      });
    } finally {
      setLoading(loadingKey, false);
    }
  };

  const checkAchievements = async (): Promise<void> => {
    const loadingKey = getLoadingKey('check-achievements');
    setLoading(loadingKey, true);
    
    try {
      await withRetry(
        async () => {
          await storeCheckAchievements();
          return { success: true, result: { data: null, message: 'Achievements checked' } };
        },
        { maxRetries: 1 }
      );
    } finally {
      setLoading(loadingKey, false);
    }
  };

  // Retry functions for failed operations
  const retryAddWishlistItem = useCallback(async (itemData: any) => {
    return addWishlistItem(itemData);
  }, []);

  const retryRedeemWishlistItem = useCallback(async (itemId: string) => {
    return redeemWishlistItem(itemId);
  }, []);

  const retryCheckAchievements = useCallback(async () => {
    return checkAchievements();
  }, []);

  return {
    // Data
    userLevel,
    userPoints,
    achievements,
    userAchievements,
    wishlistItems,
    dailyStreaks,
    leaderboard,
    
    // Global loading/error (for backward compatibility)
    loading,
    error,
    
    // Individual loading states
    loadingStates,
    isAddingWishlistItem: loadingStates.addWishlistItem,
    isRedeemingWishlistItem: loadingStates.redeemWishlistItem,
    isCheckingAchievements: loadingStates.checkAchievements,
    
    // Core operations with enhanced error handling
    addWishlistItem,
    redeemWishlistItem,
    checkAchievements,
    
    // Retry functions
    retryAddWishlistItem,
    retryRedeemWishlistItem,
    retryCheckAchievements,

    // Refresh
    refetch: useCallback(refetch, [refetch]),
  };
};