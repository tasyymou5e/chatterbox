import React, { Suspense } from 'react';
import { AsyncErrorBoundary } from '@/components/AsyncErrorBoundary';
import { PageSkeleton } from '@/components/skeletons/PageSkeleton';

const ParentReports = React.lazy(() => import('@/pages/parent/ParentReports'));

export default function ParentReportsLazy() {
  return (
    <AsyncErrorBoundary componentName="ParentReports">
      <Suspense fallback={<PageSkeleton variant="dashboard" />}>
        <ParentReports />
      </Suspense>
    </AsyncErrorBoundary>
  );
}
