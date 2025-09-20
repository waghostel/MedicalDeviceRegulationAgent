/**
 * Frontend Performance Optimization Utilities
 *
 * This module provides utilities for optimizing frontend performance
 * including lazy loading, code splitting, and performance monitoring.
 */

import { useEffect, useState, useCallback, useMemo } from 'react';

// Native debounce implementation
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Native throttle implementation
function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), wait);
    }
  };
}

// Performance monitoring
interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

class FrontendPerformanceMonitor {
  private metrics: PerformanceMetric[] = [];

  private observers: PerformanceObserver[] = [];

  constructor() {
    this.initializeObservers();
  }

  private initializeObservers() {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return;
    }

    // Navigation timing observer
    if ('PerformanceObserver' in window) {
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.recordMetric(
              'page_load_time',
              navEntry.loadEventEnd - navEntry.navigationStart
            );
            this.recordMetric(
              'dom_content_loaded',
              navEntry.domContentLoadedEventEnd - navEntry.navigationStart
            );
            this.recordMetric(
              'first_paint',
              navEntry.responseStart - navEntry.navigationStart
            );
          }
        }
      });

      try {
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
      } catch (e) {
        console.warn('Navigation timing observer not supported');
      }

      // Resource timing observer
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceEntry = entry as PerformanceResourceTiming;
            this.recordMetric(
              'resource_load_time',
              resourceEntry.responseEnd - resourceEntry.startTime,
              {
                resource_type: resourceEntry.initiatorType,
                resource_name: resourceEntry.name,
              }
            );
          }
        }
      });

      try {
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.push(resourceObserver);
      } catch (e) {
        console.warn('Resource timing observer not supported');
      }

      // Largest Contentful Paint observer
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric('largest_contentful_paint', entry.startTime);
        }
      });

      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.push(lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // First Input Delay observer
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this.recordMetric(
            'first_input_delay',
            (entry as any).processingStart - entry.startTime
          );
        }
      });

      try {
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.push(fidObserver);
      } catch (e) {
        console.warn('FID observer not supported');
      }
    }
  }

  recordMetric(name: string, value: number, tags?: Record<string, string>) {
    // Skip recording metrics during SSR
    if (typeof window === 'undefined') {
      return;
    }

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags,
    };

    this.metrics.push(metric);

    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Log slow operations
    if (this.isSlowOperation(name, value)) {
      console.warn(`Slow operation detected: ${name} took ${value}ms`, tags);
    }
  }

  private isSlowOperation(name: string, value: number): boolean {
    const thresholds: Record<string, number> = {
      page_load_time: 3000,
      dom_content_loaded: 2000,
      largest_contentful_paint: 2500,
      first_input_delay: 100,
      api_request: 2000,
      component_render: 16, // 60fps = 16ms per frame
      resource_load_time: 1000,
    };

    return value > (thresholds[name] || 1000);
  }

  getMetrics(timeRangeMs: number = 60000): PerformanceMetric[] {
    const cutoff = Date.now() - timeRangeMs;
    return this.metrics.filter((m) => m.timestamp >= cutoff);
  }

  getAverageMetric(name: string, timeRangeMs: number = 60000): number {
    const metrics = this.getMetrics(timeRangeMs).filter((m) => m.name === name);
    if (metrics.length === 0) return 0;

    return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
  }

  getPerformanceReport(): Record<string, any> {
    const report: Record<string, any> = {};
    const recentMetrics = this.getMetrics();

    // Group metrics by name
    const groupedMetrics = recentMetrics.reduce(
      (acc, metric) => {
        if (!acc[metric.name]) acc[metric.name] = [];
        acc[metric.name].push(metric.value);
        return acc;
      },
      {} as Record<string, number[]>
    );

    // Calculate statistics for each metric
    for (const [name, values] of Object.entries(groupedMetrics)) {
      if (values.length > 0) {
        const sorted = values.sort((a, b) => a - b);
        report[name] = {
          count: values.length,
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          p50: sorted[Math.floor(sorted.length * 0.5)],
          p95: sorted[Math.floor(sorted.length * 0.95)],
          p99: sorted[Math.floor(sorted.length * 0.99)],
        };
      }
    }

    return report;
  }

  cleanup() {
    this.observers.forEach((observer) => observer.disconnect());
    this.observers = [];
    this.metrics = [];
  }
}

