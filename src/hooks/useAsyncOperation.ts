import { useState, useCallback, useRef } from 'react';
import { logger } from '@/utils/logger';
import { isRetryableError, getErrorMessage } from '@/utils/errorHandling';
import { useToast } from '@/hooks/use-toast';

interface UseAsyncOperationOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  maxRetries?: number;
  retryDelay?: number;
  showErrorToast?: boolean;
  context?: string;
}

interface AsyncOperationState<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
  isRetrying: boolean;
  retryCount: number;
}

/**
 * Hook for handling async operations with automatic retry logic
 * 
 * @example
 * const { execute, isLoading, error } = useAsyncOperation(
 *   async (id: string) => fetchItem(id),
 *   { maxRetries: 3, context: 'FetchItem' }
 * );
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
