import { useEffect, useCallback, useState } from 'react';
import { useLessonProgressStore } from '@/stores/lessonProgressStore';
import { useAuth } from '@/hooks/useAuth';
import type { SkillLevel, CelebrationEvent, CategoryProgress } from '@/types/lessonProgress';

interface UseStarProgressReturn {
  // Progress data
  stars: number;
  starsToMoon: number;
  moons: number;
  accuracy: number;
  currentLevel: SkillLevel;
  unlockedLevels: SkillLevel[];
  isCloseToMoon: boolean;
  isCloseToLevelUp: boolean;
  
  // Actions
  recordAnswer: (contentItemId: string | null, isCorrect: boolean, responseTimeMs?: number) => Promise<CelebrationEvent | null>;
  refreshProgress: () => Promise<void>;
  
  // State
  loading: boolean;
  error: string | null;
  pendingCelebration: CelebrationEvent | null;
  clearCelebration: () => void;
}

export function useStarProgress(categoryId: string): UseStarProgressReturn {
  const { user } = useAuth();
  const [initialized, setInitialized] = useState(false);
  
  const {
    progressByCategory,
    loading,
    error,
    pendingCelebration,
    setUser,
    fetchProgress,
    recordAnswer: storeRecordAnswer,
    clearCelebration,
  } = useLessonProgressStore();

  // Initialize user and fetch progress
  useEffect(() => {
    const initProgress = async () => {
      if (!user?.id || !categoryId) return;

      // Get family ID for user
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: familyMember } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (familyMember?.family_id) {
        setUser(user.id, familyMember.family_id);
        await fetchProgress(categoryId);
        setInitialized(true);
      }
    };

    initProgress();
  }, [user?.id, categoryId, setUser, fetchProgress]);

  const progress = progressByCategory.get(categoryId);

  const recordAnswer = useCallback(async (
    contentItemId: string | null, 
    isCorrect: boolean, 
    responseTimeMs?: number
  ) => {
    return storeRecordAnswer(categoryId, contentItemId, isCorrect, responseTimeMs);
  }, [categoryId, storeRecordAnswer]);

  const refreshProgress = useCallback(async () => {
    await fetchProgress(categoryId);
  }, [categoryId, fetchProgress]);

  return {
    // Progress data
    stars: progress?.current_stars ?? 0,
    starsToMoon: progress?.stars_to_moon ?? 10,
    moons: progress?.moons_earned ?? 0,
    accuracy: (progress?.accuracy_percentage ?? 0) / 100,
    currentLevel: (progress?.current_level as SkillLevel) ?? 'beginner',
    unlockedLevels: (progress?.unlocked_levels as SkillLevel[]) ?? ['beginner'],
    isCloseToMoon: (progress?.current_stars ?? 0) >= 8,
    isCloseToLevelUp: 
      (progress?.moons_earned ?? 0) % 3 >= 2 && 
      (progress?.accuracy_percentage ?? 0) >= 80,
    
    // Actions
    recordAnswer,
    refreshProgress,
    
    // State
    loading: loading || !initialized,
    error,
    pendingCelebration,
    clearCelebration,
  };
}

// Hook to get all category progress
export function useAllCategoryProgress() {
  const { user } = useAuth();
  const { progressByCategory, fetchAllProgress, loading, error } = useLessonProgressStore();

  useEffect(() => {
    if (user?.id) {
      fetchAllProgress();
    }
  }, [user?.id, fetchAllProgress]);

  const getAllProgress = useCallback((): CategoryProgress[] => {
    const results: CategoryProgress[] = [];
    
    progressByCategory.forEach((progress, categoryId) => {
      const moonsInCurrentLevel = progress.moons_earned % 3;
      
      results.push({
        categoryId,
        categoryName: '', // Filled by component
        currentStars: progress.current_stars,
        starsToMoon: progress.stars_to_moon,
        moonsEarned: progress.moons_earned,
        moonsToNextLevel: 3 - moonsInCurrentLevel,
        currentLevel: progress.current_level as SkillLevel,
        unlockedLevels: progress.unlocked_levels as SkillLevel[],
        accuracy: progress.accuracy_percentage / 100,
        isCloseToMoon: progress.current_stars >= 8,
        isCloseToLevelUp: moonsInCurrentLevel >= 2 && progress.accuracy_percentage >= 80,
      });
    });

    return results;
  }, [progressByCategory]);

  return {
    getAllProgress,
    loading,
    error,
  };
}
