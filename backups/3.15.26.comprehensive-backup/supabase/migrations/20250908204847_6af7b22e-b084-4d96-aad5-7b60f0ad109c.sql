-- First drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS public.calculate_user_retention(integer);
DROP FUNCTION IF EXISTS public.get_daily_analytics_for_admins(integer);
DROP FUNCTION IF EXISTS public.get_engagement_analytics(integer);
DROP FUNCTION IF EXISTS public.get_family_growth_metrics(integer);
DROP FUNCTION IF EXISTS public.get_system_health_metrics();

-- Create comprehensive analytics functions for advanced dashboard

-- Function to get engagement analytics with growth metrics
CREATE OR REPLACE FUNCTION public.get_engagement_analytics(days_back integer DEFAULT 30)
RETURNS TABLE(
  metric text,
  current_value numeric,
  previous_value numeric,
  change_percentage numeric,
  trend text
) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  current_period_start date := CURRENT_DATE - (days_back || ' days')::interval;
  previous_period_start date := CURRENT_DATE - (days_back * 2 || ' days')::interval;
  previous_period_end date := CURRENT_DATE - (days_back || ' days')::interval;
BEGIN
  -- Check admin permissions
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  WITH current_metrics AS (
    SELECT 
      COUNT(DISTINCT ual.user_id) as active_users,
      COUNT(DISTINCT CASE WHEN ual.activity_type = 'login' THEN ual.user_id END) as login_users,
      COUNT(*) as total_activities,
      AVG(CASE WHEN em.engagement_score > 0 THEN em.engagement_score ELSE 5 END) as avg_engagement
    FROM public.user_activity_logs ual
    LEFT JOIN public.engagement_metrics em ON em.user_id = ual.user_id 
      AND em.date_recorded >= current_period_start
    WHERE ual.created_at >= current_period_start
  ),
  previous_metrics AS (
    SELECT 
      COUNT(DISTINCT ual.user_id) as active_users,
      COUNT(DISTINCT CASE WHEN ual.activity_type = 'login' THEN ual.user_id END) as login_users,
      COUNT(*) as total_activities,
      AVG(CASE WHEN em.engagement_score > 0 THEN em.engagement_score ELSE 5 END) as avg_engagement
    FROM public.user_activity_logs ual
    LEFT JOIN public.engagement_metrics em ON em.user_id = ual.user_id 
      AND em.date_recorded BETWEEN previous_period_start AND previous_period_end
    WHERE ual.created_at BETWEEN previous_period_start AND previous_period_end
  )
  SELECT 
    'Active Users'::text,
    COALESCE(cm.active_users, 0)::numeric,
    COALESCE(pm.active_users, 0)::numeric,
    CASE 
      WHEN COALESCE(pm.active_users, 0) = 0 THEN 0
      ELSE ROUND(((COALESCE(cm.active_users, 0) - COALESCE(pm.active_users, 0))::numeric / COALESCE(pm.active_users, 1)) * 100, 2)
    END,
    CASE 
      WHEN COALESCE(cm.active_users, 0) > COALESCE(pm.active_users, 0) THEN 'up'
      WHEN COALESCE(cm.active_users, 0) < COALESCE(pm.active_users, 0) THEN 'down'
      ELSE 'stable'
    END::text
  FROM current_metrics cm, previous_metrics pm
  
  UNION ALL
  
  SELECT 
    'Total Activities'::text,
    COALESCE(cm.total_activities, 0)::numeric,
    COALESCE(pm.total_activities, 0)::numeric,
    CASE 
      WHEN COALESCE(pm.total_activities, 0) = 0 THEN 0
      ELSE ROUND(((COALESCE(cm.total_activities, 0) - COALESCE(pm.total_activities, 0))::numeric / COALESCE(pm.total_activities, 1)) * 100, 2)
    END,
    CASE 
      WHEN COALESCE(cm.total_activities, 0) > COALESCE(pm.total_activities, 0) THEN 'up'
      WHEN COALESCE(cm.total_activities, 0) < COALESCE(pm.total_activities, 0) THEN 'down'
      ELSE 'stable'
    END::text
  FROM current_metrics cm, previous_metrics pm
  
  UNION ALL
  
  SELECT 
    'Engagement Score'::text,
    COALESCE(cm.avg_engagement, 5)::numeric,
    COALESCE(pm.avg_engagement, 5)::numeric,
    CASE 
      WHEN COALESCE(pm.avg_engagement, 5) = 0 THEN 0
      ELSE ROUND(((COALESCE(cm.avg_engagement, 5) - COALESCE(pm.avg_engagement, 5))::numeric / COALESCE(pm.avg_engagement, 5)) * 100, 2)
    END,
    CASE 
      WHEN COALESCE(cm.avg_engagement, 5) > COALESCE(pm.avg_engagement, 5) THEN 'up'
      WHEN COALESCE(cm.avg_engagement, 5) < COALESCE(pm.avg_engagement, 5) THEN 'down'
      ELSE 'stable'
    END::text
  FROM current_metrics cm, previous_metrics pm;
