import type { SkillLevel } from './lessonProgress';

/**
 * Standard event types that games must emit for progress tracking.
 * This contract ensures any new game can integrate by emitting these events.
 */
export type GameEventType = 'answer' | 'complete' | 'start' | 'pause' | 'resume' | 'error';

/**
 * Payload structure for game events.
 */
export interface GameEventPayload {
  /** The content item ID being played */
  contentItemId: string;
  /** The category this content belongs to */
  categoryId: string;
  /** Whether the answer was correct (for 'answer' events) */
  isCorrect?: boolean;
  /** Time taken to respond in milliseconds */
  responseTimeMs?: number;
  /** Score achieved (optional) */
  score?: number;
  /** Current skill level during gameplay */
  skillLevel?: SkillLevel;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Standard game event interface that ALL games must emit via postMessage.
 * 
 * Example usage from within a game iframe:
 * ```javascript
 * window.parent.postMessage({
 *   type: 'answer',
 *   payload: {
 *     contentItemId: 'game-123',
 *     categoryId: 'math-basics',
 *     isCorrect: true,
 *     responseTimeMs: 2500
 *   },
 *   timestamp: Date.now(),
 *   source: 'lovable-game'
 * }, '*');
 * ```
 */
export interface GameEvent {
  /** Event type */
  type: GameEventType;
  /** Event payload with game data */
  payload: GameEventPayload;
  /** Unix timestamp when event was emitted */
  timestamp: number;
  /** Source identifier to filter events */
  source: 'lovable-game';
}

/**
 * Game session statistics tracked during gameplay.
 */
export interface GameSessionStats {
  /** Total correct answers in session */
  correctAnswers: number;
  /** Total incorrect answers in session */
  incorrectAnswers: number;
  /** Current streak of correct answers */
  currentStreak: number;
  /** Longest streak achieved in session */
  longestStreak: number;
  /** Total stars earned in session */
  starsEarned: number;
  /** Average response time in milliseconds */
  averageResponseTimeMs: number;
  /** Session start time */
  startedAt: Date;
  /** Session duration in seconds */
  durationSeconds: number;
}

/**
 * Configuration for how a game integrates with the progress system.
 */
export interface GameIntegrationConfig {
  /** Whether the game supports answer tracking */
  supportsAnswerTracking: boolean;
  /** Whether the game tracks response time */
  supportsResponseTime: boolean;
  /** Whether the game has multiple skill levels */
  supportsSkillLevels: boolean;
  /** Minimum stars required per correct answer */
  starsPerCorrect: number;
  /** Bonus stars for streak achievements */
  streakBonusStars: number;
  /** Streak threshold for bonus */
  streakThreshold: number;
}

/**
 * Default game integration configuration.
 */
export const DEFAULT_GAME_CONFIG: GameIntegrationConfig = {
  supportsAnswerTracking: true,
  supportsResponseTime: true,
  supportsSkillLevels: true,
  starsPerCorrect: 1,
  streakBonusStars: 1,
  streakThreshold: 3,
};

/**
 * Type guard to validate incoming postMessage events.
 */
export function isValidGameEvent(event: unknown): event is GameEvent {
  if (typeof event !== 'object' || event === null) return false;
  
  const e = event as Record<string, unknown>;
  
  return (
    typeof e.type === 'string' &&
    ['answer', 'complete', 'start', 'pause', 'resume', 'error'].includes(e.type) &&
    typeof e.payload === 'object' &&
    e.payload !== null &&
    typeof e.timestamp === 'number' &&
    e.source === 'lovable-game'
  );
}
