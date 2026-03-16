-- Fix the broken notadmin@chatterbox.life account
-- Remove incorrect parent role and assign correct read_only role

-- Get the user_id first
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Get the user_id for notadmin@chatterbox.life
    SELECT user_id INTO target_user_id 
    FROM public.profiles 
    WHERE email = 'notadmin@chatterbox.life';
    
    IF target_user_id IS NOT NULL THEN
        -- Remove the incorrect parent role
        DELETE FROM public.user_roles 
        WHERE user_id = target_user_id AND role = 'parent';
        
        -- Add the correct read_only role
        INSERT INTO public.user_roles (user_id, role)
        VALUES (target_user_id, 'read_only')
        ON CONFLICT (user_id, role) DO NOTHING;
        
        -- Log the fix
        RAISE NOTICE 'Fixed user roles for notadmin@chatterbox.life: removed parent, added read_only';
    ELSE
        RAISE NOTICE 'User notadmin@chatterbox.life not found';
    END IF;
END $$;