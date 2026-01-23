/**
 * EdgeFunctionHealthPanel Component
 * 
 * Displays edge function deployment verification status with health checks
 */
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Loader2,
  Zap,
  Clock,
  Shield
} from 'lucide-react';
import { useEdgeFunctionHealth } from '@/hooks/useEdgeFunctionHealth';
import type { EdgeFunctionStatus } from '@/types/edgeFunctionHealth';

const getStatusIcon = (status: EdgeFunctionStatus['status']) => {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="h-4 w-4 text-primary" />;
    case 'unhealthy':
      return <XCircle className="h-4 w-4 text-destructive" />;
    case 'checking':
      return <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />;
    default:
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusBadgeVariant = (status: EdgeFunctionStatus['status']): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'healthy':
      return 'default';
    case 'unhealthy':
      return 'destructive';
    case 'checking':
      return 'secondary';
    default:
      return 'outline';
  }
};

const formatResponseTime = (ms: number | null): string => {
  if (ms === null) return '-';
  if (ms < 100) return `${ms}ms`;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
};

export const EdgeFunctionHealthPanel = () => {
  const {
    functions,
    summary,
    isVerifying,
    lastVerified,
    verifyAllFunctions,
    verifySingleFunction,
  } = useEdgeFunctionHealth();

  // Run initial verification on mount
  useEffect(() => {
    if (functions.length === 0) {
      verifyAllFunctions();
    }
  }, [functions.length, verifyAllFunctions]);

  const healthPercentage = summary.total > 0 
    ? Math.round((summary.healthy / summary.total) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <CardTitle>Edge Function Health</CardTitle>
            </div>
            <Button 
              onClick={() => verifyAllFunctions()} 
              disabled={isVerifying}
              size="sm"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Verify All
                </>
              )}
            </Button>
          </div>
          <CardDescription>
            Deployment verification status for all edge functions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Health Summary */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-foreground">{summary.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-primary/10">
              <div className="text-2xl font-bold text-primary">{summary.healthy}</div>
              <div className="text-xs text-muted-foreground">Healthy</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-destructive/10">
              <div className="text-2xl font-bold text-destructive">{summary.unhealthy}</div>
              <div className="text-xs text-muted-foreground">Unhealthy</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/50">
              <div className="text-2xl font-bold text-muted-foreground">{summary.unknown}</div>
              <div className="text-xs text-muted-foreground">Unknown</div>
            </div>
          </div>

          {/* Health Progress Bar */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Overall Health</span>
              <span className="font-medium">{healthPercentage}%</span>
            </div>
            <Progress value={healthPercentage} className="h-2" />
          </div>

          {lastVerified && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Last verified: {new Date(lastVerified).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Functions List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Function Status</CardTitle>
          <CardDescription>
            Individual deployment status for each edge function
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {functions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No functions verified yet</p>
                <Button 
                  onClick={() => verifyAllFunctions()} 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                >
                  Run Verification
                </Button>
              </div>
            ) : (
              functions.map((func) => (
                <div
                  key={func.name}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(func.status)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{func.name}</span>
                        {func.hasHealthEndpoint && (
                          <Shield className="h-3 w-3 text-primary" aria-label="Has health endpoint" />
                        )}
                      </div>
                      {func.error && (
                        <p className="text-xs text-destructive mt-0.5">{func.error}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {func.responseTimeMs !== null && (
                      <span className="text-xs text-muted-foreground">
                        {formatResponseTime(func.responseTimeMs)}
                      </span>
                    )}
                    <Badge variant={getStatusBadgeVariant(func.status)} className="text-xs capitalize">
                      {func.status}
                    </Badge>
                    <Button
                      onClick={() => verifySingleFunction(func.name)}
                      variant="ghost"
                      size="sm"
                      disabled={func.status === 'checking'}
                      className="h-7 w-7 p-0"
                    >
                      {func.status === 'checking' ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
