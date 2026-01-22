/**
 * Analytics Types
 * 
 * @description Type definitions for Supabase RPC responses and analytics data.
 * Eliminates 'any' usage in stores and components that consume analytics.
 * 
 * @module types/analytics
 */

// ============================================
// RPC Response Wrapper
// ============================================

/**
 * Generic wrapper for Supabase RPC results.
 * Use this to type the return value of supabase.rpc() calls.
 */
export interface SupabaseRPCResult<T> {
  data: T | null;
  error: { message: string; code?: string; hint?: string } | null;
}

// ============================================
// Engagement Analytics
// ============================================

export interface EngagementAnalyticsRow {
  metric: string;
  current_value: number;
  previous_value: number;
  change_percentage: number;
  trend: string;
}

export interface DailyAnalyticsRow {
  date: string;
  total_users: number;
  active_users: number;
  new_signups: number;
  total_families: number;
  engagement_score: number;
}

export interface RetentionAnalyticsRow {
  cohort_date: string;
  users_count: number;
  retention_day_1: number;
  retention_day_7: number;
  retention_day_30: number;
}

// ============================================
// Performance Analytics
// ============================================

export interface PerformanceInsightRow {
  insight_type: string;
  title: string;
  description: string;
  metric_value: number;
  trend: string;
  recommendations: string[];
}

// ============================================
// Behavioral Analytics
// ============================================

export interface BehavioralInsightRow {
  engagement_score: number;
  peak_activity_time: string;
  most_used_features: Array<{ feature: string; count: number }>;
  behavioral_patterns: {
    avg_session_minutes: number;
    total_points_earned: number;
    achievements_unlocked: number;
  };
}

// ============================================
// Child Game Assignments
// ============================================

export interface ChildGameAssignmentRow {
  content_item_id: string;
  is_required: boolean;
  difficulty_override: string | null;
  due_date: string | null;
}

// ============================================
// KPI Metrics
// ============================================

export interface KPIMetricsRow {
  metric_name: string;
  current_value: number;
  previous_value: number;
  change_percentage: number;
  trend: 'up' | 'down' | 'stable';
  target_value?: number;
}

// ============================================
// Family Growth
// ============================================

export interface FamilyGrowthRow {
  date: string;
  total_families: number;
  new_families: number;
  active_families: number;
}

// ============================================
// Security Audit Events
// ============================================

export interface AuditEventDetails {
  action?: string;
  target?: string;
  result?: string;
  ip_address?: string;
  user_agent?: string;
  [key: string]: unknown;
}

// ============================================
// Gamification Effectiveness
// ============================================

export interface GamificationMetadata {
  games_played?: number;
  points_source?: string;
  achievement_ids?: string[];
  [key: string]: unknown;
}

// ============================================
// Task Performance Metadata
// ============================================

export interface TaskPerformanceMetadata {
  completion_method?: string;
  assistance_required?: boolean;
  retry_count?: number;
  [key: string]: unknown;
}

// ============================================
// Chart Tooltip Types
// ============================================

export interface ChartTooltipPayload {
  dataKey?: string;
  name?: string;
  value?: number;
  color?: string;
  fill?: string;
  payload?: Record<string, unknown>;
}

// ============================================
// Re-exports for convenience
// ============================================

export type EngagementAnalyticsResponse = SupabaseRPCResult<EngagementAnalyticsRow[]>;
export type RetentionAnalyticsResponse = SupabaseRPCResult<RetentionAnalyticsRow[]>;
export type PerformanceInsightsResponse = SupabaseRPCResult<PerformanceInsightRow[]>;
export type KPIMetricsResponse = SupabaseRPCResult<KPIMetricsRow[]>;
export type FamilyGrowthResponse = SupabaseRPCResult<FamilyGrowthRow[]>;
