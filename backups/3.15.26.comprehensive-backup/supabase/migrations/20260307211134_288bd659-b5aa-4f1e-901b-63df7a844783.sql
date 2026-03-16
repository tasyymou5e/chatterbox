-- Fix signup 500 error: remove the trigger that causes FK race condition
DROP TRIGGER IF EXISTS on_auth_user_activity ON auth.users;
DROP FUNCTION IF EXISTS public.log_auth_event();