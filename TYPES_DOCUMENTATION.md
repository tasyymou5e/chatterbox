# TypeScript Types Documentation

> **Last Updated:** 2026-03-24  
> **Total Type Files:** 21  
> **Location:** `src/types/`  
> **TypeScript Version:** 5.6.2

## Overview

This document provides a comprehensive reference for all TypeScript type definitions in the Chatterbox platform. Types are organized by domain and include interfaces, enums, type guards, and utility types.

---

## Table of Contents

1. [Type Architecture](#type-architecture)
2. [Core Types](#core-types)
3. [Feature Types](#feature-types)
4. [System Types](#system-types)
5. [Supabase Types](#supabase-types)
6. [Type Guards](#type-guards)
7. [Utility Types](#utility-types)

---

## Type Architecture

### File Organization

```
src/types/
├── admin.ts              # Admin interfaces
├── analytics.ts          # Analytics response types (NEW)
├── auth.ts               # Authentication types
├── autism.ts             # Autism features/accommodations
├── chore.ts              # Chore management types
├── common.ts             # Shared utility types
├── components.ts         # Component prop types
├── content.ts            # Content management types
├── errors.ts             # Error handling types
├── errorTracking.ts      # Error tracking types
├── gameEvents.ts         # Game event types
├── gamification.ts       # Points/achievements types
├── interfaces.ts         # Shared interfaces
├── kidsPortal.ts         # Kids portal types
├── lessonProgress.ts     # Progress tracking types
├── logs.ts               # System log types
├── navigator.ts          # Browser API extensions
├── privacy.ts            # Privacy compliance types
├── security.ts           # Security types
├── supabase.ts           # Supabase error utilities
└── systemHealth.ts       # System health types
```

### Design Principles

1. **Single Responsibility:** One domain per file
2. **Export Everything:** Named exports for tree-shaking
3. **Type Guards:** Runtime type checking utilities
4. **No `any`:** Strict typing throughout
5. **Documentation:** JSDoc comments on complex types

---

## Core Types

### `auth.ts`

Authentication and user role types.

```typescript
/**
 * Application roles enum
 */
export type AppRole = 'admin' | 'parent' | 'child';

/**
 * User profile from profiles table
 */
export interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  family_id: string | null;
}

/**
 * User with role information
 */
export interface UserWithRole {
  user: User;
  profile: Profile | null;
  roles: AppRole[];
}

/**
 * Session with user context
 */
export interface AuthSession {
  session: Session;
  user: User;
  profile: Profile | null;
  roles: AppRole[];
  familyId: string | null;
}

/**
 * Authentication state
 */
export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  error: Error | null;
  initialized: boolean;
}
```

---

### `common.ts`

Shared utility types used across the application.

```typescript
/**
 * Nullable type wrapper
 */
export type Nullable<T> = T | null;

/**
 * Optional type wrapper
 */
export type Optional<T> = T | undefined;

/**
 * Make specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  success: boolean;
}

/**
 * Date range for filtering
 */
export interface DateRange {
  start: Date;
  end: Date;
}

/**
 * Generic ID type
 */
export type UUID = string;
```

---

### `components.ts`

Component prop type definitions.

```typescript
/**
 * Base props for all components
 */
export interface BaseComponentProps {
  className?: string;
  testId?: string;
}

/**
 * Props for components with children
 */
export interface WithChildrenProps extends BaseComponentProps {
  children: React.ReactNode;
}

/**
 * Props for loading states
 */
export interface LoadingProps {
  loading?: boolean;
  loadingText?: string;
}

/**
 * Props for error states
 */
export interface ErrorProps {
  error?: Error | null;
  onRetry?: () => void;
}

/**
 * Combined async state props
 */
export interface AsyncStateProps extends LoadingProps, ErrorProps {}

/**
 * Dialog component props
 */
export interface DialogProps extends BaseComponentProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}

/**
 * Form field props
 */
export interface FormFieldProps<T> {
  name: keyof T;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}
```

---

## Feature Types

### `autism.ts`

Autism-specific features and accommodations.

```typescript
/**
 * Autism-friendly feature flags
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

/**
 * Sensory preference settings
 */
export interface SensoryPreferences {
  light_sensitivity?: 'low' | 'medium' | 'high';
  sound_sensitivity?: 'low' | 'medium' | 'high';
  motion_sensitivity?: 'low' | 'medium' | 'high';
  preferred_colors?: string[];
  avoid_flashing?: boolean;
  prefer_muted_tones?: boolean;
}

/**
 * Communication style preferences
 */
export interface CommunicationStyle {
  uses_aac?: boolean;
  preferred_communication?: 'verbal' | 'visual' | 'written' | 'aac';
  needs_extra_time?: boolean;
  prefers_routine_language?: boolean;
  responds_to_visual_cues?: boolean;
}

/**
 * Accommodation settings
 */
export interface AutismAccommodations {
  break_reminders?: boolean;
  transition_warnings?: boolean;
  simplified_interface?: boolean;
  consistent_navigation?: boolean;
  progress_indicators?: boolean;
  reward_system?: boolean;
  custom_difficulty?: 'easier' | 'standard' | 'challenging';
}
```

---

### `chore.ts`

Chore management type definitions.

```typescript
/**
 * Chore status enum
 */
export type ChoreStatus = 'pending' | 'in_progress' | 'completed' | 'verified' | 'rejected';

/**
 * Chore difficulty levels
 */
export type ChoreDifficulty = 'easy' | 'medium' | 'hard';

/**
 * Recurrence pattern
 */
export interface RecurrencePattern {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  daysOfWeek?: number[];
  endDate?: string;
}

/**
 * Chore definition
 */
export interface Chore {
  id: string;
  title: string;
  description: string | null;
  family_id: string;
  created_by: string;
  category_id: string | null;
  difficulty: ChoreDifficulty | null;
  base_points: number | null;
  estimated_duration: number | null;
  instructions: ChoreInstruction[] | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

/**
 * Chore assignment
 */
export interface ChoreAssignment {
  id: string;
  chore_id: string;
  assigned_to: string;
  assigned_by: string;
  family_id: string;
  status: ChoreStatus;
  due_date: string | null;
  completed_at: string | null;
  verified_at: string | null;
  verified_by: string | null;
  points_earned: number | null;
  recurrence_pattern: RecurrencePattern | null;
  created_at: string;
  updated_at: string;
}

/**
 * Chore completion record
 */
export interface ChoreCompletion {
  id: string;
  assignment_id: string;
  chore_id: string;
  user_id: string;
  family_id: string;
  completion_date: string;
  time_started: string | null;
  time_completed: string;
  actual_duration: number | null;
  points_earned: number | null;
  completion_notes: string | null;
  completion_photos: string[] | null;
  created_at: string;
}
```

---

### `content.ts`

Content management types.

```typescript
import type { AutismFeatures } from './autism';

/**
 * Content item from database
 */
export interface ContentItem {
  id: string;
  title: string;
  description: string | null;
  content_type: string;
  url: string;
  thumbnail_url: string | null;
  age_min: number | null;
  age_max: number | null;
  autism_features: AutismFeatures | null;
  tags: string[] | null;
  is_free: boolean | null;
  is_active: boolean | null;
  category_id: string | null;
  skill_levels: string[] | null;
  platform: string | null;
  content_rating: string | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
  content_categories?: {
    name: string;
    icon: string | null;
  } | null;
}

/**
 * Content category
 */
export interface ContentCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean | null;
  sort_order: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Content filter options
 */
export interface ContentFilters {
  category?: string;
  contentType?: string;
  ageRange?: [number, number];
  isFree?: boolean;
  searchQuery?: string;
  tags?: string[];
  autismFeatures?: (keyof AutismFeatures)[];
}

/**
 * Content interaction types
 */
export type InteractionType = 'view' | 'play' | 'complete' | 'favorite' | 'share';

/**
 * Content interaction record
 */
export interface ContentInteraction {
  id: string;
  content_item_id: string;
  user_id: string;
  family_id?: string;
  interaction_type: InteractionType;
  session_duration?: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
```

---

### `gamification.ts`

Points, achievements, and rewards types.

```typescript
/**
 * Achievement types
 */
export type AchievementType = 
  | 'streak'
  | 'milestone'
  | 'mastery'
  | 'social'
  | 'exploration'
  | 'special';

/**
 * Achievement rarity
 */
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

/**
 * Achievement definition
 */
export interface Achievement {
  id: string;
  name: string;
  description: string;
  achievement_type: AchievementType;
  icon: string | null;
  rarity: AchievementRarity | null;
  point_reward: number | null;
  xp_reward: number | null;
  unlock_criteria: UnlockCriteria;
  is_secret: boolean | null;
  is_active: boolean | null;
  created_at: string;
  updated_at: string;
}

/**
 * Unlock criteria for achievements
 */
export interface UnlockCriteria {
  type: 'count' | 'streak' | 'score' | 'time' | 'custom';
  target: number;
  metric?: string;
  conditions?: Record<string, unknown>;
}

/**
 * User achievement unlock record
 */
export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  progress: number;
  metadata?: Record<string, unknown>;
  achievement?: Achievement;
}

/**
 * Point transaction
 */
export interface PointTransaction {
  id: string;
  user_id: string;
  amount: number;
  source: string;
  description: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
}

/**
 * Leaderboard entry
 */
export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  points: number;
  level: number;
}
```

---

### `lessonProgress.ts`

Educational progress tracking types.

```typescript
/**
 * Skill level progression
 */
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

/**
 * Lesson progress record
 */
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

/**
 * Lesson history entry
 */
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

/**
 * Completion certificate
 */
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

/**
 * Celebration event types
 */
export interface CelebrationEvent {
  type: 'starEarned' | 'moonReached' | 'levelCompleted' | 'categoryMastered';
  categoryId: string;
  level?: SkillLevel;
  starsEarned?: number;
  moonsEarned?: number;
}

/**
 * Category progress summary
 */
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

/**
 * Progress constants
 */
export const SKILL_LEVEL_COLORS: Record<SkillLevel, string> = {
  beginner: 'hsl(142, 76%, 36%)',
  intermediate: 'hsl(217, 91%, 60%)',
  advanced: 'hsl(270, 76%, 55%)',
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
```

---

## System Types

### `analytics.ts` (NEW)

Analytics response types for type-safe RPC calls.

```typescript
/**
 * Generic Supabase RPC result wrapper
 */
export interface SupabaseRPCResult<T> {
  data: T | null;
  error: {
    message: string;
    code?: string;
  } | null;
}

/**
 * Engagement analytics response
 */
export interface EngagementAnalyticsResponse {
  date: string;
  active_users: number;
  sessions: number;
  avg_session_duration: number;
}

/**
 * Retention analytics response
 */
export interface RetentionAnalyticsResponse {
  cohort_date: string;
  week_0: number;
  week_1: number;
  week_2: number;
  week_3: number;
  week_4: number;
}

/**
 * KPI metrics response
 */
export interface KPIMetricsResponse {
  total_users: number;
  active_users_7d: number;
  new_signups_30d: number;
  total_families: number;
  avg_session_duration: number;
  content_completion_rate: number;
}

/**
 * Family growth response
 */
export interface FamilyGrowthResponse {
  date: string;
  total_families: number;
  new_families: number;
  active_families: number;
}
```

---

### `logs.ts`

System log type definitions.

```typescript
/**
 * Postgres log entry
 */
export interface PostgresLog {
  id: string;
  timestamp: number;
  identifier: string;
  event_message: string;
  error_severity: 'LOG' | 'INFO' | 'WARNING' | 'ERROR';
}

/**
 * Auth log entry
 */
export interface AuthLog {
  id: string;
  timestamp: number;
  event_message: string;
  level: 'info' | 'warning' | 'error';
  status: number;
  path: string;
  msg: string;
  error: string | null;
}

/**
 * Database log union type
 */
export type DatabaseLog = PostgresLog | AuthLog;

/**
 * Edge function log entry
 */
export interface EdgeFunctionLog {
  id: string;
  timestamp: number;
  event_message: string;
  status_code: number;
  method: string;
  function_id: string;
  execution_time_ms: number;
  deployment_id: string;
  version: string;
}

/**
 * Circuit breaker state
 */
export interface CircuitBreakerState {
  consecutiveFailures: number;
  lastFailureTime: number;
  isCircuitOpen: boolean;
  nextRetryTime: number;
  backoffMultiplier: number;
}
```

---

### `systemHealth.ts`

System health monitoring types.

```typescript
/**
 * System health metric
 */
export interface SystemHealthMetric {
  service_name: string;
  status: 'healthy' | 'degraded' | 'down';
  response_time?: number;
  uptime_percentage?: number;
  error_rate?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Error statistics summary
 */
export interface ErrorStatistics {
  total_errors: number;
  critical_errors: number;
  high_errors: number;
  medium_errors: number;
  low_errors: number;
  resolved_errors: number;
  top_error_components: string[];
  error_rate_trend: number[];
}

/**
 * System error record
 */
export interface SystemError {
  id: string;
  error_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  component_name: string | null;
  route_path?: string | null;
  created_at: string;
  resolved: boolean | null;
  resolved_by?: string | null;
  resolved_at?: string | null;
  user_id?: string | null;
  session_id?: string | null;
  stack_trace?: string | null;
  browser_info?: Record<string, unknown>;
  device_info?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * System alert
 */
export interface SystemAlert {
  id: string;
  alert_type: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description?: string | null;
  acknowledged: boolean | null;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
  resolved: boolean | null;
  resolved_at?: string | null;
  created_at: string;
  triggered_by?: string | null;
  metadata?: Record<string, unknown>;
}
```

---

### `security.ts`

Security-related types.

```typescript
/**
 * Threat indicator
 */
export interface ThreatIndicator {
  id: string;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  event_details: Record<string, unknown>;
  timestamp?: string;
  user_id?: string;
  ip_address?: string;
}

/**
 * Security metrics summary
 */
export interface SecurityMetrics {
  total_alerts: number;
  rls_violations: number;
  failed_activities: number;
  system_errors: number;
  severity_breakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  top_threat_indicators: ThreatIndicator[];
}

/**
 * Security test result
 */
export interface SecurityTest {
  name: string;
  description: string;
  test_type: string;
  severity: string;
  passed: boolean;
  error_message?: string;
  execution_time_ms: number;
}

/**
 * Device fingerprint info
 */
export interface DeviceInfo {
  userAgent: string;
  language: string;
  platform: string;
  screenResolution: string;
  timezone: string;
  colorDepth: number;
  pixelDepth: number;
  cookieEnabled: boolean;
  onlineStatus: boolean;
}

/**
 * Browser info
 */
export interface BrowserInfo {
  vendor: string;
  product: string;
  appName: string;
  appVersion: string;
}

/**
 * Site setting value types
 */
export type SiteSettingValue = boolean | number | string;

/**
 * Family member profile from joined query
 */
export interface FamilyMemberProfile {
  first_name?: string;
  last_name?: string;
  email?: string;
}
```

---

## Type Guards

### From `logs.ts`

```typescript
/**
 * Type guard for Postgres logs
 */
export function isPostgresLog(log: DatabaseLog): log is PostgresLog {
  return 'error_severity' in log && 'identifier' in log;
}

/**
 * Type guard for Auth logs
 */
export function isAuthLog(log: DatabaseLog): log is AuthLog {
  return 'level' in log && 'status' in log;
}
```

### From `security.ts`

```typescript
/**
 * Get navigator vendor safely
 */
export function getNavigatorVendor(): string {
  return (navigator as { vendor?: string }).vendor || '';
}
```

---

## Utility Types

### From `src/utils/getErrorMessage.ts`

```typescript
/**
 * Type guard for error with message
 */
export function isErrorWithMessage(error: unknown): error is { message: string };

/**
 * Type guard for error with code
 */
export function isErrorWithCode(error: unknown): error is { code: string; message: string };

/**
 * Extract error message safely
 */
export function getErrorMessage(error: unknown): string;

/**
 * Extract error code if available
 */
export function getErrorCode(error: unknown): string | null;
```

---

## Supabase Types

### Auto-Generated Types

The file `src/integrations/supabase/types.ts` is auto-generated from the database schema and should **never be edited manually**.

Key exports:
- `Database` - Complete database schema type
- `Tables` - Table row types
- `Enums` - Database enum types
- `Json` - JSON column type

### Usage

```typescript
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type ChoreStatus = Database['public']['Enums']['chore_status'];
```

---

## Best Practices

### Type Naming Conventions

- Interfaces: PascalCase with descriptive names
- Type aliases: PascalCase
- Enums: PascalCase with UPPER_SNAKE_CASE values
- Type guards: camelCase with `is` prefix

### Documentation

```typescript
/**
 * @description User profile with family association
 * @see Database['public']['Tables']['profiles']['Row']
 */
export interface Profile {
  // ...
}
```

### Avoiding `any`

```typescript
// ✅ Good
export function processData(data: unknown): ProcessedData {
  if (isValidData(data)) {
    return transform(data);
  }
  throw new Error('Invalid data');
}

// ❌ Bad
export function processData(data: any): ProcessedData {
  return transform(data);
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-21 | Initial documentation |
