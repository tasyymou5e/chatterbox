-- Drop duplicate index on families table (keep the unique constraint index)
DROP INDEX IF EXISTS public.idx_families_family_code;