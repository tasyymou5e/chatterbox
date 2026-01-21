import { useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useAnalyticsStore } from '@/stores/analyticsStore';
import { cLog } from '@/utils/conditionalLogger';

export const useAnalyticsWithSession = () => {
  const { sessionReady, isAdmin, loading: authLoading } = useAuthStore();
  const analytics = useAnalyticsStore();

  const initializeAnalytics = useCallback(() => {
    // Only start analytics when session is ready and user is admin
    if (sessionReady && isAdmin && !authLoading) {
      cLog('🚀 Session ready and admin confirmed, starting analytics...');
      analytics.waitForSessionAndRefresh();
    } else if (sessionReady && !isAdmin && !authLoading) {
      cLog('❌ Session ready but user is not admin, skipping analytics');
      analytics.setError('Admin access required for analytics');
      analytics.setLoading(false);
    } else if (!sessionReady && !authLoading) {
      cLog('⏳ Session not ready yet, waiting...');
    }
  }, [sessionReady, isAdmin, authLoading, analytics]);

  useEffect(() => {
    initializeAnalytics();
  }, [initializeAnalytics]);

  return {
    ...analytics,
    sessionReady,
    isAdmin,
    authLoading
  };
};