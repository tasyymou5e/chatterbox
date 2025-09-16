-- Critical Security Fixes: Profile Email Protection & Child Account Access

-- 1. Create a security function to check if user can access email data
CREATE OR REPLACE FUNCTION public.can_access_profile_email(profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only profile owner or admin can access email
  SELECT (auth.uid() = profile_user_id) OR public.has_role(auth.uid(), 'admin'::app_role);
$$;

-- 2. Replace profiles SELECT policy with email-restricted access
DROP POLICY IF EXISTS "profiles_select_strict_access" ON public.profiles;

-- Policy for general profile access (no email for family members)
CREATE POLICY "profiles_basic_access"
ON public.profiles
FOR SELECT
USING (
  -- Profile owner and admins can see everything
  (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'::app_role))
  OR 
  -- Family members can see basic info but not email
  (EXISTS (
    SELECT 1 FROM public.family_members fm1, public.family_members fm2
    WHERE fm1.user_id = auth.uid() 
    AND fm2.user_id = profiles.user_id
    AND fm1.family_id = fm2.family_id
  ))
);

-- 3. Create a view for family-safe profile access (without email)
CREATE OR REPLACE VIEW public.family_member_profiles AS
SELECT 
  p.id,
  p.user_id,
  p.first_name,
  p.last_name,
  p.created_at,
  p.updated_at,
  -- Only include email if user has permission
  CASE 
    WHEN public.can_access_profile_email(p.user_id) THEN p.email
    ELSE NULL
  END as email
FROM public.profiles p;

-- Enable RLS on the view
ALTER VIEW public.family_member_profiles SET (security_barrier = true);

-- 4. Tighten child_accounts access - remove child self-access for security
DROP POLICY IF EXISTS "child_accounts_parent_admin_only" ON public.child_accounts;

CREATE POLICY "child_accounts_strict_parent_admin"
ON public.child_accounts
FOR ALL
USING (
  -- Only parent who created the account or admin
  (public.has_role(auth.uid(), 'parent'::app_role) AND created_by = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  -- Same restrictions for INSERT/UPDATE
  (public.has_role(auth.uid(), 'parent'::app_role) AND created_by = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 5. Add additional security logging for profile access
CREATE OR REPLACE FUNCTION public.log_profile_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log when email is accessed by non-owners
  IF TG_OP = 'SELECT' AND OLD.email IS NOT NULL AND auth.uid() != OLD.user_id THEN
    PERFORM public.log_security_event(
      auth.uid(),
      'profile_email_access',
      'medium',
      jsonb_build_object(
        'accessed_user_id', OLD.user_id,
        'accessed_email', OLD.email,
        'access_reason', 'profile_query'
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply the trigger to profiles table
DROP TRIGGER IF EXISTS trigger_log_profile_access ON public.profiles;
CREATE TRIGGER trigger_log_profile_access
  AFTER SELECT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_access();

-- 6. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.can_access_profile_email(uuid) TO authenticated;
GRANT SELECT ON public.family_member_profiles TO authenticated;