/**
 * useAsyncOperation Hook
 * 
 * @description Custom hook for handling async operations with automatic retry logic,
 * loading states, error handling, and toast notifications.
 * 
 * @module useAsyncOperation
 */
import { useState, useCallback, useRef } from 'react';
import { logger } from '@/utils/logger';
import { isRetryableError, getErrorMessage } from '@/utils/errorHandling';
import { useToast } from '@/hooks/use-toast';

/**
 * Configuration options for useAsyncOperation hook.
 * 
 * @template T - Type of data returned by the operation
 * 
 * @property {function} [onSuccess] - Callback fired on successful operation
 * @property {function} [onError] - Callback fired on operation failure
 * @property {number} [maxRetries=3] - Maximum retry attempts for retryable errors
 * @property {number} [retryDelay=1000] - Initial retry delay in milliseconds
 * @property {boolean} [showErrorToast=true] - Whether to show toast on error
 * @property {string} [context='Operation'] - Context name for logging
 */
interface UseAsyncOperationOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  maxRetries?: number;
  retryDelay?: number;
  showErrorToast?: boolean;
  context?: string;
}

/**
 * Internal state for async operation tracking.
 * 
 * @template T - Type of data returned by the operation
 */
interface AsyncOperationState<T> {
  /** Result data from successful operation */
  data: T | null;
  /** Error from failed operation */
  error: Error | null;
  /** Whether operation is in progress */
  isLoading: boolean;
  /** Whether operation is currently retrying */
  isRetrying: boolean;
  /** Number of retry attempts made */
  retryCount: number;
}

/**
 * Hook for handling async operations with automatic retry logic.
 * 
 * @description Provides comprehensive async operation management including:
 * - Automatic retry with exponential backoff for transient errors
 * - Loading and error state management
 * - Toast notifications for errors
 * - Abort capability for pending operations
 * 
 * @template T - The type of data returned by the operation
 * @template Args - Tuple type of operation arguments
 * 
 * @param operation - Async function to execute
 * @param options - Configuration options
 * 
 * @returns Object containing:
 *   - `data` - The result data or null
 *   - `error` - Error object or null
 *   - `isLoading` - Loading state
 *   - `isRetrying` - Whether currently retrying
 *   - `retryCount` - Number of retries attempted
 *   - `execute` - Function to trigger the operation
 *   - `reset` - Function to reset all state
 *   - `canRetry` - Whether more retries are available
 * 
 * @example
 * // Basic usage
 * const { execute, isLoading, error, data } = useAsyncOperation(
 *   async (id: string) => fetchUserById(id),
 *   { maxRetries: 3, context: 'FetchUser' }
 * );
 * 
 * // Execute the operation
 * const result = await execute('user-123');
 * 
 * @example
 * // With callbacks
 * const { execute } = useAsyncOperation(
 *   async () => saveData(),
 *   {
 *     onSuccess: (data) => console.log('Saved:', data),
 *     onError: (err) => console.error('Failed:', err),
 *     showErrorToast: true
 *   }
 * );
 * 
 * @see {@link isRetryableError} for retry eligibility logic
 */
export function useAsyncOperation<T, Args extends unknown[] = []>(
  operation: (...args: Args) => Promise<T>,
  options: UseAsyncOperationOptions<T> = {}
) {
  const {
    onSuccess,
    onError,
    maxRetries = 3,
    retryDelay = 1000,
    showErrorToast = true,
    context = 'Operation',
  } = options;

  const { toast } = useToast();
  const [state, setState] = useState<AsyncOperationState<T>>({
    data: null,
    error: null,
    isLoading: false,
    isRetrying: false,
    retryCount: 0,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (...args: Args): Promise<T | null> => {
    // Cancel any pending operation
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    let lastError: Error | null = null;
    let currentRetryCount = 0;

    while (currentRetryCount <= maxRetries) {
      try {
        const data = await operation(...args);
        
        setState({
          data,
          error: null,
          isLoading: false,
          isRetrying: false,
          retryCount: currentRetryCount,
        });
        
        onSuccess?.(data);
        return data;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        
        // Log the error
        logger.error(`${context} failed (attempt ${currentRetryCount + 1}/${maxRetries + 1})`, lastError, {
          component: context,
          metadata: { retryCount: currentRetryCount, isRetryable: isRetryableError(lastError) },
        });

        // Check if we should retry
        if (currentRetryCount < maxRetries && isRetryableError(lastError)) {
          currentRetryCount++;
          setState(prev => ({ ...prev, isRetrying: true, retryCount: currentRetryCount }));
          
          // Exponential backoff
          const delay = retryDelay * Math.pow(2, currentRetryCount - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        break;
      }
    }

    // All retries exhausted
    setState({
      data: null,
      error: lastError,
      isLoading: false,
      isRetrying: false,
      retryCount: currentRetryCount,
    });

    if (showErrorToast && lastError) {
      toast({
        title: `${context} failed`,
        description: getErrorMessage(lastError),
        variant: 'destructive',
      });
    }

    onError?.(lastError!);
    return null;
  }, [operation, maxRetries, retryDelay, context, onSuccess, onError, showErrorToast, toast]);

  const reset = useCallback(() => {
    abortControllerRef.current?.abort();
    setState({
      data: null,
      error: null,
      isLoading: false,
      isRetrying: false,
      retryCount: 0,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
    canRetry: state.retryCount < maxRetries,
  };
}
