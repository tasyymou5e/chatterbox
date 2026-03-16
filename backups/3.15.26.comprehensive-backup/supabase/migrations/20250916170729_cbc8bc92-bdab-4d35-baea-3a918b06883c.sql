-- 1) Ensure the helper function is available and executable without causing recursion
DO $$
BEGIN
  -- Grant execute on existing helper if present
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_family_member(uuid, uuid) TO authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_family_member(uuid, uuid) TO anon';
EXCEPTION WHEN undefined_function THEN
  -- Create the helper function if it does not exist yet
  CREATE OR REPLACE FUNCTION public.is_family_member(family_id_param uuid, user_id_param uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $f$
    SELECT EXISTS (
      SELECT 1
      FROM public.family_members fm
      WHERE fm.family_id = family_id_param
        AND fm.user_id  = user_id_param
    );
  $f$;
  GRANT EXECUTE ON FUNCTION public.is_family_member(uuid, uuid) TO authenticated, anon;
END$$;

-- 2) Replace the recursive SELECT policy with a function-based check
DROP POLICY IF EXISTS "family_members_strict_access" ON public.family_members;

CREATE POLICY "family_members_strict_access"
ON public.family_members
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.is_family_member(family_id, auth.uid())
);

-- 3) Optional performance hardening
CREATE INDEX IF NOT EXISTS idx_family_members_family_user
  ON public.family_members (family_id, user_id);
