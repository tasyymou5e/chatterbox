-- Add foreign key constraint between user_activity_logs and profiles
-- First, let's check if there are any orphaned records that would prevent the constraint
-- This query will show us any user_activity_logs records without corresponding profiles

-- Add the missing foreign key constraint
ALTER TABLE public.user_activity_logs 
ADD CONSTRAINT user_activity_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add index for better performance on joins
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);