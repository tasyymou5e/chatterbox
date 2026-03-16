-- Fix critical RLS vulnerability in profiles table
-- Add explicit authentication check to prevent anonymous access

DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;

CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    (auth.uid() = user_id) OR 
    has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Add security function to validate profile access
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

-- Add function to create security alerts for unauthorized access
CREATE OR REPLACE FUNCTION public.create_security_alert(
  alert_type text,
  severity text,
  details jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  alert_id uuid;
BEGIN
  INSERT INTO public.security_audit_logs (
    user_id,
    event_type,
    severity,
    event_details
  ) VALUES (
    auth.uid(),
    alert_type,
    severity,
    details
  ) RETURNING id INTO alert_id;
  
  RETURN alert_id;
END;
$$;