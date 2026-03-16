/**
 * Performance monitoring badge component
 */
import React from 'react';
import { Badge } from '@/components/ui/badge';

interface PerformanceBadgeProps {
  componentName: string;
  showMetrics?: boolean;
  className?: string;
}

export const PerformanceBadge: React.FC<PerformanceBadgeProps> = ({
  componentName,
  showMetrics = false,
  className
}) => {
  if (!showMetrics || process.env.NODE_ENV !== 'development') return null;
  
  return (
    <Badge 
      variant="secondary"
      className={className}
      title={`Performance monitoring for ${componentName}`}
    >
      ⚡ {componentName}
    </Badge>
  );
};