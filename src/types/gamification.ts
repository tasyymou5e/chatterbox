/**
 * Specific type interfaces for gamification-related data structures
 * Replaces generic 'any' types with structured interfaces
 */

export interface AchievementCriteria {
  type: 'count' | 'streak' | 'points' | 'completion_rate' | 'time_based' | 'social';
  target: number;
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all_time';
  conditions?: {
    consecutive?: boolean;
    minimum_quality?: number;
    specific_chores?: string[];
    collaboration_required?: boolean;
    time_bonus_required?: boolean;
  };
  metadata?: Record<string, unknown>;
}

export interface UserProgress {
  current: number;
  target: number;
  percentage: number;
  lastUpdate: string;
  milestones?: {
    [key: number]: {
      achieved: boolean;
      date?: string;
      bonus?: number;
    };
  };
}

export interface UserMetadata {
  preferences?: {
    theme?: string;
    notifications?: boolean;
    reminderFrequency?: number;
  };
  profile?: {
    avatar?: string;
    displayName?: string;
    favoriteActivities?: string[];
  };
  accessibility?: {
    largeText?: boolean;
    highContrast?: boolean;
    audioAssistance?: boolean;
    simplifiedUI?: boolean;
  };
  statistics?: {
    joinDate: string;
    totalActivities: number;
    favoriteCategory?: string;
    averageCompletionTime?: number;
  };
}

export interface AchievementMetadata {
  category?: string;
  tags?: string[];
  difficulty?: 'easy' | 'medium' | 'hard' | 'expert';
  seasonalEvent?: string;
  specialEvent?: boolean;
  prerequisites?: string[];
  rewards?: {
    badge?: string;
    title?: string;
    privilege?: string;
  };
}

export interface WishlistItemMetadata {
  category?: string;
  tags?: string[];
  ageAppropriate?: {
    min: number;
    max: number;
  };
  availability?: {
    seasonal?: boolean;
    limited?: boolean;
    expires?: string;
  };
  requirements?: {
    parentApproval: boolean;
    minimumLevel?: number;
    specialConditions?: string[];
  };
}

export interface LeaderboardMetadata {
  period: {
    start: string;
    end: string;
    type: 'daily' | 'weekly' | 'monthly' | 'seasonal';
  };
  criteria: {
    metric: 'points' | 'chores' | 'collaboration' | 'consistency';
    calculation: 'sum' | 'average' | 'best';
  };
  participants?: {
    total: number;
    active: number;
    eligible: number;
  };
}

export interface StreakMetadata {
  category?: string;
  difficulty?: number;
  bonusThresholds?: {
    [key: number]: {
      multiplier: number;
      reward?: string;
    };
  };
  rules?: {
    allowMissedDays?: number;
    weekendCounting?: boolean;
    holidayExceptions?: boolean;
  };
}

export interface GamificationError {
  code: string;
  message: string;
  context?: {
    userId?: string;
    familyId?: string;
    operation?: string;
    timestamp: string;
  };
  retryable?: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface PointsTransaction {
  id: string;
  userId: string;
  familyId: string;
  type: 'earned' | 'spent' | 'bonus' | 'penalty';
  amount: number;
  source: {
    type: 'chore' | 'achievement' | 'streak' | 'redemption' | 'admin';
    referenceId?: string;
    description: string;
  };
  timestamp: string;
  metadata?: Record<string, unknown>;
}