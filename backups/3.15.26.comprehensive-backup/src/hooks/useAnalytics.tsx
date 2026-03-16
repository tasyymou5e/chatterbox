// Bridge adapter - migrated to use Zustand store internally  
import { useAnalyticsStore } from '@/stores/analyticsStore';

export const useAnalytics = () => {
  const analytics = useAnalyticsStore();
  return analytics;
};