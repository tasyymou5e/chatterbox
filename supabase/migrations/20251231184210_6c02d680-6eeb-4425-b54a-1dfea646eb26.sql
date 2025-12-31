-- Optimize certificates RLS policies to prevent auth function re-evaluation per row
-- Issue: auth.uid() is called directly instead of (SELECT auth.uid()), causing re-evaluation for each row

-- Drop existing policies
DROP POLICY IF EXISTS "certificates_select" ON public.certificates;
DROP POLICY IF EXISTS "certificates_insert" ON public.certificates;

-- Recreate SELECT policy with optimized auth calls
CREATE POLICY "certificates_select" ON public.certificates
  FOR SELECT
  USING (
    (user_id = (SELECT auth.uid()))
    OR has_role((SELECT auth.uid()), 'admin'::app_role)
    OR (
      has_role((SELECT auth.uid()), 'parent'::app_role)
      AND EXISTS (
        SELECT 1 FROM families f
        WHERE f.id = certificates.family_id
        AND f.created_by = (SELECT auth.uid())
      )
    )
  );

-- Recreate INSERT policy with optimized auth calls  
CREATE POLICY "certificates_insert" ON public.certificates
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL
    AND (
      (user_id = (SELECT auth.uid()))
      OR has_role((SELECT auth.uid()), 'admin'::app_role)
      OR (
        has_role((SELECT auth.uid()), 'parent'::app_role)
        AND EXISTS (
          SELECT 1 FROM families f
          WHERE f.id = certificates.family_id
          AND f.created_by = (SELECT auth.uid())
        )
      )
    )
  );