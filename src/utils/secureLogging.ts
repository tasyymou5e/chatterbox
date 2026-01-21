/**
 * Secure logging utility that prevents sensitive data leakage
 */

interface LogLevel {
  DEVELOPMENT: 'dev';
  PRODUCTION: 'prod';
  SECURITY: 'security';
}

// Exported for potential future use
export const LOG_LEVELS: LogLevel = {
  DEVELOPMENT: 'dev',
  PRODUCTION: 'prod', 
  SECURITY: 'security'
};

// Sensitive data patterns to redact
const SENSITIVE_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /key/i,
  /auth/i,
  /email/i,
  /user_id/i,
  /session/i,
  /cookie/i
];

// Fields that should always be redacted
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'accessToken', 
  'refreshToken',
  'secret',
  'apiKey',
  'sessionId',
  'userId',
  'email',
  'phone',
  'ssn',
  'creditCard'
];

/**
 * Sanitizes objects by removing or redacting sensitive fields
 */
function sanitizeObject(obj: unknown, depth = 0): unknown {
  if (depth > 10) return '[MAX_DEPTH_REACHED]'; // Prevent infinite recursion
  
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    // Check if string contains sensitive patterns
    if (SENSITIVE_PATTERNS.some(pattern => pattern.test(obj))) {
      return '[REDACTED]';
    }
    return obj;
  }
  
  if (typeof obj !== 'object') return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  }
  
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Check if key is sensitive
    if (SENSITIVE_FIELDS.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }
    
    // Check if key matches sensitive patterns
    if (SENSITIVE_PATTERNS.some(pattern => pattern.test(key))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }
    
    sanitized[key] = sanitizeObject(value, depth + 1);
  }
  
  return sanitized;
}

/**
 * Production-safe console logging
 */
export const secureLog = {
  /**
   * Development-only logging
   */
  dev: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] ${message}`, data ? sanitizeObject(data) : '');
    }
  },

  /**
   * Production error logging - minimal sensitive data
   */
  error: (message: string, error?: Error | unknown, context?: string) => {
    const sanitizedError = error instanceof Error ? {
      name: error.name,
      message: error.message,
      // Don't include stack trace in production
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
    } : error ? { message: String(error) } : null;
    
    console.error(`[ERROR]${context ? ` [${context}]` : ''} ${message}`, sanitizedError);
  },

  /**
   * Security event logging - goes to audit trail
   */
  security: (event: string, data?: unknown, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium') => {
    const securityEvent = {
      timestamp: new Date().toISOString(),
      event,
      severity,
      data: sanitizeObject(data),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // In production, this should go to your security monitoring system
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[SECURITY-${severity.toUpperCase()}] ${event}`, securityEvent);
    }
    
    // TODO: Send to security monitoring service
    // securityMonitoringService.logEvent(securityEvent);
  },

  /**
   * Performance logging - sanitized
   */
  performance: (metric: string, value: number, context?: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PERFORMANCE]${context ? ` [${context}]` : ''} ${metric}: ${value}ms`);
    }
  },

  /**
   * Warning logging - production safe
   */
  warn: (message: string, data?: unknown, context?: string) => {
    console.warn(`[WARN]${context ? ` [${context}]` : ''} ${message}`, data ? sanitizeObject(data) : '');
  },

  /**
   * Info logging - production safe  
   */
  info: (message: string, data?: unknown, context?: string) => {
    console.info(`[INFO]${context ? ` [${context}]` : ''} ${message}`, data ? sanitizeObject(data) : '');
  }
};

/**
 * Replace console methods in production builds
 */
export const initSecureLogging = () => {
  if (process.env.NODE_ENV === 'production') {
    // Override console methods to prevent accidental logging of sensitive data
    const originalConsole = { ...console };
    
    console.log = (message?: any, ...optionalParams: any[]) => {
      // Only allow explicitly marked safe logs in production
      if (typeof message === 'string' && message.startsWith('[SAFE]')) {
        originalConsole.log(message.replace('[SAFE]', ''), ...optionalParams.map(sanitizeObject));
      }
    };
    
    console.warn = originalConsole.warn; // Keep warnings
    console.error = originalConsole.error; // Keep errors
    console.info = originalConsole.info; // Keep info
  }
};