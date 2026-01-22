/**
 * Performance monitoring utility for tracking Web Vitals
 * Tracks Core Web Vitals metrics and reports them for optimization
 */

import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';
import { secureLog } from '@/utils/secureLogging';

export interface PerformanceMetrics {
  cls: number; // Cumulative Layout Shift
  fid: number; // First Input Delay  
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  ttfb: number; // Time to First Byte
}

interface MetricEntry extends PerformanceMetrics {
  timestamp: number;
  userAgent: string;
  url: string;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Partial<PerformanceMetrics> = {};
  private reportingThreshold = 5000; // 5 seconds

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start monitoring Core Web Vitals
   */
  startMonitoring(): void {
    if (typeof window === 'undefined') return;

    // Cumulative Layout Shift
    getCLS((metric) => {
      this.metrics.cls = metric.value;
      this.evaluateThreshold('CLS', metric.value, 0.1);
      this.logMetric('CLS', metric);
    });

    // First Input Delay
    getFID((metric) => {
      this.metrics.fid = metric.value;
      this.evaluateThreshold('FID', metric.value, 100);
      this.logMetric('FID', metric);
    });

    // First Contentful Paint
    getFCP((metric) => {
      this.metrics.fcp = metric.value;
      this.evaluateThreshold('FCP', metric.value, 1800);
      this.logMetric('FCP', metric);
    });

    // Largest Contentful Paint
    getLCP((metric) => {
      this.metrics.lcp = metric.value;
      this.evaluateThreshold('LCP', metric.value, 2500);
      this.logMetric('LCP', metric);
    });

    // Time to First Byte
    getTTFB((metric) => {
      this.metrics.ttfb = metric.value;
      this.evaluateThreshold('TTFB', metric.value, 800);
      this.logMetric('TTFB', metric);
    });
  }

  /**
   * Evaluate metric against recommended thresholds
   */
  private evaluateThreshold(name: string, value: number, threshold: number): void {
    const ratio = value / threshold;
    
    if (ratio > 2) {
      secureLog.performance(`${name}_POOR`, value, `${name} exceeds 2x threshold (${threshold})`);
    } else if (ratio > 1.5) {
      secureLog.performance(`${name}_NEEDS_IMPROVEMENT`, value, `${name} exceeds 1.5x threshold (${threshold})`);
    } else if (ratio > 1) {
      secureLog.performance(`${name}_MODERATE`, value, `${name} slightly exceeds threshold (${threshold})`);
    }
  }

  /**
   * Log metric to console and potentially to analytics
   */
  private logMetric(name: string, metric: any): void {
    const logEntry = {
      name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      navigationType: metric.navigationType,
      timestamp: Date.now(),
      url: window.location.href,
    };

    // Log to console in development
    if (import.meta.env.DEV) {
      console.log(`[Web Vitals] ${name}:`, logEntry);
    }

    // Send to analytics for production
    this.reportToAnalytics(logEntry);
  }

  /**
   * Report metrics to analytics service
   */
  private reportToAnalytics(entry: Record<string, any>): void {
    try {
      // This could be sent to your analytics service
      // For now, just log securely
      secureLog.performance('web_vital', entry);
    } catch (error) {
      secureLog.error('Failed to report metrics to analytics', error, 'PerformanceMonitor');
    }
  }

  /**
   * Get current metrics snapshot
   */
  getCurrentMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  /**
   * Generate performance report
   */
  generateReport(): {
    timestamp: number;
    metrics: Partial<PerformanceMetrics>;
    score: 'good' | 'moderate' | 'poor';
    recommendations: string[];
  } {
    const metrics = this.getCurrentMetrics();
    
    // Calculate overall score based on thresholds
    const score = this.calculateOverallScore(metrics);
    const recommendations = this.generateRecommendations(metrics);

    return {
      timestamp: Date.now(),
      metrics,
      score,
      recommendations
    };
  }

  /**
   * Calculate overall performance score
   */
  private calculateOverallScore(metrics: Partial<PerformanceMetrics>): 'good' | 'moderate' | 'poor' {
    const scores = [];
    
    if (metrics.cls !== undefined) scores.push(metrics.cls <= 0.1 ? 1 : 0);
    if (metrics.fid !== undefined) scores.push(metrics.fid <= 100 ? 1 : 0);
    if (metrics.fcp !== undefined) scores.push(metrics.fcp <= 1800 ? 1 : 0);
    if (metrics.lcp !== undefined) scores.push(metrics.lcp <= 2500 ? 1 : 0);
    if (metrics.ttfb !== undefined) scores.push(metrics.ttfb <= 800 ? 1 : 0);

    const score = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    
    if (score >= 0.8) return 'good';
    if (score >= 0.5) return 'moderate';
    return 'poor';
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: Partial<PerformanceMetrics>): string[] {
    const recommendations: string[] = [];

    if (metrics.cls !== undefined && metrics.cls > 0.1) {
      recommendations.push('Optimize layout stability by reserving space for images and dynamic content');
    }

    if (metrics.fid !== undefined && metrics.fid > 100) {
      recommendations.push('Reduce JavaScript execution time and break up long tasks');
    }

    if (metrics.fcp !== undefined && metrics.fcp > 1800) {
      recommendations.push('Optimize server response time and reduce render-blocking resources');
    }

    if (metrics.lcp !== undefined && metrics.lcp > 2500) {
      recommendations.push('Optimize image loading and reduce server response time');
    }

    if (metrics.ttfb !== undefined && metrics.ttfb > 800) {
      recommendations.push('Optimize server response time and use CDN for static assets');
    }

    return recommendations;
  }

  /**
   * Monitor component render performance
   */
  measureComponentRender(componentName: string, renderFn: () => void): void {
    if (import.meta.env.DEV) {
      const start = performance.now();
      renderFn();
      const end = performance.now();
      
      secureLog.performance(`component_render_${componentName}`, end - start, `Component: ${componentName}`);
    }
  }

  /**
   * Measure async operation performance
   */
  async measureAsyncOperation<T>(
    operationName: string, 
    operation: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    try {
      const result = await operation();
      const end = performance.now();
      secureLog.performance(`async_operation_${operationName}`, end - start, `Operation: ${operationName}`);
      return result;
    } catch (error) {
      const end = performance.now();
      secureLog.performance(`async_operation_${operationName}_failed`, end - start, `Failed operation: ${operationName}`);
      throw error;
    }
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Initialize monitoring when module is loaded
if (typeof window !== 'undefined') {
  performanceMonitor.startMonitoring();
}

export default performanceMonitor;