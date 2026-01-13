import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EngagementData {
  date: string;
  active_users: number;
  new_signups: number;
  total_users: number;
  total_families: number;
  engagement_score: number;
}

interface EngagementChartProps {
  data: EngagementData[];
  loading?: boolean;
}

const chartConfig = {
  active_users: {
    label: "Active Users",
    color: "hsl(var(--primary))",
  },
  new_signups: {
    label: "New Signups",
    color: "hsl(var(--secondary))",
  },
  total_users: {
    label: "Total Users",
    color: "hsl(var(--accent))",
  },
};

export const EngagementChart = ({ data, loading = false }: EngagementChartProps) => {
  if (loading) {
    return (
      <Card className="bg-gradient-card border-border shadow-soft">
        <CardHeader>
          <CardTitle className="text-foreground">User Engagement Trends</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse bg-muted rounded h-80 w-full"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border shadow-soft">
      <CardHeader>
        <CardTitle className="text-foreground">User Engagement Trends</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Legend />
               <Line 
                type="monotone" 
                dataKey="active_users" 
                stroke="var(--color-active_users)"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="new_signups" 
                stroke="var(--color-new_signups)"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="total_users" 
                stroke="var(--color-total_users)"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};