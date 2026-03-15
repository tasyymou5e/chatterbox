import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { cLog, cError } from '@/utils/wideLogger';

interface BehavioralEvent {
  id: string;
  user_id: string;
  family_id: string | null;
  event_type: string;
  event_category: string;
  event_data: Json;
  session_id: string | null;
  page_path: string | null;
  interaction_element: string | null;
  duration_seconds: number | null;
  device_type: string | null;
  timestamp: string;
}

interface GamificationEffectiveness {
  id: string;
  user_id: string;
  family_id: string;
  date_tracked: string;
  points_earned: number | null;
  achievements_unlocked: number | null;
  mini_games_played: number | null;
  social_interactions: number | null;
  session_length_minutes: number | null;
  engagement_score: number | null;
  motivation_level: number | null;
  feature_usage: Json;
  effectiveness_metrics: Json;
  created_at: string;
}

interface BehavioralInsights {
  engagement_score: number;
  peak_activity_time: string;
  most_used_features: Array<{ feature: string; count: number }>;
  behavioral_patterns: {
    avg_session_minutes: number;
    total_points_earned: number;
    achievements_unlocked: number;
  };
}

interface EngagementTrend {
  date: string;
  engagement_score: number;
  session_count: number;
  avg_session_length: number;
  feature_interactions: number;
}

interface FeatureUsageAnalysis {
  feature_name: string;
  usage_count: number;
  unique_users: number;
  engagement_impact: number;
  retention_correlation: number;
}

interface UserJourneyStep {
  step: string;
  user_count: number;
  completion_rate: number;
  avg_time_spent: number;
  drop_off_rate: number;
}

interface BehaviorAnalyticsState {
  // Behavioral Data
  behavioralEvents: BehavioralEvent[];
  gamificationEffectiveness: GamificationEffectiveness[];
  behavioralInsights: BehavioralInsights | null;
  
  // Analytics
  engagementTrends: EngagementTrend[];
  featureUsageAnalysis: FeatureUsageAnalysis[];
  userJourney: UserJourneyStep[];
  sessionAnalytics: Array<{ hour: number; sessions: number; avg_engagement: number }>;
  
  // Predictions & Recommendations
  churnRiskScore: number;
  recommendedFeatures: string[];
  personalizedInsights: string[];
  
  // State Management
  loading: boolean;
  error: string | null;
  
