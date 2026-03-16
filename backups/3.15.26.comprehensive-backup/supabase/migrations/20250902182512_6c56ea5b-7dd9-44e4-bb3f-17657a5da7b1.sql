-- Fix security warning: Function Search Path Mutable
-- Update all functions to have proper search_path settings

-- Fix existing functions that may not have proper search_path
CREATE OR REPLACE FUNCTION public.validate_session_timeout()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto-expire sessions older than 24 hours if not explicitly ended
  IF NEW.created_at < (now() - interval '24 hours') AND NEW.is_active = true THEN
    NEW.is_active = false;
    NEW.ended_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Update the log_auth_event function to have proper search_path
CREATE OR REPLACE FUNCTION public.log_auth_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  activity_type_val TEXT;
BEGIN
  -- Determine activity type based on the operation
  IF TG_OP = 'INSERT' THEN
    activity_type_val := 'signup';
  ELSIF TG_OP = 'UPDATE' AND OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at THEN
    activity_type_val := 'login';
  ELSE
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Log the activity with safer field access
  INSERT INTO public.user_activity_logs (
    user_id,
    activity_type,
    ip_address,
    user_agent,
    device_info,
    success,
    metadata
  ) VALUES (
    COALESCE(NEW.id, OLD.id),
    activity_type_val,
    NULL,
    NULL,
    '{}',
    true,
    json_build_object(
      'email', COALESCE(NEW.email, OLD.email),
      'provider', 'email',
      'timestamp', now()
    )
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION
  WHEN OTHERS THEN
    -- Log errors but don't prevent the auth operation
    RAISE WARNING 'Error in log_auth_event: %', SQLERRM;
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Update handle_new_user function to have proper search_path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, first_name, last_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email
  );
  
  -- Assign parent role by default for new signups
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'parent');
  
  RETURN NEW;
END;
$$;

