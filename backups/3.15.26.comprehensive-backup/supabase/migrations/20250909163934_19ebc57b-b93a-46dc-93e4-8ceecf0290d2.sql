-- Create enhanced security audit trail and monitoring infrastructure

-- 1. Create security event types enum
CREATE TYPE security_event_type AS ENUM (
  'authentication_failure',
  'rls_violation', 
  'suspicious_access_pattern',
  'bulk_data_access',
  'privilege_escalation',
  'data_exfiltration_attempt',
  'brute_force_attack',
  'session_hijacking',
  'unauthorized_api_access',
  'security_test_failure'
);

-- 2. Create security alerts table for real-time monitoring
CREATE TABLE IF NOT EXISTS security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type security_event_type NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  affected_user_id UUID,
  source_ip INET,
  user_agent TEXT,
  request_details JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  resolved BOOLEAN DEFAULT false,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Create security monitoring configuration table
CREATE TABLE IF NOT EXISTS security_monitoring_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL UNIQUE,
  rule_type TEXT NOT NULL,
  conditions JSONB NOT NULL,
  alert_threshold INTEGER DEFAULT 5,
  time_window_minutes INTEGER DEFAULT 60,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Create security test results table
CREATE TABLE IF NOT EXISTS security_test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_run_id UUID NOT NULL,
  test_name TEXT NOT NULL,
  test_type TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  passed BOOLEAN NOT NULL,
  error_message TEXT,
  execution_time_ms INTEGER,
  test_details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Enhanced logging functions
CREATE OR REPLACE FUNCTION log_security_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_severity TEXT,
  p_details JSONB DEFAULT '{}'::JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  audit_id UUID;
BEGIN
  -- Insert into security audit logs
  INSERT INTO security_audit_logs (
    user_id,
    event_type,
    severity,
    event_details
  ) VALUES (
    p_user_id,
    p_event_type,
    p_severity,
    p_details
  ) RETURNING id INTO audit_id;
  
  -- Create alert if high severity
  IF p_severity IN ('high', 'critical') THEN
    INSERT INTO security_alerts (
      alert_type,
      severity,
      title,
      description,
      affected_user_id,
      source_ip,
      metadata
    ) VALUES (
      p_event_type::security_event_type,
      p_severity,
      'Security Event: ' || p_event_type,
      p_details->>'description',
      p_user_id,
      (p_details->>'ip_address')::INET,
      p_details
    );
  END IF;
  
  RETURN audit_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the original operation
    NULL;
    RETURN NULL;
END;
$$;

