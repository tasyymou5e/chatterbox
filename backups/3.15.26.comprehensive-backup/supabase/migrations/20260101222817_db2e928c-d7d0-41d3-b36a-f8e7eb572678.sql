-- Fix handle_new_user trigger to not assign parent role for child accounts
-- Child accounts created by parents should get their role from the edge function

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  ) ON CONFLICT (user_id) DO NOTHING;
  
  -- Only auto-assign parent role if:
  -- 1. Not created by admin (created_by_admin = true means admin is handling roles)
  -- 2. Not created by parent for a child (created_by_parent = true means edge function handles roles)
  IF (NEW.raw_user_meta_data->>'created_by_admin')::boolean IS NOT TRUE 
     AND (NEW.raw_user_meta_data->>'created_by_parent')::boolean IS NOT TRUE THEN
    -- Default to parent for self-signup users
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'parent')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;