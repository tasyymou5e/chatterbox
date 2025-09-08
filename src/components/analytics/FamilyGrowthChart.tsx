import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface FamilyGrowthData {
  date: string;
  new_families: number;
  cumulative_families: number;
  avg_family_size: number;
  active_families: number;
}

interface FamilyGrowthChartProps {
  data: FamilyGrowthData[];
  loading?: boolean;
}

const chartConfig = {
  new_families: {
    label: "New Families",
    color: "hsl(var(--primary))",
  },
  cumulative_families: {
    label: "Total Families",
    color: "hsl(var(--secondary))",
  },
  active_families: {
    label: "Active Families",
    color: "hsl(var(--accent))",
  },
};

export const FamilyGrowthChart = ({ data, loading = false }: FamilyGrowthChartProps) => {
  if (loading) {
    return (
      <Card className="bg-gradient-card border-border shadow-soft">
        <CardHeader>
          <CardTitle className="text-foreground">Family Growth Patterns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse bg-muted rounded h-80 w-full"></div>
        </CardContent>
      </Card>
    );
  }

  const formattedData = data.map(item => ({
    ...item,
    date: new Date(item.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }));

  return (
    <Card className="bg-gradient-card border-border shadow-soft">
      <CardHeader>
        <CardTitle className="text-foreground">Family Growth Patterns</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={formattedData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
              <Line 
                type="monotone" 
                dataKey="new_families" 
                stroke="var(--color-new_families)"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="cumulative_families" 
                stroke="var(--color-cumulative_families)"
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              <Line 
                type="monotone" 
                dataKey="active_families" 
                stroke="var(--color-active_families)"
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