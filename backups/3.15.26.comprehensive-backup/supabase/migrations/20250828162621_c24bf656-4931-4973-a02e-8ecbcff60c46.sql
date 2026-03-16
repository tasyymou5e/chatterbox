-- Fix search_path security issue for generate_family_code function
CREATE OR REPLACE FUNCTION public.generate_family_code()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  family_code TEXT;
BEGIN
  -- Get current year
  current_year := EXTRACT(YEAR FROM NOW())::TEXT;
  
  -- Get the next number for this year
  SELECT COALESCE(MAX(
    CASE 
      WHEN family_code LIKE 'FAM-' || current_year || '-%' 
      THEN CAST(SPLIT_PART(family_code, '-', 3) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM public.families
  WHERE family_code IS NOT NULL;
  
  -- Format the family code
  family_code := 'FAM-' || current_year || '-' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN family_code;
END;
$function$;

-- Fix search_path security issue for has_role function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$function$;