-- Fix profiles RLS policy to allow service role and admins to create profiles for others
DROP POLICY IF EXISTS "profiles_insert_own_only" ON public.profiles;

CREATE POLICY "profiles_insert_controlled" 
ON public.profiles 
FOR INSERT 
TO authenticated, service_role
WITH CHECK (
  -- Users can create their own profiles
  auth.uid() = user_id 
  OR 
  -- Service role can create any profile (for edge functions)
  auth.role() = 'service_role'
  OR 
  -- Admin users can create profiles for others
  has_role(auth.uid(), 'admin'::app_role)
);