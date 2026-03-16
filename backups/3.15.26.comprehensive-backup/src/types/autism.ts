/**
 * Types for autism-specific features and accommodations
 */

export interface AutismFeatures {
  sensory_friendly?: boolean;
  visual_supports?: boolean;
  predictable_routines?: boolean;
  social_stories?: boolean;
  communication_aids?: boolean;
  calming_elements?: boolean;
  clear_instructions?: boolean;
  progress_visualization?: boolean;
  customizable_pace?: boolean;
  non_verbal_friendly?: boolean;
  executive_function?: boolean;
}

export interface SensoryPreferences {
  light_sensitivity?: 'low' | 'medium' | 'high';
  sound_sensitivity?: 'low' | 'medium' | 'high';
  motion_sensitivity?: 'low' | 'medium' | 'high';
  preferred_colors?: string[];
  avoid_flashing?: boolean;
  prefer_muted_tones?: boolean;
}

export interface CommunicationStyle {
  uses_aac?: boolean;
  preferred_communication?: 'verbal' | 'visual' | 'written' | 'aac';
  needs_extra_time?: boolean;
  prefers_routine_language?: boolean;
  responds_to_visual_cues?: boolean;
}

export interface AutismAccommodations {
  break_reminders?: boolean;
  transition_warnings?: boolean;
  simplified_interface?: boolean;
  consistent_navigation?: boolean;
  progress_indicators?: boolean;
  reward_system?: boolean;
  custom_difficulty?: 'easier' | 'standard' | 'challenging';
}
