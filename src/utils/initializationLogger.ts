/**
 * Initialization Logger
 * 
 * Comprehensive logging utility for capturing app startup errors
 * and diagnosing blank screen issues.
 * 
 * @module initializationLogger
 */

import { secureLog } from './secureLogging';

export interface InitPhase {
  name: string;
  startTime: number;
  endTime?: number;
  status: 'pending' | 'success' | 'error' | 'timeout';
  error?: Error;
  metadata?: Record<string, unknown>;
}

export interface InitializationReport {
  sessionId: string;
  startTime: number;
  phases: InitPhase[];
  totalDuration: number;
  success: boolean;
  criticalError?: string;
  environment: {
    userAgent: string;
    url: string;
    timestamp: string;
    screenSize: string;
    online: boolean;
  };
}

/**
 * Initialization Logger class for tracking app startup
 */
class InitializationLogger {
  private phases: InitPhase[] = [];
  private startTime: number = 0;
  private sessionId: string;
  private isInitialized = false;
  private readonly STORAGE_KEY = 'init_logger_report';
  private readonly PHASE_TIMEOUT_MS = 10000; // 10 second timeout per phase

  constructor() {
    this.sessionId = this.getOrCreateSessionId();
  }

  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('init_session_id');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('init_session_id', sessionId);
    }
    return sessionId;
  }

  /**
   * Start tracking initialization
   */
  start(): void {
    if (this.isInitialized) return;
    
    this.startTime = performance.now();
    this.isInitialized = true;
    
    secureLog.dev('Initialization started', { sessionId: this.sessionId });
    
    // Set up global error handler for uncaught initialization errors
    this.setupGlobalErrorHandler();
  }

  /**
   * Begin a new initialization phase
   */
  beginPhase(name: string, metadata?: Record<string, unknown>): void {
    const phase: InitPhase = {
      name,
      startTime: performance.now(),
      status: 'pending',
      metadata
    };
    
    this.phases.push(phase);
    secureLog.dev(`Init phase started: ${name}`, metadata);
  }

  /**
   * Complete an initialization phase successfully
   */
  completePhase(name: string, metadata?: Record<string, unknown>): void {
    const phase = this.phases.find(p => p.name === name && p.status === 'pending');
    if (phase) {
      phase.endTime = performance.now();
      phase.status = 'success';
      if (metadata) {
        phase.metadata = { ...phase.metadata, ...metadata };
      }
      
      const duration = phase.endTime - phase.startTime;
      secureLog.dev(`Init phase completed: ${name}`, { duration: `${duration.toFixed(2)}ms` });
    }
  }

  /**
   * Mark an initialization phase as failed
   */
  failPhase(name: string, error: Error | unknown, metadata?: Record<string, unknown>): void {
    const phase = this.phases.find(p => p.name === name && p.status === 'pending');
    if (phase) {
      phase.endTime = performance.now();
      phase.status = 'error';
      phase.error = error instanceof Error ? error : new Error(String(error));
      if (metadata) {
        phase.metadata = { ...phase.metadata, ...metadata };
      }
      
      secureLog.error(`Init phase failed: ${name}`, phase.error, 'InitLogger');
    } else {
      // Phase not found, create a new failed phase entry
      this.phases.push({
        name,
        startTime: performance.now(),
        endTime: performance.now(),
        status: 'error',
        error: error instanceof Error ? error : new Error(String(error)),
        metadata
      });
      
      secureLog.error(`Init phase failed (new): ${name}`, error, 'InitLogger');
    }
  }

  /**
   * Mark a phase as timed out
   */
  timeoutPhase(name: string): void {
    const phase = this.phases.find(p => p.name === name && p.status === 'pending');
    if (phase) {
      phase.endTime = performance.now();
      phase.status = 'timeout';
      
      secureLog.warn(`Init phase timed out: ${name}`, {
        duration: phase.endTime - phase.startTime
      }, 'InitLogger');
    }
  }

  /**
   * Log a critical error that prevents app initialization
   */
  logCriticalError(error: Error | unknown, context?: string): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    
    secureLog.error('Critical initialization error', errorObj, context || 'InitLogger');
    
    // Store for later retrieval
    this.saveReport(errorObj.message);
    
    // Report to security monitoring for critical errors
    secureLog.security('critical_init_error', {
      error: errorObj.message,
      context,
      phases: this.phases.map(p => ({ name: p.name, status: p.status })),
      url: window.location.href
    }, 'critical');
  }

  /**
   * Generate a complete initialization report
   */
  generateReport(criticalError?: string): InitializationReport {
    const now = performance.now();
    
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      phases: this.phases.map(p => ({
        ...p,
        // Calculate duration for completed phases
        ...(p.endTime && { duration: p.endTime - p.startTime })
      })),
      totalDuration: now - this.startTime,
      success: !criticalError && this.phases.every(p => p.status === 'success'),
      criticalError,
      environment: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString(),
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        online: navigator.onLine
      }
    };
  }

  /**
   * Save report to session storage for debugging
   */
  private saveReport(criticalError?: string): void {
    try {
      const report = this.generateReport(criticalError);
      sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(report));
    } catch {
      // Silent fail - don't break the app for logging
    }
  }

  /**
   * Get the last saved report
   */
  getLastReport(): InitializationReport | null {
    try {
      const stored = sessionStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  /**
   * Export diagnostics as a string (for debug panel)
   */
  exportDiagnostics(): string {
    const report = this.generateReport();
    return JSON.stringify(report, null, 2);
  }

  /**
   * Set up global error handler for uncaught errors during init
   */
  private setupGlobalErrorHandler(): void {
    const originalHandler = window.onerror;
    
    window.onerror = (message, source, lineno, colno, error) => {
      // Log initialization error
      this.logCriticalError(
        error || new Error(String(message)),
        `Uncaught error at ${source}:${lineno}:${colno}`
      );
      
      // Call original handler if exists
      if (originalHandler) {
        return originalHandler(message, source, lineno, colno, error);
      }
      return false;
    };

    // Also handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logCriticalError(
        event.reason,
        'Unhandled promise rejection during init'
      );
    });
  }

  /**
   * Check for pending phases that may have stalled
   */
  checkForStalls(): string[] {
    const now = performance.now();
    const stalledPhases: string[] = [];
    
    for (const phase of this.phases) {
      if (phase.status === 'pending') {
        const duration = now - phase.startTime;
        if (duration > this.PHASE_TIMEOUT_MS) {
          stalledPhases.push(phase.name);
          this.timeoutPhase(phase.name);
        }
      }
    }
    
    return stalledPhases;
  }

  /**
   * Get current status summary
   */
  getStatusSummary(): {
    totalPhases: number;
    completed: number;
    pending: number;
    failed: number;
    timedOut: number;
  } {
    return {
      totalPhases: this.phases.length,
      completed: this.phases.filter(p => p.status === 'success').length,
      pending: this.phases.filter(p => p.status === 'pending').length,
      failed: this.phases.filter(p => p.status === 'error').length,
      timedOut: this.phases.filter(p => p.status === 'timeout').length
    };
  }

  /**
   * Reset the logger for a fresh start
   */
  reset(): void {
    this.phases = [];
    this.startTime = 0;
    this.isInitialized = false;
    sessionStorage.removeItem(this.STORAGE_KEY);
  }
}

// Singleton instance
export const initLogger = new InitializationLogger();

/**
 * Hook wrapper for tracking async initialization phases
 */
export async function trackPhase<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: Record<string, unknown>
): Promise<T> {
  initLogger.beginPhase(name, metadata);
  
  try {
    const result = await fn();
    initLogger.completePhase(name);
    return result;
  } catch (error) {
    initLogger.failPhase(name, error);
    throw error;
  }
}

/**
 * Sync wrapper for tracking initialization phases
 */
export function trackPhaseSync<T>(
  name: string,
  fn: () => T,
  metadata?: Record<string, unknown>
): T {
  initLogger.beginPhase(name, metadata);
  
  try {
    const result = fn();
    initLogger.completePhase(name);
    return result;
  } catch (error) {
    initLogger.failPhase(name, error);
    throw error;
  }
}
