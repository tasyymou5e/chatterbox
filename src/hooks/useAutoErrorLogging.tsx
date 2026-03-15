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
    // Skip logging expected auth failures (401/403) to reduce noise
    const originalFetch = window.fetch;
    const ERROR_REPORTING_URLS = ['error-collector', 'security-monitoring'];
    window.fetch = async (...args) => {
      const url = args[0]?.toString() || 'Unknown URL';
      const isErrorReporter = ERROR_REPORTING_URLS.some(u => url.includes(u));
      try {
        const response = await originalFetch(...args);
        // Only log 5xx server errors, skip error-reporting endpoints to prevent recursion
        if (!response.ok && response.status >= 500 && !isErrorReporter) {
          logNetworkError(url, response.status, response.statusText);
        }
        return response;
      } catch (error) {
        if (!isErrorReporter) {
          logNetworkError(url, 0, 'Network Error');
        }
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