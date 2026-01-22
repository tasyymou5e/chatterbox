/**
 * Skeleton Loading Components for Better UX
 * Provides placeholder UI while data is loading
 */

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface SkeletonProps {
  className?: string;
  height?: string;
  width?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '', height = 'h-4', width = 'w-full' }) => (
  <div 
    className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    style={{ height: height.replace('h-', ''), width: width.includes('w-') ? undefined : width }}
  />
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 10 }) => (
  <Card>
    <CardHeader>
      <Skeleton height="h-6" width="w-48" />
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Skeleton height="h-4" width="w-24" /></TableHead>
            <TableHead><Skeleton height="h-4" width="w-32" /></TableHead>
            <TableHead><Skeleton height="h-4" width="w-20" /></TableHead>
            <TableHead><Skeleton height="h-4" width="w-28" /></TableHead>
            <TableHead><Skeleton height="h-4" width="w-24" /></TableHead>
            <TableHead><Skeleton height="h-4" width="w-16" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: rows }).map((_, index) => (
            <TableRow key={index}>
              <TableCell><Skeleton height="h-4" /></TableCell>
              <TableCell><Skeleton height="h-4" /></TableCell>
              <TableCell><Skeleton height="h-4" width="w-32" /></TableCell>
              <TableCell><Skeleton height="h-4" width="w-24" /></TableCell>
              <TableCell><Skeleton height="h-4" /></TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Skeleton height="h-8" width="h-8" className="rounded" />
                  <Skeleton height="h-8" width="h-8" className="rounded" />
                  <Skeleton height="h-8" width="h-8" className="rounded" />
                  <Skeleton height="h-8" width="h-8" className="rounded" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

export const UserStatsSkeleton: React.FC = () => (
  <div className="grid gap-4 md:grid-cols-4">
    {Array.from({ length: 4 }).map((_, index) => (
      <Card key={index} className="bg-gray-800 border-gray-700">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton height="h-4" width="w-32" />
          <Skeleton height="h-4" width="h-4" className="rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton height="h-8" width="w-16" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export const DashboardKPISkeleton: React.FC = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
    {Array.from({ length: 5 }).map((_, index) => (
      <Card key={index} className="bg-gradient-card border-border shadow-soft">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton height="h-4" width="w-36" />
          <Skeleton height="h-4" width="h-4" className="rounded-full" />
        </CardHeader>
        <CardContent>
          <Skeleton height="h-8" width="w-20" />
        </CardContent>
      </Card>
    ))}
  </div>
);

export const ChartSkeleton: React.FC = () => (
  <Card className="bg-gray-800 border-gray-700">
    <CardHeader>
      <Skeleton height="h-5" width="w-48" />
    </CardHeader>
    <CardContent>
      <div className="h-64 flex items-center justify-center">
        <div className="space-y-2 w-full">
          <Skeleton height="h-4" />
          <Skeleton height="h-4" width="w-3/4" />
          <Skeleton height="h-4" />
          <Skeleton height="h-4" width="w-2/3" />
          <Skeleton height="h-4" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export const FormSkeleton: React.FC<{ fields?: number }> = ({ fields = 4 }) => (
  <div className="space-y-6">
    {Array.from({ length: fields }).map((_, index) => (
      <div key={index} className="space-y-2">
        <Skeleton height="h-4" width="w-24" className="mb-2" />
        <Skeleton height="h-10" />
      </div>
    ))}
    <div className="flex justify-end space-x-2 pt-4">
      <Skeleton height="h-10" width="w-24" />
      <Skeleton height="h-10" width="w-32" />
    </div>
  </div>
);

export const LoadingOverlay: React.FC<{ 
  message?: string; 
  showProgress?: boolean;
  progress?: number;
}> = ({ message = 'Loading...', showProgress = false, progress = 0 }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4 shadow-lg">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-gray-900 dark:text-gray-100">{message}</p>
          {showProgress && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, progress)}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);

// Individual skeleton components for common patterns
export const TextSkeleton: React.FC<{ width?: string; lines?: number }> = ({ 
  width = 'w-full', 
  lines = 3 
}) => (
  <div className="space-y-2">
    {Array.from({ length: lines }).map((_, index) => (
      <Skeleton 
        key={index} 
        height="h-4" 
        width={index === 0 ? width : 'w-3/4'} 
      />
    ))}
  </div>
);

export const AvatarSkeleton: React.FC = () => (
  <div className="flex items-center space-x-3">
    <div className="animate-pulse">
      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
    </div>
    <div className="space-y-2">
      <Skeleton height="h-4" width="w-24" />
      <Skeleton height="h-3" width="w-32" />
    </div>
  </div>
);

export default Skeleton;