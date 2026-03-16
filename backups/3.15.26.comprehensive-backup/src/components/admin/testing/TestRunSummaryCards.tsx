/**
 * TestRunSummaryCards Component
 * 
 * @description Displays high-level metrics from imported test results
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  SkipForward,
  Activity,
  Percent
} from 'lucide-react';
import { formatDuration } from '@/utils/playwrightResultsParser';
import type { ParsedTestRun } from '@/types/testCoverage';

interface TestRunSummaryCardsProps {
  stats: ParsedTestRun['stats'];
}

export function TestRunSummaryCards({ stats }: TestRunSummaryCardsProps) {
  const passRate = stats.total > 0 
    ? Math.round((stats.passed / stats.total) * 100) 
    : 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
      {/* Total Tests */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Total Tests
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.total}</div>
        </CardContent>
      </Card>

      {/* Passed */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Passed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">{stats.passed}</div>
        </CardContent>
      </Card>

      {/* Failed */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <XCircle className="h-4 w-4 text-destructive" />
            Failed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-destructive">{stats.failed}</div>
        </CardContent>
      </Card>

      {/* Skipped */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <SkipForward className="h-4 w-4" />
            Skipped
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-muted-foreground">{stats.skipped}</div>
        </CardContent>
      </Card>

      {/* Duration */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Duration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{formatDuration(stats.duration)}</div>
        </CardContent>
      </Card>

      {/* Pass Rate */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Percent className="h-4 w-4" />
            Pass Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{passRate}%</div>
          <Progress 
            value={passRate} 
            className="mt-2 h-2"
          />
        </CardContent>
      </Card>
    </div>
  );
}
