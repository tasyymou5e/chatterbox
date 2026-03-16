-- PHASE 1: CRITICAL SECURITY FIXES (FIXED VERSION)
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
DROP POLICY IF EXISTS "Users can view their own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;

-- 2. DROP EXISTING POLICIES ON USER_ACTIVITY_LOGS TABLE  
DROP POLICY IF EXISTS "Users can view their own activity logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Admins can view all activity logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "System can insert activity logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Authenticated system can insert activity logs" ON public.user_activity_logs;
DROP POLICY IF EXISTS "Users can view their own activity logs only" ON public.user_activity_logs;

-- 3. DROP EXISTING POLICIES ON SYSTEM_ERRORS TABLE
DROP POLICY IF EXISTS "Admins can view system errors" ON public.system_errors;
DROP POLICY IF EXISTS "System can insert errors" ON public.system_errors;
DROP POLICY IF EXISTS "Admins only can view system errors" ON public.system_errors;
DROP POLICY IF EXISTS "System service can insert errors" ON public.system_errors;
DROP POLICY IF EXISTS "Admins can manage system errors" ON public.system_errors;

-- 4. CREATE CLEAN, SECURE RLS POLICIES FOR PROFILES TABLE
CREATE POLICY "Secure user profile access"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Secure user profile updates"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Secure user profile creation"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Secure user profile deletion"
ON public.profiles
FOR DELETE
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- 5. CREATE SECURE RLS POLICIES FOR USER_ACTIVITY_LOGS TABLE
CREATE POLICY "Secure activity log access"
ON public.user_activity_logs
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Secure activity log insertion"
ON public.user_activity_logs
FOR INSERT
WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));

-- 6. CREATE SECURE RLS POLICIES FOR SYSTEM_ERRORS TABLE
CREATE POLICY "Admin only system error access"
ON public.system_errors
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service role system error insertion"
ON public.system_errors
FOR INSERT
WITH CHECK (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admin system error management"
ON public.system_errors
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));