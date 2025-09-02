/**
 * Phase 3: Type Safety Improvements - Proper interfaces replacing 'any' types
 */

// Global window interface extensions
declare global {
  interface Window {
    __navigate?: (path: string) => void;
  }
}

// API Response interfaces
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: {
    message: string;
    code?: string;
    status?: number;
  };
}

// Database record interfaces
export interface ActivityLogRecord {
  id: string;
  user_id: string;
  activity_type: string;
  ip_address?: string;
  user_agent?: string;
  device_info: DeviceInfoData;
  session_id?: string;
  success: boolean;
  failure_reason?: string;
  metadata: ActivityMetadata;
  created_at: string;
  profiles?: ProfileData;
}

export interface DeviceInfoData {
  platform?: string;
  isMobile?: boolean;
  screenWidth?: number;
  screenHeight?: number;
  timezone?: string;
  touchSupport?: boolean;
}

export interface ActivityMetadata {
  browser?: string;
  location?: string;
  feature?: string;
  action?: string;
  context?: Record<string, unknown>;
  email?: string;
  firstName?: string;
  lastName?: string;
  errorType?: string;
  loginMethod?: string;
  attemptedAt?: string;
  loginAt?: string;
  timestamp?: string;
  deviceInfo?: Record<string, unknown>;
  browserInfo?: {
    vendor?: string;
    product?: string;
    appName?: string;
    appVersion?: string;
  };
}

export interface ProfileData {
  id: string;
  user_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

// System Health interfaces
export interface PerformanceMetricData {
  id: string;
  metric_type: string;
  value: number;
  component_name?: string;
  route_path?: string;
  user_id?: string;
  threshold_exceeded: boolean;
  metadata: PerformanceMetadata;
  created_at: string;
}

export interface PerformanceMetadata {
  loadTime?: number;
  renderTime?: number;
  apiResponseTime?: number;
  bundleSize?: number;
  memoryUsage?: number;
  context?: Record<string, unknown>;
}

// Content and Games interfaces
export interface ContentItemData {
  id: string;
  title: string;
  description?: string;
  url: string;
  thumbnail_url?: string;
  content_type: string;
  category_id?: string;
  tags: string[];
  age_min: number;
  age_max: number;
  content_rating: string;
  platform: string;
  is_free: boolean;
  autism_features: AutismFeatures;
  approval_status: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface AutismFeatures {
  sensoryFriendly?: boolean;
  visualSupport?: boolean;
  clearInstructions?: boolean;
  noFlashing?: boolean;
  quietMode?: boolean;
  predictableLayout?: boolean;
  focusAssist?: boolean;
  pauseOption?: boolean;
}

// Chore Management interfaces
export interface ChoreInstruction {
  step: number;
  text: string;
  image_url?: string;
  estimated_duration?: number;
  required?: boolean;
}

export interface ChoreCustomizations {
  difficulty_override?: string;
  points_override?: number;
  instructions_override?: ChoreInstruction[];
  autism_accommodations?: AutismAccommodations;
}

export interface AutismAccommodations {
  visualTimer?: boolean;
  breakReminders?: boolean;
  sensoryBreaks?: boolean;
  stepByStep?: boolean;
  quietSpace?: boolean;
  flexibleTiming?: boolean;
}

export interface RecurrencePattern {
  type: 'daily' | 'weekly' | 'monthly' | 'custom';
  interval?: number;
  days_of_week?: number[];
  day_of_month?: number;
  end_date?: string;
  max_occurrences?: number;
}

// Gamification interfaces
export interface Achievement {
  id: string;
  name: string;
  description: string;
  achievement_type: string;
  unlock_criteria: AchievementCriteria;
  point_reward: number;
  xp_reward: number;
  icon?: string;
  rarity: string;
  is_secret: boolean;
  is_active: boolean;
}

export interface AchievementCriteria {
  required_completions?: number;
  required_streak?: number;
  required_points?: number;
  time_period?: string;
  specific_chores?: string[];
}

export interface WishlistItemData {
  name: string;
  description?: string;
  points_cost: number;
  category?: string;
  image_url?: string;
  availability_limit?: number;
  requires_approval: boolean;
}

// Error handling interfaces
export interface ErrorContext {
  component?: string;
  function?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: string;
  additionalData?: Record<string, unknown>;
}

// Connection interfaces
export interface ConnectionUpdate {
  permissions?: ConnectionPermissions;
  status?: string;
  connection_metadata?: Record<string, unknown>;
}

export interface ConnectionPermissions {
  can_view_progress: boolean;
  can_comment: boolean;
  can_assign_tasks: boolean;
  can_edit_chores?: boolean;
  can_view_reports?: boolean;
}

// Form validation interfaces
export interface FormValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
  warnings?: Record<string, string>;
}

// Utility functions for error handling
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  return 'An unexpected error occurred';
};

// Debounced function type
export interface DebouncedFunction<T extends (...args: unknown[]) => unknown> {
  (...args: Parameters<T>): void;
  cancel: () => void;
}

// Export error handling utility
export { getErrorMessage };