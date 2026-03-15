import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Activity, 
  Database, 
  AlertTriangle, 
  CheckCircle, 
  Users,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cError } from '@/utils/wideLogger';

interface SystemHealthMetric {
  metric_name: string;
  metric_value: number;
  status: 'healthy' | 'warning' | 'critical';
  last_updated: string;
}

export const SystemHealthMonitor = () => {
  const [metrics, setMetrics] = useState<SystemHealthMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchSystemHealth = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('get_system_health_metrics');
      if (error) {
        throw error;
      }
      setMetrics((data || []).map(item => ({
        ...item,
        status: item.status as 'healthy' | 'warning' | 'critical'
      })));
      setLastRefresh(new Date());
    } catch (error) {
      cError('Error fetching system health:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSystemHealth();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSystemHealth, 30000);
    return () => clearInterval(interval);
  }, [fetchSystemHealth]);

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'healthy': return 'default';
      case 'warning': return 'secondary';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'critical': return AlertTriangle;
      default: return Activity;
    }
  };

  const getMetricIcon = (metricName: string) => {
    if (metricName.includes('Session')) return Users;
    if (metricName.includes('Database')) return Database;
    return Activity;
  };

  const formatMetricValue = (name: string, value: number) => {
    if (name.includes('Size')) return `${value} MB`;
    if (name.includes('Rate')) return `${value} errors`;
    return value.toString();
  };

  return (
    <Card className="bg-gradient-card border-border shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="text-foreground flex items-center gap-2">
          <Activity className="h-5 w-5" />
          System Health
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchSystemHealth}
          disabled={loading}
          className="h-8 px-2"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted rounded h-12 w-full"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {metrics.map((metric) => {
              const StatusIcon = getStatusIcon(metric.status);
              const MetricIcon = getMetricIcon(metric.metric_name);
              
              return (
                <div
                  key={metric.metric_name}
                  className="flex items-center justify-between p-3 rounded-lg bg-card/50 border border-border/50"
                >
                  <div className="flex items-center gap-3">
                    <MetricIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">{metric.metric_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatMetricValue(metric.metric_name, metric.metric_value)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(metric.status)} className="capitalize">
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {metric.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
            <div className="text-xs text-muted-foreground text-center pt-2 border-t border-border/50">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};