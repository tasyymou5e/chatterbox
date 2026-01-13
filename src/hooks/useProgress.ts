import { useMemo, useCallback, useEffect } from 'react';
import { useLessonProgressStore } from '@/stores/lessonProgressStore';
import { useGameSessionStore } from '@/stores/gameSessionStore';
import { useAuthStore } from '@/stores/authStore';
import type { CategoryProgress } from '@/types/lessonProgress';
import { STARS_PER_MOON, MOONS_TO_LEVEL_UP } from '@/types/lessonProgress';

/**
 * Bridge hook that replaces ProgressContext with Zustand stores.
 * Maintains 100% API compatibility with the original context.
 */
export const useProgress = () => {
  const { user } = useAuthStore();
  
  const {
    progressByCategory,
    loading,
    pendingCelebration: storePendingCelebration,
    setUser,
    fetchAllProgress,
  } = useLessonProgressStore();
  
  const {
    activeSession,
    pendingCelebration: sessionPendingCelebration,
    startGameSession,
    endGameSession,
    recordGameAnswer,
    clearCelebration: sessionClearCelebration,
  } = useGameSessionStore();

  // Initialize user context when auth changes
  useEffect(() => {
    const initProgress = async () => {
      if (!user?.id) return;
      
      // Get family ID for user
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: familyMember } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (familyMember?.family_id) {
        setUser(user.id, familyMember.family_id);
        fetchAllProgress();
      }
    };
    
    initProgress();
  }, [user?.id, setUser, fetchAllProgress]);
  
  // Build category progress map from store data
  const categoryProgressMap = useMemo(() => {
    const map = new Map<string, CategoryProgress>();
    progressByCategory.forEach((progress, categoryId) => {
      const moonsInCurrentLevel = progress.moons_earned % MOONS_TO_LEVEL_UP;
      map.set(categoryId, {
        categoryId,
        categoryName: '',
        currentStars: progress.current_stars,
        starsToMoon: progress.stars_to_moon,
        moonsEarned: progress.moons_earned,
        moonsToNextLevel: MOONS_TO_LEVEL_UP - moonsInCurrentLevel,
        currentLevel: progress.current_level,
        unlockedLevels: progress.unlocked_levels,
        accuracy: progress.accuracy_percentage / 100,
        isCloseToMoon: progress.current_stars >= (STARS_PER_MOON - 2),
        isCloseToLevelUp: moonsInCurrentLevel >= 2 && progress.accuracy_percentage >= 80,
      });
    });
    return map;
  }, [progressByCategory]);
  
  const getProgressForCategory = useCallback(
    (categoryId: string) => categoryProgressMap.get(categoryId) || null,
    [categoryProgressMap]
  );
  
  const getAllProgress = useCallback(
    () => Array.from(categoryProgressMap.values()),
    [categoryProgressMap]
  );
  
  const refreshProgress = useCallback(async () => {
    await fetchAllProgress();
  }, [fetchAllProgress]);

  const clearCelebration = useCallback(() => {
    sessionClearCelebration();
  }, [sessionClearCelebration]);
  
  return {
    categoryProgressMap,
    isLoading: loading,
    activeSession,
    startGameSession,
    endGameSession,
    recordGameAnswer,
    getProgressForCategory,
    getAllProgress,
    pendingCelebration: sessionPendingCelebration || storePendingCelebration,
    clearCelebration,
    refreshProgress,
  };
};

/**
 * Optional hook that returns null instead of throwing if stores aren't ready.
 * Use this for components that may render before auth is available.
 */
export const useProgressOptional = () => {
  try {
    return useProgress();
  } catch {
    return null;
  }
};
