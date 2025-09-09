-- PHASE 1 CONTINUED: FIX REMAINING FUNCTION SECURITY ISSUES
-- Add SET search_path = 'public' to functions that are missing it

-- Update functions that don't have SET search_path for SQL injection protection
CREATE OR REPLACE FUNCTION public.get_popular_content()
RETURNS TABLE(id uuid, title text, category_id uuid, age_min integer, age_max integer, favorite_count bigint, interaction_count bigint, popularity_score bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    pc.id,
    pc.title,
    pc.category_id,
    pc.age_min,
    pc.age_max,
    pc.favorite_count,
    pc.interaction_count,
    pc.popularity_score
  FROM popular_content pc
  WHERE has_role(auth.uid(), 'admin'::app_role);
$$;

CREATE OR REPLACE FUNCTION public.get_safe_family_profile_data(p_user_id uuid)
RETURNS TABLE(user_id uuid, first_name text, last_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT 
    p.user_id,
    p.first_name,
    p.last_name
  FROM profiles p
  WHERE p.user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.has_behavioral_tracking_consent(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT COALESCE(
    (SELECT behavioral_tracking_consent FROM public.user_privacy_settings WHERE user_id = p_user_id),
    false
  );
$$;

-- Update the core security functions (ensuring they have search_path)
CREATE OR REPLACE FUNCTION public.is_family_creator_secure(family_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.is_family_member_secure(family_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
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
$$;