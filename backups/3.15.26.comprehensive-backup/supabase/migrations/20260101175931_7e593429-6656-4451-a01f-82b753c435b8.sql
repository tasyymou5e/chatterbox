-- Create secure function to fetch users with emails for admin use only
CREATE OR REPLACE FUNCTION public.get_users_with_emails()
RETURNS TABLE(
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to access this function
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.user_id,
    au.email::text,
    p.first_name,
    p.last_name,
    p.created_at
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.user_id
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users (function checks admin internally)
GRANT EXECUTE ON FUNCTION public.get_users_with_emails() TO authenticated;