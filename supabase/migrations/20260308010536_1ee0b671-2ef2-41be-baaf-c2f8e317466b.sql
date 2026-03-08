-- Fix: restrict data_health_alerts INSERT to service_role only
-- Previously allowed any public user to insert health alerts
DROP POLICY IF EXISTS "System can insert health alerts" ON public.data_health_alerts;

CREATE POLICY "Service role can insert health alerts"
ON public.data_health_alerts
FOR INSERT
TO service_role
WITH CHECK (true);