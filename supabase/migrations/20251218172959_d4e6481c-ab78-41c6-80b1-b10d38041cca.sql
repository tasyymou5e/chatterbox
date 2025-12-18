-- Add missing FK covering index for family_activity_logs.family_id
CREATE INDEX IF NOT EXISTS idx_family_activity_logs_family_id 
ON public.family_activity_logs(family_id);