-- Fix log_system_error function with correct digest syntax
CREATE OR REPLACE FUNCTION public.log_system_error(
  p_error_type text, 
  p_severity text, 
  p_message text, 
  p_stack_trace text DEFAULT NULL::text, 
  p_user_id uuid DEFAULT NULL::uuid, 
  p_session_id text DEFAULT NULL::text, 
  p_component_name text DEFAULT NULL::text, 
  p_route_path text DEFAULT NULL::text, 
  p_browser_info jsonb DEFAULT '{}'::jsonb, 
  p_device_info jsonb DEFAULT '{}'::jsonb, 
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  error_id UUID;
  pattern_hash TEXT;
BEGIN
  -- Insert the error
  INSERT INTO public.system_errors (
    error_type, severity, message, stack_trace, user_id, session_id,
    component_name, route_path, browser_info, device_info, metadata
  ) VALUES (
    p_error_type, p_severity, p_message, p_stack_trace, p_user_id, p_session_id,
    p_component_name, p_route_path, p_browser_info, p_device_info, p_metadata
  ) RETURNING id INTO error_id;
  
  -- Create pattern hash for error grouping - Fixed digest syntax
  pattern_hash := encode(
    digest(
      (p_error_type || ':' || p_message || ':' || COALESCE(p_component_name, ''))::bytea, 
      'sha256'
    ), 
    'hex'
  );
  
  -- Update or create error pattern
  INSERT INTO public.error_patterns (pattern_hash, error_message_pattern, occurrence_count, last_seen)
  VALUES (pattern_hash, p_message, 1, now())
  ON CONFLICT (pattern_hash) DO UPDATE SET
    occurrence_count = error_patterns.occurrence_count + 1,
    last_seen = now(),
    updated_at = now();
  
  -- Check if we need to create an alert for critical errors
  IF p_severity = 'critical' THEN
    INSERT INTO public.system_alerts (
      alert_type, severity, title, description, triggered_by, metadata
    ) VALUES (
      'critical_error', 'critical', 
      'Critical Error Detected', 
      'Critical error in component: ' || COALESCE(p_component_name, 'Unknown'),
      'system',
      jsonb_build_object('error_id', error_id, 'component', p_component_name)
    );
  END IF;
  
  RETURN error_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Log to Postgres log if function fails
    RAISE WARNING 'Error in log_system_error: %', SQLERRM;
    RETURN NULL;
END;
$function$;

-- Fix get_error_statistics function with improved array aggregation
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
  trend_data numeric[] := '{}';
  daily_count RECORD;
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  -- Build error rate trend array with improved logic
  FOR daily_count IN
    SELECT 
      day_offset,
      COALESCE(error_count, 0)::numeric AS count_value
    FROM generate_series(days_back - 1, 0, -1) AS day_offset
    LEFT JOIN (
      SELECT 
        EXTRACT(days FROM (CURRENT_DATE - created_at::date))::integer AS days_ago,
        COUNT(*)::numeric AS error_count
      FROM public.system_errors 
      WHERE created_at >= CURRENT_DATE - (days_back || ' days')::interval
      GROUP BY created_at::date
    ) daily_counts ON daily_counts.days_ago = day_offset
    ORDER BY day_offset DESC
  LOOP
    trend_data := array_append(trend_data, daily_count.count_value);
  END LOOP;

  -- Ensure we have at least some data points
  IF array_length(trend_data, 1) IS NULL THEN
    trend_data := array_fill(0::numeric, ARRAY[days_back]);
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE(COUNT(*), 0) as total_errors,
    COALESCE(COUNT(*) FILTER (WHERE severity = 'critical'), 0) as critical_errors,
    COALESCE(COUNT(*) FILTER (WHERE severity = 'high'), 0) as high_errors,
    COALESCE(COUNT(*) FILTER (WHERE severity = 'medium'), 0) as medium_errors,
    COALESCE(COUNT(*) FILTER (WHERE severity = 'low'), 0) as low_errors,
    COALESCE(COUNT(*) FILTER (WHERE resolved = true), 0) as resolved_errors,
    COALESCE(
      ARRAY(
        SELECT component_name 
        FROM public.system_errors 
        WHERE created_at >= CURRENT_DATE - (days_back || ' days')::interval 
          AND component_name IS NOT NULL
        GROUP BY component_name 
        ORDER BY COUNT(*) DESC 
        LIMIT 5
      ),
      '{}'::text[]
    ) as top_error_components,
    trend_data as error_rate_trend
  FROM public.system_errors se
  WHERE se.created_at >= CURRENT_DATE - (days_back || ' days')::interval;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return safe defaults if function fails
    RETURN QUERY
    SELECT 
      0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint, 0::bigint,
      '{}'::text[], array_fill(0::numeric, ARRAY[GREATEST(days_back, 1)])::numeric[];
END;
$function$;