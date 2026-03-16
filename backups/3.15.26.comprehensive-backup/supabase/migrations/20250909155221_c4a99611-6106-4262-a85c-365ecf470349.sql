-- SECURITY FIX: Update all remaining functions to include SET search_path
-- This prevents SQL injection attacks through function calls

-- Update all security-critical functions that are missing SET search_path
CREATE OR REPLACE FUNCTION public.is_family_creator(family_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.families 
    WHERE id = family_id_param 
    AND created_by = user_id_param
  );
$$;

CREATE OR REPLACE FUNCTION public.is_family_member(family_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members 
    WHERE family_id = family_id_param 
    AND user_id = user_id_param
  );
$$;

CREATE OR REPLACE FUNCTION public.is_family_connection(family_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_connections 
    WHERE family_id = family_id_param 
    AND connected_user_id = user_id_param 
    AND status = 'accepted'
  );
$$;

CREATE OR REPLACE FUNCTION public.has_connection_permission(family_id_param uuid, user_id_param uuid, permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_connections 
    WHERE family_id = family_id_param 
    AND connected_user_id = user_id_param 
    AND status = 'accepted'
    AND (permissions->permission_key)::boolean = true
  );
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