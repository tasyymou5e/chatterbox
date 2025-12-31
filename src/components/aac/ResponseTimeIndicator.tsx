import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface ResponseTimeIndicatorProps {
  isLoading: boolean;
  estimatedSeconds?: number;
  className?: string;
}

export function ResponseTimeIndicator({ 
  isLoading, 
  estimatedSeconds = 8,
  className 
}: ResponseTimeIndicatorProps) {
  const [elapsed, setElapsed] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      setStartTime(Date.now());
      setElapsed(0);
    } else {
      setStartTime(null);
      setElapsed(0);
    }
  }, [isLoading]);

  useEffect(() => {
    if (!isLoading || !startTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedSec = (now - startTime) / 1000;
      setElapsed(elapsedSec);
    }, 100);

    return () => clearInterval(interval);
  }, [isLoading, startTime]);

  if (!isLoading) return null;

  const progress = Math.min((elapsed / estimatedSeconds) * 100, 95);
  const displayTime = Math.ceil(Math.max(0, estimatedSeconds - elapsed));

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span className="animate-pulse">Generating voice...</span>
        <span>~{displayTime}s</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}
