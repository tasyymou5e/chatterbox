-- Create missing profile entry and enhanced logging

-- Insert missing profile for papabear@wccgroup.net
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
        ON CONFLICT (user_id) DO UPDATE SET
            first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            display_name = EXCLUDED.display_name,
            updated_at = now();
        
        -- Ensure user has parent role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'parent'::public.app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
        
        RAISE NOTICE 'Profile and role created/updated for papabear@wccgroup.net';
    ELSE
        RAISE NOTICE 'User papabear@wccgroup.net not found in auth.users';
    END IF;
END $$;