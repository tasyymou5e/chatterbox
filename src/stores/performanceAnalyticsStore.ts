import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';

interface TaskPerformanceMetric {
  id: string;
  user_id: string;
  family_id: string;
  chore_id: string | null;
  assignment_id: string | null;
  completion_date: string;
  start_time: string | null;
  completion_time: string | null;
  estimated_duration: number | null;
  actual_duration: number | null;
  difficulty_level: string | null;
  efficiency_score: number | null;
  quality_rating: number | null;
  time_of_day: string | null;
  day_of_week: number | null;
  seasonal_period: string | null;
  performance_category: string | null;
  metadata: Json;
  created_at: string;
}

interface PerformanceInsight {
  insight_type: string;
  title: string;
  description: string;
  metric_value: number;
  trend: string;
  recommendations: string[];
}

interface ProductivityPattern {
  time_period: string;
  completion_rate: number;
  average_efficiency: number;
  task_count: number;
  peak_hours: string[];
}

interface TaskCompletionPattern {
  task_type: string;
  completion_rate: number;
  average_duration: number;
  efficiency_trend: 'improving' | 'declining' | 'stable';
  difficulty_correlation: number;
}

interface PerformanceAnalyticsState {
  // Performance Data
  performanceMetrics: TaskPerformanceMetric[];
  performanceInsights: PerformanceInsight[];
  productivityPatterns: ProductivityPattern[];
  taskCompletionPatterns: TaskCompletionPattern[];
  
  // Analytics
  efficiencyTrends: Array<{ date: string; efficiency: number; task_count: number }>;
  timeOfDayAnalysis: Array<{ hour: number; efficiency: number; task_count: number }>;
  difficultyAnalysis: Array<{ difficulty: string; efficiency: number; completion_rate: number }>;
  
