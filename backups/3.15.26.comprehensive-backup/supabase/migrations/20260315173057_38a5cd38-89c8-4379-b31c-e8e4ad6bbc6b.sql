
-- Phase 1a: Extend life_skill_catalog with autism skill domain columns
ALTER TABLE public.life_skill_catalog
  ADD COLUMN IF NOT EXISTS skill_domain text DEFAULT 'daily_living',
  ADD COLUMN IF NOT EXISTS autism_skill_tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS clinical_reference text,
  ADD COLUMN IF NOT EXISTS step_by_step_instructions jsonb,
  ADD COLUMN IF NOT EXISTS pause_checkpoint_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_duration_minutes integer,
  ADD COLUMN IF NOT EXISTS item_type text DEFAULT 'chore';

-- Phase 1b: Create skill_plan_schedules table
CREATE TABLE public.skill_plan_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.profiles(user_id),
  approved_by uuid REFERENCES public.profiles(user_id),
  schedule_type text NOT NULL DEFAULT 'daily' CHECK (schedule_type IN ('daily', 'weekly', 'monthly')),
  plan_name text NOT NULL,
  plan_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'active', 'archived')),
  approval_notes text,
  approved_at timestamptz,
  start_date date NOT NULL,
  end_date date,
  assessment_basis_id uuid REFERENCES public.assessment_results(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Phase 1c: Create plan_session_logs table
CREATE TABLE public.plan_session_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  plan_item_id uuid REFERENCES public.user_daily_plan_items(id) ON DELETE SET NULL,
  catalog_item_id uuid REFERENCES public.life_skill_catalog(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  paused_at timestamptz,
  resumed_at timestamptz,
  completed_at timestamptz,
  current_step integer DEFAULT 0,
  total_steps integer DEFAULT 0,
  pause_reason text CHECK (pause_reason IN ('timeout', 'break', 'child_request', 'ai_suggestion')),
  ai_observations text,
  duration_seconds integer DEFAULT 0,
  completion_status text NOT NULL DEFAULT 'in_progress' CHECK (completion_status IN ('in_progress', 'paused', 'completed', 'skipped')),
  score integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_skill_plan_schedules_child ON public.skill_plan_schedules(child_id);
CREATE INDEX idx_skill_plan_schedules_family ON public.skill_plan_schedules(family_id);
CREATE INDEX idx_skill_plan_schedules_status ON public.skill_plan_schedules(status);
CREATE INDEX idx_plan_session_logs_child ON public.plan_session_logs(child_id);
CREATE INDEX idx_plan_session_logs_catalog ON public.plan_session_logs(catalog_item_id);
CREATE INDEX idx_plan_session_logs_status ON public.plan_session_logs(completion_status);
CREATE INDEX idx_life_skill_catalog_domain ON public.life_skill_catalog(skill_domain);
CREATE INDEX idx_life_skill_catalog_type ON public.life_skill_catalog(item_type);

-- Phase 1d: Enable RLS
ALTER TABLE public.skill_plan_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_session_logs ENABLE ROW LEVEL SECURITY;

-- RLS for skill_plan_schedules: parents/counselors in the family can manage
CREATE POLICY "Family members can view schedules"
ON public.skill_plan_schedules FOR SELECT
TO authenticated
USING (has_family_access(family_id, (SELECT auth.uid())));

CREATE POLICY "Parents can manage schedules"
ON public.skill_plan_schedules FOR INSERT
TO authenticated
WITH CHECK (
  has_family_access(family_id, (SELECT auth.uid()))
  AND (SELECT auth.uid()) = created_by
);

CREATE POLICY "Parents can update schedules"
ON public.skill_plan_schedules FOR UPDATE
TO authenticated
USING (has_family_access(family_id, (SELECT auth.uid())))
WITH CHECK (has_family_access(family_id, (SELECT auth.uid())));

CREATE POLICY "Parents can delete schedules"
ON public.skill_plan_schedules FOR DELETE
TO authenticated
USING (
  has_family_access(family_id, (SELECT auth.uid()))
  AND (SELECT auth.uid()) = created_by
);

-- RLS for plan_session_logs: children can manage their own, parents can view family
CREATE POLICY "Children can manage own session logs"
ON public.plan_session_logs FOR ALL
TO authenticated
USING ((SELECT auth.uid()) = child_id)
WITH CHECK ((SELECT auth.uid()) = child_id);

CREATE POLICY "Parents can view family session logs"
ON public.plan_session_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.family_members fm1
    JOIN public.family_members fm2 ON fm1.family_id = fm2.family_id
    WHERE fm1.user_id = (SELECT auth.uid())
    AND fm2.user_id = child_id
    AND fm1.role = 'parent'
  )
);

-- Updated_at trigger for skill_plan_schedules
CREATE OR REPLACE FUNCTION update_skill_plan_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_skill_plan_schedules_timestamp
  BEFORE UPDATE ON public.skill_plan_schedules
  FOR EACH ROW EXECUTE FUNCTION update_skill_plan_schedules_updated_at();