END;
$$;

-- Function to get daily analytics for admin dashboard
CREATE OR REPLACE FUNCTION public.get_daily_analytics_for_admins(days_back integer DEFAULT 30)
RETURNS TABLE(
  date date,
  total_users bigint,
  active_users bigint,
  new_signups bigint,
  total_families bigint,
  engagement_score numeric
) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- Check admin permissions
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - (days_back || ' days')::interval,
      CURRENT_DATE - interval '1 day',
      interval '1 day'
    )::date as date
  ),
  daily_stats AS (
    SELECT 
      ds.date,
      (SELECT COUNT(*) FROM public.profiles WHERE created_at::date <= ds.date) as total_users,
      COALESCE((SELECT COUNT(DISTINCT user_id) FROM public.user_activity_logs WHERE created_at::date = ds.date), 0) as active_users,
      COALESCE((SELECT COUNT(*) FROM public.profiles WHERE created_at::date = ds.date), 0) as new_signups,
      (SELECT COUNT(*) FROM public.families WHERE created_at::date <= ds.date) as total_families,
      COALESCE((SELECT AVG(engagement_score) FROM public.engagement_metrics WHERE date_recorded = ds.date), 5.0) as engagement_score
    FROM date_series ds
  )
  SELECT * FROM daily_stats ORDER BY date;
END;
$$;

-- Function to calculate user retention cohorts
CREATE OR REPLACE FUNCTION public.calculate_user_retention(days_back integer DEFAULT 30)
RETURNS TABLE(
  cohort_date date,
  users_count bigint,
  retention_day_1 numeric,
  retention_day_7 numeric,
  retention_day_30 numeric
) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- Check admin permissions
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  WITH cohorts AS (
    SELECT 
      created_at::date as cohort_date,
      COUNT(*) as users_count
    FROM public.profiles 
    WHERE created_at >= CURRENT_DATE - (days_back || ' days')::interval
    GROUP BY created_at::date
    HAVING COUNT(*) > 0
  ),
  retention_calc AS (
    SELECT 
      c.cohort_date,
      c.users_count,
      -- Day 1 retention
      ROUND(
        COALESCE(
          (SELECT COUNT(DISTINCT ual.user_id)::numeric 
           FROM public.user_activity_logs ual 
           JOIN public.profiles p ON p.user_id = ual.user_id
           WHERE p.created_at::date = c.cohort_date 
           AND ual.created_at::date = c.cohort_date + interval '1 day'
          ) / NULLIF(c.users_count, 0) * 100, 0
        ), 2
      ) as retention_day_1,
      -- Day 7 retention
      ROUND(
        COALESCE(
          (SELECT COUNT(DISTINCT ual.user_id)::numeric 
           FROM public.user_activity_logs ual 
           JOIN public.profiles p ON p.user_id = ual.user_id
           WHERE p.created_at::date = c.cohort_date 
           AND ual.created_at::date BETWEEN c.cohort_date + interval '7 days' - interval '1 day' 
           AND c.cohort_date + interval '7 days' + interval '1 day'
          ) / NULLIF(c.users_count, 0) * 100, 0
        ), 2
      ) as retention_day_7,
      -- Day 30 retention
      ROUND(
        COALESCE(
          (SELECT COUNT(DISTINCT ual.user_id)::numeric 
           FROM public.user_activity_logs ual 
           JOIN public.profiles p ON p.user_id = ual.user_id
           WHERE p.created_at::date = c.cohort_date 
           AND ual.created_at::date BETWEEN c.cohort_date + interval '30 days' - interval '2 days' 
           AND c.cohort_date + interval '30 days' + interval '2 days'
          ) / NULLIF(c.users_count, 0) * 100, 0
        ), 2
      ) as retention_day_30
    FROM cohorts c
  )
  SELECT * FROM retention_calc ORDER BY cohort_date DESC LIMIT 10;
