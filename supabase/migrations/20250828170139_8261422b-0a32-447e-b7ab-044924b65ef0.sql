-- Fix the generate_family_code function to avoid column ambiguity
CREATE OR REPLACE FUNCTION public.generate_family_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  current_year TEXT;
  next_number INTEGER;
  new_family_code TEXT;
BEGIN
  -- Get current year
  current_year := EXTRACT(YEAR FROM NOW())::TEXT;
  
  -- Get the next number for this year using explicit table alias
  SELECT COALESCE(MAX(
    CASE 
      WHEN f.family_code LIKE 'FAM-' || current_year || '-%' 
      THEN CAST(SPLIT_PART(f.family_code, '-', 3) AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO next_number
  FROM public.families f
  WHERE f.family_code IS NOT NULL;
  
  -- Format the family code
  new_family_code := 'FAM-' || current_year || '-' || LPAD(next_number::TEXT, 3, '0');
  
  RETURN new_family_code;
END;
$function$