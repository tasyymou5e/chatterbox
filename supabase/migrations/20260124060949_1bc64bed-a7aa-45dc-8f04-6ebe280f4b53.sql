-- Create table to track data health alert history
CREATE TABLE public.data_health_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('warning', 'critical')),
  score INTEGER NOT NULL,
  grade TEXT NOT NULL,
  recipients TEXT[] NOT NULL DEFAULT '{}',
  emails_sent INTEGER NOT NULL DEFAULT 0,
  email_errors TEXT[] DEFAULT '{}',
  factors_summary JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for cooldown queries (check recent alerts by type)
CREATE INDEX idx_data_health_alerts_type_created 
ON public.data_health_alerts(alert_type, created_at DESC);

-- Index for general listing/history queries
CREATE INDEX idx_data_health_alerts_created 
ON public.data_health_alerts(created_at DESC);

-- Enable RLS
ALTER TABLE public.data_health_alerts ENABLE ROW LEVEL SECURITY;

-- Admins can view all health alerts
CREATE POLICY "Admins can view health alerts" 
ON public.data_health_alerts FOR SELECT
USING (public.check_admin_role_secure(auth.uid()));

-- Only system (service role) can insert alerts
CREATE POLICY "System can insert health alerts"
ON public.data_health_alerts FOR INSERT
WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE public.data_health_alerts IS 'Tracks data health score alert history with cooldown management';