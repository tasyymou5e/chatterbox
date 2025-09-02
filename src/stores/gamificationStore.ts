import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { 
  wishlistInputSchema, 
  getCurrentUserId, 
  requireAuth, 
  sanitizeInput,
  createStoreError,
  createStoreSuccess,
  type StoreResult,
  type StoreError
} from '@/services/storeUtils';

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

interface GamificationState {
  // State
  userLevel: UserLevel | null;
  userPoints: UserPoints | null;
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  wishlistItems: WishlistItem[];
  dailyStreaks: DailyStreak[];
  leaderboard: FamilyLeaderboard[];
  loading: boolean;
  error: StoreError | null;
  userId: string | null;
  familyId: string | null;

  // Actions
  setUserId: (userId: string | null) => void;
  setFamilyId: (familyId: string | null) => void;
  fetchUserLevel: () => Promise<void>;
  fetchUserPoints: () => Promise<void>;
  fetchAchievements: () => Promise<void>;
  fetchUserAchievements: () => Promise<void>;
  fetchWishlistItems: () => Promise<void>;
  fetchDailyStreaks: () => Promise<void>;
  fetchLeaderboard: (type?: string) => Promise<void>;
  addWishlistItem: (itemData: { item_name: string; description?: string; point_cost: number; reward_type?: 'points' | 'custom' | 'privilege' | 'activity'; image_url?: string; }) => Promise<StoreResult>;
  redeemWishlistItem: (itemId: string) => Promise<StoreResult>;
  checkAchievements: () => Promise<void>;
  refetch: () => Promise<void>;
  clearError: () => void;
}

