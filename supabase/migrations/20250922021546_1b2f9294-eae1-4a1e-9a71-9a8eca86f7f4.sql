-- Fix ambiguous column reference in validate_user_roles_enhanced trigger function
CREATE OR REPLACE FUNCTION public.validate_user_roles_enhanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_roles text[];
  admin_roles text[] := ARRAY['admin', 'read_only'];
  family_roles text[] := ARRAY['parent', 'child'];
  admin_count integer := 0;
  family_count integer := 0;
  current_role text;  -- Renamed from 'role' to avoid ambiguity
BEGIN
  -- Get all roles for the user (including the new one if insert/update)
  SELECT ARRAY(
    SELECT user_roles.role::text  -- Explicitly qualify the column reference
    FROM public.user_roles 
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND (TG_OP = 'DELETE' OR id != COALESCE(OLD.id, '00000000-0000-0000-0000-000000000000'::uuid))
  ) INTO user_roles;
  
  -- Add the new role if this is an insert or update
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    user_roles := array_append(user_roles, NEW.role::text);
  END IF;
  
  -- Count admin and family roles
  FOREACH current_role IN ARRAY user_roles
  LOOP
    IF current_role = ANY(admin_roles) THEN
      admin_count := admin_count + 1;
    ELSIF current_role = ANY(family_roles) THEN
      family_count := family_count + 1;
    END IF;
  END LOOP;
  
  -- Check for conflicts
  IF admin_count > 0 AND family_count > 0 THEN
    RAISE EXCEPTION 'Role conflict: Users cannot have both admin roles (%) and family roles (%). Admin roles cannot join families.', 
      array_to_string(user_roles && admin_roles, ', '),
      array_to_string(user_roles && family_roles, ', ');
  END IF;
  
  IF admin_count > 1 THEN
    RAISE EXCEPTION 'Role conflict: Users can only have one admin role. Found: %', 
      array_to_string(user_roles && admin_roles, ', ');
  END IF;
  
  IF family_count > 1 THEN
    RAISE EXCEPTION 'Role conflict: Users can only have one family role. Found: %',
      array_to_string(user_roles && family_roles, ', ');
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;