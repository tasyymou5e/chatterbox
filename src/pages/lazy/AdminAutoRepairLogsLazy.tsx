import React, { Suspense } from 'react';
import { AsyncErrorBoundary } from '@/components/AsyncErrorBoundary';
import { PageSkeleton } from '@/components/skeletons/PageSkeleton';

const AdminAutoRepairLogs = React.lazy(() => import('@/pages/admin/AdminAutoRepairLogs'));

export default function AdminAutoRepairLogsLazy() {
  return (
    <AsyncErrorBoundary componentName="AdminAutoRepairLogs">
      <Suspense fallback={<PageSkeleton variant="dashboard" />}>
        <AdminAutoRepairLogs />
      </Suspense>
    </AsyncErrorBoundary>
  );
}
