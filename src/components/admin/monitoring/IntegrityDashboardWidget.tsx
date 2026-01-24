import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Play,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { useIntegrityManagement } from '@/hooks/useIntegrityManagement';
import { formatDistanceToNow } from 'date-fns';

export function IntegrityDashboardWidget() {
  const { 
    latestCheck, 
    pendingIssues, 
    stats, 
    loading, 
    running, 
    runManualCheck 
  } = useIntegrityManagement();

  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-blue-400" />
            Data Integrity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full bg-gray-700" />
            <Skeleton className="h-4 w-3/4 bg-gray-700" />
            <Skeleton className="h-8 w-24 bg-gray-700" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const criticalCount = stats?.by_severity?.critical || 0;
  const highCount = stats?.by_severity?.high || 0;
  const pendingCount = pendingIssues.length;

  const getStatusIcon = () => {
    if (!latestCheck) return <Clock className="h-5 w-5 text-gray-400" />;
    if (latestCheck.status === 'healthy') return <CheckCircle2 className="h-5 w-5 text-green-400" />;
    if (latestCheck.status === 'error') return <AlertTriangle className="h-5 w-5 text-red-400" />;
    if (criticalCount > 0) return <AlertTriangle className="h-5 w-5 text-red-400" />;
    if (highCount > 0) return <AlertTriangle className="h-5 w-5 text-orange-400" />;
    return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
  };

  const getStatusText = () => {
    if (!latestCheck) return 'No checks run';
    if (latestCheck.status === 'healthy') return 'All checks passed';
    if (latestCheck.status === 'error') return 'Check failed';
    return `${latestCheck.issues_found} issue(s) found`;
  };

  const getStatusColor = () => {
    if (!latestCheck || latestCheck.status === 'healthy') return 'text-green-400';
    if (latestCheck.status === 'error' || criticalCount > 0) return 'text-red-400';
    if (highCount > 0) return 'text-orange-400';
    return 'text-yellow-400';
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-white">
            <ShieldCheck className="h-5 w-5 text-blue-400" />
            Data Integrity
          </CardTitle>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {pendingCount} pending
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className={`text-sm font-medium ${getStatusColor()}`}>
              {getStatusText()}
            </span>
          </div>
          {latestCheck && (
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(latestCheck.created_at), { addSuffix: true })}
            </span>
          )}
        </div>

        {/* Issue Summary */}
        {stats && pendingCount > 0 && (
          <div className="grid grid-cols-2 gap-2 text-sm">
            {criticalCount > 0 && (
              <div className="flex items-center gap-2 text-red-400">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                {criticalCount} Critical
              </div>
            )}
            {highCount > 0 && (
              <div className="flex items-center gap-2 text-orange-400">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                {highCount} High
              </div>
            )}
            {(stats.by_severity?.medium || 0) > 0 && (
              <div className="flex items-center gap-2 text-yellow-400">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                {stats.by_severity.medium} Medium
              </div>
            )}
            {(stats.by_severity?.low || 0) > 0 && (
              <div className="flex items-center gap-2 text-blue-400">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                {stats.by_severity.low} Low
              </div>
            )}
          </div>
        )}

        {/* Auto-fixable indicator */}
        {latestCheck && latestCheck.issues_auto_fixable > 0 && (
          <div className="text-xs text-gray-400 bg-gray-700/50 rounded px-2 py-1">
            {latestCheck.issues_auto_fixable} issue(s) can be auto-fixed
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={runManualCheck}
            disabled={running}
            className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            {running ? (
              <>
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1" />
                Run Check
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            asChild
            className="text-gray-400 hover:text-white hover:bg-gray-700"
          >
            <Link to="/admin/integrity">
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}