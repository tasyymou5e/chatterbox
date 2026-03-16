import React, { ReactNode } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { useErrorTracking } from '@/hooks/useErrorTracking';
import { logBoundaryErrorStatic } from '@/hooks/useErrorBoundaryLogging';

interface AdminErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

function AdminErrorFallback({ error, resetErrorBoundary, componentName }: {
  error: Error;
  resetErrorBoundary: () => void;
  componentName?: string | undefined;
}) {
  const { logComponentError } = useErrorTracking();

  React.useEffect(() => {
    logComponentError(
      componentName || 'AdminErrorBoundary',
      error,
      {
        timestamp: new Date().toISOString(),
        route: window.location.pathname,
      }
    );
  }, [error, componentName, logComponentError]);

  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <CardTitle>Something went wrong</CardTitle>
          </div>
          <CardDescription>
            An error occurred in the {componentName || 'application'}. 
            The error has been logged for investigation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {error?.message || 'Unknown error occurred'}
            </AlertDescription>
          </Alert>

          {process.env.NODE_ENV === 'development' && error && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Stack Trace (Development)</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-auto max-h-40">
                {error.stack}
              </pre>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button onClick={resetErrorBoundary} variant="default">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            <Button onClick={handleReload} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Reload Page
            </Button>
            <Button onClick={handleGoHome} variant="secondary">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminErrorBoundary({ children, fallback, componentName }: AdminErrorBoundaryProps) {
  return (
    <ErrorBoundary
      FallbackComponent={(props) => fallback || <AdminErrorFallback {...props} componentName={componentName} />}
      onError={(error, errorInfo) => {
        logBoundaryErrorStatic(error, errorInfo, componentName || 'AdminErrorBoundary', 'admin');
      }}
    >
      {children}
    </ErrorBoundary>
  );
}