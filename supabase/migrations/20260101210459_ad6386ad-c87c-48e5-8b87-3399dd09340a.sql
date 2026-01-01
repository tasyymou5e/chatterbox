-- Fix: Allow family members to view each other's profiles
-- This is critical for parents to see their children's names

-- Create a new policy that allows family members to view each other's profiles
CREATE POLICY "profiles_select_family_members" ON profiles
FOR SELECT TO public
USING (
  -- User can see their own profile
  user_id = auth.uid()
  OR
  -- User can see profiles of people in the same family
  EXISTS (
    SELECT 1 FROM family_members fm1
    JOIN family_members fm2 ON fm1.family_id = fm2.family_id
    WHERE fm1.user_id = auth.uid()
    AND fm2.user_id = profiles.user_id
  )
  OR
  -- Admins can see all profiles
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Read-only admins can see all profiles
  has_role(auth.uid(), 'read_only'::app_role)
);

-- Drop the old restrictive policies that are now redundant
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;