/**
 * Enhanced Supabase types for better type safety
 */
import type { User, Session, AuthError } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

// Re-export Supabase types
export type { User, Session, AuthError };

// Database table types
export type Tables = Database['public']['Tables'];
export type ProfileRow = Tables['profiles']['Row'];
export type FamilyRow = Tables['families']['Row'];
export type ChoreRow = Tables['chores']['Row'];
export type SystemErrorRow = Tables['system_errors']['Row'];

// Enhanced error types
export interface SupabaseError {
  name?: string;
  message: string;
  details?: string;
  hint?: string;
  code?: string;
  status?: number;
}

// Type guards
export function isSupabaseError(error: unknown): error is SupabaseError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  );
}

export function isAuthError(error: unknown): error is SupabaseError {
  return (
    isSupabaseError(error) &&
    ('status' in error || 'code' in error)
  );
}

export function isNetworkError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    (error.message.includes('fetch') || 
     error.message.includes('network') ||
     error.message.includes('NetworkError'))
  );
}

// JSON field types for database
export interface BrowserInfo {
  userAgent?: string;
  platform?: string;
  language?: string;
  vendor?: string;
  cookieEnabled?: boolean;
  onLine?: boolean;
}

export interface DeviceInfo {
  platform?: string;
  isMobile?: boolean;
  screenWidth?: number;
  screenHeight?: number;
  windowWidth?: number;
  windowHeight?: number;
  timezone?: string;
  touchSupport?: boolean;
}

export interface ErrorMetadata {
  source?: string;
  category?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: string;
  context?: Record<string, unknown>;
}

export interface ActivityMetadata {
  feature?: string;
  action?: string;
  duration?: number;
  result?: 'success' | 'error' | 'cancelled';
  context?: Record<string, unknown>;
}

/**
 * Generic Supabase API response type
 * Matches the shape returned by Supabase client operations
 */
export interface SupabaseResponse<T> {
  data: T | null;
  error: SupabaseError | null;
  count: number | null;
  status: number;
  statusText: string;
}

/**
 * Simplified response for single-item queries
 */
export interface SupabaseSingleResponse<T> {
  data: T | null;
  error: SupabaseError | null;
}

/**
 * Response type for list queries with pagination
 */
export interface SupabaseListResponse<T> {
  data: T[] | null;
  error: SupabaseError | null;
  count: number | null;
}

/**
 * Type helper for extracting data from Supabase responses
 */
export type ExtractData<T> = T extends SupabaseResponse<infer U> ? U : never;

/**
 * Type guard to check if response was successful
 */
export function isSuccessResponse<T>(
  response: SupabaseSingleResponse<T> | SupabaseListResponse<T>
): response is { data: NonNullable<T>; error: null } & typeof response {
  return response.error === null && response.data !== null;
}