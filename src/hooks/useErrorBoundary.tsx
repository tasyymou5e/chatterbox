/**
 * Enhanced error boundary hook with structured logging
 */
import { useCallback } from 'react';
import { logger } from '@/utils/wideLogger';
import { handleError } from '@/utils/errorHandling';

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export const useErrorBoundary = () => {
  const logError = useCallback((error: Error, errorInfo: React.ErrorInfo) => {
    logger.error('React Error Boundary caught an error', error, {
      component: 'ErrorBoundary',
      metadata: {
        componentStack: errorInfo.componentStack,
        errorBoundary: true
      }
    });
  }, []);

  const handleComponentError = useCallback((error: unknown, component: string) => {
    const handledError = handleError(error, `Component: ${component}`);
    logger.error(`Component error in ${component}`, error instanceof Error ? error : new Error(String(error)), {
      component,
      metadata: {
        handledError
      }
    });
    return handledError;
  }, []);

  const resetError = useCallback(() => {
    logger.info('Error boundary reset', { component: 'ErrorBoundary' });
  }, []);

  return {
    logError,
    handleComponentError,
    resetError
  };
};