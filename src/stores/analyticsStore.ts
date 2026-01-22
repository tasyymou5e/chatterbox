import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from './authStore';
import type { SupabaseRPCResult, EngagementAnalyticsRow, DailyAnalyticsRow, RetentionAnalyticsRow } from '@/types/analytics';
import { cLog, cWarn, cError } from '@/utils/conditionalLogger';

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

// Default fallback data when analytics fail to load
const DEFAULT_ENGAGEMENT_METRICS: EngagementMetric[] = [
  { metric: 'Active Users', current_value: 0, previous_value: 0, change_percentage: 0, trend: 'stable' },
  { metric: 'Total Logins', current_value: 0, previous_value: 0, change_percentage: 0, trend: 'stable' }
];

interface AnalyticsState {
  // State
  engagementMetrics: EngagementMetric[];
  dailyAnalytics: DailyAnalytics[];
  retentionData: RetentionData[];
  loading: boolean;
  error: string | null;
  retryCount: number;
  instanceId: string;
  lastRetryTime: number;
  initialized: boolean;

  // Actions
  fetchEngagementMetrics: () => Promise<void>;
  fetchDailyAnalytics: () => Promise<void>;
  fetchRetentionData: () => Promise<void>;
  refreshAnalytics: () => Promise<void>;
  waitForSessionAndRefresh: () => Promise<void>;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  resetToDefaults: () => void;
}

export const useAnalyticsStore = create<AnalyticsState>()(
  devtools(
    (set, get) => ({
      // Initial state with fallback defaults
      engagementMetrics: DEFAULT_ENGAGEMENT_METRICS,
      dailyAnalytics: [],
      retentionData: [],
      loading: false, // Start as false to prevent loading flash
      error: null,
      retryCount: 0,
      instanceId: `analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      lastRetryTime: 0,
      initialized: false,

      // Actions
      setError: (error) => set({ error }),
      setLoading: (loading) => set({ loading }),
      
      resetToDefaults: () => set({
        engagementMetrics: DEFAULT_ENGAGEMENT_METRICS,
        dailyAnalytics: [],
        retentionData: [],
        loading: false,
        error: null,
        retryCount: 0
      }),

      waitForSessionAndRefresh: async () => {
        const authStore = useAuthStore.getState();
        
        // If session is ready, proceed immediately
        if (authStore.sessionReady && authStore.isAdmin) {
          cLog('✅ Session ready, refreshing analytics');
          await get().refreshAnalytics();
          return;
        }

        // If not ready, wait and retry with shorter timeout
        cLog('⏳ Session not ready, waiting...');
        set({ loading: true });
        
        let attempts = 0;
        const maxAttempts = 5; // Reduced from 10
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 500)); // 500ms intervals
          const currentAuthState = useAuthStore.getState();
          
          if (currentAuthState.sessionReady && currentAuthState.isAdmin) {
            cLog('✅ Session ready after waiting, refreshing analytics');
            await get().refreshAnalytics();
            return;
          }
          
          attempts++;
        }

        // Session never became ready - use defaults without error
        cWarn('❌ Session timeout, using default analytics');
        set({ 
          engagementMetrics: DEFAULT_ENGAGEMENT_METRICS,
          dailyAnalytics: [],
          retentionData: [],
          loading: false, 
          error: null, // Don't show error to user, just use defaults
          initialized: true
        });
      },

      fetchEngagementMetrics: async () => {
        const { sessionReady, user, isAdmin } = useAuthStore.getState();
        
        if (!sessionReady || !user || !isAdmin) {
          // Silently use defaults if not ready
          set({ engagementMetrics: DEFAULT_ENGAGEMENT_METRICS });
          return;
        }

        try {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 8000)
          );
          
          const queryPromise = supabase.rpc('get_engagement_analytics', { days_back: 30 });
          const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as SupabaseRPCResult<EngagementAnalyticsRow[]>;
          
          if (error) {
            cWarn('Engagement metrics error:', error);
            set({ engagementMetrics: DEFAULT_ENGAGEMENT_METRICS });
            return;
          }

          set({ engagementMetrics: data && data.length > 0 ? data : DEFAULT_ENGAGEMENT_METRICS });
        } catch (err) {
          cWarn('Failed to fetch engagement metrics, using defaults');
          set({ engagementMetrics: DEFAULT_ENGAGEMENT_METRICS });
        }
      },

      fetchDailyAnalytics: async () => {
        const authState = useAuthStore.getState();
        
        if (!authState.sessionReady || !authState.isAdmin) {
          set({ dailyAnalytics: [] });
          return;
        }
        
        try {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 10000)
          );
          
          const queryPromise = supabase.rpc('get_daily_analytics_for_admins', { days_back: 30 });
          const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as SupabaseRPCResult<DailyAnalyticsRow[]>;
          
          if (error) {
            cWarn('Daily analytics error:', error);
            set({ dailyAnalytics: [] });
            return;
          }
          
          if (!data || data.length === 0) {
            set({ dailyAnalytics: [] });
            return;
          }
          
          // Transform data for charts
          const transformedData: DailyAnalytics[] = (data || [])
            .reverse()
            .map((item) => ({
              date: new Date(item.date).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              }),
              total_users: item.total_users,
              active_users: item.active_users,
              new_signups: item.new_signups,
              total_families: item.total_families,
              engagement_score: item.engagement_score,
            }));
          
          set({ dailyAnalytics: transformedData, retryCount: 0 });
        } catch (err) {
          cWarn('Daily analytics fetch failed, using empty data');
          set({ dailyAnalytics: [] });
        }
      },

      fetchRetentionData: async () => {
        try {
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 5000)
          );
          
          const queryPromise = supabase.rpc('calculate_user_retention', { days_back: 30 });
          const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as SupabaseRPCResult<RetentionAnalyticsRow[]>;
          
          if (error) {
            set({ retentionData: [] });
            return;
          }
          
          set({ retentionData: data || [] });
        } catch (err) {
          set({ retentionData: [] });
        }
      },

      refreshAnalytics: async () => {
        const state = get();
        
        // Prevent multiple simultaneous refreshes
        if (state.loading && state.initialized) {
          cLog('Analytics refresh already in progress');
          return;
        }
        
        try {
          cLog('🔄 Starting analytics refresh...');
          set({ loading: true, error: null, retryCount: 0 });
          
          // Fetch all analytics data with individual error handling
          await Promise.allSettled([
            get().fetchEngagementMetrics(),
            get().fetchDailyAnalytics(),
            get().fetchRetentionData()
          ]);

          cLog('✅ Analytics refresh completed');
          set({ initialized: true });
        } catch (err) {
          cError('Analytics refresh error:', err);
          // Don't set error - just use whatever data we have
        } finally {
          set({ loading: false });
        }
      },
    }),
    { name: 'AnalyticsStore' }
  )
);
