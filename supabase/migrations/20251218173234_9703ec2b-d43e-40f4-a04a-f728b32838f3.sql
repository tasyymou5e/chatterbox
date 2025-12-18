-- Add missing FK covering index for chore_completions.family_id
CREATE INDEX IF NOT EXISTS idx_chore_completions_family_id 
ON public.chore_completions(family_id);