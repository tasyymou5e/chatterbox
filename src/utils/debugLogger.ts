/**
 * Environment-aware debug logging utility
 * Only outputs logs in development mode to prevent information disclosure in production
 */

const isDevelopment = import.meta.env.DEV;

type LogData = unknown;

interface DebugLogger {
  info: (component: string, message: string, data?: LogData) => void;
  warn: (component: string, message: string, data?: LogData) => void;
  error: (component: string, message: string, error?: LogData) => void;
  debug: (component: string, message: string, data?: LogData) => void;
  trace: (component: string, message: string, data?: LogData) => void;
}

/**
 * Debug logger that respects environment settings
 * - In development: Full logging with component prefixes and data
 * - In production: Only critical errors (without stack traces)
 */
export const debugLog: DebugLogger = {
  info: (component: string, message: string, data?: LogData) => {
    if (isDevelopment) {
      console.log(`[${component}]`, message, data ?? '');
    }
  },

  warn: (component: string, message: string, data?: LogData) => {
    if (isDevelopment) {
      console.warn(`[${component}]`, message, data ?? '');
    }
  },

  error: (component: string, message: string, error?: LogData) => {
    // Errors always log, but with sanitization in production
    if (isDevelopment) {
      console.error(`[${component}]`, message, error ?? '');
    } else {
      // In production, log minimal error info without stack traces
      console.error(`[${component}]`, message);
    }
  },

  debug: (component: string, message: string, data?: LogData) => {
    if (isDevelopment) {
      console.debug(`[${component}]`, message, data ?? '');
    }
  },

  trace: (component: string, message: string, data?: LogData) => {
    if (isDevelopment) {
      console.trace(`[${component}]`, message, data ?? '');
    }
  },
};

/**
 * Rate-limited error logger to prevent log flooding
 */
class RateLimitedErrorLogger {
  private errorCount = 0;
  private lastLogTime = 0;
  private readonly maxErrorsPerMinute: number;

  constructor(maxErrorsPerMinute = 10) {
    this.maxErrorsPerMinute = maxErrorsPerMinute;
  }

  log(component: string, message: string, error?: LogData): boolean {
    const now = Date.now();
    
    // Reset counter if a minute has passed
    if (now - this.lastLogTime > 60000) {
      this.errorCount = 0;
      this.lastLogTime = now;
    }

    // Check if we've exceeded the rate limit
    if (this.errorCount >= this.maxErrorsPerMinute) {
      return false; // Indicate that logging was skipped
    }

    this.errorCount++;
    debugLog.error(component, message, error);
    return true;
  }

  getRemainingCapacity(): number {
    const now = Date.now();
    if (now - this.lastLogTime > 60000) {
      return this.maxErrorsPerMinute;
    }
    return Math.max(0, this.maxErrorsPerMinute - this.errorCount);
  }
}

export const rateLimitedLogger = new RateLimitedErrorLogger();

export default debugLog;
