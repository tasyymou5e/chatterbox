import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

interface ErrorReport {
  message: string;
  stack?: string;
  context: string;
  severity: ErrorSeverity;
  metadata?: Record<string, unknown>;
  timestamp: string;
  userAgent: string;
  url: string;
}

// Determine if we're in production
const isProduction = import.meta.env.PROD;

/**
 * Reports errors appropriately based on environment
 * In development: logs to console with full details
 * In production: sends to error collector and logs summary
 */
export async function reportError(
  error: unknown,
  context: string,
  severity: ErrorSeverity = 'medium',
  metadata?: Record<string, unknown>
): Promise<void> {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  
  const report: ErrorReport = {
    message: errorObj.message,
    stack: errorObj.stack,
    context,
    severity,
    metadata,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    url: typeof window !== 'undefined' ? window.location.href : 'unknown',
  };

  // Always log to our logger (respects environment)
  logger.error(`[${severity.toUpperCase()}] ${context}: ${errorObj.message}`, errorObj, {
    component: context,
    metadata: { ...metadata, severity },
  });

  // In production, also send to backend
  if (isProduction) {
    try {
      await supabase.functions.invoke('error-collector', {
        body: {
          errorType: 'application_error',
          severity,
          message: report.message,
          stackTrace: report.stack,
          componentName: context,
          routePath: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
          metadata: report.metadata,
          timestamp: report.timestamp,
        },
      });
    } catch (reportingError) {
      // Last resort: console error (this should never fail silently)
      console.error('[ErrorReporter] Failed to report error:', reportingError);
    }
  }
}

/**
 * Wrapper to ensure no silent catches in production
 * Use this instead of try/catch with empty or console-only catch blocks
 * 
 * @example
 * const result = await withErrorReporting(
 *   () => fetchData(),
 *   'DataFetcher',
 *   { severity: 'medium', fallback: [] }
 * );
 */
export async function withErrorReporting<T>(
  operation: () => Promise<T>,
  context: string,
  options: {
    severity?: ErrorSeverity;
    fallback?: T;
    rethrow?: boolean;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<T | undefined> {
  const { severity = 'medium', fallback, rethrow = false, metadata } = options;

  try {
    return await operation();
  } catch (error) {
    await reportError(error, context, severity, metadata);
    
    if (rethrow) throw error;
    return fallback;
  }
}

/**
 * Synchronous version for non-async operations
 */
export function withErrorReportingSync<T>(
  operation: () => T,
  context: string,
  options: {
    severity?: ErrorSeverity;
    fallback?: T;
    rethrow?: boolean;
    metadata?: Record<string, unknown>;
  } = {}
): T | undefined {
  const { severity = 'medium', fallback, rethrow = false, metadata } = options;

  try {
    return operation();
  } catch (error) {
    // Fire and forget the async report
    reportError(error, context, severity, metadata);
    
    if (rethrow) throw error;
    return fallback;
  }
}

/**
 * Creates a safe wrapper for event handlers that might throw
 * 
 * @example
 * <button onClick={createSafeHandler(handleClick, 'ButtonClick')}>
 *   Click me
 * </button>
 */
export function createSafeHandler<T extends (...args: unknown[]) => unknown>(
  handler: T,
  context: string
): T {
  return ((...args: Parameters<T>) => {
    try {
      const result = handler(...args);
      
      // Handle async handlers
      if (result instanceof Promise) {
        return result.catch(error => {
          reportError(error, context, 'medium');
          return undefined;
        });
      }
      
      return result;
    } catch (error) {
      reportError(error, context, 'medium');
      return undefined;
    }
  }) as T;
}
