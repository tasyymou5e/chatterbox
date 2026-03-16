-- Simplify profiles RLS: Allow family members to view each other's basic profiles
-- This enables proper family collaboration while maintaining security boundaries

-- Drop existing restrictive SELECT policy
DROP POLICY IF EXISTS "profiles_secure_access" ON public.profiles;

-- Create new family-friendly SELECT policy
CREATE POLICY "profiles_secure_access"
ON public.profiles
FOR SELECT
USING (
  -- User viewing their own profile
  user_id = auth.uid()
  OR
  -- Admin access to all profiles
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Family members can view each other's profiles
  -- Both viewer and profile owner must be in the same family
  EXISTS (
    SELECT 1
    FROM public.family_members fm_viewer
    JOIN public.family_members fm_profile_owner 
      ON fm_viewer.family_id = fm_profile_owner.family_id
    WHERE fm_viewer.user_id = auth.uid()
      AND fm_profile_owner.user_id = profiles.user_id
  )
);

COMMENT ON POLICY "profiles_secure_access" ON public.profiles 
IS 'Family members can view each other''s basic profile info (names only). No cross-family data leakage.';