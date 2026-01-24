import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, ArrowRight, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { HealthScoreGauge } from './HealthScoreGauge';
import { useDataHealthScore } from '@/hooks/useDataHealthScore';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface DataHealthScoreCardProps {
  className?: string;
}

export function DataHealthScoreCard({ className }: DataHealthScoreCardProps) {
  const {
    overallScore,
    integrityScore,
    repairScore,
    systemScore,
    grade,
    scoreHistory,
    loading,
    calculating,
    lastCalculated,
    recalculateScore
  } = useDataHealthScore();

  // Calculate trend from history
  const trend = (() => {
    if (scoreHistory.length < 2) return 'stable';
    const recent = scoreHistory[scoreHistory.length - 1]?.overall || 0;
    const previous = scoreHistory[scoreHistory.length - 2]?.overall || 0;
    if (recent > previous) return 'up';
    if (recent < previous) return 'down';
    return 'stable';
  })();

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground';
  const trendText = trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Stable';

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-8 rounded" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Data Health Score</CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={recalculateScore}
            disabled={calculating}
            title="Recalculate score"
          >
            <RefreshCw className={cn('h-4 w-4', calculating && 'animate-spin')} />
          </Button>
        </div>
        {lastCalculated && (
          <p className="text-xs text-muted-foreground">
            Last calculated {formatDistanceToNow(lastCalculated, { addSuffix: true })}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-6">
          {/* Gauge */}
          <HealthScoreGauge 
            score={overallScore} 
            grade={grade} 
            size="standard"
            showLabel={true}
          />
          
          {/* Subsystem scores */}
          <div className="flex-1 space-y-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Integrity</span>
                <span className="font-medium">{integrityScore}</span>
              </div>
              <Progress value={integrityScore} className="h-1.5" />
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Auto-Repair</span>
                <span className="font-medium">{repairScore}</span>
              </div>
              <Progress value={repairScore} className="h-1.5" />
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">System</span>
                <span className="font-medium">{systemScore}</span>
              </div>
              <Progress value={systemScore} className="h-1.5" />
            </div>
          </div>
        </div>

        {/* Trend indicator */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-sm">
            <TrendIcon className={cn('h-4 w-4', trendColor)} />
            <span className={trendColor}>{trendText}</span>
          </div>
          
          <Button variant="ghost" size="sm" asChild>
            <Link to="/admin/data-health" className="flex items-center gap-1">
              View Details
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
