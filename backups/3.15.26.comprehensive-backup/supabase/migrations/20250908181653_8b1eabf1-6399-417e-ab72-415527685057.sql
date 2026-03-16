-- Create LLM monitoring tables and functions

-- Table for tracking individual LLM API calls
CREATE TABLE public.llm_api_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL, -- 'openai', 'anthropic', etc.
  model TEXT NOT NULL, -- 'gpt-4o', 'claude-3-sonnet', etc.
  function_name TEXT NOT NULL, -- edge function that made the call  
  user_id UUID REFERENCES auth.users(id),
  prompt_tokens INTEGER DEFAULT 0,
  completion_tokens INTEGER DEFAULT 0,
  total_tokens INTEGER DEFAULT 0,
  response_time_ms INTEGER DEFAULT 0,
  cost_usd DECIMAL(10,6) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success', -- 'success', 'error', 'timeout'
  error_message TEXT,
  request_metadata JSONB DEFAULT '{}',
  response_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for daily/hourly aggregated metrics
CREATE TABLE public.llm_usage_summaries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date_period DATE NOT NULL,
  hour_period INTEGER, -- for hourly breakdowns (0-23)
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  total_calls INTEGER DEFAULT 0,
  total_tokens BIGINT DEFAULT 0,
  total_cost_usd DECIMAL(10,6) DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT 0,
  success_rate DECIMAL(5,2) DEFAULT 100.0, -- percentage
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for budget tracking and alerts
CREATE TABLE public.llm_cost_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  budget_period TEXT NOT NULL DEFAULT 'monthly', -- 'daily', 'weekly', 'monthly'
  budget_limit_usd DECIMAL(10,2) NOT NULL,
  current_spend_usd DECIMAL(10,6) DEFAULT 0,
  alert_threshold_percentage INTEGER DEFAULT 80, -- when to send alerts
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.llm_api_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_usage_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.llm_cost_budgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Admin only access
CREATE POLICY "Admins can manage LLM api calls" ON public.llm_api_calls
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage LLM usage summaries" ON public.llm_usage_summaries  
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage LLM cost budgets" ON public.llm_cost_budgets
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Function to log LLM API calls
CREATE OR REPLACE FUNCTION public.log_llm_api_call(
  p_provider TEXT,
  p_model TEXT,
  p_function_name TEXT,
  p_user_id UUID DEFAULT NULL,
  p_prompt_tokens INTEGER DEFAULT 0,
  p_completion_tokens INTEGER DEFAULT 0,
  p_response_time_ms INTEGER DEFAULT 0,
  p_status TEXT DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL,
  p_request_metadata JSONB DEFAULT '{}',
  p_response_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  call_id UUID;
  total_tokens_calc INTEGER;
  cost_calc DECIMAL(10,6);
BEGIN
  -- Calculate total tokens
  total_tokens_calc := COALESCE(p_prompt_tokens, 0) + COALESCE(p_completion_tokens, 0);
  
  -- Simple cost calculation (can be enhanced with provider-specific pricing)
  cost_calc := CASE 
    WHEN p_provider = 'openai' AND p_model LIKE 'gpt-4%' THEN total_tokens_calc * 0.00003
    WHEN p_provider = 'openai' AND p_model LIKE 'gpt-3.5%' THEN total_tokens_calc * 0.000002
    WHEN p_provider = 'anthropic' THEN total_tokens_calc * 0.000015
    ELSE total_tokens_calc * 0.00001 -- default rate
  END;
  
  -- Insert the API call record
  INSERT INTO public.llm_api_calls (
    provider, model, function_name, user_id, prompt_tokens, completion_tokens,
    total_tokens, response_time_ms, cost_usd, status, error_message,
    request_metadata, response_metadata
  ) VALUES (
    p_provider, p_model, p_function_name, p_user_id, p_prompt_tokens, p_completion_tokens,
    total_tokens_calc, p_response_time_ms, cost_calc, p_status, p_error_message,
    p_request_metadata, p_response_metadata
  ) RETURNING id INTO call_id;
  
  RETURN call_id;
END;
$$;

-- Function to get LLM usage statistics
CREATE OR REPLACE FUNCTION public.get_llm_usage_stats(
  p_days_back INTEGER DEFAULT 7,
  p_provider TEXT DEFAULT NULL
)
RETURNS TABLE(
  total_calls BIGINT,
  total_tokens BIGINT,
  total_cost_usd DECIMAL,
  avg_response_time_ms NUMERIC,
  success_rate NUMERIC,
  provider_breakdown JSONB,
  model_breakdown JSONB,
  daily_usage JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check admin permissions
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;
  
  RETURN QUERY
  WITH stats AS (
    SELECT 
      COUNT(*) as call_count,
      SUM(total_tokens) as token_sum,
      SUM(cost_usd) as cost_sum,
      AVG(response_time_ms) as avg_response,
      (COUNT(CASE WHEN status = 'success' THEN 1 END) * 100.0 / COUNT(*)) as success_pct
    FROM public.llm_api_calls
    WHERE created_at >= CURRENT_DATE - (p_days_back || ' days')::INTERVAL
    AND (p_provider IS NULL OR provider = p_provider)
  ),
  provider_stats AS (
    SELECT jsonb_object_agg(
      provider,
      jsonb_build_object(
        'calls', COUNT(*),
        'tokens', SUM(total_tokens),
        'cost', SUM(cost_usd)
      )
    ) as provider_data
    FROM public.llm_api_calls
    WHERE created_at >= CURRENT_DATE - (p_days_back || ' days')::INTERVAL
    AND (p_provider IS NULL OR provider = p_provider)
    GROUP BY provider
  ),
  model_stats AS (
    SELECT jsonb_object_agg(
      model,
      jsonb_build_object(
        'calls', COUNT(*),
        'tokens', SUM(total_tokens),
        'cost', SUM(cost_usd)
      )
    ) as model_data
    FROM public.llm_api_calls
    WHERE created_at >= CURRENT_DATE - (p_days_back || ' days')::INTERVAL
    AND (p_provider IS NULL OR provider = p_provider)
    GROUP BY model
  ),
  daily_stats AS (
    SELECT jsonb_object_agg(
      created_at::DATE,
      jsonb_build_object(
        'calls', COUNT(*),
        'tokens', SUM(total_tokens),
        'cost', SUM(cost_usd)
      )
    ) as daily_data
    FROM public.llm_api_calls
    WHERE created_at >= CURRENT_DATE - (p_days_back || ' days')::INTERVAL
    AND (p_provider IS NULL OR provider = p_provider)
    GROUP BY created_at::DATE
  )
  SELECT 
    s.call_count,
    s.token_sum,
    s.cost_sum,
    s.avg_response,
    s.success_pct,
    COALESCE(ps.provider_data, '{}'),
    COALESCE(ms.model_data, '{}'),
    COALESCE(ds.daily_data, '{}')
  FROM stats s
  CROSS JOIN provider_stats ps
  CROSS JOIN model_stats ms  
  CROSS JOIN daily_stats ds;
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_llm_api_calls_created_at ON public.llm_api_calls(created_at);
CREATE INDEX idx_llm_api_calls_provider ON public.llm_api_calls(provider);
CREATE INDEX idx_llm_api_calls_model ON public.llm_api_calls(model);
CREATE INDEX idx_llm_api_calls_function_name ON public.llm_api_calls(function_name);
CREATE INDEX idx_llm_usage_summaries_date_period ON public.llm_usage_summaries(date_period);
CREATE INDEX idx_llm_cost_budgets_provider ON public.llm_cost_budgets(provider);