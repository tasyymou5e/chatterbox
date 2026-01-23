-- Fix auto_create_family_for_parent function - remove email reference
CREATE OR REPLACE FUNCTION public.auto_create_family_for_parent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_profile RECORD;
  new_family_id UUID;
  family_code_value TEXT;
  user_name TEXT;
BEGIN
  -- Only proceed if the role is 'parent'
  IF NEW.role != 'parent' THEN
    RETURN NEW;
  END IF;
  
  -- Check if user already belongs to a family
  IF EXISTS (
    SELECT 1 FROM public.family_members 
    WHERE user_id = NEW.user_id
  ) THEN
    RETURN NEW;
  END IF;
  
  -- Get user profile info (without email - it's in auth.users)
  SELECT first_name, last_name INTO user_profile
  FROM public.profiles 
  WHERE user_id = NEW.user_id;
  
  -- Build display name
  IF user_profile.first_name IS NOT NULL THEN
    user_name := user_profile.first_name || '''s Family';
  ELSE
    user_name := 'New Family';
  END IF;
  
  -- Generate a unique family code
  SELECT generate_family_code() INTO family_code_value;
  
  -- Create the family
  INSERT INTO public.families (display_name, family_code)
  VALUES (user_name, family_code_value)
  RETURNING id INTO new_family_id;
  
  -- Add user as family member with parent role
  INSERT INTO public.family_members (family_id, user_id, role)
  VALUES (new_family_id, NEW.user_id, 'parent');
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the role assignment
    RAISE WARNING 'auto_create_family_for_parent failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Fix audit_profile_access function - remove email reference
CREATE OR REPLACE FUNCTION public.audit_profile_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log profile access for security auditing
  -- Note: email is stored in auth.users, not profiles
  IF TG_OP = 'UPDATE' THEN
    -- Log significant profile updates
    INSERT INTO public.admin_audit_logs (
      admin_user_id,
      operation_type,
      target_table,
      target_id,
      old_values,
      new_values,
      metadata
    ) VALUES (
      auth.uid(),
      'profile_update',
      'profiles',
      NEW.user_id::TEXT,
      jsonb_build_object(
        'first_name', OLD.first_name,
        'last_name', OLD.last_name,
        'avatar_url', OLD.avatar_url
      ),
      jsonb_build_object(
        'first_name', NEW.first_name,
        'last_name', NEW.last_name,
        'avatar_url', NEW.avatar_url
      ),
      jsonb_build_object('trigger', 'audit_profile_access')
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Don't fail the operation if audit logging fails
    RAISE WARNING 'audit_profile_access failed: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;