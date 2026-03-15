import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import App from './App.tsx'
import AppInitializer from '@/components/app/AppInitializer'
import ErrorBoundary from './components/ErrorBoundary'
import InitializationErrorBoundary from '@/components/app/InitializationErrorBoundary'
import { logger, secureLog } from '@/utils/wideLogger'
import { initLogger } from '@/utils/initializationLogger'
import './index.css'

// Start initialization tracking immediately
initLogger.start();
initLogger.beginPhase('module_load');

// Configure QueryClient with retry logic and error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors (client errors)
        if (error instanceof Error && 'status' in error) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500) return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
    mutations: {
      retry: 1, // Retry mutations once on failure
      retryDelay: 1000,
      onError: (error) => {
        logger.error({ message: 'Mutation failed', error: error instanceof Error ? { name: (error as Error).name, message: (error as Error).message } : String(error) });
      },
    },
  },
})

// Mark module load phase complete
initLogger.completePhase('module_load');
initLogger.beginPhase('react_render');

try {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <InitializationErrorBoundary>
        <ErrorBoundary componentName="AppRoot">
          <QueryClientProvider client={queryClient}>
            <BrowserRouter>
              <AppInitializer>
                <App />
              </AppInitializer>
              <Toaster />
              <SonnerToaster />
            </BrowserRouter>
          </QueryClientProvider>
        </ErrorBoundary>
      </InitializationErrorBoundary>
    </React.StrictMode>,
  );
  
  // Mark React render phase complete
  initLogger.completePhase('react_render');
  secureLog.dev('React render initiated successfully');
} catch (error) {
  // Catch any synchronous errors during render setup
  initLogger.failPhase('react_render', error);
  initLogger.logCriticalError(error, 'React render failed');
  throw error;
}
