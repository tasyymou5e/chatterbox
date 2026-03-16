/**
 * LLMCostComparisonChart Component
 * 
 * Visualizes cost-per-token and performance metrics across LLM providers
 */
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Cell
} from 'recharts';
import { DollarSign, Zap, Clock, TrendingUp, RefreshCw } from 'lucide-react';

interface ProviderMetrics {
  provider_key: string;
  display_name: string;
  input_price: number;
  output_price: number;
  avg_response_time: number;
  total_calls: number;
  success_rate: number;
  total_cost: number;
  total_tokens: number;
  cost_per_1k_tokens: number;
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export const LLMCostComparisonChart = () => {
  const [metrics, setMetrics] = useState<ProviderMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch provider configurations
      const { data: providers, error: providerError } = await supabase
        .from('llm_providers')
        .select('provider_key, display_name, pricing_config, is_active')
        .eq('is_active', true);

      if (providerError) throw providerError;

      // Fetch usage stats for last 30 days
      const { data: statsData } = await supabase.rpc('get_llm_usage_stats', {
        p_days_back: 30,
        p_provider: undefined
      });

      const usageStats = statsData?.[0] as { provider_breakdown?: Record<string, { calls: number; tokens: number; cost: number }> } | undefined;
      const providerBreakdown = usageStats?.provider_breakdown || {};

      // Fetch response time data
      const { data: callsData } = await supabase
        .from('llm_api_calls')
        .select('provider, response_time_ms, status')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Calculate per-provider metrics
      const providerMetrics: ProviderMetrics[] = (providers || []).map(provider => {
        const pricing = typeof provider.pricing_config === 'string' 
          ? JSON.parse(provider.pricing_config) 
          : provider.pricing_config || {};
        
        const usage = providerBreakdown[provider.provider_key] || { calls: 0, tokens: 0, cost: 0 };
        
        // Calculate response time and success rate from calls
        const providerCalls = (callsData || []).filter(c => c.provider === provider.provider_key);
        const avgResponseTime = providerCalls.length > 0
          ? providerCalls.reduce((sum, c) => sum + (c.response_time_ms || 0), 0) / providerCalls.length
          : 0;
        const successCount = providerCalls.filter(c => c.status === 'success').length;
        const successRate = providerCalls.length > 0 ? (successCount / providerCalls.length) * 100 : 0;

        return {
          provider_key: provider.provider_key,
          display_name: provider.display_name,
          input_price: pricing.inputPricePer1k || 0,
          output_price: pricing.outputPricePer1k || 0,
          avg_response_time: Math.round(avgResponseTime),
          total_calls: usage.calls,
          success_rate: Math.round(successRate * 10) / 10,
          total_cost: usage.cost,
          total_tokens: usage.tokens,
          cost_per_1k_tokens: usage.tokens > 0 ? (usage.cost / usage.tokens) * 1000 : 0
        };
      });

      setMetrics(providerMetrics);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Prepare data for pricing chart
  const pricingData = metrics.map(m => ({
    name: m.display_name,
    'Input (per 1K)': m.input_price,
    'Output (per 1K)': m.output_price,
  }));

  // Prepare data for performance radar
  const performanceData = metrics.length > 0 ? [
    { metric: 'Speed', fullMark: 100, ...Object.fromEntries(metrics.map(m => [m.display_name, m.avg_response_time > 0 ? Math.max(0, 100 - (m.avg_response_time / 50)) : 0])) },
    { metric: 'Reliability', fullMark: 100, ...Object.fromEntries(metrics.map(m => [m.display_name, m.success_rate])) },
    { metric: 'Cost Efficiency', fullMark: 100, ...Object.fromEntries(metrics.map(m => [m.display_name, m.cost_per_1k_tokens > 0 ? Math.max(0, 100 - (m.cost_per_1k_tokens * 1000)) : 50])) },
    { metric: 'Usage Volume', fullMark: 100, ...Object.fromEntries(metrics.map(m => {
      const maxCalls = Math.max(...metrics.map(x => x.total_calls), 1);
      return [m.display_name, (m.total_calls / maxCalls) * 100];
    })) },
  ] : [];

  // Prepare data for cost breakdown
  const costBreakdownData = metrics
    .filter(m => m.total_cost > 0)
    .sort((a, b) => b.total_cost - a.total_cost);

  const formatCurrency = (value: number) => `$${value.toFixed(4)}`;
  const formatTime = (value: number) => `${value}ms`;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Provider Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (metrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Provider Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <p>No provider data available. Configure providers to see comparisons.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Provider Comparison
            </CardTitle>
            <CardDescription>Cost and performance metrics across LLM providers (last 30 days)</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchMetrics} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pricing" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pricing" className="text-xs sm:text-sm">
              <DollarSign className="h-4 w-4 mr-1 hidden sm:inline" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-xs sm:text-sm">
              <Zap className="h-4 w-4 mr-1 hidden sm:inline" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="costs" className="text-xs sm:text-sm">
              <Clock className="h-4 w-4 mr-1 hidden sm:inline" />
              Spending
            </TabsTrigger>
            <TabsTrigger value="summary" className="text-xs sm:text-sm">
              <TrendingUp className="h-4 w-4 mr-1 hidden sm:inline" />
              Summary
            </TabsTrigger>
          </TabsList>

          {/* Pricing Comparison Tab */}
          <TabsContent value="pricing" className="space-y-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pricingData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12 }} 
                    angle={-45} 
                    textAnchor="end"
                    height={80}
                    className="fill-muted-foreground"
                  />
                  <YAxis 
                    tickFormatter={(v) => `$${v}`} 
                    tick={{ fontSize: 12 }}
                    className="fill-muted-foreground"
                  />
                  <Tooltip 
                    formatter={(value) => formatCurrency(Number(value ?? 0))}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                  />
                  <Legend />
                  <Bar dataKey="Input (per 1K)" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Output (per 1K)" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {metrics.map((m, i) => (
                <div key={m.provider_key} className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-sm font-medium truncate">{m.display_name}</span>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>Input: <span className="font-mono">{formatCurrency(m.input_price)}</span></p>
                    <p>Output: <span className="font-mono">{formatCurrency(m.output_price)}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Performance Radar Tab */}
          <TabsContent value="performance" className="space-y-4">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={performanceData}>
                  <PolarGrid className="stroke-muted" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                  {metrics.map((m, i) => (
                    <Radar
                      key={m.provider_key}
                      name={m.display_name}
                      dataKey={m.display_name}
                      stroke={CHART_COLORS[i % CHART_COLORS.length]}
                      fill={CHART_COLORS[i % CHART_COLORS.length]}
                      fillOpacity={0.2}
                    />
                  ))}
                  <Legend />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--popover))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {metrics.map(m => (
                <div key={m.provider_key} className="p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm font-medium">{m.display_name}</span>
                  <div className="text-xs text-muted-foreground mt-2 space-y-1">
                    <p>Avg Response: <span className="font-mono">{formatTime(m.avg_response_time)}</span></p>
                    <p>Success Rate: <span className="font-mono">{m.success_rate}%</span></p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Cost Breakdown Tab */}
          <TabsContent value="costs" className="space-y-4">
            {costBreakdownData.length > 0 ? (
              <>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={costBreakdownData} layout="vertical" margin={{ top: 20, right: 30, left: 100, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" tickFormatter={(v) => `$${v.toFixed(2)}`} className="fill-muted-foreground" />
                      <YAxis type="category" dataKey="display_name" tick={{ fontSize: 12 }} className="fill-muted-foreground" />
                      <Tooltip 
                        formatter={(value) => [`$${Number(value ?? 0).toFixed(4)}`, 'Total Cost']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--popover))', 
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Bar dataKey="total_cost" radius={[0, 4, 4, 0]}>
                        {costBreakdownData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {costBreakdownData.slice(0, 3).map((m, i) => (
                    <div key={m.provider_key} className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{m.display_name}</span>
                        <Badge variant={i === 0 ? 'default' : 'secondary'}>
                          #{i + 1}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold">${m.total_cost.toFixed(4)}</div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {m.total_tokens.toLocaleString()} tokens • {m.total_calls} calls
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <p>No spending data available yet. Start making API calls to see cost breakdown.</p>
              </div>
            )}
          </TabsContent>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.map((m, i) => (
                <Card key={m.provider_key} className="border-l-4" style={{ borderLeftColor: CHART_COLORS[i % CHART_COLORS.length] }}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{m.display_name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-muted-foreground">Input Price</p>
                        <p className="font-mono font-medium">{formatCurrency(m.input_price)}/1K</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Output Price</p>
                        <p className="font-mono font-medium">{formatCurrency(m.output_price)}/1K</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Avg Response</p>
                        <p className="font-mono font-medium">{formatTime(m.avg_response_time)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Success Rate</p>
                        <p className="font-mono font-medium">{m.success_rate}%</p>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Total Spent</span>
                        <span className="font-bold">${m.total_cost.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
                        <span>{m.total_calls.toLocaleString()} calls</span>
                        <span>{m.total_tokens.toLocaleString()} tokens</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
