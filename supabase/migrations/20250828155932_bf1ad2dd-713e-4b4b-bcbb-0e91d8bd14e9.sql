-- Update eric@wccgroup.net user to admin role
-- User ID: 74c46b94-643d-49d5-9dc9-98cfef750859

-- Update the user role from 'parent' to 'admin'
UPDATE public.user_roles 
SET role = 'admin'::app_role
WHERE user_id = '74c46b94-643d-49d5-9dc9-98cfef750859'::uuid;

-- Update the profile information with proper names
UPDATE public.profiles 
SET 
  first_name = 'Eric',
  last_name = 'Admin'
WHERE user_id = '74c46b94-643d-49d5-9dc9-98cfef750859'::uuid;