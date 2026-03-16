-- ============================================================
-- Security Fix: Child Accounts Safe View
-- Hides generated_email from children viewing their own records
-- ============================================================

-- Create a safe view that hides generated_email from children
CREATE OR REPLACE VIEW public.child_accounts_safe
WITH (security_invoker=on) AS
  SELECT 
    id,
    first_name,
    last_name,
    family_id,
    family_code,
    status,
    user_id,
    created_by,
    created_at,
    completed_at,
    expires_at,
    creation_attempt_count,
    metadata,
    -- Only show email to parents (created_by) and admins
    -- Children see a masked placeholder
    CASE 
      WHEN has_role(auth.uid(), 'admin'::app_role) THEN generated_email
      WHEN created_by = auth.uid() THEN generated_email
      ELSE '***protected***'
    END as generated_email
  FROM public.child_accounts;

-- Grant access to authenticated users (RLS on base table still applies)
GRANT SELECT ON public.child_accounts_safe TO authenticated;

-- Add comment explaining the security purpose
COMMENT ON VIEW public.child_accounts_safe IS 
  'Security view that hides generated_email from children. Parents and admins can see the email, children see a masked value. Use this view for child-facing queries.';