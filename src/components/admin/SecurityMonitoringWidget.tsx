import { useState, useEffect } from 'react';
import { Shield, AlertTriangle, Eye, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getSecurityAlerts } from '@/utils/secureFamilyAccess';

export default function SecurityMonitoringWidget() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSecurityAlerts();
  }, []);

  const fetchSecurityAlerts = async () => {
    try {
      setLoading(true);
      const securityAlerts = await getSecurityAlerts(24);
      setAlerts(securityAlerts);
    } catch (error) {
      console.error('Error fetching security alerts:', error);
    } finally {
      setLoading(false);
    }
  };

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
              return (
                <div key={alert.id} className="flex items-start gap-2 p-2 rounded border bg-card">
                  <AlertTriangle className={`h-4 w-4 mt-0.5 ${getSeverityColor(alert.severity)} text-white rounded`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      Suspicious Family Access Pattern
                    </p>
                    <p className="text-xs text-muted-foreground">
                      User attempted access to {details.families_attempted} families ({details.failed_attempts} failures)
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
          onClick={fetchSecurityAlerts} 
          className="w-full"
        >
          Refresh Alerts
        </Button>
      </CardContent>
    </Card>
  );
}