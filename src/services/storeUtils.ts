/**
 * Store Utilities
 * 
 * @description Shared utilities for Zustand stores including input validation,
 * authentication helpers, error handling, and retry logic.
 * 
 * @module storeUtils
 */
import { useAuthStore } from '@/stores/authStore';
import { z } from 'zod';

// ============================================
// Input Validation Schemas
// ============================================

/**
 * Zod schema for validating chore input data.
 * 
 * @example
 * const result = choreInputSchema.safeParse(choreData);
 * if (!result.success) {
 *   console.error(result.error.issues);
 * }
 */
export const choreInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().max(500, 'Description too long').nullable(),
  estimated_duration: z.number().min(1).max(480), // 8 hours max
  difficulty: z.enum(['easy', 'medium', 'hard']),
  base_points: z.number().min(1).max(1000),
});

/**
 * Zod schema for validating wishlist item input data.
 */
export const wishlistInputSchema = z.object({
  item_name: z.string().min(1, 'Item name is required').max(100, 'Item name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  point_cost: z.number().min(1).max(10000),
  reward_type: z.enum(['points', 'custom', 'privilege', 'activity']).optional(),
});

// ============================================
// Authentication Utilities
// ============================================

/**
 * Gets the current authenticated user from the auth store.
 * 
 * @description Synchronously retrieves the user object from Zustand state.
 * Use this for non-reactive access (e.g., in store actions).
 * 
 * @returns The current User object or null if not authenticated
 * 
 * @example
 * const user = getCurrentUser();
 * if (user) {
 *   console.log('Logged in as:', user.email);
 * }
 */
export const getCurrentUser = () => {
  const state = useAuthStore.getState();
  return state.user;
};

/**
 * Gets the current authenticated user's ID.
 * 
 * @returns User ID string or null if not authenticated
 * 
 * @example
 * const userId = getCurrentUserId();
 * await supabase.from('items').insert({ user_id: userId, ... });
 */
export const getCurrentUserId = (): string | null => {
  const user = getCurrentUser();
  return user?.id || null;
};

/**
 * Validates that a user is authenticated and returns their ID.
 * 
 * @description Use in store actions that require authentication.
 * Throws an error if no user is authenticated.
 * 
 * @returns User ID string
 * @throws {Error} If user is not authenticated
 * 
 * @example
 * const createItem = async (data) => {
 *   const userId = requireAuth(); // Throws if not logged in
 *   await supabase.from('items').insert({ ...data, user_id: userId });
 * };
 */
export const requireAuth = (): string => {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('Authentication required');
  }
  return userId;
};

/**
 * Sanitizes user input by removing dangerous HTML patterns.
 * 
 * @description Prevents XSS attacks by removing script tags, javascript: protocols,
 * event handlers, and dangerous HTML elements.
 * 
 * @param input - Raw user input string
 * @returns Sanitized string
 * 
 * @example
 * const safeName = sanitizeInput(userInput);
 */
export const sanitizeInput = (input: string): string => {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<(iframe|object|embed|link|meta|form|input|textarea|select|option)\b[^>]*>/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// ============================================
// Error Handling Types
// ============================================

/**
 * Standardized error structure for store operations.
 * 
 * @interface StoreError
 * @property {'validation' | 'auth' | 'network' | 'permission'} type - Error category
 * @property {string} message - Human-readable error message
 * @property {string} [code] - Machine-readable error code
 * @property {Record<string, any>} [context] - Additional error context
 */
export interface StoreError {
  type: 'validation' | 'auth' | 'network' | 'permission';
  message: string;
  code?: string;
  context?: Record<string, any>;
}

/**
 * Creates a standardized store error object.
 * 
 * @param type - Error category
 * @param message - Human-readable message
 * @param code - Optional error code
 * @param context - Optional additional context
 * @returns StoreError object
 * 
 * @example
 * return createStoreError('validation', 'Title is required', 'MISSING_TITLE');
 */
export const createStoreError = (
  type: StoreError['type'], 
  message: string, 
  code?: string, 
  context?: Record<string, any>
): StoreError => ({
  type,
  message,
  code,
  context,
});

/**
 * Success result structure for store operations.
 * 
 * @template T - Type of the data payload
 */
export interface StoreSuccess<T = any> {
  /** The operation result data */
  data: T;
  /** Optional success message */
  message?: string;
}

/**
 * Creates a standardized success result object.
 * 
 * @template T - Type of the data payload
 * @param data - The result data
 * @param message - Optional success message
 * @returns StoreSuccess object
 */
export const createStoreSuccess = <T>(data: T, message?: string): StoreSuccess<T> => ({
  data,
  message,
});

/**
 * Discriminated union type for store operation results.
 * 
 * @template T - Type of successful result data
 * 
 * @example
 * const result: StoreResult<User> = await fetchUser(id);
 * if (result.success) {
 *   console.log(result.result.data.name);
 * } else {
 *   console.error(result.error.message);
 *   if (result.canRetry) {
 *     // Show retry button
 *   }
 * }
 */
export type StoreResult<T = any> = 
  | { success: true; result: StoreSuccess<T> }
  | { success: false; error: StoreError; retryCount?: number; canRetry?: boolean };

// ============================================
// Retry Configuration
// ============================================

/**
 * Configuration options for retry logic.
 * 
 * @interface RetryConfig
 * @property {number} [maxRetries=3] - Maximum number of retry attempts
 * @property {number} [minRetryInterval=2000] - Minimum delay between retries (ms)
 * @property {number} [maxBackoffDelay=30000] - Maximum backoff delay (ms)
 * @property {StoreError['type'][]} [retryableErrorTypes] - Error types eligible for retry
 * @property {string[]} [retryableErrorMessages] - Error message patterns eligible for retry
 */
export interface RetryConfig {
  maxRetries?: number;
  minRetryInterval?: number;
  maxBackoffDelay?: number;
  retryableErrorTypes?: StoreError['type'][];
  retryableErrorMessages?: string[];
}

/**
 * Default retry configuration.
 * 
 * @description Provides sensible defaults for retry behavior:
 * - 3 retry attempts
 * - 2 second minimum interval with exponential backoff
 * - 30 second maximum delay
 * - Retries network and auth errors
 */
export const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  minRetryInterval: 2000, // 2 seconds
  maxBackoffDelay: 30000, // 30 seconds
  retryableErrorTypes: ['network', 'auth'],
  retryableErrorMessages: ['Session not ready', 'permission denied', 'Network error', 'timeout']
};

