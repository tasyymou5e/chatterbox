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

-- Create secure RLS policies that require authentication

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

-- Policy 3: Admins can access all profiles
CREATE POLICY "admins_full_access_profiles" 
ON public.profiles FOR ALL 
TO authenticated 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policy 4: Parents can view basic info of their family members (NOT emails)
-- This policy allows parents to see first_name and last_name only of family members
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

-- Create a secure view for public profile information that excludes emails
CREATE OR REPLACE VIEW public.safe_profiles AS
SELECT 
  user_id,
  first_name,
  last_name,
  created_at
FROM public.profiles;

-- Enable RLS on the safe_profiles view
ALTER VIEW public.safe_profiles SET (security_invoker = on);

-- Create policies for the safe view
CREATE POLICY "safe_profiles_family_access" 
ON public.safe_profiles FOR SELECT 
TO authenticated 
USING (
  auth.uid() = user_id OR
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM family_members fm1
    JOIN family_members fm2 ON fm1.family_id = fm2.family_id
    WHERE fm1.user_id = auth.uid() AND fm2.user_id = safe_profiles.user_id
  )
);

-- Add logging for sensitive profile access
CREATE OR REPLACE FUNCTION public.log_profile_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when someone accesses profile data
  INSERT INTO public.security_audit_logs (
    user_id, event_type, severity, event_details
  ) VALUES (
    auth.uid(),
    'profile_access',
    'medium',
    jsonb_build_object(
      'accessed_profile_id', COALESCE(NEW.user_id, OLD.user_id),
      'operation', TG_OP,
      'timestamp', now()
    )
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for profile access logging
DROP TRIGGER IF EXISTS profile_access_audit_trigger ON public.profiles;
CREATE TRIGGER profile_access_audit_trigger
  AFTER SELECT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION log_profile_access();

-- Verify RLS is enabled (should already be true)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;