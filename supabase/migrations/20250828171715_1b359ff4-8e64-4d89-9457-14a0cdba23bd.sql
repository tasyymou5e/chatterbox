-- Fix function search path issues
DROP FUNCTION IF EXISTS public.calculate_user_retention(integer);
DROP FUNCTION IF EXISTS public.get_engagement_analytics(integer);

-- Recreate function to calculate user retention with proper search path
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
SET search_path = 'public'
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

-- Recreate function to get engagement analytics with proper search path
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
SET search_path = 'public'
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

-- Hide materialized view from API by revoking public access
REVOKE ALL ON public.daily_analytics FROM anon;
REVOKE ALL ON public.daily_analytics FROM authenticated;

-- Grant specific access only to admin users via RLS policy on the view
-- Note: Materialized views don't support RLS directly, so we control access via permissions