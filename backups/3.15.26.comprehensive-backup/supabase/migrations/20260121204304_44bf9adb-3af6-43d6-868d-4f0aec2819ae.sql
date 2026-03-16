-- Drop the child_accounts_safe view to prevent unauthorized access
-- This view had no RLS policies and could expose child account data
DROP VIEW IF EXISTS public.child_accounts_safe;