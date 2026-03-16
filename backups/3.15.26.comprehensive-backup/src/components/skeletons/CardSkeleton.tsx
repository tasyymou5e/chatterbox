import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface CardSkeletonProps {
  variant?: 'default' | 'compact' | 'media' | 'stat';
  className?: string;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({ 
  variant = 'default',
  className 
}) => {
  if (variant === 'stat') {
    return (
      <div className={cn('p-6 border rounded-lg space-y-3', className)}>
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={cn('p-4 border rounded-lg flex items-center gap-4', className)}>
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-8 w-16" />
      </div>
    );
  }

  if (variant === 'media') {
    return (
      <div className={cn('border rounded-lg overflow-hidden', className)}>
        <Skeleton className="h-40 w-full" />
        <div className="p-4 space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // Default
  return (
    <div className={cn('p-6 border rounded-lg space-y-4', className)}>
      <div className="flex justify-between items-start">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  );
};

export default CardSkeleton;
