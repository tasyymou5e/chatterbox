-- Fix the get_error_statistics function to resolve the "ungrouped column" SQL error
DROP FUNCTION IF EXISTS public.get_error_statistics(integer);

CREATE OR REPLACE FUNCTION public.get_error_statistics(days_back integer DEFAULT 7)
RETURNS TABLE(
  total_errors bigint, 
  critical_errors bigint, 
  high_errors bigint, 
  medium_errors bigint, 
  low_errors bigint, 
  resolved_errors bigint, 
  top_error_components text[], 
  error_rate_trend numeric[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  trend_data numeric[];
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  -- Build error rate trend array using a simpler approach
  SELECT ARRAY(
    SELECT COALESCE(daily_counts.error_count, 0)::numeric
    FROM generate_series(days_back, 1, -1) AS day_offset
    LEFT JOIN (
      SELECT 
        (CURRENT_DATE - created_at::date) AS days_ago,
        COUNT(*)::numeric AS error_count
      FROM public.system_errors 
      WHERE created_at >= CURRENT_DATE - (days_back || ' days')::interval
      GROUP BY created_at::date
    ) daily_counts ON daily_counts.days_ago = day_offset
    ORDER BY day_offset DESC
  ) INTO trend_data;

  RETURN QUERY
  SELECT 
    COUNT(*) as total_errors,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_errors,
    COUNT(*) FILTER (WHERE severity = 'high') as high_errors,
    COUNT(*) FILTER (WHERE severity = 'medium') as medium_errors,
    COUNT(*) FILTER (WHERE severity = 'low') as low_errors,
    COUNT(*) FILTER (WHERE resolved = true) as resolved_errors,
    ARRAY(
      SELECT component_name 
      FROM public.system_errors 
      WHERE created_at >= CURRENT_DATE - (days_back || ' days')::interval 
        AND component_name IS NOT NULL
      GROUP BY component_name 
      ORDER BY COUNT(*) DESC 
      LIMIT 5
    ) as top_error_components,
    trend_data as error_rate_trend
  FROM public.system_errors se
  WHERE se.created_at >= CURRENT_DATE - (days_back || ' days')::interval;
END;
$function$;