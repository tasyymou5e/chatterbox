-- Table for logging edge function health check results
CREATE TABLE public.edge_function_health_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('healthy', 'unhealthy', 'timeout', 'unknown')),
  response_time_ms INTEGER,
  error_message TEXT,
  check_type TEXT NOT NULL DEFAULT 'scheduled' CHECK (check_type IN ('scheduled', 'manual')),
  previous_status TEXT,
  http_status_code INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for alert configuration per function
CREATE TABLE public.edge_function_alert_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL UNIQUE,
  response_time_threshold_ms INTEGER NOT NULL DEFAULT 5000,
  consecutive_failures_threshold INTEGER NOT NULL DEFAULT 2,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.edge_function_health_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.edge_function_alert_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for health logs (admin read, service role write)
CREATE POLICY "Admins can view health logs"
  ON public.edge_function_health_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Service role can insert health logs"
  ON public.edge_function_health_logs
  FOR INSERT
  WITH CHECK (true);

-- RLS policies for alert config (admin only)
CREATE POLICY "Admins can view alert config"
  ON public.edge_function_alert_config
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage alert config"
  ON public.edge_function_alert_config
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Index for efficient queries
CREATE INDEX idx_health_logs_function_name ON public.edge_function_health_logs(function_name);
CREATE INDEX idx_health_logs_created_at ON public.edge_function_health_logs(created_at DESC);
CREATE INDEX idx_health_logs_status ON public.edge_function_health_logs(status);

-- Trigger for updating updated_at on alert config
CREATE TRIGGER update_edge_function_alert_config_updated_at
  BEFORE UPDATE ON public.edge_function_alert_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default alert config for 'all' functions
INSERT INTO public.edge_function_alert_config (function_name, response_time_threshold_ms, consecutive_failures_threshold)
VALUES ('_default', 5000, 2);

-- Function to get consecutive failure count for a function
CREATE OR REPLACE FUNCTION public.get_consecutive_failures(p_function_name TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failure_count INTEGER := 0;
  log_record RECORD;
BEGIN
  FOR log_record IN 
    SELECT status 
    FROM edge_function_health_logs 
    WHERE function_name = p_function_name 
    ORDER BY created_at DESC 
    LIMIT 10
  LOOP
    IF log_record.status IN ('unhealthy', 'timeout') THEN
      failure_count := failure_count + 1;
    ELSE
      EXIT;
    END IF;
  END LOOP;
  
  RETURN failure_count;
END;
$$;

-- Function to clean up old health logs (keep last 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_health_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM edge_function_health_logs
  WHERE created_at < now() - INTERVAL '7 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;