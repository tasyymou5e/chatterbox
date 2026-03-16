-- Fix remaining security warnings from linter

-- 1. Secure materialized view by removing from public API access
-- Drop the materialized view from public access and create secure function access instead
DROP MATERIALIZED VIEW IF EXISTS popular_content;

-- Create a secure table instead of materialized view to avoid API exposure
CREATE TABLE public.popular_content_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  content_item_id uuid REFERENCES content_items(id),
  title text,
  category_id uuid,
  age_min integer,
  age_max integer,
  favorite_count bigint DEFAULT 0,
  interaction_count bigint DEFAULT 0,
  popularity_score bigint DEFAULT 0,
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on the cache table
ALTER TABLE public.popular_content_cache ENABLE ROW LEVEL SECURITY;

-- Only admins can access this cached data
CREATE POLICY "Only admins can view popular content cache" 
ON popular_content_cache FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can manage popular content cache" 
ON popular_content_cache FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to refresh the popular content cache
CREATE OR REPLACE FUNCTION public.refresh_popular_content_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can refresh the cache
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  -- Clear existing cache
  DELETE FROM popular_content_cache;
  
  -- Rebuild cache with current data
  INSERT INTO popular_content_cache (
    content_item_id, title, category_id, age_min, age_max, 
    favorite_count, interaction_count, popularity_score
  )
  SELECT 
    ci.id,
    ci.title,
    ci.category_id,
    ci.age_min,
    ci.age_max,
    COALESCE(cf_count.favorite_count, 0),
    COALESCE(ci_count.interaction_count, 0),
    COALESCE(cf_count.favorite_count, 0) + COALESCE(ci_count.interaction_count, 0) as popularity_score
  FROM content_items ci
  LEFT JOIN (
    SELECT content_item_id, COUNT(*) as favorite_count
    FROM content_favorites
    GROUP BY content_item_id
  ) cf_count ON cf_count.content_item_id = ci.id
  LEFT JOIN (
    SELECT content_item_id, COUNT(*) as interaction_count
    FROM content_interactions
    GROUP BY content_item_id
  ) ci_count ON ci_count.content_item_id = ci.id
  WHERE ci.is_active = true AND ci.approval_status = 'approved';
END;
$$;

-- Update the get_popular_content function to use the cache
CREATE OR REPLACE FUNCTION public.get_popular_content()
RETURNS TABLE(id uuid, title text, category_id uuid, age_min integer, age_max integer, favorite_count bigint, interaction_count bigint, popularity_score bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    content_item_id as id,
    title,
    category_id,
    age_min,
    age_max,
    favorite_count,
    interaction_count,
    popularity_score
  FROM popular_content_cache
  WHERE has_role(auth.uid(), 'admin'::app_role)
  ORDER BY popularity_score DESC;
$$;

-- 2. Add additional security hardening for child safety
-- Restrict access to child account creation function
CREATE OR REPLACE FUNCTION public.create_child_account_secure(
  p_family_id uuid,
  p_first_name text,
  p_last_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_account_id uuid;
  parent_user_id uuid := auth.uid();
BEGIN
  -- Validate parent has permission to create child accounts for this family
  IF NOT validate_family_access(parent_user_id, p_family_id, 'parent'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Only family creators can create child accounts.';
  END IF;
  
  -- Check rate limit for child account creation
  IF NOT check_rate_limit(parent_user_id, 'create_child_account', 5, '1 hour'::interval) THEN
    RAISE EXCEPTION 'Rate limit exceeded. Too many child account creation attempts.';
  END IF;
  
  -- Create the child account
  INSERT INTO child_accounts (
    family_id, first_name, last_name, created_by, family_code
  ) VALUES (
    p_family_id, p_first_name, p_last_name, parent_user_id, generate_child_account_code()
  ) RETURNING id INTO new_account_id;
  
  -- Log the activity
  PERFORM log_family_activity(
    p_family_id,
    parent_user_id,
    'parent'::app_role,
    'child_account_created',
    parent_user_id,
    jsonb_build_object('child_account_id', new_account_id, 'child_name', p_first_name || ' ' || p_last_name)
  );
  
  RETURN new_account_id;
END;
$$;

-- 3. Add enhanced family invitation security
CREATE OR REPLACE FUNCTION public.create_family_invitation_secure(
  p_family_id uuid,
  p_invited_email text,
  p_connection_role connection_role,
  p_permissions jsonb DEFAULT '{"can_comment": false, "can_assign_tasks": false, "can_view_progress": true}'::jsonb,
  p_invitation_message text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invitation_id uuid;
  inviter_id uuid := auth.uid();
BEGIN
  -- Validate permissions
  IF NOT validate_family_access(inviter_id, p_family_id, 'parent'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Only family creators can send invitations.';
  END IF;
  
  -- Check rate limit for invitations
  IF NOT check_rate_limit(inviter_id, 'send_invitation', 10, '1 hour'::interval) THEN
    RAISE EXCEPTION 'Rate limit exceeded. Too many invitation attempts.';
  END IF;
  
  -- Create the invitation
  INSERT INTO family_invitations (
    family_id, invited_email, connection_role, permissions, 
    invitation_message, invited_by
  ) VALUES (
    p_family_id, p_invited_email, p_connection_role, p_permissions,
    p_invitation_message, inviter_id
  ) RETURNING id INTO invitation_id;
  
  -- Log the security event
  PERFORM log_security_event(
    inviter_id,
    'family_invitation_sent',
    'medium',
    jsonb_build_object(
      'family_id', p_family_id,
      'invited_email', p_invited_email,
      'connection_role', p_connection_role,
      'invitation_id', invitation_id
    )
  );
  
  RETURN invitation_id;
END;
$$;