-- Create LLM failover configuration table
CREATE TABLE public.llm_failover_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  primary_provider_key TEXT NOT NULL,
  backup_provider_key TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  trigger_on_rate_limit BOOLEAN NOT NULL DEFAULT true,
  trigger_on_timeout BOOLEAN NOT NULL DEFAULT true,
  trigger_on_error BOOLEAN NOT NULL DEFAULT true,
  timeout_threshold_ms INTEGER NOT NULL DEFAULT 30000,
  max_retries_before_failover INTEGER NOT NULL DEFAULT 2,
  cooldown_seconds INTEGER NOT NULL DEFAULT 300,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(primary_provider_key, backup_provider_key)
);

-- Create failover events log table
CREATE TABLE public.llm_failover_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID REFERENCES public.llm_failover_config(id) ON DELETE SET NULL,
  primary_provider TEXT NOT NULL,
  backup_provider TEXT NOT NULL,
  trigger_reason TEXT NOT NULL,
  original_error TEXT,
  backup_success BOOLEAN NOT NULL DEFAULT false,
  response_time_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create provider status tracking for cooldown
CREATE TABLE public.llm_provider_status (
  provider_key TEXT PRIMARY KEY,
  is_healthy BOOLEAN NOT NULL DEFAULT true,
  last_failure_at TIMESTAMPTZ,
  failure_count INTEGER NOT NULL DEFAULT 0,
  cooldown_until TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.llm_failover_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_failover_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_provider_status ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for failover config
CREATE POLICY "Admins can manage failover config" 
ON public.llm_failover_config 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Admin-only policies for failover events (read)
CREATE POLICY "Admins can view failover events" 
ON public.llm_failover_events 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Service role can insert failover events
CREATE POLICY "Service can log failover events" 
ON public.llm_failover_events 
FOR INSERT 
WITH CHECK (true);

-- Admin policies for provider status
CREATE POLICY "Admins can view provider status" 
ON public.llm_provider_status 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Service can manage provider status" 
ON public.llm_provider_status 
FOR ALL 
USING (true);

-- Create indexes
CREATE INDEX idx_failover_config_primary ON public.llm_failover_config(primary_provider_key) WHERE is_active = true;
CREATE INDEX idx_failover_events_created ON public.llm_failover_events(created_at DESC);
CREATE INDEX idx_provider_status_cooldown ON public.llm_provider_status(cooldown_until) WHERE cooldown_until IS NOT NULL;

-- Trigger for updated_at
CREATE TRIGGER update_llm_failover_config_updated_at
BEFORE UPDATE ON public.llm_failover_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_llm_provider_status_updated_at
BEFORE UPDATE ON public.llm_provider_status
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();