-- CRITICAL SECURITY FIX: Enable proper RLS policies for exposed tables

-- Fix profiles table RLS - restrict to user's own data only
DROP POLICY IF EXISTS "Users view their own profile" ON public.profiles;
CREATE POLICY "Users view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update their own profile" ON public.profiles;
CREATE POLICY "Users update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix child_accounts table RLS - only family creators and the child can access
DROP POLICY IF EXISTS "Family creators can manage child accounts" ON public.child_accounts;
CREATE POLICY "Family creators can manage child accounts" 
ON public.child_accounts 
FOR ALL 
USING (
  has_role(auth.uid(), 'parent'::app_role) AND 
  EXISTS (
    SELECT 1 FROM public.families f 
    WHERE f.id = child_accounts.family_id AND f.created_by = auth.uid()
  )
);

DROP POLICY IF EXISTS "Children can view their own account record" ON public.child_accounts;
CREATE POLICY "Children can view their own account record" 
ON public.child_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can view all child accounts" ON public.child_accounts;
CREATE POLICY "Admins can view all child accounts" 
ON public.child_accounts 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Fix families table RLS - only family creators and members can access
DROP POLICY IF EXISTS "Parents can view families they created" ON public.families;
CREATE POLICY "Parents can view families they created" 
ON public.families 
FOR SELECT 
USING (
  (auth.uid() = created_by AND has_role(auth.uid(), 'parent'::app_role)) OR
  is_family_member(id, auth.uid()) OR
  has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS "Parents can update their families" ON public.families;
CREATE POLICY "Parents can update their families" 
ON public.families 
FOR UPDATE 
USING (auth.uid() = created_by AND has_role(auth.uid(), 'parent'::app_role));

DROP POLICY IF EXISTS "Parents can create families" ON public.families;
CREATE POLICY "Parents can create families" 
ON public.families 
FOR INSERT 
WITH CHECK (auth.uid() = created_by AND has_role(auth.uid(), 'parent'::app_role));

-- Ensure system tables require authentication
DROP POLICY IF EXISTS "Authenticated users can view active achievements" ON public.achievements;
CREATE POLICY "Authenticated users can view active achievements" 
ON public.achievements 
FOR SELECT 
USING (is_active = true AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can view active chore categories" ON public.chore_categories;
CREATE POLICY "Authenticated users can view active chore categories" 
ON public.chore_categories 
FOR SELECT 
USING (is_active = true AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can view active chore templates" ON public.chore_templates;
CREATE POLICY "Authenticated users can view active chore templates" 
ON public.chore_templates 
FOR SELECT 
USING (is_active = true AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can view active categories" ON public.content_categories;
CREATE POLICY "Authenticated users can view active categories" 
ON public.content_categories 
FOR SELECT 
USING (is_active = true AND auth.uid() IS NOT NULL);

-- Log this critical security fix
INSERT INTO public.security_audit_logs (
  user_id, event_type, severity, event_details
) VALUES (
  auth.uid(),
  'critical_security_fix',
  'critical',
  jsonb_build_object(
    'action', 'rls_policies_hardened',
    'tables_secured', ARRAY['profiles', 'child_accounts', 'families', 'achievements', 'chore_categories', 'chore_templates', 'content_categories'],
    'timestamp', now(),
    'automated_fix', true
  )
);