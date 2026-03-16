import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/lib/utils';

/**
 * Offline Status Indicator Component
 * Shows a banner when offline with retry option
 * Shows a brief success message when connection is restored
 */
export const OfflineIndicator = () => {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Show reconnected message briefly when coming back online
  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => {
        setShowReconnected(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOnline, wasOffline]);

  const handleRetry = () => {
    setIsRetrying(true);
    // Small delay to show loading state
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  const handleDismissReconnected = () => {
    setShowReconnected(false);
  };

  // Offline banner
  if (!isOnline) {
    return (
      <div
        role="alert"
        aria-live="assertive"
        className={cn(
          "fixed top-0 inset-x-0 z-[100]",
          "bg-warning text-warning-foreground",
          "px-4 py-3",
          "shadow-lg",
          "animate-in slide-in-from-top duration-300"
        )}
      >
        <div className="container mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <WifiOff className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="font-medium">You're offline</p>
              <p className="text-sm opacity-90">
                Some features may be limited. Cached content is still available.
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex-shrink-0"
          >
            <RefreshCw 
              className={cn("h-4 w-4 mr-2", isRetrying && "animate-spin")} 
              aria-hidden="true" 
            />
            {isRetrying ? 'Retrying...' : 'Retry'}
          </Button>
        </div>
      </div>
    );
  }

  // Reconnected toast (auto-dismiss)
  if (showReconnected) {
    return (
      <div
        role="status"
        aria-live="polite"
        className={cn(
          "fixed top-0 inset-x-0 z-[100]",
          "bg-success text-success-foreground",
          "px-4 py-3",
          "shadow-lg",
          "animate-in slide-in-from-top duration-300"
        )}
      >
        <div className="container mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Wifi className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <p className="font-medium">Back online!</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismissReconnected}
            className="h-8 w-8 hover:bg-foreground/10"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default OfflineIndicator;
