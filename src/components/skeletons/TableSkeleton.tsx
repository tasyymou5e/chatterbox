import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface TableSkeletonProps {
  columns?: number;
  rows?: number;
  showHeader?: boolean;
  showPagination?: boolean;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  columns = 5,
  rows = 8,
  showHeader = true,
  showPagination = true,
  className,
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        {showHeader && (
          <div className="flex gap-4 p-4 border-b bg-muted/50">
            {[...Array(columns)].map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
        )}
        
        {/* Table Rows */}
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="flex gap-4 p-4 border-b last:border-b-0">
            {[...Array(columns)].map((_, j) => (
              <Skeleton 
                key={j} 
                className={cn(
                  'h-4 flex-1',
                  j === 0 && 'max-w-[200px]',
                  j === columns - 1 && 'max-w-[100px]'
                )} 
              />
            ))}
          </div>
        ))}
      </div>
      
      {/* Pagination */}
      {showPagination && (
        <div className="flex justify-between items-center">
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      )}
    </div>
  );
};

export default TableSkeleton;
