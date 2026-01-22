import React, { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { isRetryableError, getErrorMessage } from '@/utils/errorHandling';
import { logBoundaryErrorStatic } from '@/hooks/useErrorBoundaryLogging';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  componentName?: string;
  showRetry?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
  isRetrying: boolean;
}

/**
 * Specialized error boundary for async operations with automatic retry logic
 */
export class AsyncErrorBoundary extends Component<Props, State> {
  private maxRetries = 3;
  
  state: State = {
    hasError: false,
    error: null,
    retryCount: 0,
    isRetrying: false,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const { componentName = 'Unknown', onError } = this.props;
    
    // Log error using unified boundary logging
    logBoundaryErrorStatic(error, errorInfo, componentName, 'async');

    // Call custom error handler if provided
    onError?.(error, errorInfo);
  }

  handleRetry = async () => {
    const { retryCount } = this.state;
    
    if (retryCount >= this.maxRetries) {
      return;
    }

    this.setState({ isRetrying: true });
    
    // Exponential backoff delay
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      retryCount: prevState.retryCount + 1,
      isRetrying: false,
    }));

    this.props.onReset?.();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    const { hasError, error, retryCount, isRetrying } = this.state;
    const { children, fallback, showRetry = true } = this.props;
    const canRetry = retryCount < this.maxRetries && (error ? isRetryableError(error) : true);

    if (hasError) {
      if (fallback) return fallback;

      return (
        <Card className="max-w-md mx-auto mt-8">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
            <CardTitle>Something went wrong</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-center">
              {getErrorMessage(error)}
            </p>
            
            {retryCount > 0 && (
              <p className="text-sm text-muted-foreground text-center">
                Retry attempt {retryCount} of {this.maxRetries}
              </p>
            )}

            <div className="flex gap-2 justify-center">
              {showRetry && canRetry && (
                <Button onClick={this.handleRetry} disabled={isRetrying}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRetrying ? 'animate-spin' : ''}`} />
                  {isRetrying ? 'Retrying...' : 'Try Again'}
                </Button>
              )}
              <Button variant="outline" onClick={this.handleGoHome}>
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return children;
  }
}

export default AsyncErrorBoundary;