END;
$$;

-- Function to get family growth metrics
CREATE OR REPLACE FUNCTION public.get_family_growth_metrics(days_back integer DEFAULT 30)
RETURNS TABLE(
  date date,
  new_families bigint,
  cumulative_families bigint,
  avg_family_size numeric,
  active_families bigint
) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- Check admin permissions
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - (days_back || ' days')::interval,
      CURRENT_DATE - interval '1 day',
      interval '1 day'
    )::date as date
  )
  SELECT 
    ds.date,
    COALESCE((SELECT COUNT(*) FROM public.families WHERE created_at::date = ds.date), 0) as new_families,
    (SELECT COUNT(*) FROM public.families WHERE created_at::date <= ds.date) as cumulative_families,
    COALESCE((
      SELECT ROUND(AVG(member_count), 2)
      FROM (
        SELECT COUNT(*) as member_count
        FROM public.family_members fm
        JOIN public.families f ON f.id = fm.family_id
        WHERE f.created_at::date <= ds.date
        GROUP BY fm.family_id
      ) family_sizes
    ), 0) as avg_family_size,
    COALESCE((
      SELECT COUNT(DISTINCT fm.family_id)
      FROM public.family_members fm
      JOIN public.user_activity_logs ual ON ual.user_id = fm.user_id
      WHERE ual.created_at::date = ds.date
    ), 0) as active_families
  FROM date_series ds
  ORDER BY ds.date;
END;
$$;

-- Function to get system health metrics
CREATE OR REPLACE FUNCTION public.get_system_health_metrics()
RETURNS TABLE(
  metric_name text,
  metric_value numeric,
  status text,
  last_updated timestamp with time zone
) LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  -- Check admin permissions
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    'Error Rate (24h)'::text,
    COALESCE((
      SELECT COUNT(*)::numeric 
      FROM public.system_errors 
      WHERE created_at >= CURRENT_TIMESTAMP - interval '24 hours'
    ), 0),
    CASE 
      WHEN COALESCE((
        SELECT COUNT(*) 
        FROM public.system_errors 
        WHERE created_at >= CURRENT_TIMESTAMP - interval '24 hours'
      ), 0) = 0 THEN 'healthy'
      WHEN COALESCE((
        SELECT COUNT(*) 
        FROM public.system_errors 
        WHERE created_at >= CURRENT_TIMESTAMP - interval '24 hours'
      ), 0) < 10 THEN 'warning'
      ELSE 'critical'
    END::text,
    now()

  UNION ALL

  SELECT 
    'Active Sessions'::text,
    COALESCE((
      SELECT COUNT(*)::numeric 
      FROM public.user_sessions 
      WHERE is_active = true
    ), 0),
    'healthy'::text,
    now()

  UNION ALL

  SELECT 
    'Database Size (MB)'::text,
    COALESCE((
      SELECT ROUND((pg_database_size(current_database()) / 1024.0 / 1024.0)::numeric, 2)
    ), 0),
    'healthy'::text,
    now();
END;
$$;