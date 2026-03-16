// Rate limiter utility for Edge Functions
// Provides in-memory rate limiting with configurable windows and limits

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory store for rate limiting (resets on function restart)
const store = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetTime < now) {
      store.delete(key);
    }
  }
}, 60000); // Cleanup every minute

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if request should be rate limited
   * @param req Request object
   * @returns { allowed: boolean, remaining: number, resetTime: number }
   */
  check(req: Request): { allowed: boolean; remaining: number; resetTime: number } {
    const key = this.config.keyGenerator ? this.config.keyGenerator(req) : this.getDefaultKey(req);
    const now = Date.now();
    const resetTime = now + this.config.windowMs;

    let entry = store.get(key);
    
    // If no entry exists or window has expired, create new entry
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 1,
        resetTime: resetTime
      };
      store.set(key, entry);
      
      return {
        allowed: true,
        remaining: this.config.maxRequests - 1,
        resetTime: entry.resetTime
      };
    }

    // Increment counter
    entry.count++;
    store.set(key, entry);

    const allowed = entry.count <= this.config.maxRequests;
    const remaining = Math.max(0, this.config.maxRequests - entry.count);

    return {
      allowed,
      remaining,
      resetTime: entry.resetTime
    };
  }

  /**
   * Default key generator using IP address and User-Agent
   */
  private getDefaultKey(req: Request): string {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';
    return `${ip}:${userAgent}`;
  }

  /**
   * Create response for rate limited requests
   */
  static createRateLimitResponse(resetTime: number, corsHeaders?: Record<string, string>): Response {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
    
    return new Response(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter: retryAfter
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Reset': new Date(resetTime).toISOString(),
          ...(corsHeaders || {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
          })
        }
      }
    );
  }
}

// Pre-configured rate limiters for common use cases
export const adminActionLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 10, // Max 10 admin actions per minute per user
  keyGenerator: (req) => {
    const auth = req.headers.get('authorization') || 'anonymous';
    return `admin:${auth}`;
  }
});

export const passwordResetLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minute window
  maxRequests: 3, // Max 3 password resets per 15 minutes per user
  keyGenerator: (req) => {
    const auth = req.headers.get('authorization') || 'anonymous';
    return `password-reset:${auth}`;
  }
});

export const errorCollectionLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 50, // Max 50 errors per minute per client
});

export const analyticsQueryLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 20, // Max 20 analytics queries per minute per user
  keyGenerator: (req) => {
    const auth = req.headers.get('authorization') || 'anonymous';
    return `analytics:${auth}`;
  }
});

// LLM/AI operation limiter (expensive operations) - for authenticated users
export const llmLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 10, // Max 10 LLM calls per minute per authenticated user
  keyGenerator: (req) => {
    const auth = req.headers.get('authorization') || 'anonymous';
    return `llm:${auth}`;
  }
});

// LLM/AI limiter for anonymous users (more restrictive)
export const llmAnonymousLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 2, // Max 2 LLM calls per minute per anonymous client
  keyGenerator: (req) => {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
    return `llm-anon:${ip}`;
  }
});

// Text-to-speech limiter - for authenticated users
export const ttsLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 15, // Max 15 TTS requests per minute per authenticated user
  keyGenerator: (req) => {
    const auth = req.headers.get('authorization') || 'anonymous';
    return `tts:${auth}`;
  }
});

// Text-to-speech limiter for anonymous users (more restrictive)
export const ttsAnonymousLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 3, // Max 3 TTS requests per minute per anonymous client
  keyGenerator: (req) => {
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : req.headers.get('x-real-ip') || 'unknown';
    return `tts-anon:${ip}`;
  }
});

// General API limiter (for misc endpoints)
export const generalApiLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 30, // Max 30 requests per minute per client
});

// Cleanup test data limiter (destructive operations)
export const cleanupLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 5, // Max 5 cleanup operations per minute
  keyGenerator: (req) => {
    const auth = req.headers.get('authorization') || 'anonymous';
    return `cleanup:${auth}`;
  }
});