-- Fix the log_auth_event function to remove problematic app_metadata reference
CREATE OR REPLACE FUNCTION public.log_auth_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  -- Log the activity with safer field access
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
    NULL,
    NULL,
    '{}',
    true,
    json_build_object(
      'email', COALESCE(NEW.email, OLD.email),
      'provider', 'email',
      'timestamp', now()
    )
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Log errors but don't prevent the auth operation
    RAISE WARNING 'Error in log_auth_event: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$function$;