-- Update update_updated_at_column function to have proper search_path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Update generate_family_code function to have proper search_path
CREATE OR REPLACE FUNCTION public.generate_family_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  new_family_code TEXT;
BEGIN
  -- Get current year
  current_year := EXTRACT(YEAR FROM NOW())::TEXT;
  
  -- Get the next number for this year using explicit table alias
  SELECT COALESCE(MAX(
    CASE 
      WHEN f.family_code LIKE 'FAM-' || current_year || '-%' 
      THEN CAST(SPLIT_PART(f.family_code, '-', 3) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM public.families f
  WHERE f.family_code IS NOT NULL;
  
  -- Format the family code
  new_family_code := 'FAM-' || current_year || '-' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN new_family_code;
END;
$$;

-- Update end_user_session function to have proper search_path
CREATE OR REPLACE FUNCTION public.end_user_session(session_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.user_sessions 
  SET ended_at = now(), is_active = false, updated_at = now()
  WHERE user_sessions.session_id = end_user_session.session_id AND is_active = true;
END;
$$;

-- Update refresh_daily_analytics function to have proper search_path
CREATE OR REPLACE FUNCTION public.refresh_daily_analytics()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_analytics;
$$;

-- Update refresh_analytics_automated function to have proper search_path
CREATE OR REPLACE FUNCTION public.refresh_analytics_automated()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Refresh the materialized view
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_analytics;
  
  -- Log the refresh operation
  INSERT INTO public.analytics_metrics (
    metric_type,
    metric_name,
    metric_value,
    metadata
  ) VALUES (
    'system_performance',
    'analytics_refresh',
    1,
    json_build_object(
      'refreshed_at', now(),
      'automated', true
    )
  );
  
  RETURN 'Analytics refreshed successfully at ' || now()::text;
END;
$$;

-- Update refresh_daily_analytics_secure function to have proper search_path
CREATE OR REPLACE FUNCTION public.refresh_daily_analytics_secure()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  -- Refresh the materialized view
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.daily_analytics;
  
  RETURN 'Daily analytics refreshed successfully';
END;
$$;

-- Create additional security functions for enhanced monitoring
CREATE OR REPLACE FUNCTION public.detect_suspicious_activity(
  p_user_id UUID,
  p_activity_type TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_count INTEGER;
  is_suspicious BOOLEAN := false;
BEGIN
  -- Check for rapid repeated actions (more than 10 in 1 minute)
  SELECT COUNT(*)
  INTO recent_count
  FROM public.user_activity_logs
  WHERE user_id = p_user_id
    AND activity_type = p_activity_type
    AND created_at > (now() - interval '1 minute');
  
  IF recent_count > 10 THEN
    is_suspicious := true;
    
    -- Log security event
    PERFORM public.log_security_event(
      p_user_id,
      'suspicious_activity_detected',
      'high',
      jsonb_build_object(
        'activity_type', p_activity_type,
        'count_in_minute', recent_count,
        'threshold_exceeded', true,
        'metadata', p_metadata
      )
    );
  END IF;
  
  RETURN is_suspicious;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_user_permissions(
  p_user_id UUID,
  p_resource_type TEXT,
  p_resource_id UUID,
  p_action TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  has_permission BOOLEAN := false;
  user_role_val app_role;
BEGIN
  -- Get user role
  SELECT role INTO user_role_val
  FROM public.user_roles
  WHERE user_id = p_user_id
  LIMIT 1;
  
  -- Admin has all permissions
  IF user_role_val = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Resource-specific permission checks
  CASE p_resource_type
    WHEN 'family' THEN
      -- Check if user is family creator or member
      has_permission := (
        SELECT EXISTS (
          SELECT 1 FROM public.families 
          WHERE id = p_resource_id AND created_by = p_user_id
        ) OR EXISTS (
          SELECT 1 FROM public.family_members 
          WHERE family_id = p_resource_id AND user_id = p_user_id
        )
      );
    
    WHEN 'chore' THEN
      -- Check if user has access to the chore's family
      has_permission := (
        SELECT EXISTS (
          SELECT 1 FROM public.chores c
          JOIN public.family_members fm ON fm.family_id = c.family_id
          WHERE c.id = p_resource_id AND fm.user_id = p_user_id
        )
      );
    
    ELSE
      has_permission := false;
  END CASE;
  
  -- Log permission check if denied
  IF NOT has_permission THEN
    PERFORM public.log_security_event(
      p_user_id,
      'permission_denied',
      'medium',
      jsonb_build_object(
        'resource_type', p_resource_type,
        'resource_id', p_resource_id,
        'action', p_action,
        'user_role', user_role_val
      )
    );
  END IF;
  
  RETURN has_permission;
END;
$$;

-- Create function to clean up expired invitations and sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_data()
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  expired_invitations INTEGER;
  expired_sessions INTEGER;
  old_logs_count INTEGER;
BEGIN
  -- Clean up expired family invitations
  DELETE FROM public.family_invitations 
  WHERE expires_at < now() AND accepted_at IS NULL;
  GET DIAGNOSTICS expired_invitations = ROW_COUNT;
  
  -- Clean up old inactive sessions (older than 30 days)
  DELETE FROM public.user_sessions 
  WHERE is_active = false AND updated_at < (now() - interval '30 days');
  GET DIAGNOSTICS expired_sessions = ROW_COUNT;
  
  -- Archive very old activity logs (older than 1 year)
  SELECT public.archive_old_activity_logs(365) INTO old_logs_count;
  
  -- Log cleanup operation
  INSERT INTO public.analytics_metrics (
    metric_type,
    metric_name,
    metric_value,
    metadata
  ) VALUES (
    'system_maintenance',
    'data_cleanup',
    expired_invitations + expired_sessions + old_logs_count,
    json_build_object(
      'expired_invitations', expired_invitations,
      'expired_sessions', expired_sessions,
      'archived_logs', old_logs_count,
      'cleanup_date', now()
    )
  );
  
  RETURN format(
    'Cleanup completed: %s expired invitations, %s expired sessions, %s archived logs',
    expired_invitations, expired_sessions, old_logs_count
  );
END;
$$;