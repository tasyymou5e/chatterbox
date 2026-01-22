/**
 * Unified Error Boundary Logging Hook
 * 
 * @description Provides consistent error logging for all error boundaries.
 * Uses secureLog for development and reportError for production.
 * 
 * @module useErrorBoundaryLogging
 */
import { useCallback } from 'react';
import { secureLog } from '@/utils/secureLogging';
import { reportError } from '@/utils/productionErrorReporter';
import type { ErrorInfo } from 'react';

interface ErrorBoundaryLoggingOptions {
  componentName: string;
  boundaryType?: 'react' | 'async' | 'admin' | 'security';
}

/**
 * Unified hook for error boundary logging.
 * 
 * @param options - Configuration options for the logger
 * @returns Object with logging methods
 * 
 * @example
 * const { logBoundaryError } = useErrorBoundaryLogging({ 
 *   componentName: 'AdminDashboard',
 *   boundaryType: 'admin'
 * });
 * 
 * // In componentDidCatch or error handler:
 * logBoundaryError(error, errorInfo);
 */
export const useErrorBoundaryLogging = (options: ErrorBoundaryLoggingOptions) => {
  const { componentName, boundaryType = 'react' } = options;

  const logBoundaryError = useCallback((error: Error, errorInfo?: ErrorInfo) => {
    // Secure logging for development
    secureLog.error(`Error boundary caught error in ${componentName}`, error, componentName);
    
    // Report to production error collector
    reportError(error, componentName, 'high', {
      componentStack: errorInfo?.componentStack,
      boundaryType,
      timestamp: new Date().toISOString(),
    });
    
    // Security event for error boundary activation
    secureLog.security('error_boundary_activated', {
      componentName,
      boundaryType,
      errorName: error.name,
      errorMessage: error.message,
    }, 'medium');
  }, [componentName, boundaryType]);

  const logRecoveryAttempt = useCallback((success: boolean) => {
    secureLog.info(`Error recovery ${success ? 'succeeded' : 'failed'} in ${componentName}`, {
      componentName,
      boundaryType,
      success,
    });
  }, [componentName, boundaryType]);

  return {
    logBoundaryError,
    logRecoveryAttempt,
  };
};

/**
 * Static version for class components that can't use hooks.
 * Call this directly in componentDidCatch.
 */
export const logBoundaryErrorStatic = (
  error: Error, 
  errorInfo: ErrorInfo | null, 
  componentName: string,
  boundaryType: 'react' | 'async' | 'admin' | 'security' = 'react'
) => {
  // Secure logging for development
  secureLog.error(`Error boundary caught error in ${componentName}`, error, componentName);
  
  // Report to production error collector
  reportError(error, componentName, 'high', {
    componentStack: errorInfo?.componentStack,
    boundaryType,
    timestamp: new Date().toISOString(),
  });
  
  // Security event for error boundary activation
  secureLog.security('error_boundary_activated', {
    componentName,
    boundaryType,
    errorName: error.name,
    errorMessage: error.message,
  }, 'medium');
};
