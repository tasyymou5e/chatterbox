-- Analyze and fix child_accounts security vulnerabilities
-- Drop existing policies to implement more restrictive ones
DROP POLICY IF EXISTS "Child accounts restricted access" ON public.child_accounts;

-- Create more granular policies for better security

-- 1. Parents can only view child accounts they created in their own family
CREATE POLICY "Parents can view own family child accounts" 
ON public.child_accounts 
FOR SELECT 
USING (
  has_role(auth.uid(), 'parent'::app_role) 
  AND created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM families f 
    WHERE f.id = child_accounts.family_id 
    AND f.created_by = auth.uid()
  )
);

-- 2. Parents can only create child accounts in their own family
CREATE POLICY "Parents can create child accounts in own family" 
ON public.child_accounts 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'parent'::app_role)
  AND created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM families f 
    WHERE f.id = child_accounts.family_id 
    AND f.created_by = auth.uid()
  )
);

-- 3. Parents can only update child accounts they created
CREATE POLICY "Parents can update own child accounts" 
ON public.child_accounts 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'parent'::app_role)
  AND created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM families f 
    WHERE f.id = child_accounts.family_id 
    AND f.created_by = auth.uid()
  )
)
WITH CHECK (
  has_role(auth.uid(), 'parent'::app_role)
  AND created_by = auth.uid()
);

-- 4. Only allow deletion by the parent who created the account
CREATE POLICY "Parents can delete own child accounts" 
ON public.child_accounts 
FOR DELETE 
USING (
  has_role(auth.uid(), 'parent'::app_role)
  AND created_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM families f 
    WHERE f.id = child_accounts.family_id 
    AND f.created_by = auth.uid()
  )
);

-- 5. Child users can only view their own account (once user_id is set)
CREATE POLICY "Children can view own account" 
ON public.child_accounts 
FOR SELECT 
USING (
  user_id IS NOT NULL 
  AND auth.uid() = user_id
);

-- 6. Children can update their own account completion status
CREATE POLICY "Children can complete own account" 
ON public.child_accounts 
FOR UPDATE 
USING (
  user_id IS NOT NULL 
  AND auth.uid() = user_id
  AND status = 'pending'
)
WITH CHECK (
  user_id IS NOT NULL 
  AND auth.uid() = user_id
);

-- 7. Admins have full access for administrative purposes
CREATE POLICY "Admins have full access to child accounts" 
ON public.child_accounts 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add additional security: Create function to validate family code access
CREATE OR REPLACE FUNCTION public.validate_child_account_access(
  p_family_code text,
  p_email text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  account_exists boolean;
BEGIN
  -- Check if the child account exists and is pending
  SELECT EXISTS(
    SELECT 1 FROM child_accounts 
    WHERE family_code = p_family_code 
    AND generated_email = p_email 
    AND status = 'pending'
    AND user_id IS NULL
  ) INTO account_exists;
  
  -- Log the access attempt for security monitoring
  IF account_exists THEN
    PERFORM log_security_event(
      NULL, -- no user_id yet for pending accounts
      'child_account_access_attempt',
      'medium',
      jsonb_build_object(
        'family_code', p_family_code,
        'email', p_email,
        'success', true
      )
    );
  ELSE
    PERFORM log_security_event(
      NULL,
      'child_account_access_denied',
      'high',
      jsonb_build_object(
        'family_code', p_family_code,
        'email', p_email,
        'reason', 'invalid_credentials'
      )
    );
  END IF;
  
  RETURN account_exists;
END;
$$;

-- Create index for better performance on security-critical queries
CREATE INDEX IF NOT EXISTS idx_child_accounts_family_code ON child_accounts(family_code) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_child_accounts_generated_email ON child_accounts(generated_email) WHERE status = 'pending';

-- Add constraint to ensure family_code uniqueness
ALTER TABLE child_accounts ADD CONSTRAINT unique_family_code UNIQUE (family_code);