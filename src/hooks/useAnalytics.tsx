// Bridge adapter - migrated to use Zustand store internally
import { useEffect } from 'react';
import { useAnalyticsStore } from '@/stores/analyticsStore';

// Re-export interfaces for backward compatibility (matching original structure)
export interface EngagementMetric {
  metric: string;
  current_value: number;
  previous_value: number;
  change_percentage: number;
  trend: string;
}

export interface DailyAnalytics {
  date: string;
  total_users: number;
  active_users: number;
  new_signups: number;
  total_families: number;
  engagement_score: number;
}

export interface RetentionData {
  cohort_date: string;
  users_count: number;
  retention_day_1: number;
  retention_day_7: number;
  retention_day_30: number;
}

// Bridge adapter hook that uses Zustand store internally
export const useAnalytics = () => {
  const {
    engagementMetrics,
    dailyAnalytics,
    retentionData,
    loading,
    error,
    fetchEngagementMetrics,
    fetchDailyAnalytics,
    fetchRetentionData,
    refreshAnalytics
  } = useAnalyticsStore();

  // Auto-refresh data on mount and set up interval
  useEffect(() => {
    refreshAnalytics();
    
    const interval = setInterval(() => {
      refreshAnalytics();
    }, 5 * 60 * 1000); // Refresh every 5 minutes

    return () => clearInterval(interval);
  }, [refreshAnalytics]);

  return {
    engagementMetrics,
    dailyAnalytics,
    retentionData,
    loading,
    error,
    refreshAnalytics
  };
};