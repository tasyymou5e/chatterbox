/**
 * Specialized error boundary for admin dashboard components
 * Provides graceful degradation with fallback UI
 */
import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';

interface DashboardErrorBoundaryProps {
  children: ReactNode;
  componentName?: string;
  fallbackComponent?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface DashboardErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

const MAX_RETRIES = 3;

export class DashboardErrorBoundary extends Component<
  DashboardErrorBoundaryProps,
  DashboardErrorBoundaryState
> {
  constructor(props: DashboardErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<DashboardErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error(`[DashboardErrorBoundary] ${this.props.componentName || 'Dashboard'} Error:`, error);
    console.error('Error Info:', errorInfo);
    
    this.setState({ errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = (): void => {
    if (this.state.retryCount < MAX_RETRIES) {
      this.setState((prev) => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prev.retryCount + 1
      }));
    }
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/admin/dashboard';
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      const canRetry = this.state.retryCount < MAX_RETRIES;
      const componentName = this.props.componentName || 'Dashboard Component';

      return (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <AlertTriangle className="h-5 w-5 mr-2" />
              {componentName} Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant="destructive">
              <Bug className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>
                {this.state.error?.message || 'An unexpected error occurred while loading this component.'}
              </AlertDescription>
            </Alert>

            <div className="flex flex-wrap gap-2">
              {canRetry && (
                <Button onClick={this.handleRetry} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry ({MAX_RETRIES - this.state.retryCount} left)
                </Button>
              )}
              <Button onClick={this.handleReload} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
              <Button onClick={this.handleGoHome} variant="ghost" size="sm">
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-4">
                <summary className="text-sm text-muted-foreground cursor-pointer">
                  Technical Details
                </summary>
                <pre className="mt-2 p-4 bg-muted rounded text-xs overflow-auto max-h-48">
                  {this.state.error?.stack}
                  {'\n\nComponent Stack:\n'}
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

export default DashboardErrorBoundary;
