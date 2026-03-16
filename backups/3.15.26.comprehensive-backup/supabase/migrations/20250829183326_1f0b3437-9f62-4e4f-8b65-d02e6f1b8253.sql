-- Fix the log_system_error function to not use the non-existent sha256 function
-- Instead we'll use encode(digest(text, 'sha256'), 'hex') which works in Postgres

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
  
  -- Create pattern hash for error grouping using Postgres digest function
  pattern_hash := encode(digest(p_error_type || ':' || p_message || ':' || COALESCE(p_component_name, ''), 'sha256'), 'hex');
  
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
END;
$function$