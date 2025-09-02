import { useAuthStore } from '@/stores/authStore';
import { z } from 'zod';

// Input validation schemas
export const choreInputSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long'),
  description: z.string().max(500, 'Description too long').nullable(),
  estimated_duration: z.number().min(1).max(480), // 8 hours max
  difficulty: z.enum(['easy', 'medium', 'hard']),
  base_points: z.number().min(1).max(1000),
});

export const wishlistInputSchema = z.object({
  item_name: z.string().min(1, 'Item name is required').max(100, 'Item name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  point_cost: z.number().min(1).max(10000),
  reward_type: z.enum(['points', 'custom', 'privilege', 'activity']).optional(),
});

// Secure user access utility
export const getCurrentUser = () => {
  const state = useAuthStore.getState();
  return state.user;
};

// Secure user ID access utility
export const getCurrentUserId = (): string | null => {
  const user = getCurrentUser();
  return user?.id || null;
};

// Validate required authentication
export const requireAuth = (): string => {
  const userId = getCurrentUserId();
  if (!userId) {
    throw new Error('Authentication required');
  }
  return userId;
};

// Input sanitization utility
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
};

// Error reporting utility (decoupled from UI)
export interface StoreError {
  type: 'validation' | 'auth' | 'network' | 'permission';
  message: string;
  code?: string;
  context?: Record<string, any>;
}

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

// Success result utility
export interface StoreSuccess<T = any> {
  data: T;
  message?: string;
}

export const createStoreSuccess = <T>(data: T, message?: string): StoreSuccess<T> => ({
  data,
  message,
});

// Result type for store operations
export type StoreResult<T = any> = 
  | { success: true; result: StoreSuccess<T> }
  | { success: false; error: StoreError; retryCount?: number; canRetry?: boolean };

// Retry configuration interface
export interface RetryConfig {
  maxRetries?: number;
  minRetryInterval?: number;
  maxBackoffDelay?: number;
  retryableErrorTypes?: StoreError['type'][];
  retryableErrorMessages?: string[];
}

// Default retry configuration
export const defaultRetryConfig: RetryConfig = {
  maxRetries: 3,
  minRetryInterval: 2000, // 2 seconds
  maxBackoffDelay: 30000, // 30 seconds
  retryableErrorTypes: ['network', 'auth'],
  retryableErrorMessages: ['Session not ready', 'permission denied', 'Network error', 'timeout']
};

// Retry state interface
export interface RetryState {
  retryCount: number;
  lastRetryTime: number;
  isRetrying: boolean;
}

// Enhanced store operation wrapper with retry logic
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