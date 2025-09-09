-- PHASE 1: CRITICAL SECURITY FIXES
-- Fix profiles table RLS policies and secure other sensitive tables

-- 1. DROP ALL EXISTING CONFLICTING POLICIES ON PROFILES TABLE
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles; 
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Profile access for authenticated users" ON public.profiles;
DROP POLICY IF EXISTS "Secure profile access" ON public.profiles;
DROP POLICY IF EXISTS "Enhanced profile security" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to view their own profile" ON public.profiles;

-- 2. CREATE CLEAN, SECURE RLS POLICIES FOR PROFILES TABLE
CREATE POLICY "Users can view their own profile only"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile only"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile only"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all profiles"
ON public.profiles
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. SECURE USER_ACTIVITY_LOGS TABLE
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "System can insert activity logs" ON public.user_activity_logs;

CREATE POLICY "Users can view their own activity logs only"
ON public.user_activity_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all activity logs"
ON public.user_activity_logs
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated system can insert activity logs"
ON public.user_activity_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

-- 4. SECURE SYSTEM_ERRORS TABLE
DROP POLICY IF EXISTS "Admins can view system errors" ON public.system_errors;
DROP POLICY IF EXISTS "System can insert errors" ON public.system_errors;

CREATE POLICY "Admins only can view system errors"
ON public.system_errors
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System service can insert errors"
ON public.system_errors
FOR INSERT
WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can manage system errors"
ON public.system_errors
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 5. UPDATE DATABASE FUNCTIONS TO PREVENT SQL INJECTION
-- Add SET search_path = 'public' to functions that don't have it

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
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_family_creator(family_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.families 
    WHERE id = family_id_param 
    AND created_by = user_id_param
  );
$$;

CREATE OR REPLACE FUNCTION public.is_family_member(family_id_param uuid, user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE 
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_members 
    WHERE family_id = family_id_param 
    AND user_id = user_id_param
  );
$$;

-- 6. ENHANCE NULL HANDLING IN EXISTING FUNCTIONS
CREATE OR REPLACE FUNCTION public.log_family_access(p_user_id uuid, p_family_id uuid, p_access_type text, p_success boolean, p_details jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only log if user_id is not null (authenticated context)
  IF p_user_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.security_audit_logs (
        user_id, 
        event_type, 
        severity,
        event_details
      ) VALUES (
        p_user_id,
        'family_access_attempt',
        CASE WHEN p_success THEN 'low' ELSE 'high' END,
        jsonb_build_object(
          'family_id', p_family_id,
          'access_type', p_access_type,
          'success', p_success,
          'timestamp', now(),
          'details', p_details
        )
      );
    EXCEPTION
      WHEN OTHERS THEN
        -- Silently ignore INSERT errors in read-only contexts
        NULL;
    END;
  END IF;
END;
$$;

-- 7. CREATE SECURE TEST FUNCTION FOR PROFILES ACCESS
CREATE OR REPLACE FUNCTION public.test_profiles_security()
RETURNS TABLE(
  test_name text,
  passed boolean,
  details text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Test 1: Authenticated user can only see their own profile
  RETURN QUERY
  SELECT 
    'Own Profile Access'::text,
    (SELECT COUNT(*) FROM public.profiles WHERE user_id = auth.uid()) > 0,
    'User should see their own profile'::text;
    
  -- Test 2: User cannot see other profiles (this should return 0 for non-admins)
  RETURN QUERY
  SELECT 
    'Other Profile Access'::text,
    CASE 
      WHEN has_role(auth.uid(), 'admin'::app_role) THEN true
      ELSE (SELECT COUNT(*) FROM public.profiles WHERE user_id != auth.uid()) = 0
    END,
    'Non-admin users should not see other profiles'::text;
END;
$$;