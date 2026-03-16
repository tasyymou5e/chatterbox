import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface RetentionData {
  cohort_date: string;
  users_count: number;
  retention_day_1: number;
  retention_day_7: number;
  retention_day_30: number;
}

interface RetentionChartProps {
  data: RetentionData[];
  loading?: boolean;
}

const chartConfig = {
  retention_day_1: {
    label: "1-Day Retention",
    color: "hsl(var(--primary))",
  },
  retention_day_7: {
    label: "7-Day Retention",
    color: "hsl(var(--secondary))",
  },
  retention_day_30: {
    label: "30-Day Retention",
    color: "hsl(var(--accent))",
  },
};

export const RetentionChart = ({ data, loading = false }: RetentionChartProps) => {
  if (loading) {
    return (
      <Card className="bg-gradient-card border-border shadow-soft">
        <CardHeader>
          <CardTitle className="text-foreground">User Retention Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse bg-muted rounded h-80 w-full"></div>
        </CardContent>
      </Card>
    );
  }

  const formattedData = data.map(item => ({
    ...item,
    cohort_date: new Date(item.cohort_date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }));

  return (
    <Card className="bg-gradient-card border-border shadow-soft">
      <CardHeader>
        <CardTitle className="text-foreground">User Retention Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="cohort_date" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                domain={[0, 100]}
                label={{ value: 'Retention %', angle: -90, position: 'insideLeft' }}
              />
              <ChartTooltip 
                content={<ChartTooltipContent />}
                formatter={(value, name) => [`${value}%`, name]}
              />
              <Bar 
                dataKey="retention_day_1" 
                fill="var(--color-retention_day_1)"
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey="retention_day_7" 
                fill="var(--color-retention_day_7)"
                radius={[2, 2, 0, 0]}
              />
              <Bar 
                dataKey="retention_day_30" 
                fill="var(--color-retention_day_30)"
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};