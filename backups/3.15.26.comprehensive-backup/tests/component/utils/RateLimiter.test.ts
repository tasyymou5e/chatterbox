import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RateLimiter } from '@/utils/enhancedInputValidation';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    vi.useFakeTimers();
    // Default: 5 attempts per 60 seconds
    rateLimiter = new RateLimiter(5, 60000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('isAllowed', () => {
    it('should allow attempts within the limit', () => {
      const identifier = 'test@example.com';
      
      expect(rateLimiter.isAllowed(identifier)).toBe(true);
      expect(rateLimiter.isAllowed(identifier)).toBe(true);
      expect(rateLimiter.isAllowed(identifier)).toBe(true);
      expect(rateLimiter.isAllowed(identifier)).toBe(true);
      expect(rateLimiter.isAllowed(identifier)).toBe(true);
    });

    it('should block attempts when limit is exceeded', () => {
      const identifier = 'test@example.com';
      
      // Use all 5 attempts
      for (let i = 0; i < 5; i++) {
        rateLimiter.isAllowed(identifier);
      }
      
      // 6th attempt should be blocked
      expect(rateLimiter.isAllowed(identifier)).toBe(false);
    });

    it('should track different identifiers separately', () => {
      const user1 = 'user1@example.com';
      const user2 = 'user2@example.com';
      
      // Exhaust user1's attempts
      for (let i = 0; i < 5; i++) {
        rateLimiter.isAllowed(user1);
      }
      
      // user2 should still have all attempts available
      expect(rateLimiter.isAllowed(user2)).toBe(true);
      expect(rateLimiter.getRemainingAttempts(user2)).toBe(4);
    });

    it('should reset attempts after time window expires', () => {
      const identifier = 'test@example.com';
      
      // Use all attempts
      for (let i = 0; i < 5; i++) {
        rateLimiter.isAllowed(identifier);
      }
      expect(rateLimiter.isAllowed(identifier)).toBe(false);
      
      // Advance time past the window
      vi.advanceTimersByTime(61000);
      
      // Should be allowed again
      expect(rateLimiter.isAllowed(identifier)).toBe(true);
    });
  });

  describe('getRemainingAttempts', () => {
    it('should return max attempts for new identifier', () => {
      expect(rateLimiter.getRemainingAttempts('new@example.com')).toBe(5);
    });

    it('should decrement correctly after each attempt', () => {
      const identifier = 'test@example.com';
      
      rateLimiter.isAllowed(identifier);
      expect(rateLimiter.getRemainingAttempts(identifier)).toBe(4);
      
      rateLimiter.isAllowed(identifier);
      expect(rateLimiter.getRemainingAttempts(identifier)).toBe(3);
    });

    it('should return 0 when all attempts are used', () => {
      const identifier = 'test@example.com';
      
      for (let i = 0; i < 5; i++) {
        rateLimiter.isAllowed(identifier);
      }
      
      expect(rateLimiter.getRemainingAttempts(identifier)).toBe(0);
    });

    it('should reset after time window expires', () => {
      const identifier = 'test@example.com';
      
      for (let i = 0; i < 5; i++) {
        rateLimiter.isAllowed(identifier);
      }
      
      vi.advanceTimersByTime(61000);
      
      expect(rateLimiter.getRemainingAttempts(identifier)).toBe(5);
    });
  });

  describe('getTimeUntilReset', () => {
    it('should return 0 for new identifier', () => {
      expect(rateLimiter.getTimeUntilReset('new@example.com')).toBe(0);
    });

    it('should return 0 when attempts remain', () => {
      const identifier = 'test@example.com';
      rateLimiter.isAllowed(identifier);
      
      expect(rateLimiter.getTimeUntilReset(identifier)).toBe(0);
    });

    it('should return time remaining when locked out', () => {
      const identifier = 'test@example.com';
      
      for (let i = 0; i < 5; i++) {
        rateLimiter.isAllowed(identifier);
      }
      
      const timeRemaining = rateLimiter.getTimeUntilReset(identifier);
      expect(timeRemaining).toBeGreaterThan(0);
      expect(timeRemaining).toBeLessThanOrEqual(60000);
    });

    it('should decrease as time passes', () => {
      const identifier = 'test@example.com';
      
      for (let i = 0; i < 5; i++) {
        rateLimiter.isAllowed(identifier);
      }
      
      const initialTime = rateLimiter.getTimeUntilReset(identifier);
      
      vi.advanceTimersByTime(10000);
      
      const laterTime = rateLimiter.getTimeUntilReset(identifier);
      expect(laterTime).toBeLessThan(initialTime);
    });
  });

  describe('custom configuration', () => {
    it('should respect custom max attempts', () => {
      const strictLimiter = new RateLimiter(2, 60000);
      const identifier = 'test@example.com';
      
      expect(strictLimiter.isAllowed(identifier)).toBe(true);
      expect(strictLimiter.isAllowed(identifier)).toBe(true);
      expect(strictLimiter.isAllowed(identifier)).toBe(false);
    });

    it('should respect custom time window', () => {
      const shortWindowLimiter = new RateLimiter(3, 5000);
      const identifier = 'test@example.com';
      
      for (let i = 0; i < 3; i++) {
        shortWindowLimiter.isAllowed(identifier);
      }
      expect(shortWindowLimiter.isAllowed(identifier)).toBe(false);
      
      // Advance past 5 second window
      vi.advanceTimersByTime(6000);
      
      expect(shortWindowLimiter.isAllowed(identifier)).toBe(true);
    });
  });
});
