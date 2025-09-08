-- Clean up orphaned user_activity_logs records that don't have corresponding profiles
DELETE FROM public.user_activity_logs 
WHERE user_id NOT IN (SELECT user_id FROM public.profiles WHERE user_id IS NOT NULL);

-- Now add the foreign key constraint
ALTER TABLE public.user_activity_logs 
ADD CONSTRAINT user_activity_logs_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;

-- Add index for better performance on joins
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id ON public.user_activity_logs(user_id);