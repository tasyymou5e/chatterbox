-- Fix SECURITY DEFINER view issue by converting to RLS-protected table access
-- Drop the view and use RLS policies instead

DROP VIEW IF EXISTS public.child_accounts_self_view;

-- The RLS policy on child_accounts already handles this:
-- "child_accounts_select_own" allows: user_id = auth.uid() AND status = 'completed'
-- But it includes generated_email, so we need a separate approach

-- Create a function that returns safe child account data for the current user
CREATE OR REPLACE FUNCTION public.get_my_child_account_safe()
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  family_id UUID,
  family_code TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ca.id,
    ca.first_name,
    ca.last_name,
    ca.family_id,
    ca.family_code,
    ca.status,
    ca.created_at,
    ca.completed_at
  FROM child_accounts ca
  WHERE ca.user_id = auth.uid()
    AND ca.status = 'completed';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_my_child_account_safe TO authenticated;

COMMENT ON FUNCTION public.get_my_child_account_safe IS 
'Returns the current user child account info WITHOUT generated_email. Safe for client-side use.';