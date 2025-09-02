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
  | { success: false; error: StoreError };