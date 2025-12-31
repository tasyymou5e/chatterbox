-- Fix the ambiguous column reference in get_llm_usage_stats
CREATE OR REPLACE FUNCTION public.get_llm_usage_stats(
  p_days_back integer DEFAULT 7, 
  p_provider text DEFAULT NULL::text
)
RETURNS TABLE(
  total_calls bigint, 
  total_tokens bigint, 
  total_cost_usd numeric, 
  avg_response_time_ms numeric, 
  success_rate numeric, 
  provider_breakdown jsonb, 
  model_breakdown jsonb, 
  daily_usage jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid;
BEGIN
  uid := auth.uid();
  
  IF NOT has_role(uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  WITH filtered_calls AS (
    SELECT 
      lac.id,
      lac.provider,
      lac.model,
      lac.total_tokens AS tokens,
      lac.cost_usd,
      lac.response_time_ms,
      lac.status,
      lac.created_at
    FROM public.llm_api_calls lac
    WHERE lac.created_at >= CURRENT_DATE - (p_days_back || ' days')::interval
      AND (p_provider IS NULL OR lac.provider = p_provider)
  ),
  totals AS (
    SELECT
      COALESCE(COUNT(*), 0)::bigint AS calls_total,
      COALESCE(SUM(fc.tokens), 0)::bigint AS tokens_total,
      COALESCE(SUM(fc.cost_usd), 0)::numeric AS cost_total,
      COALESCE(AVG(fc.response_time_ms), 0)::numeric AS avg_response,
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(CASE WHEN fc.status = 'success' THEN 1 END)::numeric / COUNT(*)::numeric) * 100, 2)
        ELSE 0
      END AS rate_success
    FROM filtered_calls fc
  ),
  provider_agg AS (
    SELECT 
      COALESCE(
        jsonb_object_agg(
          sub.provider,
          jsonb_build_object('calls', sub.call_count, 'tokens', sub.token_count, 'cost', sub.cost_sum)
        ),
        '{}'::jsonb
      ) AS breakdown
    FROM (
      SELECT 
        fc.provider,
        COUNT(*)::bigint AS call_count,
        COALESCE(SUM(fc.tokens), 0)::bigint AS token_count,
        COALESCE(SUM(fc.cost_usd), 0)::numeric AS cost_sum
      FROM filtered_calls fc
      GROUP BY fc.provider
    ) sub
  ),
  model_agg AS (
    SELECT 
      COALESCE(
        jsonb_object_agg(
          sub.model,
          jsonb_build_object('calls', sub.call_count, 'tokens', sub.token_count, 'cost', sub.cost_sum)
        ),
        '{}'::jsonb
      ) AS breakdown
    FROM (
      SELECT 
        fc.model,
        COUNT(*)::bigint AS call_count,
        COALESCE(SUM(fc.tokens), 0)::bigint AS token_count,
        COALESCE(SUM(fc.cost_usd), 0)::numeric AS cost_sum
      FROM filtered_calls fc
      GROUP BY fc.model
    ) sub
  ),
  daily_agg AS (
    SELECT 
      COALESCE(
        jsonb_object_agg(
          sub.day,
          jsonb_build_object('calls', sub.call_count, 'tokens', sub.token_count, 'cost', sub.cost_sum)
        ),
        '{}'::jsonb
      ) AS breakdown
    FROM (
      SELECT 
        TO_CHAR(fc.created_at::date, 'YYYY-MM-DD') AS day,
        COUNT(*)::bigint AS call_count,
        COALESCE(SUM(fc.tokens), 0)::bigint AS token_count,
        COALESCE(SUM(fc.cost_usd), 0)::numeric AS cost_sum
      FROM filtered_calls fc
      GROUP BY fc.created_at::date
      ORDER BY fc.created_at::date DESC
    ) sub
  )
  SELECT 
    t.calls_total AS total_calls,
    t.tokens_total AS total_tokens,
    t.cost_total AS total_cost_usd,
    t.avg_response AS avg_response_time_ms,
    t.rate_success AS success_rate,
    pa.breakdown AS provider_breakdown,
    ma.breakdown AS model_breakdown,
    da.breakdown AS daily_usage
  FROM totals t
  CROSS JOIN provider_agg pa
  CROSS JOIN model_agg ma
  CROSS JOIN daily_agg da;
END;
$function$;

-- Create LLM cost thresholds table
CREATE TABLE IF NOT EXISTS public.llm_cost_thresholds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  threshold_type TEXT NOT NULL CHECK (threshold_type IN ('daily', 'weekly', 'monthly')),
  threshold_value NUMERIC NOT NULL CHECK (threshold_value > 0),
  warning_percentage NUMERIC DEFAULT 80 CHECK (warning_percentage > 0 AND warning_percentage <= 100),
  enabled BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(threshold_type)
);

-- Create LLM cost alerts table
CREATE TABLE IF NOT EXISTS public.llm_cost_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('threshold_warning', 'threshold_exceeded', 'rate_spike', 'anomaly')),
  threshold_type TEXT CHECK (threshold_type IN ('daily', 'weekly', 'monthly')),
  threshold_value NUMERIC,
  current_value NUMERIC NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  provider TEXT,
  message TEXT NOT NULL,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.llm_cost_thresholds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_cost_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for llm_cost_thresholds (admin only)
