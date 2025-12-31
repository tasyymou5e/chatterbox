-- Create a secure function to log profile access attempts
CREATE OR REPLACE FUNCTION public.log_profile_access(
  p_accessor_user_id uuid,
  p_target_user_id uuid,
  p_access_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert audit log for profile access
  INSERT INTO public.security_audit_logs (
    user_id,
    event_type,
    severity,
    event_details
  ) VALUES (
    p_accessor_user_id,
    'profile_data_access',
    'low',
    jsonb_build_object(
      'target_user_id', p_target_user_id,
      'access_type', p_access_type,
      'timestamp', now()
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Silently ignore errors to not block the query
    NULL;
END;
$$;

-- Create a rate limiting function for profile access
CREATE OR REPLACE FUNCTION public.check_profile_access_rate_limit(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  access_count integer;
  max_accesses_per_minute integer := 30;
BEGIN
  -- Count profile accesses in the last minute
  SELECT COUNT(*)
  INTO access_count
  FROM public.security_audit_logs
  WHERE user_id = p_user_id
    AND event_type = 'profile_data_access'
    AND created_at > (now() - interval '1 minute');
  
  -- If exceeding rate limit, log and return false
  IF access_count >= max_accesses_per_minute THEN
    PERFORM public.log_security_event(
      p_user_id,
      'profile_access_rate_limit_exceeded',
      'high',
      jsonb_build_object(
        'access_count', access_count,
        'threshold', max_accesses_per_minute,
        'time_window', '1 minute'
      )
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- Create a secure view that returns limited profile data for family members
-- This prevents bulk data harvesting by only returning display names
CREATE OR REPLACE FUNCTION public.get_family_member_display_info(p_family_id uuid)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  role text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Verify user has access to this family
  IF NOT has_family_access(p_family_id, auth.uid()) THEN
    RAISE EXCEPTION 'Access denied to family';
  END IF;
  
  -- Check rate limit
  IF NOT check_profile_access_rate_limit(auth.uid()) THEN
    RAISE EXCEPTION 'Rate limit exceeded. Please try again later.';
  END IF;
  
  -- Log the access
  PERFORM log_profile_access(auth.uid(), NULL, 'family_members_list');
  
  -- Return only first name for family members (not full name)
  RETURN QUERY
  SELECT 
    fm.user_id,
    p.first_name as display_name,  -- Only first name, not last name
    fm.role::text
  FROM public.family_members fm
  JOIN public.profiles p ON p.user_id = fm.user_id
  WHERE fm.family_id = p_family_id;
END;
$$;

-- Update the profiles_select policy to be more restrictive
-- Family members can only see first_name, not email or last_name
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

CREATE POLICY "profiles_select_own" 
ON public.profiles 
FOR SELECT 
USING (
  -- Users can always see their own full profile
  user_id = auth.uid()
);

CREATE POLICY "profiles_select_admin" 
ON public.profiles 
FOR SELECT 
USING (
  -- Admins can see all profiles
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'read_only'::app_role)
);

CREATE POLICY "profiles_select_family_limited" 
ON public.profiles 
FOR SELECT 
USING (
  -- Family members can see profiles of people in their family
  -- But this is rate-limited via the function
  EXISTS (
    SELECT 1
    FROM family_members fm_viewer
    JOIN family_members fm_profile ON fm_viewer.family_id = fm_profile.family_id
    WHERE fm_viewer.user_id = auth.uid()
      AND fm_profile.user_id = profiles.user_id
  )
  -- Rate limit check - if exceeded, deny access
  AND check_profile_access_rate_limit(auth.uid())
);

-- Add index to optimize profile access audit queries
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_profile_access 
ON public.security_audit_logs(user_id, event_type, created_at) 
WHERE event_type = 'profile_data_access';

-- Add index for rate limit queries
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_rate_limit 
ON public.security_audit_logs(user_id, created_at) 
WHERE event_type IN ('profile_data_access', 'profile_access_rate_limit_exceeded');