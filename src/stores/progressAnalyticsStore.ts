import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';

interface ProgressSnapshot {
  id: string;
  user_id: string;
  family_id: string;
  snapshot_date: string;
  total_points: number;
  total_xp: number;
  current_level: number;
  achievements_unlocked: number;
  chores_completed_today: number;
  chores_completed_week: number;
  chores_completed_month: number;
  streak_count: number;
  metadata: Record<string, any>;
  created_at: string;
}

interface Milestone {
  id: string;
  user_id: string;
  family_id: string;
  milestone_type: string;
  milestone_name: string;
  milestone_value: number;
  achieved_at: string;
  metadata: Record<string, any>;
}

interface ProgressTrend {
  date: string;
  points: number;
  xp: number;
  level: number;
  achievements: number;
  streak: number;
}

interface FamilyProgressSummary {
  family_id: string;
  total_members: number;
  active_members: number;
  total_points: number;
  total_achievements: number;
  average_level: number;
  completion_rate: number;
  top_performers: Array<{
    user_id: string;
    name: string;
    points: number;
    level: number;
  }>;
}

interface ProgressAnalyticsState {
  // Progress Data
  progressSnapshots: ProgressSnapshot[];
  milestones: Milestone[];
  progressTrends: ProgressTrend[];
  familyProgress: FamilyProgressSummary | null;
  
  // Individual Progress
  individualProgress: Record<string, ProgressTrend[]>;
  
