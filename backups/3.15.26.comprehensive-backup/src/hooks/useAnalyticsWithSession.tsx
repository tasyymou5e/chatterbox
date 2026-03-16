import { useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useAuthSessionStore } from '@/stores/authSessionStore';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import { cLog, cInfo, cWarn } from '@/utils/wideLogger';

/**
 * Hook to manage analytics with proper session synchronization.
 * Waits for hydration and session ready before fetching analytics.
 */
export const useAnalyticsWithSession = () => {
  const { sessionReady, isAdmin, loading: authLoading } = useAuthStore();
  const { isHydrated } = useAuthSessionStore();
  const analytics = useAnalyticsStore();
  
  // Track initialization state
  const hasInitializedRef = useRef(false);
  const initInProgressRef = useRef(false);

  const initializeAnalytics = useCallback(() => {
    // Wait for hydration before proceeding
    if (!isHydrated) {
      cInfo('useAnalyticsWithSession: Waiting for hydration');
      return;
    }

    // Prevent duplicate initialization
    if (initInProgressRef.current) {
      cInfo('useAnalyticsWithSession: Init already in progress');
      return;
    }

    // Only start analytics when session is ready and user is admin
    if (sessionReady && isAdmin && !authLoading) {
      if (hasInitializedRef.current) {
        cLog('useAnalyticsWithSession: Already initialized, skipping');
        return;
      }
      
      cLog('🚀 Session ready and admin confirmed, starting analytics...');
      hasInitializedRef.current = true;
      initInProgressRef.current = true;
      
      analytics.waitForSessionAndRefresh()
        .finally(() => {
          initInProgressRef.current = false;
        });
    } else if (sessionReady && !isAdmin && !authLoading) {
      cLog('❌ Session ready but user is not admin, skipping analytics');
      analytics.setError('Admin access required for analytics');
      analytics.setLoading(false);
    } else if (!sessionReady && !authLoading) {
      cLog('⏳ Session not ready yet, waiting...');
    }
  }, [sessionReady, isAdmin, authLoading, isHydrated, analytics]);

  // Reset initialization tracking when user changes
  useEffect(() => {
    if (!sessionReady || !isAdmin) {
      hasInitializedRef.current = false;
    }
  }, [sessionReady, isAdmin]);

  useEffect(() => {
    initializeAnalytics();
  }, [initializeAnalytics]);

  // Manual refresh function with guards
  const refreshAnalytics = useCallback(() => {
    if (!isHydrated || !sessionReady || !isAdmin) {
      cWarn('useAnalyticsWithSession: Cannot refresh - session not ready or not admin');
      return Promise.resolve();
    }

    if (initInProgressRef.current) {
      cInfo('useAnalyticsWithSession: Refresh skipped - init in progress');
      return Promise.resolve();
    }

    cLog('useAnalyticsWithSession: Manual refresh triggered');
    return analytics.waitForSessionAndRefresh();
  }, [isHydrated, sessionReady, isAdmin, analytics]);

  return {
    ...analytics,
    refreshAnalytics,
    sessionReady,
    isAdmin,
    authLoading,
    isHydrated
  };
};
