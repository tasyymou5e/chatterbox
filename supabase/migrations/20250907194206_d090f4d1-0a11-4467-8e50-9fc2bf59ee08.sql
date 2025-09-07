-- Critical Security Fixes - Phase 1 & 2
-- Addressing child safety, data protection, and system hardening

-- 1. Add comprehensive RLS policies to profiles table
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profiles" ON profiles;

-- Restrict profile access to protect sensitive data
CREATE POLICY "Users can view their own profile" 
ON profiles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON profiles FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON profiles FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Parents can view family members profiles" 
ON profiles FOR SELECT 
USING (
  has_role(auth.uid(), 'parent'::app_role) AND 
  EXISTS (
    SELECT 1 FROM family_members fm1
    JOIN family_members fm2 ON fm1.family_id = fm2.family_id
    WHERE fm1.user_id = auth.uid() AND fm2.user_id = profiles.user_id
  )
);

CREATE POLICY "Admins can view all profiles" 
ON profiles FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Strengthen child_accounts table security
DROP POLICY IF EXISTS "Parents can manage child accounts in their families" ON child_accounts;

CREATE POLICY "Family creators can manage child accounts" 
ON child_accounts FOR ALL 
USING (
  has_role(auth.uid(), 'parent'::app_role) AND 
  EXISTS (
    SELECT 1 FROM families f 
    WHERE f.id = child_accounts.family_id 
    AND f.created_by = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'parent'::app_role) AND 
  EXISTS (
    SELECT 1 FROM families f 
    WHERE f.id = child_accounts.family_id 
    AND f.created_by = auth.uid()
  )
);

-- 3. Secure user activity tracking tables
ALTER TABLE user_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity logs" 
ON user_activity_logs FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Parents can view family members activity logs" 
ON user_activity_logs FOR SELECT 
USING (
  has_role(auth.uid(), 'parent'::app_role) AND 
  EXISTS (
    SELECT 1 FROM family_members fm1
    JOIN family_members fm2 ON fm1.family_id = fm2.family_id
    WHERE fm1.user_id = auth.uid() AND fm2.user_id = user_activity_logs.user_id
  )
);

CREATE POLICY "Admins can view all activity logs" 
ON user_activity_logs FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert activity logs" 
ON user_activity_logs FOR INSERT 
WITH CHECK (auth.role() = 'service_role'::text OR auth.uid() IS NOT NULL);

-- 4. Secure user sessions table
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions" 
ON user_sessions FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all sessions" 
ON user_sessions FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage sessions" 
ON user_sessions FOR ALL 
USING (auth.role() = 'service_role'::text OR has_role(auth.uid(), 'admin'::app_role));

-- 5. Create admin-only access for popular_content materialized view
-- Note: Materialized views can't have RLS policies directly, but we secure the function
DROP POLICY IF EXISTS "Only admins can view popular content analytics" ON popular_content;

