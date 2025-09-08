-- Create a function to test RLS policies from different contexts
CREATE OR REPLACE FUNCTION public.test_profiles_access()
RETURNS TABLE(
  access_level TEXT,
  can_access BOOLEAN,
  record_count INTEGER,
  auth_uid UUID,
  auth_role TEXT
) 
LANGUAGE plpgsql SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  -- Test access as current user (should respect RLS)
  RETURN QUERY
  SELECT 
    'current_user'::TEXT as access_level,
    (SELECT COUNT(*) > 0 FROM public.profiles LIMIT 1)::BOOLEAN as can_access,
    (SELECT COUNT(*)::INTEGER FROM public.profiles) as record_count,
    auth.uid() as auth_uid,
    auth.role()::TEXT as auth_role;
END;
$$;

-- Test the function
SELECT * FROM public.test_profiles_access();