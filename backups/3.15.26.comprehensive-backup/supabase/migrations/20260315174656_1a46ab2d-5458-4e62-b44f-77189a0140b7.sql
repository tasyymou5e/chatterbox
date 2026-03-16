
-- Phase 1: Add child_id to assessment_results
ALTER TABLE public.assessment_results
  ADD COLUMN IF NOT EXISTS child_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL;

-- Index for efficient child-based lookups
CREATE INDEX IF NOT EXISTS idx_assessment_results_child_id ON public.assessment_results(child_id);

-- RLS: Parents can view assessments for children in their family
CREATE POLICY "Parents can view child assessments"
  ON public.assessment_results
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR child_id IN (
      SELECT fm.user_id FROM public.family_members fm
      WHERE fm.family_id IN (
        SELECT fm2.family_id FROM public.family_members fm2 WHERE fm2.user_id = auth.uid()
      )
    )
  );

-- Add get_approved_plan action support: kids can read their own approved plans
CREATE POLICY "Children can view own approved plans"
  ON public.skill_plan_schedules
  FOR SELECT
  TO authenticated
  USING (child_id = auth.uid() AND status IN ('approved', 'active'));
