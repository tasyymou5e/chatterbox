-- EMERGENCY SECURITY LOCKDOWN: Block ALL unauthenticated access to profiles

-- First, ensure RLS is enabled and create a complete lockdown
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "authenticated_users_own_profile_select" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_users_own_profile_update" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_users_own_profile_insert" ON public.profiles;
DROP POLICY IF EXISTS "admins_full_access_profiles" ON public.profiles;
DROP POLICY IF EXISTS "parents_view_family_basic_info" ON public.profiles;
DROP POLICY IF EXISTS "connected_users_limited_profile_access" ON public.profiles;

-- Create explicit DENY policy for public role (unauthenticated users)
CREATE POLICY "deny_all_public_access" 
ON public.profiles FOR ALL 
TO public 
USING (false) 
WITH CHECK (false);

-- Create restrictive policies ONLY for authenticated users
CREATE POLICY "users_own_profile_only" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

CREATE POLICY "users_update_own_profile" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

CREATE POLICY "users_insert_own_profile" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND auth.uid() = user_id
);

-- Admin access only with explicit authentication check
CREATE POLICY "admin_access_with_auth_check" 
ON public.profiles FOR ALL 
TO authenticated 
USING (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Revoke all privileges from public role on profiles table
REVOKE ALL PRIVILEGES ON public.profiles FROM public;

-- Grant only necessary privileges to authenticated role
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;