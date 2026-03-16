import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type {
  IntegrityIssue,
  IntegrityCheckLog,
  IntegrityFixAudit,
  IntegrityCheckResult,
  IntegrityStats,
  IntegritySeverity,
  IntegrityIssueType,
  IntegrityIssueStatus,
  ProposedFix
} from '@/types/integrity';

interface UseIntegrityManagementResult {
  // Data
  issues: IntegrityIssue[];
  pendingIssues: IntegrityIssue[];
  checkLogs: IntegrityCheckLog[];
  latestCheck: IntegrityCheckLog | null;
  stats: IntegrityStats | null;
  
  // State
  loading: boolean;
  running: boolean;
  
  // Actions
  fetchIssues: () => Promise<void>;
  fetchCheckLogs: () => Promise<void>;
  runManualCheck: () => Promise<IntegrityCheckResult>;
  approveIssue: (issueId: string, notes?: string) => Promise<boolean>;
  approveAndExecute: (issueId: string, notes?: string) => Promise<boolean>;
  rejectIssue: (issueId: string, reason?: string) => Promise<boolean>;
  ignoreIssue: (issueId: string) => Promise<boolean>;
  bulkApprove: (issueIds: string[]) => Promise<boolean>;
  bulkExecute: (issueIds: string[]) => Promise<boolean>;
  fetchAuditLog: (issueId: string) => Promise<IntegrityFixAudit[]>;
  refresh: () => Promise<void>;
}

