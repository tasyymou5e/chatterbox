import { useState, useEffect, useCallback } from 'react';

interface OnlineStatus {
  isOnline: boolean;
  wasOffline: boolean;
  lastOnline: Date | null;
  lastOffline: Date | null;
}

interface UseOnlineStatusOptions {
  onOnline?: () => void;
  onOffline?: () => void;
}

/**
 * Hook to track online/offline status with event callbacks
 * @param options - Optional callbacks for online/offline events
 * @returns OnlineStatus object with current status and history
 */
export function useOnlineStatus(options?: UseOnlineStatusOptions): OnlineStatus {
  const [isOnline, setIsOnline] = useState(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [lastOnline, setLastOnline] = useState<Date | null>(null);
  const [lastOffline, setLastOffline] = useState<Date | null>(null);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setWasOffline(true);
    setLastOnline(new Date());
    options?.onOnline?.();
  }, [options]);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setLastOffline(new Date());
    options?.onOffline?.();
  }, [options]);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  // Reset wasOffline after a delay to prevent stale state
  useEffect(() => {
    if (wasOffline && isOnline) {
      const timer = setTimeout(() => {
        setWasOffline(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [wasOffline, isOnline]);

  return {
    isOnline,
    wasOffline,
    lastOnline,
    lastOffline,
  };
}

export default useOnlineStatus;
