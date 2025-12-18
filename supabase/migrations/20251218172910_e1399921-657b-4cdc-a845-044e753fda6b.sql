-- Add missing FK covering index for chore_assignments.family_id
CREATE INDEX IF NOT EXISTS idx_chore_assignments_family_id 
ON public.chore_assignments(family_id);