/**
 * Comprehensive security monitoring dashboard
 */
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Shield, AlertTriangle, Activity, Lock, Users, Database } from 'lucide-react';

interface SecurityMetrics {
  total_alerts: number;
  rls_violations: number;
  failed_activities: number;
  system_errors: number;
  severity_breakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  top_threat_indicators: any[];
}

interface SecurityTest {
  name: string;
  description: string;
  test_type: string;
  severity: string;
  passed: boolean;
  error_message?: string;
  execution_time_ms: number;
}

export const SecurityDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [tests, setTests] = useState<SecurityTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadSecurityMetrics();
    
    // Set up real-time monitoring
    const channel = supabase
      .channel('security_alerts')
      .on('broadcast', { event: 'new_alert' }, (payload) => {
        toast({
          title: "Security Alert",
          description: `New ${payload.payload.severity} security event detected`,
          variant: payload.payload.severity === 'critical' ? 'destructive' : 'default'
        });
        loadSecurityMetrics(); // Refresh metrics
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadSecurityMetrics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('security-monitoring', {
        body: { action: 'generate_security_report' }
      });

      if (error) throw error;
      
      // Handle the nested response structure from the edge function
      const metrics: SecurityMetrics = {
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
        top_threat_indicators: data?.top_threat_indicators ?? []
      };
      
      setMetrics(metrics);
    } catch (error) {
      console.error('Failed to load security metrics:', error);
      // Set default metrics on error to still render the UI
      setMetrics({
        total_alerts: 0,
        rls_violations: 0,
        failed_activities: 0,
        system_errors: 0,
        severity_breakdown: { critical: 0, high: 0, medium: 0, low: 0 },
        top_threat_indicators: []
      });
      toast({
        title: "Error",
        description: "Failed to load security metrics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const runSecurityTests = async () => {
    setIsRunningTests(true);
    try {
      const { data, error } = await supabase.functions.invoke('security-testing', {
        body: { action: 'run_security_tests' }
      });

      if (error) throw error;
      
      setTests(data.tests);
      toast({
        title: "Security Tests Complete",
        description: `${data.summary.passed}/${data.summary.total_tests} tests passed`,
        variant: data.summary.critical_failures > 0 ? 'destructive' : 'default'
      });
    } catch (error) {
      console.error('Failed to run security tests:', error);
      toast({
        title: "Error",
        description: "Failed to run security tests",
        variant: "destructive"
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  const analyzeAccessPatterns = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('security-monitoring', {
        body: { action: 'analyze_access_patterns' }
      });

      if (error) throw error;
      
      toast({
        title: "Pattern Analysis Complete",
        description: `${data.suspicious_patterns} suspicious patterns detected`,
        variant: data.suspicious_patterns > 0 ? 'destructive' : 'default'
      });
      
      loadSecurityMetrics(); // Refresh metrics
    } catch (error) {
      console.error('Failed to analyze patterns:', error);
      toast({
        title: "Error",
        description: "Failed to analyze access patterns",
        variant: "destructive"
      });
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
            {isRunningTests ? 'Running Tests...' : 'Run Security Tests'}
          </Button>
        </div>
      </div>

      {/* Security Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.total_alerts || 0}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RLS Violations</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.rls_violations || 0}</div>
            <p className="text-xs text-muted-foreground">Policy bypasses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Activities</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.failed_activities || 0}</div>
            <p className="text-xs text-muted-foreground">Authentication failures</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Errors</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.system_errors || 0}</div>
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
          <div className="flex space-x-4">
            <div className="flex items-center space-x-2">
              <Badge variant="destructive">Critical</Badge>
              <span className="text-2xl font-bold">{metrics?.severity_breakdown?.critical || 0}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="destructive">High</Badge>
              <span className="text-2xl font-bold">{metrics?.severity_breakdown?.high || 0}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="default">Medium</Badge>
              <span className="text-2xl font-bold">{metrics?.severity_breakdown?.medium || 0}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary">Low</Badge>
              <span className="text-2xl font-bold">{metrics?.severity_breakdown?.low || 0}</span>
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
              {metrics?.top_threat_indicators?.length === 0 ? (
                <p className="text-muted-foreground">No recent alerts</p>
              ) : (
                <div className="space-y-2">
                  {metrics?.top_threat_indicators?.map((alert, index) => (
                    <Alert key={index}>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle className="flex items-center justify-between">
                        <span>{alert.event_type}</span>
                        <Badge variant={getSeverityColor(alert.severity)}>
                          {alert.severity}
                        </Badge>
                      </AlertTitle>
                      <AlertDescription>
                        {JSON.stringify(alert.event_details)}
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
                <p className="text-muted-foreground">No tests run yet. Click "Run Security Tests" to start.</p>
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