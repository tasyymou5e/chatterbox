import { useCallback, useRef } from 'react';

interface PerformanceMetric {
  metricType: string;
  value: number;
  thresholdExceeded?: boolean;
  componentName?: string;
  metadata?: Record<string, any>;
}

// Cache-safe performance monitoring wrapper with feature flags
export const usePerformanceMonitoringWrapper = (enabled: boolean = false) => {
  const performanceTimers = useRef<Map<string, number>>(new Map());

  const logPerformanceMetric = useCallback(async (metric: PerformanceMetric) => {
    if (!enabled) return;
    
    try {
      // Safe console logging only - no external dependencies
      console.log('Performance Metric:', metric);
    } catch (err) {
      // Silently fail - don't break the app
    }
  }, [enabled]);

  const startTimer = useCallback((timerName: string) => {
    if (!enabled) return;
    try {
      performanceTimers.current.set(timerName, performance.now());
    } catch (err) {
      // Silently fail
    }
  }, [enabled]);

  const endTimer = useCallback((timerName: string, componentName?: string, threshold?: number) => {
    if (!enabled) return null;
    
    try {
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
    } catch (err) {
      // Silently fail
    }
    return null;
  }, [logPerformanceMetric, enabled]);

  const measurePageLoad = useCallback(() => {
    if (!enabled) return;
    
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
      // Silently fail - performance monitoring should never break the app
    }
  }, [logPerformanceMetric, enabled]);

  const measureApiResponse = useCallback((url: string, duration: number, status: number) => {
    if (!enabled) return;
    
    try {
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
    } catch (error) {
      // Silently fail
    }
  }, [logPerformanceMetric, enabled]);

  const measureMemoryUsage = useCallback(() => {
    if (!enabled) return;
    
    try {
      if (typeof window !== 'undefined' && 'memory' in performance) {
        const memory = (performance as any).memory;
        if (memory) {
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
      }
    } catch (error) {
      // Silently fail
    }
  }, [logPerformanceMetric, enabled]);

  return {
    startTimer,
    endTimer,
    measurePageLoad,
    measureApiResponse,
    measureMemoryUsage,
    logPerformanceMetric,
    enabled
  };
};