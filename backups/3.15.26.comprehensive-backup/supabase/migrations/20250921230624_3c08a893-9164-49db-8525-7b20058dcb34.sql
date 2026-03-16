-- Update RLS policies to allow read_only users SELECT access to admin tables

-- Update system_errors SELECT policy
DROP POLICY IF EXISTS "system_errors_admin_select" ON public.system_errors;
CREATE POLICY "system_errors_admin_select" 
ON public.system_errors 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'read_only'::app_role));

-- Update security_audit_logs SELECT policy  
DROP POLICY IF EXISTS "Admins can view security audit logs" ON public.security_audit_logs;
CREATE POLICY "Admins can view security audit logs" 
ON public.security_audit_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'read_only'::app_role));

-- Update analytics_metrics SELECT policies
DROP POLICY IF EXISTS "Admins can view all analytics metrics" ON public.analytics_metrics;
CREATE POLICY "Admins can view all analytics metrics" 
ON public.analytics_metrics 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'read_only'::app_role));

DROP POLICY IF EXISTS "Only admins can view analytics metrics" ON public.analytics_metrics;
CREATE POLICY "Only admins can view analytics metrics" 
ON public.analytics_metrics 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'read_only'::app_role));

-- Update admin_audit_logs SELECT policy
DROP POLICY IF EXISTS "Admin audit logs admin only" ON public.admin_audit_logs;
CREATE POLICY "Admin audit logs admin only" 
ON public.admin_audit_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'read_only'::app_role));

-- Update user_activity_logs SELECT policy for admin access
DROP POLICY IF EXISTS "activity_logs_strict_user_admin_access" ON public.user_activity_logs;
CREATE POLICY "activity_logs_strict_user_admin_access" 
ON public.user_activity_logs 
FOR SELECT 
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'read_only'::app_role));

-- Update archived_system_errors SELECT policy
DROP POLICY IF EXISTS "Admins can view archived errors" ON public.archived_system_errors;
CREATE POLICY "Admins can view archived errors" 
ON public.archived_system_errors 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'read_only'::app_role));

-- Update archived_user_activity_logs SELECT policy
DROP POLICY IF EXISTS "Admins can view archived logs" ON public.archived_user_activity_logs;
CREATE POLICY "Admins can view archived logs" 
ON public.archived_user_activity_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'read_only'::app_role));

-- Update performance_metrics SELECT policy
DROP POLICY IF EXISTS "Admins can view performance metrics" ON public.performance_metrics;
CREATE POLICY "Admins can view performance metrics" 
ON public.performance_metrics 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'read_only'::app_role));

-- Update error_patterns SELECT policy
DROP POLICY IF EXISTS "Admins can view error patterns" ON public.error_patterns;
CREATE POLICY "Admins can view error patterns" 
ON public.error_patterns 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'read_only'::app_role));