import React, { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { PageSkeleton } from '@/components/skeletons/PageSkeleton';

export interface AsyncContentProps {
  loading: boolean;
  error?: Error | null;
  skeleton?: ReactNode;
  errorFallback?: ReactNode;
  children: ReactNode;
  onRetry?: () => void;
  emptyState?: ReactNode;
  isEmpty?: boolean;
}

/**
 * Handles async content states: loading, error, empty, and success
 */
export const AsyncContent: React.FC<AsyncContentProps> = ({
  loading,
  error,
  skeleton,
  errorFallback,
  children,
  onRetry,
  emptyState,
  isEmpty = false,
}) => {
  if (loading) {
    return <>{skeleton || <PageSkeleton variant="default" />}</>;
  }

  if (error) {
    if (errorFallback) {
      return <>{errorFallback}</>;
    }

    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="p-6 text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
          <div>
            <h3 className="font-semibold text-lg">Something went wrong</h3>
            <p className="text-muted-foreground text-sm mt-1">
              {error.message || 'An unexpected error occurred'}
            </p>
          </div>
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (isEmpty && emptyState) {
    return <>{emptyState}</>;
  }

  return <>{children}</>;
};

export default AsyncContent;
