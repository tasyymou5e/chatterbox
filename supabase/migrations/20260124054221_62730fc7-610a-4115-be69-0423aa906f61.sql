-- =============================================
-- Family Data Integrity Check System
-- Tables for logging checks, tracking issues, and audit trail
-- =============================================

-- Table 1: integrity_check_logs - Store results of each integrity check run
CREATE TABLE public.integrity_check_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  check_type TEXT NOT NULL CHECK (check_type IN ('scheduled', 'manual')),
  status TEXT NOT NULL CHECK (status IN ('healthy', 'issues_found', 'error')),
  issues_found INTEGER NOT NULL DEFAULT 0,
  issues_auto_fixable INTEGER NOT NULL DEFAULT 0,
  check_duration_ms INTEGER,
  error_message TEXT,
  triggered_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table 2: integrity_issues - Track individual detected issues with proposed fixes
CREATE TABLE public.integrity_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  check_log_id UUID REFERENCES public.integrity_check_logs(id) ON DELETE SET NULL,
  issue_type TEXT NOT NULL CHECK (issue_type IN (
    'orphaned_child_account',
    'duplicate_family_membership', 
    'missing_user_role',
    'role_mismatch',
    'orphaned_family_member',
    'missing_parent_link',
    'invalid_family_reference'
  )),
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('child_account', 'family_member', 'user_role', 'family')),
  entity_id UUID NOT NULL,
  family_id UUID,
  user_id UUID,
  description TEXT NOT NULL,
  auto_fix_available BOOLEAN NOT NULL DEFAULT false,
  proposed_fix JSONB,
  fix_preview TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'fixed', 'ignored')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  fixed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table 3: integrity_fix_audit - Audit trail for all fix operations
CREATE TABLE public.integrity_fix_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id UUID NOT NULL REFERENCES public.integrity_issues(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected', 'executed', 'failed', 'ignored')),
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  old_data JSONB,
  new_data JSONB,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =============================================
-- Indexes for performance
-- =============================================

CREATE INDEX idx_integrity_check_logs_created_at ON public.integrity_check_logs(created_at DESC);
CREATE INDEX idx_integrity_check_logs_status ON public.integrity_check_logs(status);

CREATE INDEX idx_integrity_issues_status ON public.integrity_issues(status);
CREATE INDEX idx_integrity_issues_severity ON public.integrity_issues(severity);
CREATE INDEX idx_integrity_issues_issue_type ON public.integrity_issues(issue_type);
CREATE INDEX idx_integrity_issues_created_at ON public.integrity_issues(created_at DESC);
CREATE INDEX idx_integrity_issues_check_log_id ON public.integrity_issues(check_log_id);
CREATE INDEX idx_integrity_issues_user_id ON public.integrity_issues(user_id);
CREATE INDEX idx_integrity_issues_family_id ON public.integrity_issues(family_id);

CREATE INDEX idx_integrity_fix_audit_issue_id ON public.integrity_fix_audit(issue_id);
CREATE INDEX idx_integrity_fix_audit_admin_id ON public.integrity_fix_audit(admin_id);
CREATE INDEX idx_integrity_fix_audit_created_at ON public.integrity_fix_audit(created_at DESC);

-- =============================================
-- Enable RLS
-- =============================================

ALTER TABLE public.integrity_check_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrity_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrity_fix_audit ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies - Admin only access
-- =============================================

-- integrity_check_logs policies
CREATE POLICY "Admins can view integrity check logs"
  ON public.integrity_check_logs
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert integrity check logs"
  ON public.integrity_check_logs
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access to integrity_check_logs"
  ON public.integrity_check_logs
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- integrity_issues policies
CREATE POLICY "Admins can view integrity issues"
  ON public.integrity_issues
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage integrity issues"
  ON public.integrity_issues
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access to integrity_issues"
  ON public.integrity_issues
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- integrity_fix_audit policies
CREATE POLICY "Admins can view fix audit"
  ON public.integrity_fix_audit
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert fix audit"
  ON public.integrity_fix_audit
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role full access to integrity_fix_audit"
  ON public.integrity_fix_audit
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');