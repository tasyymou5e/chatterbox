import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { SLAStatus } from '@/hooks/useUptimeStats';

interface SLAComplianceBadgeProps {
  status: SLAStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<
  SLAStatus,
  {
    label: string;
    icon: typeof CheckCircle2;
    className: string;
  }
> = {
  passing: {
    label: 'Passing',
    icon: CheckCircle2,
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
  },
  warning: {
    label: 'Warning',
    icon: AlertTriangle,
    className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  },
  failing: {
    label: 'Failing',
    icon: XCircle,
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
  },
};

const sizeConfig = {
  sm: { badge: 'text-xs px-1.5 py-0.5', icon: 'h-3 w-3' },
  md: { badge: 'text-sm px-2 py-1', icon: 'h-4 w-4' },
  lg: { badge: 'text-base px-3 py-1.5', icon: 'h-5 w-5' },
};

export function SLAComplianceBadge({
  status,
  showLabel = true,
  size = 'md',
}: SLAComplianceBadgeProps) {
  const config = statusConfig[status];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={`${config.className} ${sizes.badge} flex items-center gap-1`}
    >
      <Icon className={sizes.icon} />
      {showLabel && <span>{config.label}</span>}
    </Badge>
  );
}
