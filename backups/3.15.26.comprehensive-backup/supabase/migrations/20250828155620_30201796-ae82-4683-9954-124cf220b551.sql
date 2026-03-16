-- Create admin user profile and role
-- Note: The auth.users record should be created via Supabase Dashboard or Admin API
-- This migration handles the profile and role assignment

-- Insert admin profile (user_id will need to be updated with actual auth.users id)
-- For user: eric@wccgroup.net
INSERT INTO public.profiles (user_id, email, first_name, last_name)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid, -- Placeholder - will be updated
  'eric@wccgroup.net',
  'Eric',
  'Admin'
) ON CONFLICT (user_id) DO NOTHING;

-- Assign admin role
INSERT INTO public.user_roles (user_id, role)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid, -- Placeholder - will be updated
  'admin'::app_role
) ON CONFLICT (user_id, role) DO NOTHING;

-- Create a function to easily update the admin user_id once the auth user is created
CREATE OR REPLACE FUNCTION public.setup_admin_user(auth_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update profile with correct user_id
  UPDATE public.profiles 
  SET user_id = auth_user_id
  WHERE email = 'eric@wccgroup.net';
  
  -- Update user_roles with correct user_id
  UPDATE public.user_roles 
  SET user_id = auth_user_id
  WHERE user_id = '00000000-0000-0000-0000-000000000000'::uuid;
END;
$$;