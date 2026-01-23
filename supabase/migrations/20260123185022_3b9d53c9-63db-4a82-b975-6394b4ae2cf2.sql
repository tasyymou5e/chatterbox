-- Create table to log health check history
CREATE TABLE public.llm_health_check_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_key TEXT NOT NULL,
  check_type TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'manual', 'failover'
  previous_status TEXT,
  new_status TEXT NOT NULL,
  response_time_ms INTEGER,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add index for efficient querying
CREATE INDEX idx_llm_health_check_logs_provider ON public.llm_health_check_logs(provider_key);
CREATE INDEX idx_llm_health_check_logs_created ON public.llm_health_check_logs(created_at DESC);
CREATE INDEX idx_llm_health_check_logs_status_change ON public.llm_health_check_logs(provider_key, created_at DESC) 
  WHERE previous_status IS DISTINCT FROM new_status;

-- Enable RLS
ALTER TABLE public.llm_health_check_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view health check logs
CREATE POLICY "Admins can view health check logs"
  ON public.llm_health_check_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Service role can insert (for edge functions)
CREATE POLICY "Service role can insert health check logs"
  ON public.llm_health_check_logs
  FOR INSERT
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE public.llm_health_check_logs IS 'Logs all LLM provider health check results for monitoring and debugging';