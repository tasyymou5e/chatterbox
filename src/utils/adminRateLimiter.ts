/**
 * Admin Rate Limiting Utility
 * Prevents abuse of admin operations with configurable limits
 */

import React from 'react';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (identifier: string) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
  lastAttempt: number;
}

interface RateLimitStatus {
  count: number;
  limit: number;
  remaining: number;
  resetTime: number;
  resetTimeFormatted: string;
}

interface RateLimitState {
  userCreation: RateLimitEntry;
  passwordReset: RateLimitEntry;
  userDeletion: RateLimitEntry;
  bulkOperation: RateLimitEntry;
}

class AdminRateLimiter {
  private static instance: AdminRateLimiter;
  private storage = new Map<string, RateLimitEntry>();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  static getInstance(): AdminRateLimiter {
    if (!AdminRateLimiter.instance) {
      AdminRateLimiter.instance = new AdminRateLimiter();
    }
    return AdminRateLimiter.instance;
  }

  constructor() {
    // Setup periodic cleanup of expired entries
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  /**
   * Rate limit configurations for different admin operations
   */
  private readonly configs: Record<keyof RateLimitState, RateLimitConfig> = {
    userCreation: { 
      windowMs: 60000,      // 1 minute
      maxRequests: 3,          // Max 3 user creations per minute
      keyGenerator: (id) => `user_creation:${id}`
    },
    passwordReset: { 
      windowMs: 900000,     // 15 minutes
      maxRequests: 5,          // Max 5 password resets per 15 minutes
      keyGenerator: (id) => `password_reset:${id}`
    },
    userDeletion: { 
      windowMs: 3600000,    // 1 hour
      maxRequests: 10,         // Max 10 user deletions per hour
      keyGenerator: (id) => `user_deletion:${id}`
    },
    bulkOperation: { 
      windowMs: 1800000,    // 30 minutes
      maxRequests: 2,          // Max 2 bulk operations per 30 minutes
      keyGenerator: (id) => `bulk_operation:${id}`
    }
  };

  /**
   * Check if an action is rate limited
   */
  checkRateLimit(operation: keyof RateLimitState, identifier: string): {
    allowed: boolean;
    remaining: number;
    resetTime: number;
    retryAfter?: number;
  } {
    const config = this.configs[operation];
    const key = config.keyGenerator?.(identifier) || `${operation}:${identifier}`;
    const now = Date.now();

    let entry = this.storage.get(key);
    
    // Create new entry if none exists or window expired
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + config.windowMs,
        lastAttempt: now
      };
      this.storage.set(key, entry);
    }

    // Check if rate limit exceeded
    const allowed = entry.count < config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - entry.count - 1);
    
    if (allowed) {
      entry.count++;
      entry.lastAttempt = now;
      this.storage.set(key, entry);
    }

    const retryAfter = allowed ? undefined : Math.ceil((entry.resetTime - now) / 1000);

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime,
      retryAfter
    };
  }

  /**
   * Get current rate limit status without consuming a request
   */
  getStatus(operation: keyof RateLimitState, identifier: string): RateLimitStatus {
    const config = this.configs[operation];
    const key = config.keyGenerator?.(identifier) || `${operation}:${identifier}`;
    const entry = this.storage.get(key);
    const now = Date.now();

    if (!entry || now > entry.resetTime) {
      return {
        count: 0,
        limit: config.maxRequests,
        remaining: config.maxRequests,
        resetTime: now + config.windowMs,
        resetTimeFormatted: new Date(now + config.windowMs).toLocaleString()
      };
    }

    return {
      count: entry.count,
      limit: config.maxRequests,
      remaining: Math.max(0, config.maxRequests - entry.count),
      resetTime: entry.resetTime,
      resetTimeFormatted: new Date(entry.resetTime).toLocaleString()
    };
  }

  /**
   * Get all rate limit states for monitoring
   */
  getAllStatus(identifier: string): Record<keyof RateLimitState, RateLimitStatus> {
    const operations = Object.keys(this.configs) as (keyof RateLimitState)[];
    const status = {} as Record<keyof RateLimitState, RateLimitStatus>;

    for (const operation of operations) {
      status[operation] = this.getStatus(operation, identifier);
    }

    return status;
  }

  /**
   * Reset specific rate limit entry
   */
  reset(operation: keyof RateLimitState, identifier: string): void {
    const config = this.configs[operation];
    const key = config.keyGenerator?.(identifier) || `${operation}:${identifier}`;
    this.storage.delete(key);
  }

  /**
   * Reset all rate limits for identifier
   */
  resetAll(identifier: string): void {
    for (const operation of Object.keys(this.configs) as (keyof RateLimitState)[]) {
      this.reset(operation, identifier);
    }
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.storage.entries()) {
      if (now > entry.resetTime) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.storage.delete(key);
    }
  }

  /**
   * Get rate limit statistics for monitoring
   */
  getStatistics(): {
    totalEntries: number;
    activeEntries: number;
    operationsWithUsage: Record<string, number>;
  } {
    const now = Date.now();
    const totalEntries = this.storage.size;
    let activeEntries = 0;
    const operationsWithUsage: Record<string, number> = {};

    for (const [key, entry] of this.storage.entries()) {
      if (now <= entry.resetTime) {
        activeEntries++;
        
        const operation = key.split(':')[0];
        operationsWithUsage[operation] = (operationsWithUsage[operation] || 0) + entry.count;
      }
    }

    return {
      totalEntries,
      activeEntries,
      operationsWithUsage
    };
  }

  /**
   * Destroy rate limiter and cleanup interval
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.storage.clear();
  }
}

// Export singleton instance
export const adminRateLimiter = AdminRateLimiter.getInstance();

// Hook for React components
export const useAdminRateLimiter = (userId: string) => {
  const [status, setStatus] = React.useState(() => 
    adminRateLimiter.getAllStatus(userId)
  );

  const checkLimit = React.useCallback((operation: keyof RateLimitState) => {
    const result = adminRateLimiter.checkRateLimit(operation, userId);
    setStatus(prev => ({
      ...prev,
      [operation]: adminRateLimiter.getStatus(operation, userId)
    }));
    return result;
  }, [userId]);

  const resetLimit = React.useCallback((operation: keyof RateLimitState) => {
    adminRateLimiter.reset(operation, userId);
    setStatus(prev => ({
      ...prev,
      [operation]: adminRateLimiter.getStatus(operation, userId)
    }));
  }, [userId]);

  const resetAll = React.useCallback(() => {
    adminRateLimiter.resetAll(userId);
    setStatus(adminRateLimiter.getAllStatus(userId));
  }, [userId]);

  return {
    status,
    checkLimit,
    resetLimit,
    resetAll,
    statistics: adminRateLimiter.getStatistics()
  };
};

export type { RateLimitEntry, RateLimitStatus, RateLimitState };

export default adminRateLimiter;
