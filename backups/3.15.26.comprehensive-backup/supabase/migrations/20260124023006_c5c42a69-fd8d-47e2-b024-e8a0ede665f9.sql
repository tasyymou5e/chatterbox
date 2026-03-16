-- Data repair migration: Fix users missing profiles and/or roles
-- This addresses the parent sign-in failure for users like eo@wccgroup.net

-- Step 1: Create missing profiles for authenticated users
INSERT INTO public.profiles (user_id, first_name, last_name)
SELECT 
  au.id,
  COALESCE(
    au.raw_user_meta_data->>'first_name', 
    split_part(au.email, '@', 1)
  ),
  COALESCE(au.raw_user_meta_data->>'last_name', '')
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
WHERE p.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- Step 2: Assign 'parent' role to users with profiles but no roles
-- Skip users who were created by admin or parent (child accounts)
INSERT INTO public.user_roles (user_id, role)
SELECT 
  p.user_id,
  'parent'
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id
WHERE ur.id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM auth.users au 
    WHERE au.id = p.user_id 
    AND (
      COALESCE((au.raw_user_meta_data->>'created_by_admin')::boolean, false) = TRUE
      OR COALESCE((au.raw_user_meta_data->>'created_by_parent')::boolean, false) = TRUE
    )
  )
ON CONFLICT (user_id, role) DO NOTHING;