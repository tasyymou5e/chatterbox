/**
 * Retry utility with exponential backoff for edge function calls
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  onRetry?: (attempt: number, error: unknown, nextDelayMs: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Execute an async operation with exponential backoff retry
 * @param operation - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the operation
 * @throws The last error if all retries fail
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;
  let currentDelay = config.initialDelayMs;

  for (let attempt = 1; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (attempt === config.maxRetries) {
        break;
      }

      // Calculate next delay with exponential backoff
      const nextDelay = Math.min(currentDelay, config.maxDelayMs);
      
      // Call onRetry callback if provided
      if (options.onRetry) {
        options.onRetry(attempt, error, nextDelay);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, nextDelay));
      
      // Increase delay for next attempt
      currentDelay *= config.backoffMultiplier;
    }
  }

  throw lastError;
}

/**
 * Wrapper for Supabase edge function calls with retry logic
 */
export async function invokeWithRetry<T = unknown>(
  invokeFunction: () => Promise<{ data: T | null; error: Error | null }>,
  options: RetryOptions = {}
): Promise<T> {
  return retryWithBackoff<T>(async () => {
    const { data, error } = await invokeFunction();
    if (error) throw error;
    if (data === null) throw new Error('No data returned from edge function');
    return data as T;
  }, options);
}
