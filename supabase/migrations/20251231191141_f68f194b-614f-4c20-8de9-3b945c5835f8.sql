-- Drop and recreate get_llm_usage_stats to fix aggregation bugs and ensure stable output
CREATE OR REPLACE FUNCTION public.get_llm_usage_stats(
  p_days_back integer DEFAULT 7,
  p_provider text DEFAULT NULL
)
RETURNS TABLE (
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
AS $$
DECLARE
  uid uuid;
BEGIN
  -- Get authenticated user
  uid := auth.uid();
  
  -- Check if user is admin
  IF NOT has_role(uid, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  WITH filtered_calls AS (
    SELECT *
    FROM public.llm_api_calls lac
    WHERE lac.created_at >= CURRENT_DATE - (p_days_back || ' days')::interval
      AND (p_provider IS NULL OR lac.provider = p_provider)
  ),
  -- Aggregate totals
  totals AS (
    SELECT
      COALESCE(COUNT(*), 0) AS total_calls,
      COALESCE(SUM(fc.total_tokens), 0) AS total_tokens,
      COALESCE(SUM(fc.cost_usd), 0) AS total_cost_usd,
      COALESCE(AVG(fc.response_time_ms), 0) AS avg_response_time_ms,
      CASE 
        WHEN COUNT(*) > 0 THEN 
          ROUND((COUNT(CASE WHEN fc.status = 'success' THEN 1 END)::numeric / COUNT(*)::numeric) * 100, 2)
        ELSE 0
      END AS success_rate
    FROM filtered_calls fc
  ),
  -- Provider breakdown
  provider_agg AS (
    SELECT 
      COALESCE(
        jsonb_object_agg(
          fc.provider,
          jsonb_build_object(
            'calls', fc.call_count,
            'tokens', fc.token_count,
            'cost', fc.cost_sum
          )
        ),
        '{}'::jsonb
      ) AS breakdown
    FROM (
      SELECT 
        provider,
        COUNT(*) AS call_count,
        COALESCE(SUM(total_tokens), 0) AS token_count,
        COALESCE(SUM(cost_usd), 0) AS cost_sum
      FROM filtered_calls
      GROUP BY provider
    ) fc
  ),
  -- Model breakdown
  model_agg AS (
    SELECT 
      COALESCE(
        jsonb_object_agg(
          fc.model,
          jsonb_build_object(
            'calls', fc.call_count,
            'tokens', fc.token_count,
            'cost', fc.cost_sum
          )
        ),
        '{}'::jsonb
      ) AS breakdown
    FROM (
      SELECT 
        model,
        COUNT(*) AS call_count,
        COALESCE(SUM(total_tokens), 0) AS token_count,
        COALESCE(SUM(cost_usd), 0) AS cost_sum
      FROM filtered_calls
      GROUP BY model
    ) fc
  ),
  -- Daily usage breakdown
  daily_agg AS (
    SELECT 
      COALESCE(
        jsonb_object_agg(
          fc.day,
          jsonb_build_object(
            'calls', fc.call_count,
            'tokens', fc.token_count,
            'cost', fc.cost_sum
          )
        ),
        '{}'::jsonb
      ) AS breakdown
    FROM (
      SELECT 
        TO_CHAR(created_at::date, 'YYYY-MM-DD') AS day,
        COUNT(*) AS call_count,
        COALESCE(SUM(total_tokens), 0) AS token_count,
        COALESCE(SUM(cost_usd), 0) AS cost_sum
      FROM filtered_calls
      GROUP BY created_at::date
      ORDER BY created_at::date DESC
    ) fc
  )
  SELECT 
    t.total_calls,
    t.total_tokens,
    t.total_cost_usd,
    t.avg_response_time_ms,
    t.success_rate,
    pa.breakdown AS provider_breakdown,
    ma.breakdown AS model_breakdown,
    da.breakdown AS daily_usage
  FROM totals t
  CROSS JOIN provider_agg pa
  CROSS JOIN model_agg ma
  CROSS JOIN daily_agg da;
END;
$$;