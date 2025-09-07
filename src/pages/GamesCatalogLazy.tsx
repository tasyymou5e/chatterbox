// Phase 3: Code Splitting and Lazy Loading
import React, { Suspense } from 'react';

// Lazy load the main GamesCatalog component
const GamesCatalog = React.lazy(() => import('./GamesCatalog'));

// Loading component with skeleton
const GamesCatalogSkeleton = () => (
  <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
    <div className="container mx-auto px-4 py-6">
      {/* Header Skeleton */}
      <div className="text-center mb-8">
        <div className="h-10 w-96 bg-gray-200 animate-pulse rounded mx-auto mb-4"></div>
        <div className="h-4 w-2/3 bg-gray-200 animate-pulse rounded mx-auto"></div>
      </div>

      {/* Search Bar Skeleton */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 h-10 bg-gray-200 animate-pulse rounded"></div>
          <div className="w-48 h-10 bg-gray-200 animate-pulse rounded"></div>
        </div>
      </div>

      {/* Category Filter Skeleton */}
      <div className="mb-8">
        <div className="h-6 w-48 bg-gray-200 animate-pulse rounded mb-4 mx-auto"></div>
        <div className="flex justify-center mb-4">
          <div className="h-10 w-40 bg-gray-200 animate-pulse rounded"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 animate-pulse rounded"></div>
          ))}
        </div>
      </div>

      {/* Content Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-lg border-2 shadow-sm">
            <div className="aspect-video bg-gray-200 animate-pulse rounded-t-lg"></div>
            <div className="p-4 space-y-3">
              <div className="h-5 bg-gray-200 animate-pulse rounded"></div>
              <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4"></div>
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-gray-200 animate-pulse rounded-full"></div>
                <div className="h-6 w-20 bg-gray-200 animate-pulse rounded-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// Error boundary for lazy loading
class LazyLoadErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Report error to error tracking service in production
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      // Only report in production, not during development
      import('@/hooks/useErrorTracking').then(({ useErrorTracking }) => {
        // Note: This would need to be called from a component context in a real implementation
        // For now, we'll just silently handle the error
      });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4">
              Failed to load the games catalog. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main export with lazy loading and error boundary
export default function GamesCatalogLazy() {
  return (
    <LazyLoadErrorBoundary>
      <Suspense fallback={<GamesCatalogSkeleton />}>
        <GamesCatalog />
      </Suspense>
    </LazyLoadErrorBoundary>
  );
}