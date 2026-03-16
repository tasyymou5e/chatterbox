-- Allow parents to view activity logs of their family's children
-- This policy is additive (PERMISSIVE) so existing user and admin access remains unchanged
CREATE POLICY "Parents can view family children activity logs"
ON public.user_activity_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm
    JOIN public.families f ON f.id = fm.family_id
    WHERE fm.user_id = user_activity_logs.user_id
      AND fm.role = 'child'
      AND f.created_by = auth.uid()
  )
);