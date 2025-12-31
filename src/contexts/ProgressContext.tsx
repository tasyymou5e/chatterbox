import React, { createContext, useContext, useCallback, useMemo, useState, useEffect, type ReactNode } from 'react';
import { useLessonProgressStore } from '@/stores/lessonProgressStore';
import type { CategoryProgress, SkillLevel, CelebrationEvent } from '@/types/lessonProgress';
import type { GameSessionStats } from '@/types/gameEvents';

interface ActiveSession {
  contentItemId: string;
  categoryId: string;
  startedAt: Date;
  correctAnswers: number;
  incorrectAnswers: number;
  currentStreak: number;
  longestStreak: number;
  responseTimes: number[];
}

interface ProgressContextValue {
  // Progress data
  categoryProgressMap: Map<string, CategoryProgress>;
  isLoading: boolean;
  
  // Session management
  activeSession: ActiveSession | null;
  startGameSession: (categoryId: string, contentItemId: string) => void;
  endGameSession: () => GameSessionStats | null;
  recordGameAnswer: (isCorrect: boolean, responseTimeMs?: number) => void;
  
  // Progress queries
  getProgressForCategory: (categoryId: string) => CategoryProgress | null;
  getAllProgress: () => CategoryProgress[];
  
  // Celebration triggers
  pendingCelebration: CelebrationEvent | null;
  clearCelebration: () => void;
  
  // Refresh
  refreshProgress: () => Promise<void>;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

interface ProgressProviderProps {
  children: ReactNode;
  userId?: string;
  familyId?: string;
}

export function ProgressProvider({ children, userId, familyId }: ProgressProviderProps) {
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [localCelebration, setLocalCelebration] = useState<CelebrationEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const {
    progressByCategory,
    loading,
    pendingCelebration,
    setUser,
    fetchAllProgress,
    recordAnswer,
    clearCelebration: storeClearCelebration,
  } = useLessonProgressStore();

  // Build category progress map from store data
  const categoryProgressMap = useMemo(() => {
    const map = new Map<string, CategoryProgress>();
    progressByCategory.forEach((progress, categoryId) => {
      const moonsInCurrentLevel = progress.moons_earned % 3;
      map.set(categoryId, {
        categoryId,
        categoryName: '',
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
    return map;
  }, [progressByCategory]);

  // Refresh progress data
  const refreshProgress = useCallback(async () => {
    if (userId && familyId) {
      setUser(userId, familyId);
      await fetchAllProgress();
      setIsLoading(false);
    }
  }, [userId, familyId, setUser, fetchAllProgress]);

  // Load progress on mount
  useEffect(() => {
    refreshProgress();
  }, [refreshProgress]);

  // Sync loading state
  useEffect(() => {
    setIsLoading(loading);
  }, [loading]);

  // Start a new game session
  const startGameSession = useCallback((categoryId: string, contentItemId: string) => {
    setActiveSession({
      contentItemId,
      categoryId,
      startedAt: new Date(),
      correctAnswers: 0,
      incorrectAnswers: 0,
      currentStreak: 0,
      longestStreak: 0,
      responseTimes: [],
    });
  }, []);

  // End the current game session
  const endGameSession = useCallback((): GameSessionStats | null => {
    if (!activeSession) return null;
    
    const now = new Date();
    const durationSeconds = Math.floor((now.getTime() - activeSession.startedAt.getTime()) / 1000);
    const avgResponseTime = activeSession.responseTimes.length > 0
      ? activeSession.responseTimes.reduce((a, b) => a + b, 0) / activeSession.responseTimes.length
      : 0;
    
    const stats: GameSessionStats = {
      correctAnswers: activeSession.correctAnswers,
      incorrectAnswers: activeSession.incorrectAnswers,
      currentStreak: activeSession.currentStreak,
      longestStreak: activeSession.longestStreak,
      starsEarned: activeSession.correctAnswers,
      averageResponseTimeMs: avgResponseTime,
      startedAt: activeSession.startedAt,
      durationSeconds,
    };
    
    setActiveSession(null);
    return stats;
  }, [activeSession]);

  // Record an answer during gameplay
  const recordGameAnswer = useCallback(async (isCorrect: boolean, responseTimeMs?: number) => {
    if (!activeSession) return;
    
    // Update local session state
    setActiveSession(prev => {
      if (!prev) return null;
      
      const newStreak = isCorrect ? prev.currentStreak + 1 : 0;
      return {
        ...prev,
        correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
        incorrectAnswers: prev.incorrectAnswers + (isCorrect ? 0 : 1),
        currentStreak: newStreak,
        longestStreak: Math.max(prev.longestStreak, newStreak),
        responseTimes: responseTimeMs 
          ? [...prev.responseTimes, responseTimeMs]
          : prev.responseTimes,
      };
    });

    // Record to database via store
    const result = await recordAnswer(
      activeSession.categoryId,
      activeSession.contentItemId,
      isCorrect,
      responseTimeMs
    );

    // Set local celebration based on result
    if (result) {
      setLocalCelebration(result);
    } else if (isCorrect) {
      setLocalCelebration({
        type: 'starEarned',
        categoryId: activeSession.categoryId,
        starsEarned: 1,
      });
    }
  }, [activeSession, recordAnswer]);

  // Get progress for a specific category
  const getProgressForCategory = useCallback((categoryId: string): CategoryProgress | null => {
    return categoryProgressMap.get(categoryId) || null;
  }, [categoryProgressMap]);

  // Get all category progress
  const getAllProgress = useCallback((): CategoryProgress[] => {
    return Array.from(categoryProgressMap.values());
  }, [categoryProgressMap]);

  // Clear pending celebration
  const clearCelebration = useCallback(() => {
    setLocalCelebration(null);
    storeClearCelebration();
  }, [storeClearCelebration]);

  const value: ProgressContextValue = {
    categoryProgressMap,
    isLoading,
    activeSession,
    startGameSession,
    endGameSession,
    recordGameAnswer,
    getProgressForCategory,
    getAllProgress,
    pendingCelebration: localCelebration || pendingCelebration,
    clearCelebration,
    refreshProgress,
  };

  return (
    <ProgressContext.Provider value={value}>
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const context = useContext(ProgressContext);
  if (!context) {
    throw new Error('useProgress must be used within a ProgressProvider');
  }
  return context;
}

// Optional hook that returns null instead of throwing if not in provider
export function useProgressOptional() {
  return useContext(ProgressContext);
}
