/**
 * ErrorStatisticsCards Component
 * 
 * @description Displays error statistics in a grid of cards showing
 * total errors, critical errors, resolution rate, and error trends.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bug, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import type { ErrorStatistics } from '@/types/systemHealth';

interface ErrorStatisticsCardsProps {
  statistics: ErrorStatistics;
}

export const ErrorStatisticsCards = ({ statistics }: ErrorStatisticsCardsProps) => {
  const currentTrend = statistics.error_rate_trend?.[statistics.error_rate_trend.length - 1] || 0;
  const previousTrend = statistics.error_rate_trend?.[statistics.error_rate_trend.length - 2] || 0;
  const isIncreasing = currentTrend > previousTrend;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
          <Bug className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{statistics.total_errors}</div>
          <p className="text-xs text-muted-foreground">Last 7 days</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Critical Errors</CardTitle>
          <AlertTriangle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{statistics.critical_errors}</div>
          <p className="text-xs text-muted-foreground">Require immediate attention</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Resolution Rate</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">
            {statistics.total_errors > 0 
              ? Math.round((statistics.resolved_errors / statistics.total_errors) * 100)
              : 0}%
          </div>
          <p className="text-xs text-muted-foreground">{statistics.resolved_errors} resolved</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Error Trend</CardTitle>
          {isIncreasing ? (
            <TrendingUp className="h-4 w-4 text-destructive" />
          ) : (
            <TrendingDown className="h-4 w-4 text-green-500" />
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{currentTrend}</div>
          <p className="text-xs text-muted-foreground">Errors today</p>
        </CardContent>
      </Card>
    </div>
  );
};
