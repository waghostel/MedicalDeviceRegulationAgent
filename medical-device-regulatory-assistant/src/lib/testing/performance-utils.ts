import { render, RenderResult } from '@testing-library/react';
import { ReactElement } from 'react';
import { performance } from 'perf_hooks';

export interface PerformanceMetrics {
  renderTime: number;
  reRenderTime?: number;
  memoryUsage?: number;
  componentCount: number;
}

export interface PerformanceBenchmark {
  componentName: string;
  metrics: PerformanceMetrics;
  threshold: PerformanceThreshold;
  passed: boolean;
}

export interface PerformanceThreshold {
  maxRenderTime: number; // milliseconds
  maxReRenderTime?: number; // milliseconds
  maxMemoryUsage?: number; // MB
  maxComponentCount?: number;
}

/**
 * Measure component render performance
 */
export function measureRenderPerformance(
  component: ReactElement,
  componentName: string,
  threshold: PerformanceThreshold
): PerformanceBenchmark {
  const startTime = performance.now();
  const startMemory = process.memoryUsage().heapUsed;
  
  const result = render(component);
  
  const endTime = performance.now();
  const endMemory = process.memoryUsage().heapUsed;
  
  const renderTime = endTime - startTime;
  const memoryUsage = (endMemory - startMemory) / 1024 / 1024; // Convert to MB
  const componentCount = result.container.querySelectorAll('*').length;
  
  const metrics: PerformanceMetrics = {
    renderTime,
    memoryUsage,
    componentCount,
  };
  
  const passed = validatePerformanceThreshold(metrics, threshold);
  
  return {
    componentName,
    metrics,
    threshold,
    passed,
  };
}

/**
 * Measure component re-render performance
 */
export function measureReRenderPerformance(
  renderResult: RenderResult,
  reRenderComponent: ReactElement,
  threshold: PerformanceThreshold
): number {
  const startTime = performance.now();
  
  renderResult.rerender(reRenderComponent);
  
  const endTime = performance.now();
  return endTime - startTime;
}

/**
 * Validate performance metrics against thresholds
 */
export function validatePerformanceThreshold(
  metrics: PerformanceMetrics,
  threshold: PerformanceThreshold
): boolean {
  if (metrics.renderTime > threshold.maxRenderTime) {
    return false;
  }
  
  if (threshold.maxReRenderTime && metrics.reRenderTime && metrics.reRenderTime > threshold.maxReRenderTime) {
    return false;
  }
  
  if (threshold.maxMemoryUsage && metrics.memoryUsage && metrics.memoryUsage > threshold.maxMemoryUsage) {
    return false;
  }
  
  if (threshold.maxComponentCount && metrics.componentCount > threshold.maxComponentCount) {
    return false;
  }
  
  return true;
}

/**
 * Performance test wrapper for Jest
 */
export function performanceTest(
  componentName: string,
  component: ReactElement,
  threshold: PerformanceThreshold
) {
  return () => {
    const benchmark = measureRenderPerformance(component, componentName, threshold);
    
    expect(benchmark.passed).toBe(true);
    expect(benchmark.metrics.renderTime).toBeLessThanOrEqual(threshold.maxRenderTime);
    
    if (threshold.maxMemoryUsage) {
      expect(benchmark.metrics.memoryUsage).toBeLessThanOrEqual(threshold.maxMemoryUsage);
    }
    
    if (threshold.maxComponentCount) {
      expect(benchmark.metrics.componentCount).toBeLessThanOrEqual(threshold.maxComponentCount);
    }
    
    // Log performance metrics for monitoring
    console.log(`Performance Benchmark - ${componentName}:`, {
      renderTime: `${benchmark.metrics.renderTime.toFixed(2)}ms`,
      memoryUsage: `${benchmark.metrics.memoryUsage?.toFixed(2)}MB`,
      componentCount: benchmark.metrics.componentCount,
    });
    
    return benchmark;
  };
}

/**
 * Bundle size monitoring utility
 */
export interface BundleAnalysis {
  totalSize: number;
  gzippedSize: number;
  chunks: Array<{
    name: string;
    size: number;
    gzippedSize: number;
  }>;
}

/**
 * Web Vitals measurement utility for tests
 */
export function measureWebVitals(): Promise<{
  fcp: number;
  lcp: number;
  cls: number;
  fid: number;
  ttfb: number;
}> {
  return new Promise((resolve) => {
    // Mock Web Vitals for testing environment
    // In real browser environment, this would use the web-vitals library
    const mockMetrics = {
      fcp: Math.random() * 2000 + 500, // 500-2500ms
      lcp: Math.random() * 2000 + 1000, // 1000-3000ms
      cls: Math.random() * 0.1, // 0-0.1
      fid: Math.random() * 100 + 50, // 50-150ms
      ttfb: Math.random() * 500 + 100, // 100-600ms
    };
    
    setTimeout(() => resolve(mockMetrics), 100);
  });
}

/**
 * Performance regression detection
 */
export class PerformanceRegression {
  private baselines: Map<string, PerformanceMetrics> = new Map();
  
  setBaseline(componentName: string, metrics: PerformanceMetrics): void {
    this.baselines.set(componentName, metrics);
  }
  
  checkRegression(
    componentName: string,
    currentMetrics: PerformanceMetrics,
    regressionThreshold: number = 0.2 // 20% regression threshold
  ): {
    hasRegression: boolean;
    regressionPercentage: number;
    details: string;
  } {
    const baseline = this.baselines.get(componentName);
    
    if (!baseline) {
      return {
        hasRegression: false,
        regressionPercentage: 0,
        details: 'No baseline found for comparison',
      };
    }
    
    const renderTimeRegression = (currentMetrics.renderTime - baseline.renderTime) / baseline.renderTime;
    const hasRegression = renderTimeRegression > regressionThreshold;
    
    return {
      hasRegression,
      regressionPercentage: renderTimeRegression * 100,
      details: hasRegression 
        ? `Render time increased by ${(renderTimeRegression * 100).toFixed(2)}%`
        : 'Performance within acceptable range',
    };
  }
}

/**
 * Default performance thresholds for different component types
 */
export const PERFORMANCE_THRESHOLDS = {
  SIMPLE_COMPONENT: {
    maxRenderTime: 16, // 1 frame at 60fps
    maxReRenderTime: 8,
    maxMemoryUsage: 1, // 1MB
    maxComponentCount: 50,
  },
  COMPLEX_COMPONENT: {
    maxRenderTime: 50,
    maxReRenderTime: 25,
    maxMemoryUsage: 5, // 5MB
    maxComponentCount: 200,
  },
  DASHBOARD_WIDGET: {
    maxRenderTime: 100,
    maxReRenderTime: 50,
    maxMemoryUsage: 10, // 10MB
    maxComponentCount: 500,
  },
  FORM_COMPONENT: {
    maxRenderTime: 30,
    maxReRenderTime: 15,
    maxMemoryUsage: 3, // 3MB
    maxComponentCount: 100,
  },
} as const;