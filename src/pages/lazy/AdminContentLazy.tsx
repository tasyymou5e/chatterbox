import React, { Suspense } from 'react';
import { AsyncErrorBoundary } from '@/components/AsyncErrorBoundary';
import { PageSkeleton } from '@/components/skeletons/PageSkeleton';

const AdminContent = React.lazy(() => import('@/pages/admin/AdminContent'));

export default function AdminContentLazy() {
  return (
    <AsyncErrorBoundary componentName="AdminContent">
      <Suspense fallback={<PageSkeleton variant="table" />}>
        <AdminContent />
      </Suspense>
    </AsyncErrorBoundary>
  );
}
