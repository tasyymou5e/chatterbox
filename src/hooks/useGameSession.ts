import { useState, useCallback } from 'react';
import { useLessonProgressStore } from '@/stores/lessonProgressStore';
import type { GameSessionStats, GameIntegrationConfig } from '@/types/gameEvents';
import type { CelebrationEvent } from '@/types/lessonProgress';

interface UseGameSessionOptions {
  categoryId: string;
  contentItemId: string;
  userId: string;
  familyId: string;
  config?: Partial<GameIntegrationConfig>;
  onCelebration?: (event: CelebrationEvent) => void;
}

interface GameSessionState {
  isActive: boolean;
  correctAnswers: number;
  incorrectAnswers: number;
  currentStreak: number;
  longestStreak: number;
  starsEarned: number;
  responseTimes: number[];
  startedAt: Date | null;
}

const DEFAULT_CONFIG: GameIntegrationConfig = {
  supportsAnswerTracking: true,
  supportsResponseTime: true,
  supportsSkillLevels: true,
  starsPerCorrect: 1,
  streakBonusStars: 1,
  streakThreshold: 3,
};

export function useGameSession({
  categoryId,
  contentItemId,
  userId,
  familyId,
  config: userConfig,
  onCelebration,
}: UseGameSessionOptions) {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  
  const [session, setSession] = useState<GameSessionState>({
    isActive: false,
    correctAnswers: 0,
    incorrectAnswers: 0,
    currentStreak: 0,
    longestStreak: 0,
    starsEarned: 0,
    responseTimes: [],
    startedAt: null,
  });

  const { setUser, recordAnswer, fetchProgress } = useLessonProgressStore();

  // Start a new game session
  const startSession = useCallback(() => {
    const now = new Date();
    setUser(userId, familyId);
    setSession({
      isActive: true,
      correctAnswers: 0,
      incorrectAnswers: 0,
      currentStreak: 0,
      longestStreak: 0,
      starsEarned: 0,
      responseTimes: [],
      startedAt: now,
    });
  }, [userId, familyId, setUser]);

  // Record an answer
  const recordGameAnswer = useCallback(async (
    isCorrect: boolean,
    responseTimeMs?: number
  ): Promise<CelebrationEvent | null> => {
    if (!session.isActive) {
      console.warn('Cannot record answer: no active session');
      return null;
    }

    // Calculate stars earned
    let starsForThisAnswer = 0;
    if (isCorrect) {
      starsForThisAnswer = config.starsPerCorrect;
      
      // Streak bonus
      const newStreak = session.currentStreak + 1;
      if (newStreak >= config.streakThreshold && newStreak % config.streakThreshold === 0) {
        starsForThisAnswer += config.streakBonusStars;
      }
    }

    // Update local state
    setSession(prev => {
      const newStreak = isCorrect ? prev.currentStreak + 1 : 0;
      return {
        ...prev,
        correctAnswers: prev.correctAnswers + (isCorrect ? 1 : 0),
        incorrectAnswers: prev.incorrectAnswers + (isCorrect ? 0 : 1),
        currentStreak: newStreak,
        longestStreak: Math.max(prev.longestStreak, newStreak),
        starsEarned: prev.starsEarned + starsForThisAnswer,
        responseTimes: responseTimeMs 
          ? [...prev.responseTimes, responseTimeMs] 
          : prev.responseTimes,
      };
    });

    // Record to database
    const celebration = await recordAnswer(
      categoryId,
      contentItemId,
      isCorrect,
      responseTimeMs
    );

    // Trigger celebration callback
    if (celebration && onCelebration) {
      onCelebration(celebration);
    } else if (isCorrect && onCelebration) {
      // Trigger star earned celebration for correct answers
      onCelebration({
        type: 'starEarned',
        categoryId,
        starsEarned: starsForThisAnswer,
      });
    }

    return celebration;
  }, [
    session.isActive,
    session.currentStreak,
    config,
    categoryId,
    contentItemId,
    recordAnswer,
    onCelebration,
  ]);

  // End the session and return stats
  const endSession = useCallback((): GameSessionStats | null => {
    if (!session.isActive || !session.startedAt) return null;

    const now = new Date();
    const durationSeconds = Math.floor((now.getTime() - session.startedAt.getTime()) / 1000);
    const avgResponseTime = session.responseTimes.length > 0
      ? session.responseTimes.reduce((a, b) => a + b, 0) / session.responseTimes.length
      : 0;

    const stats: GameSessionStats = {
      correctAnswers: session.correctAnswers,
      incorrectAnswers: session.incorrectAnswers,
      currentStreak: session.currentStreak,
      longestStreak: session.longestStreak,
      starsEarned: session.starsEarned,
      averageResponseTimeMs: avgResponseTime,
      startedAt: session.startedAt,
      durationSeconds,
    };

    setSession({
      isActive: false,
      correctAnswers: 0,
      incorrectAnswers: 0,
      currentStreak: 0,
      longestStreak: 0,
      starsEarned: 0,
      responseTimes: [],
      startedAt: null,
    });

    // Refresh category progress
    fetchProgress(categoryId);

    return stats;
  }, [session, categoryId, fetchProgress]);

  // Pause session (for future use)
  const pauseSession = useCallback(() => {
    // Could track pause time for accurate duration
  }, []);

  // Resume session (for future use)
  const resumeSession = useCallback(() => {
    // Could resume from pause
  }, []);

  // Calculate accuracy
  const accuracy = session.correctAnswers + session.incorrectAnswers > 0
    ? (session.correctAnswers / (session.correctAnswers + session.incorrectAnswers)) * 100
    : 0;

  return {
    // Session state
    isActive: session.isActive,
    correctAnswers: session.correctAnswers,
    incorrectAnswers: session.incorrectAnswers,
    currentStreak: session.currentStreak,
    longestStreak: session.longestStreak,
    starsEarned: session.starsEarned,
    accuracy,
    
    // Session controls
    startSession,
    endSession,
    pauseSession,
    resumeSession,
    recordAnswer: recordGameAnswer,
    
    // Config
    config,
  };
}
