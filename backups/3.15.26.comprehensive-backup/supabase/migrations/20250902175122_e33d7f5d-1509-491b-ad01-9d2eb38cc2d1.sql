-- Phase 1: Critical Security - Enhanced RLS Policies for Customer Data Protection

-- Enhanced RLS for user_activity_logs - more restrictive access
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.user_activity_logs;
CREATE POLICY "Users can view their own activity logs" 
ON public.user_activity_logs 
FOR SELECT 
USING (auth.uid() = user_id);

-- Enhanced RLS for profiles - restrict sensitive data access
DROP POLICY IF EXISTS "Connected users can view basic family member profiles" ON public.profiles;
CREATE POLICY "Connected users can view basic family member profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM family_connections fc 
    WHERE fc.connected_user_id = auth.uid() 
    AND fc.status = 'accepted' 
    AND has_connection_permission(fc.family_id, auth.uid(), 'can_view_progress')
    AND EXISTS (
      SELECT 1 FROM family_members fm 
      WHERE fm.family_id = fc.family_id 
      AND fm.user_id = profiles.user_id
    )
  )
);

-- Enhanced family access control
DROP POLICY IF EXISTS "Parents can view families they created" ON public.families;
CREATE POLICY "Parents can view families they created" 
ON public.families 
FOR SELECT 
USING (
  auth.uid() = created_by 
  AND has_role(auth.uid(), 'parent'::app_role)
);

-- Add policy to prevent unauthorized access to family codes
CREATE POLICY "Family codes are private to creators" 
ON public.families 
FOR SELECT 
USING (
  auth.uid() = created_by 
  OR is_family_member(id, auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Restrict user_activity_logs further for sensitive operations
CREATE POLICY "Admins can view activity logs for monitoring" 
ON public.user_activity_logs 
FOR SELECT 
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND activity_type IN ('login', 'signup', 'critical_error', 'security_violation')
);

-- Enhanced system_errors access control
DROP POLICY IF EXISTS "Authenticated system can insert errors" ON public.system_errors;
CREATE POLICY "Authenticated system can insert errors" 
ON public.system_errors 
FOR INSERT 
WITH CHECK (
  auth.role() = 'service_role' 
  OR (auth.uid() IS NOT NULL AND user_id = auth.uid())
);