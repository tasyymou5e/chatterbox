import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLoginRateLimiter } from '@/hooks/useLoginRateLimiter';

describe('useLoginRateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial state', () => {
    it('should return correct initial state for user type', () => {
      const { result } = renderHook(() => useLoginRateLimiter('user'));
      
      expect(result.current.remainingAttempts).toBe(5);
      expect(result.current.isLocked).toBe(false);
      expect(result.current.timeUntilReset).toBe(0);
      expect(result.current.formattedTimeRemaining).toBe('');
    });

    it('should return correct initial state for admin type', () => {
      const { result } = renderHook(() => useLoginRateLimiter('admin'));
      
      expect(result.current.remainingAttempts).toBe(3);
      expect(result.current.isLocked).toBe(false);
      expect(result.current.timeUntilReset).toBe(0);
    });

    it('should default to user type when not specified', () => {
      const { result } = renderHook(() => useLoginRateLimiter());
      
      expect(result.current.remainingAttempts).toBe(5);
    });
  });

  describe('checkAttempt', () => {
    it('should return true for allowed attempts', () => {
      const { result } = renderHook(() => useLoginRateLimiter('user'));
      
      let allowed: boolean;
      act(() => {
        allowed = result.current.checkAttempt('test@example.com');
      });
      
      expect(allowed!).toBe(true);
    });

    it('should decrement remaining attempts after check', () => {
      const { result } = renderHook(() => useLoginRateLimiter('user'));
      
      act(() => {
        result.current.checkAttempt('test@example.com');
      });
      
      expect(result.current.remainingAttempts).toBe(4);
    });

    it('should return false when limit exceeded', () => {
      const { result } = renderHook(() => useLoginRateLimiter('user'));
      const identifier = 'test@example.com';
      
      // Use all 5 attempts
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.checkAttempt(identifier);
        });
      }
      
      let allowed: boolean;
      act(() => {
        allowed = result.current.checkAttempt(identifier);
      });
      
      expect(allowed!).toBe(false);
    });

    it('should handle empty identifier gracefully', () => {
      const { result } = renderHook(() => useLoginRateLimiter('user'));
      
      let allowed: boolean;
      act(() => {
        allowed = result.current.checkAttempt('');
      });
      
      expect(allowed!).toBe(true);
    });
  });

  describe('isLocked', () => {
    it('should become true when attempts exhausted', () => {
      const { result } = renderHook(() => useLoginRateLimiter('user'));
      const identifier = 'test@example.com';
      
      expect(result.current.isLocked).toBe(false);
      
      // Use all attempts
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.checkAttempt(identifier);
        });
      }
      
      expect(result.current.isLocked).toBe(true);
    });

    it('should have stricter limits for admin type', () => {
      const { result } = renderHook(() => useLoginRateLimiter('admin'));
      const identifier = 'admin@example.com';
      
      // Use all 3 admin attempts
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.checkAttempt(identifier);
        });
      }
      
      expect(result.current.isLocked).toBe(true);
      expect(result.current.remainingAttempts).toBe(0);
    });
  });

  describe('formattedTimeRemaining', () => {
    it('should return empty string when not locked', () => {
      const { result } = renderHook(() => useLoginRateLimiter('user'));
      
      expect(result.current.formattedTimeRemaining).toBe('');
    });

    it('should format minutes and seconds correctly', () => {
      const { result } = renderHook(() => useLoginRateLimiter('user'));
      const identifier = 'test@example.com';
      
      // Exhaust attempts
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.checkAttempt(identifier);
        });
      }
      
      // Should show time in format like "4:59" or "X seconds"
      expect(result.current.formattedTimeRemaining).toBeTruthy();
      expect(result.current.formattedTimeRemaining.length).toBeGreaterThan(0);
    });
  });

  describe('refreshStatus', () => {
    it('should update state from rate limiter', () => {
      const { result } = renderHook(() => useLoginRateLimiter('user'));
      const identifier = 'test@example.com';
      
      // Make some attempts directly through checkAttempt
      act(() => {
        result.current.checkAttempt(identifier);
        result.current.checkAttempt(identifier);
      });
      
      // Refresh status
      act(() => {
        result.current.refreshStatus(identifier);
      });
      
      expect(result.current.remainingAttempts).toBe(3);
    });

    it('should handle empty identifier', () => {
      const { result } = renderHook(() => useLoginRateLimiter('user'));
      
      act(() => {
        result.current.refreshStatus('');
      });
      
      // Should not throw, state should remain unchanged
      expect(result.current.remainingAttempts).toBe(5);
    });
  });

  describe('timer cleanup', () => {
    it('should cleanup timer on unmount', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');
      
      const { result, unmount } = renderHook(() => useLoginRateLimiter('user'));
      const identifier = 'test@example.com';
      
      // Trigger lockout to start timer
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.checkAttempt(identifier);
        });
      }
      
      unmount();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });
});

