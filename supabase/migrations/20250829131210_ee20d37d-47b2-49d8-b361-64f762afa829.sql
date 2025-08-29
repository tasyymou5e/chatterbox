-- CRITICAL SECURITY FIXES - RLS Policy Hardening
-- Fix profiles table access and secure system operations

-- 1. Fix profiles table - remove dangerous "deny all" policy
DROP POLICY IF EXISTS "Deny anonymous access" ON public.profiles;

-- Ensure profiles table has proper user access (policies may already exist but let's be safe)
DO $$ 
BEGIN
    -- Create user access policy if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles' 
        AND policyname = 'Users can view own profile'
    ) THEN
        CREATE POLICY "Users can view own profile" 
        ON public.profiles 
        FOR SELECT 
        TO authenticated 
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'profiles' 
        AND policyname = 'Users can update own profile'
    ) THEN
        CREATE POLICY "Users can update own profile" 
        ON public.profiles 
        FOR UPDATE 
        TO authenticated 
        USING (auth.uid() = user_id) 
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- 2. Secure system tables - replace dangerous "true" policies with proper authentication

-- Daily Streaks: Replace blanket "true" with proper checks
DROP POLICY IF EXISTS "System can manage streaks" ON public.daily_streaks;
CREATE POLICY "Authenticated system can manage streaks" 
ON public.daily_streaks 
FOR ALL 
USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role)));

-- Error Patterns: Secure system operations
DROP POLICY IF EXISTS "System can manage error patterns" ON public.error_patterns;
CREATE POLICY "Authenticated system can manage error patterns" 
ON public.error_patterns 
FOR ALL 
USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role)));

-- Family Leaderboards: Secure system operations  
DROP POLICY IF EXISTS "System can manage leaderboards" ON public.family_leaderboards;
CREATE POLICY "Authenticated system can manage leaderboards" 
ON public.family_leaderboards 
FOR ALL 
USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role)));

-- System Health Metrics: Secure system operations
DROP POLICY IF EXISTS "System can manage health metrics" ON public.system_health_metrics;
CREATE POLICY "Authenticated system can manage health metrics" 
ON public.system_health_metrics 
FOR ALL 
USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role)));

-- User Achievements: Secure system operations
DROP POLICY IF EXISTS "System can manage user achievements" ON public.user_achievements;
CREATE POLICY "Authenticated system can manage user achievements" 
ON public.user_achievements 
FOR ALL 
USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role)));

-- User Levels: Secure system operations
DROP POLICY IF EXISTS "System can manage user levels" ON public.user_levels;
CREATE POLICY "Authenticated system can manage user levels" 
ON public.user_levels 
FOR ALL 
USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role)));

-- User Points: Secure system operations
DROP POLICY IF EXISTS "System can manage user points" ON public.user_points;
CREATE POLICY "Authenticated system can manage user points" 
ON public.user_points 
FOR ALL 
USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role)));

-- User Sessions: Secure system operations
DROP POLICY IF EXISTS "System can manage sessions" ON public.user_sessions;
CREATE POLICY "Authenticated system can manage sessions" 
ON public.user_sessions 
FOR ALL 
USING (auth.role() = 'service_role' OR (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin'::app_role)));

-- 3. Secure INSERT operations with dangerous "true" with_check conditions

-- Analytics Metrics: Add authentication check
DROP POLICY IF EXISTS "System can insert analytics metrics" ON public.analytics_metrics;
CREATE POLICY "Authenticated system can insert analytics metrics" 
ON public.analytics_metrics 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);

-- Engagement Metrics: Add authentication check
DROP POLICY IF EXISTS "System can insert engagement metrics" ON public.engagement_metrics;
CREATE POLICY "Authenticated system can insert engagement metrics" 
ON public.engagement_metrics 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);

-- Family Activity Logs: Add authentication check
DROP POLICY IF EXISTS "System can insert family activity logs" ON public.family_activity_logs;
CREATE POLICY "Authenticated system can insert family activity logs" 
ON public.family_activity_logs 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);

-- Performance Metrics: Add authentication check
DROP POLICY IF EXISTS "System can insert performance metrics" ON public.performance_metrics;
CREATE POLICY "Authenticated system can insert performance metrics" 
ON public.performance_metrics 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);

-- System Alerts: Add authentication check
DROP POLICY IF EXISTS "System can insert alerts" ON public.system_alerts;
CREATE POLICY "Authenticated system can insert alerts" 
ON public.system_alerts 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);

-- System Errors: Add authentication check
DROP POLICY IF EXISTS "System can insert errors" ON public.system_errors;
CREATE POLICY "Authenticated system can insert errors" 
ON public.system_errors 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);

-- User Activity Logs: Add authentication check
DROP POLICY IF EXISTS "System can insert activity logs" ON public.user_activity_logs;
CREATE POLICY "Authenticated system can insert activity logs" 
ON public.user_activity_logs 
FOR INSERT 
WITH CHECK (auth.role() = 'service_role' OR auth.uid() IS NOT NULL);