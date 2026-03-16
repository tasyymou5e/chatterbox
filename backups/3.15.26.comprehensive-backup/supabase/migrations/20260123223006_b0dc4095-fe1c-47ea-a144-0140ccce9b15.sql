-- Create table for daily uptime summaries (long-term retention)
CREATE TABLE public.edge_function_uptime_daily (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  date DATE NOT NULL,
  total_checks INTEGER NOT NULL DEFAULT 0,
  healthy_checks INTEGER NOT NULL DEFAULT 0,
  avg_response_time_ms INTEGER,
  max_response_time_ms INTEGER,
  min_response_time_ms INTEGER,
  downtime_minutes INTEGER DEFAULT 0,
  uptime_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN total_checks > 0 
      THEN ROUND((healthy_checks::DECIMAL / total_checks) * 100, 2)
      ELSE 100.00 
    END
  ) STORED,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(function_name, date)
);

-- Create SLA configurations table
CREATE TABLE public.sla_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  uptime_target DECIMAL(5,2) NOT NULL DEFAULT 99.0,
  max_response_time_ms INTEGER NOT NULL DEFAULT 5000,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.edge_function_uptime_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_configurations ENABLE ROW LEVEL SECURITY;

-- RLS policies for uptime daily - admin read only
CREATE POLICY "Admins can view uptime daily data"
  ON public.edge_function_uptime_daily
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- RLS policies for SLA configurations
CREATE POLICY "Admins can view SLA configurations"
  ON public.sla_configurations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage SLA configurations"
  ON public.sla_configurations
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Insert default SLA tiers
INSERT INTO public.sla_configurations (name, uptime_target, max_response_time_ms, is_default) VALUES
  ('Standard', 99.0, 5000, true),
  ('Premium', 99.9, 3000, false),
  ('Critical', 99.99, 1000, false);

-- Create indexes for performance
CREATE INDEX idx_uptime_daily_function_date ON public.edge_function_uptime_daily(function_name, date DESC);
CREATE INDEX idx_uptime_daily_date ON public.edge_function_uptime_daily(date DESC);

-- Function to aggregate daily uptime from health logs
CREATE OR REPLACE FUNCTION public.aggregate_daily_uptime(p_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day')
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aggregated_count INTEGER := 0;
  v_check_interval_minutes INTEGER := 60;
BEGIN
  INSERT INTO edge_function_uptime_daily (
    function_name,
    date,
    total_checks,
    healthy_checks,
    avg_response_time_ms,
    max_response_time_ms,
    min_response_time_ms,
    downtime_minutes
  )
  SELECT 
    function_name,
    p_date,
    COUNT(*) as total_checks,
    SUM(CASE WHEN status = 'healthy' THEN 1 ELSE 0 END) as healthy_checks,
    ROUND(AVG(response_time_ms))::INTEGER as avg_response_time_ms,
    MAX(response_time_ms) as max_response_time_ms,
    MIN(response_time_ms) as min_response_time_ms,
    SUM(CASE WHEN status != 'healthy' THEN v_check_interval_minutes ELSE 0 END) as downtime_minutes
  FROM edge_function_health_logs
  WHERE DATE(created_at) = p_date
  GROUP BY function_name
  ON CONFLICT (function_name, date) 
  DO UPDATE SET
    total_checks = EXCLUDED.total_checks,
    healthy_checks = EXCLUDED.healthy_checks,
    avg_response_time_ms = EXCLUDED.avg_response_time_ms,
    max_response_time_ms = EXCLUDED.max_response_time_ms,
    min_response_time_ms = EXCLUDED.min_response_time_ms,
    downtime_minutes = EXCLUDED.downtime_minutes;

  GET DIAGNOSTICS v_aggregated_count = ROW_COUNT;
  RETURN v_aggregated_count;
END;
$$;

-- RPC to get uptime stats for a specific period
CREATE OR REPLACE FUNCTION public.get_uptime_stats(p_days INTEGER DEFAULT 7)
RETURNS TABLE (
  function_name TEXT,
  total_checks BIGINT,
  healthy_checks BIGINT,
  uptime_percentage DECIMAL(5,2),
  avg_response_time_ms DECIMAL,
  max_response_time_ms INTEGER,
  min_response_time_ms INTEGER,
  total_downtime_minutes BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cutoff_date DATE := CURRENT_DATE - p_days;
BEGIN
  IF p_days <= 7 THEN
    RETURN QUERY
    SELECT 
      l.function_name,
      COUNT(*)::BIGINT as total_checks,
      SUM(CASE WHEN l.status = 'healthy' THEN 1 ELSE 0 END)::BIGINT as healthy_checks,
      ROUND(
        (SUM(CASE WHEN l.status = 'healthy' THEN 1 ELSE 0 END)::DECIMAL / 
        NULLIF(COUNT(*), 0)) * 100, 2
      ) as uptime_percentage,
      ROUND(AVG(l.response_time_ms), 0) as avg_response_time_ms,
      MAX(l.response_time_ms) as max_response_time_ms,
      MIN(l.response_time_ms) as min_response_time_ms,
      (SUM(CASE WHEN l.status != 'healthy' THEN 60 ELSE 0 END))::BIGINT as total_downtime_minutes
    FROM edge_function_health_logs l
    WHERE l.created_at >= v_cutoff_date
    GROUP BY l.function_name
    ORDER BY l.function_name;
  ELSE
    RETURN QUERY
    SELECT 
      d.function_name,
      SUM(d.total_checks)::BIGINT as total_checks,
      SUM(d.healthy_checks)::BIGINT as healthy_checks,
      ROUND(
        (SUM(d.healthy_checks)::DECIMAL / 
        NULLIF(SUM(d.total_checks), 0)) * 100, 2
      ) as uptime_percentage,
      ROUND(AVG(d.avg_response_time_ms), 0) as avg_response_time_ms,
      MAX(d.max_response_time_ms) as max_response_time_ms,
      MIN(d.min_response_time_ms) as min_response_time_ms,
      SUM(d.downtime_minutes)::BIGINT as total_downtime_minutes
    FROM edge_function_uptime_daily d
    WHERE d.date >= v_cutoff_date
    GROUP BY d.function_name
    ORDER BY d.function_name;
  END IF;
END;
$$;

-- RPC to get daily uptime trend for charts
CREATE OR REPLACE FUNCTION public.get_uptime_trend(
  p_function_name TEXT DEFAULT NULL,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  function_name TEXT,
  uptime_percentage DECIMAL(5,2),
  avg_response_time_ms INTEGER,
  total_checks INTEGER,
  healthy_checks INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.date,
    d.function_name,
    d.uptime_percentage,
    d.avg_response_time_ms,
    d.total_checks,
    d.healthy_checks
  FROM edge_function_uptime_daily d
  WHERE d.date >= CURRENT_DATE - p_days
    AND (p_function_name IS NULL OR d.function_name = p_function_name)
  ORDER BY d.date DESC, d.function_name;
END;
$$;

-- Backfill existing data into daily summaries
DO $$
DECLARE
  v_date DATE;
BEGIN
  FOR v_date IN 
    SELECT DISTINCT DATE(created_at) 
    FROM edge_function_health_logs 
    WHERE created_at < CURRENT_DATE
    ORDER BY 1
  LOOP
    PERFORM aggregate_daily_uptime(v_date);
  END LOOP;
END;
$$;