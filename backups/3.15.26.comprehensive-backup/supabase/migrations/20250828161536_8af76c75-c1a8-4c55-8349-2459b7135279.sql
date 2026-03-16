-- Add family_code and display_name columns to families table
ALTER TABLE public.families 
ADD COLUMN family_code TEXT UNIQUE,
ADD COLUMN display_name TEXT;

-- Create unique index for family_code
CREATE UNIQUE INDEX idx_families_family_code ON public.families(family_code);

-- Create function to generate family codes
CREATE OR REPLACE FUNCTION public.generate_family_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
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
$$;

-- Update existing families to have family codes and display names
UPDATE public.families 
SET 
  family_code = public.generate_family_code(),
  display_name = name
WHERE family_code IS NULL;

-- Make family_code and display_name required for new records
ALTER TABLE public.families 
ALTER COLUMN family_code SET NOT NULL,
ALTER COLUMN display_name SET NOT NULL;