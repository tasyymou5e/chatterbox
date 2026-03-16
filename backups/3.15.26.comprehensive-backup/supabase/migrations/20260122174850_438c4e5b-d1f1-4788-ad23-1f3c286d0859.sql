-- Fix SECURITY DEFINER issue on child_accounts_self_view
-- Change to SECURITY INVOKER so RLS policies of the querying user apply

DROP VIEW IF EXISTS child_accounts_self_view;

CREATE VIEW child_accounts_self_view 
WITH (security_invoker = true) AS
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
FROM child_accounts
WHERE user_id = auth.uid() 
  AND status = 'completed';

-- Grant access to authenticated users
GRANT SELECT ON child_accounts_self_view TO authenticated;

COMMENT ON VIEW child_accounts_self_view IS 
  'SECURITY: Safe view for children to access their own account data (SECURITY INVOKER). 
   Excludes generated_email to prevent authentication email exposure.';