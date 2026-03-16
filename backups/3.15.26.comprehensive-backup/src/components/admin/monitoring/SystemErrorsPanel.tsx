/**
 * SystemErrorsPanel Component
 * 
 * @description Displays a list of recent system errors with severity badges,
 * timestamps, and actions to view details or resolve errors.
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
  Eye, 
  XCircle, 
  Activity 
} from 'lucide-react';
import type { SystemError } from '@/types/systemHealth';

interface SystemErrorsPanelProps {
  errors: SystemError[];
  onViewError: (error: SystemError) => void;
  onResolveError: (errorId: string) => void;
  onResolveAllErrors?: () => void;
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical': return 'bg-destructive text-destructive-foreground';
    case 'high': return 'bg-orange-500/90 text-primary-foreground';
    case 'medium': return 'bg-yellow-500/90 text-primary-foreground';
    case 'low': return 'bg-blue-500/90 text-primary-foreground';
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

export const SystemErrorsPanel = ({ 
  errors, 
  onViewError, 
  onResolveError,
  onResolveAllErrors
}: SystemErrorsPanelProps) => {
  const unresolvedCount = errors.filter(e => !e.resolved).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Recent System Errors</CardTitle>
            <CardDescription>
              Latest errors and exceptions from the application
            </CardDescription>
          </div>
          {unresolvedCount > 0 && onResolveAllErrors && (
            <Button variant="outline" onClick={onResolveAllErrors}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Resolve All ({unresolvedCount})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {errors.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <p className="text-muted-foreground">No recent errors found</p>
              </div>
            ) : (
              errors.map((error) => (
                <Card key={error.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Badge className={getSeverityColor(error.severity)}>
                          {getSeverityIcon(error.severity)}
                          <span className="ml-1">{error.severity.toUpperCase()}</span>
                        </Badge>
                        <Badge variant="outline">{error.error_type}</Badge>
                        {error.component_name && (
                          <Badge variant="secondary">{error.component_name}</Badge>
                        )}
                      </div>
                      <h4 className="font-medium mb-1">{error.message}</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(error.created_at).toLocaleString()}
                        </p>
                        {error.route_path && <p>Route: {error.route_path}</p>}
                        {error.user_id && <p>User: {error.user_id}</p>}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewError(error)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {!error.resolved && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => onResolveError(error.id)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Resolve
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
