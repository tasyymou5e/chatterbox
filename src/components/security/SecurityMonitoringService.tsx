/**
 * Real-time security monitoring service
 */
import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { secureLog } from '@/utils/wideLogger';
import { useToast } from '@/hooks/use-toast';

interface SecurityEvent {
  type: 'unauthorized_access' | 'suspicious_activity' | 'data_breach_attempt' | 'rls_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, any>;
  timestamp: string;
  userId?: string;
}

// SecurityMetrics interface - kept for future dashboard implementation
// interface SecurityMetrics {
//   failedLogins: number;
//   suspiciousQueries: number;
//   rlsViolations: number;
//   unauthorizedAccess: number;
// }

export const useSecurityMonitoring = () => {
  const { toast } = useToast();

  const logSecurityEvent = useCallback(async (event: SecurityEvent) => {
    try {
      // Log to secure audit trail
      await supabase.functions.invoke('error-collector', {
        body: {
          errorType: 'security_event',
          severity: event.severity,
          message: `Security Event: ${event.type}`,
          metadata: {
            securityEventType: event.type,
            details: event.details,
            timestamp: event.timestamp,
            userId: event.userId,
            userAgent: navigator.userAgent,
            ipAddress: 'client-side', // Server will capture real IP
            url: window.location.href
          }
        }
      });

      // Log using secure logging
      secureLog.security(event.type, event.details, event.severity);

      // Show critical alerts to user
      if (event.severity === 'critical') {
        toast({
          title: "Security Alert",
          description: "A security event has been detected and logged.",
          variant: "destructive"
        });
      }
    } catch (error) {
      secureLog.error('Failed to log security event', error, 'SecurityMonitoring');
    }
  }, [toast]);

  const detectSuspiciousActivity = useCallback((activity: {
    type: string;
    frequency: number;
    timeWindow: number;
  }) => {
    // Detect rapid requests that might indicate attacks
    if (activity.frequency > 10 && activity.timeWindow < 60) {
      logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'high',
        details: {
          activityType: activity.type,
          frequency: activity.frequency,
          timeWindow: activity.timeWindow,
          possibleAttack: 'rate_limit_abuse'
        },
        timestamp: new Date().toISOString()
      });
    }
  }, [logSecurityEvent]);

  const monitorDataAccess = useCallback((operation: {
    table: string;
    operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
    recordCount: number;
    userId?: string;
  }) => {
    // Monitor for bulk data operations that might indicate data exfiltration
    if (operation.operation === 'SELECT' && operation.recordCount > 100) {
      logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        details: {
          table: operation.table,
          operation: operation.operation,
          recordCount: operation.recordCount,
          possibleIssue: 'bulk_data_access'
        },
        timestamp: new Date().toISOString(),
        userId: operation.userId
      });
    }
  }, [logSecurityEvent]);

  const validateUserPermissions = useCallback(async (requiredRole: 'admin' | 'parent' | 'child' | 'therapist' | 'teacher' | 'grandparent' | 'family_friend') => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logSecurityEvent({
          type: 'unauthorized_access',
          severity: 'high',
          details: {
            requiredRole,
            reason: 'no_authenticated_user',
            attemptedResource: window.location.pathname
          },
          timestamp: new Date().toISOString()
        });
        return false;
      }

      // Check user role via RPC to prevent client-side manipulation
      const { data: hasRole } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: requiredRole
      });

      if (!hasRole) {
        logSecurityEvent({
          type: 'unauthorized_access',
          severity: 'high',
          details: {
            userId: user.id,
            requiredRole,
            reason: 'insufficient_permissions',
            attemptedResource: window.location.pathname
          },
          timestamp: new Date().toISOString(),
          userId: user.id
        });
        return false;
      }

      return true;
    } catch (error) {
      logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'medium',
        details: {
          error: 'permission_check_failed',
          requiredRole,
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        },
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }, [logSecurityEvent]);

  return {
    logSecurityEvent,
    detectSuspiciousActivity,
    monitorDataAccess,
    validateUserPermissions
  };
};

/**
 * Security monitoring provider component
 */
export const SecurityMonitoringProvider: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const { logSecurityEvent } = useSecurityMonitoring();

  useEffect(() => {
    // Monitor for client-side security issues
    const handleError = (event: ErrorEvent) => {
      // Filter out sensitive errors and only log security-relevant ones
      if (event.error?.message?.toLowerCase().includes('security') ||
          event.error?.message?.toLowerCase().includes('unauthorized') ||
          event.error?.message?.toLowerCase().includes('forbidden')) {
        logSecurityEvent({
          type: 'suspicious_activity',
          severity: 'medium',
          details: {
            errorMessage: event.error.message,
            source: 'client_error_handler',
            filename: event.filename,
            lineno: event.lineno
          },
          timestamp: new Date().toISOString()
        });
      }
    };

    // Monitor for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.toLowerCase().includes('row-level security') ||
          event.reason?.message?.toLowerCase().includes('policy')) {
        logSecurityEvent({
          type: 'rls_violation',
          severity: 'high',
          details: {
            reason: event.reason?.message || 'Unknown RLS violation',
            source: 'unhandled_promise_rejection'
          },
          timestamp: new Date().toISOString()
        });
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [logSecurityEvent]);

  return <>{children}</>;
};