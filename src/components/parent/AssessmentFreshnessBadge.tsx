/**
 * AssessmentFreshnessBadge - Shows visual staleness indicator for assessment results
 * Fresh (< 30 days) | Aging (30-90 days) | Stale (> 90 days)
 */
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { differenceInDays, formatDistanceToNow } from 'date-fns';

interface AssessmentFreshnessBadgeProps {
  createdAt: string;
  className?: string;
}

type FreshnessLevel = 'fresh' | 'aging' | 'stale';

const FRESHNESS_CONFIG: Record<FreshnessLevel, { label: string; className: string; description: string }> = {
  fresh: {
    label: '● Fresh',
    className: 'bg-secondary/15 text-secondary border-secondary/30',
    description: 'This assessment is recent and up to date.',
  },
  aging: {
    label: '● Aging',
    className: 'bg-warning/15 text-warning border-warning/30',
    description: 'Consider re-assessing soon to track progress.',
  },
  stale: {
    label: '● Stale',
    className: 'bg-destructive/15 text-destructive border-destructive/30',
    description: 'This assessment is outdated. A new assessment is recommended.',
  },
};

function getFreshnessLevel(createdAt: string): FreshnessLevel {
  const days = differenceInDays(new Date(), new Date(createdAt));
  if (days < 30) return 'fresh';
  if (days < 90) return 'aging';
  return 'stale';
}

export function AssessmentFreshnessBadge({ createdAt, className = '' }: AssessmentFreshnessBadgeProps) {
  const level = getFreshnessLevel(createdAt);
  const config = FRESHNESS_CONFIG[level];
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="outline" className={`text-xs ${config.className} ${className}`}>
          {config.label}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px]">
        <p className="text-xs font-medium">{config.description}</p>
        <p className="text-xs text-muted-foreground mt-1">Taken {timeAgo}</p>
      </TooltipContent>
    </Tooltip>
  );
}
