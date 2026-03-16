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

-- Create materialized view for daily analytics
CREATE MATERIALIZED VIEW public.daily_analytics AS
SELECT 
  date_trunc('day', created_at) as date,
  COUNT(*) FILTER (WHERE activity_type = 'login') as daily_logins,
  COUNT(*) FILTER (WHERE activity_type = 'signup') as daily_signups,
  COUNT(DISTINCT user_id) as active_users,
  COUNT(DISTINCT user_id) FILTER (WHERE activity_type = 'login') as unique_logins,
  AVG(EXTRACT(epoch FROM (lag(timestamp) OVER (PARTITION BY user_id ORDER BY timestamp) - timestamp))) / 60 as avg_session_duration
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
      date_trunc('day', p.created_at) as cohort_date,
      p.user_id,
      p.created_at
    FROM public.profiles p
    WHERE p.created_at >= current_date - interval '90 days'
  ),
  retention AS (
    SELECT 
      c.cohort_date,
      COUNT(DISTINCT c.user_id) as users_count,
      COUNT(DISTINCT CASE 
        WHEN ual.created_at BETWEEN c.cohort_date + interval '1 day' 
        AND c.cohort_date + interval '2 days' 
        THEN c.user_id 
      END) * 100.0 / COUNT(DISTINCT c.user_id) as retention_day_1,
      COUNT(DISTINCT CASE 
        WHEN ual.created_at BETWEEN c.cohort_date + interval '7 days' 
        AND c.cohort_date + interval '8 days' 
        THEN c.user_id 
      END) * 100.0 / COUNT(DISTINCT c.user_id) as retention_day_7,
      COUNT(DISTINCT CASE 
        WHEN ual.created_at BETWEEN c.cohort_date + interval '30 days' 
        AND c.cohort_date + interval '31 days' 
        THEN c.user_id 
      END) * 100.0 / COUNT(DISTINCT c.user_id) as retention_day_30
    FROM cohorts c
    LEFT JOIN public.user_activity_logs ual ON c.user_id = ual.user_id
    GROUP BY c.cohort_date
  )
  SELECT 
    r.cohort_date,
    r.users_count::integer,
    ROUND(r.retention_day_1, 2) as retention_day_1,
    ROUND(r.retention_day_7, 2) as retention_day_7,
    ROUND(r.retention_day_30, 2) as retention_day_30
  FROM retention r
  ORDER BY r.cohort_date DESC;
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
BEGIN
  RETURN QUERY
  WITH current_metrics AS (
    SELECT 
      COUNT(DISTINCT user_id) as active_users,
      COUNT(*) FILTER (WHERE activity_type = 'login') as logins,
      COUNT(DISTINCT user_id) FILTER (WHERE activity_type = 'login') as unique_logins,
      COALESCE(AVG(EXTRACT(epoch FROM (
        SELECT MAX(timestamp) - MIN(timestamp) 
        FROM user_activity_logs ual2 
        WHERE ual2.user_id = ual.user_id 
        AND ual2.created_at >= current_period_start
      ))) / 60, 0) as avg_session_duration
    FROM public.user_activity_logs ual
    WHERE created_at >= current_period_start
  ),
  previous_metrics AS (
    SELECT 
      COUNT(DISTINCT user_id) as active_users,
      COUNT(*) FILTER (WHERE activity_type = 'login') as logins,
      COUNT(DISTINCT user_id) FILTER (WHERE activity_type = 'login') as unique_logins,
      COALESCE(AVG(EXTRACT(epoch FROM (
        SELECT MAX(timestamp) - MIN(timestamp) 
        FROM user_activity_logs ual2 
        WHERE ual2.user_id = ual.user_id 
        AND ual2.created_at >= previous_period_start 
        AND ual2.created_at < current_period_start
      ))) / 60, 0) as avg_session_duration
    FROM public.user_activity_logs ual
    WHERE created_at >= previous_period_start 
    AND created_at < current_period_start
  )
  SELECT 
    'Active Users'::text as metric,
    cm.active_users::numeric as current_value,
    pm.active_users::numeric as previous_value,
    CASE 
      WHEN pm.active_users = 0 THEN 0
      ELSE ROUND(((cm.active_users - pm.active_users) * 100.0 / pm.active_users), 2)
    END as change_percentage,
    CASE 
      WHEN cm.active_users > pm.active_users THEN 'up'
      WHEN cm.active_users < pm.active_users THEN 'down'
      ELSE 'stable'
    END::text as trend
  FROM current_metrics cm, previous_metrics pm
  
  UNION ALL
  
  SELECT 
    'Total Logins'::text,
    cm.logins::numeric,
    pm.logins::numeric,
    CASE 
      WHEN pm.logins = 0 THEN 0
      ELSE ROUND(((cm.logins - pm.logins) * 100.0 / pm.logins), 2)
    END,
    CASE 
      WHEN cm.logins > pm.logins THEN 'up'
      WHEN cm.logins < pm.logins THEN 'down'
      ELSE 'stable'
    END::text
  FROM current_metrics cm, previous_metrics pm
  
  UNION ALL
  
  SELECT 
    'Average Session Duration'::text,
    ROUND(cm.avg_session_duration, 2),
    ROUND(pm.avg_session_duration, 2),
    CASE 
      WHEN pm.avg_session_duration = 0 THEN 0
      ELSE ROUND(((cm.avg_session_duration - pm.avg_session_duration) * 100.0 / pm.avg_session_duration), 2)
    END,
    CASE 
      WHEN cm.avg_session_duration > pm.avg_session_duration THEN 'up'
      WHEN cm.avg_session_duration < pm.avg_session_duration THEN 'down'
      ELSE 'stable'
    END::text
  FROM current_metrics cm, previous_metrics pm;
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_analytics_metrics_name_date ON public.analytics_metrics(metric_name, date_recorded);
CREATE INDEX idx_system_health_timestamp ON public.system_health_metrics(timestamp);
CREATE INDEX idx_engagement_metrics_user_date ON public.engagement_metrics(user_id, date_recorded);
CREATE INDEX idx_user_activity_logs_created_type ON public.user_activity_logs(created_at, activity_type);

-- Create trigger to refresh materialized view daily
CREATE OR REPLACE FUNCTION public.refresh_daily_analytics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.daily_analytics;
  RETURN NULL;
END;
$$;

-- Trigger to auto-refresh analytics view (note: in production, this should be scheduled)
-- For now, we'll refresh it manually or via cron
-- CREATE TRIGGER refresh_analytics_trigger
--   AFTER INSERT OR UPDATE OR DELETE ON public.user_activity_logs
--   FOR EACH STATEMENT
--   EXECUTE FUNCTION public.refresh_daily_analytics();