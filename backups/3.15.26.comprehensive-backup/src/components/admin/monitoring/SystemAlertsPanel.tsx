/**
 * SystemAlertsPanel Component
 * 
 * @description Displays a list of active system alerts with severity badges,
 * descriptions, and actions to acknowledge alerts.
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  Bug, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Activity,
  Eye
} from 'lucide-react';
import type { SystemAlert } from '@/types/systemHealth';

interface SystemAlertsPanelProps {
  alerts: SystemAlert[];
  onAcknowledgeAlert: (alertId: string) => void;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'bg-destructive text-destructive-foreground';
    case 'high': return 'bg-orange-500 text-white';
    case 'medium': return 'bg-yellow-500 text-black';
    case 'low': return 'bg-blue-500 text-white';
    default: return 'bg-secondary text-secondary-foreground';
  }
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'critical': return <AlertTriangle className="h-4 w-4" />;
    case 'high': return <XCircle className="h-4 w-4" />;
    case 'medium': return <Bug className="h-4 w-4" />;
    case 'low': return <Activity className="h-4 w-4" />;
    default: return <Eye className="h-4 w-4" />;
  }
};

export const SystemAlertsPanel = ({ alerts, onAcknowledgeAlert }: SystemAlertsPanelProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>System Alerts</CardTitle>
        <CardDescription>
          Active system alerts and notifications
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {alerts.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">No active alerts</p>
              </div>
            ) : (
              alerts.map((alert) => (
                <Card key={alert.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className={getSeverityColor(alert.severity)}>
                          {getSeverityIcon(alert.severity)}
                          <span className="ml-1">{alert.severity.toUpperCase()}</span>
                        </Badge>
                        <Badge variant="outline">{alert.alert_type}</Badge>
                        {alert.acknowledged && (
                          <Badge variant="secondary">Acknowledged</Badge>
                        )}
                      </div>
                      <h4 className="font-medium mb-1">{alert.title}</h4>
                      {alert.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {alert.description}
                        </p>
                      )}
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(alert.created_at).toLocaleString()}
                        </p>
                        {alert.triggered_by && (
                          <p>Triggered by: {alert.triggered_by}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {!alert.acknowledged && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onAcknowledgeAlert(alert.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Acknowledge
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
