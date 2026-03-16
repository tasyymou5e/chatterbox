import { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, Eye, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getSecurityAlerts } from '@/utils/secureFamilyAccess';

interface SecurityAlertEventDetails {
  families_attempted?: number;
  failed_attempts?: number;
  [key: string]: unknown;
}

interface SecurityAlert {
  id: string;
  severity: string;
  created_at: string;
  event_details: SecurityAlertEventDetails | null;
}

export default function SecurityMonitoringWidget() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSecurityAlerts = useCallback(async (isMounted: boolean) => {
    try {
      setLoading(true);
      const securityAlerts = await getSecurityAlerts(24);
      if (isMounted) {
        // Type-safe mapping from API response
        const typedAlerts: SecurityAlert[] = securityAlerts.map((a: Record<string, unknown>) => ({
          id: String(a.id ?? ''),
          severity: String(a.severity ?? 'low'),
          created_at: String(a.created_at ?? new Date().toISOString()),
          event_details: a.event_details as SecurityAlertEventDetails | null,
        }));
        setAlerts(typedAlerts);
      }
    } catch (error) {
      if (isMounted) {
        console.error('Error fetching security alerts:', error);
      }
    } finally {
      if (isMounted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchSecurityAlerts(isMounted);
    return () => {
      isMounted = false;
    };
  }, [fetchSecurityAlerts]);

  const handleRefresh = useCallback(() => {
    fetchSecurityAlerts(true);
  }, [fetchSecurityAlerts]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Monitoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Monitoring
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Last 24 hours</span>
          </div>
          <Badge variant={alerts.length > 0 ? 'destructive' : 'default'}>
            {alerts.length} alerts
          </Badge>
        </div>

        {alerts.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {alerts.slice(0, 5).map((alert) => {
              const details = alert.event_details;
              const familiesAttempted = details?.families_attempted ?? 0;
              const failedAttempts = details?.failed_attempts ?? 0;
              return (
                <div key={alert.id} className="flex items-start gap-2 p-2 rounded border bg-card">
                  <AlertTriangle className={`h-4 w-4 mt-0.5 ${getSeverityColor(alert.severity)} text-white rounded`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      Suspicious Family Access Pattern
                    </p>
                    <p className="text-xs text-muted-foreground">
                      User attempted access to {familiesAttempted} families ({failedAttempts} failures)
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            {alerts.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                + {alerts.length - 5} more alerts
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <Shield className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No security alerts</p>
            <p className="text-xs text-muted-foreground">All family access patterns are normal</p>
          </div>
        )}

        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh} 
          className="w-full"
        >
          Refresh Alerts
        </Button>
      </CardContent>
    </Card>
  );
}