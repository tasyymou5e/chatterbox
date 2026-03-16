-- Phase 1 & 2: Critical Security Fixes and Database Structure Enhancements

-- Create audit trail tables for sensitive operations
CREATE TABLE public.admin_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  operation_type TEXT NOT NULL,
  target_table TEXT,
  target_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.security_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  event_details JSONB NOT NULL DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create proper daily_analytics table (replacing materialized view)
CREATE TABLE public.daily_analytics_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  total_users BIGINT NOT NULL DEFAULT 0,
  active_users BIGINT NOT NULL DEFAULT 0,
  new_signups BIGINT NOT NULL DEFAULT 0,
  total_families BIGINT NOT NULL DEFAULT 0,
  engagement_score NUMERIC(5,2) DEFAULT 0,
  chores_completed BIGINT DEFAULT 0,
  points_earned BIGINT DEFAULT 0,
  achievements_unlocked BIGINT DEFAULT 0,
  avg_session_duration NUMERIC(8,2) DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  computed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create data archival tables
CREATE TABLE public.archived_user_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_id UUID NOT NULL,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  device_info JSONB DEFAULT '{}',
  session_id TEXT,
  success BOOLEAN DEFAULT true,
  failure_reason TEXT,
  metadata JSONB DEFAULT '{}',
  original_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.archived_system_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  original_id UUID NOT NULL,
  error_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  stack_trace TEXT,
  user_id UUID,
  session_id TEXT,
  component_name TEXT,
  route_path TEXT,
  browser_info JSONB DEFAULT '{}',
  device_info JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  original_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_analytics_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_user_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.archived_system_errors ENABLE ROW LEVEL SECURITY;

