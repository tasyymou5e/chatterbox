import React, { Suspense } from 'react';
import { AsyncErrorBoundary } from '@/components/AsyncErrorBoundary';
import { PageSkeleton } from '@/components/skeletons/PageSkeleton';

const AdminFamilies = React.lazy(() => import('@/pages/admin/AdminFamilies'));

export default function AdminFamiliesLazy() {
  return (
    <AsyncErrorBoundary componentName="AdminFamilies">
      <Suspense fallback={<PageSkeleton variant="table" />}>
        <AdminFamilies />
      </Suspense>
    </AsyncErrorBoundary>
  );
}
