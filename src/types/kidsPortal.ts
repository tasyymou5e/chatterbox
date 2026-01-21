/**
 * Types for Kids Portal - unified interface for games, chores, and activities
 */

import type { AutismFeatures, AutismAccommodations, SensoryPreferences } from './autism';

// Age group categories
export type AgeGroup = '3-5' | '6-8' | '9-12' | '13+';

// Content types available in kids portal
export type ContentType = 'game' | 'chore' | 'task' | 'activity';

// Family access levels for content
export type AccessLevel = 'allowed' | 'blocked' | 'featured';

// Skill levels for progress tracking
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

/**
 * Unified content item interface for Kids Portal
 * Represents games, chores, tasks, and activities
 */
export interface KidContentItem {
  id: string;
  type: ContentType;
  title: string;
  description: string;
  ageGroup: AgeGroup[];
  familyAccess: AccessLevel;
  autismFeatures?: AutismFeatures;
  thumbnailUrl?: string;
  launchUrl?: string;
  categoryId?: string;
  categoryName?: string;
  estimatedDuration?: number; // minutes
  difficultyLevel?: 'easy' | 'medium' | 'hard';
  
  // Progress tracking
  isFavorite?: boolean;
  lastPlayedAt?: string;
  playCount?: number;
  bestScore?: number;
  completionPercentage?: number;
}

/**
 * Child profile for personalized experience
 */
export interface ChildProfile {
  id: string;
  firstName: string;
  lastName?: string;
  ageGroup: AgeGroup;
  avatarUrl?: string;
  
  // Autism accommodations
  autismPreferences?: AutismAccommodations;
  sensoryPreferences?: SensoryPreferences;
  
  // Progress tracking
  currentLevel?: SkillLevel;
  totalStars?: number;
  totalMoons?: number;
  currentStreak?: number;
  
  // Session settings
  breakIntervalMinutes?: number;
  preferredSessionLength?: number;
}

/**
 * Kids Portal state management
 */
export interface KidsPortalState {
  activeTab: ContentType;
  selectedAgeGroup: AgeGroup | 'all';
  isGameActive: boolean;
  currentGameId: string | null;
  showBreakReminder: boolean;
}

/**
 * Content query options
 */
export interface ContentQueryOptions {
  contentType?: ContentType;
  ageGroup?: AgeGroup | 'all';
  onlyFavorites?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Game launch configuration
 */
export interface GameLaunchConfig {
  gameId: string;
  childProfile: ChildProfile;
  adaptations?: {
    autismFeatures?: AutismAccommodations;
    skillLevel?: SkillLevel;
    breakIntervalMinutes?: number;
  };
}

/**
 * Content interaction record
 */
export interface ContentInteraction {
  childId: string;
  contentId: string;
  contentType: ContentType;
  interactionType: 'launch' | 'complete' | 'favorite' | 'unfavorite';
  score?: number;
  duration?: number;
  timestamp: string;
}
