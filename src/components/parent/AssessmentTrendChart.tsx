import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
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

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--secondary))',
  'hsl(var(--accent))',
  'hsl(var(--destructive))',
  'hsl(var(--warning))',
];

export const AssessmentTrendChart: React.FC<Props> = ({ results }) => {
  const { chartData, subjects, config } = useMemo(() => {
    const withScores = results
      .filter((r) => r.scores)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (withScores.length < 2) return { chartData: null, subjects: [], config: {} };

    // Group by date
    const groupedByDate: Record<string, any> = {};
    const uniqueSubjects = new Set<string>();

    withScores.forEach((r) => {
      const date = format(new Date(r.created_at), 'MMM d');
      if (!groupedByDate[date]) {
        groupedByDate[date] = { date };
      }
      groupedByDate[date][r.subject_name] = Math.round(r.scores!.overallPercentage);
      uniqueSubjects.add(r.subject_name);
    });

    const data = Object.values(groupedByDate);
    const subjectList = Array.from(uniqueSubjects);

    const generatedConfig: ChartConfig = {};
    subjectList.forEach((subject, index) => {
      generatedConfig[subject] = {
        label: subject,
        color: CHART_COLORS[index % CHART_COLORS.length],
      };
    });

    return { chartData: data, subjects: subjectList, config: generatedConfig };
  }, [results]);

  if (!chartData || chartData.length < 2) return null;

  return (
    <Card className="border-border shadow-sm mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Score Trend Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={config} className="h-64 w-full">
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
            <ChartLegend content={<ChartLegendContent />} />
            {subjects.map((subject, index) => (
              <Line
                key={subject}
                type="monotone"
                dataKey={subject}
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                strokeWidth={2}
                connectNulls={true}
                dot={{ fill: CHART_COLORS[index % CHART_COLORS.length], r: 4 }}
                activeDot={{ r: 6, fill: CHART_COLORS[index % CHART_COLORS.length] }}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
