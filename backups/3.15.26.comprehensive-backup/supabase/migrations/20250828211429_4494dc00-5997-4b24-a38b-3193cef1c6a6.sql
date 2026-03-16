-- Security Fix: Make profiles table access more restrictive
-- This addresses the critical security vulnerability where email addresses could be stolen

-- First, drop existing permissive policies that might allow unintended access
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Parents can view their family members' profiles" ON public.profiles;  
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create new, more restrictive policies that explicitly require authentication
-- Policy 1: Users can only view and update their own profile (requires authentication)
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy 2: Admins can view all profiles (requires authentication + admin role)
CREATE POLICY "Admins view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policy 3: Parents can view their family members' profiles (requires authentication + parent role + family relationship)
CREATE POLICY "Parents view family profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  has_role(auth.uid(), 'parent'::app_role) 
  AND EXISTS (
    SELECT 1 
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    WHERE f.created_by = auth.uid() 
    AND fm.user_id = profiles.user_id
  )
);

-- Policy 4: Explicitly deny all access to anonymous users
CREATE POLICY "Deny anonymous access" 
ON public.profiles 
FOR ALL 
TO anon
USING (false);

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Force RLS for table owner as well (extra security)
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;