  // Actions
  trackBehavioralEvent: (event: Omit<BehavioralEvent, 'id' | 'timestamp'>) => Promise<void>;
  fetchBehavioralEvents: (userId: string, familyId?: string, daysBack?: number) => Promise<void>;
  fetchGamificationEffectiveness: (familyId: string, userId?: string, daysBack?: number) => Promise<void>;
  generateBehavioralInsights: (userId: string, daysBack?: number) => Promise<void>;
  analyzeEngagementTrends: (familyId: string, userId?: string, daysBack?: number) => Promise<void>;
  analyzeFeatureUsage: (familyId: string, daysBack?: number) => Promise<void>;
  trackUserJourney: (familyId: string, daysBack?: number) => Promise<void>;
  analyzeSessionPatterns: (userId: string, daysBack?: number) => Promise<void>;
  calculateChurnRisk: (userId: string) => Promise<void>;
  generateRecommendations: (userId: string, familyId: string) => Promise<void>;
  updateGamificationEffectiveness: (data: Omit<GamificationEffectiveness, 'id' | 'created_at'>) => Promise<void>;
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useBehaviorAnalyticsStore = create<BehaviorAnalyticsState>()(
  devtools(
    (set, get) => ({
      // Initial State
      behavioralEvents: [],
      gamificationEffectiveness: [],
      behavioralInsights: null,
      engagementTrends: [],
      featureUsageAnalysis: [],
      userJourney: [],
      sessionAnalytics: [],
      churnRiskScore: 0,
      recommendedFeatures: [],
      personalizedInsights: [],
      loading: false,
      error: null,

      // Actions
      setError: (error) => set({ error }),
      setLoading: (loading) => set({ loading }),

      trackBehavioralEvent: async (event: Omit<BehavioralEvent, 'id' | 'timestamp'>) => {
        try {
          // Check if user has given consent for behavioral tracking
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: hasConsent, error: consentError } = await supabase.rpc(
            'has_behavioral_tracking_consent', 
            { p_user_id: user.id }
          );

          if (consentError) {
            cError('Error checking tracking consent:', consentError);
            return;
          }

          if (!hasConsent) {
            cLog('Behavioral tracking skipped - user has not given consent');
            return;
          }

          const { error } = await supabase
            .from('behavioral_events')
            .insert({
              ...event,
              event_data: event.event_data as Json,
              device_type: getDeviceType()
            });

          if (error) throw error;
        } catch (err) {
          cError('Error tracking behavioral event:', err);
          set({ error: 'Failed to track behavioral event' });
        }
      },

      fetchBehavioralEvents: async (userId: string, familyId?: string, daysBack = 7) => {
        try {
          set({ loading: true, error: null });
          
          let query = supabase
            .from('behavioral_events')
            .select('id, user_id, family_id, event_type, event_category, event_data, page_path, session_id, device_type, interaction_element, duration_seconds, timestamp')
            .eq('user_id', userId)
            .gte('timestamp', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
            .order('timestamp', { ascending: false });

          if (familyId) {
            query = query.eq('family_id', familyId);
          }

          const { data, error } = await query;

          if (error) throw error;
          
          // Type cast the event_data field
          const typedData = (data || []).map(item => ({
            ...item,
            event_data: item.event_data as Json
          }));
          
          set({ behavioralEvents: typedData });
        } catch (err) {
          cError('Error fetching behavioral events:', err);
          set({ error: 'Failed to fetch behavioral events' });
        } finally {
          set({ loading: false });
        }
      },

      fetchGamificationEffectiveness: async (familyId: string, userId?: string, daysBack = 30) => {
        try {
          set({ loading: true, error: null });
          
          let query = supabase
            .from('gamification_effectiveness')
            .select('id, family_id, user_id, date_tracked, points_earned, achievements_unlocked, mini_games_played, engagement_score, motivation_level, session_length_minutes, social_interactions, feature_usage, effectiveness_metrics, created_at')
            .eq('family_id', familyId)
            .gte('date_tracked', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
            .order('date_tracked', { ascending: false });

          if (userId) {
            query = query.eq('user_id', userId);
          }

          const { data, error } = await query;

          if (error) throw error;
          
          // Type cast the feature_usage and effectiveness_metrics fields
          const typedData = (data || []).map(item => ({
            ...item,
            feature_usage: item.feature_usage as Json,
            effectiveness_metrics: item.effectiveness_metrics as Json
          }));
          
          set({ gamificationEffectiveness: typedData });
        } catch (err) {
          cError('Error fetching gamification effectiveness:', err);
          set({ error: 'Failed to fetch gamification effectiveness' });
        } finally {
          set({ loading: false });
        }
      },

      generateBehavioralInsights: async (userId: string, daysBack = 7) => {
        try {
          set({ loading: true, error: null });
          
          const { data, error } = await supabase.rpc('generate_behavioral_insights', {
            p_user_id: userId,
            p_days_back: daysBack
          });

          if (error) throw error;
          
          if (data && data.length > 0) {
            const insight = data[0];
            set({
              behavioralInsights: {
                engagement_score: insight.engagement_score || 0,
                peak_activity_time: insight.peak_activity_time || 'morning',
                most_used_features: (insight.most_used_features as Array<{ feature: string; count: number }>) || [],
                behavioral_patterns: (insight.behavioral_patterns as {
                  avg_session_minutes: number;
                  total_points_earned: number;
                  achievements_unlocked: number;
                }) || {
                  avg_session_minutes: 0,
                  total_points_earned: 0,
                  achievements_unlocked: 0
                }
              }
            });
          }
        } catch (err) {
          cError('Error generating behavioral insights:', err);
          set({ error: 'Failed to generate behavioral insights' });
        } finally {
          set({ loading: false });
        }
      },

      analyzeEngagementTrends: async (familyId: string, userId?: string, daysBack = 30) => {
        try {
          set({ loading: true, error: null });
          
          let query = supabase
            .from('gamification_effectiveness')
            .select('date_tracked, engagement_score, session_length_minutes')
            .eq('family_id', familyId)
            .gte('date_tracked', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

          if (userId) {
            query = query.eq('user_id', userId);
          }

          const { data, error } = await query;

          if (error) throw error;

          // Group by date and calculate trends
          const trendMap = new Map<string, { 
            totalEngagement: number; 
            sessionCount: number; 
            totalSessionLength: number;
            interactions: number;
          }>();
          
          data?.forEach(record => {
            const date = record.date_tracked;
            const existing = trendMap.get(date) || { 
              totalEngagement: 0, 
              sessionCount: 0, 
              totalSessionLength: 0,
              interactions: 0
            };
            existing.totalEngagement += record.engagement_score || 0;
            existing.sessionCount += 1;
            existing.totalSessionLength += record.session_length_minutes || 0;
            existing.interactions += 1;
            trendMap.set(date, existing);
          });

          const trends = Array.from(trendMap.entries()).map(([date, data]) => ({
            date,
            engagement_score: data.totalEngagement / data.sessionCount,
            session_count: data.sessionCount,
            avg_session_length: data.totalSessionLength / data.sessionCount,
            feature_interactions: data.interactions
          }));

          set({ engagementTrends: trends });
        } catch (err) {
          cError('Error analyzing engagement trends:', err);
          set({ error: 'Failed to analyze engagement trends' });
        } finally {
          set({ loading: false });
        }
      },

      analyzeFeatureUsage: async (familyId: string, daysBack = 30) => {
        try {
          set({ loading: true, error: null });
          
          const { data, error } = await supabase
            .from('behavioral_events')
            .select('event_type, user_id')
            .eq('family_id', familyId)
            .gte('timestamp', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString());

          if (error) throw error;

          // Analyze feature usage
          const featureMap = new Map<string, { count: number; users: Set<string> }>();
          
          data?.forEach(event => {
            const existing = featureMap.get(event.event_type) || { count: 0, users: new Set() };
            existing.count += 1;
            existing.users.add(event.user_id);
            featureMap.set(event.event_type, existing);
          });

          const analysis = Array.from(featureMap.entries()).map(([feature, data]) => ({
            feature_name: feature,
            usage_count: data.count,
            unique_users: data.users.size,
            engagement_impact: Math.min(data.count / 100, 1), // Normalize to 0-1
            retention_correlation: data.users.size / Math.max(data.count / 10, 1) // Simple correlation metric
          }));

          set({ featureUsageAnalysis: analysis });
        } catch (err) {
          cError('Error analyzing feature usage:', err);
          set({ error: 'Failed to analyze feature usage' });
        } finally {
          set({ loading: false });
        }
      },

      trackUserJourney: async (familyId: string, daysBack = 30) => {
        try {
          set({ loading: true, error: null });
          
          const { data, error } = await supabase
            .from('behavioral_events')
            .select('event_type, user_id, duration_seconds')
            .eq('family_id', familyId)
            .gte('timestamp', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
            .order('timestamp', { ascending: true });

          if (error) throw error;

          // Define journey steps
          const journeySteps = [
            'login',
            'dashboard_view',
            'chore_view',
            'chore_start',
            'chore_complete',
            'achievement_unlock',
            'logout'
          ];

          const stepAnalysis: UserJourneyStep[] = journeySteps.map((step, index) => {
            const stepEvents = data?.filter(event => event.event_type === step) || [];
            const uniqueUsers = new Set(stepEvents.map(e => e.user_id)).size;
            const totalUsers = new Set(data?.map(e => e.user_id) || []).size;
            
            const nextStep = journeySteps[index + 1];
            const nextStepUsers = nextStep ? 
              new Set(data?.filter(event => event.event_type === nextStep).map(e => e.user_id)).size : 0;
            
            const dropOffRate = nextStep ? 
              Math.max(0, (uniqueUsers - nextStepUsers) / Math.max(uniqueUsers, 1)) : 0;

            return {
              step,
              user_count: uniqueUsers,
              completion_rate: uniqueUsers / Math.max(totalUsers, 1),
              avg_time_spent: stepEvents.reduce((sum, e) => sum + (e.duration_seconds || 0), 0) / Math.max(stepEvents.length, 1),
              drop_off_rate: dropOffRate
            };
          });

          set({ userJourney: stepAnalysis });
        } catch (err) {
          cError('Error tracking user journey:', err);
          set({ error: 'Failed to track user journey' });
        } finally {
          set({ loading: false });
        }
      },

      analyzeSessionPatterns: async (userId: string, daysBack = 30) => {
        try {
          set({ loading: true, error: null });
          
          const { data, error } = await supabase
            .from('gamification_effectiveness')
            .select('date_tracked, session_length_minutes, engagement_score, created_at')
            .eq('user_id', userId)
            .gte('date_tracked', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

          if (error) throw error;

          // Analyze by hour of day
          const hourMap = new Map<number, { sessions: number; totalEngagement: number }>();
          
          data?.forEach(record => {
            const hour = new Date(record.created_at).getHours();
            const existing = hourMap.get(hour) || { sessions: 0, totalEngagement: 0 };
            existing.sessions += 1;
            existing.totalEngagement += record.engagement_score || 0;
            hourMap.set(hour, existing);
          });

          const sessionAnalytics = Array.from(hourMap.entries()).map(([hour, data]) => ({
            hour,
            sessions: data.sessions,
            avg_engagement: data.totalEngagement / data.sessions
          }));

          set({ sessionAnalytics });
        } catch (err) {
          cError('Error analyzing session patterns:', err);
          set({ error: 'Failed to analyze session patterns' });
        } finally {
          set({ loading: false });
        }
      },

      calculateChurnRisk: async (userId: string) => {
        try {
          const { data: recentActivity, error } = await supabase
            .from('gamification_effectiveness')
            .select('engagement_score, session_length_minutes')
            .eq('user_id', userId)
            .gte('date_tracked', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

          if (error) throw error;

          if (!recentActivity || recentActivity.length === 0) {
            set({ churnRiskScore: 0.9 }); // High risk if no recent activity
            return;
          }

          const avgEngagement = recentActivity.reduce((sum, r) => sum + (r.engagement_score || 0), 0) / recentActivity.length;
          const avgSessionLength = recentActivity.reduce((sum, r) => sum + (r.session_length_minutes || 0), 0) / recentActivity.length;
          
          // Calculate risk score (0-1, where 1 is high risk)
          let riskScore = 0;
          
          if (avgEngagement < 3) riskScore += 0.4;
          if (avgSessionLength < 5) riskScore += 0.3;
          if (recentActivity.length < 3) riskScore += 0.3;
          
          set({ churnRiskScore: Math.min(riskScore, 1) });
        } catch (err) {
          cError('Error calculating churn risk:', err);
          set({ error: 'Failed to calculate churn risk' });
        }
      },

      generateRecommendations: async (_userId: string, _familyId: string) => {
        try {
          const state = get();
          const recommendations: string[] = [];
          const insights: string[] = [];

          // Based on engagement score
          if (state.behavioralInsights?.engagement_score && state.behavioralInsights.engagement_score < 5) {
            recommendations.push('mini-games', 'achievements', 'social-features');
            insights.push('Try engaging with mini-games to boost motivation');
          }

          // Based on churn risk
          if (state.churnRiskScore > 0.7) {
            recommendations.push('streak-bonuses', 'family-challenges', 'personalized-tasks');
            insights.push('Consider setting up family challenges to increase engagement');
          }

          // Based on peak activity time
          if (state.behavioralInsights?.peak_activity_time) {
            insights.push(`You're most active in the ${state.behavioralInsights.peak_activity_time}. Schedule important tasks then!`);
          }

          set({ 
            recommendedFeatures: recommendations,
            personalizedInsights: insights
          });
        } catch (err) {
          cError('Error generating recommendations:', err);
          set({ error: 'Failed to generate recommendations' });
        }
      },

      updateGamificationEffectiveness: async (data: Omit<GamificationEffectiveness, 'id' | 'created_at'>) => {
        try {
          const { error } = await supabase
            .from('gamification_effectiveness')
            .upsert(data, {
              onConflict: 'user_id,family_id,date_tracked'
            });

          if (error) throw error;
        } catch (err) {
          cError('Error updating gamification effectiveness:', err);
          set({ error: 'Failed to update gamification effectiveness' });
        }
      }
    }),
    { name: 'BehaviorAnalyticsStore' }
  )
);

// Helper functions
function getDeviceType(): string {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('mobile')) return 'mobile';
  if (userAgent.includes('tablet')) return 'tablet';
  return 'desktop';
}