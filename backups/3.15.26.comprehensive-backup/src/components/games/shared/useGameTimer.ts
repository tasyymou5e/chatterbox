/**
 * useGameTimer - Hook for tracking game time
 */

import { useState, useRef, useCallback, useEffect } from 'react';

interface UseGameTimerReturn {
  elapsedSeconds: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  formatTime: () => string;
}

export function useGameTimer(): UseGameTimerReturn {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearIntervalRef = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    setElapsedSeconds(0);
    setIsRunning(true);
    clearIntervalRef();
    intervalRef.current = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
  }, [clearIntervalRef]);

  const pause = useCallback(() => {
    setIsRunning(false);
    clearIntervalRef();
  }, [clearIntervalRef]);

  const resume = useCallback(() => {
    if (!isRunning) {
      setIsRunning(true);
      intervalRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
  }, [isRunning]);

  const reset = useCallback(() => {
    setElapsedSeconds(0);
    setIsRunning(false);
    clearIntervalRef();
  }, [clearIntervalRef]);

  const formatTime = useCallback(() => {
    const mins = Math.floor(elapsedSeconds / 60);
    const secs = elapsedSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, [elapsedSeconds]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearIntervalRef();
  }, [clearIntervalRef]);

  return {
    elapsedSeconds,
    isRunning,
    start,
    pause,
    resume,
    reset,
    formatTime,
  };
}

export default useGameTimer;