export function useIntegrityManagement(): UseIntegrityManagementResult {
  const { toast } = useToast();
  const [issues, setIssues] = useState<IntegrityIssue[]>([]);
  const [checkLogs, setCheckLogs] = useState<IntegrityCheckLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  // Computed values
  const pendingIssues = issues.filter(i => i.status === 'pending_review');
  const latestCheck = checkLogs.length > 0 ? checkLogs[0] : null;

  const stats: IntegrityStats | null = issues.length > 0 ? {
    total_issues: issues.length,
    pending_review: issues.filter(i => i.status === 'pending_review').length,
    approved: issues.filter(i => i.status === 'approved').length,
    fixed: issues.filter(i => i.status === 'fixed').length,
    rejected: issues.filter(i => i.status === 'rejected').length,
    ignored: issues.filter(i => i.status === 'ignored').length,
    by_severity: {
      critical: issues.filter(i => i.severity === 'critical').length,
      high: issues.filter(i => i.severity === 'high').length,
      medium: issues.filter(i => i.severity === 'medium').length,
      low: issues.filter(i => i.severity === 'low').length,
    },
    by_type: issues.reduce((acc, issue) => {
      acc[issue.issue_type] = (acc[issue.issue_type] || 0) + 1;
      return acc;
    }, {} as Record<IntegrityIssueType, number>)
  } : null;

  const fetchIssues = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('integrity_issues')
        .select('id, check_log_id, issue_type, severity, entity_type, entity_id, family_id, user_id, description, auto_fix_available, proposed_fix, fix_preview, status, approved_by, approved_at, rejection_reason, fixed_at, metadata, created_at')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Map database rows to typed IntegrityIssue objects
      const typedIssues: IntegrityIssue[] = (data || []).map(row => ({
        id: row.id,
        check_log_id: row.check_log_id,
        issue_type: row.issue_type as IntegrityIssueType,
        severity: row.severity as IntegritySeverity,
        entity_type: row.entity_type as 'child_account' | 'family_member' | 'user_role' | 'family',
        entity_id: row.entity_id,
        family_id: row.family_id,
        user_id: row.user_id,
        description: row.description,
        auto_fix_available: row.auto_fix_available,
        proposed_fix: row.proposed_fix as ProposedFix | null,
        fix_preview: row.fix_preview,
        status: row.status as IntegrityIssueStatus,
        approved_by: row.approved_by,
        approved_at: row.approved_at,
        rejection_reason: row.rejection_reason,
        fixed_at: row.fixed_at,
        metadata: (row.metadata as Record<string, unknown>) || {},
        created_at: row.created_at
      }));

      setIssues(typedIssues);
    } catch (error) {
      console.error('Failed to fetch integrity issues:', error);
    }
  }, []);

  const fetchCheckLogs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('integrity_check_logs')
        .select('id, check_type, status, issues_found, issues_auto_fixable, check_duration_ms, error_message, triggered_by, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      // Map to typed objects
      const typedLogs: IntegrityCheckLog[] = (data || []).map(row => ({
        id: row.id,
        check_type: row.check_type as 'scheduled' | 'manual',
        status: row.status as 'healthy' | 'issues_found' | 'error',
        issues_found: row.issues_found,
        issues_auto_fixable: row.issues_auto_fixable,
        check_duration_ms: row.check_duration_ms,
        error_message: row.error_message,
        triggered_by: row.triggered_by,
        created_at: row.created_at
      }));
      
      setCheckLogs(typedLogs);
    } catch (error) {
      console.error('Failed to fetch check logs:', error);
    }
  }, []);

  const runManualCheck = useCallback(async (): Promise<IntegrityCheckResult> => {
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('family-integrity-check', {
        body: { checkType: 'manual' }
      });

      if (error) throw error;

      toast({
        title: 'Integrity Check Complete',
        description: `Found ${data.issues_found} issue(s), ${data.issues_auto_fixable} auto-fixable`,
      });

      // Refresh data
      await Promise.all([fetchIssues(), fetchCheckLogs()]);

      return data as IntegrityCheckResult;
    } catch (error) {
      console.error('Failed to run integrity check:', error);
      toast({
        title: 'Check Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return { success: false, error: 'Failed to run check' };
    } finally {
      setRunning(false);
    }
  }, [fetchIssues, fetchCheckLogs, toast]);

  const approveIssue = useCallback(async (issueId: string, notes?: string): Promise<boolean> => {
    try {
      const response = await supabase.functions.invoke(
        `family-integrity-check?action=approve&issueId=${issueId}`,
        { body: { notes } }
      );

      if (response.error) throw response.error;

      toast({ title: 'Issue Approved', description: 'The fix has been approved.' });
      await fetchIssues();
      return true;
    } catch (error) {
      console.error('Failed to approve issue:', error);
      toast({
        title: 'Approval Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchIssues, toast]);

  const approveAndExecute = useCallback(async (issueId: string, notes?: string): Promise<boolean> => {
    try {
      // First approve
      const approveResponse = await supabase.functions.invoke(
        `family-integrity-check?action=approve&issueId=${issueId}`,
        { body: { notes } }
      );

      if (approveResponse.error) throw approveResponse.error;

      // Then execute
      const executeResponse = await supabase.functions.invoke(
        `family-integrity-check?action=execute-fix&issueId=${issueId}`,
        { body: {} }
      );

      if (executeResponse.error) throw executeResponse.error;

      toast({ title: 'Fix Executed', description: 'The issue has been fixed successfully.' });
      await fetchIssues();
      return true;
    } catch (error) {
      console.error('Failed to execute fix:', error);
      toast({
        title: 'Fix Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchIssues, toast]);

  const rejectIssue = useCallback(async (issueId: string, reason?: string): Promise<boolean> => {
    try {
      const response = await supabase.functions.invoke(
        `family-integrity-check?action=reject&issueId=${issueId}`,
        { body: { reason } }
      );

      if (response.error) throw response.error;

      toast({ title: 'Issue Rejected', description: 'The fix has been rejected.' });
      await fetchIssues();
      return true;
    } catch (error) {
      console.error('Failed to reject issue:', error);
      toast({
        title: 'Rejection Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchIssues, toast]);

  const ignoreIssue = useCallback(async (issueId: string): Promise<boolean> => {
    try {
      const response = await supabase.functions.invoke(
        `family-integrity-check?action=ignore&issueId=${issueId}`,
        { body: {} }
      );

      if (response.error) throw response.error;

      toast({ title: 'Issue Ignored', description: 'The issue has been marked as ignored.' });
      await fetchIssues();
      return true;
    } catch (error) {
      console.error('Failed to ignore issue:', error);
      toast({
        title: 'Action Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
      return false;
    }
  }, [fetchIssues, toast]);

  const bulkApprove = useCallback(async (issueIds: string[]): Promise<boolean> => {
    try {
      const results = await Promise.all(
        issueIds.map(id => approveIssue(id))
      );
      return results.every(r => r);
    } catch (error) {
      console.error('Bulk approve failed:', error);
      return false;
    }
  }, [approveIssue]);

  const bulkExecute = useCallback(async (issueIds: string[]): Promise<boolean> => {
    try {
      const results = await Promise.all(
        issueIds.map(id => approveAndExecute(id))
      );
      
      const successCount = results.filter(r => r).length;
      toast({
        title: 'Bulk Execution Complete',
        description: `${successCount}/${issueIds.length} fixes executed successfully`,
      });
      
      return results.every(r => r);
    } catch (error) {
      console.error('Bulk execute failed:', error);
      return false;
    }
  }, [approveAndExecute, toast]);

  const fetchAuditLog = useCallback(async (issueId: string): Promise<IntegrityFixAudit[]> => {
    try {
      const { data, error } = await supabase
        .from('integrity_fix_audit')
        .select('id, issue_id, action, admin_id, old_data, new_data, notes, created_at')
        .eq('issue_id', issueId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      return (data || []).map(row => ({
        id: row.id,
        issue_id: row.issue_id,
        action: row.action as 'approved' | 'rejected' | 'executed' | 'failed' | 'ignored',
        admin_id: row.admin_id,
        old_data: row.old_data as Record<string, unknown> | null,
        new_data: row.new_data as Record<string, unknown> | null,
        notes: row.notes,
        created_at: row.created_at
      }));
    } catch (error) {
      console.error('Failed to fetch audit log:', error);
      return [];
    }
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchIssues(), fetchCheckLogs()]);
    setLoading(false);
  }, [fetchIssues, fetchCheckLogs]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('integrity-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'integrity_issues' },
        () => fetchIssues()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'integrity_check_logs' },
        () => fetchCheckLogs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchIssues, fetchCheckLogs]);

  return {
    issues,
    pendingIssues,
    checkLogs,
    latestCheck,
    stats,
    loading,
    running,
    fetchIssues,
    fetchCheckLogs,
    runManualCheck,
    approveIssue,
    approveAndExecute,
    rejectIssue,
    ignoreIssue,
    bulkApprove,
    bulkExecute,
    fetchAuditLog,
    refresh,
  };
}