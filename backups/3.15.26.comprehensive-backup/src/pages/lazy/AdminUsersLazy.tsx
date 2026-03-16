import React, { Suspense } from 'react';
import { AsyncErrorBoundary } from '@/components/AsyncErrorBoundary';
import { PageSkeleton } from '@/components/skeletons/PageSkeleton';

const AdminUsers = React.lazy(() => import('@/pages/admin/AdminUsers'));

export default function AdminUsersLazy() {
  return (
    <AsyncErrorBoundary componentName="AdminUsers">
      <Suspense fallback={<PageSkeleton variant="table" />}>
        <AdminUsers />
      </Suspense>
    </AsyncErrorBoundary>
  );
}
