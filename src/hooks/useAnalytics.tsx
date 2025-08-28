import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EngagementMetric {
  metric: string;
  current_value: number;
  previous_value: number;
  change_percentage: number;
  trend: string;
}

interface DailyAnalytics {
  date: string;
  daily_logins: number;
  daily_signups: number;
  active_users: number;
  unique_logins: number;
}

interface RetentionData {
  cohort_date: string;
  users_count: number;
  retention_day_1: number;
  retention_day_7: number;
  retention_day_30: number;
}

export const useAnalytics = () => {
  const [engagementMetrics, setEngagementMetrics] = useState<EngagementMetric[]>([]);
  const [dailyAnalytics, setDailyAnalytics] = useState<DailyAnalytics[]>([]);
  const [retentionData, setRetentionData] = useState<RetentionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEngagementMetrics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_engagement_analytics', { days_back: 30 });
      if (error) throw error;
      setEngagementMetrics(data || []);
    } catch (err) {
      console.error('Error fetching engagement metrics:', err);
      setError('Failed to fetch engagement metrics');
    }
  };

  const fetchDailyAnalytics = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_analytics')
        .select('*')
        .order('date', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      
      // Transform and reverse data for chronological order in charts
      const transformedData = (data || [])
        .reverse()
        .map(item => ({
          ...item,
          date: new Date(item.date).toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric' 
          })
        }));
      
      setDailyAnalytics(transformedData);
    } catch (err) {
      console.error('Error fetching daily analytics:', err);
      setError('Failed to fetch daily analytics');
    }
  };

  const fetchRetentionData = async () => {
    try {
      const { data, error } = await supabase.rpc('calculate_user_retention', { days_back: 30 });
      if (error) throw error;
      setRetentionData(data || []);
    } catch (err) {
      console.error('Error fetching retention data:', err);
      setError('Failed to fetch retention data');
    }
  };

  const refreshAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all analytics data
      await Promise.all([
        fetchEngagementMetrics(),
        fetchDailyAnalytics(),
        fetchRetentionData()
      ]);
    } catch (err) {
      console.error('Error refreshing analytics:', err);
      setError('Failed to refresh analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAnalytics();
  }, []);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(refreshAnalytics, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return {
    engagementMetrics,
    dailyAnalytics,
    retentionData,
    loading,
    error,
    refreshAnalytics
  };
};