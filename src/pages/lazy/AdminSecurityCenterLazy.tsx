import React, { Suspense } from 'react';
import { AsyncErrorBoundary } from '@/components/AsyncErrorBoundary';
import { PageSkeleton } from '@/components/skeletons/PageSkeleton';

const AdminSecurityCenter = React.lazy(() => 
  import('@/pages/admin/AdminSecurityCenter').then(m => ({ default: m.AdminSecurityCenter }))
);

export default function AdminSecurityCenterLazy() {
  return (
    <AsyncErrorBoundary componentName="AdminSecurityCenter">
      <Suspense fallback={<PageSkeleton variant="dashboard" />}>
        <AdminSecurityCenter />
      </Suspense>
    </AsyncErrorBoundary>
  );
}
