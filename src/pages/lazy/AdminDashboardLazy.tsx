import React, { Suspense } from 'react';
import { AsyncErrorBoundary } from '@/components/AsyncErrorBoundary';
import { PageSkeleton } from '@/components/skeletons/PageSkeleton';

const AdminDashboard = React.lazy(() => import('@/pages/admin/AdminDashboard'));

export default function AdminDashboardLazy() {
  return (
    <AsyncErrorBoundary componentName="AdminDashboard">
      <Suspense fallback={<PageSkeleton variant="dashboard" />}>
        <AdminDashboard />
      </Suspense>
    </AsyncErrorBoundary>
  );
}
