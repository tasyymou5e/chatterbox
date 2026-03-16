-- Simplify profiles RLS: Single clear policy with no complexity
-- Only profile owner, their family creator, and admins can view profiles

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Parents can view their children's profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Family members can view basic profile info" ON public.profiles;

-- Create ONE simple, secure policy for SELECT
CREATE POLICY "profiles_secure_access"
ON public.profiles
FOR SELECT
USING (
  -- User viewing their own profile
  user_id = auth.uid()
  OR
  -- Admin access
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Parent viewing their child's profile (parent must be family creator)
  EXISTS (
    SELECT 1
    FROM public.families f
    WHERE f.created_by = auth.uid()
      AND EXISTS (
        SELECT 1 
        FROM public.family_members fm
        WHERE fm.family_id = f.id
          AND fm.user_id = profiles.user_id
          AND fm.role = 'child'::app_role
      )
  )
);

-- Create policy for UPDATE (users can only update their own profile)
CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

COMMENT ON POLICY "profiles_secure_access" ON public.profiles 
IS 'Simplified access: (1) Own profile, (2) Admins, (3) Family creator viewing their children. No other access allowed.';