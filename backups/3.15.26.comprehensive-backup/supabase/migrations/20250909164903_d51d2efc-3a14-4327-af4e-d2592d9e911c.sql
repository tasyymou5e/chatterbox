-- Fix ambiguous column reference in get_daily_analytics_for_admins function
CREATE OR REPLACE FUNCTION public.get_daily_analytics_for_admins(days_back integer DEFAULT 30)
 RETURNS TABLE(date date, total_users bigint, active_users bigint, new_signups bigint, total_families bigint, engagement_score numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      COALESCE((
        SELECT AVG(em.engagement_score) 
        FROM public.engagement_metrics em 
        WHERE em.date_recorded = ds.date AND em.engagement_score IS NOT NULL
      ), 5.0) as avg_engagement_score
    FROM date_series ds
  )
  SELECT 
    daily_stats.date,
    daily_stats.total_users,
    daily_stats.active_users,
    daily_stats.new_signups,
    daily_stats.total_families,
    daily_stats.avg_engagement_score as engagement_score
  FROM daily_stats 
  ORDER BY daily_stats.date;
END;
$function$;

-- Fix ambiguous column reference in get_engagement_analytics function
CREATE OR REPLACE FUNCTION public.get_engagement_analytics(days_back integer DEFAULT 30)
 RETURNS TABLE(metric text, current_value numeric, previous_value numeric, change_percentage numeric, trend text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;