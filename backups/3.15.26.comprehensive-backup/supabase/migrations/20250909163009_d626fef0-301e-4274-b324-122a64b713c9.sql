-- Fix critical RLS vulnerability in profiles table
-- The current policy allows unauthorized access - add explicit auth check

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;

CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    (auth.uid() = user_id) OR 
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Add additional security function to validate profile access
CREATE OR REPLACE FUNCTION public.validate_profile_access(profile_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Must be authenticated
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;
  
  -- Own profile or admin
  RETURN (auth.uid() = profile_user_id) OR has_role(auth.uid(), 'admin'::app_role);
END;
$$;

-- Add trigger to log suspicious profile access attempts
CREATE OR REPLACE FUNCTION public.log_profile_access_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log suspicious access attempts
  IF auth.uid() IS NULL THEN
    PERFORM log_security_event(
      NULL,
      'unauthorized_profile_access_attempt',
      'critical',
      jsonb_build_object(
        'target_user_id', COALESCE(NEW.user_id, OLD.user_id),
        'timestamp', now(),
        'table', 'profiles'
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger for profile access monitoring
DROP TRIGGER IF EXISTS profile_access_monitor ON public.profiles;
CREATE TRIGGER profile_access_monitor
  BEFORE SELECT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_access_attempt();