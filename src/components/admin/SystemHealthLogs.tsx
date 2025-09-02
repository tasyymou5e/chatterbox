import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Search, Download, Activity, TrendingUp, Clock, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cError } from '@/utils/conditionalLogger';
import type { PerformanceMetricData, PerformanceMetadata } from '@/types/interfaces';

interface PerformanceMetric {
  id: string;
  metric_type: string;
  value: number;
  threshold_exceeded: boolean;
  component_name: string | null;
  route_path: string | null;
  user_id: string | null;
  metadata: PerformanceMetadata;
  created_at: string;
}

export const SystemHealthLogs = () => {
  const [logs, setLogs] = useState<PerformanceMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [metricTypeFilter, setMetricTypeFilter] = useState<string>('all');
  const [thresholdFilter, setThresholdFilter] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchLogs = async () => {
    try {
      setRefreshing(true);
      
      let query = supabase
        .from('performance_metrics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (metricTypeFilter !== 'all') {
        query = query.eq('metric_type', metricTypeFilter);
      }

      if (thresholdFilter !== 'all') {
        query = query.eq('threshold_exceeded', thresholdFilter === 'exceeded');
      }

      if (searchTerm) {
        query = query.or(`metric_type.ilike.%${searchTerm}%,component_name.ilike.%${searchTerm}%,route_path.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;

      setLogs((data || []).map(log => ({
        ...log,
        metadata: (log.metadata as any) || {}
      })));
    } catch (error: unknown) {
      cError('Error fetching performance metrics', error);
      toast({
        title: "Error",
        description: "Failed to fetch performance metrics",
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
      .channel('performance_metrics_changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'performance_metrics' },
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
  }, [searchTerm, metricTypeFilter, thresholdFilter]);

  const getMetricIcon = (metricType: string) => {
    switch (metricType) {
      case 'component_render_time':
        return <Activity className="h-4 w-4" />;
      case 'page_load_time':
        return <Clock className="h-4 w-4" />;
      case 'api_response_time':
        return <Zap className="h-4 w-4" />;
      case 'memory_usage':
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const getThresholdColor = (exceeded: boolean) => {
    return exceeded 
      ? 'bg-red-500 text-white' 
      : 'bg-green-500 text-white';
  };

  const formatValue = (value: number, metricType: string) => {
    if (metricType.includes('time')) {
      return `${value.toFixed(2)}ms`;
    }
    if (metricType.includes('memory')) {
      return `${(value / 1024 / 1024).toFixed(2)}MB`;
    }
    return value.toString();
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Metric Type', 'Value', 'Component', 'Route', 'Threshold Exceeded'].join(','),
      ...logs.map(log => [
        new Date(log.created_at).toISOString(),
        log.metric_type,
        log.value,
        log.component_name || '',
        log.route_path || '',
        log.threshold_exceeded ? 'Yes' : 'No'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading performance metrics...</span>
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
            placeholder="Search by metric type, component, or route..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={metricTypeFilter} onValueChange={setMetricTypeFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by metric type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Metrics</SelectItem>
            <SelectItem value="component_render_time">Component Render</SelectItem>
            <SelectItem value="page_load_time">Page Load</SelectItem>
            <SelectItem value="api_response_time">API Response</SelectItem>
            <SelectItem value="memory_usage">Memory Usage</SelectItem>
          </SelectContent>
        </Select>

        <Select value={thresholdFilter} onValueChange={setThresholdFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="exceeded">Threshold Exceeded</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
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
        {logs.length === 0 ? 'No performance metrics found' : `Showing ${logs.length} metric${logs.length !== 1 ? 's' : ''}`}
      </div>

      {/* Performance Summary */}
      {logs.length === 0 && (
        <div className="border rounded-lg p-6 text-center">
          <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Performance Metrics Available</h3>
          <p className="text-muted-foreground mb-4">
            Performance monitoring is configured but no metrics have been collected yet.
          </p>
          <p className="text-sm text-muted-foreground">
            Metrics will automatically appear here once users interact with the application.
          </p>
        </div>
      )}

      {/* Logs Table */}
      {logs.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Timestamp</th>
                  <th className="text-left p-3 font-medium">Metric Type</th>
                  <th className="text-left p-3 font-medium">Value</th>
                  <th className="text-left p-3 font-medium">Component</th>
                  <th className="text-left p-3 font-medium">Route</th>
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
                      <Badge variant="secondary" className="flex items-center gap-1 w-fit">
                        {getMetricIcon(log.metric_type)}
                        {log.metric_type.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {formatValue(log.value, log.metric_type)}
                      </code>
                    </td>
                    <td className="p-3">
                      {log.component_name ? (
                        <Badge variant="outline">{log.component_name}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      {log.route_path ? (
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {log.route_path}
                        </code>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge className={`${getThresholdColor(log.threshold_exceeded)}`}>
                        {log.threshold_exceeded ? 'Threshold Exceeded' : 'Normal'}
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