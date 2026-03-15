import { useState, useEffect, useCallback, useRef } from 'react';

export interface CapturedError {
  id: string;
  type: 'runtime' | 'unhandled-rejection' | 'network';
  message: string;
  stack?: string;
  source?: string;
  lineno?: number;
  colno?: number;
  timestamp: string;
}

export const useErrorCapture = () => {
  const [errors, setErrors] = useState<CapturedError[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const listenersRef = useRef<{ cleanup: () => void } | null>(null);

  const startCapture = useCallback(() => {
    if (listenersRef.current) return;

    const handleError = (event: ErrorEvent) => {
      setErrors((prev) => [
        {
          id: crypto.randomUUID(),
          type: 'runtime',
          message: event.message,
          stack: event.error?.stack,
          source: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          timestamp: new Date().toISOString(),
        },
        ...prev.slice(0, 199), // cap at 200
      ]);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const err = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      setErrors((prev) => [
        {
          id: crypto.randomUUID(),
          type: 'unhandled-rejection',
          message: err.message,
          stack: err.stack,
          timestamp: new Date().toISOString(),
        },
        ...prev.slice(0, 199),
      ]);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    listenersRef.current = {
      cleanup: () => {
        window.removeEventListener('error', handleError);
        window.removeEventListener('unhandledrejection', handleRejection);
      },
    };
    setIsCapturing(true);
  }, []);

  const stopCapture = useCallback(() => {
    listenersRef.current?.cleanup();
    listenersRef.current = null;
    setIsCapturing(false);
  }, []);

  const clearErrors = useCallback(() => setErrors([]), []);

  useEffect(() => () => listenersRef.current?.cleanup(), []);

  return { errors, isCapturing, startCapture, stopCapture, clearErrors };
};
