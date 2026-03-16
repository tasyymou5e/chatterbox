-- Secure profiles table: Restrict name visibility to user, their parents, and admins only
-- This prevents lateral movement where any family member can view other members' names

-- Drop the overly permissive family members policy
DROP POLICY IF EXISTS "Family members can view basic profile info" ON public.profiles;

-- Create strict policy: Only parents can view their children's names
CREATE POLICY "Parents can view their children's profiles"
ON public.profiles
FOR SELECT
USING (
  -- User can view their own profile
  auth.uid() = user_id
  OR
  -- Admins can view all profiles
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Parents can view profiles of children in their families
  (
    has_role(auth.uid(), 'parent'::app_role)
    AND EXISTS (
      SELECT 1 
      FROM public.families f
      JOIN public.family_members fm_child ON fm_child.family_id = f.id
      JOIN public.family_members fm_parent ON fm_parent.family_id = f.id
      WHERE f.created_by = auth.uid()  -- Parent is family creator
        AND fm_parent.user_id = auth.uid()
        AND fm_parent.role = 'parent'::app_role
        AND fm_child.user_id = profiles.user_id
        AND fm_child.role IN ('child'::app_role)  -- Only children's profiles
    )
  )
);

COMMENT ON POLICY "Parents can view their children's profiles" ON public.profiles 
IS 'Strict access control: Users see own profile, parents see their children only, admins see all. Prevents lateral movement by non-parent family members.';