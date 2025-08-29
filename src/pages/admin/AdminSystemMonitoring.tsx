import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  Bug, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  Eye,
  XCircle,
  Activity,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SystemError {
  id: string;
  error_type: string;
  severity: string;
  message: string;
  stack_trace?: string;
  component_name?: string;
  route_path?: string;
  resolved: boolean;
  created_at: string;
  user_id?: string;
  metadata: any;
}

interface ErrorStatistics {
  total_errors: number;
  critical_errors: number;
  high_errors: number;
  medium_errors: number;
  low_errors: number;
  resolved_errors: number;
  top_error_components: string[];
  error_rate_trend: number[];
}

interface SystemAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description?: string;
  acknowledged: boolean;
  resolved: boolean;
  created_at: string;
}

const AdminSystemMonitoring = () => {
  const [errors, setErrors] = useState<SystemError[]>([]);
  const [statistics, setStatistics] = useState<ErrorStatistics | null>(null);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedError, setSelectedError] = useState<SystemError | null>(null);
  const { toast } = useToast();

  const fetchErrorStatistics = async () => {
    try {
      const { data, error } = await supabase.rpc('get_error_statistics', { days_back: 7 });
      if (error) throw error;
      setStatistics(data[0] || null);
    } catch (error) {
      console.error('Failed to fetch error statistics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load error statistics',
        variant: 'destructive',
      });
    }
  };

  const fetchRecentErrors = async () => {
    try {
      const { data, error } = await supabase
        .from('system_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setErrors(data || []);
    } catch (error) {
      console.error('Failed to fetch errors:', error);
      toast({
        title: 'Error',
        description: 'Failed to load recent errors',
        variant: 'destructive',
      });
    }
  };

  const fetchSystemAlerts = async () => {
    try {
      const { data, error } = await supabase
        .from('system_alerts')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAlerts(data || []);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load system alerts',
        variant: 'destructive',
      });
    }
  };

  const refreshData = async () => {
    setLoading(true);
    await Promise.all([
      fetchErrorStatistics(),
      fetchRecentErrors(),
      fetchSystemAlerts()
    ]);
    setLoading(false);
  };

  const resolveError = async (errorId: string) => {
    try {
      const { error } = await supabase.rpc('resolve_system_error', { error_id: errorId });
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Error marked as resolved',
      });
      
      await refreshData();
    } catch (error) {
      console.error('Failed to resolve error:', error);
      toast({
        title: 'Error',
        description: 'Failed to resolve error',
        variant: 'destructive',
      });
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('system_alerts')
        .update({ 
          acknowledged: true, 
          acknowledged_at: new Date().toISOString() 
        })
        .eq('id', alertId);
      
      if (error) throw error;
      
      toast({
        title: 'Success',
        description: 'Alert acknowledged',
      });
      
      await refreshData();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
      toast({
        title: 'Error',
        description: 'Failed to acknowledge alert',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    refreshData();
    
    // Set up real-time subscriptions
    const errorSubscription = supabase
      .channel('system_errors_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'system_errors' }, 
        () => refreshData()
      )
      .subscribe();

    const alertSubscription = supabase
      .channel('system_alerts_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'system_alerts' }, 
        () => refreshData()
      )
      .subscribe();

    return () => {
      errorSubscription.unsubscribe();
      alertSubscription.unsubscribe();
    };
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">System Monitoring</h1>
          <p className="text-muted-foreground">Error tracking and system health monitoring</p>
        </div>
        <Button onClick={refreshData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* System Alerts */}
      {alerts.length > 0 && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {alerts.length} active system alert{alerts.length > 1 ? 's' : ''} require attention
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Overview */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Errors</CardTitle>
              <Bug className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{statistics.total_errors}</div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Critical Errors</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{statistics.critical_errors}</div>
              <p className="text-xs text-muted-foreground">Immediate attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {statistics.total_errors > 0 
                  ? Math.round((statistics.resolved_errors / statistics.total_errors) * 100)
                  : 0}%
              </div>
              <p className="text-xs text-muted-foreground">Resolution rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Trend</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statistics.error_rate_trend.length > 1 
                  ? statistics.error_rate_trend[0] > statistics.error_rate_trend[statistics.error_rate_trend.length - 1]
                    ? <TrendingDown className="h-6 w-6 text-green-500" />
                    : <TrendingUp className="h-6 w-6 text-red-500" />
                  : <Activity className="h-6 w-6 text-muted-foreground" />
                }
              </div>
              <p className="text-xs text-muted-foreground">Trend direction</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="errors" className="space-y-4">
        <TabsList>
          <TabsTrigger value="errors">Recent Errors</TabsTrigger>
          <TabsTrigger value="alerts">System Alerts</TabsTrigger>
          <TabsTrigger value="patterns">Error Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent System Errors</CardTitle>
              <CardDescription>Latest errors reported by the system</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {errors.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-lg font-medium">No errors found</p>
                      <p className="text-sm">System is running smoothly</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-4"
                        onClick={async () => {
                          try {
                            await supabase.rpc('log_system_error', {
                              p_error_type: 'test',
                              p_severity: 'low', 
                              p_message: 'Test error from admin panel',
                              p_component_name: 'AdminSystemMonitoring',
                              p_route_path: '/admin/monitoring'
                            });
                            toast({
                              title: 'Success',
                              description: 'Test error created successfully',
                            });
                            await refreshData();
                          } catch (error) {
                            console.error('Failed to create test error:', error);
                            toast({
                              title: 'Error',
                              description: 'Failed to create test error',
                              variant: 'destructive',
                            });
                          }
                        }}
                      >
                        Create Test Error
                      </Button>
                    </div>
                  ) : (
                    errors.map((error) => (
                    <div
                      key={error.id}
                      className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => setSelectedError(error)}
                    >
                      <div className="flex items-start space-x-3">
                        {getSeverityIcon(error.severity)}
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <Badge className={getSeverityColor(error.severity)}>
                              {error.severity}
                            </Badge>
                            {error.resolved && (
                              <Badge variant="outline">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Resolved
                              </Badge>
                            )}
                          </div>
                          <p className="font-medium text-sm">{error.message}</p>
                          <div className="text-xs text-muted-foreground space-x-2">
                            {error.component_name && <span>Component: {error.component_name}</span>}
                            {error.route_path && <span>Route: {error.route_path}</span>}
                            <span>
                              <Clock className="h-3 w-3 inline mr-1" />
                              {new Date(error.created_at).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      {!error.resolved && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            resolveError(error.id);
                          }}
                        >
                          Resolve
                        </Button>
                      )}
                    </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active System Alerts</CardTitle>
              <CardDescription>Critical system notifications requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-start justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-start space-x-3">
                      {getSeverityIcon(alert.severity)}
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <Badge className={getSeverityColor(alert.severity)}>
                            {alert.severity}
                          </Badge>
                          {alert.acknowledged && (
                            <Badge variant="outline">Acknowledged</Badge>
                          )}
                        </div>
                        <p className="font-medium">{alert.title}</p>
                        {alert.description && (
                          <p className="text-sm text-muted-foreground">{alert.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(alert.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {!alert.acknowledged && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => acknowledgeAlert(alert.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                    No active alerts
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Patterns</CardTitle>
              <CardDescription>Recurring error patterns and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                Error pattern analysis coming soon
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Error Details Modal would go here */}
    </div>
  );
};

export default AdminSystemMonitoring;