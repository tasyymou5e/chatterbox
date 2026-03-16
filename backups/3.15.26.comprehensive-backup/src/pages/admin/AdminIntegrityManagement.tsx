import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  RefreshCw,
  Loader2,
  Eye,
  Check,
  X,
  Trash2,
  History,
  Wrench
} from 'lucide-react';
import { useIntegrityManagement } from '@/hooks/useIntegrityManagement';
import { formatDistanceToNow, format } from 'date-fns';
import {
  IntegrityIssue,
  IntegrityFixAudit,
  SEVERITY_COLORS,
  SEVERITY_BG_COLORS,
  STATUS_COLORS,
  ISSUE_TYPE_LABELS,
  ISSUE_TYPE_DESCRIPTIONS
} from '@/types/integrity';

export default function AdminIntegrityManagement() {
  const {
    issues,
    pendingIssues,
    checkLogs,
    latestCheck,
    stats,
    loading,
    running,
    runManualCheck,
    approveAndExecute,
    rejectIssue,
    ignoreIssue,
    bulkExecute,
    fetchAuditLog,
    refresh
  } = useIntegrityManagement();

  const [selectedIssue, setSelectedIssue] = useState<IntegrityIssue | null>(null);
  const [auditLog, setAuditLog] = useState<IntegrityFixAudit[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rejectReason, setRejectReason] = useState('');
  const [approveNotes, setApproveNotes] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const handleViewDetails = async (issue: IntegrityIssue) => {
    setSelectedIssue(issue);
    setShowDetailDialog(true);
    setLoadingAudit(true);
    const log = await fetchAuditLog(issue.id);
    setAuditLog(log);
    setLoadingAudit(false);
  };

  const handleApproveAndExecute = async () => {
    if (!selectedIssue) return;
    setActionLoading(true);
    await approveAndExecute(selectedIssue.id, approveNotes);
    setActionLoading(false);
    setShowDetailDialog(false);
    setApproveNotes('');
  };

  const handleReject = async () => {
    if (!selectedIssue) return;
    setActionLoading(true);
    await rejectIssue(selectedIssue.id, rejectReason);
    setActionLoading(false);
    setShowDetailDialog(false);
    setRejectReason('');
  };

  const handleIgnore = async () => {
    if (!selectedIssue) return;
    setActionLoading(true);
    await ignoreIssue(selectedIssue.id);
    setActionLoading(false);
    setShowDetailDialog(false);
  };

  const handleBulkExecute = async () => {
    setActionLoading(true);
    await bulkExecute(selectedIds);
    setActionLoading(false);
    setShowBulkDialog(false);
    setSelectedIds([]);
  };

  const toggleIssueSelection = (issueId: string) => {
    setSelectedIds(prev =>
      prev.includes(issueId)
        ? prev.filter(id => id !== issueId)
        : [...prev, issueId]
    );
  };

  const selectAllPending = () => {
    const autoFixableIds = pendingIssues
      .filter(i => i.auto_fix_available)
      .map(i => i.id);
    setSelectedIds(autoFixableIds);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64 bg-gray-700" />
          <Skeleton className="h-10 w-32 bg-gray-700" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 bg-gray-700" />
          ))}
        </div>
        <Skeleton className="h-96 bg-gray-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="h-7 w-7 text-blue-400" />
            Data Integrity Management
          </h1>
          <p className="text-gray-400 mt-1">
            Monitor and fix data consistency issues across family records
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={runManualCheck}
            disabled={running}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running Check...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Integrity Check
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Issues"
          value={stats?.total_issues || 0}
          icon={AlertTriangle}
          color="text-gray-400"
        />
        <StatsCard
          title="Pending Review"
          value={stats?.pending_review || 0}
          icon={Clock}
          color="text-yellow-400"
          highlight={stats?.pending_review ? stats.pending_review > 0 : false}
        />
        <StatsCard
          title="Fixed"
          value={stats?.fixed || 0}
          icon={CheckCircle2}
          color="text-green-400"
        />
        <StatsCard
          title="Last Check"
          value={latestCheck ? formatDistanceToNow(new Date(latestCheck.created_at), { addSuffix: true }) : 'Never'}
          icon={History}
          color="text-blue-400"
          isText
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="bg-gray-800 border border-gray-700">
          <TabsTrigger value="pending" className="data-[state=active]:bg-gray-700">
            Pending Review
            {pendingIssues.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-yellow-500/20 text-yellow-400">
                {pendingIssues.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:bg-gray-700">
            All Issues
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-gray-700">
            Check History
          </TabsTrigger>
        </TabsList>

        {/* Pending Review Tab */}
        <TabsContent value="pending" className="space-y-4">
          {pendingIssues.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={selectAllPending}
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Select All Auto-Fixable
                </Button>
                {selectedIds.length > 0 && (
                  <span className="text-sm text-gray-400">
                    {selectedIds.length} selected
                  </span>
                )}
              </div>
              {selectedIds.length > 0 && (
                <Button
                  size="sm"
                  onClick={() => setShowBulkDialog(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Wrench className="h-4 w-4 mr-2" />
                  Execute Selected ({selectedIds.length})
                </Button>
              )}
            </div>
          )}

          <IssuesTable
            issues={pendingIssues}
            selectedIds={selectedIds}
            onToggleSelect={toggleIssueSelection}
            onViewDetails={handleViewDetails}
            showCheckbox
          />

          {pendingIssues.length === 0 && (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Pending Issues</h3>
                <p className="text-gray-400">
                  All data integrity issues have been reviewed and resolved.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* All Issues Tab */}
        <TabsContent value="all">
          <IssuesTable
            issues={issues}
            selectedIds={[]}
            onToggleSelect={() => {}}
            onViewDetails={handleViewDetails}
            showCheckbox={false}
          />

          {issues.length === 0 && (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="py-12 text-center">
                <ShieldCheck className="h-12 w-12 text-blue-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Issues Detected</h3>
                <p className="text-gray-400">
                  Run an integrity check to scan for data inconsistencies.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Check History Tab */}
        <TabsContent value="history">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Check History</CardTitle>
              <CardDescription className="text-gray-400">
                Recent integrity check runs and their results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700 hover:bg-transparent">
                    <TableHead className="text-gray-400">Time</TableHead>
                    <TableHead className="text-gray-400">Type</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Issues Found</TableHead>
                    <TableHead className="text-gray-400">Auto-Fixable</TableHead>
                    <TableHead className="text-gray-400">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkLogs.map(log => (
                    <TableRow key={log.id} className="border-gray-700">
                      <TableCell className="text-gray-300">
                        {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-gray-600 text-gray-300">
                          {log.check_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={log.status} />
                      </TableCell>
                      <TableCell className="text-gray-300">{log.issues_found}</TableCell>
                      <TableCell className="text-gray-300">{log.issues_auto_fixable}</TableCell>
                      <TableCell className="text-gray-400">
                        {log.check_duration_ms ? `${log.check_duration_ms}ms` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Issue Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className={SEVERITY_COLORS[selectedIssue?.severity || 'low']} />
              {selectedIssue ? ISSUE_TYPE_LABELS[selectedIssue.issue_type] : 'Issue Details'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {selectedIssue ? ISSUE_TYPE_DESCRIPTIONS[selectedIssue.issue_type] : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedIssue && (
            <div className="space-y-4">
              {/* Issue Info */}
              <div className={`rounded-lg border p-4 ${SEVERITY_BG_COLORS[selectedIssue.severity]}`}>
                <p className="text-gray-200">{selectedIssue.description}</p>
                <div className="mt-2 text-xs text-gray-400 space-y-1">
                  <p>Entity ID: {selectedIssue.entity_id}</p>
                  {selectedIssue.family_id && <p>Family ID: {selectedIssue.family_id}</p>}
                  {selectedIssue.user_id && <p>User ID: {selectedIssue.user_id}</p>}
                </div>
              </div>

              {/* Proposed Fix */}
              {selectedIssue.auto_fix_available && selectedIssue.fix_preview && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-white">Proposed Fix</h4>
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <p className="text-sm text-green-400">{selectedIssue.fix_preview}</p>
                    {selectedIssue.proposed_fix && (
                      <pre className="mt-2 text-xs text-gray-500 overflow-x-auto">
                        {JSON.stringify(selectedIssue.proposed_fix, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              )}

              {/* Admin Notes for Approval */}
              {selectedIssue.status === 'pending_review' && selectedIssue.auto_fix_available && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Notes (optional)</label>
                  <Textarea
                    value={approveNotes}
                    onChange={e => setApproveNotes(e.target.value)}
                    placeholder="Add notes about this approval..."
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>
              )}

              {/* Rejection Reason */}
              {selectedIssue.status === 'pending_review' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Rejection Reason (if rejecting)</label>
                  <Textarea
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    placeholder="Explain why this fix should not be applied..."
                    className="bg-gray-900 border-gray-700 text-white"
                  />
                </div>
              )}

              {/* Audit Log */}
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-white flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Audit Trail
                </h4>
                {loadingAudit ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </div>
                ) : auditLog.length > 0 ? (
                  <ScrollArea className="h-32 rounded border border-gray-700">
                    <div className="p-2 space-y-2">
                      {auditLog.map(entry => (
                        <div key={entry.id} className="text-xs text-gray-400">
                          <span className="text-gray-300">{entry.action}</span>
                          {' - '}
                          {format(new Date(entry.created_at), 'MMM d, HH:mm')}
                          {entry.notes && <span className="block ml-2 text-gray-500">"{entry.notes}"</span>}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <p className="text-xs text-gray-500">No audit entries yet</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            {selectedIssue?.status === 'pending_review' && (
              <>
                <Button
                  variant="ghost"
                  onClick={handleIgnore}
                  disabled={actionLoading}
                  className="text-gray-400 hover:text-white"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Ignore
                </Button>
                <Button
                  variant="outline"
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="border-red-600 text-red-400 hover:bg-red-600/10"
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                {selectedIssue.auto_fix_available && (
                  <Button
                    onClick={handleApproveAndExecute}
                    disabled={actionLoading}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Approve & Execute
                  </Button>
                )}
              </>
            )}
            {selectedIssue?.status !== 'pending_review' && (
              <Badge className={STATUS_COLORS[selectedIssue?.status || 'pending_review']}>
                {selectedIssue?.status?.replace('_', ' ').toUpperCase()}
              </Badge>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Execute Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent className="bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Bulk Execute Fixes</DialogTitle>
            <DialogDescription className="text-gray-400">
              You are about to execute {selectedIds.length} auto-fix operation(s).
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-yellow-400 bg-yellow-500/10 rounded p-3">
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              Make sure you have reviewed all selected issues before proceeding.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkDialog(false)}
              className="border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleBulkExecute}
              disabled={actionLoading}
              className="bg-green-600 hover:bg-green-700"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Wrench className="h-4 w-4 mr-2" />
                  Execute All ({selectedIds.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Helper Components
function StatsCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  highlight = false,
  isText = false
}: { 
  title: string; 
  value: number | string; 
  icon: React.ElementType; 
  color: string;
  highlight?: boolean;
  isText?: boolean;
}) {
  return (
    <Card className={`bg-gray-800 border-gray-700 ${highlight ? 'ring-1 ring-yellow-500/50' : ''}`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className={`text-2xl font-bold ${color} ${isText ? 'text-base' : ''}`}>
              {value}
            </p>
          </div>
          <Icon className={`h-8 w-8 ${color} opacity-50`} />
        </div>
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'healthy':
      return <Badge className="bg-green-500/20 text-green-400">Healthy</Badge>;
    case 'issues_found':
      return <Badge className="bg-yellow-500/20 text-yellow-400">Issues Found</Badge>;
    case 'error':
      return <Badge className="bg-red-500/20 text-red-400">Error</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function IssuesTable({
  issues,
  selectedIds,
  onToggleSelect,
  onViewDetails,
  showCheckbox
}: {
  issues: IntegrityIssue[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onViewDetails: (issue: IntegrityIssue) => void;
  showCheckbox: boolean;
}) {
  if (issues.length === 0) return null;

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700 hover:bg-transparent">
              {showCheckbox && <TableHead className="w-12" />}
              <TableHead className="text-gray-400">Severity</TableHead>
              <TableHead className="text-gray-400">Type</TableHead>
              <TableHead className="text-gray-400">Description</TableHead>
              <TableHead className="text-gray-400">Status</TableHead>
              <TableHead className="text-gray-400">Auto-Fix</TableHead>
              <TableHead className="text-gray-400 w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.map(issue => (
              <TableRow key={issue.id} className="border-gray-700">
                {showCheckbox && (
                  <TableCell>
                    {issue.auto_fix_available && issue.status === 'pending_review' && (
                      <Checkbox
                        checked={selectedIds.includes(issue.id)}
                        onCheckedChange={() => onToggleSelect(issue.id)}
                        className="border-gray-600"
                      />
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <Badge className={`${SEVERITY_BG_COLORS[issue.severity]} ${SEVERITY_COLORS[issue.severity]}`}>
                    {issue.severity}
                  </Badge>
                </TableCell>
                <TableCell className="text-gray-300 text-sm">
                  {ISSUE_TYPE_LABELS[issue.issue_type]}
                </TableCell>
                <TableCell className="text-gray-400 text-sm max-w-md truncate">
                  {issue.description}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`${STATUS_COLORS[issue.status]} border-current`}>
                    {issue.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  {issue.auto_fix_available ? (
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-gray-500" />
                  )}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewDetails(issue)}
                    className="text-gray-400 hover:text-white"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}