-- Get all user roles in single query
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id uuid)
RETURNS TABLE(role app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id;
$$;

-- Get highest priority role in single call
CREATE OR REPLACE FUNCTION public.get_primary_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'admin') THEN 'admin'
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'read_only') THEN 'read_only'
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'parent') THEN 'parent'
    WHEN EXISTS (SELECT 1 FROM user_roles WHERE user_id = _user_id AND role = 'child') THEN 'child'
    ELSE NULL
  END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_user_roles(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_primary_role(uuid) TO authenticated;