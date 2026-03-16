import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';

export interface DailyRepairData {
  date: string;
  successful: number;
  failed: number;
  total: number;
}

interface RepairTrendsChartProps {
  data: DailyRepairData[];
  loading?: boolean;
}

const chartConfig = {
  successful: {
    label: 'Successful',
    color: 'hsl(142, 76%, 36%)',
  },
  failed: {
    label: 'Failed',
    color: 'hsl(0, 84%, 60%)',
  },
};

export function RepairTrendsChart({ data, loading }: RepairTrendsChartProps) {
  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Repair Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-gray-700 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Repair Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-gray-400">
            No repair data available yet
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Repair Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
              />
              <YAxis 
                stroke="#9CA3AF"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                allowDecimals={false}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => <span style={{ color: '#9CA3AF' }}>{value}</span>}
              />
              <Line
                type="monotone"
                dataKey="successful"
                stroke={chartConfig.successful.color}
                strokeWidth={2}
                dot={{ fill: chartConfig.successful.color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="failed"
                stroke={chartConfig.failed.color}
                strokeWidth={2}
                dot={{ fill: chartConfig.failed.color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export default RepairTrendsChart;
