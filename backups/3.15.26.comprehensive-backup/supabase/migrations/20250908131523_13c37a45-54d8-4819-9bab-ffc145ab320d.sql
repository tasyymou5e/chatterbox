-- Fix function search path security issues
-- Update audit_profile_access function to have proper search path
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;