// Global performance monitor instance - only initialize in browser
export const performanceMonitor =
  typeof window !== 'undefined' ? new FrontendPerformanceMonitor() : null;

// React hooks for performance optimization
export function usePerformanceMonitor() {
  const [metrics, setMetrics] = useState<Record<string, any>>({});

  useEffect(() => {
    const updateMetrics = () => {
      if (performanceMonitor) {
        setMetrics(performanceMonitor.getPerformanceReport());
      }
    };

    // Update metrics every 30 seconds
    const interval = setInterval(updateMetrics, 30000);
    updateMetrics(); // Initial update

    return () => clearInterval(interval);
  }, []);

  const recordMetric = useCallback(
    (name: string, value: number, tags?: Record<string, string>) => {
      performanceMonitor?.recordMetric(name, value, tags);
    },
    []
  );

  return { metrics, recordMetric };
}

// API request performance monitoring
export function useApiPerformance() {
  const recordApiRequest = useCallback(
    async <T>(
      requestFn: () => Promise<T>,
      endpoint: string,
      method: string = 'GET'
    ): Promise<T> => {
      // Skip performance monitoring during SSR
      if (typeof window === 'undefined' || typeof performance === 'undefined') {
        return await requestFn();
      }

      const startTime = performance.now();

      try {
        const result = await requestFn();
        const duration = performance.now() - startTime;

        performanceMonitor?.recordMetric('api_request', duration, {
          endpoint,
          method,
          status: 'success',
        });

        return result;
      } catch (error) {
        if (typeof performance !== 'undefined') {
          const duration = performance.now() - startTime;

          performanceMonitor?.recordMetric('api_request', duration, {
            endpoint,
            method,
            status: 'error',
          });
        }

        throw error;
      }
    },
    []
  );

  return { recordApiRequest };
}

// Component render performance monitoring
export function useRenderPerformance(componentName: string) {
  useEffect(() => {
    // Skip performance monitoring during SSR
    if (typeof window === 'undefined' || typeof performance === 'undefined') {
      return;
    }

    const startTime = performance.now();

    return () => {
      const renderTime = performance.now() - startTime;
      performanceMonitor?.recordMetric('component_render', renderTime, {
        component: componentName,
      });
    };
  });
}

// Debounced and throttled hooks
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  return useMemo(() => debounce(callback, delay), [callback, delay]);
}

export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  return useMemo(() => throttle(callback, delay), [callback, delay]);
}

// Intersection Observer for lazy loading
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    // Skip intersection observer during SSR
    if (
      typeof window === 'undefined' ||
      typeof IntersectionObserver === 'undefined'
    ) {
      return;
    }

    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [elementRef, hasIntersected, options]);

  return { isIntersecting, hasIntersected };
}

// Virtual scrolling hook for large lists
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length, start + visibleCount + overscan * 2);

    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => items
      .slice(visibleRange.start, visibleRange.end)
      .map((item, index) => ({
        item,
        index: visibleRange.start + index,
      })), [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
  };
}

