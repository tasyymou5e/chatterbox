import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCw, Clock, AlertTriangle, Activity, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface HealthCheckLog {
  id: string;
  provider_key: string;
  check_type: string;
  previous_status: string | null;
  new_status: string;
  response_time_ms: number | null;
  error_message: string | null;
  metadata: { display_name?: string } | null;
  created_at: string;
}

export function LLMHealthCheckLogs() {
  const [filterProvider, setFilterProvider] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [isRunningCheck, setIsRunningCheck] = useState(false);

  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ['llm-health-check-logs', filterProvider, filterType],
    queryFn: async () => {
      let query = supabase
        .from('llm_health_check_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filterProvider !== 'all') {
        query = query.eq('provider_key', filterProvider);
      }
      if (filterType !== 'all') {
        query = query.eq('check_type', filterType);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as HealthCheckLog[];
    }
  });

  const { data: providers } = useQuery({
    queryKey: ['llm-providers-for-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('llm_providers')
        .select('provider_key, display_name')
        .order('display_name');
      if (error) throw error;
      return data;
    }
  });

  const runManualHealthCheck = async () => {
    setIsRunningCheck(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        'https://lxuqfgbukrrickanmmic.supabase.co/functions/v1/scheduled-health-check',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.session?.access_token}`
          }
        }
      );

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Health check complete: ${result.healthy} healthy, ${result.unhealthy} unhealthy`);
        refetch();
      } else {
        toast.error(result.error || 'Health check failed');
      }
    } catch (error) {
      toast.error('Failed to run health check');
      console.error(error);
    } finally {
      setIsRunningCheck(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">Healthy</Badge>;
      case 'unhealthy':
        return <Badge variant="destructive">Unhealthy</Badge>;
      case 'unchecked':
        return <Badge variant="secondary">Unchecked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCheckTypeBadge = (type: string) => {
    switch (type) {
      case 'scheduled':
        return <Badge variant="outline" className="text-accent-foreground border-accent"><Clock className="h-3 w-3 mr-1" />Scheduled</Badge>;
      case 'manual':
        return <Badge variant="outline" className="text-secondary-foreground border-secondary"><Activity className="h-3 w-3 mr-1" />Manual</Badge>;
      case 'failover':
        return <Badge variant="outline" className="text-destructive border-destructive/50"><AlertTriangle className="h-3 w-3 mr-1" />Failover</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const statusChangeLogs = logs?.filter(log => log.previous_status !== log.new_status) || [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Checks (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs?.length || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status Changes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-accent-foreground">{statusChangeLogs.length}</div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg Response Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs?.length 
                ? Math.round(logs.reduce((acc, l) => acc + (l.response_time_ms || 0), 0) / logs.length)
                : 0}ms
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {logs?.length 
                ? Math.round((logs.filter(l => l.new_status === 'healthy').length / logs.length) * 100)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <Button 
          onClick={runManualHealthCheck} 
          disabled={isRunningCheck}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRunningCheck ? 'animate-spin' : ''}`} />
          Run Health Check Now
        </Button>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterProvider} onValueChange={setFilterProvider}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              {providers?.map(p => (
                <SelectItem key={p.provider_key} value={p.provider_key}>
                  {p.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
              <SelectItem value="failover">Failover</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Logs Table */}
      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Health Check History
          </CardTitle>
          <CardDescription>
            Recent health check results for all LLM providers. Scheduled checks run every hour.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : logs?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No health check logs found. Run a health check to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {logs?.map(log => (
                  <div 
                    key={log.id}
                    className={`p-4 rounded-lg border ${
                      log.previous_status !== log.new_status 
                        ? 'border-accent/50 bg-accent/5' 
                        : 'border-border/50 bg-muted/30'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-medium">
                        {log.metadata?.display_name || log.provider_key}
                      </span>
                      
                      {getCheckTypeBadge(log.check_type)}
                      
                      <div className="flex items-center gap-2">
                        {log.previous_status && log.previous_status !== log.new_status && (
                          <>
                            {getStatusBadge(log.previous_status)}
                            <span className="text-muted-foreground">→</span>
                          </>
                        )}
                        {getStatusBadge(log.new_status)}
                      </div>

                      {log.response_time_ms && (
                        <Badge variant="outline" className="text-xs">
                          {log.response_time_ms}ms
                        </Badge>
                      )}

                      <span className="text-xs text-muted-foreground ml-auto">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </span>
                    </div>

                    {log.error_message && (
                      <div className="mt-2 text-sm text-destructive bg-destructive/10 p-2 rounded">
                        {log.error_message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
