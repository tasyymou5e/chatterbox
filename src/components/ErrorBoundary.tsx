import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    this.logErrorToSystem(error, errorInfo);
  }

  private async logErrorToSystem(error: Error, errorInfo: ErrorInfo) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.functions.invoke('error-collector', {
        body: {
          errorType: 'react_error_boundary',
          severity: 'critical',
          message: error.message,
          stackTrace: error.stack,
          componentName: this.props.componentName || 'Unknown',
          userId: user?.id,
          sessionId: sessionStorage.getItem('error_session_id') || 'unknown',
          routePath: window.location.pathname,
          browserInfo: {
            userAgent: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
          },
          deviceInfo: {
            screenWidth: screen.width,
            screenHeight: screen.height,
            windowWidth: window.innerWidth,
            windowHeight: window.innerHeight,
          },
          metadata: {
            componentStack: errorInfo.componentStack,
            errorBoundaryName: this.props.componentName,
          },
          timestamp: new Date().toISOString(),
        }
      });
    } catch (err) {
      console.error('Failed to log error boundary error:', err);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if ((window as any).__navigate) {
      (window as any).__navigate('/');
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="max-w-md w-full space-y-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Something went wrong in this part of the application. The error has been logged and will be reviewed.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-2">
              <Button 
                onClick={this.handleReset}
                variant="outline" 
                className="w-full"
              >
                Try Again
              </Button>
              
              <Button 
                onClick={this.handleReload}
                variant="secondary" 
                className="w-full"
              >
                Reload Page
              </Button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-4 p-3 bg-muted rounded-md text-xs">
                <summary className="cursor-pointer font-medium">
                  Error Details (Development Only)
                </summary>
                <pre className="mt-2 whitespace-pre-wrap text-xs">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.error.stack}
                  {this.state.errorInfo?.componentStack && (
                    <>
                      {'\n\nComponent Stack:'}
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;