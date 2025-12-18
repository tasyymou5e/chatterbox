-- Optimize RLS policy on achievements table by wrapping auth.uid() in subquery

-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage achievements" ON public.achievements;

-- Recreate with optimized auth.uid() call
CREATE POLICY "Admins can manage achievements"
ON public.achievements FOR ALL
USING (has_role((select auth.uid()), 'admin'::app_role))
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));