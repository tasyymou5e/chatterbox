import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { secureLog } from '@/utils/wideLogger';

// Circuit breaker: max 5 error reports per 10 seconds
const ERROR_RATE_LIMIT = 5;
const ERROR_RATE_WINDOW_MS = 10_000;

interface ErrorInfo {
  errorType: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  stackTrace?: string;
  componentName?: string;
  routePath?: string;
  metadata?: Record<string, unknown>;
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
  const errorTimestamps = useRef<number[]>([]);

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
      sessionId = crypto.randomUUID();
      sessionStorage.setItem('error_session_id', sessionId);
    }
    return sessionId;
  }, []);

  const logError = useCallback(async (errorInfo: ErrorInfo) => {
    // Circuit breaker: drop if too many errors in the window
    const now = Date.now();
    errorTimestamps.current = errorTimestamps.current.filter(t => now - t < ERROR_RATE_WINDOW_MS);
    if (errorTimestamps.current.length >= ERROR_RATE_LIMIT) {
      return; // silently drop
    }
    errorTimestamps.current.push(now);

    try {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Check privacy consent before logging detailed error info
      const { hasTrackingConsent } = await import('@/utils/privacySettings');
      const hasConsent = user ? await hasTrackingConsent() : false;
      
      const errorPayload = {
        ...errorInfo,
        userId: user?.id,
        sessionId: getSessionId(),
        // Only include detailed browser/device info if user consented
        browserInfo: hasConsent ? getBrowserInfo() : { userAgent: 'anonymized' },
        deviceInfo: hasConsent ? getDeviceInfo() : { screenWidth: 0, screenHeight: 0 },
        routePath: hasConsent ? window.location.pathname : '/anonymized',
        timestamp: new Date().toISOString(),
        privacyMode: !hasConsent
      };
      
      await supabase.functions.invoke('error-collector', {
        body: errorPayload
      });
    } catch (err: unknown) {
      // Fallback: secure log if error collection fails
      secureLog.error('Failed to log error to system', err, 'ErrorTracking');
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

  const logAuthError = useCallback((message: string, metadata?: Record<string, unknown>) => {
    logError({
      errorType: 'auth_error',
      severity: 'high',
      message,
      metadata,
    });
  }, [logError]);

  const logComponentError = useCallback((componentName: string, error: Error, errorInfo?: Record<string, unknown>) => {
    logError({
      errorType: 'component_error',
      severity: 'medium',
      message: error.message,
      stackTrace: error.stack,
      componentName,
      metadata: {
        componentStack: typeof errorInfo?.componentStack === 'string' ? errorInfo.componentStack : undefined,
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