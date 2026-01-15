/**
 * Type definitions for privacy compliance
 */

import type { Database } from '@/integrations/supabase/types';

export interface UserProfile {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: Database['public']['Enums']['app_role'];
  family_id: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrivacySettings {
  id: string;
  user_id: string;
  behavioral_tracking_consent: boolean;
  analytics_sharing_consent: boolean;
  data_retention_days: number;
  created_at: string;
  updated_at: string;
}

export interface BehavioralEvent {
  id: string;
  user_id: string;
  family_id: string | null;
  event_type: string;
  event_category: string;
  event_data: Record<string, unknown> | null;
  page_path: string | null;
  session_id: string | null;
  device_type: string | null;
  duration_seconds: number | null;
  interaction_element: string | null;
  timestamp: string;
}

export interface ChoreCompletion {
  id: string;
  user_id: string;
  chore_id: string | null;
  assignment_id: string | null;
  family_id: string | null;
  completion_date: string;
  time_started: string | null;
  time_completed: string;
  actual_duration: number | null;
  points_earned: number | null;
  completion_notes: string | null;
  satisfaction_rating: number | null;
  difficulty_rating: number | null;
  completion_photos: string[] | null;
  mini_game_scores: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  family_id: string | null;
  unlocked_at: string;
  progress: Record<string, unknown> | null;
  points_earned: number | null;
  created_at: string;
}

export interface FamilyMember {
  user_id: string;
  family_id: string;
  role: Database['public']['Enums']['app_role'];
  joined_at: string;
  families: {
    id: string;
    display_name: string;
    created_at: string;
  } | null;
}

export interface SystemErrorLog {
  id: string;
  user_id: string | null;
  error_type: string;
  message: string;
  severity: string;
  component_name: string | null;
  route_path: string | null;
  stack_trace: string | null;
  session_id: string | null;
  browser_info: Record<string, unknown> | null;
  device_info: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
}

export interface UserDataExport {
  profile: UserProfile | null;
  privacy_settings: PrivacySettings | null;
  behavioral_events: BehavioralEvent[];
  chore_completions: ChoreCompletion[];
  user_achievements: UserAchievement[];
  families: FamilyMember[];
  error_logs: SystemErrorLog[];
}

export interface DataDeletionOptions {
  deleteBehavioralData?: boolean;
  deleteProfileData?: boolean;
  deleteActivityLogs?: boolean;
  retainFamilyData?: boolean;
}
