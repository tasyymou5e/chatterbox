CREATE OR REPLACE FUNCTION public.detect_role_conflicts()
 RETURNS TABLE(user_id uuid, email text, first_name text, last_name text, conflicting_roles text[], conflict_type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Check if user is admin or service role
  IF auth.role() != 'service_role' AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
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
    au.email::text,
    COALESCE(p.first_name, '')::text as first_name,
    COALESCE(p.last_name, '')::text as last_name,
    c.roles as conflicting_roles,
    c.conflict_type
  FROM conflicts c
  LEFT JOIN auth.users au ON au.id = c.user_id
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  ORDER BY COALESCE(au.email, ''), c.conflict_type;
END;
$function$;