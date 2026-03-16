import React, { Suspense } from 'react';
import { AsyncErrorBoundary } from '@/components/AsyncErrorBoundary';
import { PageSkeleton } from '@/components/skeletons/PageSkeleton';

const SubtractionGameDemo = React.lazy(() => import('@/pages/SubtractionGameDemo'));

export default function SubtractionGameDemoLazy() {
  return (
    <AsyncErrorBoundary componentName="SubtractionGameDemo">
      <Suspense fallback={<PageSkeleton variant="game" />}>
        <SubtractionGameDemo />
      </Suspense>
    </AsyncErrorBoundary>
  );
}
