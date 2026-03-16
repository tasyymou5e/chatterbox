/**
 * PassFailChart Component
 * 
 * @description Visual charts for test pass/fail distribution
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { PieChartIcon, BarChart3 } from 'lucide-react';
import type { ParsedTestRun, SuiteRunResult } from '@/types/testCoverage';

interface PassFailChartProps {
  stats: ParsedTestRun['stats'];
  suiteResults: SuiteRunResult[];
}

const chartConfig = {
  passed: {
    label: 'Passed',
    color: 'hsl(var(--primary))',
  },
  failed: {
    label: 'Failed',
    color: 'hsl(var(--destructive))',
  },
  skipped: {
    label: 'Skipped',
    color: 'hsl(var(--muted-foreground))',
  },
};

export function PassFailChart({ stats, suiteResults }: PassFailChartProps) {
  const pieData = [
    { name: 'Passed', value: stats.passed, fill: chartConfig.passed.color },
    { name: 'Failed', value: stats.failed, fill: chartConfig.failed.color },
    { name: 'Skipped', value: stats.skipped, fill: chartConfig.skipped.color },
  ].filter(d => d.value > 0);

  const barData = suiteResults.map(suite => ({
    name: suite.suiteName.length > 15 
      ? suite.suiteName.slice(0, 12) + '...' 
      : suite.suiteName,
    passed: suite.passed,
    failed: suite.failed,
    skipped: suite.skipped,
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Pie Chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <PieChartIcon className="h-4 w-4" />
            Overall Distribution
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
          
          {/* Legend */}
          <div className="flex justify-center gap-4 mt-2">
            {pieData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.fill }}
                />
                <span>{entry.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Bar Chart */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Results by Suite
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={100}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar 
                  dataKey="passed" 
                  stackId="a" 
                  fill={chartConfig.passed.color}
                  radius={[0, 0, 0, 0]}
                />
                <Bar 
                  dataKey="failed" 
                  stackId="a" 
                  fill={chartConfig.failed.color}
                  radius={[0, 0, 0, 0]}
                />
                <Bar 
                  dataKey="skipped" 
                  stackId="a" 
                  fill={chartConfig.skipped.color}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
