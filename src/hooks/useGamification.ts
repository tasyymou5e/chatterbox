import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useGamificationStore } from '@/stores/gamificationStore';
import { useStoreResult } from '@/hooks/useStoreResult';

interface UserLevel {
  id: string;
  user_id: string;
  family_id: string;
  current_level: number;
  current_xp: number;
  total_xp: number;
  level_name: string;
  next_level_xp: number;
  level_up_date: string | null;
}

interface UserPoints {
  id: string;
  user_id: string;
  family_id: string;
  current_points: number;
  lifetime_points: number;
  points_spent: number;
  weekly_points: number;
  monthly_points: number;
  last_reset_date: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string | null;
  achievement_type: 'streak' | 'skill' | 'collaboration' | 'milestone' | 'special';
  unlock_criteria: any;
  point_reward: number;
  xp_reward: number;
  rarity: string;
  is_secret: boolean;
  is_active: boolean;
}

interface UserAchievement {
  id: string;
  user_id: string;
  family_id: string;
  achievement_id: string;
  unlocked_at: string;
  progress: any;
  metadata: any;
  achievements: Achievement;
}

interface WishlistItem {
  id: string;
  user_id: string;
  family_id: string;
  item_name: string;
  description: string | null;
  point_cost: number;
  reward_type: 'points' | 'custom' | 'privilege' | 'activity';
  image_url: string | null;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  is_redeemed: boolean;
  redeemed_at: string | null;
}

interface DailyStreak {
  id: string;
  user_id: string;
  family_id: string;
  streak_type: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  streak_start_date: string | null;
  bonus_multiplier: number;
}

interface FamilyLeaderboard {
  id: string;
  family_id: string;
  user_id: string;
  leaderboard_type: string;
  points: number;
  rank: number;
  chores_completed: number;
  achievements_unlocked: number;
  collaboration_score: number;
  period_start: string;
  period_end: string;
  profiles: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

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

  const handleResult = useStoreResult();

  // Set user and family ID when available
  useEffect(() => {
    if (user) {
      setUserId(user.id);
    }
  }, [user, setUserId]);

  useEffect(() => {
    if (familyId) {
      setFamilyId(familyId);
    }
  }, [familyId, setFamilyId]);

  // Wrapper functions with UI feedback
  const addWishlistItem = async (itemData: {
    item_name: string;
    description?: string;
    point_cost: number;
    reward_type?: 'points' | 'custom' | 'privilege' | 'activity';
    image_url?: string;
  }) => {
    const result = await storeAddWishlistItem(itemData);
    return handleResult(result, {
      successTitle: 'Success',
      errorTitle: 'Error adding item'
    });
  };

  const redeemWishlistItem = async (itemId: string) => {
    const result = await storeRedeemWishlistItem(itemId);
    return handleResult(result, {
      successTitle: 'Success!',
      errorTitle: 'Error redeeming item'
    });
  };

  const checkAchievements = async () => {
    // The store function handles its own error reporting and notifications
    await storeCheckAchievements();
    return null;
  };

  return {
    // Data
    userLevel,
    userPoints,
    achievements,
    userAchievements,
    wishlistItems,
    dailyStreaks,
    leaderboard,
    loading,
    error,

    // Actions
    addWishlistItem,
    redeemWishlistItem,
    checkAchievements,

    // Refresh
    refetch,
  };
};
