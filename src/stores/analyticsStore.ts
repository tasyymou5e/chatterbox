import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
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
  total_users: number;
  active_users: number;
  new_signups: number;
  total_families: number;
  engagement_score: number;
}

interface RetentionData {
  cohort_date: string;
  users_count: number;
  retention_day_1: number;
  retention_day_7: number;
  retention_day_30: number;
}

interface AnalyticsState {
  // State
  engagementMetrics: EngagementMetric[];
  dailyAnalytics: DailyAnalytics[];
  retentionData: RetentionData[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchEngagementMetrics: () => Promise<void>;
  fetchDailyAnalytics: () => Promise<void>;
  fetchRetentionData: () => Promise<void>;
  refreshAnalytics: () => Promise<void>;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAnalyticsStore = create<AnalyticsState>()(
  devtools(
    (set, get) => ({
      // Initial state
      engagementMetrics: [],
      dailyAnalytics: [],
      retentionData: [],
      loading: true,
      error: null,

      // Actions
      setError: (error) => set({ error }),
      setLoading: (loading) => set({ loading }),

      fetchEngagementMetrics: async () => {
        try {
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Engagement metrics timeout')), 5000)
          );
          
          const queryPromise = supabase.rpc('get_engagement_analytics', { days_back: 30 });
          const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
          
          if (error) throw error;
          set({ engagementMetrics: data || [] });
        } catch (err) {
          console.error('Error fetching engagement metrics:', err);
          get().setError('Failed to fetch engagement metrics');
          set({ engagementMetrics: [] });
        }
      },

      fetchDailyAnalytics: async () => {
        try {
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Daily analytics timeout')), 5000)
          );
          
          const queryPromise = supabase.rpc('get_daily_analytics_for_admins', { days_back: 30 });
          const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
          
          if (error) {
            console.error('RPC Error details:', error);
            if (error.code === '42883') {
              console.log('Function does not exist, this is expected in some environments');
              set({ dailyAnalytics: [] });
              return;
            }
            throw new Error(`Analytics RPC failed: ${error.message}`);
          }
          
          if (!data || data.length === 0) {
            console.warn('No analytics data returned from RPC');
            set({ dailyAnalytics: [] });
            return;
          }
          
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
          
          set({ dailyAnalytics: transformedData });
        } catch (err: any) {
          console.error('Error fetching daily analytics:', err);
          const errorMsg = err?.message || 'Unknown error occurred';
          if (errorMsg.includes('permission denied') || errorMsg.includes('Admin role required')) {
            get().setError('Access denied - admin role required for analytics');
          } else if (errorMsg.includes('daily_analytics')) {
            get().setError('Analytics data is being refreshed - please try again in a moment');
          } else {
            get().setError(`Analytics error: ${errorMsg}`);
          }
          set({ dailyAnalytics: [] });
        }
      },

      fetchRetentionData: async () => {
        try {
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Retention data timeout')), 5000)
          );
          
          const queryPromise = supabase.rpc('calculate_user_retention', { days_back: 30 });
          const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as any;
          
          if (error) throw error;
          set({ retentionData: data || [] });
        } catch (err) {
          console.error('Error fetching retention data:', err);
          get().setError('Failed to fetch retention data');
          set({ retentionData: [] });
        }
      },

      refreshAnalytics: async () => {
        try {
          set({ loading: true, error: null });
          
          // Fetch all analytics data
          await Promise.all([
            get().fetchEngagementMetrics(),
            get().fetchDailyAnalytics(),
            get().fetchRetentionData()
          ]);
        } catch (err) {
          console.error('Error refreshing analytics:', err);
          get().setError('Failed to refresh analytics data');
        } finally {
          set({ loading: false });
        }
      },
    }),
    { name: 'AnalyticsStore' }
  )
);