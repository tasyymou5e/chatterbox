import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { HealthGrade } from '@/types/dataHealth';
import { GRADE_FILL_COLORS, GRADE_LABELS, GRADE_BG_COLORS, GRADE_COLORS } from '@/types/dataHealth';

interface HealthScoreGaugeProps {
  score: number;
  grade: HealthGrade;
  size?: 'compact' | 'standard' | 'large';
  showLabel?: boolean;
  animated?: boolean;
  className?: string;
}

export function HealthScoreGauge({
  score,
  grade,
  size = 'standard',
  showLabel = true,
  animated = true,
  className
}: HealthScoreGaugeProps) {
  const dimensions = useMemo(() => {
    switch (size) {
      case 'compact':
        return { width: 80, height: 80, strokeWidth: 6, fontSize: 20, labelSize: 10 };
      case 'large':
        return { width: 200, height: 200, strokeWidth: 12, fontSize: 48, labelSize: 16 };
      default:
        return { width: 120, height: 120, strokeWidth: 8, fontSize: 28, labelSize: 12 };
    }
  }, [size]);

  const { width, height, strokeWidth, fontSize, labelSize } = dimensions;
  const radius = (width - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const center = width / 2;

  const fillColor = GRADE_FILL_COLORS[grade];

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <div className="relative" style={{ width, height }}>
        {/* Background circle */}
        <svg width={width} height={height} className="rotate-[-90deg]">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-muted/20"
          />
          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={fillColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn(animated && 'transition-all duration-1000 ease-out')}
          />
        </svg>
        
        {/* Score text in center */}
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ fontSize }}
        >
          <span className={cn('font-bold', GRADE_COLORS[grade])}>
            {score}
          </span>
          {size !== 'compact' && (
            <span 
              className="text-muted-foreground"
              style={{ fontSize: labelSize }}
            >
              /100
            </span>
          )}
        </div>
      </div>
      
      {showLabel && (
        <Badge 
          variant="outline" 
          className={cn('font-medium', GRADE_BG_COLORS[grade], GRADE_COLORS[grade])}
        >
          {GRADE_LABELS[grade]}
        </Badge>
      )}
    </div>
  );
}
