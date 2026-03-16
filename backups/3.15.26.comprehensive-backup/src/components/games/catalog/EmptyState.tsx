/**
 * Empty state component for when no content matches filters
 */

import React from 'react';

export const EmptyState = React.memo(function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">🔍</div>
      <h3 className="text-xl font-semibold mb-2">No content found</h3>
      <p className="text-muted-foreground">
        Try adjusting your search or filter criteria
      </p>
    </div>
  );
});

export default EmptyState;
