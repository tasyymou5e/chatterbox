-- Optimize RLS policies on user_roles table by wrapping auth.uid() in subqueries
-- This ensures auth.uid() is evaluated once per query instead of per row

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Allow bootstrap admin creation and admin role management" ON public.user_roles;

-- Recreate policies with optimized auth.uid() calls

-- Users can view their own roles (optimized)
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING ((select auth.uid()) = user_id);

-- Admins can view all user roles (optimized)
CREATE POLICY "Admins can view all user roles"
ON public.user_roles FOR SELECT
USING (has_role((select auth.uid()), 'admin'::app_role));

-- Admins can update user roles (optimized)
CREATE POLICY "Admins can update user roles"
ON public.user_roles FOR UPDATE
USING (has_role((select auth.uid()), 'admin'::app_role))
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

-- Admins can delete user roles (optimized)
CREATE POLICY "Admins can delete user roles"
ON public.user_roles FOR DELETE
USING (has_role((select auth.uid()), 'admin'::app_role));

-- Allow bootstrap admin creation and admin role management (optimized)
CREATE POLICY "Allow bootstrap admin creation and admin role management"
ON public.user_roles FOR INSERT
WITH CHECK (
  (NOT EXISTS (SELECT 1 FROM user_roles WHERE role = 'admin'::app_role))
  OR has_role((select auth.uid()), 'admin'::app_role)
);