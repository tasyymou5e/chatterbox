-- Create analytics metrics table for storing calculated KPIs
CREATE TABLE public.analytics_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name text NOT NULL,
  metric_value numeric NOT NULL,
  metric_type text NOT NULL, -- 'count', 'percentage', 'rate', 'duration'
  date_recorded date NOT NULL DEFAULT current_date,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create system health metrics table
CREATE TABLE public.system_health_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL, -- 'database', 'auth', 'storage', 'api'
  status text NOT NULL, -- 'healthy', 'degraded', 'down'
  response_time numeric, -- in milliseconds
  error_rate numeric, -- percentage
  uptime_percentage numeric,
  timestamp timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- Create engagement metrics table
CREATE TABLE public.engagement_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  family_id uuid,
  session_duration integer, -- in minutes
  pages_visited integer,
  actions_performed integer,
  engagement_score numeric, -- calculated score 0-100
  date_recorded date DEFAULT current_date,
  created_at timestamp with time zone DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

-- Enable RLS on new tables
ALTER TABLE public.analytics_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engagement_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for admin access only
CREATE POLICY "Admins can view all analytics metrics" 
ON public.analytics_metrics 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert analytics metrics" 
ON public.analytics_metrics 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can view system health metrics" 
ON public.system_health_metrics 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage health metrics" 
ON public.system_health_metrics 
FOR ALL 
USING (true);

CREATE POLICY "Admins can view engagement metrics" 
ON public.engagement_metrics 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert engagement metrics" 
ON public.engagement_metrics 
FOR INSERT 
WITH CHECK (true);

-- Create materialized view for daily analytics (fixed)
CREATE MATERIALIZED VIEW public.daily_analytics AS
SELECT 
  date_trunc('day', created_at)::date as date,
  COUNT(*) FILTER (WHERE activity_type = 'login') as daily_logins,
  COUNT(*) FILTER (WHERE activity_type = 'signup') as daily_signups,
  COUNT(DISTINCT user_id) as active_users,
  COUNT(DISTINCT user_id) FILTER (WHERE activity_type = 'login') as unique_logins
FROM public.user_activity_logs 
WHERE created_at >= current_date - interval '90 days'
GROUP BY date_trunc('day', created_at)
ORDER BY date DESC;

-- Create function to calculate user retention
CREATE OR REPLACE FUNCTION public.calculate_user_retention(days_back integer DEFAULT 30)
RETURNS TABLE (
  cohort_date date,
  users_count integer,
  retention_day_1 numeric,
  retention_day_7 numeric,
  retention_day_30 numeric
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH cohorts AS (
    SELECT 
      date_trunc('day', p.created_at)::date as cohort_date,
      p.user_id,
      p.created_at
    FROM public.profiles p
    WHERE p.created_at >= current_date - interval '90 days'
  )
  SELECT 
    c.cohort_date,
    COUNT(DISTINCT c.user_id)::integer as users_count,
    COALESCE(ROUND(
      COUNT(DISTINCT CASE 
        WHEN EXISTS (
          SELECT 1 FROM public.user_activity_logs ual 
          WHERE ual.user_id = c.user_id 
          AND ual.created_at::date = c.cohort_date + interval '1 day'
        ) THEN c.user_id 
      END) * 100.0 / NULLIF(COUNT(DISTINCT c.user_id), 0), 2
    ), 0) as retention_day_1,
    COALESCE(ROUND(
      COUNT(DISTINCT CASE 
        WHEN EXISTS (
          SELECT 1 FROM public.user_activity_logs ual 
          WHERE ual.user_id = c.user_id 
          AND ual.created_at::date = c.cohort_date + interval '7 days'
        ) THEN c.user_id 
      END) * 100.0 / NULLIF(COUNT(DISTINCT c.user_id), 0), 2
    ), 0) as retention_day_7,
    COALESCE(ROUND(
      COUNT(DISTINCT CASE 
        WHEN EXISTS (
          SELECT 1 FROM public.user_activity_logs ual 
          WHERE ual.user_id = c.user_id 
          AND ual.created_at::date = c.cohort_date + interval '30 days'
        ) THEN c.user_id 
      END) * 100.0 / NULLIF(COUNT(DISTINCT c.user_id), 0), 2
    ), 0) as retention_day_30
  FROM cohorts c
  GROUP BY c.cohort_date
  ORDER BY c.cohort_date DESC;
END;
$$;

-- Create function to get engagement analytics
CREATE OR REPLACE FUNCTION public.get_engagement_analytics(days_back integer DEFAULT 30)
RETURNS TABLE (
  metric text,
  current_value numeric,
  previous_value numeric,
  change_percentage numeric,
  trend text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_period_start date := current_date - (days_back || ' days')::interval;
  previous_period_start date := current_date - (days_back * 2 || ' days')::interval;
  current_active_users integer;
  previous_active_users integer;
  current_logins integer;
  previous_logins integer;
BEGIN
  -- Get current period metrics
  SELECT 
    COUNT(DISTINCT user_id),
    COUNT(*) FILTER (WHERE activity_type = 'login')
  INTO current_active_users, current_logins
  FROM public.user_activity_logs
  WHERE created_at >= current_period_start;

  -- Get previous period metrics
  SELECT 
    COUNT(DISTINCT user_id),
    COUNT(*) FILTER (WHERE activity_type = 'login')
  INTO previous_active_users, previous_logins
  FROM public.user_activity_logs
  WHERE created_at >= previous_period_start 
    AND created_at < current_period_start;

  RETURN QUERY
  SELECT 
    'Active Users'::text as metric,
    current_active_users::numeric as current_value,
    previous_active_users::numeric as previous_value,
    CASE 
      WHEN previous_active_users = 0 THEN 0
      ELSE ROUND(((current_active_users - previous_active_users) * 100.0 / previous_active_users), 2)
    END as change_percentage,
    CASE 
      WHEN current_active_users > previous_active_users THEN 'up'
      WHEN current_active_users < previous_active_users THEN 'down'
      ELSE 'stable'
    END::text as trend
  
  UNION ALL
  
  SELECT 
    'Total Logins'::text,
    current_logins::numeric,
    previous_logins::numeric,
    CASE 
      WHEN previous_logins = 0 THEN 0
      ELSE ROUND(((current_logins - previous_logins) * 100.0 / previous_logins), 2)
    END,
    CASE 
      WHEN current_logins > previous_logins THEN 'up'
      WHEN current_logins < previous_logins THEN 'down'
      ELSE 'stable'
    END::text;
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_analytics_metrics_name_date ON public.analytics_metrics(metric_name, date_recorded);
CREATE INDEX idx_system_health_timestamp ON public.system_health_metrics(timestamp);
CREATE INDEX idx_engagement_metrics_user_date ON public.engagement_metrics(user_id, date_recorded);
CREATE INDEX idx_user_activity_logs_created_type ON public.user_activity_logs(created_at, activity_type);

-- Refresh the materialized view to populate initial data
REFRESH MATERIALIZED VIEW public.daily_analytics;