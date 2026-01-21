/**
 * Unified async error handling utility
 * Provides standardized try/catch with logging, toast notifications, and fallbacks
 */

import { toast } from '@/hooks/use-toast';
import { conditionalLogger } from './conditionalLogger';

export interface AsyncErrorOptions<T> {
  /** Context identifier for logging (e.g., 'useCatalogCache.fetchData') */
  context: string;
  /** Fallback value to return on error */
  fallback?: T;
  /** Whether to show a toast notification on error (default: true) */
  showToast?: boolean;
  /** Custom toast title */
  toastTitle?: string;
  /** Custom toast description (replaces error message) */
  toastDescription?: string;
  /** Whether to rethrow the error after handling (default: false) */
  rethrow?: boolean;
  /** Custom error handler callback */
  onError?: (error: Error, context: string) => void;
  /** Severity level for logging */
  severity?: 'error' | 'warn' | 'info';
}

export interface AsyncResult<T> {
  data: T | undefined;
  error: Error | null;
  success: boolean;
}

/**
 * Wraps an async operation with standardized error handling
 * 
 * @example
 * // Basic usage with fallback
 * const result = await withAsyncErrorHandling(
 *   () => fetchUserData(userId),
 *   { context: 'useAuth.fetchUser', fallback: null }
 * );
 * 
 * @example
 * // With custom toast and rethrow
 * const result = await withAsyncErrorHandling(
 *   () => saveSettings(data),
 *   { 
 *     context: 'settings.save',
 *     showToast: true,
 *     toastTitle: 'Failed to save settings',
 *     rethrow: true
 *   }
 * );
 */
export async function withAsyncErrorHandling<T>(
  operation: () => Promise<T>,
  options: AsyncErrorOptions<T>
): Promise<T | undefined> {
  const {
    context,
    fallback,
    showToast = true,
    toastTitle = 'An error occurred',
    toastDescription,
    rethrow = false,
    onError,
    severity = 'error',
  } = options;

  try {
    return await operation();
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    
    // Log the error with context
    const logMessage = `[${context}] ${error.message}`;
    switch (severity) {
      case 'warn':
        conditionalLogger.warn(logMessage, { error, context });
        break;
      case 'info':
        conditionalLogger.info(logMessage, { error, context });
        break;
      default:
        conditionalLogger.error(logMessage, { error, context, stack: error.stack });
    }

    // Show toast notification
    if (showToast) {
      toast({
        variant: 'destructive',
        title: toastTitle,
        description: toastDescription || error.message,
      });
    }

    // Call custom error handler
    if (onError) {
      onError(error, context);
    }

    // Rethrow if requested
    if (rethrow) {
      throw error;
    }

    return fallback;
  }
}

/**
 * Wraps an async operation and returns a result object with success/error info
 * Useful when you need to check success state without using try/catch
 * 
 * @example
 * const { data, error, success } = await tryAsync(
 *   () => supabase.from('users').select('*'),
 *   { context: 'fetchUsers' }
 * );
 * 
 * if (success) {
 *   setUsers(data);
 * } else {
 *   handleError(error);
 * }
 */
export async function tryAsync<T>(
  operation: () => Promise<T>,
  options: Omit<AsyncErrorOptions<T>, 'fallback' | 'rethrow'>
): Promise<AsyncResult<T>> {
  const {
    context,
    showToast = false,
    toastTitle,
    toastDescription,
    onError,
    severity = 'error',
  } = options;

  try {
    const data = await operation();
    return { data, error: null, success: true };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    
    // Log the error with context
    const logMessage = `[${context}] ${error.message}`;
    switch (severity) {
      case 'warn':
        conditionalLogger.warn(logMessage, { error, context });
        break;
      case 'info':
        conditionalLogger.info(logMessage, { error, context });
        break;
      default:
        conditionalLogger.error(logMessage, { error, context, stack: error.stack });
    }

    // Show toast notification if requested
    if (showToast) {
      toast({
        variant: 'destructive',
        title: toastTitle || 'An error occurred',
        description: toastDescription || error.message,
      });
    }

    // Call custom error handler
    if (onError) {
      onError(error, context);
    }

    return { data: undefined, error, success: false };
  }
}

/**
 * Creates a debounced async operation with error handling
 * Useful for search inputs and other rapidly-firing events
 */
export function createDebouncedAsyncHandler<TArgs extends unknown[], TResult>(
  handler: (...args: TArgs) => Promise<TResult>,
  options: AsyncErrorOptions<TResult> & { delay?: number }
): (...args: TArgs) => Promise<TResult | undefined> {
  const { delay = 300, ...errorOptions } = options;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingPromise: Promise<TResult | undefined> | null = null;

  return (...args: TArgs) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    pendingPromise = new Promise((resolve) => {
      timeoutId = setTimeout(async () => {
        const result = await withAsyncErrorHandling(
          () => handler(...args),
          errorOptions
        );
        resolve(result);
      }, delay);
    });

    return pendingPromise;
  };
}

/**
 * Retries an async operation with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: AsyncErrorOptions<T> & {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
  }
): Promise<T | undefined> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    ...errorOptions
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
        conditionalLogger.warn(
          `[${errorOptions.context}] Attempt ${attempt + 1} failed, retrying in ${delay}ms`,
          { error: lastError }
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries exhausted, handle the final error
  return withAsyncErrorHandling(
    () => Promise.reject(lastError),
    errorOptions
  );
}

export default {
  withAsyncErrorHandling,
  tryAsync,
  createDebouncedAsyncHandler,
  withRetry,
};
