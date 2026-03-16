-- ============================================
-- CHILD ACCOUNT SECURITY HARDENING MIGRATION
-- Protects generated_email from client exposure
-- ============================================

-- 1. Add verification PIN columns to child_accounts
ALTER TABLE public.child_accounts 
ADD COLUMN IF NOT EXISTS verification_pin TEXT,
ADD COLUMN IF NOT EXISTS pin_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;

-- 2. Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_child_accounts_family_code_status 
ON public.child_accounts(family_code, status) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_child_accounts_locked_until 
ON public.child_accounts(locked_until) 
WHERE locked_until IS NOT NULL;

-- 3. Create secure function for account lookup (NEVER returns generated_email)
CREATE OR REPLACE FUNCTION public.get_pending_child_account_for_completion(
  p_family_code TEXT,
  p_verification_pin TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  first_name TEXT,
  last_name TEXT,
  family_id UUID,
  expires_at TIMESTAMPTZ,
  is_locked BOOLEAN,
  lock_remaining_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account RECORD;
  v_lock_remaining INTEGER;
BEGIN
  -- Find the pending account
  SELECT 
    ca.id,
    ca.first_name,
    ca.last_name,
    ca.family_id,
    ca.expires_at,
    ca.verification_pin,
    ca.pin_attempts,
    ca.locked_until
  INTO v_account
  FROM child_accounts ca
  WHERE ca.family_code = p_family_code
    AND ca.status = 'pending'
    AND ca.user_id IS NULL;

  -- If no account found, return empty
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Check if account is expired
  IF v_account.expires_at IS NOT NULL AND v_account.expires_at < NOW() THEN
    RETURN;
  END IF;

  -- Check if account is locked
  IF v_account.locked_until IS NOT NULL AND v_account.locked_until > NOW() THEN
    v_lock_remaining := EXTRACT(EPOCH FROM (v_account.locked_until - NOW()))::INTEGER;
    
    RETURN QUERY SELECT 
      v_account.id,
      v_account.first_name,
      v_account.last_name,
      v_account.family_id,
      v_account.expires_at,
      TRUE AS is_locked,
      v_lock_remaining AS lock_remaining_seconds;
    RETURN;
  END IF;

  -- If PIN verification is required and PIN was provided
  IF v_account.verification_pin IS NOT NULL AND p_verification_pin IS NOT NULL THEN
    IF v_account.verification_pin != p_verification_pin THEN
      -- Increment failed attempts
      UPDATE child_accounts 
      SET pin_attempts = COALESCE(pin_attempts, 0) + 1,
          locked_until = CASE 
            WHEN COALESCE(pin_attempts, 0) >= 4 THEN NOW() + INTERVAL '30 minutes'
            ELSE NULL
          END
      WHERE child_accounts.id = v_account.id;
      
      -- Log the failed attempt
      INSERT INTO security_events (event_type, severity, metadata, created_at)
      VALUES (
        'child_account_pin_failed',
        'medium',
        jsonb_build_object(
          'family_code', p_family_code,
          'account_id', v_account.id,
          'attempts', COALESCE(v_account.pin_attempts, 0) + 1
        ),
        NOW()
      );
      
      RETURN; -- Return empty on PIN mismatch
    END IF;
  END IF;

  -- Log successful lookup
  INSERT INTO security_events (event_type, severity, metadata, created_at)
  VALUES (
    'child_account_lookup',
    'low',
    jsonb_build_object(
      'family_code', p_family_code,
      'account_id', v_account.id,
      'has_pin', v_account.verification_pin IS NOT NULL
    ),
    NOW()
  );

  -- Return account info (WITHOUT generated_email)
  RETURN QUERY SELECT 
    v_account.id,
    v_account.first_name,
    v_account.last_name,
    v_account.family_id,
    v_account.expires_at,
    FALSE AS is_locked,
    0 AS lock_remaining_seconds;
END;
$$;

-- 4. Create secure function for account completion (used by edge function)
CREATE OR REPLACE FUNCTION public.complete_child_account_secure(
  p_account_id UUID,
  p_user_id UUID,
  p_verification_pin TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  generated_email TEXT,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account RECORD;
BEGIN
  -- Get the account with lock for update
  SELECT 
    ca.id,
    ca.generated_email,
    ca.verification_pin,
    ca.pin_attempts,
    ca.locked_until,
    ca.expires_at,
    ca.status
  INTO v_account
  FROM child_accounts ca
  WHERE ca.id = p_account_id
  FOR UPDATE;

  -- Validate account exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, 'Account not found'::TEXT;
    RETURN;
  END IF;

  -- Check if already completed
  IF v_account.status != 'pending' THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, 'Account has already been activated'::TEXT;
    RETURN;
  END IF;

  -- Check if expired
  IF v_account.expires_at IS NOT NULL AND v_account.expires_at < NOW() THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, 'Account access code has expired'::TEXT;
    RETURN;
  END IF;

  -- Check if locked
  IF v_account.locked_until IS NOT NULL AND v_account.locked_until > NOW() THEN
    RETURN QUERY SELECT FALSE, NULL::TEXT, 'Account is temporarily locked due to too many failed attempts'::TEXT;
    RETURN;
  END IF;

  -- Verify PIN if required
  IF v_account.verification_pin IS NOT NULL THEN
    IF p_verification_pin IS NULL OR p_verification_pin != v_account.verification_pin THEN
      -- Increment attempts and potentially lock
      UPDATE child_accounts 
      SET pin_attempts = COALESCE(pin_attempts, 0) + 1,
          locked_until = CASE 
            WHEN COALESCE(pin_attempts, 0) >= 4 THEN NOW() + INTERVAL '30 minutes'
            ELSE NULL
          END
      WHERE child_accounts.id = p_account_id;
      
      RETURN QUERY SELECT FALSE, NULL::TEXT, 'Invalid verification PIN'::TEXT;
      RETURN;
    END IF;
  END IF;

  -- Complete the account
  UPDATE child_accounts
  SET 
    user_id = p_user_id,
    status = 'completed',
    completed_at = NOW(),
    pin_attempts = 0,
    locked_until = NULL
  WHERE child_accounts.id = p_account_id;

  -- Log successful completion
  INSERT INTO security_events (event_type, severity, user_id, metadata, created_at)
  VALUES (
    'child_account_completed',
    'medium',
    p_user_id,
    jsonb_build_object(
      'account_id', p_account_id
    ),
    NOW()
  );

  -- Return the generated_email (only to be used server-side)
  RETURN QUERY SELECT TRUE, v_account.generated_email, NULL::TEXT;
END;
$$;

-- 5. Create rate limiting function for lookups
CREATE OR REPLACE FUNCTION public.check_child_account_lookup_rate_limit(
  p_identifier TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  attempt_count INTEGER;
BEGIN
  -- Count attempts in last 15 minutes
  SELECT COUNT(*) INTO attempt_count
  FROM security_events
  WHERE event_type IN ('child_account_lookup', 'child_account_pin_failed')
    AND metadata->>'family_code' = p_identifier
    AND created_at > NOW() - INTERVAL '15 minutes';
    
  RETURN attempt_count < 15; -- Max 15 lookups per 15 min per family code
END;
$$;

-- 6. Create view for children to see their own account (WITHOUT generated_email)
CREATE OR REPLACE VIEW public.child_accounts_self_view AS
SELECT 
  id,
  first_name,
  last_name,
  family_id,
  family_code,
  status,
  created_at,
  completed_at
FROM public.child_accounts
WHERE user_id = (SELECT auth.uid())
  AND status = 'completed';

-- 7. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_pending_child_account_for_completion TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.complete_child_account_secure TO service_role;
GRANT EXECUTE ON FUNCTION public.check_child_account_lookup_rate_limit TO authenticated, anon;
GRANT SELECT ON public.child_accounts_self_view TO authenticated;

-- 8. Add comment for documentation
COMMENT ON FUNCTION public.get_pending_child_account_for_completion IS 
'Secure lookup function for child account completion. NEVER returns generated_email to prevent account takeover attacks.';

COMMENT ON FUNCTION public.complete_child_account_secure IS 
'Server-side only function for completing child accounts. Returns generated_email only for edge function use.';

COMMENT ON VIEW public.child_accounts_self_view IS 
'Secure view for children to see their own account info without exposing generated_email.';