/**
 * Internal retry state tracking.
 */
export interface RetryState {
  retryCount: number;
  lastRetryTime: number;
  isRetrying: boolean;
}

// ============================================
// Retry Logic
// ============================================

/**
 * Wraps a store operation with automatic retry logic.
 * 
 * @description Implements exponential backoff retry strategy for failed operations.
 * Only retries errors that match configured error types or message patterns.
 * 
 * @template T - The type of successful result data
 * 
 * @param operation - Async function returning StoreResult<T>
 * @param config - Retry configuration options
 * 
 * @returns Promise<StoreResult<T>> with retry metadata
 * 
 * @example
 * const result = await withRetry(
 *   () => fetchUserData(userId),
 *   { maxRetries: 5, minRetryInterval: 1000 }
 * );
 * 
 * if (result.success) {
 *   console.log('Data:', result.result.data);
 * } else {
 *   console.error(`Failed after ${result.retryCount} retries:`, result.error.message);
 *   if (result.canRetry) {
 *     // Manual retry is still possible
 *   }
 * }
 * 
 * @see {@link RetryConfig} for configuration options
 * @see {@link defaultRetryConfig} for default values
 */
export const withRetry = async <T>(
  operation: () => Promise<StoreResult<T>>,
  config: RetryConfig = defaultRetryConfig
): Promise<StoreResult<T>> => {
  let retryCount = 0;
  let lastRetryTime = 0;
  
  const executeWithRetry = async (): Promise<StoreResult<T>> => {
    const result = await operation();
    
    if (result.success) {
      return result;
    }
    
    // Now we know it's the error case, so we can safely access result.error
    const errorResult = result as { success: false; error: StoreError };
    
    // Check if error is retryable
    const isRetryableType = config.retryableErrorTypes?.includes(errorResult.error.type);
    const isRetryableMessage = config.retryableErrorMessages?.some(msg => 
      errorResult.error.message.toLowerCase().includes(msg.toLowerCase())
    );
    
    const isRetryable = isRetryableType || isRetryableMessage;
    const maxRetries = config.maxRetries || 3;
    
    if (!isRetryable || retryCount >= maxRetries) {
      return {
        success: false,
        error: errorResult.error,
        retryCount,
        canRetry: isRetryable && retryCount < maxRetries
      };
    }
    
    // Implement exponential backoff
    const now = Date.now();
    const timeSinceLastRetry = now - lastRetryTime;
    const minInterval = config.minRetryInterval || 2000;
    
    if (timeSinceLastRetry < minInterval) {
      await new Promise(resolve => setTimeout(resolve, minInterval - timeSinceLastRetry));
    }
    
    const backoffDelay = Math.min(
      minInterval * Math.pow(2, retryCount),
      config.maxBackoffDelay || 30000
    );
    
    retryCount++;
    lastRetryTime = Date.now();
    
    console.log(`🔄 Retrying operation (${retryCount}/${maxRetries}) in ${backoffDelay}ms...`);
    
    await new Promise(resolve => setTimeout(resolve, backoffDelay));
    return executeWithRetry();
  };
  
  return executeWithRetry();
};

// Utility to check if an error is network-related
export const isNetworkError = (error: any): boolean => {
  const errorMessage = error?.message?.toLowerCase() || '';
  return errorMessage.includes('network') ||
         errorMessage.includes('fetch') ||
         errorMessage.includes('timeout') ||
         errorMessage.includes('connection') ||
         error?.code === 'NETWORK_ERROR';
};

// Create retry-enhanced store result
export const createRetryableStoreError = (
  type: StoreError['type'],
  message: string,
  code?: string,
  context?: Record<string, any>,
  retryCount = 0,
  canRetry = false
): StoreResult => ({
  success: false,
  error: createStoreError(type, message, code, context),
  retryCount,
  canRetry
});