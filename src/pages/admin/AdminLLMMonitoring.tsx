import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Brain, DollarSign, Clock, TrendingUp, Zap } from "lucide-react";
import { AdminRoute } from "@/components/admin/AdminRoute";

interface LLMStats {
  total_calls: number;
  total_tokens: number;
  total_cost_usd: number;
  avg_response_time_ms: number;
  success_rate: number;
  provider_breakdown: any;
  model_breakdown: any;
  daily_usage: any;
}

interface LLMCall {
  id: string;
  provider: string;
  model: string;
  function_name: string;
  total_tokens: number;
  cost_usd: number;
  status: string;
  response_time_ms: number;
  created_at: string;
  error_message?: string;
}

const AdminLLMMonitoring = () => {
  const [stats, setStats] = useState<LLMStats | null>(null);
  const [recentCalls, setRecentCalls] = useState<LLMCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("7");
  const [selectedProvider, setSelectedProvider] = useState<string>("all");
  const { toast } = useToast();

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Get usage statistics
      const { data: statsData, error: statsError } = await supabase.rpc(
        'get_llm_usage_stats',
        { 
          p_days_back: parseInt(timeframe),
          p_provider: selectedProvider === "all" ? null : selectedProvider
        }
      );

      if (statsError) throw statsError;

      if (statsData && statsData.length > 0) {
        setStats(statsData[0]);
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

      if (callsError) throw callsError;
      setRecentCalls(callsData || []);

    } catch (error: any) {
      console.error('Error fetching LLM stats:', error);
      toast({
        title: "Error",
        description: "Failed to fetch LLM monitoring data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [timeframe, selectedProvider]);

  const formatCurrency = (amount: number) => `$${amount.toFixed(4)}`;
  const formatNumber = (num: number) => num.toLocaleString();
  const formatPercentage = (num: number) => `${num.toFixed(1)}%`;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Success</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      case 'timeout':
        return <Badge variant="outline">Timeout</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <AdminRoute>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Brain className="h-6 w-6" />
            <h1 className="text-2xl font-bold">LLM Monitoring</h1>
          </div>
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

  return (
    <AdminRoute>
      <div className="space-y-6">
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
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
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
                          <td className="p-2 text-sm">{formatNumber(call.total_tokens)}</td>
                          <td className="p-2 text-sm">{formatCurrency(call.cost_usd)}</td>
                          <td className="p-2 text-sm">{call.response_time_ms}ms</td>
                          <td className="p-2">{getStatusBadge(call.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {recentCalls.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No API calls found for the selected timeframe
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="providers" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats?.provider_breakdown && Object.entries(stats.provider_breakdown).map(([provider, data]: [string, any]) => (
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
              ))}
            </div>
          </TabsContent>

          <TabsContent value="models" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats?.model_breakdown && Object.entries(stats.model_breakdown).map(([model, data]: [string, any]) => (
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
              ))}
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
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Excellent
                  </Badge>
                ) : stats?.success_rate && stats.success_rate >= 90 ? (
                  <Badge variant="outline">Good</Badge>
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
                {stats?.avg_response_time_ms && stats.avg_response_time_ms < 2000 ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
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