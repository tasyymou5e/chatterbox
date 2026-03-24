/**
 * Comprehensive security monitoring dashboard with robust error handling
 * and automatic retry with exponential backoff for edge function calls
 */
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { invokeWithRetry } from '@/hooks/useRetryWithBackoff';
import { Shield, AlertTriangle, Activity, Lock, Users, Database, RefreshCw } from 'lucide-react';
import type { SecurityMetrics, SecurityTest, ThreatAnalysis } from '@/types/security';

// Default metrics when API fails
const DEFAULT_METRICS: SecurityMetrics = {
  total_alerts: 0,
  rls_violations: 0,
  failed_activities: 0,
  system_errors: 0,
  severity_breakdown: { critical: 0, high: 0, medium: 0, low: 0 },
  top_threat_indicators: []
};

export const SecurityDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics>(DEFAULT_METRICS);
  const [tests, setTests] = useState<SecurityTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const { toast } = useToast();

  const loadSecurityMetrics = useCallback(async (showToast = false) => {
    try {
      setError(null);
      
      // Use retry with exponential backoff for resilience
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await invokeWithRetry<any>(
        () => supabase.functions.invoke('security-monitoring', {
          body: { action: 'generate_security_report' }
        }),
        {
          maxRetries: 3,
          initialDelayMs: 1000,
          backoffMultiplier: 2,
          onRetry: (attempt, err, nextDelay) => {
            console.warn(`Security metrics fetch attempt ${attempt} failed, retrying in ${nextDelay}ms...`, err);
          }
        }
      );
      
      // Handle the nested response structure from the edge function
      const newMetrics: SecurityMetrics = {
        total_alerts: data?.summary?.total_alerts ?? 0,
        rls_violations: data?.summary?.rls_violations ?? 0,
        failed_activities: data?.summary?.failed_activities ?? 0,
        system_errors: data?.summary?.system_errors ?? 0,
        severity_breakdown: data?.severity_breakdown ?? {
          critical: 0,
          high: 0,
          medium: 0,
          low: 0
        },
        top_threat_indicators: data?.top_threat_indicators ?? [],
        threat_analysis: data?.threat_analysis ?? undefined
      };
      
      setMetrics(newMetrics);
      
      if (showToast) {
        toast({
          title: "Metrics Refreshed",
          description: "Security metrics updated successfully"
        });
      }
    } catch (err) {
      console.error('Failed to load security metrics after retries:', err);
      // Use default metrics on error, don't block UI
      setMetrics(DEFAULT_METRICS);
      setError('Unable to load live metrics after multiple attempts. Showing defaults.');
      
      // Only show toast on manual retry
      if (showToast) {
        toast({
          title: "Metrics Unavailable",
          description: "Using default values. Try again later.",
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadSecurityMetrics();
    
    // Set up real-time monitoring with error handling
    let channel: ReturnType<typeof supabase.channel> | null = null;
    
    try {
      channel = supabase
        .channel('security_alerts')
        .on('broadcast', { event: 'new_alert' }, (payload) => {
          toast({
            title: "Security Alert",
            description: `New ${payload.payload?.severity || 'unknown'} security event detected`,
            variant: payload.payload?.severity === 'critical' ? 'destructive' : 'default'
          });
          loadSecurityMetrics();
        })
        .subscribe();
    } catch (err) {
      console.warn('Failed to set up real-time monitoring:', err);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [loadSecurityMetrics, toast]);

  const runSecurityTests = async () => {
    setIsRunningTests(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await invokeWithRetry<any>(
        () => supabase.functions.invoke('security-testing', {
          body: { action: 'run_security_tests' }
        }),
        {
          maxRetries: 3,
          initialDelayMs: 1000,
          backoffMultiplier: 2,
          onRetry: (attempt, err, nextDelay) => {
            console.warn(`Security tests attempt ${attempt} failed, retrying in ${nextDelay}ms...`, err);
          }
        }
      );
      
      setTests(data?.tests || []);
      toast({
        title: "Security Tests Complete",
        description: `${data?.summary?.passed || 0}/${data?.summary?.total_tests || 0} tests passed`,
        variant: (data?.summary?.critical_failures || 0) > 0 ? 'destructive' : 'default'
      });
    } catch (err) {
      console.error('Failed to run security tests after retries:', err);
      toast({
        title: "Tests Unavailable",
        description: "Security testing service is currently unavailable after multiple attempts",
        variant: "destructive"
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  const analyzeAccessPatterns = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await invokeWithRetry<any>(
        () => supabase.functions.invoke('security-monitoring', {
          body: { action: 'analyze_access_patterns' }
        }),
        {
          maxRetries: 3,
          initialDelayMs: 1000,
          backoffMultiplier: 2,
          onRetry: (attempt, err, nextDelay) => {
            console.warn(`Pattern analysis attempt ${attempt} failed, retrying in ${nextDelay}ms...`, err);
          }
        }
      );
      
      toast({
        title: "Pattern Analysis Complete",
        description: `${data?.suspicious_patterns || 0} suspicious patterns detected`,
        variant: (data?.suspicious_patterns || 0) > 0 ? 'destructive' : 'default'
      });
      
      loadSecurityMetrics();
    } catch (err) {
      console.error('Failed to analyze patterns after retries:', err);
      toast({
        title: "Analysis Unavailable",
        description: "Pattern analysis service is currently unavailable after multiple attempts",
        variant: "destructive"
      });
    }
  };

  const getSeverityColor = (severity: string): "destructive" | "default" | "secondary" => {
    switch (severity) {
      case 'critical': 
      case 'high': 
        return 'destructive';
      case 'medium': 
        return 'default';
      default: 
        return 'secondary';
    }
  };

  // Show skeleton loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-8 w-8 text-primary animate-pulse" />
            <div className="h-8 w-64 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="h-16 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Security Operations Center</h1>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => loadSecurityMetrics(true)} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={analyzeAccessPatterns} variant="outline">
            <Activity className="h-4 w-4 mr-2" />
            Analyze Patterns
          </Button>
          <Button 
            onClick={runSecurityTests} 
            disabled={isRunningTests}
            variant="outline"
          >
            <Lock className="h-4 w-4 mr-2" />
            {isRunningTests ? 'Running...' : 'Run Tests'}
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Limited Data</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => loadSecurityMetrics(true)}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Security Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total_alerts}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RLS Violations</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.rls_violations}</div>
            <p className="text-xs text-muted-foreground">Policy bypasses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Activities</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.failed_activities}</div>
            <p className="text-xs text-muted-foreground">Auth failures</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.system_errors}</div>
            <p className="text-xs text-muted-foreground">Technical issues</p>
          </CardContent>
        </Card>
      </div>

      {/* Severity Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Threat Severity Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
              <Badge variant="destructive">Critical</Badge>
              <span className="text-2xl font-bold">{metrics.severity_breakdown?.critical || 0}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="destructive">High</Badge>
              <span className="text-2xl font-bold">{metrics.severity_breakdown?.high || 0}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="default">Medium</Badge>
              <span className="text-2xl font-bold">{metrics.severity_breakdown?.medium || 0}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">Low</Badge>
              <span className="text-2xl font-bold">{metrics.severity_breakdown?.low || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Views */}
      <Tabs defaultValue="alerts" className="w-full">
        <TabsList>
          <TabsTrigger value="alerts">Recent Alerts</TabsTrigger>
          <TabsTrigger value="tests">Security Tests</TabsTrigger>
          <TabsTrigger value="threats">Threat Indicators</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Security Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              {!metrics.top_threat_indicators || metrics.top_threat_indicators.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No recent alerts</p>
                  <p className="text-sm mt-1">Security monitoring is active</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {metrics.top_threat_indicators.map((alert, index) => (
                    <Alert key={index}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle className="flex items-center justify-between">
                        <span>{alert.event_type}</span>
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </AlertTitle>
                      <AlertDescription>
                        {typeof alert.event_details === 'object' 
                          ? JSON.stringify(alert.event_details, null, 2)
                          : String(alert.event_details)}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Security Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              {tests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Lock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No tests run yet</p>
                  <p className="text-sm mt-1">Click "Run Tests" to start security testing</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {tests.map((test, index) => (
                    <Alert key={index}>
                      <Lock className="h-4 w-4" />
                      <AlertTitle className="flex items-center justify-between">
                        <span>{test.name}</span>
                        <div className="flex items-center space-x-2">
                          <Badge variant={test.passed ? 'default' : getSeverityColor(test.severity)}>
                            {test.passed ? 'PASS' : 'FAIL'}
                          </Badge>
                          <Badge variant="secondary">
                            {test.execution_time_ms}ms
                          </Badge>
                        </div>
                      </AlertTitle>
                      <AlertDescription>
                        {test.description}
                        {test.error_message && (
                          <div className="mt-2 text-destructive font-mono text-sm">
                            {test.error_message}
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="threats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Threat Indicators & Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Real-time Monitoring Active</AlertTitle>
                  <AlertDescription>
                    Security monitoring is actively analyzing access patterns, 
                    RLS policy violations, and suspicious activities in real-time.
                  </AlertDescription>
                </Alert>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Pattern Detection</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Monitoring user access patterns for anomalies
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Policy Enforcement</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        Tracking RLS policy violations and bypass attempts
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
