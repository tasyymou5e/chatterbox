-- Add missing FK covering index for families.created_by
CREATE INDEX IF NOT EXISTS idx_families_created_by 
ON public.families(created_by);