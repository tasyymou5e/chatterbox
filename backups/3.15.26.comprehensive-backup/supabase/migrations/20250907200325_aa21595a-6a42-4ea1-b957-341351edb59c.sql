-- EMERGENCY SECURITY FIX: Re-apply RLS policies that didn't take effect

-- First, ensure RLS is enabled on all critical tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.child_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies and recreate them properly
DROP POLICY IF EXISTS "Users view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Profiles table - users can only see their own data
CREATE POLICY "Users access own profile only" 
ON public.profiles 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins full access to profiles" 
ON public.profiles 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Child accounts - only family creators and the child can access
DROP POLICY IF EXISTS "Family creators can manage child accounts" ON public.child_accounts;
DROP POLICY IF EXISTS "Children can view their own account record" ON public.child_accounts;
DROP POLICY IF EXISTS "Admins can view all child accounts" ON public.child_accounts;

CREATE POLICY "Child accounts restricted access" 
ON public.child_accounts 
FOR ALL 
USING (
  (auth.uid() = user_id) OR 
  (has_role(auth.uid(), 'parent'::app_role) AND EXISTS (
    SELECT 1 FROM public.families f 
    WHERE f.id = child_accounts.family_id AND f.created_by = auth.uid()
  )) OR
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (auth.uid() = user_id) OR 
  (has_role(auth.uid(), 'parent'::app_role) AND EXISTS (
    SELECT 1 FROM public.families f 
    WHERE f.id = child_accounts.family_id AND f.created_by = auth.uid()
  )) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- Families table - only creators, members, and admins
DROP POLICY IF EXISTS "Parents can view families they created" ON public.families;
DROP POLICY IF EXISTS "Parents can update their families" ON public.families;
DROP POLICY IF EXISTS "Parents can create families" ON public.families;

CREATE POLICY "Families restricted access" 
ON public.families 
FOR ALL 
USING (
  (auth.uid() = created_by) OR
  is_family_member(id, auth.uid()) OR
  has_role(auth.uid(), 'admin'::app_role)
)
WITH CHECK (
  (auth.uid() = created_by) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- System errors - admins only
CREATE POLICY "System errors admin only" 
ON public.system_errors 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admin audit logs - admins only  
CREATE POLICY "Admin audit logs admin only" 
ON public.admin_audit_logs 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Log this critical security enforcement
INSERT INTO public.security_audit_logs (
  user_id, event_type, severity, event_details
) VALUES (
  auth.uid(),
  'emergency_security_fix',
  'critical',
  jsonb_build_object(
    'action', 'rls_policies_enforced',
    'tables_secured', ARRAY['profiles', 'child_accounts', 'families', 'system_errors', 'admin_audit_logs'],
    'timestamp', now(),
    'reason', 'critical_vulnerabilities_detected'
  )
);