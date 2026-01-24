-- Fix existing parents without families (one-time data repair)
DO $$
DECLARE
  orphan_user RECORD;
  new_family_id UUID;
  family_code TEXT;
  user_profile RECORD;
  user_email TEXT;
BEGIN
  FOR orphan_user IN 
    SELECT ur.user_id
    FROM public.user_roles ur
    LEFT JOIN public.family_members fm ON fm.user_id = ur.user_id
    WHERE ur.role = 'parent' AND fm.id IS NULL
  LOOP
    -- Get profile info
    SELECT first_name INTO user_profile
    FROM public.profiles WHERE user_id = orphan_user.user_id;
    
    -- Get email for fallback
    SELECT email INTO user_email
    FROM auth.users WHERE id = orphan_user.user_id;
    
    -- Generate family code using existing function
    family_code := public.generate_family_code();
    
    -- Create family
    INSERT INTO public.families (name, display_name, created_by, family_code, metadata)
    VALUES (
      COALESCE(user_profile.first_name, split_part(user_email, '@', 1), 'My') || '''s Family (' || family_code || ')',
      COALESCE(user_profile.first_name, split_part(user_email, '@', 1), 'My') || '''s Family',
      orphan_user.user_id,
      family_code,
      jsonb_build_object('auto_created', true, 'created_reason', 'migration_repair', 'created_at', now()::text)
    ) RETURNING id INTO new_family_id;
    
    -- Add member
    INSERT INTO public.family_members (family_id, user_id, role, joined_at, connection_metadata)
    VALUES (
      new_family_id, 
      orphan_user.user_id, 
      'parent',
      now(),
      jsonb_build_object('auto_joined', true, 'is_creator', true)
    );
    
    RAISE NOTICE 'Created family % for user %', family_code, orphan_user.user_id;
  END LOOP;
END $$;