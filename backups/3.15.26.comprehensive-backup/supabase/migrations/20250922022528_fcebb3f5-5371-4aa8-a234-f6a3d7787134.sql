-- Fix handle_new_user trigger to prevent conflicts with admin-created users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert into profiles with conflict handling
  INSERT INTO public.profiles (user_id, first_name, last_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email
  ) ON CONFLICT (user_id) DO NOTHING;
  
  -- Only assign parent role if not created by admin
  -- Admin-created users will have their roles assigned by the edge function
  IF (NEW.raw_user_meta_data->>'created_by_admin')::boolean IS NOT TRUE THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'parent')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;