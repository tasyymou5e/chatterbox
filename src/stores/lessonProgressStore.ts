import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import type { 
  LessonProgress, 
  SkillLevel, 
  CelebrationEvent,
  CategoryProgress 
} from '@/types/lessonProgress';
import { 
  MOONS_TO_LEVEL_UP, 
  ACCURACY_THRESHOLD, 
  STARS_PER_MOON, 
  ACCURACY_SAMPLE_SIZE 
} from '@/types/lessonProgress';
import { type StoreError, createStoreError } from '@/services/storeUtils';

interface LessonProgressState {
  progressByCategory: Map<string, LessonProgress>;
  loading: boolean;
  error: StoreError | null;
  userId: string | null;
  familyId: string | null;
  pendingCelebration: CelebrationEvent | null;
  
  // Actions
  setUser: (userId: string, familyId: string) => void;
  clearError: () => void;
  fetchProgress: (categoryId: string) => Promise<LessonProgress | null>;
  fetchAllProgress: () => Promise<void>;
  recordAnswer: (
    categoryId: string, 
    contentItemId: string | null, 
    isCorrect: boolean, 
    responseTimeMs?: number
  ) => Promise<CelebrationEvent | null>;
  calculateAccuracy: (categoryId: string) => Promise<number>;
  getLevelsForCategory: (categoryId: string) => SkillLevel[];
  getCategoryProgress: (categoryId: string) => CategoryProgress | null;
  clearCelebration: () => void;
  unlockNextLevel: (categoryId: string) => Promise<void>;
}

