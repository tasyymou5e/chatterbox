-- Auto-create family when user gets parent role
CREATE OR REPLACE FUNCTION public.auto_create_family_for_parent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  new_family_id UUID;
  family_code TEXT;
  user_profile RECORD;
BEGIN
  -- Only proceed if this is a new parent role assignment
  IF NEW.role = 'parent'::app_role AND TG_OP = 'INSERT' THEN
    
    -- Check if user already has a family (prevent duplicates)
    IF EXISTS (
      SELECT 1 FROM public.family_members 
      WHERE user_id = NEW.user_id
    ) THEN
      RETURN NEW;
    END IF;
    
    -- Get user profile for family naming
    SELECT first_name, last_name, email INTO user_profile
    FROM public.profiles 
    WHERE user_id = NEW.user_id;
    
    -- Generate unique family code
    family_code := public.generate_family_code();
    
    -- Create the family
    INSERT INTO public.families (
      name,
      display_name,
      created_by,
      family_code,
      metadata
    ) VALUES (
      family_code,
      COALESCE(user_profile.first_name || '''s Family', 'My Family'),
      NEW.user_id,
      family_code,
      jsonb_build_object(
        'auto_created', true,
        'created_reason', 'parent_role_assignment',
        'created_at', now()
      )
    ) RETURNING id INTO new_family_id;
    
    -- Add the parent as family creator/member
    INSERT INTO public.family_members (
      family_id,
      user_id,
      role,
      joined_at,
      connection_metadata
    ) VALUES (
      new_family_id,
      NEW.user_id,
      'parent'::app_role,
      now(),
      jsonb_build_object(
        'auto_joined', true,
        'is_creator', true
      )
    );
    
    -- Log the auto-creation event
    PERFORM public.log_family_activity(
      new_family_id,
      NEW.user_id,
      'parent'::app_role,
      'family_auto_created',
      NEW.user_id,
      jsonb_build_object(
        'family_code', family_code,
        'trigger_source', 'parent_role_assignment'
      )
    );
    
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't block role assignment
    RAISE WARNING 'Failed to auto-create family for user %: %', NEW.user_id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- Create trigger on user_roles table
CREATE TRIGGER auto_create_family_for_parent_trigger
  AFTER INSERT ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_family_for_parent();