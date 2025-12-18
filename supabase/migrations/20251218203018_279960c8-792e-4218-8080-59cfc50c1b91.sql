-- Phase 5: Final RLS and Index Cleanup
-- Fix remaining duplicate policies on: content_items, site_settings, user_roles, user_sessions
-- Remove duplicate indexes on: family_members, user_activity_logs, user_roles

-- ============================================
-- 1. content_items - consolidate SELECT policies
-- ============================================
DROP POLICY IF EXISTS "Anonymous users can view basic catalog info only" ON public.content_items;
DROP POLICY IF EXISTS "content_items_admin" ON public.content_items;
DROP POLICY IF EXISTS "content_items_authenticated_view" ON public.content_items;

-- Single RESTRICTIVE policy for admin
CREATE POLICY "content_items_admin_all"
ON public.content_items
AS RESTRICTIVE
FOR ALL
USING (has_role((SELECT auth.uid()), 'admin'::app_role));

-- Single RESTRICTIVE policy for public/authenticated SELECT
CREATE POLICY "content_items_public_select"
ON public.content_items
AS RESTRICTIVE
FOR SELECT
USING (
  (is_active = true AND approval_status = 'approved'::approval_status)
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
);

-- ============================================
-- 2. site_settings - consolidate SELECT policies
-- ============================================
DROP POLICY IF EXISTS "Allow anonymous read for public site settings" ON public.site_settings;
DROP POLICY IF EXISTS "site_settings_access" ON public.site_settings;

-- site_settings: allow all to read, only admins to modify
CREATE POLICY "site_settings_unified"
ON public.site_settings
AS RESTRICTIVE
FOR ALL
USING (true)
WITH CHECK (
  has_role((SELECT auth.uid()), 'admin'::app_role)
);

-- ============================================
-- 3. user_roles - consolidate INSERT and SELECT policies
-- ============================================
DROP POLICY IF EXISTS "Allow bootstrap admin creation and admin role management" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_user_select" ON public.user_roles;

CREATE POLICY "user_roles_unified"
ON public.user_roles
AS RESTRICTIVE
FOR ALL
USING (
  -- Users can see their own roles
  (user_id = (SELECT auth.uid()))
  -- Admins can see all
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
)
WITH CHECK (
  -- Only admins can insert/update/delete
  has_role((SELECT auth.uid()), 'admin'::app_role)
  -- Or bootstrap: no existing admin and inserting admin role for self
  OR (
    NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role = 'admin'::app_role)
    AND user_id = (SELECT auth.uid())
    AND role = 'admin'::app_role
  )
);

-- ============================================
-- 4. user_sessions - consolidate SELECT policies
-- ============================================
DROP POLICY IF EXISTS "user_sessions_all" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_select" ON public.user_sessions;
DROP POLICY IF EXISTS "user_sessions_access" ON public.user_sessions;

CREATE POLICY "user_sessions_unified"
ON public.user_sessions
AS RESTRICTIVE
FOR ALL
USING (
  ((SELECT auth.role()) = 'service_role'::text)
  OR (user_id = (SELECT auth.uid()))
  OR has_role((SELECT auth.uid()), 'admin'::app_role)
)
WITH CHECK (
  ((SELECT auth.role()) = 'service_role'::text)
  OR (user_id = (SELECT auth.uid()))
);

-- ============================================
-- 5. Remove duplicate indexes
-- ============================================

-- family_members: keep idx_family_members_family_id_role, drop the other
DROP INDEX IF EXISTS public.idx_family_members_family_role;

-- user_activity_logs: keep idx_user_activity_logs_user_id_created_at (more descriptive), drop the other
DROP INDEX IF EXISTS public.idx_user_activity_logs_user_date;

-- user_roles: drop the duplicate CONSTRAINT (not index), keep user_roles_user_id_role_key
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_role_unique;