export const useGamificationStore = create<GamificationState>()(
  devtools(
    (set, get) => ({
      // Initial state
      userLevel: null,
      userPoints: null,
      achievements: [],
      userAchievements: [],
      wishlistItems: [],
      dailyStreaks: [],
      leaderboard: [],
      loading: true,
      error: null,
      userId: null,
      familyId: null,

      clearError: () => set({ error: null }),

      // Actions
      setUserId: (userId) => {
        set({ userId });
        if (userId && get().familyId) {
          get().refetch();
        }
      },

      setFamilyId: (familyId) => {
        set({ familyId });
        if (get().userId && familyId) {
          get().refetch();
        }
      },

      fetchUserLevel: async () => {
        const { userId, familyId } = get();
        if (!userId || !familyId) return;

        try {
          const { data, error } = await supabase
            .from('user_levels')
            .select('*')
            .eq('user_id', userId)
            .eq('family_id', familyId)
            .maybeSingle();

          if (error) {
            console.error('Error fetching user level:', error);
            return;
          }

          set({ userLevel: data });
        } catch (error) {
          console.error('Error fetching user level:', error);
        }
      },

      fetchUserPoints: async () => {
        const { userId, familyId } = get();
        if (!userId || !familyId) return;

        try {
          const { data, error } = await supabase
            .from('user_points')
            .select('*')
            .eq('user_id', userId)
            .eq('family_id', familyId)
            .maybeSingle();

          if (error) {
            console.error('Error fetching user points:', error);
            return;
          }

          set({ userPoints: data });
        } catch (error) {
          console.error('Error fetching user points:', error);
        }
      },

      fetchAchievements: async () => {
        try {
          const { data, error } = await supabase
            .from('achievements')
            .select('*')
            .eq('is_active', true)
            .order('rarity', { ascending: false });

          if (error) {
            console.error('Error fetching achievements:', error);
            return;
          }

          set({ achievements: data || [] });
        } catch (error) {
          console.error('Error fetching achievements:', error);
        }
      },

      fetchUserAchievements: async () => {
        const { userId, familyId } = get();
        if (!userId || !familyId) return;

        try {
          const { data, error } = await supabase
            .from('user_achievements')
            .select(`
              *,
              achievements (
                id,
                name,
                description,
                icon,
                achievement_type,
                point_reward,
                xp_reward,
                rarity,
                is_secret,
                unlock_criteria,
                is_active
              )
            `)
            .eq('user_id', userId)
            .eq('family_id', familyId)
            .order('unlocked_at', { ascending: false });

          if (error) {
            console.error('Error fetching user achievements:', error);
            return;
          }

          set({ userAchievements: data as any || [] });
        } catch (error) {
          console.error('Error fetching user achievements:', error);
        }
      },

      fetchWishlistItems: async () => {
        const { userId, familyId } = get();
        if (!userId || !familyId) return;

        try {
          const { data, error } = await supabase
            .from('wishlist_items')
            .select('*')
            .eq('user_id', userId)
            .eq('family_id', familyId)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Error fetching wishlist items:', error);
            return;
          }

          set({ wishlistItems: data || [] });
        } catch (error) {
          console.error('Error fetching wishlist items:', error);
        }
      },

      fetchDailyStreaks: async () => {
        const { userId, familyId } = get();
        if (!userId || !familyId) return;

        try {
          const { data, error } = await supabase
            .from('daily_streaks')
            .select('*')
            .eq('user_id', userId)
            .eq('family_id', familyId)
            .order('current_streak', { ascending: false });

          if (error) {
            console.error('Error fetching daily streaks:', error);
            return;
          }

          set({ dailyStreaks: data || [] });
        } catch (error) {
          console.error('Error fetching daily streaks:', error);
        }
      },

      fetchLeaderboard: async (type: string = 'weekly') => {
        const { familyId } = get();
        if (!familyId) return;

        try {
          const { data, error } = await supabase
            .from('family_leaderboards')
            .select(`
              *,
              profiles (
                first_name,
                last_name
              )
            `)
            .eq('family_id', familyId)
            .eq('leaderboard_type', type)
            .gte('period_start', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('rank');

          if (error) {
            console.error('Error fetching leaderboard:', error);
            return;
          }

          set({ leaderboard: data as any || [] });
        } catch (error) {
          console.error('Error fetching leaderboard:', error);
        }
      },

      addWishlistItem: async (itemData) => {
        const { userId, familyId, fetchWishlistItems } = get();
        if (!userId || !familyId) {
          const error = createStoreError('auth', 'Authentication required');
          set({ error });
          return { success: false, error };
        }

        try {
          // Validate and sanitize input
          wishlistInputSchema.parse(itemData);
          
          const sanitizedData = {
            ...itemData,
            item_name: sanitizeInput(itemData.item_name),
            description: itemData.description ? sanitizeInput(itemData.description) : undefined,
            user_id: userId,
            family_id: familyId,
            reward_type: itemData.reward_type || 'custom',
          };

          const { data, error } = await supabase
            .from('wishlist_items')
            .insert(sanitizedData)
            .select()
            .single();

          if (error) {
            console.error('Error adding wishlist item:', error);
            const storeError = createStoreError('network', 'Failed to add wishlist item', error.code, { error });
            set({ error: storeError });
            return { success: false, error: storeError };
          }

          await fetchWishlistItems();
          return { success: true, result: createStoreSuccess(data, 'Wishlist item added successfully') };
        } catch (error: any) {
          console.error('Error adding wishlist item:', error);
          const storeError = error.name === 'ZodError' 
            ? createStoreError('validation', 'Invalid input data', undefined, { validation: error.errors })
            : createStoreError('network', error.message || 'Failed to add wishlist item');
          set({ error: storeError });
          return { success: false, error: storeError };
        }
      },

      redeemWishlistItem: async (itemId: string) => {
        const { userId, familyId, userPoints, wishlistItems, fetchUserPoints, fetchWishlistItems } = get();
        if (!userId || !familyId) {
          const error = createStoreError('auth', 'Authentication required');
          set({ error });
          return { success: false, error };
        }

        const item = wishlistItems.find(w => w.id === itemId);
        if (!item) {
          const error = createStoreError('validation', 'Item not found');
          set({ error });
          return { success: false, error };
        }

        if (!userPoints || userPoints.current_points < item.point_cost) {
          const error = createStoreError('validation', `You need ${item.point_cost} points to redeem this item`);
          set({ error });
          return { success: false, error };
        }

        if (!item.is_approved) {
          const error = createStoreError('permission', 'This item needs parent approval before redemption');
          set({ error });
          return { success: false, error };
        }

        try {
          // Create redemption record
          const { data: redemption, error: redemptionError } = await supabase
            .from('reward_redemptions')
            .insert({
              user_id: userId,
              family_id: familyId,
              wishlist_item_id: itemId,
              points_spent: item.point_cost,
            })
            .select()
            .single();

          if (redemptionError) {
            console.error('Error creating redemption:', redemptionError);
            const error = createStoreError('network', 'Failed to redeem item', redemptionError.code, { error: redemptionError });
            set({ error });
            return { success: false, error };
          }

          // Update wishlist item
          const { error: updateError } = await supabase
            .from('wishlist_items')
            .update({
              is_redeemed: true,
              redeemed_at: new Date().toISOString(),
            })
            .eq('id', itemId);

          if (updateError) {
            console.error('Error updating wishlist item:', updateError);
          }

          // Update user points
          const { error: pointsError } = await supabase
            .from('user_points')
            .update({
              current_points: userPoints.current_points - item.point_cost,
              points_spent: userPoints.points_spent + item.point_cost,
            })
            .eq('user_id', userId)
            .eq('family_id', familyId);

          if (pointsError) {
            console.error('Error updating points:', pointsError);
          }

          // Refresh data
          await Promise.all([
            fetchUserPoints(),
            fetchWishlistItems(),
          ]);

          return { 
            success: true, 
            result: createStoreSuccess(redemption, `Redeemed "${item.item_name}" for ${item.point_cost} points`)
          };
        } catch (error: any) {
          console.error('Error redeeming wishlist item:', error);
          const storeError = createStoreError('network', error.message || 'Failed to redeem item');
          set({ error: storeError });
          return { success: false, error: storeError };
        }
      },

      checkAchievements: async () => {
        const { userId, familyId, fetchUserAchievements } = get();
        if (!userId || !familyId) return;

        try {
          const { data, error } = await supabase.rpc('check_and_award_achievements', {
            p_user_id: userId,
            p_family_id: familyId,
          });

          if (error) {
            console.error('Error checking achievements:', error);
            const storeError = createStoreError('network', 'Failed to check achievements', error.code, { error });
            set({ error: storeError });
            return;
          }

          if (data && data.length > 0) {
            // Log achievements earned - UI layer will handle notifications
            console.log('🏆 Achievements earned:', data.map((a: any) => a.achievement_name));

            // Refresh achievements
            await fetchUserAchievements();
          }
        } catch (error: any) {
          console.error('Error checking achievements:', error);
          const storeError = createStoreError('network', error.message || 'Failed to check achievements');
          set({ error: storeError });
        }
      },

      refetch: async () => {
        const { userId, familyId } = get();
        if (!userId || !familyId) return;

        set({ loading: true });
        await Promise.all([
          get().fetchUserLevel(),
          get().fetchUserPoints(),
          get().fetchAchievements(),
          get().fetchUserAchievements(),
          get().fetchWishlistItems(),
          get().fetchDailyStreaks(),
          get().fetchLeaderboard(),
        ]);
        set({ loading: false });
      },
    }),
    { name: 'GamificationStore' }
  )
);