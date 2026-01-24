/**
 * Types for the Family Data Integrity Check System
 */

export type IntegrityIssueType =
  | 'orphaned_child_account'
  | 'duplicate_family_membership'
  | 'missing_user_role'
  | 'role_mismatch'
  | 'orphaned_family_member'
  | 'missing_parent_link'
  | 'invalid_family_reference';

export type IntegrityIssueStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'fixed'
  | 'ignored';

export type IntegritySeverity = 'critical' | 'high' | 'medium' | 'low';

export type IntegrityCheckType = 'scheduled' | 'manual';

export type IntegrityCheckStatus = 'healthy' | 'issues_found' | 'error';

export type IntegrityEntityType = 'child_account' | 'family_member' | 'user_role' | 'family';

export type IntegrityAuditAction = 'approved' | 'rejected' | 'executed' | 'failed' | 'ignored';

export interface ProposedFix {
  action: 'delete' | 'insert' | 'update';
  table: string;
  where?: Record<string, unknown>;
  data?: Record<string, unknown>;
  reason: string;
}

export interface IntegrityCheckLog {
  id: string;
  check_type: IntegrityCheckType;
  status: IntegrityCheckStatus;
  issues_found: number;
  issues_auto_fixable: number;
  check_duration_ms: number | null;
  error_message: string | null;
  triggered_by: string | null;
  created_at: string;
}

export interface IntegrityIssue {
  id: string;
  check_log_id: string | null;
  issue_type: IntegrityIssueType;
  severity: IntegritySeverity;
  entity_type: IntegrityEntityType;
  entity_id: string;
  family_id: string | null;
  user_id: string | null;
  description: string;
  auto_fix_available: boolean;
  proposed_fix: ProposedFix | null;
  fix_preview: string | null;
  status: IntegrityIssueStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  fixed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface IntegrityFixAudit {
  id: string;
  issue_id: string;
  action: IntegrityAuditAction;
  admin_id: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
}

export interface IntegrityCheckResult {
  success: boolean;
  check_log_id?: string;
  status?: IntegrityCheckStatus;
  issues_found?: number;
  issues_auto_fixable?: number;
  duration_ms?: number;
  error?: string;
}

export interface IntegrityStats {
  total_issues: number;
  pending_review: number;
  approved: number;
  fixed: number;
  rejected: number;
  ignored: number;
  by_severity: Record<IntegritySeverity, number>;
  by_type: Record<IntegrityIssueType, number>;
}

export const SEVERITY_COLORS: Record<IntegritySeverity, string> = {
  critical: 'text-red-500',
  high: 'text-orange-500',
  medium: 'text-yellow-500',
  low: 'text-blue-500'
};

export const SEVERITY_BG_COLORS: Record<IntegritySeverity, string> = {
  critical: 'bg-red-500/10 border-red-500/20',
  high: 'bg-orange-500/10 border-orange-500/20',
  medium: 'bg-yellow-500/10 border-yellow-500/20',
  low: 'bg-blue-500/10 border-blue-500/20'
};

export const STATUS_COLORS: Record<IntegrityIssueStatus, string> = {
  pending_review: 'text-yellow-500',
  approved: 'text-blue-500',
  rejected: 'text-gray-500',
  fixed: 'text-green-500',
  ignored: 'text-gray-400'
};

export const ISSUE_TYPE_LABELS: Record<IntegrityIssueType, string> = {
  orphaned_child_account: 'Orphaned Child Account',
  duplicate_family_membership: 'Duplicate Membership',
  missing_user_role: 'Missing User Role',
  role_mismatch: 'Role Mismatch',
  orphaned_family_member: 'Orphaned Family Member',
  missing_parent_link: 'Missing Parent Link',
  invalid_family_reference: 'Invalid Family Reference'
};

export const ISSUE_TYPE_DESCRIPTIONS: Record<IntegrityIssueType, string> = {
  orphaned_child_account: 'Child account exists without corresponding family membership',
  duplicate_family_membership: 'User has multiple memberships in the same family',
  missing_user_role: 'User is marked as child in family but lacks child role in user_roles',
  role_mismatch: 'User role in family_members differs from user_roles table',
  orphaned_family_member: 'Family member record references a deleted family',
  missing_parent_link: 'Family has children but no parent member',
  invalid_family_reference: 'Child account references a non-existent family'
};