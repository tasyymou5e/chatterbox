/**
 * Initialization Error Boundary
 * 
 * Specialized error boundary for capturing and displaying
 * initialization errors that cause blank screens.
 * 
 * @component InitializationErrorBoundary
 */

import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Copy, Bug } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { initLogger } from '@/utils/initializationLogger';
import { secureLog } from '@/utils/wideLogger';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDiagnostics: boolean;
}

/**
 * Error boundary specifically designed for app initialization failures
 */
class InitializationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      showDiagnostics: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    
    // Log to initialization logger
    initLogger.logCriticalError(error, 'InitializationErrorBoundary');
    
    // Report to error collector
    this.reportError(error, errorInfo);
  }

  private async reportError(error: Error, errorInfo: ErrorInfo) {
    try {
      const report = initLogger.generateReport(error.message);
      
      await supabase.functions.invoke('error-collector', {
        body: {
          errorType: 'initialization_error',
          severity: 'critical',
          message: error.message,
          stackTrace: process.env.NODE_ENV === 'development' ? error.stack : '[REDACTED]',
          componentName: 'InitializationErrorBoundary',
          sessionId: report.sessionId,
          routePath: window.location.pathname,
          metadata: {
            componentStack: process.env.NODE_ENV === 'development' 
              ? errorInfo.componentStack 
              : '[REDACTED]',
            initPhases: report.phases.map(p => ({
              name: p.name,
              status: p.status,
              duration: p.endTime && p.startTime ? p.endTime - p.startTime : null
            })),
            totalInitDuration: report.totalDuration,
            timestamp: new Date().toISOString(),
          }
        }
      });

      secureLog.security('initialization_failure_reported', {
        errorType: error.name,
        phasesCompleted: report.phases.filter(p => p.status === 'success').length,
        phasesFailed: report.phases.filter(p => p.status === 'error').length
      }, 'critical');
      
    } catch (err) {
      secureLog.error('Failed to report initialization error', err, 'InitErrorBoundary');
    }
  }

  private handleReload = () => {
    // Clear any cached state that might be causing issues
    try {
      // Clear auth-related storage
      const keysToRemove = ['auth-session-store', 'auth-role-store'];
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // Reset init logger
      initLogger.reset();
    } catch {
      // Ignore storage errors
    }
    
    window.location.reload();
  };

  private handleCopyDiagnostics = () => {
    const diagnostics = initLogger.exportDiagnostics();
    navigator.clipboard.writeText(diagnostics);
  };

  private toggleDiagnostics = () => {
    this.setState(prev => ({ showDiagnostics: !prev.showDiagnostics }));
  };

  render() {
    if (this.state.hasError) {
      const report = initLogger.generateReport(this.state.error?.message);
      const failedPhases = report.phases.filter(p => p.status === 'error' || p.status === 'timeout');
      
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <div className="max-w-lg w-full space-y-6">
            <Alert variant="destructive" className="border-2">
              <AlertTriangle className="h-5 w-5" />
              <AlertTitle className="text-lg font-semibold">
                Application Failed to Start
              </AlertTitle>
              <AlertDescription className="mt-2">
                The application encountered an error during initialization. 
                This has been automatically reported.
              </AlertDescription>
            </Alert>

            {/* Error Summary */}
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Bug className="h-4 w-4" />
                Error Details
              </div>
              
              <div className="text-sm space-y-1">
                <p><span className="text-muted-foreground">Type:</span> {this.state.error?.name}</p>
                <p><span className="text-muted-foreground">Message:</span> {this.state.error?.message}</p>
                <p><span className="text-muted-foreground">Session:</span> {report.sessionId.substring(0, 8)}...</p>
              </div>

              {failedPhases.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-1">Failed Initialization Steps:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside">
                    {failedPhases.map((phase, i) => (
                      <li key={i}>
                        {phase.name} ({phase.status})
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button 
                onClick={this.handleReload}
                className="w-full"
                size="lg"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Application
              </Button>
              
              <div className="flex gap-2">
                <Button 
                  onClick={this.toggleDiagnostics}
                  variant="outline" 
                  className="flex-1"
                >
                  {this.state.showDiagnostics ? 'Hide' : 'Show'} Diagnostics
                </Button>
                
                <Button 
                  onClick={this.handleCopyDiagnostics}
                  variant="outline"
                  size="icon"
                  title="Copy diagnostics to clipboard"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Diagnostics Panel */}
            {this.state.showDiagnostics && (
              <div className="bg-muted rounded-lg p-4 overflow-auto max-h-64">
                <pre className="text-xs whitespace-pre-wrap font-mono">
                  {initLogger.exportDiagnostics()}
                </pre>
              </div>
            )}

            {/* Development Stack Trace */}
            {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
              <details className="bg-destructive/10 rounded-lg p-4">
                <summary className="cursor-pointer font-medium text-sm text-destructive">
                  Stack Trace (Development Only)
                </summary>
                <pre className="mt-2 text-xs whitespace-pre-wrap overflow-auto max-h-48">
                  {this.state.error.stack}
                </pre>
                {this.state.errorInfo?.componentStack && (
                  <>
                    <p className="mt-4 font-medium text-sm text-destructive">Component Stack:</p>
                    <pre className="mt-1 text-xs whitespace-pre-wrap overflow-auto max-h-32">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </>
                )}
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default InitializationErrorBoundary;
