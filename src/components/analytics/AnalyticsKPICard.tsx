import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface AnalyticsKPICardProps {
  title: string;
  value: number | string;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon: React.ElementType;
  loading?: boolean;
  format?: 'number' | 'percentage' | 'duration' | 'currency';
}

export const AnalyticsKPICard = ({ 
  title, 
  value, 
  change, 
  trend, 
  icon: Icon, 
  loading = false,
  format = 'number'
}: AnalyticsKPICardProps) => {
  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    
    switch (format) {
      case 'percentage':
        return `${val.toFixed(1)}%`;
      case 'duration':
        return `${val.toFixed(0)}min`;
      case 'currency':
        return `$${val.toLocaleString()}`;
      default:
        return val.toLocaleString();
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-secondary" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-destructive" />;
      default:
        return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-secondary';
      case 'down':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card className="bg-gradient-card border-border shadow-soft">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">
          {loading ? (
            <div className="animate-pulse bg-muted rounded h-6 w-16"></div>
          ) : (
            formatValue(value)
          )}
        </div>
        {change !== undefined && !loading && (
          <div className={`flex items-center text-xs mt-1 ${getTrendColor()}`}>
            {getTrendIcon()}
            <span className="ml-1">
              {change > 0 ? '+' : ''}{change.toFixed(1)}% from last period
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
};