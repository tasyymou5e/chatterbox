-- =============================================
-- FIX RLS POLICIES FOR CHORES AND ASSIGNMENTS
-- Allow any parent in family to manage chores
-- =============================================

-- Drop existing overly restrictive policies on chores
DROP POLICY IF EXISTS "chores_access" ON public.chores;
DROP POLICY IF EXISTS "chores_select" ON public.chores;
DROP POLICY IF EXISTS "chores_insert" ON public.chores;
DROP POLICY IF EXISTS "chores_update" ON public.chores;
DROP POLICY IF EXISTS "chores_delete" ON public.chores;

-- Create separate SELECT policy for chores
-- Family members can view their family's chores
CREATE POLICY "chores_select" ON public.chores
FOR SELECT USING (
  -- Admins can see all
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Family members can see their family's chores
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = chores.family_id
    AND fm.user_id = auth.uid()
  )
);

-- Create INSERT policy for chores
-- Only parents in the family can create chores
CREATE POLICY "chores_insert" ON public.chores
FOR INSERT WITH CHECK (
  -- Must set created_by to current user
  created_by = auth.uid()
  AND
  (
    -- Admins can create for any family
    has_role(auth.uid(), 'admin'::app_role)
    OR
    -- Parents can create chores for their family
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = chores.family_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'parent'::app_role
    )
  )
);

-- Create UPDATE policy for chores
-- Only parents in the family can update chores
CREATE POLICY "chores_update" ON public.chores
FOR UPDATE USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = chores.family_id
    AND fm.user_id = auth.uid()
    AND fm.role = 'parent'::app_role
  )
) WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = chores.family_id
    AND fm.user_id = auth.uid()
    AND fm.role = 'parent'::app_role
  )
);

-- Create DELETE policy for chores
-- Only parents can delete chores (and only ones they created)
CREATE POLICY "chores_delete" ON public.chores
FOR DELETE USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR
  (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = chores.family_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'parent'::app_role
    )
  )
);

-- =============================================
-- FIX RLS POLICIES FOR CHORE ASSIGNMENTS
-- =============================================

-- Drop existing policies on chore_assignments
DROP POLICY IF EXISTS "chore_assignments_access" ON public.chore_assignments;
DROP POLICY IF EXISTS "chore_assignments_select" ON public.chore_assignments;
DROP POLICY IF EXISTS "chore_assignments_insert" ON public.chore_assignments;
DROP POLICY IF EXISTS "chore_assignments_update" ON public.chore_assignments;
DROP POLICY IF EXISTS "chore_assignments_delete" ON public.chore_assignments;

-- Create SELECT policy for assignments
-- Family members can view their family's assignments
CREATE POLICY "chore_assignments_select" ON public.chore_assignments
FOR SELECT USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = chore_assignments.family_id
    AND fm.user_id = auth.uid()
  )
);

-- Create INSERT policy for assignments
-- Only parents can create assignments
CREATE POLICY "chore_assignments_insert" ON public.chore_assignments
FOR INSERT WITH CHECK (
  -- Must set assigned_by to current user
  assigned_by = auth.uid()
  AND
  (
    has_role(auth.uid(), 'admin'::app_role)
    OR
    -- Parents can assign chores in their family
    EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = chore_assignments.family_id
      AND fm.user_id = auth.uid()
      AND fm.role = 'parent'::app_role
    )
  )
  AND
  -- Assigned_to must be a member of the same family
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = chore_assignments.family_id
    AND fm.user_id = chore_assignments.assigned_to
  )
);

-- Create UPDATE policy for assignments
-- Parents can update any assignment, children can only update their own status
CREATE POLICY "chore_assignments_update" ON public.chore_assignments
FOR UPDATE USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Parents can update any assignment in their family
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = chore_assignments.family_id
    AND fm.user_id = auth.uid()
    AND fm.role = 'parent'::app_role
  )
  OR
  -- Children can update their own assignments (status only - enforced by trigger)
  (
    assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = chore_assignments.family_id
      AND fm.user_id = auth.uid()
    )
  )
) WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  OR
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = chore_assignments.family_id
    AND fm.user_id = auth.uid()
    AND fm.role = 'parent'::app_role
  )
  OR
  (
    assigned_to = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.family_members fm
      WHERE fm.family_id = chore_assignments.family_id
      AND fm.user_id = auth.uid()
    )
  )
);

-- Create DELETE policy for assignments
-- Only parents can delete assignments
CREATE POLICY "chore_assignments_delete" ON public.chore_assignments
FOR DELETE USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR
  EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = chore_assignments.family_id
    AND fm.user_id = auth.uid()
    AND fm.role = 'parent'::app_role
  )
);

-- =============================================
-- CREATE TRIGGER TO RESTRICT CHILD UPDATES
-- =============================================

-- Create function to restrict what children can update
CREATE OR REPLACE FUNCTION public.restrict_child_assignment_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_role app_role;
BEGIN
  -- Get the user's role in this family
  SELECT fm.role INTO user_role
  FROM public.family_members fm
  WHERE fm.family_id = NEW.family_id
  AND fm.user_id = auth.uid();
  
  -- If user is a child (not parent or admin), restrict updates
  IF user_role = 'child'::app_role THEN
    -- Children can only update these fields
    IF OLD.family_id IS DISTINCT FROM NEW.family_id
       OR OLD.chore_id IS DISTINCT FROM NEW.chore_id
       OR OLD.assigned_by IS DISTINCT FROM NEW.assigned_by
       OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to
       OR OLD.points_earned IS DISTINCT FROM NEW.points_earned
       OR OLD.time_bonus IS DISTINCT FROM NEW.time_bonus
       OR OLD.streak_bonus IS DISTINCT FROM NEW.streak_bonus
       OR OLD.is_verified IS DISTINCT FROM NEW.is_verified
       OR OLD.verified_by IS DISTINCT FROM NEW.verified_by
       OR OLD.verified_at IS DISTINCT FROM NEW.verified_at
       OR OLD.parent_feedback IS DISTINCT FROM NEW.parent_feedback
    THEN
      RAISE EXCEPTION 'Children can only update status, started_at, completed_at, and completion_notes';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on chore_assignments
DROP TRIGGER IF EXISTS restrict_child_assignment_updates_trigger ON public.chore_assignments;
CREATE TRIGGER restrict_child_assignment_updates_trigger
  BEFORE UPDATE ON public.chore_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.restrict_child_assignment_updates();