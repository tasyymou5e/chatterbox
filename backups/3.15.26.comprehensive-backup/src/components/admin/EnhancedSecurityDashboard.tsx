import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Eye, Activity, Users, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { monitorChildAccountSecurity } from '@/utils/enhancedChildAccountSecurity';

interface SecurityMetrics {
  totalUsers: number;
  activeUsers: number;
  suspiciousActivities: number;
  failedLogins: number;
  dataBreachAttempts: number;
  childAccountAlerts: number;
}

interface SecurityAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  resolved: boolean;
}

export default function EnhancedSecurityDashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SecurityMetrics>({
    totalUsers: 0,
    activeUsers: 0,
    suspiciousActivities: 0,
    failedLogins: 0,
    dataBreachAttempts: 0,
    childAccountAlerts: 0
  });
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [childAccountMonitoring, setChildAccountMonitoring] = useState({
    suspiciousActivity: false,
    alerts: [] as string[]
  });

  useEffect(() => {
    loadSecurityData();
    const interval = setInterval(loadSecurityData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSecurityData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadSecurityMetrics(),
        loadSecurityAlerts(),
        loadChildAccountMonitoring()
      ]);
    } catch (error) {
      console.error('Error loading security data:', error);
      toast({
        variant: 'destructive',
        title: 'Security Data Error',
        description: 'Failed to load security monitoring data'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSecurityMetrics = async () => {
    const [usersResult, activitiesResult, loginsResult] = await Promise.allSettled([
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('security_audit_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .in('severity', ['high', 'critical']),
      supabase.from('user_activity_logs')
        .select('id', { count: 'exact', head: true })
        .eq('success', false)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    ]);

    setMetrics(prev => ({
      ...prev,
      totalUsers: usersResult.status === 'fulfilled' ? usersResult.value.count || 0 : 0,
      suspiciousActivities: activitiesResult.status === 'fulfilled' ? activitiesResult.value.count || 0 : 0,
      failedLogins: loginsResult.status === 'fulfilled' ? loginsResult.value.count || 0 : 0
    }));
  };

  const loadSecurityAlerts = async () => {
    const { data } = await supabase
      .from('security_audit_logs')
      .select('id, event_type, severity, event_details, created_at')
      .in('severity', ['high', 'critical'])
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      const formattedAlerts: SecurityAlert[] = data.map(log => ({
        id: log.id,
        type: log.event_type,
        severity: log.severity as 'low' | 'medium' | 'high' | 'critical',
        message: typeof log.event_details === 'object' && log.event_details && 'message' in log.event_details 
          ? String(log.event_details.message) 
          : 'Security event detected',
        timestamp: log.created_at,
        resolved: false
      }));
      setAlerts(formattedAlerts);
    }
  };

  const loadChildAccountMonitoring = async () => {
    const monitoring = await monitorChildAccountSecurity();
    setChildAccountMonitoring(monitoring);
    
    if (monitoring.suspiciousActivity) {
      setMetrics(prev => ({
        ...prev,
        childAccountAlerts: monitoring.alerts.length
      }));
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium': return <Eye className="h-4 w-4 text-yellow-500" />;
      default: return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Enhanced Security Dashboard
        </h2>
        <Button onClick={loadSecurityData} disabled={loading} size="sm">
          Refresh Data
        </Button>
      </div>

      {/* Security Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-2xl font-bold">{metrics.totalUsers}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Suspicious Activities (24h)</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.suspiciousActivities}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Failed Logins (24h)</p>
                <p className="text-2xl font-bold text-red-600">{metrics.failedLogins}</p>
              </div>
              <Lock className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Child Account Security */}
      {(childAccountMonitoring.suspiciousActivity || childAccountMonitoring.alerts.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-orange-600">Child Account Security Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {childAccountMonitoring.alerts.map((alert, index) => (
                <Alert key={index}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{alert}</AlertDescription>
                </Alert>
              ))}
              {childAccountMonitoring.suspiciousActivity && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Suspicious Activity:</strong> Unusual patterns detected in child account management.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Security Alerts */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Security Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-muted-foreground">No security alerts in the last 7 days.</p>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  {getSeverityIcon(alert.severity)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity.toUpperCase()}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium">{alert.type}</p>
                    <p className="text-sm text-muted-foreground">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Security Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Action Required:</strong> Enable "Leaked Password Protection" in your Supabase 
                Authentication settings to prevent users from using compromised passwords.
              </AlertDescription>
            </Alert>
            
            {metrics.failedLogins > 10 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>High Alert:</strong> Elevated failed login attempts detected. 
                  Consider implementing additional rate limiting.
                </AlertDescription>
              </Alert>
            )}

            {metrics.suspiciousActivities > 5 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Monitor:</strong> Multiple suspicious activities detected. 
                  Review security audit logs for patterns.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}