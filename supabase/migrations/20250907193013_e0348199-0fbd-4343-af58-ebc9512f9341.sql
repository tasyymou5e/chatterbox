-- Fix critical database security issues

-- Fix 1: Add proper search_path to refresh function
CREATE OR REPLACE FUNCTION public.refresh_popular_content()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY popular_content;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fix 2: Restrict activity logs to parents and admins only
DROP POLICY IF EXISTS "Family members can view family activity logs" ON family_activity_logs;
CREATE POLICY "Parents and admins can view family activity logs"
ON family_activity_logs FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  (has_role(auth.uid(), 'parent'::app_role) AND EXISTS (
    SELECT 1 FROM families f 
    WHERE f.id = family_activity_logs.family_id 
    AND f.created_by = auth.uid()
  ))
);

-- Fix 3: Restrict system configuration tables to admins only
DROP POLICY IF EXISTS "Users can view general analytics metrics" ON analytics_metrics;
CREATE POLICY "Only admins can view analytics metrics"
ON analytics_metrics FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix 4: Limit profile data exposure in family connections
CREATE OR REPLACE FUNCTION public.get_safe_family_profile_data(p_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  first_name text,
  display_name text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.first_name,
    COALESCE(p.display_name, p.first_name) as display_name
  FROM profiles p
  WHERE p.user_id = p_user_id;
$$;

-- Fix 5: Add audit logging for sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access(
  p_user_id uuid,
  p_table_name text,
  p_operation text,
  p_target_user_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.security_audit_logs (
    user_id, event_type, severity, event_details
  ) VALUES (
    p_user_id,
    'sensitive_data_access',
    'medium',
    jsonb_build_object(
      'table', p_table_name,
      'operation', p_operation,
      'target_user_id', p_target_user_id,
      'timestamp', now()
    )
  );
END;
$$;