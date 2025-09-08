-- Progress Analytics Tables
CREATE TABLE IF NOT EXISTS public.progress_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_id UUID NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_points INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  achievements_unlocked INTEGER DEFAULT 0,
  chores_completed_today INTEGER DEFAULT 0,
  chores_completed_week INTEGER DEFAULT 0,
  chores_completed_month INTEGER DEFAULT 0,
  streak_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.milestone_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_id UUID NOT NULL,
  milestone_type TEXT NOT NULL, -- 'level_up', 'achievement', 'streak', 'points'
  milestone_name TEXT NOT NULL,
  milestone_value INTEGER NOT NULL,
  achieved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);

-- Performance Insights Tables
CREATE TABLE IF NOT EXISTS public.task_performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_id UUID NOT NULL,
  chore_id UUID,
  assignment_id UUID,
  completion_date DATE NOT NULL,
  start_time TIME,
  completion_time TIME,
  estimated_duration INTEGER, -- in minutes
  actual_duration INTEGER, -- in minutes
  difficulty_level chore_difficulty,
  efficiency_score NUMERIC(5,2), -- calculated efficiency rating
  quality_rating INTEGER, -- 1-5 scale
  time_of_day TEXT, -- morning, afternoon, evening, night
  day_of_week INTEGER, -- 0-6 (Sunday-Saturday)
  seasonal_period TEXT, -- spring, summer, fall, winter
  performance_category TEXT, -- excellent, good, average, needs_improvement
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Behavior Analytics Tables
CREATE TABLE IF NOT EXISTS public.behavioral_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_id UUID,
  event_type TEXT NOT NULL, -- login, logout, chore_start, chore_complete, game_play, etc.
  event_category TEXT NOT NULL, -- engagement, gamification, productivity, social
  event_data JSONB DEFAULT '{}',
  session_id TEXT,
  page_path TEXT,
  interaction_element TEXT,
  duration_seconds INTEGER,
  device_type TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gamification_effectiveness (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  family_id UUID NOT NULL,
  date_tracked DATE NOT NULL DEFAULT CURRENT_DATE,
  points_earned INTEGER DEFAULT 0,
  achievements_unlocked INTEGER DEFAULT 0,
  mini_games_played INTEGER DEFAULT 0,
  social_interactions INTEGER DEFAULT 0,
  session_length_minutes INTEGER DEFAULT 0,
  engagement_score NUMERIC(5,2) DEFAULT 0,
  motivation_level INTEGER DEFAULT 5, -- 1-10 scale
  feature_usage JSONB DEFAULT '{}', -- tracks which gamification features were used
  effectiveness_metrics JSONB DEFAULT '{}', -- calculated effectiveness scores
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Analytics Insights & Recommendations
CREATE TABLE IF NOT EXISTS public.analytics_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  family_id UUID NOT NULL,
  user_id UUID, -- NULL for family-wide insights
  insight_type TEXT NOT NULL, -- progress, performance, behavior, recommendation
  insight_category TEXT NOT NULL, -- trend, pattern, anomaly, achievement, improvement
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  confidence_score NUMERIC(3,2) DEFAULT 0.5, -- 0.0-1.0
  priority TEXT DEFAULT 'medium', -- low, medium, high, critical
  actionable BOOLEAN DEFAULT true,
  recommendations JSONB DEFAULT '[]',
  supporting_data JSONB DEFAULT '{}',
  valid_from DATE DEFAULT CURRENT_DATE,
  expires_at DATE,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Comparative Benchmarks (Anonymous)
CREATE TABLE IF NOT EXISTS public.comparative_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  age_group TEXT NOT NULL, -- 3-5, 6-8, 9-12, 13-15, 16-18
  benchmark_type TEXT NOT NULL, -- chores_per_week, points_per_day, etc.
  benchmark_value NUMERIC(10,2) NOT NULL,
  percentile_rank INTEGER NOT NULL, -- 1-100
  sample_size INTEGER DEFAULT 1,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.progress_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.milestone_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.behavioral_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gamification_effectiveness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comparative_benchmarks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Progress Snapshots
CREATE POLICY "Family members can view progress snapshots"
ON public.progress_snapshots FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = progress_snapshots.family_id 
    AND fm.user_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "System can manage progress snapshots"
ON public.progress_snapshots FOR ALL
USING (
  auth.role() = 'service_role' OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- RLS Policies for Milestone Tracking
CREATE POLICY "Family members can view milestones"
ON public.milestone_tracking FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = milestone_tracking.family_id 
    AND fm.user_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "System can manage milestones"
ON public.milestone_tracking FOR ALL
USING (
  auth.role() = 'service_role' OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- RLS Policies for Task Performance Metrics
CREATE POLICY "Family members can view performance metrics"
ON public.task_performance_metrics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = task_performance_metrics.family_id 
    AND fm.user_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can insert their performance metrics"
ON public.task_performance_metrics FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = task_performance_metrics.family_id 
    AND fm.user_id = auth.uid()
  )
);

-- RLS Policies for Behavioral Events
CREATE POLICY "Users can view their behavioral events"
ON public.behavioral_events FOR SELECT
USING (
  user_id = auth.uid() OR 
  (family_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = behavioral_events.family_id 
    AND fm.user_id = auth.uid()
  )) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can insert their behavioral events"
ON public.behavioral_events FOR INSERT
WITH CHECK (
  user_id = auth.uid()
);

-- RLS Policies for Gamification Effectiveness
CREATE POLICY "Family members can view gamification data"
ON public.gamification_effectiveness FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = gamification_effectiveness.family_id 
    AND fm.user_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "System can manage gamification data"
ON public.gamification_effectiveness FOR ALL
USING (
  auth.role() = 'service_role' OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- RLS Policies for Analytics Insights
CREATE POLICY "Family members can view insights"
ON public.analytics_insights FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = analytics_insights.family_id 
    AND fm.user_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "System can manage insights"
ON public.analytics_insights FOR ALL
USING (
  auth.role() = 'service_role' OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- RLS Policies for Comparative Benchmarks
CREATE POLICY "Authenticated users can view benchmarks"
ON public.comparative_benchmarks FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Advanced Analytics Functions

-- Function to generate progress snapshots
CREATE OR REPLACE FUNCTION public.generate_progress_snapshot(p_user_id UUID, p_family_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  snapshot_id UUID;
  user_data RECORD;
BEGIN
  -- Get current user stats
  SELECT 
    COALESCE(up.current_points, 0) as points,
    COALESCE(ul.total_xp, 0) as xp,
    COALESCE(ul.current_level, 1) as level,
    COALESCE(achievement_count.count, 0) as achievements,
    COALESCE(today_chores.count, 0) as chores_today,
    COALESCE(week_chores.count, 0) as chores_week,
    COALESCE(month_chores.count, 0) as chores_month,
    COALESCE(ds.current_streak, 0) as streak
  INTO user_data
  FROM (SELECT p_user_id as user_id, p_family_id as family_id) base
  LEFT JOIN public.user_points up ON up.user_id = base.user_id AND up.family_id = base.family_id
  LEFT JOIN public.user_levels ul ON ul.user_id = base.user_id AND ul.family_id = base.family_id
  LEFT JOIN (
    SELECT user_id, family_id, COUNT(*) as count
    FROM public.user_achievements
    WHERE user_id = p_user_id AND family_id = p_family_id
  ) achievement_count ON achievement_count.user_id = base.user_id
  LEFT JOIN (
    SELECT user_id, family_id, COUNT(*) as count
    FROM public.chore_completions
    WHERE user_id = p_user_id AND family_id = p_family_id 
    AND completion_date = CURRENT_DATE
  ) today_chores ON today_chores.user_id = base.user_id
  LEFT JOIN (
    SELECT user_id, family_id, COUNT(*) as count
    FROM public.chore_completions
    WHERE user_id = p_user_id AND family_id = p_family_id 
    AND completion_date >= date_trunc('week', CURRENT_DATE)
  ) week_chores ON week_chores.user_id = base.user_id
  LEFT JOIN (
    SELECT user_id, family_id, COUNT(*) as count
    FROM public.chore_completions
    WHERE user_id = p_user_id AND family_id = p_family_id 
    AND completion_date >= date_trunc('month', CURRENT_DATE)
  ) month_chores ON month_chores.user_id = base.user_id
  LEFT JOIN public.daily_streaks ds ON ds.user_id = base.user_id AND ds.family_id = base.family_id;

  -- Insert snapshot
  INSERT INTO public.progress_snapshots (
    user_id, family_id, total_points, total_xp, current_level,
    achievements_unlocked, chores_completed_today, chores_completed_week,
    chores_completed_month, streak_count
  ) VALUES (
    p_user_id, p_family_id, user_data.points, user_data.xp, user_data.level,
    user_data.achievements, user_data.chores_today, user_data.chores_week,
    user_data.chores_month, user_data.streak
  ) RETURNING id INTO snapshot_id;

  RETURN snapshot_id;
END;
$$;

-- Function to calculate performance insights
CREATE OR REPLACE FUNCTION public.calculate_performance_insights(p_family_id UUID, p_days_back INTEGER DEFAULT 30)
RETURNS TABLE(
  insight_type TEXT,
  title TEXT,
  description TEXT,
  metric_value NUMERIC,
  trend TEXT,
  recommendations JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if user has access to family
  IF NOT (
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = p_family_id AND fm.user_id = auth.uid()
    )
  ) THEN
    RAISE EXCEPTION 'Access denied to family analytics';
  END IF;

  RETURN QUERY
  WITH performance_stats AS (
    SELECT 
      AVG(efficiency_score) as avg_efficiency,
      AVG(actual_duration) as avg_duration,
      COUNT(*) as total_tasks,
      COUNT(CASE WHEN efficiency_score > 0.8 THEN 1 END) as high_performance_tasks
    FROM public.task_performance_metrics
    WHERE family_id = p_family_id
    AND completion_date >= CURRENT_DATE - (p_days_back || ' days')::interval
  )
  SELECT 
    'performance'::TEXT,
    'Task Efficiency'::TEXT,
    CASE 
      WHEN ps.avg_efficiency > 0.8 THEN 'Excellent task efficiency - family is performing above expectations'
      WHEN ps.avg_efficiency > 0.6 THEN 'Good task efficiency with room for improvement'
      ELSE 'Task efficiency needs attention and optimization'
    END::TEXT,
    ROUND(ps.avg_efficiency * 100, 1) as metric_value,
    CASE 
      WHEN ps.avg_efficiency > 0.8 THEN 'up'
      WHEN ps.avg_efficiency > 0.6 THEN 'stable'
      ELSE 'down'
    END::TEXT,
    CASE 
      WHEN ps.avg_efficiency <= 0.6 THEN 
        jsonb_build_array('Break tasks into smaller steps', 'Provide clearer instructions', 'Adjust difficulty levels')
      WHEN ps.avg_efficiency <= 0.8 THEN
        jsonb_build_array('Celebrate high performers', 'Share best practices', 'Add time challenges')
      ELSE 
        jsonb_build_array('Maintain current strategies', 'Consider increasing difficulty', 'Add collaborative tasks')
    END
  FROM performance_stats ps
  WHERE ps.total_tasks > 0;
END;
$$;

-- Function to generate behavioral insights
CREATE OR REPLACE FUNCTION public.generate_behavioral_insights(p_user_id UUID, p_days_back INTEGER DEFAULT 7)
RETURNS TABLE(
  engagement_score NUMERIC,
  peak_activity_time TEXT,
  most_used_features JSONB,
  behavioral_patterns JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH engagement_data AS (
    SELECT 
      AVG(ge.engagement_score) as avg_engagement,
      AVG(ge.session_length_minutes) as avg_session_length,
      SUM(ge.points_earned) as total_points,
      SUM(ge.achievements_unlocked) as total_achievements
    FROM public.gamification_effectiveness ge
    WHERE ge.user_id = p_user_id
    AND ge.date_tracked >= CURRENT_DATE - (p_days_back || ' days')::interval
  ),
  activity_patterns AS (
    SELECT 
      EXTRACT(hour FROM be.timestamp) as hour_of_day,
      COUNT(*) as activity_count
    FROM public.behavioral_events be
    WHERE be.user_id = p_user_id
    AND be.timestamp >= CURRENT_DATE - (p_days_back || ' days')::interval
    GROUP BY EXTRACT(hour FROM be.timestamp)
    ORDER BY activity_count DESC
    LIMIT 1
  ),
  feature_usage AS (
    SELECT 
      be.event_type,
      COUNT(*) as usage_count
    FROM public.behavioral_events be
    WHERE be.user_id = p_user_id
    AND be.timestamp >= CURRENT_DATE - (p_days_back || ' days')::interval
    GROUP BY be.event_type
    ORDER BY usage_count DESC
  )
  SELECT 
    COALESCE(ed.avg_engagement, 0) as engagement_score,
    CASE 
      WHEN ap.hour_of_day BETWEEN 6 AND 11 THEN 'morning'
      WHEN ap.hour_of_day BETWEEN 12 AND 17 THEN 'afternoon'
      WHEN ap.hour_of_day BETWEEN 18 AND 21 THEN 'evening'
      ELSE 'night'
    END as peak_activity_time,
    COALESCE(jsonb_agg(jsonb_build_object('feature', fu.event_type, 'count', fu.usage_count)), '[]'::jsonb) as most_used_features,
    jsonb_build_object(
      'avg_session_minutes', COALESCE(ed.avg_session_length, 0),
      'total_points_earned', COALESCE(ed.total_points, 0),
      'achievements_unlocked', COALESCE(ed.total_achievements, 0)
    ) as behavioral_patterns
  FROM engagement_data ed
  CROSS JOIN activity_patterns ap
  LEFT JOIN feature_usage fu ON true
  GROUP BY ed.avg_engagement, ed.avg_session_length, ed.total_points, ed.total_achievements, ap.hour_of_day;
END;
$$;