CREATE POLICY "llm_cost_thresholds_admin_access" ON public.llm_cost_thresholds
  FOR ALL USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- RLS policies for llm_cost_alerts (admin only)
CREATE POLICY "llm_cost_alerts_admin_access" ON public.llm_cost_alerts
  FOR ALL USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_llm_cost_alerts_created_at ON public.llm_cost_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_cost_alerts_acknowledged ON public.llm_cost_alerts(acknowledged) WHERE acknowledged = false;
CREATE INDEX IF NOT EXISTS idx_llm_cost_thresholds_enabled ON public.llm_cost_thresholds(enabled) WHERE enabled = true;

-- Insert default thresholds
INSERT INTO public.llm_cost_thresholds (threshold_type, threshold_value, warning_percentage)
VALUES 
  ('daily', 10.00, 80),
  ('weekly', 50.00, 80),
  ('monthly', 200.00, 80)
ON CONFLICT (threshold_type) DO NOTHING;

-- Function to check cost thresholds and create alerts
CREATE OR REPLACE FUNCTION public.check_llm_cost_thresholds()
RETURNS TABLE(
  alert_id UUID,
  alert_type TEXT,
  severity TEXT,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  threshold_rec RECORD;
  current_cost NUMERIC;
  percentage_used NUMERIC;
  new_alert_id UUID;
  alert_severity TEXT;
  alert_message TEXT;
BEGIN
  -- Check each enabled threshold
  FOR threshold_rec IN 
    SELECT * FROM public.llm_cost_thresholds WHERE enabled = true
  LOOP
    -- Calculate current cost based on threshold type
    CASE threshold_rec.threshold_type
      WHEN 'daily' THEN
        SELECT COALESCE(SUM(cost_usd), 0) INTO current_cost
        FROM public.llm_api_calls
        WHERE created_at >= CURRENT_DATE;
      WHEN 'weekly' THEN
        SELECT COALESCE(SUM(cost_usd), 0) INTO current_cost
        FROM public.llm_api_calls
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';
      WHEN 'monthly' THEN
        SELECT COALESCE(SUM(cost_usd), 0) INTO current_cost
        FROM public.llm_api_calls
        WHERE created_at >= date_trunc('month', CURRENT_DATE);
    END CASE;
    
    -- Calculate percentage used
    percentage_used := (current_cost / threshold_rec.threshold_value) * 100;
    
    -- Check if we need to create an alert
    IF percentage_used >= 100 THEN
      alert_severity := 'critical';
      alert_message := format('%s cost threshold exceeded: $%.2f / $%.2f (%.1f%%)', 
        initcap(threshold_rec.threshold_type), current_cost, threshold_rec.threshold_value, percentage_used);
      
      -- Check if similar alert exists in last hour
      IF NOT EXISTS (
        SELECT 1 FROM public.llm_cost_alerts 
        WHERE threshold_type = threshold_rec.threshold_type 
        AND alert_type = 'threshold_exceeded'
        AND created_at > now() - INTERVAL '1 hour'
      ) THEN
        INSERT INTO public.llm_cost_alerts (alert_type, threshold_type, threshold_value, current_value, severity, message, metadata)
        VALUES ('threshold_exceeded', threshold_rec.threshold_type, threshold_rec.threshold_value, current_cost, alert_severity, alert_message,
          jsonb_build_object('percentage_used', percentage_used))
        RETURNING id INTO new_alert_id;
        
        RETURN QUERY SELECT new_alert_id, 'threshold_exceeded'::TEXT, alert_severity, alert_message;
      END IF;
      
    ELSIF percentage_used >= threshold_rec.warning_percentage THEN
      alert_severity := CASE 
        WHEN percentage_used >= 95 THEN 'high'
        WHEN percentage_used >= 90 THEN 'medium'
        ELSE 'low'
      END;
      alert_message := format('%s cost approaching threshold: $%.2f / $%.2f (%.1f%%)', 
        initcap(threshold_rec.threshold_type), current_cost, threshold_rec.threshold_value, percentage_used);
      
      -- Check if similar alert exists in last 4 hours
      IF NOT EXISTS (
        SELECT 1 FROM public.llm_cost_alerts 
        WHERE threshold_type = threshold_rec.threshold_type 
        AND alert_type = 'threshold_warning'
        AND created_at > now() - INTERVAL '4 hours'
      ) THEN
        INSERT INTO public.llm_cost_alerts (alert_type, threshold_type, threshold_value, current_value, severity, message, metadata)
        VALUES ('threshold_warning', threshold_rec.threshold_type, threshold_rec.threshold_value, current_cost, alert_severity, alert_message,
          jsonb_build_object('percentage_used', percentage_used, 'warning_threshold', threshold_rec.warning_percentage))
        RETURNING id INTO new_alert_id;
        
        RETURN QUERY SELECT new_alert_id, 'threshold_warning'::TEXT, alert_severity, alert_message;
      END IF;
    END IF;
  END LOOP;
END;
$function$;