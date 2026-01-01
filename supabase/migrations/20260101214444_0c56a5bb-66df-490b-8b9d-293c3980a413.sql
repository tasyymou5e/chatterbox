-- Add foreign key constraint for connected_user_id -> profiles
ALTER TABLE public.family_connections
ADD CONSTRAINT family_connections_connected_user_id_fkey
FOREIGN KEY (connected_user_id)
REFERENCES public.profiles(user_id)
ON DELETE CASCADE;

-- Add foreign key constraint for invited_by -> profiles  
ALTER TABLE public.family_connections
ADD CONSTRAINT family_connections_invited_by_fkey
FOREIGN KEY (invited_by)
REFERENCES public.profiles(user_id)
ON DELETE SET NULL;