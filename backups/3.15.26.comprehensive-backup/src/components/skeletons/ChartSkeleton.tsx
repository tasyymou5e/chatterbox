import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export interface ChartSkeletonProps {
  title?: string;
  height?: string;
  className?: string;
}

export const ChartSkeleton = ({ 
  title, 
  height = 'h-80',
  className = ''
}: ChartSkeletonProps) => (
  <Card className={`bg-gradient-card border-border shadow-soft ${className}`}>
    <CardHeader>
      {title ? (
        <div className="text-lg font-semibold text-foreground">{title}</div>
      ) : (
        <Skeleton className="h-6 w-48" />
      )}
    </CardHeader>
    <CardContent>
      <Skeleton className={`${height} w-full rounded`} />
    </CardContent>
  </Card>
);
