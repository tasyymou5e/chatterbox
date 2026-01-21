// Bridge adapter - migrated to use Zustand store internally
import { useEffect } from 'react';
import { useGamificationStore } from '@/stores/gamificationStore';
import { useAuth } from './useAuth';
import type { AchievementCriteria } from '@/types/gamification';

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
  requirements: AchievementCriteria;
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
    addWishlistItem,
    redeemWishlistItem,
    checkAchievements,
    refetch
  } = useGamificationStore();

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

  return {
    userLevel,
    userPoints,
    achievements,
    userAchievements,
    wishlistItems,
    dailyStreaks,
    leaderboard,
    loading,
    error,
    addWishlistItem,
    redeemWishlistItem,
    checkAchievements,
    refetch
  };
};