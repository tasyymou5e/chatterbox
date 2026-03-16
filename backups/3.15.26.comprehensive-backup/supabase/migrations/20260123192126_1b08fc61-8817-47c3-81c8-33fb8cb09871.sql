-- Table for tracking edge function recovery attempts
CREATE TABLE public.edge_function_recovery_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  function_name TEXT NOT NULL,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  attempt_type TEXT NOT NULL CHECK (attempt_type IN ('warmup', 'retry', 'escalation')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'success', 'failed')),
  response_time_ms INTEGER,
  error_message TEXT,
  triggered_by TEXT NOT NULL DEFAULT 'scheduled' CHECK (triggered_by IN ('scheduled', 'manual', 'auto_recovery')),
  consecutive_failures_before INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.edge_function_recovery_attempts ENABLE ROW LEVEL SECURITY;

-- RLS policies for recovery attempts (admin read, service role write)
CREATE POLICY "Admins can view recovery attempts"
  ON public.edge_function_recovery_attempts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Service role can insert recovery attempts"
  ON public.edge_function_recovery_attempts
  FOR INSERT
  WITH CHECK (true);

-- Index for efficient queries
CREATE INDEX idx_recovery_function_name ON public.edge_function_recovery_attempts(function_name);
CREATE INDEX idx_recovery_created_at ON public.edge_function_recovery_attempts(created_at DESC);
CREATE INDEX idx_recovery_status ON public.edge_function_recovery_attempts(status);

-- Add recovery threshold columns to alert config
ALTER TABLE public.edge_function_alert_config 
  ADD COLUMN IF NOT EXISTS warmup_threshold INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS critical_threshold INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS max_recovery_attempts INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS recovery_cooldown_minutes INTEGER NOT NULL DEFAULT 30;

-- Function to get recovery status for a function
CREATE OR REPLACE FUNCTION public.get_function_recovery_status(p_function_name TEXT)
RETURNS TABLE(
  needs_recovery BOOLEAN,
  is_critical BOOLEAN,
  consecutive_failures INTEGER,
  last_recovery_attempt TIMESTAMPTZ,
  recovery_attempts_today INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consecutive_failures INTEGER;
  v_last_recovery TIMESTAMPTZ;
  v_attempts_today INTEGER;
  v_warmup_threshold INTEGER;
  v_critical_threshold INTEGER;
BEGIN
  -- Get consecutive failures
  SELECT COALESCE(get_consecutive_failures(p_function_name), 0) INTO v_consecutive_failures;
  
  -- Get last recovery attempt
  SELECT created_at INTO v_last_recovery
  FROM edge_function_recovery_attempts
  WHERE function_name = p_function_name
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Get recovery attempts in last 24 hours
  SELECT COUNT(*) INTO v_attempts_today
  FROM edge_function_recovery_attempts
  WHERE function_name = p_function_name
    AND created_at > now() - INTERVAL '24 hours';
  
  -- Get thresholds from config
  SELECT 
    COALESCE(efc.warmup_threshold, 3),
    COALESCE(efc.critical_threshold, 5)
  INTO v_warmup_threshold, v_critical_threshold
  FROM edge_function_alert_config efc
  WHERE efc.function_name = p_function_name OR efc.function_name = '_default'
  ORDER BY CASE WHEN efc.function_name = p_function_name THEN 0 ELSE 1 END
  LIMIT 1;
  
  RETURN QUERY SELECT 
    v_consecutive_failures >= v_warmup_threshold AS needs_recovery,
    v_consecutive_failures >= v_critical_threshold AS is_critical,
    v_consecutive_failures,
    v_last_recovery,
    v_attempts_today;
END;
$$;

-- Cleanup function for old recovery attempts (keep last 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_recovery_attempts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM edge_function_recovery_attempts
  WHERE created_at < now() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;