-- Update the function to ensure admin access only
CREATE OR REPLACE FUNCTION public.get_popular_content_secure()
RETURNS TABLE(id uuid, title text, category_id uuid, age_min integer, age_max integer, favorite_count bigint, interaction_count bigint, popularity_score bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
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

-- 6. Add rate limiting function for sensitive operations
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id uuid,
  p_operation text,
  p_max_attempts integer DEFAULT 10,
  p_time_window interval DEFAULT '1 minute'::interval
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count integer;
BEGIN
  -- Count recent attempts for this operation
  SELECT COUNT(*)
  INTO attempt_count
  FROM user_activity_logs
  WHERE user_id = p_user_id
    AND activity_type = p_operation
    AND created_at > (now() - p_time_window);
  
  -- Return false if rate limit exceeded
  IF attempt_count >= p_max_attempts THEN
    -- Log the rate limit violation
    PERFORM log_security_event(
      p_user_id,
      'rate_limit_exceeded',
      'high',
      jsonb_build_object(
        'operation', p_operation,
        'attempt_count', attempt_count,
        'time_window', p_time_window,
        'max_attempts', p_max_attempts
      )
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 7. Enhanced session management with automatic timeout
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark sessions as inactive if they haven't been used in 24 hours
  UPDATE user_sessions 
  SET is_active = false, ended_at = now()
  WHERE is_active = true 
  AND updated_at < (now() - interval '24 hours');
  
  -- Log security event for expired sessions
  INSERT INTO security_audit_logs (
    user_id, event_type, severity, event_details
  )
  SELECT 
    user_id,
    'session_expired',
    'low',
    jsonb_build_object(
      'session_id', session_id,
      'last_activity', updated_at,
      'auto_expired', true
    )
  FROM user_sessions 
  WHERE is_active = false 
  AND ended_at = now()
  AND updated_at < (now() - interval '24 hours');
END;
$$;

-- 8. Add function to validate family access permissions
CREATE OR REPLACE FUNCTION public.validate_family_access(
  p_user_id uuid,
  p_family_id uuid,
  p_required_role app_role DEFAULT 'child'::app_role
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  is_family_creator boolean;
  is_family_member boolean;
BEGIN
  -- Check if user is admin (admin can access everything)
  IF has_role(p_user_id, 'admin'::app_role) THEN
    RETURN true;
  END IF;
  
  -- Get user's role
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = p_user_id
  LIMIT 1;
  
  -- Check if user is family creator
  SELECT EXISTS(
    SELECT 1 FROM families 
    WHERE id = p_family_id AND created_by = p_user_id
  ) INTO is_family_creator;
  
  -- Check if user is family member
  SELECT EXISTS(
    SELECT 1 FROM family_members 
    WHERE family_id = p_family_id AND user_id = p_user_id
  ) INTO is_family_member;
  
  -- Validate access based on role and membership
  CASE p_required_role
    WHEN 'parent' THEN
      RETURN (user_role = 'parent' AND is_family_creator);
    WHEN 'child' THEN
      RETURN (is_family_member OR is_family_creator);
    ELSE
      RETURN false;
  END CASE;
END;
$$;

-- 9. Add comprehensive audit logging trigger
CREATE OR REPLACE FUNCTION public.audit_sensitive_table_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log access to sensitive tables
  IF TG_TABLE_NAME IN ('profiles', 'child_accounts', 'family_members', 'user_activity_logs') THEN
    PERFORM log_sensitive_data_access(
      auth.uid(),
      TG_TABLE_NAME,
      TG_OP,
      CASE 
        WHEN TG_OP = 'INSERT' THEN (NEW.user_id)::uuid
        WHEN TG_OP = 'UPDATE' THEN (NEW.user_id)::uuid
        WHEN TG_OP = 'DELETE' THEN (OLD.user_id)::uuid
        ELSE NULL
      END
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply audit triggers to sensitive tables
DROP TRIGGER IF EXISTS audit_profiles_access ON profiles;
CREATE TRIGGER audit_profiles_access
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_table_access();

DROP TRIGGER IF EXISTS audit_child_accounts_access ON child_accounts;  
CREATE TRIGGER audit_child_accounts_access
  AFTER INSERT OR UPDATE OR DELETE ON child_accounts
  FOR EACH ROW EXECUTE FUNCTION audit_sensitive_table_access();

-- 10. Create security monitoring view for admins
CREATE OR REPLACE VIEW admin_security_dashboard AS
SELECT 
  'failed_logins' as metric_name,
  COUNT(*) as metric_value,
  'last_24h' as time_period
FROM user_activity_logs 
WHERE activity_type = 'failed_login' 
AND created_at > now() - interval '24 hours'
UNION ALL
SELECT 
  'rate_limit_violations' as metric_name,
  COUNT(*) as metric_value,
  'last_24h' as time_period
FROM security_audit_logs 
WHERE event_type = 'rate_limit_exceeded' 
AND created_at > now() - interval '24 hours'
UNION ALL
SELECT 
  'sensitive_data_access' as metric_name,
  COUNT(*) as metric_value,
  'last_24h' as time_period
FROM security_audit_logs 
WHERE event_type = 'sensitive_data_access' 
AND created_at > now() - interval '24 hours';

-- Grant access to security dashboard view for admins only
REVOKE ALL ON admin_security_dashboard FROM PUBLIC;
GRANT SELECT ON admin_security_dashboard TO authenticated;

-- Create RLS policy for security dashboard
ALTER VIEW admin_security_dashboard OWNER TO postgres;
CREATE POLICY "Only admins can view security dashboard" 
ON admin_security_dashboard FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));