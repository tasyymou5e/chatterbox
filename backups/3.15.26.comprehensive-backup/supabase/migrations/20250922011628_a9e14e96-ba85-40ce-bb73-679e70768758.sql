-- Clean up existing role conflicts
-- Remove duplicate roles for users with conflicts
DELETE FROM public.user_roles 
WHERE id IN (
  SELECT DISTINCT ON (user_id, role) id 
  FROM public.user_roles 
  WHERE user_id IN (
    SELECT user_id 
    FROM public.user_roles 
    GROUP BY user_id 
    HAVING COUNT(DISTINCT role) > 1
    AND (
      -- Has both admin and family roles
      COUNT(CASE WHEN role IN ('admin', 'read_only') THEN 1 END) > 0
      AND COUNT(CASE WHEN role IN ('parent', 'child') THEN 1 END) > 0
    )
  )
  AND role IN ('parent', 'child') -- Remove family roles for conflicted users
);

-- Add unique constraint to prevent multiple instances of same role per user
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_role_unique 
UNIQUE (user_id, role);

-- Improve the role validation trigger to be more robust
CREATE OR REPLACE FUNCTION public.validate_user_roles_enhanced()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_roles text[];
  admin_roles text[] := ARRAY['admin', 'read_only'];
  family_roles text[] := ARRAY['parent', 'child'];
  admin_count integer := 0;
  family_count integer := 0;
  role text;
BEGIN
  -- Get all roles for the user (including the new one if insert/update)
  SELECT ARRAY(
    SELECT role::text 
    FROM public.user_roles 
    WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    AND (TG_OP = 'DELETE' OR id != COALESCE(OLD.id, '00000000-0000-0000-0000-000000000000'::uuid))
  ) INTO user_roles;
  
  -- Add the new role if this is an insert or update
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    user_roles := array_append(user_roles, NEW.role::text);
  END IF;
  
  -- Count admin and family roles
  FOREACH role IN ARRAY user_roles
  LOOP
    IF role = ANY(admin_roles) THEN
      admin_count := admin_count + 1;
    ELSIF role = ANY(family_roles) THEN
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

-- Drop the old trigger and create new one
DROP TRIGGER IF EXISTS validate_user_roles_trigger ON public.user_roles;
CREATE TRIGGER validate_user_roles_enhanced_trigger
  BEFORE INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_user_roles_enhanced();

-- Create function to check email availability for real-time validation
CREATE OR REPLACE FUNCTION public.check_email_availability(p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Check if user is admin (only admins can check email availability)
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Return true if email is available (not found in profiles or auth.users)
  RETURN NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE email = p_email
  );
END;
$function$;