-- PHASE 1 FINAL: FIX REMAINING FUNCTION SECURITY ISSUES
-- Add SET search_path = 'public' to functions that are missing it (excluding non-existent table references)

-- Update the core security functions that we know exist
CREATE OR REPLACE FUNCTION public.has_family_access(family_id_param uuid, user_id_param uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.validate_child_account_access(p_family_code text, p_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  account_exists boolean;
BEGIN
  -- Check if the child account exists and is pending
  SELECT EXISTS(
    SELECT 1 FROM child_accounts 
    WHERE family_code = p_family_code 
    AND generated_email = p_email 
    AND status = 'pending'
    AND user_id IS NULL
  ) INTO account_exists;
  
  -- Log the access attempt for security monitoring
  IF account_exists THEN
    PERFORM log_security_event(
      NULL, -- no user_id yet for pending accounts
      'child_account_access_attempt',
      'medium',
      jsonb_build_object(
        'family_code', p_family_code,
        'email', p_email,
        'success', true
      )
    );
  ELSE
    PERFORM log_security_event(
      NULL,
      'child_account_access_denied',
      'high',
      jsonb_build_object(
        'family_code', p_family_code,
        'email', p_email,
        'reason', 'invalid_credentials'
      )
    );
  END IF;
  
  RETURN account_exists;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_child_account_rate_limit(p_family_id uuid, p_parent_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recent_count INTEGER;
  max_per_day INTEGER := 5; -- Max 5 child accounts per day per family
BEGIN
  -- Count child accounts created in last 24 hours by this parent for this family
  SELECT COUNT(*)
  INTO recent_count
  FROM public.child_accounts
  WHERE family_id = p_family_id 
    AND created_by = p_parent_id
    AND created_at > (now() - interval '24 hours');
  
  -- Log security event if rate limit exceeded
  IF recent_count >= max_per_day THEN
    PERFORM log_security_event(
      p_parent_id,
      'child_account_rate_limit_exceeded',
      'high',
      jsonb_build_object(
        'family_id', p_family_id,
        'attempts_in_24h', recent_count,
        'max_allowed', max_per_day
      )
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;