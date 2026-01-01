/**
 * Specific type interfaces for chore-related data structures
 * Replaces generic 'any' types with structured interfaces
 */

export interface InstructionStep {
  step: number;
  description: string;
  visualAid?: string;
  estimatedTime?: number;
  isRequired: boolean;
  sensoryNotes?: string;
  adaptations?: string[];
}

export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'custom';
  interval: number;
  daysOfWeek?: number[];
  endDate?: string;
  maxOccurrences?: number;
  skipWeekends?: boolean;
  timeOfDay?: string;
  currentOccurrence?: number;
}

export interface ChoreSettings {
  reminderEnabled: boolean;
  autoAssign: boolean;
  requirePhotos: boolean;
  allowPartialCompletion: boolean;
  customRewards?: string[];
  difficulty?: 'easy' | 'medium' | 'hard';
  estimatedDuration?: number;
  breaks?: {
    enabled: boolean;
    interval: number;
    duration: number;
  };
}

export interface AutismFriendlyFeatures {
  visualSchedule: boolean;
  breakReminders: boolean;
  sensoryConsiderations: SensoryConsiderations;
  socialStories: boolean;
  customInstructions: string[];
  preferredCommunication?: 'visual' | 'auditory' | 'tactile';
  adaptations?: string[];
}

export interface SensoryConsiderations {
  noise?: {
    level: 'quiet' | 'moderate' | 'loud';
    recommendations: string[];
  };
  lighting?: {
    preferred: 'bright' | 'dim' | 'natural';
    avoid: string[];
  };
  textures?: {
    comfortable: string[];
    avoid: string[];
  };
  temperature?: {
    preferred: 'cool' | 'warm' | 'room_temperature';
    sensitivity: boolean;
  };
}

export interface AutismAccommodations {
  timeFlexibility: boolean;
  visualAids: boolean;
  breakSchedule: {
    enabled: boolean;
    frequency: number; // minutes
    duration: number;  // minutes
  };
  simplifiedInstructions: boolean;
  sensoryBreaks: boolean;
  preferredEnvironment?: string[];
  communicationStyle?: 'direct' | 'gentle' | 'visual';
}

export interface CompletionData {
  points_earned?: number;
  time_bonus?: number;
  streak_bonus?: number;
  completion_notes?: string;
  parent_feedback?: string;
  satisfaction_rating?: number;
  difficulty_rating?: number;
  completion_photos?: string[];
  actual_duration?: number;
}

export interface ChoreMetadata {
  created_source?: 'template' | 'custom' | 'import';
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  category?: string;
  lastModified?: string;
  version?: number;
}