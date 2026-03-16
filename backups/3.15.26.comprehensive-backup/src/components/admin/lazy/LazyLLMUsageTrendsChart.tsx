import React, { Suspense, ComponentProps } from 'react';
import { ChartSkeleton } from '@/components/skeletons/ChartSkeleton';

const LLMUsageTrendsChartComponent = React.lazy(() =>
  import('../LLMUsageTrendsChart').then((m) => ({ default: m.LLMUsageTrendsChart }))
);

type LLMUsageTrendsChartProps = ComponentProps<typeof LLMUsageTrendsChartComponent>;

export const LazyLLMUsageTrendsChart = (props: LLMUsageTrendsChartProps) => (
  <Suspense fallback={<ChartSkeleton title="Usage Trends" height="h-[300px]" />}>
    <LLMUsageTrendsChartComponent {...props} />
  </Suspense>
);
