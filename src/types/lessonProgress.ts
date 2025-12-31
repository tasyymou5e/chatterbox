export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export interface LessonProgress {
  id: string;
  user_id: string;
  family_id: string;
  category_id: string;
  current_stars: number;
  stars_to_moon: number;
  moons_earned: number;
  correct_answers: number;
  total_attempts: number;
  current_level: SkillLevel;
  unlocked_levels: SkillLevel[];
  accuracy_percentage: number;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface LessonHistoryEntry {
  id: string;
  user_id: string;
  family_id: string;
  category_id: string;
  content_item_id: string | null;
  was_correct: boolean;
  stars_earned: number;
  response_time_ms: number | null;
  skill_level_at_time: SkillLevel;
  answered_at: string;
}

export interface Certificate {
  id: string;
  user_id: string;
  family_id: string;
  category_id: string;
  category_name: string;
  skill_level_completed: SkillLevel;
  child_name: string;
  certificate_data: {
    accuracy: number;
    moons_earned: number;
    time_to_complete_days: number;
    total_stars_earned: number;
  };
  completed_at: string;
  created_at: string;
}

export interface CelebrationEvent {
  type: 'starEarned' | 'moonReached' | 'levelCompleted' | 'categoryMastered';
  categoryId: string;
  level?: SkillLevel;
  starsEarned?: number;
  moonsEarned?: number;
}

export interface CategoryProgress {
  categoryId: string;
  categoryName: string;
  categoryIcon?: string;
  currentStars: number;
  starsToMoon: number;
  moonsEarned: number;
  moonsToNextLevel: number;
  currentLevel: SkillLevel;
  unlockedLevels: SkillLevel[];
  accuracy: number;
  isCloseToMoon: boolean;
  isCloseToLevelUp: boolean;
}

export const SKILL_LEVEL_COLORS: Record<SkillLevel, string> = {
  beginner: 'hsl(142, 76%, 36%)', // Green
  intermediate: 'hsl(217, 91%, 60%)', // Blue
  advanced: 'hsl(270, 76%, 55%)', // Purple
};

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const MOONS_TO_LEVEL_UP = 3;
export const ACCURACY_THRESHOLD = 0.80;
export const STARS_PER_MOON = 10;
export const ACCURACY_SAMPLE_SIZE = 20;
