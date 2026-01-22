import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/authStore";
import { AlertCircle, AlertTriangle, Brain, DollarSign, Clock, TrendingUp, Zap, RefreshCw, Bell } from "lucide-react";
import { AdminRoute } from "@/components/admin/AdminRoute";
import { LazyLLMUsageTrendsChart } from "@/components/admin/lazy";
import { LLMCostAlerts } from "@/components/admin/LLMCostAlerts";
import { LLMCostThresholdSettings } from "@/components/admin/LLMCostThresholdSettings";

interface LLMStats {
  total_calls: number;
  total_tokens: number;
  total_cost_usd: number;
  avg_response_time_ms: number;
  success_rate: number;
  provider_breakdown: Record<string, { calls: number; tokens: number; cost: number }>;
  model_breakdown: Record<string, { calls: number; tokens: number; cost: number }>;
  daily_usage: Record<string, { calls: number; tokens: number; cost: number }>;
}

interface LLMCall {
  id: string;
  provider: string;
  model: string;
  function_name: string;
  total_tokens: number | null;
  cost_usd: number | null;
  status: string;
  response_time_ms: number | null;
  created_at: string;
  error_message?: string | null;
}

const AdminLLMMonitoring = () => {
  const [stats, setStats] = useState<LLMStats | null>(null);
  const [recentCalls, setRecentCalls] = useState<LLMCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("7");
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);
  const [unacknowledgedAlerts, setUnacknowledgedAlerts] = useState(0);
  const { toast } = useToast();
  
  // Wait for session readiness before fetching
  const { sessionReady, isAdmin } = useAuthStore();

  const fetchStats = useCallback(async () => {
    // Don't fetch if session isn't ready or user isn't admin
    if (!sessionReady || !isAdmin) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get usage statistics
      const { data: statsData, error: statsError } = await supabase.rpc(
        'get_llm_usage_stats',
        { 
          p_days_back: parseInt(timeframe),
          p_provider: selectedProvider === "all" ? undefined : selectedProvider
        }
      );

      if (statsError) {
        console.error('RPC error:', statsError);
        throw new Error(statsError.message || 'Failed to fetch LLM stats');
      }

      if (statsData && statsData.length > 0) {
        // Cast the JSON fields to the correct types
        const rawStats = statsData[0];
        setStats({
          total_calls: rawStats.total_calls || 0,
          total_tokens: rawStats.total_tokens || 0,
          total_cost_usd: rawStats.total_cost_usd || 0,
          avg_response_time_ms: rawStats.avg_response_time_ms || 0,
          success_rate: rawStats.success_rate || 0,
          provider_breakdown: (rawStats.provider_breakdown as Record<string, { calls: number; tokens: number; cost: number }>) || {},
          model_breakdown: (rawStats.model_breakdown as Record<string, { calls: number; tokens: number; cost: number }>) || {},
          daily_usage: (rawStats.daily_usage as Record<string, { calls: number; tokens: number; cost: number }>) || {}
        });
      } else {
        // Set default empty stats
        setStats({
          total_calls: 0,
          total_tokens: 0,
          total_cost_usd: 0,
          avg_response_time_ms: 0,
          success_rate: 0,
          provider_breakdown: {},
          model_breakdown: {},
          daily_usage: {}
        });
      }

      // Get recent API calls
      let query = supabase
        .from('llm_api_calls')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (selectedProvider !== "all") {
        query = query.eq('provider', selectedProvider);
      }

      const { data: callsData, error: callsError } = await query;

      if (callsError) {
        console.error('Query error:', callsError);
        throw new Error(callsError.message || 'Failed to fetch recent calls');
      }
      
      setRecentCalls(callsData || []);

    } catch (err) {
      console.error('Error fetching LLM stats:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch LLM monitoring data';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [timeframe, selectedProvider, sessionReady, isAdmin, toast]);

  // Fetch when session becomes ready or filters change
  useEffect(() => {
    if (sessionReady && isAdmin) {
      fetchStats();
    }
  }, [fetchStats, sessionReady, isAdmin]);

  const formatCurrency = (amount: number) => `$${(amount || 0).toFixed(4)}`;
  const formatNumber = (num: number) => (num || 0).toLocaleString();
  const formatPercentage = (num: number) => `${(num || 0).toFixed(1)}%`;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'timeout':
        return <Badge variant="outline">Timeout</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Show loading while waiting for session
  if (!sessionReady || loading) {
    return (
      <AdminRoute>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6" />
            <h1 className="text-2xl font-bold">LLM Monitoring</h1>
          </div>
          {!sessionReady && (
            <p className="text-sm text-muted-foreground">Initializing session...</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-8 bg-muted rounded w-1/2"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </AdminRoute>
    );
  }

  // Show error state with retry
  if (error) {
    return (
      <AdminRoute>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6" />
            <h1 className="text-2xl font-bold">LLM Monitoring</h1>
          </div>
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <AlertCircle className="h-12 w-12 text-destructive" />
                <div>
                  <p className="font-medium">Failed to load LLM data</p>
                  <p className="text-sm text-muted-foreground">{error}</p>
                </div>
                <Button onClick={fetchStats} variant="outline">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <div className="space-y-6">
        {/* Alert Banner */}
        {unacknowledgedAlerts > 0 && (
          <Alert className="border-orange-500 bg-orange-500/10">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                <strong>{unacknowledgedAlerts}</strong> unacknowledged cost alert{unacknowledgedAlerts > 1 ? 's' : ''} require attention
              </span>
              <Button variant="outline" size="sm" onClick={() => document.getElementById('cost-alerts-tab')?.click()}>
                <Bell className="h-4 w-4 mr-1" />
                View Alerts
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6" />
            <h1 className="text-2xl font-bold">LLM Monitoring</h1>
          </div>
          <div className="flex gap-2">
            <Select value={selectedProvider} onValueChange={setSelectedProvider}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                <SelectItem value="grok">Grok (xAI)</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="google">Google (Gemini)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={timeframe} onValueChange={setTimeframe}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24h</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={fetchStats} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Calls</p>
                  <p className="text-2xl font-bold">{formatNumber(stats?.total_calls || 0)}</p>
                </div>
                <Zap className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Cost</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats?.total_cost_usd || 0)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Tokens</p>
                  <p className="text-2xl font-bold">{formatNumber(stats?.total_tokens || 0)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                  <p className="text-2xl font-bold">{Math.round(stats?.avg_response_time_ms || 0)}ms</p>
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="recent" className="w-full">
          <TabsList>
            <TabsTrigger value="recent">Recent Calls</TabsTrigger>
            <TabsTrigger value="trends">
              <TrendingUp className="h-4 w-4 mr-1" />
              Usage Trends
            </TabsTrigger>
            <TabsTrigger value="alerts" id="cost-alerts-tab">
              <Bell className="h-4 w-4 mr-1" />
              Cost Alerts
              {unacknowledgedAlerts > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                  {unacknowledgedAlerts}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="providers">Providers</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent API Calls</CardTitle>
                <CardDescription>
                  Latest {recentCalls.length} API calls to LLM providers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Time</th>
                        <th className="text-left p-2">Provider</th>
                        <th className="text-left p-2">Model</th>
                        <th className="text-left p-2">Function</th>
                        <th className="text-left p-2">Tokens</th>
                        <th className="text-left p-2">Cost</th>
                        <th className="text-left p-2">Response Time</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCalls.map((call) => (
                        <tr key={call.id} className="border-b">
                          <td className="p-2 text-sm">
                            {new Date(call.created_at).toLocaleString()}
                          </td>
                          <td className="p-2">
                            <Badge variant="outline">{call.provider}</Badge>
                          </td>
                          <td className="p-2 text-sm">{call.model}</td>
                          <td className="p-2 text-sm">{call.function_name}</td>
                          <td className="p-2 text-sm">{formatNumber(call.total_tokens ?? 0)}</td>
                          <td className="p-2 text-sm">{formatCurrency(call.cost_usd ?? 0)}</td>
                          <td className="p-2 text-sm">{call.response_time_ms}ms</td>
                          <td className="p-2">{getStatusBadge(call.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {recentCalls.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No API calls found for the selected timeframe</p>
                      <p className="text-sm mt-2">
                        Use the "Test" button on API Integrations in the dashboard to generate test data
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-4">
            <LazyLLMUsageTrendsChart 
              dailyUsage={stats?.daily_usage || {}} 
              isLoading={loading} 
            />
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <LLMCostAlerts onAlertCountChange={setUnacknowledgedAlerts} />
              <LLMCostThresholdSettings />
            </div>
          </TabsContent>

          <TabsContent value="providers" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats?.provider_breakdown && Object.keys(stats.provider_breakdown).length > 0 ? (
                Object.entries(stats.provider_breakdown).map(([provider, data]) => (
                  <Card key={provider}>
                    <CardHeader>
                      <CardTitle className="capitalize">{provider}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Calls:</span>
                          <span className="font-medium">{formatNumber(data?.calls || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Tokens:</span>
                          <span className="font-medium">{formatNumber(data?.tokens || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Cost:</span>
                          <span className="font-medium">{formatCurrency(data?.cost || 0)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="col-span-full">
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No provider data available
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="models" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats?.model_breakdown && Object.keys(stats.model_breakdown).length > 0 ? (
                Object.entries(stats.model_breakdown).map(([model, data]) => (
                  <Card key={model}>
                    <CardHeader>
                      <CardTitle className="text-sm">{model}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Calls:</span>
                          <span className="font-medium">{formatNumber(data?.calls || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Tokens:</span>
                          <span className="font-medium">{formatNumber(data?.tokens || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Cost:</span>
                          <span className="font-medium">{formatCurrency(data?.cost || 0)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="col-span-full">
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No model data available
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Success Rate & Performance */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Success Rate</CardTitle>
              <CardDescription>API call success rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {stats?.success_rate && stats.success_rate >= 95 ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Excellent
                  </Badge>
                ) : stats?.success_rate && stats.success_rate >= 90 ? (
                  <Badge variant="outline">Good</Badge>
                ) : stats?.total_calls === 0 ? (
                  <Badge variant="outline">No Data</Badge>
                ) : (
                  <Badge variant="destructive">Needs Attention</Badge>
                )}
                <span className="text-2xl font-bold">
                  {formatPercentage(stats?.success_rate || 0)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance</CardTitle>
              <CardDescription>Average response time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                {stats?.total_calls === 0 ? (
                  <Badge variant="outline">No Data</Badge>
                ) : stats?.avg_response_time_ms && stats.avg_response_time_ms < 2000 ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Fast
                  </Badge>
                ) : stats?.avg_response_time_ms && stats.avg_response_time_ms < 5000 ? (
                  <Badge variant="outline">Normal</Badge>
                ) : (
                  <Badge variant="outline">Slow</Badge>
                )}
                <span className="text-2xl font-bold">
                  {Math.round(stats?.avg_response_time_ms || 0)}ms
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminRoute>
  );
};

export default AdminLLMMonitoring;
