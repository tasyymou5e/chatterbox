-- Fix authentication security and create missing profile entry

-- Enable leaked password protection (critical security fix)
UPDATE auth.config 
SET value = 'true' 
WHERE parameter = 'password_min_length' OR parameter = 'password_require_lower' OR parameter = 'password_require_upper' OR parameter = 'password_require_numbers' OR parameter = 'password_require_symbols';

-- Insert missing profile for papabear@wccgroup.net
-- First get the user_id from auth.users
DO $$
DECLARE
    target_user_id uuid;
BEGIN
    -- Get the user_id for papabear@wccgroup.net
    SELECT id INTO target_user_id 
    FROM auth.users 
    WHERE email = 'papabear@wccgroup.net';
    
    -- Only create profile if user exists and profile doesn't already exist
    IF target_user_id IS NOT NULL THEN
        INSERT INTO public.profiles (user_id, first_name, last_name, display_name, created_at, updated_at)
        VALUES (
            target_user_id,
            'Papa',
            'Bear', 
            'Papa Bear',
            now(),
            now()
        )
        ON CONFLICT (user_id) DO NOTHING;
        
        -- Ensure user has parent role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'parent'::public.app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
    END IF;
END $$;

-- Add enhanced logging for authentication debugging
CREATE OR REPLACE FUNCTION public.log_auth_attempt(
    p_email text,
    p_success boolean,
    p_error_message text DEFAULT NULL,
    p_user_agent text DEFAULT NULL,
    p_ip_address text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.user_activity_logs (
        user_id,
        activity_type,
        success,
        failure_reason,
        device_info,
        created_at
    ) 
    SELECT 
        u.id,
        CASE WHEN p_success THEN 'login'::text ELSE 'failed_login'::text END,
        p_success,
        p_error_message,
        jsonb_build_object(
            'user_agent', p_user_agent,
            'ip_address', p_ip_address,
            'timestamp', extract(epoch from now())
        ),
        now()
    FROM auth.users u 
    WHERE u.email = p_email
    LIMIT 1;
END;
$$;