-- Create enhanced RLS policies for new tables
CREATE POLICY "Admins can manage audit logs" 
ON public.admin_audit_logs 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view security audit logs" 
ON public.security_audit_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert security audit logs" 
ON public.security_audit_logs 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update security audit logs" 
ON public.security_audit_logs 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view daily analytics" 
ON public.daily_analytics_data 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage daily analytics" 
ON public.daily_analytics_data 
FOR ALL 
USING (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view archived logs" 
ON public.archived_user_activity_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage archived logs" 
ON public.archived_user_activity_logs 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can view archived errors" 
ON public.archived_system_errors 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage archived errors" 
ON public.archived_system_errors 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role');

-- Add comprehensive indexes for performance optimization
CREATE INDEX idx_admin_audit_logs_admin_user_id ON public.admin_audit_logs(admin_user_id);
CREATE INDEX idx_admin_audit_logs_operation_type ON public.admin_audit_logs(operation_type);
CREATE INDEX idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX idx_admin_audit_logs_target_table_id ON public.admin_audit_logs(target_table, target_id);

CREATE INDEX idx_security_audit_logs_user_id ON public.security_audit_logs(user_id);
CREATE INDEX idx_security_audit_logs_event_type ON public.security_audit_logs(event_type);
CREATE INDEX idx_security_audit_logs_severity ON public.security_audit_logs(severity);
CREATE INDEX idx_security_audit_logs_created_at ON public.security_audit_logs(created_at DESC);
CREATE INDEX idx_security_audit_logs_resolved ON public.security_audit_logs(resolved) WHERE resolved = false;

CREATE INDEX idx_daily_analytics_date ON public.daily_analytics_data(date DESC);
CREATE INDEX idx_daily_analytics_computed_at ON public.daily_analytics_data(computed_at DESC);

-- Add missing indexes on existing tables for better performance
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_user_id_created_at ON public.user_activity_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_activity_type ON public.user_activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activity_logs_session_id ON public.user_activity_logs(session_id);

CREATE INDEX IF NOT EXISTS idx_system_errors_severity_created_at ON public.system_errors(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_errors_resolved ON public.system_errors(resolved) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_system_errors_component_name ON public.system_errors(component_name);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id_active ON public.user_sessions(user_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_sessions_family_id ON public.user_sessions(family_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_created_at ON public.user_sessions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_family_members_family_id_role ON public.family_members(family_id, role);
CREATE INDEX IF NOT EXISTS idx_family_connections_family_id_status ON public.family_connections(family_id, status);

CREATE INDEX IF NOT EXISTS idx_chore_assignments_assigned_to_status ON public.chore_assignments(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_chore_assignments_family_id_due_date ON public.chore_assignments(family_id, due_date);

CREATE INDEX IF NOT EXISTS idx_chore_completions_user_id_completion_date ON public.chore_completions(user_id, completion_date DESC);
CREATE INDEX IF NOT EXISTS idx_chore_completions_family_id_completion_date ON public.chore_completions(family_id, completion_date DESC);

-- Enhanced validation functions
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.log_admin_operation(
  p_admin_user_id UUID,
  p_operation_type TEXT,
  p_target_table TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO public.admin_audit_logs (
    admin_user_id, operation_type, target_table, target_id, 
    old_values, new_values, metadata
  ) VALUES (
    p_admin_user_id, p_operation_type, p_target_table, p_target_id,
    p_old_values, p_new_values, p_metadata
  ) RETURNING id INTO audit_id;
  
  RETURN audit_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_severity TEXT,
  p_event_details JSONB DEFAULT '{}',
  p_session_id TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.security_audit_logs (
    user_id, event_type, severity, event_details, session_id
  ) VALUES (
    p_user_id, p_event_type, p_severity, p_event_details, p_session_id
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$$;

-- Enhanced cleanup and archival functions
CREATE OR REPLACE FUNCTION public.archive_old_activity_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  -- Archive old activity logs
  WITH archived_data AS (
    DELETE FROM public.user_activity_logs 
    WHERE created_at < (CURRENT_DATE - (days_to_keep || ' days')::INTERVAL)
    RETURNING *
  )
  INSERT INTO public.archived_user_activity_logs (
    original_id, user_id, activity_type, ip_address, user_agent, 
    device_info, session_id, success, failure_reason, metadata, original_created_at
  )
  SELECT 
    id, user_id, activity_type, ip_address, user_agent,
    device_info, session_id, success, failure_reason, metadata, created_at
  FROM archived_data;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_old_system_errors(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  -- Archive resolved errors older than specified days
  WITH archived_data AS (
    DELETE FROM public.system_errors 
    WHERE resolved = true 
    AND created_at < (CURRENT_DATE - (days_to_keep || ' days')::INTERVAL)
    RETURNING *
  )
  INSERT INTO public.archived_system_errors (
    original_id, error_type, severity, message, stack_trace, user_id,
    session_id, component_name, route_path, browser_info, device_info,
    metadata, resolved, resolved_by, resolved_at, original_created_at
  )
  SELECT 
    id, error_type, severity, message, stack_trace, user_id,
    session_id, component_name, route_path, browser_info, device_info,
    metadata, resolved, resolved_by, resolved_at, created_at
  FROM archived_data;
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  RETURN archived_count;
END;
$$;

-- Function to compute and update daily analytics
CREATE OR REPLACE FUNCTION public.compute_daily_analytics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  analytics_data RECORD;
BEGIN
  -- Compute analytics for the target date
  SELECT 
    target_date as date,
    COALESCE((SELECT COUNT(DISTINCT user_id) FROM public.profiles WHERE created_at::date <= target_date), 0) as total_users,
    COALESCE((SELECT COUNT(DISTINCT user_id) FROM public.user_activity_logs WHERE created_at::date = target_date), 0) as active_users,
    COALESCE((SELECT COUNT(*) FROM public.profiles WHERE created_at::date = target_date), 0) as new_signups,
    COALESCE((SELECT COUNT(*) FROM public.families WHERE created_at::date <= target_date), 0) as total_families,
    COALESCE((
      SELECT ROUND(AVG(CASE 
        WHEN session_duration > 0 THEN LEAST(session_duration / 60.0, 10.0)
        ELSE 5.0 
      END), 2)
      FROM public.engagement_metrics 
      WHERE date_recorded = target_date
    ), 5.0) as engagement_score,
    COALESCE((SELECT COUNT(*) FROM public.chore_completions WHERE completion_date = target_date), 0) as chores_completed,
    COALESCE((SELECT SUM(points_earned) FROM public.chore_completions WHERE completion_date = target_date), 0) as points_earned,
    COALESCE((SELECT COUNT(*) FROM public.user_achievements WHERE created_at::date = target_date), 0) as achievements_unlocked,
    COALESCE((
      SELECT AVG(session_duration) 
      FROM public.engagement_metrics 
      WHERE date_recorded = target_date AND session_duration > 0
    ), 0) as avg_session_duration
  INTO analytics_data;
  
  -- Insert or update the daily analytics data
  INSERT INTO public.daily_analytics_data (
    date, total_users, active_users, new_signups, total_families, 
    engagement_score, chores_completed, points_earned, achievements_unlocked, avg_session_duration
  ) VALUES (
    analytics_data.date, analytics_data.total_users, analytics_data.active_users, 
    analytics_data.new_signups, analytics_data.total_families, analytics_data.engagement_score,
    analytics_data.chores_completed, analytics_data.points_earned, 
    analytics_data.achievements_unlocked, analytics_data.avg_session_duration
  ) ON CONFLICT (date) DO UPDATE SET
    total_users = EXCLUDED.total_users,
    active_users = EXCLUDED.active_users,
    new_signups = EXCLUDED.new_signups,
    total_families = EXCLUDED.total_families,
    engagement_score = EXCLUDED.engagement_score,
    chores_completed = EXCLUDED.chores_completed,
    points_earned = EXCLUDED.points_earned,
    achievements_unlocked = EXCLUDED.achievements_unlocked,
    avg_session_duration = EXCLUDED.avg_session_duration,
    updated_at = now();
END;
$$;

-- Create trigger for session timeout validation
CREATE TRIGGER validate_session_timeout_trigger
  BEFORE INSERT OR UPDATE ON public.user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_session_timeout();

-- Create updated_at triggers for new tables
CREATE TRIGGER update_admin_audit_logs_updated_at
  BEFORE UPDATE ON public.admin_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_security_audit_logs_updated_at
  BEFORE UPDATE ON public.security_audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_daily_analytics_data_updated_at
  BEFORE UPDATE ON public.daily_analytics_data
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();