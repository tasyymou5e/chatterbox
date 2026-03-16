-- CRITICAL SECURITY HARDENING - Fix Cross-Account Access Vulnerabilities
-- Phase 1: Immediate RLS Policy Fixes

-- ========================================
-- 1. FIX PROFILES TABLE SECURITY
-- ========================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "profiles_select_own_or_admin" ON public.profiles;

-- Create strict user-only + admin access policy
CREATE POLICY "profiles_select_strict_access" 
ON public.profiles 
FOR SELECT 
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

-- ========================================
-- 2. FIX FAMILY MEMBERS TABLE SECURITY  
-- ========================================

-- Drop existing policy and create stricter version
DROP POLICY IF EXISTS "Secure family members access" ON public.family_members;

-- Create policy that requires actual family membership
CREATE POLICY "family_members_strict_access" 
ON public.family_members 
FOR SELECT 
USING (
  -- User is a member of this family OR admin
  (EXISTS (
    SELECT 1 FROM public.family_members fm2 
    WHERE fm2.family_id = family_members.family_id 
    AND fm2.user_id = auth.uid()
  )) 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- ========================================
-- 3. FIX CHILD ACCOUNTS SECURITY
-- ========================================

-- Drop existing policy and create parent-only access
DROP POLICY IF EXISTS "Secure child account access" ON public.child_accounts;

-- Create strict parent + admin only access
CREATE POLICY "child_accounts_parent_admin_only" 
ON public.child_accounts 
FOR ALL 
USING (
  -- Only parent creators and admins can access
  (has_role(auth.uid(), 'parent'::app_role) AND created_by = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (user_id IS NOT NULL AND auth.uid() = user_id)
)
WITH CHECK (
  -- Same restrictions for modifications
  (has_role(auth.uid(), 'parent'::app_role) AND created_by = auth.uid()) 
  OR has_role(auth.uid(), 'admin'::app_role)
  OR (user_id IS NOT NULL AND auth.uid() = user_id AND status = 'pending'::text)
);

-- ========================================
-- 4. FIX BEHAVIORAL DATA PRIVACY
-- ========================================

-- Drop existing policies and create user + admin only
DROP POLICY IF EXISTS "Private behavioral data access" ON public.behavioral_events;
DROP POLICY IF EXISTS "Users can log their own behavior" ON public.behavioral_events;

-- Create strict user + admin only policies
CREATE POLICY "behavioral_events_user_admin_only_select" 
ON public.behavioral_events 
FOR SELECT 
USING ((user_id = auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "behavioral_events_user_only_insert" 
ON public.behavioral_events 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

-- ========================================
-- 5. FIX USER ACTIVITY LOGS SECURITY
-- ========================================

-- Ensure activity logs are strictly user + admin only
DROP POLICY IF EXISTS "activity_logs_select_own_or_admin" ON public.user_activity_logs;

CREATE POLICY "activity_logs_strict_user_admin_access" 
ON public.user_activity_logs 
FOR SELECT 
USING ((auth.uid() = user_id) OR has_role(auth.uid(), 'admin'::app_role));

-- ========================================
-- 6. FIX USER PRIVACY SETTINGS SECURITY
-- ========================================

-- Ensure privacy settings are strictly user-only (except admin view)
DROP POLICY IF EXISTS "Users can manage their own privacy settings" ON public.user_privacy_settings;
DROP POLICY IF EXISTS "Admins can view all privacy settings" ON public.user_privacy_settings;

-- Create strict user-only management policy
CREATE POLICY "privacy_settings_user_only_manage" 
ON public.user_privacy_settings 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Admin view-only policy (no modification allowed)
CREATE POLICY "privacy_settings_admin_view_only" 
ON public.user_privacy_settings 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- ========================================
-- 7. STRENGTHEN ENGAGEMENT METRICS SECURITY
-- ========================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Users can view their own engagement metrics" ON public.engagement_metrics;
DROP POLICY IF EXISTS "Parents can view their family members' engagement metrics" ON public.engagement_metrics;

-- Create strict user + family parent + admin access
CREATE POLICY "engagement_metrics_strict_access" 
ON public.engagement_metrics 
FOR SELECT 
USING (
  -- User can see their own metrics
  (auth.uid() = user_id) 
  OR 
  -- Parents can see their family members' metrics
  (has_role(auth.uid(), 'parent'::app_role) AND 
   EXISTS (
     SELECT 1 FROM public.families f 
     JOIN public.family_members fm ON f.id = fm.family_id 
     WHERE f.created_by = auth.uid() 
     AND fm.user_id = engagement_metrics.user_id
     AND fm.family_id = engagement_metrics.family_id
   ))
  OR 
  -- Admins can view all
  has_role(auth.uid(), 'admin'::app_role)
);

-- ========================================
-- 8. SECURITY AUDIT LOGGING
-- ========================================

-- Log this security hardening event
INSERT INTO public.security_audit_logs (
  user_id,
  event_type,
  severity,
  event_details
) VALUES (
  auth.uid(),
  'security_hardening_applied',
  'critical',
  jsonb_build_object(
    'action', 'rls_policy_hardening',
    'tables_updated', jsonb_build_array(
      'profiles', 'family_members', 'child_accounts', 
      'behavioral_events', 'user_activity_logs', 
      'user_privacy_settings', 'engagement_metrics'
    ),
    'vulnerability_fixes', jsonb_build_array(
      'cross_account_profile_access',
      'unauthorized_family_data_access',
      'child_account_exposure',
      'behavioral_data_leakage',
      'activity_log_exposure'
    ),
    'timestamp', now()
  )
);