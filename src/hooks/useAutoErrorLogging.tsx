import { useEffect } from 'react';
import { useErrorTracking } from './useErrorTracking';

export const useAutoErrorLogging = () => {
  const { logJavaScriptError, logNetworkError } = useErrorTracking();

  useEffect(() => {
    // Global error handler for JavaScript errors
    const handleError = (event: ErrorEvent) => {
      logJavaScriptError(new Error(event.message), 'GlobalErrorHandler');
    };

    // Global handler for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      logJavaScriptError(error, 'UnhandledPromiseRejection');
    };

    // Intercept fetch requests to log network errors
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      try {
        const response = await originalFetch(...args);
        if (!response.ok) {
          logNetworkError(args[0]?.toString() || 'Unknown URL', response.status, response.statusText);
        }
        return response;
      } catch (error) {
        logNetworkError(args[0]?.toString() || 'Unknown URL', 0, 'Network Error');
        throw error;
      }
    };

    // Add event listeners
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup function
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.fetch = originalFetch;
    };
  }, [logJavaScriptError, logNetworkError]);
};