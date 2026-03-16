-- Fix profiles table RLS policies to prevent unauthorized access to email and personal data
-- Drop existing potentially conflicting policies
DROP POLICY IF EXISTS "Admins have full profile access" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create consolidated, secure RLS policies for profiles table
-- Policy 1: Users can only view their own profile data
CREATE POLICY "Users can view own profile only"
ON public.profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 2: Users can only update their own profile data  
CREATE POLICY "Users can update own profile only"
ON public.profiles
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy 3: Users can only insert their own profile data
CREATE POLICY "Users can insert own profile only"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy 4: Admins have full access (separate, clear policy)
CREATE POLICY "Admins have full profile access"
ON public.profiles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add audit logging trigger for sensitive profile data access
CREATE OR REPLACE FUNCTION public.audit_profile_access()
RETURNS TRIGGER AS $$
BEGIN
  -- Log when sensitive data (email) is accessed
  IF TG_OP = 'SELECT' AND OLD.email IS NOT NULL THEN
    PERFORM log_sensitive_data_access(
      auth.uid(),
      'profiles',
      'SELECT',
      OLD.user_id
    );
  END IF;
  
  -- Log profile modifications
  IF TG_OP = 'UPDATE' THEN
    PERFORM log_sensitive_data_access(
      auth.uid(),
      'profiles', 
      'UPDATE',
      NEW.user_id
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;