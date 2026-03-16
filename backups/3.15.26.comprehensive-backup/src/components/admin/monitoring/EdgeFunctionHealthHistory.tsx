import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useEdgeFunctionHealthHistory } from '@/hooks/useEdgeFunctionHealthHistory';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subHours, parseISO } from 'date-fns';
import { Clock, Activity, AlertTriangle } from 'lucide-react';

export function EdgeFunctionHealthHistory() {
  const { logs, loading, fetchLogs } = useEdgeFunctionHealthHistory();
  const [selectedFunction, setSelectedFunction] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('24');

  // Get unique function names
  const functionNames = useMemo(() => {
    const names = new Set(logs.map(l => l.function_name));
    return Array.from(names).sort();
  }, [logs]);

  // Filter logs based on selection
  const filteredLogs = useMemo(() => {
    let filtered = logs;
    
    if (selectedFunction !== 'all') {
      filtered = filtered.filter(l => l.function_name === selectedFunction);
    }
    
    const hoursAgo = subHours(new Date(), parseInt(timeRange));
    filtered = filtered.filter(l => new Date(l.created_at) >= hoursAgo);
    
    return filtered;
  }, [logs, selectedFunction, timeRange]);

  // Prepare chart data
  const chartData = useMemo(() => {
    const groupedByTime = new Map<string, { time: string; [key: string]: number | string }>();
    
    filteredLogs.forEach(log => {
      // Group by hour for better visualization
      const timeKey = format(parseISO(log.created_at), 'MMM dd HH:00');
      
      if (!groupedByTime.has(timeKey)) {
        groupedByTime.set(timeKey, { time: timeKey });
      }
      
      const entry = groupedByTime.get(timeKey)!;
      
      if (selectedFunction === 'all') {
        // Average response time across all functions
        const currentCount = (entry['count'] as number) || 0;
        const currentTotal = (entry['totalTime'] as number) || 0;
        entry['count'] = currentCount + 1;
        entry['totalTime'] = currentTotal + (log.response_time_ms || 0);
        entry['avgResponseTime'] = Math.round((entry['totalTime'] as number) / (entry['count'] as number));
      } else {
        entry[log.function_name] = log.response_time_ms || 0;
      }
    });

    return Array.from(groupedByTime.values()).reverse();
  }, [filteredLogs, selectedFunction]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (filteredLogs.length === 0) {
      return { total: 0, healthy: 0, unhealthy: 0, avgTime: 0, maxTime: 0 };
    }

    const healthy = filteredLogs.filter(l => l.status === 'healthy').length;
    const responseTimes = filteredLogs
      .filter(l => l.response_time_ms !== null)
      .map(l => l.response_time_ms!);

    return {
      total: filteredLogs.length,
      healthy,
      unhealthy: filteredLogs.length - healthy,
      avgTime: responseTimes.length > 0 
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0,
      maxTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
    };
  }, [filteredLogs]);

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value);
    fetchLogs(selectedFunction === 'all' ? undefined : selectedFunction, parseInt(value));
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      healthy: 'default',
      unhealthy: 'destructive',
      timeout: 'secondary',
      unknown: 'outline',
    };
    return <Badge variant={variants[status] || 'outline'} className="capitalize">{status}</Badge>;
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-8 bg-muted rounded w-1/4" />
      <div className="h-64 bg-muted rounded" />
    </div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4">
        <Select value={selectedFunction} onValueChange={setSelectedFunction}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select function" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Functions</SelectItem>
            {functionNames.map(name => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={timeRange} onValueChange={handleTimeRangeChange}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Last hour</SelectItem>
            <SelectItem value="6">Last 6 hours</SelectItem>
            <SelectItem value="24">Last 24 hours</SelectItem>
            <SelectItem value="72">Last 3 days</SelectItem>
            <SelectItem value="168">Last 7 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" />
              Total Checks
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Success Rate
            </div>
            <p className="text-2xl font-bold">
              {stats.total > 0 ? Math.round((stats.healthy / stats.total) * 100) : 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              Failures
            </div>
            <p className="text-2xl font-bold text-destructive">{stats.unhealthy}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Avg Response</div>
            <p className="text-2xl font-bold">{stats.avgTime}ms</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-sm text-muted-foreground">Max Response</div>
            <p className="text-2xl font-bold">{stats.maxTime}ms</p>
          </CardContent>
        </Card>
      </div>

      {/* Response Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Response Time Trend</CardTitle>
          <CardDescription>
            {selectedFunction === 'all' 
              ? 'Average response time across all functions'
              : `Response time for ${selectedFunction}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              No data available for the selected time range
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  label={{ value: 'ms', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                {selectedFunction === 'all' ? (
                  <Line 
                    type="monotone" 
                    dataKey="avgResponseTime" 
                    name="Avg Response Time (ms)"
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                ) : (
                  <Line 
                    type="monotone" 
                    dataKey={selectedFunction} 
                    name={selectedFunction}
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Recent Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Health Checks</CardTitle>
          <CardDescription>
            Latest {Math.min(filteredLogs.length, 50)} health check results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2">Time</th>
                  <th className="text-left py-2 px-2">Function</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-right py-2 px-2">Response Time</th>
                  <th className="text-left py-2 px-2">Type</th>
                  <th className="text-left py-2 px-2">Error</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.slice(0, 50).map((log) => (
                  <tr key={log.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-2 px-2 text-muted-foreground">
                      {format(parseISO(log.created_at), 'MMM dd HH:mm:ss')}
                    </td>
                    <td className="py-2 px-2 font-medium">{log.function_name}</td>
                    <td className="py-2 px-2">{getStatusBadge(log.status)}</td>
                    <td className="py-2 px-2 text-right">
                      {log.response_time_ms !== null ? `${log.response_time_ms}ms` : '-'}
                    </td>
                    <td className="py-2 px-2">
                      <Badge variant="outline" className="capitalize">{log.check_type}</Badge>
                    </td>
                    <td className="py-2 px-2 text-muted-foreground truncate max-w-[200px]">
                      {log.error_message || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredLogs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No health check logs found for the selected filters
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
