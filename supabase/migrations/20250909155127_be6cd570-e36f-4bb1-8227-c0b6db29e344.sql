-- CRITICAL SECURITY FIXES: Clean Database Policies
-- Drop all existing conflicting policies and create secure ones

-- 1. DROP ALL EXISTING POLICIES ON PROFILES TABLE
DROP POLICY IF EXISTS "Admins have full profile access" ON public.profiles;
DROP POLICY IF EXISTS "Secure user profile access" ON public.profiles;
DROP POLICY IF EXISTS "Secure user profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Secure user profile updates" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile only" ON public.profiles;
DROP POLICY IF EXISTS "admin_access_with_auth_check" ON public.profiles;
DROP POLICY IF EXISTS "users_insert_own_profile" ON public.profiles;
DROP POLICY IF EXISTS "users_own_profile_only" ON public.profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.profiles;

-- 2. DROP ALL EXISTING POLICIES ON SYSTEM_ERRORS TABLE
DROP POLICY IF EXISTS "Admins can update system errors" ON public.system_errors;
DROP POLICY IF EXISTS "Admins can view all system errors" ON public.system_errors;
DROP POLICY IF EXISTS "Admins can view system errors" ON public.system_errors;
DROP POLICY IF EXISTS "Authenticated system can insert errors" ON public.system_errors;
DROP POLICY IF EXISTS "Service role only error insertion" ON public.system_errors;
DROP POLICY IF EXISTS "System errors admin only" ON public.system_errors;

-- 3. DROP ALL EXISTING POLICIES ON USER_ACTIVITY_LOGS TABLE
DROP POLICY IF EXISTS "Admins can view activity logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Admins can view activity logs for monitoring" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Authenticated system can insert activity logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Parents can view family activity logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Parents can view their children's activity logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "System can log activity" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Users can view own activity logs" ON public.user_activity_logs;

-- 4. CREATE CLEAN, SECURE PROFILES TABLE POLICIES
CREATE POLICY "profiles_select_own_or_admin"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "profiles_insert_own_only"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_own_or_admin"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "profiles_delete_admin_only"
ON public.profiles
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 5. CREATE CLEAN, SECURE SYSTEM_ERRORS TABLE POLICIES
CREATE POLICY "system_errors_admin_select"
ON public.system_errors
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "system_errors_service_insert"
ON public.system_errors
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "system_errors_admin_manage"
ON public.system_errors
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 6. CREATE CLEAN, SECURE USER_ACTIVITY_LOGS TABLE POLICIES
CREATE POLICY "activity_logs_select_own_or_admin"
ON public.user_activity_logs
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "activity_logs_insert_authenticated"
ON public.user_activity_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- 7. UPDATE SECURITY FUNCTIONS WITH SET SEARCH_PATH
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;