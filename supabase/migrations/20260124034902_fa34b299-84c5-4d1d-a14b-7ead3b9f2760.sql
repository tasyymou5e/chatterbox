-- =====================================================
-- Fix Overly Permissive RLS Policies
-- Restrict service-only INSERT policies from public to service_role
-- =====================================================

-- 1. Remove redundant profiles INSERT policy (proper policy already exists)
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

-- 2. Fix edge_function_health_logs - restrict to service_role only
DROP POLICY IF EXISTS "Service role can insert health logs" ON public.edge_function_health_logs;
CREATE POLICY "Service role can insert health logs" 
  ON public.edge_function_health_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 3. Fix edge_function_recovery_attempts - restrict to service_role only
DROP POLICY IF EXISTS "Service role can insert recovery attempts" ON public.edge_function_recovery_attempts;
CREATE POLICY "Service role can insert recovery attempts"
  ON public.edge_function_recovery_attempts
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 4. Fix llm_failover_events - restrict to service_role only
DROP POLICY IF EXISTS "Service can log failover events" ON public.llm_failover_events;
CREATE POLICY "Service can log failover events"
  ON public.llm_failover_events
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- 5. Fix llm_health_check_logs - restrict to service_role only
DROP POLICY IF EXISTS "Service role can insert health check logs" ON public.llm_health_check_logs;
CREATE POLICY "Service role can insert health check logs"
  ON public.llm_health_check_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);