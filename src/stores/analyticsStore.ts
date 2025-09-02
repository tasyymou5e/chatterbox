import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from './authStore';

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
  retryCount: number;
  instanceId: string;
  lastRetryTime: number;

  // Actions
  fetchEngagementMetrics: () => Promise<void>;
  fetchDailyAnalytics: () => Promise<void>;
  fetchRetentionData: () => Promise<void>;
  refreshAnalytics: () => Promise<void>;
  waitForSessionAndRefresh: () => Promise<void>;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  getFallbackData: () => { engagementMetrics: EngagementMetric[]; dailyAnalytics: DailyAnalytics[]; retentionData: RetentionData[] };
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
      retryCount: 0,
      instanceId: `analytics-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      lastRetryTime: 0,

      // Actions
      setError: (error) => set({ error }),
      setLoading: (loading) => set({ loading }),

      getFallbackData: () => ({
        engagementMetrics: [
          { metric: 'Active Users', current_value: 0, previous_value: 0, change_percentage: 0, trend: 'stable' },
          { metric: 'Total Logins', current_value: 0, previous_value: 0, change_percentage: 0, trend: 'stable' }
        ],
        dailyAnalytics: [],
        retentionData: []
      }),

      waitForSessionAndRefresh: async () => {
        const authStore = useAuthStore.getState();
        
        // If session is ready, proceed immediately
        if (authStore.sessionReady && authStore.isAdmin) {
          console.log('✅ Session ready, refreshing analytics');
          await get().refreshAnalytics();
          return;
        }

        // If not ready, wait and retry
        console.log('⏳ Session not ready, waiting...');
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const currentAuthState = useAuthStore.getState();
          
          if (currentAuthState.sessionReady && currentAuthState.isAdmin) {
            console.log('✅ Session ready after waiting, refreshing analytics');
            await get().refreshAnalytics();
            return;
          }
          
          attempts++;
          console.log(`⏳ Still waiting for session... (${attempts}/${maxAttempts})`);
        }

        // If we get here, session never became ready - show fallback
        console.warn('❌ Session never became ready, using fallback data');
        const fallback = get().getFallbackData();
        set({ 
          ...fallback, 
          loading: false, 
          error: 'Analytics unavailable - authentication not ready' 
        });
      },

      fetchEngagementMetrics: async () => {
        try {
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Engagement metrics timeout')), 5000)
          );
          
          const queryPromise = supabase.rpc('get_engagement_analytics', { days_back: 30 });
          const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as { data: any, error: any };
          
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
          console.log('🔄 Fetching daily analytics...');
          
          // Check session state before making RPC call
          const authState = useAuthStore.getState();
          if (!authState.sessionReady) {
            throw new Error('Session not ready for RPC calls');
          }
          
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Daily analytics timeout')), 8000)
          );
          
          const queryPromise = supabase.rpc('get_daily_analytics_for_admins', { days_back: 30 });
          const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as { data: any, error: any };
          
          if (error) {
            console.error('❌ RPC Error details:', error);
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
          
          console.log('✅ Daily analytics fetched successfully:', transformedData.length, 'records');
          set({ dailyAnalytics: transformedData, retryCount: 0 });
        } catch (err: unknown) {
          console.error('❌ Error fetching daily analytics:', err);
          const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
          
          // Enhanced retry logic with exponential backoff and instance tracking
          const state = get();
          const currentRetryCount = state.retryCount;
          const now = Date.now();
          const timeSinceLastRetry = now - state.lastRetryTime;
          const minRetryInterval = 5000; // 5 seconds minimum between retries
          
          if ((errorMsg.includes('Session not ready') || errorMsg.includes('permission denied')) && currentRetryCount < 3) {
            // Prevent too frequent retries
            if (timeSinceLastRetry < minRetryInterval) {
              console.log(`⏳ Retry blocked - waiting ${minRetryInterval - timeSinceLastRetry}ms before retry`);
              return;
            }
            
            const backoffDelay = Math.min(2000 * Math.pow(2, currentRetryCount), 30000); // Exponential backoff, max 30s
            console.log(`🔄 [${state.instanceId}] Retrying daily analytics (${currentRetryCount + 1}/3) in ${backoffDelay}ms...`);
            
            set({ 
              retryCount: currentRetryCount + 1,
              lastRetryTime: now 
            });
            
            setTimeout(() => {
              // Double-check instance ID to prevent cross-instance retries
              const currentState = get();
              if (currentState.instanceId === state.instanceId) {
                currentState.fetchDailyAnalytics();
              } else {
                console.log('🚫 Retry cancelled - instance ID mismatch');
              }
            }, backoffDelay);
            return;
          }
          
          if (errorMsg.includes('permission denied') || errorMsg.includes('Admin role required')) {
            get().setError('Access denied - admin role required for analytics');
          } else if (errorMsg.includes('daily_analytics')) {
            get().setError('Analytics data is being refreshed - please try again in a moment');
          } else {
            get().setError(`Analytics error: ${errorMsg}`);
          }
          set({ dailyAnalytics: [], retryCount: 0 });
        }
      },

      fetchRetentionData: async () => {
        try {
          // Add timeout to prevent hanging
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Retention data timeout')), 5000)
          );
          
          const queryPromise = supabase.rpc('calculate_user_retention', { days_back: 30 });
          const { data, error } = await Promise.race([queryPromise, timeoutPromise]) as { data: any, error: any };
          
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
          console.log('🔄 Starting analytics refresh...');
          set({ loading: true, error: null, retryCount: 0 });
          
          // Fetch all analytics data with individual error handling
          const results = await Promise.allSettled([
            get().fetchEngagementMetrics(),
            get().fetchDailyAnalytics(),
            get().fetchRetentionData()
          ]);

          // Log results
          results.forEach((result, index) => {
            const functionNames = ['fetchEngagementMetrics', 'fetchDailyAnalytics', 'fetchRetentionData'];
            if (result.status === 'rejected') {
              console.warn(`❌ ${functionNames[index]} failed:`, result.reason);
            } else {
              console.log(`✅ ${functionNames[index]} succeeded`);
            }
          });

          console.log('✅ Analytics refresh completed');
        } catch (err) {
          console.error('❌ Unexpected error refreshing analytics:', err);
          get().setError('Failed to refresh analytics data');
        } finally {
          set({ loading: false });
        }
      },
    }),
    { name: 'AnalyticsStore' }
  )
);