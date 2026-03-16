-- Fix materialized view security by removing it from API and using secure functions instead
-- Revoke all access to the materialized view from API
REVOKE ALL ON public.daily_analytics FROM anon;
REVOKE ALL ON public.daily_analytics FROM authenticated;

-- Only allow service_role to access the materialized view directly
GRANT SELECT ON public.daily_analytics TO service_role;

-- Create secure function to access daily analytics (only for admins)
CREATE OR REPLACE FUNCTION public.get_daily_analytics_for_admins(days_back integer DEFAULT 30)
RETURNS TABLE(
  date date,
  total_users bigint,
  active_users bigint,
  new_signups bigint,
  total_families bigint,
  engagement_score numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  RETURN QUERY
  SELECT 
    da.date,
    da.total_users,
    da.active_users,
    da.new_signups,
    da.total_families,
    da.engagement_score
  FROM public.daily_analytics da
  WHERE da.date >= CURRENT_DATE - (days_back || ' days')::interval
  ORDER BY da.date DESC;
END;
$$;

-- Grant execute permission only to authenticated users
GRANT EXECUTE ON FUNCTION public.get_daily_analytics_for_admins(integer) TO authenticated;

-- Create function to refresh daily analytics (admin only)
CREATE OR REPLACE FUNCTION public.refresh_daily_analytics_secure()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  -- Refresh the materialized view
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_analytics;
  
  RETURN 'Daily analytics refreshed successfully';
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.refresh_daily_analytics_secure() TO authenticated;