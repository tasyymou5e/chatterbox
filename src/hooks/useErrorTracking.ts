import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ErrorInfo {
  errorType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  stackTrace?: string;
  componentName?: string;
  routePath?: string;
  metadata?: Record<string, any>;
}

interface BrowserInfo {
  userAgent: string;
  language: string;
  platform: string;
  cookieEnabled: boolean;
  onLine: boolean;
}

interface DeviceInfo {
  screenWidth: number;
  screenHeight: number;
  windowWidth: number;
  windowHeight: number;
  pixelRatio: number;
  timezone: string;
}

export const useErrorTracking = () => {
  const getBrowserInfo = useCallback((): BrowserInfo => {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
    };
  }, []);

  const getDeviceInfo = useCallback((): DeviceInfo => {
    return {
      screenWidth: screen.width,
      screenHeight: screen.height,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      pixelRatio: window.devicePixelRatio,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }, []);

  const getSessionId = useCallback((): string => {
    let sessionId = sessionStorage.getItem('error_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('error_session_id', sessionId);
    }
    return sessionId;
  }, []);

  const logError = useCallback(async (errorInfo: ErrorInfo) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.functions.invoke('error-collector', {
        body: {
          ...errorInfo,
          userId: user?.id,
          sessionId: getSessionId(),
          browserInfo: getBrowserInfo(),
          deviceInfo: getDeviceInfo(),
          routePath: window.location.pathname,
          timestamp: new Date().toISOString(),
        }
      });
    } catch (err) {
      // Fallback: log to console if error collection fails
      console.error('Failed to log error to system:', err, errorInfo);
    }
  }, [getBrowserInfo, getDeviceInfo, getSessionId]);

  const logJavaScriptError = useCallback((error: Error, componentName?: string) => {
    logError({
      errorType: 'javascript_error',
      severity: 'high',
      message: error.message,
      stackTrace: error.stack,
      componentName,
      metadata: {
        errorName: error.name,
      }
    });
  }, [logError]);

  const logNetworkError = useCallback((url: string, status: number, statusText: string) => {
    logError({
      errorType: 'network_error',
      severity: status >= 500 ? 'high' : 'medium',
      message: `Network request failed: ${status} ${statusText}`,
      metadata: {
        url,
        status,
        statusText,
      }
    });
  }, [logError]);

  const logAuthError = useCallback((message: string, metadata?: Record<string, any>) => {
    logError({
      errorType: 'auth_error',
      severity: 'high',
      message,
      metadata,
    });
  }, [logError]);

  const logComponentError = useCallback((componentName: string, error: Error, errorInfo?: any) => {
    logError({
      errorType: 'component_error',
      severity: 'medium',
      message: error.message,
      stackTrace: error.stack,
      componentName,
      metadata: {
        errorInfo,
        componentStack: errorInfo?.componentStack,
      }
    });
  }, [logError]);

  return {
    logError,
    logJavaScriptError,
    logNetworkError,
    logAuthError,
    logComponentError,
  };
};