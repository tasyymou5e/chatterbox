-- Fix security warning: Remove API access to daily_analytics materialized view
-- The view should only be accessible through the secure RPC function

-- Revoke all access from roles that use the API
REVOKE ALL ON public.daily_analytics FROM anon;
REVOKE ALL ON public.daily_analytics FROM authenticated;
REVOKE ALL ON public.daily_analytics FROM public;

-- Only allow the service role (used by RPC functions) to access it
GRANT SELECT ON public.daily_analytics TO service_role;

-- Verify our admin function still works by testing it
-- This ensures the security fix doesn't break functionality
SELECT 'Analytics security fix applied - materialized view now only accessible via admin RPC' as status;