-- =====================================================
-- Fix Child Accounts RLS Policy - Remove Direct Child Access
-- Security: Forces children to use get_my_child_account_safe() RPC
-- This prevents generated_email exposure via direct table queries
-- =====================================================

-- Step 1: Drop the existing SELECT policy
DROP POLICY IF EXISTS child_accounts_secure_select ON child_accounts;

-- Step 2: Create new policy WITHOUT child self-access
-- Children MUST use get_my_child_account_safe() RPC instead
CREATE POLICY child_accounts_secure_select ON child_accounts
FOR SELECT TO authenticated USING (
  -- Parents can see accounts they created
  (created_by = (SELECT auth.uid())) 
  OR 
  -- Admins can see all
  has_role((SELECT auth.uid()), 'admin')
  -- REMOVED: Child self-access was: (user_id = auth.uid()) AND (status = 'completed')
  -- This prevents generated_email from being exposed to children
);

-- Add comment documenting the security rationale
COMMENT ON POLICY child_accounts_secure_select ON child_accounts IS 
  'SECURITY: Restricts SELECT to parents (creator) and admins only. 
   Children must use get_my_child_account_safe() RPC to prevent generated_email exposure.
   Updated: 2026-01-22 - Removed child self-access for COPPA compliance.';

-- Step 3: Create safe view for child self-access (defense in depth)
-- This view explicitly excludes sensitive fields
DROP VIEW IF EXISTS child_accounts_self_view;

CREATE VIEW child_accounts_self_view AS
SELECT 
  id,
  family_id,
  created_by,
  first_name,
  last_name,
  family_code,
  status,
  user_id,
  created_at,
  completed_at,
  expires_at
  -- EXCLUDED: generated_email, verification_pin, pin_attempts, locked_until, metadata
FROM child_accounts
WHERE user_id = auth.uid() 
  AND status = 'completed';

-- Grant access to authenticated users
GRANT SELECT ON child_accounts_self_view TO authenticated;

-- Document the view
COMMENT ON VIEW child_accounts_self_view IS 
  'SECURITY: Safe view for children to access their own account data. 
   Excludes generated_email to prevent authentication email exposure.
   Alternative to get_my_child_account_safe() RPC for child self-access.';