import React, { Suspense, ComponentProps } from 'react';
import { ChartSkeleton } from '@/components/skeletons/ChartSkeleton';

// Lazy imports for chart components
const EngagementChartComponent = React.lazy(() =>
  import('../EngagementChart').then((m) => ({ default: m.EngagementChart }))
);

const RetentionChartComponent = React.lazy(() =>
  import('../RetentionChart').then((m) => ({ default: m.RetentionChart }))
);

const FamilyGrowthChartComponent = React.lazy(() =>
  import('../FamilyGrowthChart').then((m) => ({ default: m.FamilyGrowthChart }))
);

// Type-safe lazy wrappers
type EngagementChartProps = ComponentProps<typeof EngagementChartComponent>;
type RetentionChartProps = ComponentProps<typeof RetentionChartComponent>;
type FamilyGrowthChartProps = ComponentProps<typeof FamilyGrowthChartComponent>;

export const LazyEngagementChart = (props: EngagementChartProps) => (
  <Suspense fallback={<ChartSkeleton title="User Engagement Trends" />}>
    <EngagementChartComponent {...props} />
  </Suspense>
);

export const LazyRetentionChart = (props: RetentionChartProps) => (
  <Suspense fallback={<ChartSkeleton title="User Retention Analysis" />}>
    <RetentionChartComponent {...props} />
  </Suspense>
);

export const LazyFamilyGrowthChart = (props: FamilyGrowthChartProps) => (
  <Suspense fallback={<ChartSkeleton title="Family Growth Patterns" />}>
    <FamilyGrowthChartComponent {...props} />
  </Suspense>
);
