-- Set up automated refresh of analytics data
-- Create a function to refresh analytics and log the operation

CREATE OR REPLACE FUNCTION public.refresh_analytics_automated()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Refresh the materialized view
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_analytics;
  
  -- Log the refresh operation
  INSERT INTO public.analytics_metrics (
    metric_type,
    metric_name,
    metric_value,
    metadata
  ) VALUES (
    'system_performance',
    'analytics_refresh',
    1,
    json_build_object(
      'refreshed_at', now(),
      'automated', true
    )
  );
  
  RETURN 'Analytics refreshed successfully at ' || now()::text;
END;
$$;