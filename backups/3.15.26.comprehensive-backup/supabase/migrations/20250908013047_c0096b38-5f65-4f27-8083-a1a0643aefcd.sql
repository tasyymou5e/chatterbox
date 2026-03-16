-- SECURITY FIX 1: Fix Profiles Table Security
-- Remove conflicting deny_all_public_access policy if it exists
DROP POLICY IF EXISTS "deny_all_public_access" ON public.profiles;

-- Create secure email masking function
CREATE OR REPLACE FUNCTION public.mask_email(email_text text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Return masked email for privacy (keep first 2 chars + domain)
  IF email_text IS NULL OR length(email_text) < 5 THEN
    RETURN '[MASKED]';
  END IF;
  
  RETURN substring(email_text from 1 for 2) || '***@' || 
         substring(email_text from position('@' in email_text) + 1);
END;
$$;

-- Update profiles RLS policies for secure access
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Secure profile policies with audit logging
CREATE POLICY "Secure user profile access" ON public.profiles
FOR SELECT USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Secure user profile updates" ON public.profiles
FOR UPDATE USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Secure user profile creation" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- SECURITY FIX 2: Secure Child Accounts Access
-- Drop existing complex policies
DROP POLICY IF EXISTS "Parents can view own family child accounts" ON public.child_accounts;
DROP POLICY IF EXISTS "Parents can create child accounts in own family" ON public.child_accounts;
DROP POLICY IF EXISTS "Parents can update own child accounts" ON public.child_accounts;
DROP POLICY IF EXISTS "Parents can delete own child accounts" ON public.child_accounts;
DROP POLICY IF EXISTS "Children can view own account" ON public.child_accounts;
DROP POLICY IF EXISTS "Children can complete own account" ON public.child_accounts;

-- Simplified unified child account policy
CREATE POLICY "Secure child account access" ON public.child_accounts
FOR ALL USING (
  -- Admins have full access
  has_role(auth.uid(), 'admin'::app_role) OR
  -- Parents can access their own family's child accounts
  (has_role(auth.uid(), 'parent'::app_role) AND 
   created_by = auth.uid() AND 
   EXISTS (SELECT 1 FROM public.families f WHERE f.id = family_id AND f.created_by = auth.uid())) OR
  -- Children can access their own completed account
  (user_id IS NOT NULL AND auth.uid() = user_id)
)
WITH CHECK (
  -- Admins can create/modify any
  has_role(auth.uid(), 'admin'::app_role) OR
  -- Parents can create in their own family
  (has_role(auth.uid(), 'parent'::app_role) AND 
   created_by = auth.uid() AND 
   EXISTS (SELECT 1 FROM public.families f WHERE f.id = family_id AND f.created_by = auth.uid())) OR
  -- Children can only complete their account
  (user_id IS NOT NULL AND auth.uid() = user_id AND status = 'pending')
);

-- SECURITY FIX 3: Restrict System Error Logging
-- Remove user error insertion policy
DROP POLICY IF EXISTS "Users can insert their own errors" ON public.system_errors;

-- Create service-role-only error insertion policy
CREATE POLICY "Service role only error insertion" ON public.system_errors
FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Keep admin read access
CREATE POLICY "Admins can view system errors" ON public.system_errors
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

-- Create secure error logging function with data sanitization
CREATE OR REPLACE FUNCTION public.log_system_error_secure(
  p_error_type text,
  p_severity text,
  p_message text,
  p_stack_trace text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_session_id text DEFAULT NULL,
  p_component_name text DEFAULT NULL,
  p_route_path text DEFAULT NULL,
  p_browser_info jsonb DEFAULT '{}',
  p_device_info jsonb DEFAULT '{}',
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  error_id UUID;
  sanitized_browser jsonb := '{}';
  sanitized_device jsonb := '{}';
  sanitized_metadata jsonb := '{}';
BEGIN
  -- Sanitize sensitive browser info (keep only essential data)
  IF p_browser_info IS NOT NULL THEN
    sanitized_browser := jsonb_build_object(
      'userAgent', COALESCE(p_browser_info->>'userAgent', 'unknown'),
      'language', COALESCE(p_browser_info->>'language', 'unknown')
    );
  END IF;
  
  -- Sanitize device info (remove identifying details)
  IF p_device_info IS NOT NULL THEN
    sanitized_device := jsonb_build_object(
      'screenWidth', COALESCE(p_device_info->>'screenWidth', 'unknown'),
      'screenHeight', COALESCE(p_device_info->>'screenHeight', 'unknown'),
      'deviceType', COALESCE(p_device_info->>'deviceType', 'unknown')
    );
  END IF;
  
  -- Sanitize metadata (remove potential PII)
  IF p_metadata IS NOT NULL THEN
    sanitized_metadata := jsonb_build_object(
      'errorContext', COALESCE(p_metadata->>'errorContext', 'unknown'),
      'feature', COALESCE(p_metadata->>'feature', 'unknown')
    );
  END IF;
  
  -- Insert sanitized error
  INSERT INTO public.system_errors (
    error_type, severity, message, stack_trace, user_id, session_id,
    component_name, route_path, browser_info, device_info, metadata
  ) VALUES (
    p_error_type, p_severity, p_message, p_stack_trace, p_user_id, p_session_id,
    p_component_name, p_route_path, sanitized_browser, sanitized_device, sanitized_metadata
  ) RETURNING id INTO error_id;
  
  RETURN error_id;
END;
$$;

-- SECURITY FIX 4: Enhanced Behavioral Data Privacy
-- Remove existing behavioral events policies
DROP POLICY IF EXISTS "Users can view their behavioral events" ON public.behavioral_events;
DROP POLICY IF EXISTS "Users can insert their behavioral events" ON public.behavioral_events;

-- Create privacy-focused behavioral events policies
CREATE POLICY "Private behavioral data access" ON public.behavioral_events
FOR SELECT USING (
  -- Users can only view their own data
  (user_id = auth.uid()) OR
  -- Admins have full access
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Users can log their own behavior" ON public.behavioral_events
FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create safe family behavioral summary function for parents
CREATE OR REPLACE FUNCTION public.get_family_behavioral_summary(p_family_id uuid)
RETURNS TABLE(
  child_user_id uuid,
  total_sessions integer,
  avg_session_duration numeric,
  most_used_features text[],
  last_activity_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only family creators (parents) can access this summary
  IF NOT (has_role(auth.uid(), 'parent'::app_role) AND 
          EXISTS (SELECT 1 FROM public.families f WHERE f.id = p_family_id AND f.created_by = auth.uid())) THEN
    RAISE EXCEPTION 'Access denied. Only family creators can view behavioral summaries.';
  END IF;
  
  RETURN QUERY
  SELECT 
    be.user_id as child_user_id,
    COUNT(DISTINCT be.session_id)::integer as total_sessions,
    AVG(be.duration_seconds)::numeric as avg_session_duration,
    ARRAY_AGG(DISTINCT be.event_type) as most_used_features,
    MAX(be.timestamp::date) as last_activity_date
  FROM public.behavioral_events be
  JOIN public.family_members fm ON fm.user_id = be.user_id
  WHERE fm.family_id = p_family_id 
    AND be.timestamp >= CURRENT_DATE - INTERVAL '30 days'
  GROUP BY be.user_id;
END;
$$;

-- Add audit logging for sensitive data access
CREATE OR REPLACE FUNCTION public.audit_sensitive_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log access to sensitive tables
  IF TG_TABLE_NAME IN ('profiles', 'child_accounts', 'behavioral_events') THEN
    PERFORM log_security_event(
      auth.uid(),
      'sensitive_data_access',
      'low',
      jsonb_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create audit triggers for sensitive tables
DROP TRIGGER IF EXISTS audit_profiles_access ON public.profiles;
CREATE TRIGGER audit_profiles_access
  AFTER SELECT ON public.profiles
  FOR EACH STATEMENT EXECUTE FUNCTION audit_sensitive_access();

DROP TRIGGER IF EXISTS audit_child_accounts_access ON public.child_accounts;
CREATE TRIGGER audit_child_accounts_access
  AFTER SELECT ON public.child_accounts
  FOR EACH STATEMENT EXECUTE FUNCTION audit_sensitive_access();

DROP TRIGGER IF EXISTS audit_behavioral_events_access ON public.behavioral_events;
CREATE TRIGGER audit_behavioral_events_access
  AFTER SELECT ON public.behavioral_events
  FOR EACH STATEMENT EXECUTE FUNCTION audit_sensitive_access();