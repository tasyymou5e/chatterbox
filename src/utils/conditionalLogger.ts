/**
 * Conditional logger that respects environment settings
 * Replaces direct console.log calls with environment-aware logging
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  component?: string;
  userId?: string;
  sessionId?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

class ConditionalLogger {
  private isDevelopment = import.meta.env.DEV;
  
  debug(message: string, context?: LogContext | any): void {
    if (this.isDevelopment) {
      console.debug(`🔍 [DEBUG] ${message}`, context);
    }
  }

  info(message: string, context?: LogContext | any): void {
    if (this.isDevelopment) {
      console.info(`ℹ️ [INFO] ${message}`, context);
    }
  }

  warn(message: string, context?: LogContext | any): void {
    // Warnings always shown, but with cleaner formatting in production
    if (this.isDevelopment) {
      console.warn(`⚠️ [WARN] ${message}`, context);
    } else {
      console.warn(`[WARN] ${message}`, context);
    }
  }

  error(message: string, error?: Error | any, context?: LogContext | any): void {
    // Errors always shown
    if (this.isDevelopment) {
      console.error(`❌ [ERROR] ${message}`, error, context);
    } else {
      console.error(`[ERROR] ${message}`, error, context);
    }
  }

  log(message: string, data?: any): void {
    if (this.isDevelopment) {
      console.log(`📝 ${message}`, data);
    }
  }
}

// Export singleton instance for backward compatibility with existing console.log patterns
export const conditionalLogger = new ConditionalLogger();

// Export methods for easy replacement of console calls
export const cLog = conditionalLogger.log.bind(conditionalLogger);
export const cDebug = conditionalLogger.debug.bind(conditionalLogger);
export const cInfo = conditionalLogger.info.bind(conditionalLogger);
export const cWarn = conditionalLogger.warn.bind(conditionalLogger);
export const cError = conditionalLogger.error.bind(conditionalLogger);