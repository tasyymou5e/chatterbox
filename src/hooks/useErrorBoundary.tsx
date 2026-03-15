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
    logger.error({
      message: 'React Error Boundary caught an error',
      component: 'ErrorBoundary',
      error: { name: error.name, message: error.message, stack: error.stack },
      component_stack: errorInfo.componentStack,
      error_boundary: true,
    });
  }, []);

  const handleComponentError = useCallback((error: unknown, component: string) => {
    const handledError = handleError(error, `Component: ${component}`);
    logger.error({
      message: `Component error in ${component}`,
      component,
      error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error),
      handled_error: handledError,
    });
    return handledError;
  }, []);

  const resetError = useCallback(() => {
    logger.info({ message: 'Error boundary reset', component: 'ErrorBoundary' });
  }, []);

  return {
    logError,
    handleComponentError,
    resetError
  };
};