export const useLessonProgressStore = create<LessonProgressState>()(
  devtools(
    (set, get) => ({
      progressByCategory: new Map(),
      loading: false,
      error: null,
      userId: null,
      familyId: null,
      pendingCelebration: null,

      setUser: (userId: string, familyId: string) => {
        set({ userId, familyId });
      },

      clearError: () => set({ error: null }),

  fetchProgress: async (categoryId: string) => {
    const { userId, familyId } = get();
    if (!userId || !familyId) return null;

    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase
        .from('lesson_progress')
        .select('id, user_id, family_id, category_id, current_stars, stars_to_moon, moons_earned, current_level, unlocked_levels, correct_answers, total_attempts, accuracy_percentage, last_activity_at, created_at')
        .eq('user_id', userId)
        .eq('category_id', categoryId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const progress = data as unknown as LessonProgress;
        set(state => {
          const newMap = new Map(state.progressByCategory);
          newMap.set(categoryId, progress);
          return { progressByCategory: newMap, loading: false };
        });
        return progress;
      }

      // Create initial progress if doesn't exist
      const { data: newProgress, error: insertError } = await supabase
        .from('lesson_progress')
        .insert({
          user_id: userId,
          family_id: familyId,
          category_id: categoryId,
          current_stars: 0,
          stars_to_moon: STARS_PER_MOON,
          moons_earned: 0,
          current_level: 'beginner',
          unlocked_levels: ['beginner'],
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const progress = newProgress as unknown as LessonProgress;
      set(state => {
        const newMap = new Map(state.progressByCategory);
        newMap.set(categoryId, progress);
        return { progressByCategory: newMap, loading: false };
      });

      return progress;
      } catch (err) {
        const storeError = createStoreError('network', err instanceof Error ? err.message : 'Failed to fetch progress');
        set({ error: storeError, loading: false });
        return null;
      }
  },

  fetchAllProgress: async () => {
    const { userId } = get();
    if (!userId) return;

    try {
      set({ loading: true, error: null });

      const { data, error } = await supabase
        .from('lesson_progress')
        .select('id, user_id, family_id, category_id, current_stars, stars_to_moon, moons_earned, current_level, unlocked_levels, correct_answers, total_attempts, accuracy_percentage, last_activity_at, created_at')
        .eq('user_id', userId);

      if (error) throw error;

      const newMap = new Map<string, LessonProgress>();
      (data as unknown as LessonProgress[]).forEach(progress => {
        newMap.set(progress.category_id, progress);
      });

      set({ progressByCategory: newMap, loading: false });
      } catch (err) {
        const storeError = createStoreError('network', err instanceof Error ? err.message : 'Failed to fetch all progress');
        set({ error: storeError, loading: false });
      }
  },

  recordAnswer: async (categoryId, contentItemId, isCorrect, responseTimeMs) => {
    const { userId, familyId, progressByCategory } = get();
    if (!userId || !familyId) return null;

    try {
      // Get or create progress
      let progress = progressByCategory.get(categoryId);
      if (!progress) {
        const fetchedProgress = await get().fetchProgress(categoryId);
        if (!fetchedProgress) return null;
        progress = fetchedProgress;
      }

      // Calculate new stars
      const starsEarned = isCorrect ? 1 : 0;
      let newStars = progress.current_stars + starsEarned;
      let newMoons = progress.moons_earned;
      let celebration: CelebrationEvent | null = null;

      // Check if moon reached
      if (newStars >= STARS_PER_MOON) {
        newStars = 0;
        newMoons += 1;
        celebration = {
          type: 'moonReached',
          categoryId,
          moonsEarned: newMoons,
        };
      } else if (isCorrect) {
        celebration = {
          type: 'starEarned',
          categoryId,
          starsEarned: newStars,
        };
      }

      // Insert history entry
      await supabase.from('lesson_history').insert({
        user_id: userId,
        family_id: familyId,
        category_id: categoryId,
        content_item_id: contentItemId,
        was_correct: isCorrect,
        stars_earned: starsEarned,
        response_time_ms: responseTimeMs,
        skill_level_at_time: progress.current_level,
      });

      // Calculate new accuracy
      const accuracy = await get().calculateAccuracy(categoryId);

      // Check for level completion
      const moonsInCurrentLevel = newMoons % MOONS_TO_LEVEL_UP;
      const shouldLevelUp = 
        moonsInCurrentLevel === 0 && 
        newMoons > 0 && 
        newMoons > progress.moons_earned &&
        accuracy >= ACCURACY_THRESHOLD;

      let newLevel = progress.current_level;
      let newUnlockedLevels = [...progress.unlocked_levels];

      if (shouldLevelUp) {
        if (progress.current_level === 'beginner' && !newUnlockedLevels.includes('intermediate')) {
          newUnlockedLevels = ['beginner', 'intermediate'];
          celebration = {
            type: 'levelCompleted',
            categoryId,
            level: 'beginner',
            moonsEarned: newMoons,
          };
        } else if (progress.current_level === 'intermediate' && !newUnlockedLevels.includes('advanced')) {
          newUnlockedLevels = ['intermediate', 'advanced'];
          celebration = {
            type: 'levelCompleted',
            categoryId,
            level: 'intermediate',
            moonsEarned: newMoons,
          };
        } else if (progress.current_level === 'advanced' && newMoons >= MOONS_TO_LEVEL_UP * 3) {
          celebration = {
            type: 'categoryMastered',
            categoryId,
            level: 'advanced',
            moonsEarned: newMoons,
          };
        }
      }

      // Update progress in database
      const { data: updatedProgress, error } = await supabase
        .from('lesson_progress')
        .update({
          current_stars: newStars,
          moons_earned: newMoons,
          correct_answers: progress.correct_answers + (isCorrect ? 1 : 0),
          total_attempts: progress.total_attempts + 1,
          accuracy_percentage: accuracy * 100,
          current_level: newLevel,
          unlocked_levels: newUnlockedLevels,
          last_activity_at: new Date().toISOString(),
        })
        .eq('id', progress.id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      set(state => {
        const newMap = new Map(state.progressByCategory);
        newMap.set(categoryId, updatedProgress as unknown as LessonProgress);
        return { 
          progressByCategory: newMap,
          pendingCelebration: celebration,
        };
      });

      return celebration;
    } catch (error) {
      console.error('Error recording answer:', error);
      return null;
    }
  },

  calculateAccuracy: async (categoryId: string) => {
    const { userId } = get();
    if (!userId) return 0;

    try {
      const { data, error } = await supabase
        .from('lesson_history')
        .select('was_correct')
        .eq('user_id', userId)
        .eq('category_id', categoryId)
        .order('answered_at', { ascending: false })
        .limit(ACCURACY_SAMPLE_SIZE);

      if (error) throw error;
      if (!data || data.length === 0) return 0;

      const correctCount = data.filter(entry => entry.was_correct).length;
      return correctCount / data.length;
    } catch (error) {
      console.error('Error calculating accuracy:', error);
      return 0;
    }
  },

  getLevelsForCategory: (categoryId: string) => {
    const progress = get().progressByCategory.get(categoryId);
    return progress?.unlocked_levels as SkillLevel[] || ['beginner'];
  },

  getCategoryProgress: (categoryId: string) => {
    const progress = get().progressByCategory.get(categoryId);
    if (!progress) return null;

    const moonsInCurrentLevel = progress.moons_earned % MOONS_TO_LEVEL_UP;
    
    return {
      categoryId,
      categoryName: '', // Will be filled by component
      currentStars: progress.current_stars,
      starsToMoon: progress.stars_to_moon,
      moonsEarned: progress.moons_earned,
      moonsToNextLevel: MOONS_TO_LEVEL_UP - moonsInCurrentLevel,
      currentLevel: progress.current_level,
      unlockedLevels: progress.unlocked_levels as SkillLevel[],
      accuracy: progress.accuracy_percentage / 100,
      isCloseToMoon: progress.current_stars >= 8,
      isCloseToLevelUp: moonsInCurrentLevel >= 2 && progress.accuracy_percentage >= 80,
    };
  },

  clearCelebration: () => {
    set({ pendingCelebration: null });
  },

  unlockNextLevel: async (categoryId: string) => {
    const { progressByCategory } = get();
    const progress = progressByCategory.get(categoryId);
    if (!progress) return;

    let newLevel: SkillLevel = progress.current_level;
    let newUnlockedLevels = [...progress.unlocked_levels];

    if (progress.current_level === 'beginner' && newUnlockedLevels.includes('intermediate')) {
      newLevel = 'intermediate';
    } else if (progress.current_level === 'intermediate' && newUnlockedLevels.includes('advanced')) {
      newLevel = 'advanced';
    }

    const { data, error } = await supabase
      .from('lesson_progress')
      .update({ current_level: newLevel })
      .eq('id', progress.id)
      .select()
      .single();

    if (!error && data) {
      set(state => {
        const newMap = new Map(state.progressByCategory);
        newMap.set(categoryId, data as unknown as LessonProgress);
        return { progressByCategory: newMap };
      });
    }
    },
    }),
    { name: 'LessonProgressStore' }
  )
);
