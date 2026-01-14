import { useCallback, useRef } from 'react';

interface PerformanceMetric {
  metricType: string;
  value: number;
  thresholdExceeded?: boolean;
  componentName?: string;
  metadata?: Record<string, any>;
}

// Throttle interval in milliseconds (5 seconds)
const METRIC_THROTTLE_MS = 5000;

// Safe version of performance monitoring hook with error handling and throttling
export const usePerformanceMonitoringSafe = () => {
  const performanceTimers = useRef<Map<string, number>>(new Map());
  const lastLogTime = useRef<Map<string, number>>(new Map());

  // Throttled metric logging to prevent performance overhead
  const logPerformanceMetric = useCallback(async (metric: PerformanceMetric) => {
    try {
      const now = Date.now();
      const metricKey = `${metric.metricType}_${metric.componentName || 'global'}`;
      const lastTime = lastLogTime.current.get(metricKey) || 0;
      
      // Only log if enough time has passed since last log for this metric type
      if (now - lastTime < METRIC_THROTTLE_MS) {
        return;
      }
      
      lastLogTime.current.set(metricKey, now);
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('Performance Metric:', metric);
      }
      
      // TODO: Re-enable Supabase integration once import issues are resolved
      // const { data: { user } } = await supabase.auth.getUser();
      // await supabase.from('performance_metrics').insert({...});
    } catch (err) {
      console.warn('Failed to log performance metric:', err);
    }
  }, []);

  const startTimer = useCallback((timerName: string) => {
    performanceTimers.current.set(timerName, performance.now());
  }, []);

  const endTimer = useCallback((timerName: string, componentName?: string, threshold?: number) => {
    const startTime = performanceTimers.current.get(timerName);
    if (startTime) {
      const duration = performance.now() - startTime;
      performanceTimers.current.delete(timerName);
      
      logPerformanceMetric({
        metricType: 'component_render_time',
        value: duration,
        thresholdExceeded: threshold ? duration > threshold : undefined,
        componentName,
        metadata: {
          timerName,
          threshold,
        }
      });
      
      return duration;
    }
    return null;
  }, [logPerformanceMetric]);

  const measurePageLoad = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && window.performance) {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        
        if (navigation) {
          const pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
          const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
          const firstContentfulPaint = performance.getEntriesByType('paint')
            .find(entry => entry.name === 'first-contentful-paint')?.startTime || 0;
          
          logPerformanceMetric({
            metricType: 'page_load_time',
            value: pageLoadTime,
            thresholdExceeded: pageLoadTime > 3000,
            metadata: {
              domContentLoaded,
              firstContentfulPaint,
              navigationStart: navigation.fetchStart,
              loadEventEnd: navigation.loadEventEnd,
            }
          });
        }
      }
    } catch (error) {
      console.warn('Failed to measure page load:', error);
    }
  }, [logPerformanceMetric]);

  const measureApiResponse = useCallback((url: string, duration: number, status: number) => {
    logPerformanceMetric({
      metricType: 'api_response_time',
      value: duration,
      thresholdExceeded: duration > 2000,
      metadata: {
        url,
        status,
        slow: duration > 1000,
      }
    });
  }, [logPerformanceMetric]);

  const measureMemoryUsage = useCallback(() => {
    try {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        logPerformanceMetric({
          metricType: 'memory_usage',
          value: memory.usedJSHeapSize,
          thresholdExceeded: memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.8,
          metadata: {
            totalJSHeapSize: memory.totalJSHeapSize,
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
            usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
          }
        });
      }
    } catch (error) {
      console.warn('Failed to measure memory usage:', error);
    }
  }, [logPerformanceMetric]);

  return {
    startTimer,
    endTimer,
    measurePageLoad,
    measureApiResponse,
    measureMemoryUsage,
    logPerformanceMetric,
  };
};