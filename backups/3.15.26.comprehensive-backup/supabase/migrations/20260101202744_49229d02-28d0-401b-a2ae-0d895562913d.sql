-- Allow parents to view achievements of their family's children
CREATE POLICY "Parents can view family children achievements"
ON public.user_achievements
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM family_members fm
    JOIN families f ON f.id = fm.family_id
    WHERE fm.user_id = user_achievements.user_id
      AND fm.role = 'child'
      AND f.created_by = auth.uid()
  )
  OR user_id = auth.uid()
  OR has_role(auth.uid(), 'admin'::app_role)
);