import React, { Suspense } from 'react';
import { AsyncErrorBoundary } from '@/components/AsyncErrorBoundary';
import { PageSkeleton } from '@/components/skeletons/PageSkeleton';

const AdminReports = React.lazy(() => import('@/pages/admin/AdminReports'));

export default function AdminReportsLazy() {
  return (
    <AsyncErrorBoundary componentName="AdminReports">
      <Suspense fallback={<PageSkeleton variant="dashboard" />}>
        <AdminReports />
      </Suspense>
    </AsyncErrorBoundary>
  );
}
