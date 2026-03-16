-- CRITICAL SECURITY FIX: Secure the profiles table
-- Drop all existing insecure policies on profiles table

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Parents can view family members profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Parents view family profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users access own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Admins full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Connected users can view basic family member profiles" ON public.profiles;

-- Create secure RLS policies that ONLY allow authenticated users

-- Policy 1: Users can only view and update their own profile
CREATE POLICY "authenticated_users_own_profile_select" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "authenticated_users_own_profile_update" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 2: Users can insert their own profile during registration
CREATE POLICY "authenticated_users_own_profile_insert" 
ON public.profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Policy 3: Admins can access all profiles (admin operations only)
CREATE POLICY "admins_full_access_profiles" 
ON public.profiles FOR ALL 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policy 4: Parents can view basic info of their family members
CREATE POLICY "parents_view_family_basic_info" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (
  has_role(auth.uid(), 'parent'::app_role) AND
  EXISTS (
    SELECT 1 FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    WHERE f.created_by = auth.uid() 
    AND fm.user_id = profiles.user_id
  )
);

-- Policy 5: Connected family members can view limited profile data
CREATE POLICY "connected_users_limited_profile_access" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM family_connections fc
    JOIN family_members fm ON fm.family_id = fc.family_id
    WHERE fc.connected_user_id = auth.uid() 
    AND fc.status = 'accepted'
    AND fm.user_id = profiles.user_id
    AND has_connection_permission(fc.family_id, auth.uid(), 'can_view_progress')
  )
);

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;