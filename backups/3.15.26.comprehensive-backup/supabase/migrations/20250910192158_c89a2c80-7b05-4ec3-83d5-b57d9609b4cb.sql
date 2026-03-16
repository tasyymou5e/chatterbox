-- Fix duplicate log_security_event function issue
-- Drop the 4-parameter version to keep only the 5-parameter version

-- First, let's check what functions exist (commented for reference)
-- SELECT proname, pronargs, pg_get_function_identity_arguments(oid) 
-- FROM pg_proc WHERE proname = 'log_security_event';

-- Drop the 4-parameter version of log_security_event
DROP FUNCTION IF EXISTS public.log_security_event(uuid, text, text, jsonb);

-- Ensure we have the comprehensive 5-parameter version
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id uuid,
  p_event_type text,
  p_severity text,
  p_event_details jsonb,
  p_session_id text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert security audit log with enhanced details
  INSERT INTO public.security_audit_logs (
    user_id,
    event_type,
    severity,
    event_details,
    session_id,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_event_type,
    p_severity,
    p_event_details,
    p_session_id,
    COALESCE((current_setting('request.headers', true)::json->>'x-forwarded-for')::inet, '0.0.0.0'::inet),
    current_setting('request.headers', true)::json->>'user-agent'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the main operation
    RAISE WARNING 'Failed to log security event: %', SQLERRM;
END;
$function$;