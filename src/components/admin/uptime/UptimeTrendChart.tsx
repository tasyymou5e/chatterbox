import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO } from 'date-fns';
import type { DailyUptimeTrend } from '@/hooks/useUptimeStats';

interface UptimeTrendChartProps {
  data: DailyUptimeTrend[];
  slaTarget: number;
  loading?: boolean;
  selectedFunction?: string | null;
  title?: string;
}

export function UptimeTrendChart({
  data,
  slaTarget,
  loading,
  selectedFunction,
  title = 'Uptime Trend',
}: UptimeTrendChartProps) {
  const chartData = useMemo(() => {
    if (!data.length) return [];

    // If a specific function is selected, show just that function
    if (selectedFunction) {
      return data
        .filter((d) => d.function_name === selectedFunction)
        .map((d) => ({
          date: d.date,
          displayDate: format(parseISO(d.date), 'MMM d'),
          uptime: d.uptime_percentage,
          responseTime: d.avg_response_time_ms,
        }))
        .reverse();
    }

    // Otherwise, aggregate all functions by date
    const byDate = new Map<
      string,
      {
        uptimes: number[];
        responseTimes: number[];
      }
    >();

    data.forEach((d) => {
      const existing = byDate.get(d.date) || { uptimes: [], responseTimes: [] };
      existing.uptimes.push(d.uptime_percentage);
      if (d.avg_response_time_ms) {
        existing.responseTimes.push(d.avg_response_time_ms);
      }
      byDate.set(d.date, existing);
    });

    return Array.from(byDate.entries())
      .map(([date, values]) => ({
        date,
        displayDate: format(parseISO(date), 'MMM d'),
        uptime:
          values.uptimes.reduce((a, b) => a + b, 0) / values.uptimes.length,
        responseTime:
          values.responseTimes.length > 0
            ? values.responseTimes.reduce((a, b) => a + b, 0) /
              values.responseTimes.length
            : null,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data, selectedFunction]);

  if (loading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <Skeleton className="h-6 w-40 bg-gray-700" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full bg-gray-700" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">{title}</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <p className="text-gray-500">No trend data available for this period</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-white flex items-center justify-between">
          <span>{selectedFunction ? `${selectedFunction} Trend` : title}</span>
          <span className="text-sm font-normal text-gray-400">
            SLA Target: {slaTarget}%
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="displayDate"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickLine={{ stroke: '#4b5563' }}
              />
              <YAxis
                yAxisId="uptime"
                domain={[
                  (dataMin: number) => Math.max(0, Math.floor(dataMin - 1)),
                  100,
                ]}
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickLine={{ stroke: '#4b5563' }}
                tickFormatter={(value) => `${value}%`}
              />
              <YAxis
                yAxisId="response"
                orientation="right"
                stroke="#9ca3af"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickLine={{ stroke: '#4b5563' }}
                tickFormatter={(value) => `${value}ms`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                }}
                labelStyle={{ color: '#fff' }}
                formatter={(value, name) => {
                  if (value === undefined) return ['-', String(name)];
                  if (name === 'uptime')
                    return [`${Number(value).toFixed(2)}%`, 'Uptime'];
                  if (name === 'responseTime')
                    return [`${Math.round(Number(value))}ms`, 'Avg Response'];
                  return [value, String(name)];
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => {
                  if (value === 'uptime') return 'Uptime %';
                  if (value === 'responseTime') return 'Response Time';
                  return value;
                }}
              />
              <ReferenceLine
                yAxisId="uptime"
                y={slaTarget}
                stroke="#ef4444"
                strokeDasharray="5 5"
                label={{
                  value: 'SLA',
                  position: 'insideTopRight',
                  fill: '#ef4444',
                  fontSize: 11,
                }}
              />
              <Line
                yAxisId="uptime"
                type="monotone"
                dataKey="uptime"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ fill: '#22c55e', strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, stroke: '#22c55e', strokeWidth: 2 }}
              />
              <Line
                yAxisId="response"
                type="monotone"
                dataKey="responseTime"
                stroke="#3b82f6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#3b82f6', strokeWidth: 0, r: 2 }}
                activeDot={{ r: 4, stroke: '#3b82f6', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
