/**
 * Enhanced Error Recovery System for Admin Portal
 * Provides intelligent error recovery options and detailed logging
 */

import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  RefreshCw, 
  AlertTriangle, 
  WifiOff, 
  Bug, 
  Home,
  ArrowLeft,
  ExternalLink,
  Clock,
  FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { secureLog } from '@/utils/secureLogging';
import type { LucideIcon } from 'lucide-react';

export interface ErrorRecoveryActions {
  primary?: {
    label: string;
    action: () => void;
    icon?: LucideIcon;
  };
  secondary?: {
    label: string;
    action: () => void;
    icon?: LucideIcon;
  };
  tertiary?: {
    label: string;
    action: () => void;
    icon?: LucideIcon;
  };
}

export interface ErrorAnalysis {
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'database' | 'authentication' | 'validation' | 'system' | 'rate_limit';
  recoverable: boolean;
  suggestedActions: string[];
  context?: Record<string, unknown>;
  retryAfter?: number;
}

interface AdminErrorBoundaryProps {
  error: Error;
  componentName: string;
  retry?: () => void;
}

const AdminErrorBoundary: React.FC<AdminErrorBoundaryProps> = ({ 
  error, 
  componentName, 
  retry 
}) => {
  const { toast } = useToast();

  // Analyze error and suggest recovery actions
  const analyzeError = (error: Error): ErrorAnalysis => {
    const message = error.message.toLowerCase();
    const status = 'status' in error ? (error as Error & { status: number }).status : null;
    
    // Network errors
    if (message.includes('fetch') || message.includes('network') || status === 0) {
      return {
        severity: 'medium',
        category: 'network',
        recoverable: true,
        suggestedActions: ['Check internet connection', 'Refresh page', 'Try again later']
      };
    }

    // Authentication errors
    if (message.includes('unauthorized') || message.includes('authentication') || status === 401) {
      return {
        severity: 'high',
        category: 'authentication',
        recoverable: true,
        suggestedActions: ['Re-authenticate', 'Check session status', 'Contact admin']
      };
    }

    // Database errors
    if (message.includes('database') || message.includes('connection') || status === 503) {
      return {
        severity: 'medium',
        category: 'database',
        recoverable: true,
        suggestedActions: ['Try again', 'Check system status', 'Use alternative action']
      };
    }

    // Rate limiting errors
    if (message.includes('rate limit') || message.includes('too many requests') || status === 429) {
      return {
        severity: 'medium',
        category: 'rate_limit',
        recoverable: false,
        retryAfter: 60,
        suggestedActions: ['Wait and retry', 'Check rate limits', 'Use bulk operations']
      };
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid') || status === 400) {
      return {
        severity: 'low',
        category: 'validation',
        recoverable: true,
        suggestedActions: ['Check input data', 'Review requirements', 'Contact support']
      };
    }

    // System errors
    if (status === 500 || status === 502) {
      return {
        severity: 'high',
        category: 'system',
        recoverable: true,
        suggestedActions: ['Try again later', 'Report issue', 'Check system status']
      };
    }

    // Default error analysis
    return {
      severity: 'medium',
      category: 'system',
      recoverable: true,
      suggestedActions: ['Try again', 'Refresh page', 'Contact support']
    };
  };

  const errorAnalysis = analyzeError(error);
  const [analysisExpanded, setAnalysisExpanded] = React.useState(false);

  // Log error for audit trail
  React.useEffect(() => {
    secureLog.error('Admin component error', {
      componentName,
      errorType: errorAnalysis.category,
      severity: errorAnalysis.severity,
      message: error.message,
      timestamp: new Date().toISOString(),
    });
  }, [error, componentName, errorAnalysis]);

  const getRecoveryActions = (): ErrorRecoveryActions => {
    const actions: ErrorRecoveryActions = {};

    if (errorAnalysis.category === 'network') {
      actions.primary = {
        label: 'Refresh Page',
        action: () => window.location.reload(),
        icon: RefreshCw
      };
      actions.secondary = {
        label: 'Check Connection',
        action: () => window.open('https://www.google.com', '_blank'),
        icon: ExternalLink
      };
    }

    if (errorAnalysis.category === 'authentication') {
      actions.primary = {
        label: 'Re-authenticate',
        action: () => {
          toast({
            title: 'Redirecting to Login',
            description: 'Please log in again to continue.',
          });
          setTimeout(() => {
            window.location.href = '/admin/login';
          }, 1000);
        },
        icon: RefreshCw
      };
      actions.secondary = {
        label: 'Session Status',
        action: () => setAnalysisExpanded(!analysisExpanded),
        icon: FileText
      };
    }

    if (errorAnalysis.category === 'database' || errorAnalysis.category === 'system') {
      actions.primary = retry ? {
        label: 'Retry Operation',
        action: retry,
        icon: RefreshCw
      } : undefined;

      actions.secondary = {
        label: 'Go to Dashboard',
        action: () => window.location.href = '/admin/dashboard',
        icon: Home
      };
      actions.tertiary = {
        label: 'System Status',
        action: () => window.open('https://status.chatterbox.live', '_blank'),
        icon: WifiOff
      };
    }

    if (errorAnalysis.category === 'rate_limit') {
      actions.primary = {
        label: `Wait ${errorAnalysis.retryAfter}s`,
        action: () => {
          setTimeout(() => {
            if (retry) retry();
          }, (errorAnalysis.retryAfter || 60) * 1000);
        },
        icon: Clock
      };
      actions.secondary = {
        label: 'View Rate Limits',
        action: () => setAnalysisExpanded(!analysisExpanded),
        icon: FileText
      };
    }

    if (errorAnalysis.category === 'validation') {
      actions.primary = {
        label: 'Go Back',
        action: () => window.history.back(),
        icon: ArrowLeft
      };
      actions.secondary = {
        label: 'Contact Support',
        action: () => window.open('mailto:support@chatterbox.live', '_blank'),
        icon: ExternalLink
      };
    }

    return actions;
  };

  const recoveryActions = getRecoveryActions();

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      case 'low': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  const getSeverityIcon = (severity: string): LucideIcon => {
    switch (severity) {
      case 'critical':
      case 'high': return AlertTriangle;
      case 'medium': return Bug;
      case 'low': return AlertTriangle;
      default: return AlertTriangle;
    }
  };

  const SeverityIcon = getSeverityIcon(errorAnalysis.severity);

  return (
    <Card className={`w-full ${getSeverityColor(errorAnalysis.severity)}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SeverityIcon 
            className={`h-5 w-5 ${
              errorAnalysis.severity === 'critical' || errorAnalysis.severity === 'high' ? 'text-red-500' : 
              errorAnalysis.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
            }`}
          />
          <span>Something went wrong</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Error Message */}
        <Alert>
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-medium">{error.message}</p>
              <div className="text-sm text-muted-foreground">
                <p><strong>Component:</strong> {componentName}</p>
                <p><strong>Type:</strong> {errorAnalysis.category}</p>
                <p><strong>Severity:</strong> {errorAnalysis.severity}</p>
                {errorAnalysis.retryAfter && (
                  <p><strong>Retry available in:</strong> {errorAnalysis.retryAfter}s</p>
                )}
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* Suggested Actions */}
        <div className="space-y-3">
          <h4 className="font-medium">Suggested Actions:</h4>
          <div className="space-y-2">
            {errorAnalysis.suggestedActions.map((action, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recovery Action Buttons */}
        {errorAnalysis.recoverable && (
          <div className="flex gap-3 pt-4 border-t">
            {recoveryActions.primary && (
              <Button
                onClick={recoveryActions.primary.action}
                className="flex-1"
                variant="default"
              >
                {recoveryActions.primary.icon && (
                  <recoveryActions.primary.icon className="h-4 w-4 mr-2" />
                )}
                {recoveryActions.primary.label}
              </Button>
            )}
            {recoveryActions.secondary && (
              <Button
                onClick={recoveryActions.secondary.action}
                variant="outline"
                className="flex-1"
              >
                {recoveryActions.secondary.icon && (
                  <recoveryActions.secondary.icon className="h-4 w-4 mr-2" />
                )}
                {recoveryActions.secondary.label}
              </Button>
            )}
            {recoveryActions.tertiary && (
              <Button
                onClick={recoveryActions.tertiary.action}
                variant="ghost"
                size="sm"
              >
                {recoveryActions.tertiary.icon && (
                  <recoveryActions.tertiary.icon className="h-4 w-4 mr-2" />
                )}
                {recoveryActions.tertiary.label}
              </Button>
            )}
          </div>
        )}

        {/* Error Analysis Details */}
        {analysisExpanded && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-medium">Technical Details:</h4>
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm">
              <pre className="whitespace-pre-wrap">
                {JSON.stringify({
                  error: error.message,
                  stack: error.stack,
                  timestamp: new Date().toISOString(),
                  userAgent: navigator.userAgent,
                  url: window.location.href,
                  ...errorAnalysis.context
                }, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminErrorBoundary;
