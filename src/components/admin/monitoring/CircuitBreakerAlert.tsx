/**
 * CircuitBreakerAlert Component
 * 
 * @description Displays an alert when the circuit breaker is open,
 * showing time until retry and providing a force reset option.
 */
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface CircuitBreakerAlertProps {
  nextRetryTime: number;
  onForceReset: () => void;
}

export const CircuitBreakerAlert = ({ nextRetryTime, onForceReset }: CircuitBreakerAlertProps) => {
  const secondsUntilRetry = Math.ceil((nextRetryTime - Date.now()) / 1000);

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription>
        <div className="space-y-2">
          <p>System monitoring temporarily disabled due to repeated failures.</p>
          <p className="text-xs text-muted-foreground">
            Monitoring will resume automatically in {secondsUntilRetry > 0 ? secondsUntilRetry : 0} seconds.
          </p>
          <Button onClick={onForceReset} size="sm" variant="outline">
            Force Reset
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
