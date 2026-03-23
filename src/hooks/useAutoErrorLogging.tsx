import { useEffect } from 'react';
import { useErrorTracking } from './useErrorTracking';

// Guard flag to prevent logging loops from console intercepts
let __isInternalLog = false;

export const useAutoErrorLogging = () => {
  const { logJavaScriptError, logNetworkError, logError } = useErrorTracking();

  useEffect(() => {
    // === 1. Global JS error handler ===
    const handleError = (event: ErrorEvent) => {
      logJavaScriptError(new Error(event.message), 'GlobalErrorHandler');
    };

    // === 2. Unhandled promise rejections ===
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      logJavaScriptError(error, 'UnhandledPromiseRejection');
    };

    // === 3. Console.error / console.warn intercepts ===
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.error = (...args: unknown[]) => {
      originalConsoleError.apply(console, args);
      if (__isInternalLog) return;
      __isInternalLog = true;
      try {
        const message = args.map(a => 
          a instanceof Error ? a.message : typeof a === 'string' ? a : JSON.stringify(a)
        ).join(' ');
        logError({
          errorType: 'console_error',
          severity: 'medium',
          message: message.slice(0, 2000),
          metadata: { source: 'console.error' }
        });
      } finally {
        __isInternalLog = false;
      }
    };

    console.warn = (...args: unknown[]) => {
      originalConsoleWarn.apply(console, args);
      if (__isInternalLog) return;
      __isInternalLog = true;
      try {
        const message = args.map(a => 
          typeof a === 'string' ? a : JSON.stringify(a)
        ).join(' ');
        logError({
          errorType: 'console_warn',
          severity: 'low',
          message: message.slice(0, 2000),
          metadata: { source: 'console.warn' }
        });
      } finally {
        __isInternalLog = false;
      }
    };

    // === 4. Vite HMR error capture (dev only) ===
    if (import.meta.hot) {
      import.meta.hot.on('vite:error', (payload: { err: { message: string; stack?: string } }) => {
        logError({
          errorType: 'vite_build_error',
          severity: 'high',
          message: payload.err.message,
          stackTrace: payload.err.stack,
          metadata: { source: 'vite:error' }
        });
      });

      import.meta.hot.on('vite:beforeUpdate', (payload: { updates: Array<{ path: string; type: string }> }) => {
        logError({
          errorType: 'vite_hmr_update',
          severity: 'low',
          message: `HMR update: ${payload.updates.map(u => u.path).join(', ')}`,
          metadata: { source: 'vite:beforeUpdate', updates: payload.updates }
        });
      });
    }

    // === 5. Fetch interceptor for network errors ===
    const originalFetch = window.fetch;
    const ERROR_REPORTING_URLS = ['error-collector', 'security-monitoring'];
    window.fetch = async (...args) => {
      const url = args[0]?.toString() || 'Unknown URL';
      const isErrorReporter = ERROR_REPORTING_URLS.some(u => url.includes(u));
      try {
        const response = await originalFetch(...args);
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

    // Cleanup
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.fetch = originalFetch;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, [logJavaScriptError, logNetworkError, logError]);
};
