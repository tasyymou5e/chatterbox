-- Drop the overly permissive family-limited select policy
DROP POLICY IF EXISTS "profiles_select_family_limited" ON public.profiles;

-- Create a more restrictive policy - family members can only see profiles through the secure function
-- Direct table access is now limited to own profile and admins only
-- The get_family_member_display_info() function already exists and provides controlled access

-- Create a secure view for family member display that only exposes first_name (no last_name)
CREATE OR REPLACE VIEW public.family_member_display AS
SELECT 
  p.user_id,
  p.first_name as display_name,
  fm.family_id,
  fm.role
FROM public.profiles p
INNER JOIN public.family_members fm ON p.user_id = fm.user_id;

-- Grant access to the view
GRANT SELECT ON public.family_member_display TO authenticated;

-- Create RLS policy on the view (views inherit from base tables but we add explicit check)
-- Note: Views don't have RLS directly, access is controlled by the underlying tables
-- So we need to create a secure function instead

-- Drop the view and create a proper SECURITY DEFINER function
DROP VIEW IF EXISTS public.family_member_display;

-- Create/replace the secure function for getting family member info (first name only)
CREATE OR REPLACE FUNCTION public.get_family_members_display(p_family_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  role text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.first_name as display_name,
    fm.role::text
  FROM profiles p
  INNER JOIN family_members fm ON p.user_id = fm.user_id
  WHERE fm.family_id = p_family_id
    AND EXISTS (
      SELECT 1 FROM family_members viewer
      WHERE viewer.family_id = p_family_id
        AND viewer.user_id = auth.uid()
    )
    AND check_profile_access_rate_limit(auth.uid());
$$;

-- Add comment for documentation
COMMENT ON FUNCTION public.get_family_members_display IS 'Secure function to get family member display names (first name only). Enforces same-family access and rate limiting.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_family_members_display TO authenticated;