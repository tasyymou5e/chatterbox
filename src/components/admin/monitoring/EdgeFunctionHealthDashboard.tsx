import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  RotateCw,
  Settings,
  TrendingUp,
  XCircle,
  Zap,
} from 'lucide-react';
import { useEdgeFunctionHealthHistory } from '@/hooks/useEdgeFunctionHealthHistory';
import { EdgeFunctionHealthHistory } from './EdgeFunctionHealthHistory';
import { EdgeFunctionAlertConfig } from './EdgeFunctionAlertConfig';
import { formatDistanceToNow } from 'date-fns';

export function EdgeFunctionHealthDashboard() {
  const {
    summaries,
    alertConfigs,
    criticalFunctions,
    loading,
    triggerHealthCheck,
    triggerManualRecovery,
    isCheckRunning,
  } = useEdgeFunctionHealthHistory();

  const [activeTab, setActiveTab] = useState('overview');

  // Calculate overall statistics
  const totalFunctions = summaries.length;
  const healthyCount = summaries.filter(s => s.currentStatus === 'healthy').length;
  const unhealthyCount = summaries.filter(s => s.currentStatus === 'unhealthy').length;
  const timeoutCount = summaries.filter(s => s.currentStatus === 'timeout').length;
  const unknownCount = summaries.filter(s => s.currentStatus === 'unknown').length;
  
  const overallHealthPercent = totalFunctions > 0 
    ? Math.round((healthyCount / totalFunctions) * 100) 
    : 0;

  const avgResponseTime = summaries.length > 0
    ? Math.round(summaries.reduce((sum, s) => sum + s.avgResponseTime, 0) / summaries.length)
    : 0;

  // Critical functions with 5+ consecutive failures
  const criticalFunctionsList = summaries.filter(s => s.isCritical);
  
  // Functions needing recovery (3-4 failures)
  const warningFunctions = summaries.filter(s => s.consecutiveFailures >= 3 && s.consecutiveFailures < 5);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-[hsl(var(--chart-2))]" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'timeout':
        return <Clock className="h-4 w-4 text-[hsl(var(--chart-4))]" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      healthy: 'default',
      unhealthy: 'destructive',
      timeout: 'secondary',
      unknown: 'outline',
    };
    return (
      <Badge variant={variants[status] || 'outline'} className="capitalize">
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Critical Functions Alert */}
      {criticalFunctionsList.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              <strong>{criticalFunctionsList.length} critical function(s)</strong> have 5+ consecutive failures and require attention: {criticalFunctionsList.map(f => f.functionName).join(', ')}
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Warning Alert for functions needing recovery */}
      {warningFunctions.length > 0 && (
        <Alert>
          <RotateCw className="h-4 w-4" />
          <AlertDescription>
            <strong>{warningFunctions.length} function(s)</strong> are experiencing issues and automatic recovery is in progress: {warningFunctions.map(f => f.functionName).join(', ')}
          </AlertDescription>
        </Alert>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Edge Function Health</h2>
          <p className="text-muted-foreground">
            Automated health monitoring with hourly checks and auto-recovery
          </p>
        </div>
        <Button
          onClick={() => triggerHealthCheck()}
          disabled={isCheckRunning}
          className="gap-2"
        >
          {isCheckRunning ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Run Health Check
            </>
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Overall Health</CardDescription>
            <CardTitle className="text-4xl">{overallHealthPercent}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={overallHealthPercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {healthyCount} of {totalFunctions} functions healthy
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Response Time</CardDescription>
            <CardTitle className="text-4xl flex items-center gap-2">
              {avgResponseTime}
              <span className="text-lg font-normal text-muted-foreground">ms</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-[hsl(var(--chart-2))]" />
              <span className="text-muted-foreground">Across all functions</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Status Breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-[hsl(var(--chart-2))]" />
                <span>{healthyCount} Healthy</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" />
                <span>{unhealthyCount} Unhealthy</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-[hsl(var(--chart-4))]" />
                <span>{timeoutCount} Timeout</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                <span>{unknownCount} Unknown</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={criticalFunctions.length > 0 ? 'border-destructive' : ''}>
          <CardHeader className="pb-2">
            <CardDescription>Critical Alerts</CardDescription>
            <CardTitle className="text-4xl">{criticalFunctions.length}</CardTitle>
          </CardHeader>
          <CardContent>
            {criticalFunctions.length > 0 ? (
              <p className="text-xs text-destructive">
                {criticalFunctions.join(', ')}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                No functions with 5+ consecutive failures
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            Configuration
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Function Status</CardTitle>
              <CardDescription>
                Current health status of all edge functions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summaries.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No health data available yet.</p>
                  <p className="text-sm">Run a health check to see function status.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {summaries.map((summary) => (
                    <div
                      key={summary.functionName}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getStatusIcon(summary.currentStatus)}
                        <div>
                          <p className="font-medium">{summary.functionName}</p>
                          <p className="text-xs text-muted-foreground">
                            {summary.lastChecked 
                              ? `Last checked ${formatDistanceToNow(new Date(summary.lastChecked), { addSuffix: true })}`
                              : 'Never checked'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">{summary.avgResponseTime}ms</p>
                          <p className="text-xs text-muted-foreground">avg response</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{summary.successRate}%</p>
                          <p className="text-xs text-muted-foreground">success rate</p>
                        </div>
                        {getStatusBadge(summary.currentStatus)}
                        {summary.consecutiveFailures > 0 && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {summary.consecutiveFailures} failures
                          </Badge>
                        )}
                        {summary.isCritical && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => triggerManualRecovery(summary.functionName)}
                            disabled={isCheckRunning}
                            className="gap-1"
                          >
                            <RotateCw className="h-3 w-3" />
                            Recover
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <EdgeFunctionHealthHistory />
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <EdgeFunctionAlertConfig 
            configs={alertConfigs}
            summaries={summaries}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
