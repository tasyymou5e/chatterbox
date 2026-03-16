-- Fix materialized view schema to match expected function output
DROP MATERIALIZED VIEW IF EXISTS public.daily_analytics;

-- Create the correct materialized view with proper schema
CREATE MATERIALIZED VIEW public.daily_analytics AS
WITH daily_stats AS (
  SELECT 
    date_trunc('day', created_at)::date as date,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(*) FILTER (WHERE activity_type = 'signup') as new_signups
  FROM public.user_activity_logs
  WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY date_trunc('day', created_at)::date
),
family_stats AS (
  SELECT 
    created_at::date as date,
    COUNT(*) as families_created
  FROM public.families
  WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
  GROUP BY created_at::date
),
user_totals AS (
  SELECT 
    ds.date,
    COUNT(p.user_id) as total_users_up_to_date
  FROM daily_stats ds
  CROSS JOIN public.profiles p
  WHERE p.created_at::date <= ds.date
  GROUP BY ds.date
),
family_totals AS (
  SELECT 
    ds.date,
    COUNT(f.id) as total_families_up_to_date
  FROM daily_stats ds
  CROSS JOIN public.families f
  WHERE f.created_at::date <= ds.date
  GROUP BY ds.date
)
SELECT 
  COALESCE(ds.date, CURRENT_DATE - generate_series(0, 89)) as date,
  COALESCE(ut.total_users_up_to_date, (SELECT COUNT(*) FROM public.profiles)) as total_users,
  COALESCE(ds.active_users, 0) as active_users,
  COALESCE(ds.new_signups, 0) as new_signups,
  COALESCE(ft.total_families_up_to_date, (SELECT COUNT(*) FROM public.families)) as total_families,
  CASE 
    WHEN COALESCE(ut.total_users_up_to_date, 0) > 0 
    THEN ROUND((COALESCE(ds.active_users, 0)::numeric / ut.total_users_up_to_date) * 100, 2)
    ELSE 0
  END as engagement_score
FROM generate_series(
  CURRENT_DATE - INTERVAL '89 days', 
  CURRENT_DATE, 
  INTERVAL '1 day'
)::date as date_series(date)
LEFT JOIN daily_stats ds ON ds.date = date_series.date
LEFT JOIN user_totals ut ON ut.date = date_series.date  
LEFT JOIN family_totals ft ON ft.date = date_series.date
ORDER BY date DESC;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX ON public.daily_analytics (date);

-- Grant access to the materialized view
GRANT SELECT ON public.daily_analytics TO authenticated;
REVOKE ALL ON public.daily_analytics FROM public;

-- Create function to automatically log auth events
CREATE OR REPLACE FUNCTION public.log_auth_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  activity_type_val TEXT;
BEGIN
  -- Determine activity type based on the operation
  IF TG_OP = 'INSERT' THEN
    activity_type_val := 'signup';
  ELSIF TG_OP = 'UPDATE' AND OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at THEN
    activity_type_val := 'login';
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Log the activity
  INSERT INTO public.user_activity_logs (
    user_id,
    activity_type,
    ip_address,
    user_agent,
    device_info,
    success,
    metadata
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    activity_type_val,
    NULL, -- IP will be filled by application
    NULL, -- User agent will be filled by application  
    '{}',
    true,
    json_build_object(
      'email', COALESCE(NEW.email, OLD.email),
      'provider', COALESCE(NEW.app_metadata->>'provider', 'email'),
      'timestamp', now()
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for auth events (only if not exists)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_activity') THEN
    CREATE TRIGGER on_auth_user_activity
      AFTER INSERT OR UPDATE ON auth.users
      FOR EACH ROW EXECUTE FUNCTION public.log_auth_event();
  END IF;
END $$;

-- Backfill activity logs for existing users (signup events)
INSERT INTO public.user_activity_logs (user_id, activity_type, success, metadata, created_at)
SELECT 
  p.user_id,
  'signup',
  true,
  json_build_object('email', p.email, 'backfilled', true),
  p.created_at
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_activity_logs ual 
  WHERE ual.user_id = p.user_id AND ual.activity_type = 'signup'
);

-- Refresh the materialized view with new data
REFRESH MATERIALIZED VIEW public.daily_analytics;