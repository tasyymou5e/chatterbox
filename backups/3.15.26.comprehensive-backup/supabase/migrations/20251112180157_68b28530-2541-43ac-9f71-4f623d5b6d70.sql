-- Secure child_accounts: Restrict access to creating parent and admins only
-- Prevents unauthorized access to generated_email during account creation

-- Drop existing policies
DROP POLICY IF EXISTS "Admins have full access to child accounts" ON public.child_accounts;
DROP POLICY IF EXISTS "child_accounts_parent_admin_only" ON public.child_accounts;

-- Create strict SELECT policy: Only creating parent and admins can view
CREATE POLICY "child_accounts_secure_select"
ON public.child_accounts
FOR SELECT
USING (
  -- Creating parent can view
  created_by = auth.uid()
  OR
  -- Admins can view
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Child can view ONLY their own completed account (not during pending state)
  (user_id = auth.uid() AND status = 'completed')
);

-- Create strict INSERT policy: Only parents and admins can create
CREATE POLICY "child_accounts_secure_insert"
ON public.child_accounts
FOR INSERT
WITH CHECK (
  -- Parent creating for their family
  (has_role(auth.uid(), 'parent'::app_role) AND created_by = auth.uid())
  OR
  -- Admin creating
  has_role(auth.uid(), 'admin'::app_role)
);

-- Create strict UPDATE policy: Only creating parent and admins can update
CREATE POLICY "child_accounts_secure_update"
ON public.child_accounts
FOR UPDATE
USING (
  created_by = auth.uid()
  OR
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Child can update only during completion (status change from pending to completed)
  (user_id = auth.uid() AND status = 'pending')
)
WITH CHECK (
  created_by = auth.uid()
  OR
  has_role(auth.uid(), 'admin'::app_role)
  OR
  -- Child can only update to complete their account
  (user_id = auth.uid() AND status IN ('pending', 'completed'))
);

-- Create strict DELETE policy: Only creating parent and admins can delete
CREATE POLICY "child_accounts_secure_delete"
ON public.child_accounts
FOR DELETE
USING (
  created_by = auth.uid()
  OR
  has_role(auth.uid(), 'admin'::app_role)
);

COMMENT ON POLICY "child_accounts_secure_select" ON public.child_accounts 
IS 'Secure access: Creating parent and admins only. Children can only view their completed accounts to prevent email exposure during pending state.';