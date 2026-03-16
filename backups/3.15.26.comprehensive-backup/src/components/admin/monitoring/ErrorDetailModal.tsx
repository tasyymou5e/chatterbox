/**
 * ErrorDetailModal Component
 * 
 * @description Modal dialog displaying detailed information about a system error
 * including stack trace, browser info, device info, and metadata.
 */
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, AlertTriangle, Bug, XCircle, Activity, Eye } from 'lucide-react';
import type { SystemError } from '@/types/systemHealth';

interface ErrorDetailModalProps {
  error: SystemError;
  onClose: () => void;
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

export const ErrorDetailModal = ({ error, onClose }: ErrorDetailModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <Badge className={getSeverityColor(error.severity)}>
              {getSeverityIcon(error.severity)}
              <span className="ml-1">{error.severity.toUpperCase()}</span>
            </Badge>
            <span className="font-medium">{error.error_type}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <ScrollArea className="p-4 max-h-[calc(90vh-80px)]">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-1">Message</h4>
              <p className="text-muted-foreground">{error.message}</p>
            </div>
            
            {error.stack_trace && (
              <div>
                <h4 className="font-medium mb-1">Stack Trace</h4>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                  {error.stack_trace}
                </pre>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-1">Component</h4>
                <p className="text-muted-foreground">{error.component_name || 'N/A'}</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Route</h4>
                <p className="text-muted-foreground">{error.route_path || 'N/A'}</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">User ID</h4>
                <p className="text-muted-foreground font-mono text-xs">{error.user_id || 'N/A'}</p>
              </div>
              <div>
                <h4 className="font-medium mb-1">Session ID</h4>
                <p className="text-muted-foreground font-mono text-xs">{error.session_id || 'N/A'}</p>
              </div>
            </div>
            
            {error.browser_info && (
              <div>
                <h4 className="font-medium mb-1">Browser Info</h4>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(error.browser_info, null, 2)}
                </pre>
              </div>
            )}
            
            {error.device_info && (
              <div>
                <h4 className="font-medium mb-1">Device Info</h4>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(error.device_info, null, 2)}
                </pre>
              </div>
            )}
            
            {error.metadata && (
              <div>
                <h4 className="font-medium mb-1">Metadata</h4>
                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                  {JSON.stringify(error.metadata, null, 2)}
                </pre>
              </div>
            )}
            
            <div className="text-sm text-muted-foreground pt-4 border-t">
              <p>Created: {new Date(error.created_at).toLocaleString()}</p>
              {error.resolved && (
                <p>Resolved: {error.resolved_at ? new Date(error.resolved_at).toLocaleString() : 'Yes'}</p>
              )}
            </div>
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};
