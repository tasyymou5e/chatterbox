import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, DollarSign, Cpu, Activity } from "lucide-react";

interface DailyUsage {
  [date: string]: {
    calls: number;
    tokens: number;
    cost: number;
  };
}

interface LLMUsageTrendsChartProps {
  dailyUsage: DailyUsage;
  isLoading?: boolean;
}

type MetricType = "cost" | "tokens" | "calls";

export function LLMUsageTrendsChart({ dailyUsage, isLoading }: LLMUsageTrendsChartProps) {
  const [activeMetric, setActiveMetric] = useState<MetricType>("cost");

  const chartData = useMemo(() => {
    if (!dailyUsage || Object.keys(dailyUsage).length === 0) {
      return [];
    }

    return Object.entries(dailyUsage)
      .map(([date, data]) => ({
        date,
        displayDate: new Date(date).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        cost: Number(data.cost) || 0,
        tokens: Number(data.tokens) || 0,
        calls: Number(data.calls) || 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [dailyUsage]);

  const formatValue = (value: number, metric: MetricType) => {
    switch (metric) {
      case "cost":
        return `$${value.toFixed(2)}`;
      case "tokens":
        return value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value.toString();
      case "calls":
        return value.toString();
    }
  };

  const getMetricConfig = (metric: MetricType) => {
    switch (metric) {
      case "cost":
        return {
          label: "Cost ($)",
          color: "hsl(var(--primary))",
          gradientId: "costGradient",
          icon: DollarSign,
        };
      case "tokens":
        return {
          label: "Tokens",
          color: "hsl(var(--chart-2))",
          gradientId: "tokensGradient",
          icon: Cpu,
        };
      case "calls":
        return {
          label: "API Calls",
          color: "hsl(var(--chart-3))",
          gradientId: "callsGradient",
          icon: Activity,
        };
    }
  };

  const config = getMetricConfig(activeMetric);

  const totals = useMemo(() => {
    return chartData.reduce(
      (acc, day) => ({
        cost: acc.cost + day.cost,
        tokens: acc.tokens + day.tokens,
        calls: acc.calls + day.calls,
      }),
      { cost: 0, tokens: 0, calls: 0 }
    );
  }, [chartData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading trends...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage Trends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No usage data available for the selected period
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Usage Trends
          </CardTitle>
          <Tabs value={activeMetric} onValueChange={(v) => setActiveMetric(v as MetricType)}>
            <TabsList className="h-8">
              <TabsTrigger value="cost" className="text-xs px-2 h-6">
                <DollarSign className="h-3 w-3 mr-1" />
                Cost
              </TabsTrigger>
              <TabsTrigger value="tokens" className="text-xs px-2 h-6">
                <Cpu className="h-3 w-3 mr-1" />
                Tokens
              </TabsTrigger>
              <TabsTrigger value="calls" className="text-xs px-2 h-6">
                <Activity className="h-3 w-3 mr-1" />
                Calls
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="flex gap-4 mt-2 text-sm text-muted-foreground">
          <span>Total: {formatValue(totals[activeMetric], activeMetric)}</span>
          <span>Days: {chartData.length}</span>
          <span>
            Avg: {formatValue(totals[activeMetric] / chartData.length, activeMetric)}/day
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={config.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={config.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={config.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="displayDate"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatValue(value, activeMetric)}
                className="text-muted-foreground"
                width={60}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number | undefined) => value !== undefined ? [formatValue(value, activeMetric), config.label] : ['N/A', config.label]}
              />
              <Area
                type="monotone"
                dataKey={activeMetric}
                stroke={config.color}
                strokeWidth={2}
                fill={`url(#${config.gradientId})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
