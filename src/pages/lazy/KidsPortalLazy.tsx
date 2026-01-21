import React from 'react';
import { PageSkeleton } from '@/components/skeletons/PageSkeleton';

const KidsPortal = React.lazy(() => import('./KidsPortal'));

export default function KidsPortalLazy() {
  return (
    <React.Suspense fallback={<PageSkeleton variant="game" />}>
      <KidsPortal />
    </React.Suspense>
  );
}
