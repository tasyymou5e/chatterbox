-- Fix read-only transaction issues in security functions
-- Modify log_family_access to handle read-only contexts gracefully

CREATE OR REPLACE FUNCTION public.log_family_access(p_user_id uuid, p_family_id uuid, p_access_type text, p_success boolean, p_details jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Try to insert audit log, but ignore errors in read-only contexts
  BEGIN
    INSERT INTO public.security_audit_logs (
      user_id, 
      event_type, 
      severity,
      event_details
    ) VALUES (
      p_user_id,
      'family_access_attempt',
      CASE WHEN p_success THEN 'low' ELSE 'high' END,
      jsonb_build_object(
        'family_id', p_family_id,
        'access_type', p_access_type,
        'success', p_success,
        'timestamp', now(),
        'details', p_details
      )
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Silently ignore INSERT errors in read-only contexts
      -- This allows the security functions to work during SELECT operations
      NULL;
  END;
END;
$function$;

-- Modify is_family_creator_secure to handle read-only contexts
CREATE OR REPLACE FUNCTION public.is_family_creator_secure(family_id_param uuid, user_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_creator BOOLEAN;
BEGIN
  -- Check if user is family creator
  SELECT EXISTS (
    SELECT 1 FROM public.families 
    WHERE id = family_id_param 
    AND created_by = user_id_param
  ) INTO is_creator;
  
  -- Try to log access attempt, but don't fail if we can't
  BEGIN
    PERFORM log_family_access(
      user_id_param,
      family_id_param,
      'creator_check',
      is_creator,
      jsonb_build_object('function', 'is_family_creator_secure')
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Continue without logging if in read-only context
      NULL;
  END;
  
  RETURN is_creator;
END;
$function$;

-- Modify is_family_member_secure to handle read-only contexts
CREATE OR REPLACE FUNCTION public.is_family_member_secure(family_id_param uuid, user_id_param uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  is_member BOOLEAN;
BEGIN
  -- Check if user is family member
  SELECT EXISTS (
    SELECT 1 FROM public.family_members 
    WHERE family_id = family_id_param 
    AND user_id = user_id_param
  ) INTO is_member;
  
  -- Try to log access attempt, but don't fail if we can't
  BEGIN
    PERFORM log_family_access(
      user_id_param,
      family_id_param,
      'member_check',
      is_member,
      jsonb_build_object('function', 'is_family_member_secure')
    );
  EXCEPTION
    WHEN OTHERS THEN
      -- Continue without logging if in read-only context
      NULL;
  END;
  
  RETURN is_member;
END;
$function$;

-- Modify has_family_access to handle read-only contexts
CREATE OR REPLACE FUNCTION public.has_family_access(family_id_param uuid, user_id_param uuid DEFAULT auth.uid())
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  has_access BOOLEAN := false;
BEGIN
  -- Return false if no user
  IF user_id_param IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if admin
  IF has_role(user_id_param, 'admin'::app_role) THEN
    BEGIN
      PERFORM log_family_access(
        user_id_param,
        family_id_param,
        'admin_access',
        true,
        jsonb_build_object('reason', 'admin_role')
      );
    EXCEPTION
      WHEN OTHERS THEN NULL;
    END;
    RETURN true;
  END IF;
  
  -- Check if family creator
  IF is_family_creator_secure(family_id_param, user_id_param) THEN
    has_access := true;
  END IF;
  
  -- Check if family member
  IF NOT has_access AND is_family_member_secure(family_id_param, user_id_param) THEN
    has_access := true;
  END IF;
  
  -- Log final access decision only if access is denied
  IF NOT has_access THEN
    BEGIN
      PERFORM log_family_access(
        user_id_param,
        family_id_param,
        'access_denied',
        false,
        jsonb_build_object('reason', 'not_member_or_creator')
      );
    EXCEPTION
      WHEN OTHERS THEN NULL;
    END;
  END IF;
  
  RETURN has_access;
END;
$function$;