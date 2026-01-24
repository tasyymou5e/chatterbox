-- RPC function to find duplicate family memberships
CREATE OR REPLACE FUNCTION public.find_duplicate_family_memberships()
RETURNS TABLE(user_id UUID, family_id UUID, count BIGINT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT fm.user_id, fm.family_id, COUNT(*) as count
  FROM family_members fm
  GROUP BY fm.user_id, fm.family_id
  HAVING COUNT(*) > 1;
$$;

-- Grant execute to service role only
REVOKE ALL ON FUNCTION public.find_duplicate_family_memberships() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_duplicate_family_memberships() TO service_role;