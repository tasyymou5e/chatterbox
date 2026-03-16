-- Add foreign key constraint for assigned_to -> profiles
ALTER TABLE public.chore_assignments
ADD CONSTRAINT chore_assignments_assigned_to_fkey
FOREIGN KEY (assigned_to)
REFERENCES public.profiles(user_id)
ON DELETE CASCADE;

-- Add foreign key constraint for assigned_by -> profiles
ALTER TABLE public.chore_assignments
ADD CONSTRAINT chore_assignments_assigned_by_fkey
FOREIGN KEY (assigned_by)
REFERENCES public.profiles(user_id)
ON DELETE SET NULL;