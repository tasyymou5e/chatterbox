/**
 * Common type utilities and generic interfaces
 * Used across multiple domains to ensure type consistency
 */

// Generic JSON types for database fields
export type JsonObject = Record<string, unknown>;
export type JsonArray = unknown[];
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

// Common database field types
export interface TimestampFields {
  created_at: string;
  updated_at: string;
}

export interface SoftDeleteFields {
  deleted_at?: string;
  is_deleted?: boolean;
}

export interface AuditFields extends TimestampFields {
  created_by?: string;
  updated_by?: string;
  version?: number;
}

// Common status types
export type Status = 'active' | 'inactive' | 'pending' | 'suspended' | 'archived';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type Priority = 'low' | 'medium' | 'high' | 'critical';
export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

// Generic API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  metadata?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  path?: string;
  timestamp: string;
}

// Pagination types
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Search and filter types
export interface SearchParams {
  query?: string;
  filters?: Record<string, unknown>;
  facets?: string[];
}

export interface FilterOptions {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'like' | 'ilike';
  value: unknown;
}

// Generic validation types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// Feature flag types
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  description?: string;
  conditions?: {
    userRole?: string[];
    familyPlan?: string[];
    percentage?: number;
  };
}

// Configuration types
export interface AppConfig {
  features: Record<string, FeatureFlag>;
  limits: {
    maxFamilyMembers: number;
    maxChoresPerFamily: number;
    maxWishlistItems: number;
    fileUploadSize: number;
  };
  integrations: {
    supabase: {
      url: string;
      anonKey: string;
    };
    analytics?: {
      provider: string;
      config: Record<string, unknown>;
    };
  };
}

// Theme and UI types
export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  border: string;
  destructive: string;
  warning: string;
  success: string;
}

export interface UiState {
  theme: 'light' | 'dark' | 'auto';
  sidebarCollapsed: boolean;
  notifications: NotificationItem[];
  loading: boolean;
  error?: string;
}

export interface NotificationItem {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actions?: {
    label: string;
    action: () => void;
  }[];
}