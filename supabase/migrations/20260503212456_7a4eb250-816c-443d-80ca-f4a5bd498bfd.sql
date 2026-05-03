DROP POLICY IF EXISTS "Service can manage provider status" ON public.llm_provider_status;
CREATE POLICY "Service role can manage provider status"
ON public.llm_provider_status AS PERMISSIVE FOR ALL TO service_role
USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS motivation_journal_access ON public.motivation_journal_entries;
CREATE POLICY motivation_journal_access
ON public.motivation_journal_entries AS PERMISSIVE FOR ALL TO public
USING (
  has_role((SELECT auth.uid()), 'admin'::app_role)
  OR user_id = (SELECT auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.family_members fm
    WHERE fm.family_id = motivation_journal_entries.family_id
      AND fm.user_id = (SELECT auth.uid())
      AND fm.role IN ('parent'::app_role,'admin'::app_role)
  )
)
WITH CHECK (
  has_role((SELECT auth.uid()), 'admin'::app_role)
  OR user_id = (SELECT auth.uid())
);

DROP POLICY IF EXISTS user_roles_unified ON public.user_roles;
CREATE POLICY user_roles_unified
ON public.user_roles AS RESTRICTIVE FOR ALL TO public
USING (
  user_id = (SELECT auth.uid())
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
)
WITH CHECK (
  has_role((SELECT auth.uid()), 'admin'::app_role)
);