-- 6. Function to detect suspicious patterns
CREATE OR REPLACE FUNCTION detect_suspicious_patterns()
RETURNS TABLE(
  user_id UUID,
  pattern_type TEXT,
  risk_score INTEGER,
  details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Detect rapid authentication failures
  RETURN QUERY
  SELECT 
    ual.user_id,
    'rapid_auth_failures'::TEXT,
    COUNT(*)::INTEGER * 10 as risk_score,
    jsonb_build_object(
      'failure_count', COUNT(*),
      'time_window', '5 minutes',
      'last_attempt', MAX(ual.created_at)
    ) as details
  FROM user_activity_logs ual
  WHERE ual.activity_type = 'login'
    AND ual.success = false
    AND ual.created_at > now() - interval '5 minutes'
  GROUP BY ual.user_id
  HAVING COUNT(*) > 5;
  
  -- Detect excessive family access attempts
  RETURN QUERY
  SELECT 
    sal.user_id,
    'excessive_family_access'::TEXT,
    COUNT(*)::INTEGER * 5 as risk_score,
    jsonb_build_object(
      'access_attempts', COUNT(*),
      'unique_families', COUNT(DISTINCT (sal.event_details->>'family_id')),
      'time_window', '1 hour'
    ) as details
  FROM security_audit_logs sal
  WHERE sal.event_type = 'family_access_attempt'
    AND sal.created_at > now() - interval '1 hour'
  GROUP BY sal.user_id
  HAVING COUNT(*) > 20;
  
  -- Detect bulk data access patterns
  RETURN QUERY
  SELECT 
    ual.user_id,
    'bulk_data_access'::TEXT,
    50 as risk_score,
    jsonb_build_object(
      'activity_count', COUNT(*),
      'time_window', '10 minutes'
    ) as details
  FROM user_activity_logs ual
  WHERE ual.created_at > now() - interval '10 minutes'
    AND ual.success = true
  GROUP BY ual.user_id
  HAVING COUNT(*) > 100;
END;
$$;

-- 7. Function to automatically create security alerts
CREATE OR REPLACE FUNCTION create_security_alert(
  p_alert_type security_event_type,
  p_severity TEXT,
  p_user_id UUID,
  p_details JSONB DEFAULT '{}'::JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  alert_id UUID;
BEGIN
  INSERT INTO security_alerts (
    alert_type,
    severity,
    title,
    description,
    affected_user_id,
    source_ip,
    metadata
  ) VALUES (
    p_alert_type,
    p_severity,
    'Automated Alert: ' || p_alert_type::TEXT,
    COALESCE(p_details->>'description', 'Suspicious activity detected'),
    p_user_id,
    (p_details->>'ip_address')::INET,
    p_details
  ) RETURNING id INTO alert_id;
  
  RETURN alert_id;
END;
$$;

-- 8. Enhanced audit trigger for profiles table
CREATE OR REPLACE FUNCTION enhanced_audit_profile_access()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  operation_type TEXT;
  user_context JSONB;
BEGIN
  -- Determine operation type
  operation_type := TG_OP;
  
  -- Build user context
  user_context := jsonb_build_object(
    'table_name', 'profiles',
    'operation', operation_type,
    'timestamp', now(),
    'session_user', session_user,
    'current_user_id', auth.uid()
  );
  
  -- Log profile access with enhanced details
  IF operation_type = 'SELECT' THEN
    PERFORM log_security_event(
      auth.uid(),
      'profile_access',
      'low',
      user_context || jsonb_build_object(
        'accessed_profile_id', COALESCE(NEW.user_id, OLD.user_id)
      )
    );
  ELSIF operation_type IN ('INSERT', 'UPDATE', 'DELETE') THEN
    PERFORM log_security_event(
      auth.uid(),
      'profile_modification',
      CASE WHEN operation_type = 'DELETE' THEN 'high' ELSE 'medium' END,
      user_context || jsonb_build_object(
        'modified_profile_id', COALESCE(NEW.user_id, OLD.user_id),
        'old_values', to_jsonb(OLD),
        'new_values', to_jsonb(NEW)
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 9. Create triggers for enhanced auditing
DROP TRIGGER IF EXISTS enhanced_audit_profiles ON profiles;
CREATE TRIGGER enhanced_audit_profiles
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION enhanced_audit_profile_access();

-- 10. Insert default security monitoring rules
INSERT INTO security_monitoring_config (rule_name, rule_type, conditions, alert_threshold, time_window_minutes, severity, enabled) VALUES
('Rapid Login Failures', 'authentication', '{"max_failures": 5, "action": "login"}', 5, 5, 'high', true),
('Excessive Data Access', 'data_access', '{"max_queries": 100, "table_pattern": "*"}', 100, 10, 'medium', true),
('Bulk Export Attempts', 'data_exfiltration', '{"min_records": 1000, "export_operations": true}', 3, 60, 'critical', true),
('Off-Hours Admin Activity', 'privilege_escalation', '{"roles": ["admin"], "time_range": "22:00-06:00"}', 1, 60, 'medium', true),
('Cross-Family Access Attempts', 'unauthorized_access', '{"cross_family_access": true}', 10, 60, 'high', true)
ON CONFLICT (rule_name) DO NOTHING;

-- 11. Enable RLS on security tables
ALTER TABLE security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_monitoring_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_test_results ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies
CREATE POLICY "Admins can view all security alerts" ON security_alerts
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can create security alerts" ON security_alerts
FOR INSERT WITH CHECK (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage monitoring config" ON security_monitoring_config
FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can view test results" ON security_test_results
FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "System can insert test results" ON security_test_results
FOR INSERT WITH CHECK (auth.role() = 'service_role' OR has_role(auth.uid(), 'admin'::app_role));

-- 13. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON security_alerts (severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_type ON security_alerts (alert_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_alerts_user ON security_alerts (affected_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_test_results_run ON security_test_results (test_run_id, created_at DESC);

-- 14. Create function for real-time pattern monitoring
CREATE OR REPLACE FUNCTION monitor_real_time_patterns()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pattern_record RECORD;
BEGIN
  -- Check for suspicious patterns and create alerts
  FOR pattern_record IN SELECT * FROM detect_suspicious_patterns() LOOP
    PERFORM create_security_alert(
      'suspicious_access_pattern'::security_event_type,
      CASE 
        WHEN pattern_record.risk_score > 50 THEN 'critical'
        WHEN pattern_record.risk_score > 25 THEN 'high'
        ELSE 'medium'
      END,
      pattern_record.user_id,
      pattern_record.details || jsonb_build_object('risk_score', pattern_record.risk_score, 'pattern_type', pattern_record.pattern_type)
    );
  END LOOP;
END;
$$;