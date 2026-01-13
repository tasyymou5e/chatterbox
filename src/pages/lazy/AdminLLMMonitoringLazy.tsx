import React, { Suspense } from 'react';
import { AsyncErrorBoundary } from '@/components/AsyncErrorBoundary';
import { PageSkeleton } from '@/components/skeletons/PageSkeleton';

const AdminLLMMonitoring = React.lazy(() => import('@/pages/admin/AdminLLMMonitoring'));

export default function AdminLLMMonitoringLazy() {
  return (
    <AsyncErrorBoundary componentName="AdminLLMMonitoring">
      <Suspense fallback={<PageSkeleton variant="dashboard" />}>
        <AdminLLMMonitoring />
      </Suspense>
    </AsyncErrorBoundary>
  );
}
