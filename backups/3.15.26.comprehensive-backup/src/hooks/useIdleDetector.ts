/**
 * useIdleDetector - Detects 30 minutes of inactivity and triggers callback
 */
import { useEffect, useRef, useCallback, useState } from 'react';

const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
const EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

interface UseIdleDetectorOptions {
  timeoutMs?: number;
  onIdle?: () => void;
  onReturn?: () => void;
  enabled?: boolean;
}

export function useIdleDetector({
  timeoutMs = IDLE_TIMEOUT_MS,
  onIdle,
  onReturn,
  enabled = true,
}: UseIdleDetectorOptions = {}) {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIdleRef = useRef(false);

  const resetTimer = useCallback(() => {
    if (!enabled) return;

    if (isIdleRef.current) {
      isIdleRef.current = false;
      setIsIdle(false);
      onReturn?.();
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      isIdleRef.current = true;
      setIsIdle(true);
      onIdle?.();
    }, timeoutMs);
  }, [enabled, timeoutMs, onIdle, onReturn]);

  useEffect(() => {
    if (!enabled) return;

    // Start initial timer
    resetTimer();

    // Listen for activity
    EVENTS.forEach(event => document.addEventListener(event, resetTimer, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      EVENTS.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [enabled, resetTimer]);

  return { isIdle };
}
