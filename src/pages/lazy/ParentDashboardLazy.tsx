import React, { Suspense } from 'react';
import { AsyncErrorBoundary } from '@/components/AsyncErrorBoundary';
import { PageSkeleton } from '@/components/skeletons/PageSkeleton';

const ParentDashboard = React.lazy(() => import('@/pages/ParentDashboard'));

export default function ParentDashboardLazy() {
  return (
    <AsyncErrorBoundary componentName="ParentDashboard">
      <Suspense fallback={<PageSkeleton variant="dashboard" />}>
        <ParentDashboard />
      </Suspense>
    </AsyncErrorBoundary>
  );
}
