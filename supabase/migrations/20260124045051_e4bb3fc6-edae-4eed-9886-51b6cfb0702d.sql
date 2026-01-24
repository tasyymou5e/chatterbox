-- Modify the auth event trigger to only log signups at database level
-- Login events are now handled exclusively by the application (authActionsStore)
-- This prevents duplicate login entries

CREATE OR REPLACE FUNCTION public.log_auth_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only log signups at database level (logins handled by application layer)
  -- This prevents duplicate login entries while keeping signup as a backup
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.user_activity_logs (
      user_id, 
      activity_type, 
      success, 
      metadata
    ) VALUES (
      NEW.id,
      'signup',
      true,
      jsonb_build_object(
        'email', NEW.email,
        'provider', COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
        'timestamp', now(),
        'source', 'database_trigger'
      )
    );
  END IF;
  
  -- Skip login logging here - handled by authActionsStore.ts
  -- Previously this logged on UPDATE when last_sign_in_at changed
  
  RETURN COALESCE(NEW, OLD);
END;
$$;