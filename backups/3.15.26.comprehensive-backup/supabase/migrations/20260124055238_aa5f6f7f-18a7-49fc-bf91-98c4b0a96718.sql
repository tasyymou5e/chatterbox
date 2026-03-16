-- Create data_health_scores table for historical tracking
CREATE TABLE public.data_health_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  overall_score INTEGER NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
  integrity_score INTEGER NOT NULL CHECK (integrity_score >= 0 AND integrity_score <= 100),
  repair_score INTEGER NOT NULL CHECK (repair_score >= 0 AND repair_score <= 100),
  system_score INTEGER NOT NULL CHECK (system_score >= 0 AND system_score <= 100),
  grade TEXT NOT NULL CHECK (grade IN ('excellent', 'good', 'fair', 'poor', 'critical')),
  integrity_details JSONB DEFAULT '{}'::jsonb,
  repair_details JSONB DEFAULT '{}'::jsonb,
  system_details JSONB DEFAULT '{}'::jsonb,
  factors_impacting JSONB DEFAULT '[]'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for time-based queries
CREATE INDEX idx_data_health_scores_calculated_at ON public.data_health_scores(calculated_at DESC);

-- Enable RLS
ALTER TABLE public.data_health_scores ENABLE ROW LEVEL SECURITY;

-- Admin-only access policy
CREATE POLICY "Admins can view data health scores"
  ON public.data_health_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert data health scores"
  ON public.data_health_scores
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Create RPC function to calculate data health score
CREATE OR REPLACE FUNCTION public.calculate_data_health_score()
RETURNS TABLE (
  overall_score INTEGER,
  integrity_score INTEGER,
  repair_score INTEGER,
  system_score INTEGER,
  grade TEXT,
  integrity_details JSONB,
  repair_details JSONB,
  system_details JSONB,
  factors_impacting JSONB,
  calculated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_integrity_score INTEGER;
  v_repair_score INTEGER;
  v_system_score INTEGER;
  v_overall_score INTEGER;
  v_grade TEXT;
  v_integrity_details JSONB;
  v_repair_details JSONB;
  v_system_details JSONB;
  v_factors JSONB := '[]'::jsonb;
  
  -- Integrity metrics
  v_critical_issues INTEGER;
  v_high_issues INTEGER;
  v_medium_issues INTEGER;
  v_low_issues INTEGER;
  v_pending_fixes INTEGER;
  v_fixed_24h INTEGER;
  v_last_check_status TEXT;
  v_last_check_time TIMESTAMPTZ;
  
  -- Repair metrics
  v_total_repairs_7d INTEGER;
  v_successful_repairs_7d INTEGER;
  v_failed_repairs_7d INTEGER;
  v_success_rate NUMERIC;
  v_last_repair_time TIMESTAMPTZ;
  
  -- System metrics
  v_services_healthy INTEGER;
  v_services_degraded INTEGER;
  v_services_down INTEGER;
  v_avg_uptime NUMERIC;
  v_avg_response_time NUMERIC;
  v_error_rate NUMERIC;
BEGIN
  -- Calculate Integrity Score
  SELECT 
    COALESCE(SUM(CASE WHEN severity = 'critical' AND status = 'pending_review' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN severity = 'high' AND status = 'pending_review' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN severity = 'medium' AND status = 'pending_review' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN severity = 'low' AND status = 'pending_review' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'pending_review' AND auto_fix_available THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'fixed' AND fixed_at > now() - interval '24 hours' THEN 1 ELSE 0 END), 0)
  INTO v_critical_issues, v_high_issues, v_medium_issues, v_low_issues, v_pending_fixes, v_fixed_24h
  FROM public.integrity_issues;
  
  -- Get last check status
  SELECT status, created_at
  INTO v_last_check_status, v_last_check_time
  FROM public.integrity_check_logs
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Calculate integrity score: base 100, subtract for issues, add for fixes
  v_integrity_score := GREATEST(0, LEAST(100,
    100
    - (v_critical_issues * 20)
    - (v_high_issues * 10)
    - (v_medium_issues * 5)
    - (v_low_issues * 2)
    + LEAST(v_fixed_24h * 5, 20)
  ));
  
  v_integrity_details := jsonb_build_object(
    'critical_issues', v_critical_issues,
    'high_issues', v_high_issues,
    'medium_issues', v_medium_issues,
    'low_issues', v_low_issues,
    'pending_fixes', v_pending_fixes,
    'fixed_24h', v_fixed_24h,
    'last_check_status', COALESCE(v_last_check_status, 'never'),
    'last_check_time', v_last_check_time
  );
  
  -- Add integrity factors
  IF v_critical_issues > 0 THEN
    v_factors := v_factors || jsonb_build_array(jsonb_build_object(
      'category', 'integrity',
      'severity', 'critical',
      'description', v_critical_issues || ' critical integrity issue(s) pending',
      'impact_points', v_critical_issues * 20
    ));
  END IF;
  IF v_high_issues > 0 THEN
    v_factors := v_factors || jsonb_build_array(jsonb_build_object(
      'category', 'integrity',
      'severity', 'high',
      'description', v_high_issues || ' high severity issue(s) pending',
      'impact_points', v_high_issues * 10
    ));
  END IF;
  IF v_medium_issues > 0 THEN
    v_factors := v_factors || jsonb_build_array(jsonb_build_object(
      'category', 'integrity',
      'severity', 'medium',
      'description', v_medium_issues || ' medium severity issue(s) pending',
      'impact_points', v_medium_issues * 5
    ));
  END IF;
  
  -- Calculate Repair Score (from integrity_fix_audit)
  SELECT 
    COUNT(*),
    COALESCE(SUM(CASE WHEN action = 'executed' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN action = 'failed' THEN 1 ELSE 0 END), 0),
    MAX(CASE WHEN action = 'executed' THEN created_at ELSE NULL END)
  INTO v_total_repairs_7d, v_successful_repairs_7d, v_failed_repairs_7d, v_last_repair_time
  FROM public.integrity_fix_audit
  WHERE created_at > now() - interval '7 days'
    AND action IN ('executed', 'failed');
  
  -- Calculate success rate
  IF v_total_repairs_7d > 0 THEN
    v_success_rate := (v_successful_repairs_7d::NUMERIC / v_total_repairs_7d::NUMERIC) * 100;
  ELSE
    v_success_rate := 100; -- No repairs needed is perfect
  END IF;
  
  -- Repair score: base on success rate, penalty for failures
  v_repair_score := GREATEST(0, LEAST(100,
    v_success_rate::INTEGER
    - (v_failed_repairs_7d * 2)
    + CASE WHEN v_failed_repairs_7d = 0 AND v_total_repairs_7d > 0 THEN 10 ELSE 0 END
  ));
  
  v_repair_details := jsonb_build_object(
    'total_repairs_7d', v_total_repairs_7d,
    'successful_repairs_7d', v_successful_repairs_7d,
    'failed_repairs_7d', v_failed_repairs_7d,
    'success_rate', ROUND(v_success_rate, 1),
    'last_repair_time', v_last_repair_time,
    'trending', CASE 
      WHEN v_failed_repairs_7d = 0 THEN 'stable'
      WHEN v_failed_repairs_7d > 2 THEN 'declining'
      ELSE 'stable'
    END
  );
  
  -- Add repair factors
  IF v_failed_repairs_7d > 0 THEN
    v_factors := v_factors || jsonb_build_array(jsonb_build_object(
      'category', 'repair',
      'severity', CASE WHEN v_failed_repairs_7d > 2 THEN 'high' ELSE 'medium' END,
      'description', v_failed_repairs_7d || ' failed repair(s) in last 7 days',
      'impact_points', v_failed_repairs_7d * 2
    ));
  END IF;
  
  -- Calculate System Score (from edge_function_health_logs)
  SELECT 
    COALESCE(SUM(CASE WHEN status = 'healthy' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'degraded' THEN 1 ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'down' THEN 1 ELSE 0 END), 0),
    COALESCE(AVG(response_time_ms), 50)
  INTO v_services_healthy, v_services_degraded, v_services_down, v_avg_response_time
  FROM (
    SELECT DISTINCT ON (function_name) function_name, status, response_time_ms
    FROM public.edge_function_health_logs
    ORDER BY function_name, created_at DESC
  ) latest_status;
  
  -- Get uptime from daily stats
  SELECT COALESCE(AVG(uptime_percentage), 100)
  INTO v_avg_uptime
  FROM public.edge_function_uptime_daily
  WHERE date > CURRENT_DATE - interval '7 days';
  
  -- Get error rate from system errors
  SELECT 
    CASE 
      WHEN COUNT(*) > 0 THEN (COUNT(*)::NUMERIC / 10000) * 100
      ELSE 0 
    END
  INTO v_error_rate
  FROM public.system_errors
  WHERE created_at > now() - interval '24 hours';
  
  -- System score: base on uptime, penalties for degraded/down services
  v_system_score := GREATEST(0, LEAST(100,
    v_avg_uptime::INTEGER
    - (v_services_degraded * 15)
    - (v_services_down * 30)
    - CASE WHEN v_error_rate > 1 THEN 10 ELSE 0 END
    - CASE WHEN v_avg_response_time > 200 THEN 5 ELSE 0 END
  ));
  
  v_system_details := jsonb_build_object(
    'services_healthy', v_services_healthy,
    'services_degraded', v_services_degraded,
    'services_down', v_services_down,
    'average_uptime', ROUND(v_avg_uptime, 1),
    'average_response_time', ROUND(v_avg_response_time, 0),
    'error_rate_24h', ROUND(v_error_rate, 2)
  );
  
  -- Add system factors
  IF v_services_down > 0 THEN
    v_factors := v_factors || jsonb_build_array(jsonb_build_object(
      'category', 'system',
      'severity', 'critical',
      'description', v_services_down || ' service(s) currently down',
      'impact_points', v_services_down * 30
    ));
  END IF;
  IF v_services_degraded > 0 THEN
    v_factors := v_factors || jsonb_build_array(jsonb_build_object(
      'category', 'system',
      'severity', 'high',
      'description', v_services_degraded || ' service(s) degraded',
      'impact_points', v_services_degraded * 15
    ));
  END IF;
  IF v_avg_response_time > 200 THEN
    v_factors := v_factors || jsonb_build_array(jsonb_build_object(
      'category', 'system',
      'severity', 'low',
      'description', 'Average response time is ' || ROUND(v_avg_response_time) || 'ms (threshold: 200ms)',
      'impact_points', 5
    ));
  END IF;
  
  -- Calculate overall score (weighted: 40% integrity, 30% repair, 30% system)
  v_overall_score := (v_integrity_score * 40 + v_repair_score * 30 + v_system_score * 30) / 100;
  
  -- Determine grade
  v_grade := CASE
    WHEN v_overall_score >= 90 THEN 'excellent'
    WHEN v_overall_score >= 75 THEN 'good'
    WHEN v_overall_score >= 60 THEN 'fair'
    WHEN v_overall_score >= 40 THEN 'poor'
    ELSE 'critical'
  END;
  
  RETURN QUERY SELECT 
    v_overall_score,
    v_integrity_score,
    v_repair_score,
    v_system_score,
    v_grade,
    v_integrity_details,
    v_repair_details,
    v_system_details,
    v_factors,
    now();
END;
$$;

-- Grant execute permission to authenticated users (RLS will handle access control)
GRANT EXECUTE ON FUNCTION public.calculate_data_health_score() TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.calculate_data_health_score() IS 'Calculates comprehensive data health score from integrity, repair, and system metrics';