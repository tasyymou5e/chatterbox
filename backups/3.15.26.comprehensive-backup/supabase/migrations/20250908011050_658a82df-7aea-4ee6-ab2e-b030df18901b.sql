-- Enhanced Family Security Migration

-- 1. Create function to log family access attempts
CREATE OR REPLACE FUNCTION public.log_family_access(
  p_user_id UUID,
  p_family_id UUID,
  p_access_type TEXT,
  p_success BOOLEAN,
  p_details JSONB DEFAULT '{}'::JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
END;
$$;

-- 2. Enhanced family member validation with logging
CREATE OR REPLACE FUNCTION public.is_family_member_secure(
  family_id_param UUID, 
  user_id_param UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Log access attempt
  PERFORM log_family_access(
    user_id_param,
    family_id_param,
    'member_check',
    is_member,
    jsonb_build_object('function', 'is_family_member_secure')
  );
  
  RETURN is_member;
END;
$$;

-- 3. Enhanced family creator validation with logging
CREATE OR REPLACE FUNCTION public.is_family_creator_secure(
  family_id_param UUID, 
  user_id_param UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Log access attempt
  PERFORM log_family_access(
    user_id_param,
    family_id_param,
    'creator_check',
    is_creator,
    jsonb_build_object('function', 'is_family_creator_secure')
  );
  
  RETURN is_creator;
END;
$$;

-- 4. Secure family access validation (combines member and creator checks)
CREATE OR REPLACE FUNCTION public.has_family_access(
  family_id_param UUID,
  user_id_param UUID DEFAULT auth.uid()
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
    PERFORM log_family_access(
      user_id_param,
      family_id_param,
      'admin_access',
      true,
      jsonb_build_object('reason', 'admin_role')
    );
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
  
  -- Log final access decision
  IF NOT has_access THEN
    PERFORM log_family_access(
      user_id_param,
      family_id_param,
      'access_denied',
      false,
      jsonb_build_object('reason', 'not_member_or_creator')
    );
  END IF;
  
  RETURN has_access;
END;
$$;

-- 5. Function to get masked family data for unauthorized users
CREATE OR REPLACE FUNCTION public.get_family_safe_data(family_id_param UUID)
RETURNS TABLE(
  id UUID,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only return basic info if user has access
  IF has_family_access(family_id_param, auth.uid()) THEN
    RETURN QUERY
    SELECT f.id, f.display_name, f.created_at
    FROM public.families f
    WHERE f.id = family_id_param;
  ELSE
    -- Return masked data for unauthorized access attempts
    RETURN QUERY
    SELECT 
      family_id_param as id,
      '[PRIVATE FAMILY]'::TEXT as display_name,
      '1970-01-01 00:00:00+00'::TIMESTAMP WITH TIME ZONE as created_at
    WHERE false; -- Return no rows for unauthorized users
  END IF;
END;
$$;

-- 6. Replace existing RLS policies with enhanced versions

-- Drop existing families policies
DROP POLICY IF EXISTS "Families restricted access" ON public.families;
DROP POLICY IF EXISTS "Family codes are private to creators" ON public.families;

-- Create enhanced families policies
CREATE POLICY "Enhanced family access control"
ON public.families
FOR ALL
USING (has_family_access(id, auth.uid()))
WITH CHECK (
  -- Only family creators or admins can modify
  (auth.uid() = created_by) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Enhanced family_members policies
DROP POLICY IF EXISTS "Family members can view their family members" ON public.family_members;
DROP POLICY IF EXISTS "Family creators can add family members" ON public.family_members;
DROP POLICY IF EXISTS "Admins can view all family members" ON public.family_members;

CREATE POLICY "Secure family members access"
ON public.family_members
FOR SELECT
USING (has_family_access(family_id, auth.uid()));

CREATE POLICY "Secure family members management"
ON public.family_members
FOR INSERT
WITH CHECK (
  (is_family_creator_secure(family_id, auth.uid()) AND has_role(auth.uid(), 'parent'::app_role)) OR
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Secure family members updates"
ON public.family_members
FOR UPDATE
USING (
  (is_family_creator_secure(family_id, auth.uid()) AND has_role(auth.uid(), 'parent'::app_role)) OR
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (is_family_creator_secure(family_id, auth.uid()) AND has_role(auth.uid(), 'parent'::app_role)) OR
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Secure family members deletion"
ON public.family_members
FOR DELETE
USING (
  (is_family_creator_secure(family_id, auth.uid()) AND has_role(auth.uid(), 'parent'::app_role)) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Enhanced family_invitations policies
DROP POLICY IF EXISTS "Family creators can manage invitations" ON public.family_invitations;
DROP POLICY IF EXISTS "Admins can view all invitations" ON public.family_invitations;

CREATE POLICY "Secure family invitations management"
ON public.family_invitations
FOR ALL
USING (
  (is_family_creator_secure(family_id, auth.uid()) AND has_role(auth.uid(), 'parent'::app_role)) OR
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (is_family_creator_secure(family_id, auth.uid()) AND has_role(auth.uid(), 'parent'::app_role)) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Enhanced family_connections policies
DROP POLICY IF EXISTS "Family creators can manage connections" ON public.family_connections;
DROP POLICY IF EXISTS "Connected users can view their connections" ON public.family_connections;
DROP POLICY IF EXISTS "Family members can view connections" ON public.family_connections;

CREATE POLICY "Secure family connections management"
ON public.family_connections
FOR ALL
USING (
  (is_family_creator_secure(family_id, auth.uid()) AND has_role(auth.uid(), 'parent'::app_role)) OR
  (connected_user_id = auth.uid()) OR
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (is_family_creator_secure(family_id, auth.uid()) AND has_role(auth.uid(), 'parent'::app_role)) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- 7. Create function to detect suspicious family access patterns
CREATE OR REPLACE FUNCTION public.detect_suspicious_family_access()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  suspicious_record RECORD;
BEGIN
  -- Look for users with too many failed family access attempts
  FOR suspicious_record IN
    SELECT 
      user_id,
      COUNT(*) as failed_attempts,
      COUNT(DISTINCT (event_details->>'family_id')) as families_attempted
    FROM public.security_audit_logs
    WHERE event_type = 'family_access_attempt'
    AND (event_details->>'success')::boolean = false
    AND created_at > (now() - interval '1 hour')
    GROUP BY user_id
    HAVING COUNT(*) > 10 OR COUNT(DISTINCT (event_details->>'family_id')) > 5
  LOOP
    -- Log high-severity security event
    PERFORM log_security_event(
      suspicious_record.user_id,
      'suspicious_family_access_pattern',
      'critical',
      jsonb_build_object(
        'failed_attempts', suspicious_record.failed_attempts,
        'families_attempted', suspicious_record.families_attempted,
        'time_window', '1 hour',
        'detection_time', now()
      )
    );
  END LOOP;
END;
$$;

-- 8. Create indexes for better security monitoring performance
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_family_access 
ON public.security_audit_logs(event_type, created_at) 
WHERE event_type = 'family_access_attempt';

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_events 
ON public.security_audit_logs(user_id, created_at, event_type);

-- 9. Create trigger to automatically detect suspicious patterns
CREATE OR REPLACE FUNCTION public.trigger_suspicious_family_access_detection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only check for family access events
  IF NEW.event_type = 'family_access_attempt' AND (NEW.event_details->>'success')::boolean = false THEN
    -- Use pg_notify to trigger async suspicious pattern detection
    PERFORM pg_notify('suspicious_family_access', NEW.user_id::text);
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_detect_suspicious_family_access
AFTER INSERT ON public.security_audit_logs
FOR EACH ROW
WHEN (NEW.event_type = 'family_access_attempt')
EXECUTE FUNCTION public.trigger_suspicious_family_access_detection();