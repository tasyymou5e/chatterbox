import { useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useAnalyticsStore } from '@/stores/analyticsStore';

export const useAnalyticsWithSession = () => {
  const { sessionReady, isAdmin, loading: authLoading } = useAuthStore();
  const analytics = useAnalyticsStore();

  useEffect(() => {
    // Only start analytics when session is ready and user is admin
    if (sessionReady && isAdmin && !authLoading) {
      console.log('🚀 Session ready and admin confirmed, starting analytics...');
      analytics.waitForSessionAndRefresh();
    } else if (sessionReady && !isAdmin && !authLoading) {
      console.log('❌ Session ready but user is not admin, skipping analytics');
      analytics.setError('Admin access required for analytics');
      analytics.setLoading(false);
    } else if (!sessionReady && !authLoading) {
      console.log('⏳ Session not ready yet, waiting...');
    }
  }, [sessionReady, isAdmin, authLoading]);

  return {
    ...analytics,
    sessionReady,
    isAdmin,
    authLoading
  };
};