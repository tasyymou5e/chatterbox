/**
 * Structured logging utility to replace console statements
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  component?: string;
  userId?: string;
  sessionId?: string;
  action?: string;
  metadata?: Record<string, unknown>;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: Error;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 1000;

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): LogEntry {
    return {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      error
    };
  }

  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.isDevelopment && level === 'debug') {
      return false;
    }
    return true;
  }

  debug(message: string, context?: LogContext): void {
    if (!this.shouldLog('debug')) return;
    
    const entry = this.createLogEntry('debug', message, context);
    this.addToBuffer(entry);
    
    if (this.isDevelopment) {
      console.debug(`🔍 [DEBUG] ${message}`, context);
    }
  }

  info(message: string, context?: LogContext): void {
    if (!this.shouldLog('info')) return;
    
    const entry = this.createLogEntry('info', message, context);
    this.addToBuffer(entry);
    
    if (this.isDevelopment) {
      console.info(`ℹ️ [INFO] ${message}`, context);
    }
  }

  warn(message: string, context?: LogContext): void {
    if (!this.shouldLog('warn')) return;
    
    const entry = this.createLogEntry('warn', message, context);
    this.addToBuffer(entry);
    
    console.warn(`⚠️ [WARN] ${message}`, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const entry = this.createLogEntry('error', message, context, error);
    this.addToBuffer(entry);
    
    console.error(`❌ [ERROR] ${message}`, error, context);
    
    // In production, you might want to send this to an error tracking service
    if (!this.isDevelopment && error) {
      this.reportError(entry);
    }
  }

  private async reportError(entry: LogEntry): Promise<void> {
    try {
      // This could integrate with your error tracking service
      // For now, we'll just ensure it's captured in the buffer
      console.error('Error logged:', entry);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  }

  getLogs(level?: LogLevel): LogEntry[] {
    if (!level) return [...this.logBuffer];
    return this.logBuffer.filter(entry => entry.level === level);
  }

  clearLogs(): void {
    this.logBuffer = [];
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience methods for common use cases
export const logAuthEvent = (message: string, userId?: string, metadata?: Record<string, unknown>) => {
  logger.info(message, {
    component: 'Auth',
    userId,
    metadata
  });
};

export const logError = (message: string, error?: Error, component?: string) => {
  logger.error(message, error, {
    component,
    metadata: error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : undefined
  });
};

export const logPerformance = (action: string, duration: number, component?: string) => {
  logger.info(`Performance: ${action}`, {
    component,
    action,
    metadata: { duration }
  });
};