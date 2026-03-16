import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useLessonProgressStore } from './lessonProgressStore';
import type { GameSessionStats } from '@/types/gameEvents';
import type { CelebrationEvent } from '@/types/lessonProgress';

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

interface GameSessionState {
  activeSession: ActiveSession | null;
  pendingCelebration: CelebrationEvent | null;
  
  // Actions
  startGameSession: (categoryId: string, contentItemId: string) => void;
  endGameSession: () => GameSessionStats | null;
  recordGameAnswer: (isCorrect: boolean, responseTimeMs?: number) => Promise<void>;
  clearCelebration: () => void;
}

export const useGameSessionStore = create<GameSessionState>()(
  devtools(
    (set, get) => ({
      activeSession: null,
      pendingCelebration: null,
      
      startGameSession: (categoryId, contentItemId) => {
        set({
          activeSession: {
            contentItemId,
            categoryId,
            startedAt: new Date(),
            correctAnswers: 0,
            incorrectAnswers: 0,
            currentStreak: 0,
            longestStreak: 0,
            responseTimes: [],
          },
        });
      },
      
      endGameSession: () => {
        const { activeSession } = get();
        if (!activeSession) return null;
        
        const now = new Date();
        const durationSeconds = Math.floor(
          (now.getTime() - activeSession.startedAt.getTime()) / 1000
        );
        const avgResponseTime = activeSession.responseTimes.length > 0
          ? activeSession.responseTimes.reduce((a, b) => a + b, 0) / 
            activeSession.responseTimes.length
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
        
        set({ activeSession: null });
        return stats;
      },
      
      recordGameAnswer: async (isCorrect, responseTimeMs) => {
        const { activeSession } = get();
        if (!activeSession) return;
        
        // Update local session state
        set(state => {
          if (!state.activeSession) return state;
          
          const newStreak = isCorrect ? state.activeSession.currentStreak + 1 : 0;
          return {
            activeSession: {
              ...state.activeSession,
              correctAnswers: state.activeSession.correctAnswers + (isCorrect ? 1 : 0),
              incorrectAnswers: state.activeSession.incorrectAnswers + (isCorrect ? 0 : 1),
              currentStreak: newStreak,
              longestStreak: Math.max(state.activeSession.longestStreak, newStreak),
              responseTimes: responseTimeMs 
                ? [...state.activeSession.responseTimes, responseTimeMs]
                : state.activeSession.responseTimes,
            },
          };
        });
        
        // Record to database via progress store
        const progressStore = useLessonProgressStore.getState();
        const result = await progressStore.recordAnswer(
          activeSession.categoryId,
          activeSession.contentItemId,
          isCorrect,
          responseTimeMs
        );
        
        // Set celebration
        if (result) {
          set({ pendingCelebration: result });
        } else if (isCorrect) {
          set({
            pendingCelebration: {
              type: 'starEarned',
              categoryId: activeSession.categoryId,
              starsEarned: 1,
            },
          });
        }
      },
      
      clearCelebration: () => {
        set({ pendingCelebration: null });
        useLessonProgressStore.getState().clearCelebration();
      },
    }),
    { name: 'GameSessionStore' }
  )
);
