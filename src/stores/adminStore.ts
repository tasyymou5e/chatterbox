import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import { useSystemHealthStore } from './systemHealthStore';

interface AdminState {
  // System metrics
  systemMetrics: any[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchSystemMetrics: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAdminStore = create<AdminState>()(
  devtools(
    (set, get) => ({
      // Initial state
      systemMetrics: [],
      loading: false,
      error: null,

      // Actions
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),

      fetchSystemMetrics: async () => {
        try {
          set({ loading: true, error: null });

          // Fetch system health from dedicated store
          const healthStore = useSystemHealthStore.getState();
          await healthStore.fetchSystemHealth();

          // Transform health metrics to admin format
          const healthMetrics = healthStore.metrics.map(metric => ({
            name: metric.service_name,
            status: metric.status,
            responseTime: metric.response_time,
            uptime: metric.uptime_percentage,
            errorRate: metric.error_rate,
            metadata: metric.metadata
          }));

          set({ 
            systemMetrics: healthMetrics,
            loading: false 
          });

        } catch (error: any) {
          console.error('Error fetching system metrics:', error);
          set({ 
            error: `Failed to fetch system metrics: ${error.message}`,
            loading: false,
            systemMetrics: [] 
          });
        }
      },
    }),
    { name: 'AdminStore' }
  )
);