// Memory usage monitoring
export function useMemoryMonitoring() {
  const [memoryInfo, setMemoryInfo] = useState<any>(null);

  useEffect(() => {
    // Skip memory monitoring during SSR
    if (typeof window === 'undefined' || typeof performance === 'undefined') {
      return;
    }

    const updateMemoryInfo = () => {
      if ('memory' in performance) {
        const {memory} = (performance as any);
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          usagePercentage:
            (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
        });

        // Record memory usage metric
        performanceMonitor?.recordMetric(
          'memory_usage',
          memory.usedJSHeapSize / 1024 / 1024,
          {
            unit: 'MB',
          }
        );
      }
    };

    updateMemoryInfo();
    const interval = setInterval(updateMemoryInfo, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return memoryInfo;
}

// Bundle size analysis
export function analyzeBundleSize() {
  // Skip bundle analysis during SSR
  if (typeof window === 'undefined' || typeof performance === 'undefined') {
    return null;
  }

  if ('getEntriesByType' in performance) {
    const resources = performance.getEntriesByType(
      'resource'
    ) as PerformanceResourceTiming[];

    const jsResources = resources.filter(
      (r) => r.name.includes('.js') && !r.name.includes('node_modules')
    );

    const cssResources = resources.filter((r) => r.name.includes('.css'));

    const totalJSSize = jsResources.reduce((total, resource) => total + (resource.transferSize || 0), 0);

    const totalCSSSize = cssResources.reduce((total, resource) => total + (resource.transferSize || 0), 0);

    return {
      totalJSSize: totalJSSize / 1024, // KB
      totalCSSSize: totalCSSSize / 1024, // KB
      jsResourceCount: jsResources.length,
      cssResourceCount: cssResources.length,
      resources: {
        js: jsResources.map((r) => ({
          name: r.name,
          size: (r.transferSize || 0) / 1024,
          loadTime: r.responseEnd - r.startTime,
        })),
        css: cssResources.map((r) => ({
          name: r.name,
          size: (r.transferSize || 0) / 1024,
          loadTime: r.responseEnd - r.startTime,
        })),
      },
    };
  }

  return null;
}

// Performance optimization recommendations
export function getPerformanceRecommendations(): string[] {
  const recommendations: string[] = [];

  // Return empty recommendations during SSR
  if (!performanceMonitor) {
    return recommendations;
  }

  const report = performanceMonitor.getPerformanceReport();

  // Check page load time
  if (report.page_load_time?.avg > 3000) {
    recommendations.push(
      'Page load time is slow. Consider code splitting and lazy loading.'
    );
  }

  // Check LCP
  if (report.largest_contentful_paint?.avg > 2500) {
    recommendations.push(
      'Largest Contentful Paint is slow. Optimize images and critical resources.'
    );
  }

  // Check FID
  if (report.first_input_delay?.avg > 100) {
    recommendations.push(
      'First Input Delay is high. Reduce JavaScript execution time.'
    );
  }

  // Check API response times
  if (report.api_request?.avg > 2000) {
    recommendations.push(
      'API requests are slow. Consider caching and request optimization.'
    );
  }

  // Check component render times
  if (report.component_render?.avg > 16) {
    recommendations.push(
      'Component renders are slow. Consider React.memo and useMemo optimization.'
    );
  }

  // Check bundle size
  const bundleAnalysis = analyzeBundleSize();
  if (bundleAnalysis && bundleAnalysis.totalJSSize > 1000) {
    // 1MB
    recommendations.push(
      'JavaScript bundle is large. Consider code splitting and tree shaking.'
    );
  }

  return recommendations;
}

// Export performance data for backend reporting
export function exportPerformanceData() {
  // Return minimal data during SSR
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      timestamp: Date.now(),
      metrics: {},
      bundleAnalysis: null,
      recommendations: [],
      userAgent: 'SSR',
      connection: null,
    };
  }

  const report = performanceMonitor?.getPerformanceReport() || {};
  const bundleAnalysis = analyzeBundleSize();
  const recommendations = getPerformanceRecommendations();

  return {
    timestamp: Date.now(),
    metrics: report,
    bundleAnalysis,
    recommendations,
    userAgent: navigator.userAgent,
    connection: (navigator as any).connection
      ? {
          effectiveType: (navigator as any).connection.effectiveType,
          downlink: (navigator as any).connection.downlink,
          rtt: (navigator as any).connection.rtt,
        }
      : null,
  };
}
