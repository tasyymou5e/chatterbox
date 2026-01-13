import React, { Suspense } from 'react';
import { AsyncErrorBoundary } from '@/components/AsyncErrorBoundary';
import { PageSkeleton } from '@/components/skeletons/PageSkeleton';

const AdminSystemMonitoring = React.lazy(() => import('@/pages/admin/AdminSystemMonitoring'));

export default function AdminSystemMonitoringLazy() {
  return (
    <AsyncErrorBoundary componentName="AdminSystemMonitoring">
      <Suspense fallback={<PageSkeleton variant="dashboard" />}>
        <AdminSystemMonitoring />
      </Suspense>
    </AsyncErrorBoundary>
  );
}
