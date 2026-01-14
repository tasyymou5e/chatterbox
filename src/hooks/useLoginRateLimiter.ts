import { useState, useCallback, useEffect, useRef } from 'react';
import { RateLimiter } from '@/utils/enhancedInputValidation';

// Standard login: 5 attempts per 5 minutes
const userLoginRateLimiter = new RateLimiter(5, 5 * 60 * 1000);

// Admin login: 3 attempts per 10 minutes (stricter)
const adminLoginRateLimiter = new RateLimiter(3, 10 * 60 * 1000);

export interface UseLoginRateLimiterReturn {
  checkAttempt: (identifier: string) => boolean;
  remainingAttempts: number;
  timeUntilReset: number;
  isLocked: boolean;
  formattedTimeRemaining: string;
  refreshStatus: (identifier: string) => void;
}

/**
 * Hook for rate limiting login attempts to prevent brute force attacks.
 * @param type - 'user' for standard login (5 attempts/5 min) or 'admin' for admin login (3 attempts/10 min)
 */
export function useLoginRateLimiter(type: 'user' | 'admin' = 'user'): UseLoginRateLimiterReturn {
  const rateLimiter = type === 'admin' ? adminLoginRateLimiter : userLoginRateLimiter;
  const [remainingAttempts, setRemainingAttempts] = useState(type === 'admin' ? 3 : 5);
  const [timeUntilReset, setTimeUntilReset] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const refreshStatus = useCallback((identifier: string) => {
    if (!identifier) return;
    
    setRemainingAttempts(rateLimiter.getRemainingAttempts(identifier));
    const resetTime = rateLimiter.getTimeUntilReset(identifier);
    setTimeUntilReset(resetTime);

    // Clear existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // If locked, start countdown timer
    if (resetTime > 0) {
      timerRef.current = setInterval(() => {
        const newResetTime = rateLimiter.getTimeUntilReset(identifier);
        setTimeUntilReset(newResetTime);
        
        if (newResetTime <= 0) {
          setRemainingAttempts(type === 'admin' ? 3 : 5);
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      }, 1000);
    }
  }, [rateLimiter, type]);

  const checkAttempt = useCallback((identifier: string): boolean => {
    if (!identifier) return true;
    
    const allowed = rateLimiter.isAllowed(identifier);
    refreshStatus(identifier);
    return allowed;
  }, [rateLimiter, refreshStatus]);

  const isLocked = remainingAttempts === 0 && timeUntilReset > 0;
  
  const formattedTimeRemaining = (() => {
    if (timeUntilReset <= 0) return '';
    const minutes = Math.floor(timeUntilReset / 60000);
    const seconds = Math.floor((timeUntilReset % 60000) / 1000);
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${seconds} seconds`;
  })();

  return {
    checkAttempt,
    remainingAttempts,
    timeUntilReset,
    isLocked,
    formattedTimeRemaining,
    refreshStatus
  };
}