  // State Management
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchProgressSnapshots: (familyId: string, userId?: string, daysBack?: number) => Promise<void>;
  fetchMilestones: (familyId: string, userId?: string) => Promise<void>;
  generateProgressSnapshot: (userId: string, familyId: string) => Promise<string | null>;
  calculateProgressTrends: (familyId: string, daysBack?: number) => Promise<void>;
  fetchFamilyProgressSummary: (familyId: string) => Promise<void>;
  fetchIndividualProgress: (userId: string, familyId: string, daysBack?: number) => Promise<void>;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useProgressAnalyticsStore = create<ProgressAnalyticsState>()(
  devtools(
    (set, get) => ({
      // Initial State
      progressSnapshots: [],
      milestones: [],
      progressTrends: [],
      familyProgress: null,
      individualProgress: {},
      loading: false,
      error: null,

      // Actions
      setError: (error) => set({ error }),
      setLoading: (loading) => set({ loading }),

      fetchProgressSnapshots: async (familyId: string, userId?: string, daysBack = 30) => {
        try {
          set({ loading: true, error: null });
          
          let query = supabase
            .from('progress_snapshots')
            .select('*')
            .eq('family_id', familyId)
            .gte('snapshot_date', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('snapshot_date', { ascending: false });

          if (userId) {
            query = query.eq('user_id', userId);
          }

          const { data, error } = await query;

          if (error) throw error;
          
          // Type cast the metadata field
          const typedData = (data || []).map(item => ({
            ...item,
            metadata: item.metadata as Record<string, any>
          }));
          
          set({ progressSnapshots: typedData });
        } catch (err) {
          console.error('Error fetching progress snapshots:', err);
          set({ error: 'Failed to fetch progress snapshots' });
        } finally {
          set({ loading: false });
        }
      },

      fetchMilestones: async (familyId: string, userId?: string) => {
        try {
          set({ loading: true, error: null });
          
          let query = supabase
            .from('milestone_tracking')
            .select('*')
            .eq('family_id', familyId)
            .order('achieved_at', { ascending: false })
            .limit(50);

          if (userId) {
            query = query.eq('user_id', userId);
          }

          const { data, error } = await query;

          if (error) throw error;
          
          // Type cast the metadata field
          const typedData = (data || []).map(item => ({
            ...item,
            metadata: item.metadata as Record<string, any>
          }));
          
          set({ milestones: typedData });
        } catch (err) {
          console.error('Error fetching milestones:', err);
          set({ error: 'Failed to fetch milestones' });
        } finally {
          set({ loading: false });
        }
      },

      generateProgressSnapshot: async (userId: string, familyId: string) => {
        try {
          const { data, error } = await supabase.rpc('generate_progress_snapshot', {
            p_user_id: userId,
            p_family_id: familyId
          });

          if (error) throw error;
          return data;
        } catch (err) {
          console.error('Error generating progress snapshot:', err);
          set({ error: 'Failed to generate progress snapshot' });
          return null;
        }
      },

      calculateProgressTrends: async (familyId: string, daysBack = 30) => {
        try {
          set({ loading: true, error: null });
          
          // Get progress snapshots and calculate trends
          const { data: snapshots, error } = await supabase
            .from('progress_snapshots')
            .select('*')
            .eq('family_id', familyId)
            .gte('snapshot_date', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('snapshot_date', { ascending: true });

          if (error) throw error;

          // Aggregate by date
          const trendMap = new Map<string, ProgressTrend>();
          
          snapshots?.forEach(snapshot => {
            const date = snapshot.snapshot_date;
            const existing = trendMap.get(date) || {
              date,
              points: 0,
              xp: 0,
              level: 0,
              achievements: 0,
              streak: 0
            };
            
            existing.points += snapshot.total_points;
            existing.xp += snapshot.total_xp;
            existing.level = Math.max(existing.level, snapshot.current_level);
            existing.achievements += snapshot.achievements_unlocked;
            existing.streak = Math.max(existing.streak, snapshot.streak_count);
            
            trendMap.set(date, existing);
          });

          const trends = Array.from(trendMap.values());
          set({ progressTrends: trends });
        } catch (err) {
          console.error('Error calculating progress trends:', err);
          set({ error: 'Failed to calculate progress trends' });
        } finally {
          set({ loading: false });
        }
      },

      fetchFamilyProgressSummary: async (familyId: string) => {
        try {
          set({ loading: true, error: null });
          
          // Fetch family members and their profiles
          const { data: members, error: membersError } = await supabase
            .from('family_members')
            .select('user_id')
            .eq('family_id', familyId);
          
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name');
          
          if (profilesError) throw profilesError;

          if (membersError) throw membersError;

          // Get latest progress snapshots for all members
          const { data: latestSnapshots, error: snapshotsError } = await supabase
            .from('progress_snapshots')
            .select('*')
            .eq('family_id', familyId)
            .eq('snapshot_date', new Date().toISOString().split('T')[0]);

          if (snapshotsError) throw snapshotsError;

          const summary: FamilyProgressSummary = {
            family_id: familyId,
            total_members: members?.length || 0,
            active_members: latestSnapshots?.length || 0,
            total_points: latestSnapshots?.reduce((sum, s) => sum + s.total_points, 0) || 0,
            total_achievements: latestSnapshots?.reduce((sum, s) => sum + s.achievements_unlocked, 0) || 0,
            average_level: latestSnapshots?.length ? 
              latestSnapshots.reduce((sum, s) => sum + s.current_level, 0) / latestSnapshots.length : 0,
            completion_rate: members?.length ? 
              (latestSnapshots?.length || 0) / members.length : 0,
            top_performers: latestSnapshots
              ?.sort((a, b) => b.total_points - a.total_points)
              .slice(0, 5)
              .map(snapshot => {
                const profile = profiles?.find(p => p.user_id === snapshot.user_id);
                return {
                  user_id: snapshot.user_id,
                  name: profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown' : 'Unknown',
                  points: snapshot.total_points,
                  level: snapshot.current_level
                };
              }) || []
          };

          set({ familyProgress: summary });
        } catch (err) {
          console.error('Error fetching family progress summary:', err);
          set({ error: 'Failed to fetch family progress summary' });
        } finally {
          set({ loading: false });
        }
      },

      fetchIndividualProgress: async (userId: string, familyId: string, daysBack = 30) => {
        try {
          set({ loading: true, error: null });
          
          const { data: snapshots, error } = await supabase
            .from('progress_snapshots')
            .select('*')
            .eq('user_id', userId)
            .eq('family_id', familyId)
            .gte('snapshot_date', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('snapshot_date', { ascending: true });

          if (error) throw error;

          const trends: ProgressTrend[] = snapshots?.map(snapshot => ({
            date: snapshot.snapshot_date,
            points: snapshot.total_points,
            xp: snapshot.total_xp,
            level: snapshot.current_level,
            achievements: snapshot.achievements_unlocked,
            streak: snapshot.streak_count
          })) || [];

          set({ 
            individualProgress: {
              ...get().individualProgress,
              [userId]: trends
            }
          });
        } catch (err) {
          console.error('Error fetching individual progress:', err);
          set({ error: 'Failed to fetch individual progress' });
        } finally {
          set({ loading: false });
        }
      }
    }),
    { name: 'ProgressAnalyticsStore' }
  )
);