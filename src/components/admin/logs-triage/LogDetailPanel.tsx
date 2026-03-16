import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { SystemError } from '@/hooks/useLogsTriage';

interface LogDetailPanelProps {
  log: SystemError;
  onClose: () => void;
  onCreateTicket: (log: SystemError) => void;
}

export const LogDetailPanel = ({ log, onClose, onCreateTicket }: LogDetailPanelProps) => {
  const severityColor: Record<string, string> = {
    critical: 'bg-red-600',
    high: 'bg-orange-600',
    medium: 'bg-amber-600',
    low: 'bg-blue-600',
  };

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="flex flex-row items-start justify-between pb-3">
        <div>
          <CardTitle className="text-white text-lg">{log.error_type}</CardTitle>
          <p className="text-gray-400 text-xs mt-1">
            {new Date(log.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={severityColor[log.severity] ?? 'bg-gray-600'}>
            {log.severity}
          </Badge>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-gray-400 hover:text-white" aria-label="Close log detail">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <p className="text-gray-400 font-medium mb-1">Message</p>
          <p className="text-white bg-gray-900 p-3 rounded-md font-mono text-xs break-all">{log.message}</p>
        </div>

        {log.stack_trace && (
          <div>
            <p className="text-gray-400 font-medium mb-1">Stack Trace</p>
            <pre className="text-green-400 bg-gray-900 p-3 rounded-md text-xs overflow-auto max-h-48 whitespace-pre-wrap">
              {log.stack_trace}
            </pre>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {log.component_name && (
            <div>
              <p className="text-gray-400 text-xs">Component</p>
              <p className="text-white">{log.component_name}</p>
            </div>
          )}
          {log.route_path && (
            <div>
              <p className="text-gray-400 text-xs">Route</p>
              <p className="text-white">{log.route_path}</p>
            </div>
          )}
          <div>
            <p className="text-gray-400 text-xs">Resolved</p>
            <p className="text-white">{log.resolved ? 'Yes' : 'No'}</p>
          </div>
          {log.session_id && (
            <div>
              <p className="text-gray-400 text-xs">Session</p>
              <p className="text-white font-mono text-xs truncate">{log.session_id}</p>
            </div>
          )}
        </div>

        {log.browser_info && (
          <div>
            <p className="text-gray-400 font-medium mb-1">Browser Info</p>
            <pre className="text-gray-300 bg-gray-900 p-2 rounded-md text-xs overflow-auto max-h-24">
              {JSON.stringify(log.browser_info, null, 2)}
            </pre>
          </div>
        )}

        {log.device_info && (
          <div>
            <p className="text-gray-400 font-medium mb-1">Device Info</p>
            <pre className="text-gray-300 bg-gray-900 p-2 rounded-md text-xs overflow-auto max-h-24">
              {JSON.stringify(log.device_info, null, 2)}
            </pre>
          </div>
        )}

        <Button
          onClick={() => onCreateTicket(log)}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        >
          Create Triage Ticket
        </Button>
      </CardContent>
    </Card>
  );
};
