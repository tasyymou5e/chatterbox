import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as SonnerToaster } from '@/components/ui/sonner'
import App from './App.tsx'
import AppInitializer from '@/components/app/AppInitializer'
import ErrorBoundary from './components/ErrorBoundary'
import { logger } from '@/utils/logger'
import './index.css'

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
        logger.error('Mutation failed', error instanceof Error ? error : new Error(String(error)));
      },
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
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
  </React.StrictMode>,
)