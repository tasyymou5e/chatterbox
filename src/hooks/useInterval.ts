import { useEffect, useRef } from 'react';

/**
 * Safe interval hook that properly cleans up on unmount.
 * Prevents memory leaks from dangling intervals.
 * 
 * @param callback - Function to execute on each interval
 * @param delay - Interval delay in milliseconds, or null to pause
 * 
 * @example
 * // Run every second
 * useInterval(() => console.log('tick'), 1000);
 * 
 * // Pause interval
 * useInterval(() => console.log('tick'), isPaused ? null : 1000);
 */
export function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  
  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  
  // Set up the interval
  useEffect(() => {
    if (delay === null) return;
    
    const id = setInterval(() => savedCallback.current(), delay);
    return () => clearInterval(id);
  }, [delay]);
}
