import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import {
  Shield,
  Wrench,
  Server,
  RefreshCw,
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { HealthScoreGauge } from '@/components/admin/health/HealthScoreGauge';
import { HealthSubsystemCard } from '@/components/admin/health/HealthSubsystemCard';
import { useDataHealthScore } from '@/hooks/useDataHealthScore';
import { cn } from '@/lib/utils';
import { GRADE_COLORS, GRADE_LABELS } from '@/types/dataHealth';
import type { ImpactingFactor } from '@/types/dataHealth';

export default function AdminDataHealth() {
  const {
    overallScore,
    integrityScore,
    repairScore,
    systemScore,
    grade,
    integrityDetails,
    repairDetails,
    systemDetails,
    scoreHistory,
    impactingFactors,
    loading,
    calculating,
    lastCalculated,
    recalculateScore
  } = useDataHealthScore();

  // Determine status for each subsystem
  const getStatus = (score: number) => {
    if (score >= 90) return 'healthy';
    if (score >= 60) return 'warning';
    return 'critical';
  };

  // Integrity metrics
  const integrityMetrics = useMemo(() => {
    if (!integrityDetails) return [];
    return [
      { 
        label: 'Critical Issues', 
        value: integrityDetails.critical_issues, 
        highlight: integrityDetails.critical_issues > 0 
      },
      { label: 'High Issues', value: integrityDetails.high_issues },
      { label: 'Medium Issues', value: integrityDetails.medium_issues },
      { label: 'Fixed (24h)', value: integrityDetails.fixed_24h },
      { 
        label: 'Last Check', 
        value: integrityDetails.last_check_time 
          ? formatDistanceToNow(new Date(integrityDetails.last_check_time), { addSuffix: true })
          : 'Never'
      }
    ];
  }, [integrityDetails]);

  // Repair metrics
  const repairMetrics = useMemo(() => {
    if (!repairDetails) return [];
    return [
      { label: 'Success Rate', value: `${repairDetails.success_rate}%`, highlight: true },
      { label: 'Total (7d)', value: repairDetails.total_repairs_7d },
      { label: 'Successful', value: repairDetails.successful_repairs_7d },
      { 
        label: 'Failed', 
        value: repairDetails.failed_repairs_7d, 
        highlight: repairDetails.failed_repairs_7d > 0 
      },
      { label: 'Trend', value: repairDetails.trending }
    ];
  }, [repairDetails]);

  // System metrics
  const systemMetrics = useMemo(() => {
    if (!systemDetails) return [];
    return [
      { label: 'Uptime', value: `${systemDetails.average_uptime}%`, highlight: true },
      { label: 'Healthy Services', value: systemDetails.services_healthy },
      { 
        label: 'Degraded', 
        value: systemDetails.services_degraded, 
        highlight: systemDetails.services_degraded > 0 
      },
      { label: 'Avg Response', value: `${systemDetails.average_response_time}ms` },
      { label: 'Error Rate', value: `${systemDetails.error_rate_24h}%` }
    ];
  }, [systemDetails]);

  const getSeverityIcon = (severity: ImpactingFactor['severity']) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: ImpactingFactor['severity']) => {
    const variants: Record<string, string> = {
      critical: 'bg-red-500/10 text-red-500 border-red-500/30',
      high: 'bg-orange-500/10 text-orange-500 border-orange-500/30',
      medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
      low: 'bg-blue-500/10 text-blue-500 border-blue-500/30'
    };
    return (
      <Badge variant="outline" className={variants[severity]}>
        {severity}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8 space-y-8">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Data Health Dashboard</h1>
            <p className="text-muted-foreground">
              Comprehensive view of system integrity, auto-repair, and health metrics
            </p>
          </div>
        </div>
        <Button
          onClick={recalculateScore}
          disabled={calculating}
          className="flex items-center gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', calculating && 'animate-spin')} />
          {calculating ? 'Calculating...' : 'Recalculate'}
        </Button>
      </div>

      {/* Overall Score Hero */}
      <Card className="bg-gradient-to-br from-card to-muted/30">
        <CardContent className="pt-8 pb-8">
          <div className="flex flex-col md:flex-row items-center justify-center gap-8">
            <HealthScoreGauge 
              score={overallScore} 
              grade={grade} 
              size="large"
              animated={true}
            />
            <div className="text-center md:text-left space-y-2">
              <h2 className="text-2xl font-semibold">Overall Health Score</h2>
              <p className={cn('text-4xl font-bold', GRADE_COLORS[grade])}>
                {GRADE_LABELS[grade]}
              </p>
              {lastCalculated && (
                <p className="text-sm text-muted-foreground flex items-center gap-2 justify-center md:justify-start">
                  <Clock className="h-4 w-4" />
                  Last calculated {formatDistanceToNow(lastCalculated, { addSuffix: true })}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subsystem Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <HealthSubsystemCard
          title="Data Integrity"
          icon={Shield}
          score={integrityScore}
          status={getStatus(integrityScore)}
          trend={integrityDetails?.fixed_24h && integrityDetails.fixed_24h > 0 ? 'up' : 'stable'}
          metrics={integrityMetrics}
        />
        <HealthSubsystemCard
          title="Auto-Repair"
          icon={Wrench}
          score={repairScore}
          status={getStatus(repairScore)}
          trend={repairDetails?.trending === 'improving' ? 'up' : 
                 repairDetails?.trending === 'declining' ? 'down' : 'stable'}
          metrics={repairMetrics}
        />
        <HealthSubsystemCard
          title="System Health"
          icon={Server}
          score={systemScore}
          status={getStatus(systemScore)}
          trend={systemDetails?.services_down && systemDetails.services_down > 0 ? 'down' : 'stable'}
          metrics={systemMetrics}
        />
      </div>

      {/* Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>7-Day Score Trend</CardTitle>
          <CardDescription>
            Historical view of health scores across all subsystems
          </CardDescription>
        </CardHeader>
        <CardContent>
          {scoreHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={scoreHistory}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  domain={[0, 100]} 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="overall" 
                  name="Overall"
                  stroke="#8b5cf6" 
                  strokeWidth={3}
                  dot={{ fill: '#8b5cf6' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="integrity" 
                  name="Integrity"
                  stroke="#22c55e" 
                  strokeWidth={2}
                  dot={{ fill: '#22c55e' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="repair" 
                  name="Repair"
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="system" 
                  name="System"
                  stroke="#f97316" 
                  strokeWidth={2}
                  dot={{ fill: '#f97316' }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              <p>No historical data yet. Scores will appear after the first calculation.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Impacting Factors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Factors Impacting Score</CardTitle>
          <CardDescription>
            Issues currently affecting your data health score
          </CardDescription>
        </CardHeader>
        <CardContent>
          {impactingFactors.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Impact</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {impactingFactors.map((factor, index) => (
                  <TableRow key={index}>
                    <TableCell>{getSeverityIcon(factor.severity)}</TableCell>
                    <TableCell>{getSeverityBadge(factor.severity)}</TableCell>
                    <TableCell className="capitalize">{factor.category}</TableCell>
                    <TableCell>{factor.description}</TableCell>
                    <TableCell className="text-right font-medium text-red-500">
                      -{factor.impact_points} pts
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p className="text-lg font-medium">No Issues Detected</p>
              <p>All systems are operating optimally.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="flex flex-wrap gap-4 justify-center">
        <Button variant="outline" asChild>
          <Link to="/admin/integrity">View Integrity Issues</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/admin/system-monitoring">System Monitoring</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/admin/dashboard">Back to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
