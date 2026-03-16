-- Create function to validate role conflicts
CREATE OR REPLACE FUNCTION public.validate_role_conflicts(p_roles text[])
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  admin_roles text[] := ARRAY['admin', 'read_only'];
  family_roles text[] := ARRAY['parent', 'child'];
  admin_count integer := 0;
  family_count integer := 0;
  role text;
BEGIN
  -- Count admin and family roles
  FOREACH role IN ARRAY p_roles
  LOOP
    IF role = ANY(admin_roles) THEN
      admin_count := admin_count + 1;
    ELSIF role = ANY(family_roles) THEN
      family_count := family_count + 1;
    END IF;
  END LOOP;
  
  -- Check for conflicts
  IF admin_count > 0 AND family_count > 0 THEN
    RAISE EXCEPTION 'Role conflict: Users cannot have both admin roles and family roles';
  END IF;
  
  IF admin_count > 1 THEN
    RAISE EXCEPTION 'Role conflict: Users can only have one admin role';
  END IF;
  
  IF family_count > 1 THEN
    RAISE EXCEPTION 'Role conflict: Users can only have one family role';
  END IF;
  
  RETURN true;
END;
$$;

-- Create trigger function to validate roles on insert/update
CREATE OR REPLACE FUNCTION public.validate_user_roles()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_roles text[];
BEGIN
  -- Get all roles for the user
  SELECT ARRAY(
    SELECT role::text 
    FROM public.user_roles 
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND id != COALESCE(OLD.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) INTO user_roles;
  
  -- Add the new role if this is an insert or update
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    user_roles := array_append(user_roles, NEW.role::text);
  END IF;
  
  -- Validate the complete set of roles
  PERFORM public.validate_role_conflicts(user_roles);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on user_roles table
DROP TRIGGER IF EXISTS trigger_validate_user_roles ON public.user_roles;
CREATE TRIGGER trigger_validate_user_roles
  BEFORE INSERT OR UPDATE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_roles();

-- Create function to detect users with conflicting roles
CREATE OR REPLACE FUNCTION public.detect_role_conflicts()
RETURNS TABLE(
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  conflicting_roles text[],
  conflict_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  WITH user_role_summary AS (
    SELECT 
      ur.user_id,
      array_agg(ur.role::text ORDER BY ur.role) as roles,
      COUNT(CASE WHEN ur.role::text IN ('admin', 'read_only') THEN 1 END) as admin_role_count,
      COUNT(CASE WHEN ur.role::text IN ('parent', 'child') THEN 1 END) as family_role_count
    FROM public.user_roles ur
    GROUP BY ur.user_id
  ),
  conflicts AS (
    SELECT 
      urs.user_id,
      urs.roles,
      CASE 
        WHEN urs.admin_role_count > 0 AND urs.family_role_count > 0 THEN 'admin_family_conflict'
        WHEN urs.admin_role_count > 1 THEN 'multiple_admin_roles'
        WHEN urs.family_role_count > 1 THEN 'multiple_family_roles'
        ELSE null
      END as conflict_type
    FROM user_role_summary urs
    WHERE urs.admin_role_count > 1 
       OR urs.family_role_count > 1 
       OR (urs.admin_role_count > 0 AND urs.family_role_count > 0)
  )
  SELECT 
    c.user_id,
    p.email,
    p.first_name,
    p.last_name,
    c.roles as conflicting_roles,
    c.conflict_type
  FROM conflicts c
  JOIN public.profiles p ON p.user_id = c.user_id
  ORDER BY c.conflict_type, p.email;
END;
$$;