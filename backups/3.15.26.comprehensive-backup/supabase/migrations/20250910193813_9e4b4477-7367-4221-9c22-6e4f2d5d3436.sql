-- Create a SECURITY DEFINER function to check admin roles
-- This bypasses RLS policies for service role authentication
CREATE OR REPLACE FUNCTION public.check_admin_role_secure(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if user has admin role
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = p_user_id 
    AND role = 'admin'::app_role
  );
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.check_admin_role_secure(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_admin_role_secure(uuid) TO service_role;