-- Security Enhancements Migration

-- 1. Add privacy consent table for behavioral data tracking
CREATE TABLE public.user_privacy_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  behavioral_tracking_consent BOOLEAN NOT NULL DEFAULT false,
  data_retention_days INTEGER NOT NULL DEFAULT 90,
  analytics_sharing_consent BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS on privacy settings
ALTER TABLE public.user_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Privacy settings policies
CREATE POLICY "Users can manage their own privacy settings"
ON public.user_privacy_settings
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all privacy settings"
ON public.user_privacy_settings
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- 2. Add expiration and rate limiting to child accounts
ALTER TABLE public.child_accounts 
ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days'),
ADD COLUMN creation_attempt_count INTEGER DEFAULT 1;

-- Create index for performance
CREATE INDEX idx_child_accounts_expires_at ON public.child_accounts(expires_at);
CREATE INDEX idx_child_accounts_family_created_by ON public.child_accounts(family_id, created_by);

-- 3. Create function to check child account creation rate limit
CREATE OR REPLACE FUNCTION public.check_child_account_rate_limit(p_family_id UUID, p_parent_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  recent_count INTEGER;
  max_per_day INTEGER := 5; -- Max 5 child accounts per day per family
BEGIN
  -- Count child accounts created in last 24 hours by this parent for this family
  SELECT COUNT(*)
  INTO recent_count
  FROM public.child_accounts
  WHERE family_id = p_family_id 
    AND created_by = p_parent_id
    AND created_at > (now() - interval '24 hours');
  
  -- Log security event if rate limit exceeded
  IF recent_count >= max_per_day THEN
    PERFORM log_security_event(
      p_parent_id,
      'child_account_rate_limit_exceeded',
      'high',
      jsonb_build_object(
        'family_id', p_family_id,
        'attempts_in_24h', recent_count,
        'max_allowed', max_per_day
      )
    );
    RETURN false;
  END IF;
  
  RETURN true;
END;
$$;

-- 4. Create function to clean up expired child accounts
CREATE OR REPLACE FUNCTION public.cleanup_expired_child_accounts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  expired_count INTEGER;
BEGIN
  -- Delete expired pending child accounts
  DELETE FROM public.child_accounts 
  WHERE status = 'pending' 
    AND expires_at < now();
  
  GET DIAGNOSTICS expired_count = ROW_COUNT;
  
  -- Log cleanup activity
  IF expired_count > 0 THEN
    INSERT INTO public.analytics_metrics (
      metric_type, metric_name, metric_value, metadata
    ) VALUES (
      'security_cleanup', 
      'expired_child_accounts_removed', 
      expired_count,
      jsonb_build_object('cleanup_date', now())
    );
  END IF;
  
  RETURN expired_count;
END;
$$;

-- 5. Enhanced child account creation function with rate limiting and expiration
CREATE OR REPLACE FUNCTION public.create_child_account_secure(p_family_id UUID, p_first_name TEXT, p_last_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_account_id UUID;
  parent_user_id UUID := auth.uid();
BEGIN
  -- Validate parent has permission to create child accounts for this family
  IF NOT validate_family_access(parent_user_id, p_family_id, 'parent'::app_role) THEN
    RAISE EXCEPTION 'Access denied. Only family creators can create child accounts.';
  END IF;
  
  -- Check rate limit for child account creation
  IF NOT check_child_account_rate_limit(p_family_id, parent_user_id) THEN
    RAISE EXCEPTION 'Rate limit exceeded. Too many child account creation attempts. Try again tomorrow.';
  END IF;
  
  -- Create the child account with expiration
  INSERT INTO child_accounts (
    family_id, first_name, last_name, created_by, family_code, expires_at
  ) VALUES (
    p_family_id, p_first_name, p_last_name, parent_user_id, 
    generate_child_account_code(), 
    now() + interval '7 days'
  ) RETURNING id INTO new_account_id;
  
  -- Log the activity
  PERFORM log_family_activity(
    p_family_id,
    parent_user_id,
    'parent'::app_role,
    'child_account_created',
    parent_user_id,
    jsonb_build_object(
      'child_account_id', new_account_id, 
      'child_name', p_first_name || ' ' || p_last_name,
      'expires_at', (now() + interval '7 days')
    )
  );
  
  RETURN new_account_id;
END;
$$;

-- 6. Function to check if user has behavioral tracking consent
CREATE OR REPLACE FUNCTION public.has_behavioral_tracking_consent(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (SELECT behavioral_tracking_consent FROM public.user_privacy_settings WHERE user_id = p_user_id),
    false
  );
$$;

-- 7. Create trigger to update updated_at on privacy settings
CREATE TRIGGER update_user_privacy_settings_updated_at
  BEFORE UPDATE ON public.user_privacy_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Add data retention trigger for behavioral events
CREATE OR REPLACE FUNCTION public.enforce_behavioral_data_retention()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_retention_days INTEGER;
BEGIN
  -- Get user's data retention preference
  SELECT data_retention_days INTO user_retention_days
  FROM public.user_privacy_settings
  WHERE user_id = NEW.user_id;
  
  -- Use default if no preference set
  user_retention_days := COALESCE(user_retention_days, 90);
  
  -- Delete old behavioral events for this user
  DELETE FROM public.behavioral_events
  WHERE user_id = NEW.user_id
    AND timestamp < (now() - (user_retention_days || ' days')::interval);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_behavioral_data_retention_trigger
  AFTER INSERT ON public.behavioral_events
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_behavioral_data_retention();