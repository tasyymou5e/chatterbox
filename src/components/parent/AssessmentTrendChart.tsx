import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import type { AssessmentScores } from '@/utils/assessmentScoring';

interface AssessmentResult {
  id: string;
  assessment_type: string;
  subject_name: string;
  overall_grade: string | null;
  created_at: string;
  scores: AssessmentScores | null;
  ai_review: { categories: Record<string, string>; overall: string } | null;
}

interface Props {
  results: AssessmentResult[];
}

const chartConfig: ChartConfig = {
  overall: {
    label: 'Overall %',
    color: 'hsl(var(--primary))',
  },
};

export const AssessmentTrendChart: React.FC<Props> = ({ results }) => {
  const chartData = useMemo(() => {
    const withScores = results
      .filter((r) => r.scores)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (withScores.length < 2) return null;

    return withScores.map((r) => ({
      date: format(new Date(r.created_at), 'MMM d'),
      overall: Math.round(r.scores!.overallPercentage),
      type: r.assessment_type,
      name: r.subject_name,
    }));
  }, [results]);

  if (!chartData) return null;

  return (
    <Card className="border-border shadow-sm mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Score Trend Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-48 w-full">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11 }}
              className="fill-muted-foreground"
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              type="monotone"
              dataKey="overall"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={{ fill: 'hsl(var(--primary))', r: 4 }}
              activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
            />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
