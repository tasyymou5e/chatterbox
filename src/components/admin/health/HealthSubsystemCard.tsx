import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';

interface MetricItem {
  label: string;
  value: string | number;
  highlight?: boolean;
}

interface HealthSubsystemCardProps {
  title: string;
  icon: LucideIcon;
  score: number;
  status: 'healthy' | 'warning' | 'critical';
  trend?: 'up' | 'down' | 'stable';
  metrics: MetricItem[];
  className?: string;
}

const STATUS_STYLES = {
  healthy: {
    badge: 'bg-green-500/10 text-green-500 border-green-500/30',
    progress: 'bg-green-500',
    icon: 'text-green-500'
  },
  warning: {
    badge: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
    progress: 'bg-yellow-500',
    icon: 'text-yellow-500'
  },
  critical: {
    badge: 'bg-red-500/10 text-red-500 border-red-500/30',
    progress: 'bg-red-500',
    icon: 'text-red-500'
  }
};

export function HealthSubsystemCard({
  title,
  icon: Icon,
  score,
  status,
  trend = 'stable',
  metrics,
  className
}: HealthSubsystemCardProps) {
  const styles = STATUS_STYLES[status];
  
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground';

  return (
    <Card className={cn('', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Icon className={cn('h-4 w-4', styles.icon)} />
            {title}
          </CardTitle>
          <div className="flex items-center gap-2">
            <TrendIcon className={cn('h-4 w-4', trendColor)} />
            <Badge variant="outline" className={styles.badge}>
              {status}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score with progress bar */}
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold">{score}</span>
            <span className="text-sm text-muted-foreground">/100</span>
          </div>
          <Progress 
            value={score} 
            className="h-2"
            // Apply color via CSS variable override
            style={{ 
              '--progress-foreground': status === 'healthy' ? '#22c55e' : 
                                       status === 'warning' ? '#eab308' : '#ef4444' 
            } as React.CSSProperties}
          />
        </div>
        
        {/* Metrics list */}
        <div className="space-y-2">
          {metrics.map((metric, index) => (
            <div 
              key={index}
              className={cn(
                'flex items-center justify-between text-sm',
                metric.highlight && 'font-medium'
              )}
            >
              <span className="text-muted-foreground">{metric.label}</span>
              <span className={metric.highlight ? styles.icon : ''}>{metric.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