  // State Management
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchPerformanceMetrics: (familyId: string, userId?: string, daysBack?: number) => Promise<void>;
  calculatePerformanceInsights: (familyId: string, daysBack?: number) => Promise<void>;
  analyzeProductivityPatterns: (familyId: string, userId?: string) => Promise<void>;
  analyzeTaskCompletionPatterns: (familyId: string, userId?: string) => Promise<void>;
  trackTaskPerformance: (metric: Omit<TaskPerformanceMetric, 'id' | 'created_at'>) => Promise<void>;
  calculateEfficiencyTrends: (familyId: string, userId?: string, daysBack?: number) => Promise<void>;
  analyzeTimeOfDay: (familyId: string, userId?: string) => Promise<void>;
  analyzeDifficultyCorrelation: (familyId: string, userId?: string) => Promise<void>;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const usePerformanceAnalyticsStore = create<PerformanceAnalyticsState>()(
  devtools(
    (set, _get) => ({
      // Initial State
      performanceMetrics: [],
      performanceInsights: [],
      productivityPatterns: [],
      taskCompletionPatterns: [],
      efficiencyTrends: [],
      timeOfDayAnalysis: [],
      difficultyAnalysis: [],
      loading: false,
      error: null,

      // Actions
      setError: (error) => set({ error }),
      setLoading: (loading) => set({ loading }),

      fetchPerformanceMetrics: async (familyId: string, userId?: string, daysBack = 30) => {
        try {
          set({ loading: true, error: null });
          
          let query = supabase
            .from('task_performance_metrics')
            .select('*')
            .eq('family_id', familyId)
            .gte('completion_date', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('completion_date', { ascending: false });

          if (userId) {
            query = query.eq('user_id', userId);
          }

          const { data, error } = await query;

          if (error) throw error;
          
          // Type cast the metadata field
          const typedData = (data || []).map(item => ({
            ...item,
            metadata: item.metadata as Json
          }));
          
          set({ performanceMetrics: typedData });
        } catch (err) {
          console.error('Error fetching performance metrics:', err);
          set({ error: 'Failed to fetch performance metrics' });
        } finally {
          set({ loading: false });
        }
      },

      calculatePerformanceInsights: async (familyId: string, daysBack = 30) => {
        try {
          set({ loading: true, error: null });
          
          const { data, error } = await supabase.rpc('calculate_performance_insights', {
            p_family_id: familyId,
            p_days_back: daysBack
          });

          if (error) throw error;
          
          const insights: PerformanceInsight[] = data?.map((insight) => ({
            insight_type: insight.insight_type,
            title: insight.title,
            description: insight.description,
            metric_value: insight.metric_value,
            trend: insight.trend,
            recommendations: Array.isArray(insight.recommendations) 
              ? (insight.recommendations as string[]) 
              : []
          })) || [];

          set({ performanceInsights: insights });
        } catch (err) {
          console.error('Error calculating performance insights:', err);
          set({ error: 'Failed to calculate performance insights' });
        } finally {
          set({ loading: false });
        }
      },

      analyzeProductivityPatterns: async (familyId: string, userId?: string) => {
        try {
          set({ loading: true, error: null });
          
          let query = supabase
            .from('task_performance_metrics')
            .select('*')
            .eq('family_id', familyId);

          if (userId) {
            query = query.eq('user_id', userId);
          }

          const { data, error } = await query;

          if (error) throw error;

          // Analyze patterns by time of day
          const patterns: ProductivityPattern[] = [];
          const timeGroups = ['morning', 'afternoon', 'evening', 'night'];
          
          timeGroups.forEach(timeGroup => {
            const timeData = data?.filter(metric => metric.time_of_day === timeGroup) || [];
            if (timeData.length > 0) {
              const avgEfficiency = timeData.reduce((sum, m) => sum + (m.efficiency_score || 0), 0) / timeData.length;
              const completionRate = timeData.filter(m => m.efficiency_score && m.efficiency_score > 0.7).length / timeData.length;
              
              patterns.push({
                time_period: timeGroup,
                completion_rate: completionRate,
                average_efficiency: avgEfficiency,
                task_count: timeData.length,
                peak_hours: [`${timeGroup} hours`]
              });
            }
          });

          set({ productivityPatterns: patterns });
        } catch (err) {
          console.error('Error analyzing productivity patterns:', err);
          set({ error: 'Failed to analyze productivity patterns' });
        } finally {
          set({ loading: false });
        }
      },

      analyzeTaskCompletionPatterns: async (familyId: string, userId?: string) => {
        try {
          set({ loading: true, error: null });
          
          let query = supabase
            .from('task_performance_metrics')
            .select('*')
            .eq('family_id', familyId);

          if (userId) {
            query = query.eq('user_id', userId);
          }

          const { data, error } = await query;

          if (error) throw error;

          // Analyze patterns by difficulty
          const patterns: TaskCompletionPattern[] = [];
          const difficulties = ['easy', 'medium', 'hard'];
          
          difficulties.forEach(difficulty => {
            const difficultyData = data?.filter(metric => metric.difficulty_level === difficulty) || [];
            if (difficultyData.length > 0) {
              const completionRate = difficultyData.filter(m => m.efficiency_score && m.efficiency_score > 0.5).length / difficultyData.length;
              const avgDuration = difficultyData.reduce((sum, m) => sum + (m.actual_duration || 0), 0) / difficultyData.length;
              
              patterns.push({
                task_type: `${difficulty} tasks`,
                completion_rate: completionRate,
                average_duration: avgDuration,
                efficiency_trend: completionRate > 0.8 ? 'improving' : completionRate > 0.6 ? 'stable' : 'declining',
                difficulty_correlation: completionRate
              });
            }
          });

          set({ taskCompletionPatterns: patterns });
        } catch (err) {
          console.error('Error analyzing task completion patterns:', err);
          set({ error: 'Failed to analyze task completion patterns' });
        } finally {
          set({ loading: false });
        }
      },

      trackTaskPerformance: async (metric: Omit<TaskPerformanceMetric, 'id' | 'created_at'>) => {
        try {
          const { error } = await supabase
            .from('task_performance_metrics')
            .insert([{
              user_id: metric.user_id,
              family_id: metric.family_id,
              chore_id: metric.chore_id || null,
              assignment_id: metric.assignment_id || null,
              completion_date: metric.completion_date,
              start_time: metric.start_time || null,
              completion_time: metric.completion_time || null,
              estimated_duration: metric.estimated_duration || null,
              actual_duration: metric.actual_duration || null,
              difficulty_level: metric.difficulty_level as 'easy' | 'medium' | 'hard',
              efficiency_score: metric.efficiency_score || null,
              quality_rating: metric.quality_rating || null,
              time_of_day: metric.time_of_day || null,
              day_of_week: new Date(metric.completion_date).getDay(),
              seasonal_period: getCurrentSeason(),
              performance_category: calculatePerformanceCategory(metric.efficiency_score),
              metadata: (metric.metadata || {}) as Json
            }]);

          if (error) throw error;
        } catch (err) {
          console.error('Error tracking task performance:', err);
          set({ error: 'Failed to track task performance' });
        }
      },

      calculateEfficiencyTrends: async (familyId: string, userId?: string, daysBack = 30) => {
        try {
          set({ loading: true, error: null });
          
          let query = supabase
            .from('task_performance_metrics')
            .select('completion_date, efficiency_score')
            .eq('family_id', familyId)
            .gte('completion_date', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .not('efficiency_score', 'is', null);

          if (userId) {
            query = query.eq('user_id', userId);
          }

          const { data, error } = await query;

          if (error) throw error;

          // Group by date and calculate averages
          const trendMap = new Map<string, { totalEfficiency: number; count: number }>();
          
          data?.forEach(metric => {
            const date = metric.completion_date;
            const existing = trendMap.get(date) || { totalEfficiency: 0, count: 0 };
            existing.totalEfficiency += metric.efficiency_score || 0;
            existing.count += 1;
            trendMap.set(date, existing);
          });

          const trends = Array.from(trendMap.entries()).map(([date, data]) => ({
            date,
            efficiency: data.totalEfficiency / data.count,
            task_count: data.count
          }));

          set({ efficiencyTrends: trends });
        } catch (err) {
          console.error('Error calculating efficiency trends:', err);
          set({ error: 'Failed to calculate efficiency trends' });
        } finally {
          set({ loading: false });
        }
      },

      analyzeTimeOfDay: async (familyId: string, userId?: string) => {
        try {
          set({ loading: true, error: null });
          
          let query = supabase
            .from('task_performance_metrics')
            .select('start_time, efficiency_score')
            .eq('family_id', familyId)
            .not('start_time', 'is', null)
            .not('efficiency_score', 'is', null);

          if (userId) {
            query = query.eq('user_id', userId);
          }

          const { data, error } = await query;

          if (error) throw error;

          // Group by hour
          const hourMap = new Map<number, { totalEfficiency: number; count: number }>();
          
          data?.forEach(metric => {
            const hour = parseInt(metric.start_time!.split(':')[0]);
            const existing = hourMap.get(hour) || { totalEfficiency: 0, count: 0 };
            existing.totalEfficiency += metric.efficiency_score || 0;
            existing.count += 1;
            hourMap.set(hour, existing);
          });

          const analysis = Array.from(hourMap.entries()).map(([hour, data]) => ({
            hour,
            efficiency: data.totalEfficiency / data.count,
            task_count: data.count
          }));

          set({ timeOfDayAnalysis: analysis });
        } catch (err) {
          console.error('Error analyzing time of day patterns:', err);
          set({ error: 'Failed to analyze time of day patterns' });
        } finally {
          set({ loading: false });
        }
      },

      analyzeDifficultyCorrelation: async (familyId: string, userId?: string) => {
        try {
          set({ loading: true, error: null });
          
          let query = supabase
            .from('task_performance_metrics')
            .select('difficulty_level, efficiency_score')
            .eq('family_id', familyId)
            .not('efficiency_score', 'is', null);

          if (userId) {
            query = query.eq('user_id', userId);
          }

          const { data, error } = await query;

          if (error) throw error;

          // Group by difficulty
          const difficultyMap = new Map<string, { totalEfficiency: number; count: number; completed: number }>();
          
          data?.forEach(metric => {
            const difficulty = metric.difficulty_level ?? 'unknown';
            const existing = difficultyMap.get(difficulty) || { totalEfficiency: 0, count: 0, completed: 0 };
            existing.totalEfficiency += metric.efficiency_score || 0;
            existing.count += 1;
            if ((metric.efficiency_score || 0) > 0.5) existing.completed += 1;
            difficultyMap.set(difficulty, existing);
          });

          const analysis = Array.from(difficultyMap.entries()).map(([difficulty, data]) => ({
            difficulty,
            efficiency: data.totalEfficiency / data.count,
            completion_rate: data.completed / data.count
          }));

          set({ difficultyAnalysis: analysis });
        } catch (err) {
          console.error('Error analyzing difficulty correlation:', err);
          set({ error: 'Failed to analyze difficulty correlation' });
        } finally {
          set({ loading: false });
        }
      }
    }),
    { name: 'PerformanceAnalyticsStore' }
  )
);

// Helper functions
function getCurrentSeason(): string {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

function calculatePerformanceCategory(efficiency?: number | null): string {
  if (!efficiency) return 'needs_improvement';
  if (efficiency >= 0.9) return 'excellent';
  if (efficiency >= 0.7) return 'good';
  if (efficiency >= 0.5) return 'average';
  return 'needs_improvement';
}