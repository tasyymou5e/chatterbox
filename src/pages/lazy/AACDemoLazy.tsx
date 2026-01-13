import React, { Suspense } from 'react';
import { AsyncErrorBoundary } from '@/components/AsyncErrorBoundary';
import { PageSkeleton } from '@/components/skeletons/PageSkeleton';

const AACDemo = React.lazy(() => import('@/pages/AACDemo'));

export default function AACDemoLazy() {
  return (
    <AsyncErrorBoundary componentName="AACDemo">
      <Suspense fallback={<PageSkeleton variant="game" />}>
        <AACDemo />
      </Suspense>
    </AsyncErrorBoundary>
  );
}
