import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

export interface FieldDistribution {
  field: string;
  count: number;
  percentage: number;
}

interface RepairedFieldsChartProps {
  data: FieldDistribution[];
  loading?: boolean;
}

const COLORS = {
  profile: 'hsl(217, 91%, 60%)',
  role: 'hsl(280, 87%, 65%)',
  family: 'hsl(142, 76%, 36%)',
};

const chartConfig = {
  profile: {
    label: 'Profile',
    color: COLORS.profile,
  },
  role: {
    label: 'Role',
    color: COLORS.role,
  },
  family: {
    label: 'Family',
    color: COLORS.family,
  },
};

export function RepairedFieldsChart({ data, loading }: RepairedFieldsChartProps) {
  if (loading) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Fields Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-gray-700 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  const totalRepairs = data.reduce((sum, item) => sum + item.count, 0);

  if (totalRepairs === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Fields Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-gray-400">
            No field repairs recorded yet
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map(item => ({
    ...item,
    name: item.field.charAt(0).toUpperCase() + item.field.slice(1),
  }));

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Fields Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="count"
                nameKey="name"
                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(1)}%`}
                labelLine={{ stroke: '#9CA3AF' }}
              >
                {chartData.map((entry) => (
                  <Cell 
                    key={`cell-${entry.field}`} 
                    fill={COLORS[entry.field as keyof typeof COLORS] || '#6B7280'} 
                  />
                ))}
              </Pie>
              <ChartTooltip 
                content={<ChartTooltipContent />}
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Legend 
                formatter={(value) => <span style={{ color: '#9CA3AF' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

export default RepairedFieldsChart;
