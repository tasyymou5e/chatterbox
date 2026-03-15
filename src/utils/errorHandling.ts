/**
 * Centralized error handling utilities
 */
import { logger } from './wideLogger';
import type { SupabaseError } from '@/types/supabase';
import { isSupabaseError, isAuthError, isNetworkError } from '@/types/supabase';

/**
 * Standardized error handler that logs errors and returns user-friendly messages
 */
export const handleError = (
  error: unknown,
  context: string,
  fallbackMessage = 'An unexpected error occurred'
): SupabaseError => {
  // Type guard and error processing
  if (isSupabaseError(error)) {
    logger.error({ message: `${context}: ${error.message}`, component: context });
    return error;
  }

  if (isAuthError(error)) {
    logger.error({ message: `${context}: Auth error - ${error.message}`, component: context });
    return {
      name: 'AuthError',
      message: error.message,
      code: error.code,
      details: error.details
    };
  }

  if (isNetworkError(error)) {
    logger.error({ message: `${context}: Network error - ${error.message}`, component: context, error: { name: error.name, message: error.message } });
    return {
      name: 'NetworkError',
      message: 'Connection failed. Please check your internet connection.',
      details: error.message
    };
  }

  if (error instanceof Error) {
    logger.error({ message: `${context}: ${error.message}`, component: context, error: { name: error.name, message: error.message, stack: error.stack } });
    return {
      name: error.name,
      message: error.message,
      details: error.stack
    };
  }

  // Unknown error type
  const unknownError = String(error);
  logger.error(`${context}: Unknown error - ${unknownError}`, undefined, { component: context });
  return {
    name: 'UnknownError',
    message: fallbackMessage,
    details: unknownError
  };
};

/**
 * Async wrapper that handles errors consistently
 */
export const withErrorHandling = async <T>(
  operation: () => Promise<T>,
  context: string,
  fallbackMessage?: string
): Promise<{ data: T | null; error: SupabaseError | null }> => {
  try {
    const data = await operation();
    return { data, error: null };
  } catch (error) {
    const handledError = handleError(error, context, fallbackMessage);
    return { data: null, error: handledError };
  }
};

/**
 * Creates a consistent error response for API operations
 */
export const createErrorResponse = (
  message: string,
  code?: string,
  details?: string
): { error: SupabaseError } => ({
  error: {
    message,
    code,
    details,
    name: 'OperationError'
  }
});

/**
 * Extracts user-friendly error message from various error types
 */
export const getErrorMessage = (error: unknown): string => {
  if (isSupabaseError(error)) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
};

/**
 * Checks if an error is retryable (network errors, timeouts, etc.)
 */
export const isRetryableError = (error: unknown): boolean => {
  if (isNetworkError(error)) {
    return true;
  }

  if (isSupabaseError(error)) {
    // Retry on specific error codes
    const retryableCodes = ['503', '502', '504', 'TIMEOUT', 'NETWORK_ERROR'];
    return retryableCodes.some(code => error.code?.includes(code));
  }

  return false;
};

/**
 * Enhanced retry mechanism with exponential backoff
 */
export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 1000,
  context = 'operation'
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error;
      }

      const delay = initialDelay * Math.pow(2, attempt);
      logger.warn(`${context} failed, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`, {
        component: context,
        metadata: { attempt, delay, error: getErrorMessage(error) }
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
};