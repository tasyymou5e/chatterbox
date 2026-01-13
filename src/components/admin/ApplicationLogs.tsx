import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Search, Download, AlertTriangle, AlertCircle, Info, Bug } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { SystemError } from '@/types/systemHealth';
// Types from supabase are used via casting since types.ts is read-only
import { logger } from '@/utils/logger';

export const ApplicationLogs = () => {
  const [logs, setLogs] = useState<SystemError[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchLogs = async () => {
    try {
      setRefreshing(true);
      
      let query = supabase
        .from('system_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }

      if (searchTerm) {
        query = query.or(`message.ilike.%${searchTerm}%,component_name.ilike.%${searchTerm}%,error_type.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLogs((data || []).map(item => ({
        ...item,
        severity: item.severity as 'critical' | 'high' | 'medium' | 'low',
        browser_info: (item.browser_info as Record<string, unknown>) || {},
        device_info: (item.device_info as Record<string, unknown>) || {},
        metadata: (item.metadata as Record<string, unknown>) || {}
      })));
    } catch (error: unknown) {
      logger.error('Error fetching application logs', error instanceof Error ? error : new Error(String(error)));
      toast({
        title: "Error",
        description: "Failed to fetch application logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Set up real-time subscription
    const channel = supabase
      .channel('system_errors_changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'system_errors' },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLogs, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [searchTerm, severityFilter]);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      case 'high':
        return <AlertCircle className="h-4 w-4" />;
      case 'medium':
        return <Info className="h-4 w-4" />;
      case 'low':
        return <Bug className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-destructive text-destructive-foreground';
      case 'high':
        return 'bg-orange-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-black';
      case 'low':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Severity', 'Error Type', 'Component', 'Message', 'Resolved'].join(','),
      ...logs.map(log => [
        new Date(log.created_at).toISOString(),
        log.severity,
        log.error_type,
        log.component_name || '',
        `"${log.message.replace(/"/g, '""')}"`,
        log.resolved ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `application-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading application logs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search errors by message, component, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by severity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        <Button 
          variant="outline" 
          onClick={fetchLogs}
          disabled={refreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>

        <Button 
          variant="outline" 
          onClick={exportLogs}
          disabled={logs.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {logs.length === 0 ? 'No application errors found' : `Showing ${logs.length} error${logs.length !== 1 ? 's' : ''}`}
      </div>

      {/* Logs Table */}
      {logs.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Timestamp</th>
                  <th className="text-left p-3 font-medium">Severity</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Component</th>
                  <th className="text-left p-3 font-medium">Message</th>
                  <th className="text-left p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-t hover:bg-muted/50">
                    <td className="p-3 font-mono text-xs">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="p-3">
                      <Badge className={`flex items-center gap-1 ${getSeverityColor(log.severity)}`}>
                        {getSeverityIcon(log.severity)}
                        {log.severity}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">{log.error_type}</Badge>
                    </td>
                    <td className="p-3">
                      {log.component_name ? (
                        <Badge variant="secondary">{log.component_name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3 max-w-md">
                      <div className="truncate" title={log.message}>
                        {log.message}
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant={log.resolved ? "default" : "destructive"}>
                        {log.resolved ? 'Resolved' : 'Open'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};