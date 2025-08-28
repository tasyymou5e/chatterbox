-- Create error collection and tracking tables

-- System errors table for centralized error collection
CREATE TABLE public.system_errors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  error_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  message TEXT NOT NULL,
  stack_trace TEXT,
  user_id UUID,
  session_id TEXT,
  component_name TEXT,
  route_path TEXT,
  browser_info JSONB DEFAULT '{}',
  device_info JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Error patterns table for tracking recurring errors
CREATE TABLE public.error_patterns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pattern_hash TEXT NOT NULL UNIQUE,
  error_message_pattern TEXT NOT NULL,
  occurrence_count INTEGER DEFAULT 1,
  first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  affected_users_count INTEGER DEFAULT 0,
  resolution_status TEXT DEFAULT 'open' CHECK (resolution_status IN ('open', 'investigating', 'resolved', 'ignored')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Performance metrics table
CREATE TABLE public.performance_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  threshold_exceeded BOOLEAN DEFAULT false,
  component_name TEXT,
  user_id UUID,
  route_path TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- System alerts table for admin notifications
CREATE TABLE public.system_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  title TEXT NOT NULL,
  description TEXT,
  triggered_by TEXT,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all error tracking tables
ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_errors
CREATE POLICY "Admins can view all system errors" 
ON public.system_errors 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert errors" 
ON public.system_errors 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins can update system errors" 
ON public.system_errors 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for error_patterns
CREATE POLICY "Admins can view error patterns" 
ON public.error_patterns 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can manage error patterns" 
ON public.error_patterns 
FOR ALL 
USING (true);

-- RLS Policies for performance_metrics
CREATE POLICY "Admins can view performance metrics" 
ON public.performance_metrics 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert performance metrics" 
ON public.performance_metrics 
FOR INSERT 
WITH CHECK (true);

-- RLS Policies for system_alerts
CREATE POLICY "Admins can view system alerts" 
ON public.system_alerts 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update system alerts" 
ON public.system_alerts 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert alerts" 
ON public.system_alerts 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_system_errors_severity ON public.system_errors(severity);
CREATE INDEX idx_system_errors_created_at ON public.system_errors(created_at);
CREATE INDEX idx_system_errors_resolved ON public.system_errors(resolved);
CREATE INDEX idx_system_errors_user_id ON public.system_errors(user_id);
CREATE INDEX idx_error_patterns_hash ON public.error_patterns(pattern_hash);
CREATE INDEX idx_performance_metrics_type ON public.performance_metrics(metric_type);
CREATE INDEX idx_performance_metrics_created_at ON public.performance_metrics(created_at);
CREATE INDEX idx_system_alerts_severity ON public.system_alerts(severity);
CREATE INDEX idx_system_alerts_resolved ON public.system_alerts(resolved);

-- Create database functions for error management

-- Function to log system errors with pattern matching
CREATE OR REPLACE FUNCTION public.log_system_error(
  p_error_type TEXT,
  p_severity TEXT,
  p_message TEXT,
  p_stack_trace TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_component_name TEXT DEFAULT NULL,
  p_route_path TEXT DEFAULT NULL,
  p_browser_info JSONB DEFAULT '{}',
  p_device_info JSONB DEFAULT '{}',
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  error_id UUID;
  pattern_hash TEXT;
BEGIN
  -- Insert the error
  INSERT INTO public.system_errors (
    error_type, severity, message, stack_trace, user_id, session_id,
    component_name, route_path, browser_info, device_info, metadata
  ) VALUES (
    p_error_type, p_severity, p_message, p_stack_trace, p_user_id, p_session_id,
    p_component_name, p_route_path, p_browser_info, p_device_info, p_metadata
  ) RETURNING id INTO error_id;
  
  -- Create pattern hash for error grouping
  pattern_hash := encode(sha256(p_error_type || ':' || p_message || ':' || COALESCE(p_component_name, '')), 'hex');
  
  -- Update or create error pattern
  INSERT INTO public.error_patterns (pattern_hash, error_message_pattern, occurrence_count, last_seen)
  VALUES (pattern_hash, p_message, 1, now())
  ON CONFLICT (pattern_hash) DO UPDATE SET
    occurrence_count = error_patterns.occurrence_count + 1,
    last_seen = now(),
    updated_at = now();
  
  -- Check if we need to create an alert for critical errors
  IF p_severity = 'critical' THEN
    INSERT INTO public.system_alerts (
      alert_type, severity, title, description, triggered_by, metadata
    ) VALUES (
      'critical_error', 'critical', 
      'Critical Error Detected', 
      'Critical error in component: ' || COALESCE(p_component_name, 'Unknown'),
      'system',
      jsonb_build_object('error_id', error_id, 'component', p_component_name)
    );
  END IF;
  
  RETURN error_id;
END;
$$;

-- Function to get error statistics for admin dashboard
CREATE OR REPLACE FUNCTION public.get_error_statistics(days_back INTEGER DEFAULT 7)
RETURNS TABLE(
  total_errors BIGINT,
  critical_errors BIGINT,
  high_errors BIGINT,
  medium_errors BIGINT,
  low_errors BIGINT,
  resolved_errors BIGINT,
  top_error_components TEXT[],
  error_rate_trend NUMERIC[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  RETURN QUERY
  SELECT 
    COUNT(*) as total_errors,
    COUNT(*) FILTER (WHERE severity = 'critical') as critical_errors,
    COUNT(*) FILTER (WHERE severity = 'high') as high_errors,
    COUNT(*) FILTER (WHERE severity = 'medium') as medium_errors,
    COUNT(*) FILTER (WHERE severity = 'low') as low_errors,
    COUNT(*) FILTER (WHERE resolved = true) as resolved_errors,
    ARRAY(
      SELECT component_name 
      FROM public.system_errors 
      WHERE created_at >= CURRENT_DATE - (days_back || ' days')::interval 
        AND component_name IS NOT NULL
      GROUP BY component_name 
      ORDER BY COUNT(*) DESC 
      LIMIT 5
    ) as top_error_components,
    ARRAY(
      SELECT COUNT(*)::NUMERIC
      FROM public.system_errors 
      WHERE created_at >= CURRENT_DATE - (i || ' days')::interval 
        AND created_at < CURRENT_DATE - ((i-1) || ' days')::interval
    ) as error_rate_trend
  FROM public.system_errors se
  CROSS JOIN generate_series(1, days_back) as i
  WHERE se.created_at >= CURRENT_DATE - (days_back || ' days')::interval;
END;
$$;

-- Function to mark errors as resolved
CREATE OR REPLACE FUNCTION public.resolve_system_error(error_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user is admin
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  UPDATE public.system_errors 
  SET resolved = true, 
      resolved_by = auth.uid(), 
      resolved_at = now(),
      updated_at = now()
  WHERE id = error_id;
  
  RETURN FOUND;
END;
$$;

-- Add triggers for updated_at columns
CREATE TRIGGER update_system_errors_updated_at
  BEFORE UPDATE ON public.system_errors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_error_patterns_updated_at
  BEFORE UPDATE ON public.error_patterns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_alerts_updated_at
  BEFORE UPDATE ON public.system_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();