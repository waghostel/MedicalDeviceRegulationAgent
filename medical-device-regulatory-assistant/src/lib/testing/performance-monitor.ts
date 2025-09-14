/**
 * Frontend Test Performance Monitor
 * 
 * Comprehensive performance monitoring for React component tests including
 * memory leak detection, render time tracking, and performance regression detection.
 */

import { performance } from 'perf_hooks';
import { RenderResult } from '@testing-library/react';

export interface TestPerformanceMetrics {
  testName: string;
  executionTime: number;
  renderTime: number;
  reRenderTime?: number;
  memoryUsage: number;
  peakMemoryUsage: number;
  componentCount: number;
  rerenderCount: number;
  domUpdates: number;
  startTime: number;
  endTime: number;
  warnings: string[];
  context: Record<string, any>;
}

export interface PerformanceThresholds {
  maxExecutionTime: number; // milliseconds
  maxRenderTime: number; // milliseconds
  maxReRenderTime: number; // milliseconds
  maxMemoryUsage: number; // MB
  maxComponentCount: number;
  maxRerenderCount: number;
  memoryLeakThreshold: number; // MB
}

export interface MemorySnapshot {
  heapUsed: number;
  heapTotal: number;
  external: number;
  timestamp: number;
}

export class FrontendTestPerformanceMonitor {
  private activeMonitors: Map<string, {
    testName: string;
    startTime: number;
    startMemory: MemorySnapshot;
    peakMemory: MemorySnapshot;
    renderStartTime?: number;
    rerenderCount: number;
    domUpdates: number;
    warnings: string[];
    renderResult?: RenderResult;
  }> = new Map();

  private performanceHistory: TestPerformanceMetrics[] = [];
  private memorySnapshots: MemorySnapshot[] = [];
  private thresholds: PerformanceThresholds;
  private mutationObserver?: MutationObserver;

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = {
      maxExecutionTime: 1000, // 1 second
      maxRenderTime: 50, // 50ms
      maxReRenderTime: 25, // 25ms
      maxMemoryUsage: 10, // 10MB
      maxComponentCount: 500,
      maxRerenderCount: 5,
      memoryLeakThreshold: 5, // 5MB
      ...thresholds
    };
  }

  /**
   * Start monitoring a test
   */
  startMonitoring(testName: string): string {
    const monitorId = `${testName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startMemory = this.getMemorySnapshot();
    
    this.activeMonitors.set(monitorId, {
      testName,
      startTime: performance.now(),
      startMemory,
      peakMemory: startMemory,
      rerenderCount: 0,
      domUpdates: 0,
      warnings: []
    });

    // Start memory monitoring
    this.startMemoryMonitoring(monitorId);

    return monitorId;
  }

  /**
   * Stop monitoring and return metrics
   */
  stopMonitoring(monitorId: string): TestPerformanceMetrics {
    const monitor = this.activeMonitors.get(monitorId);
    if (!monitor) {
      throw new Error(`Monitor ${monitorId} not found`);
    }

    const endTime = performance.now();
    const endMemory = this.getMemorySnapshot();
    const executionTime = endTime - monitor.startTime;
    const memoryUsage = (endMemory.heapUsed - monitor.startMemory.heapUsed) / 1024 / 1024;
    const peakMemoryUsage = (monitor.peakMemory.heapUsed - monitor.startMemory.heapUsed) / 1024 / 1024;

    // Stop DOM mutation monitoring
    this.stopDOMMonitoring();

    const metrics: TestPerformanceMetrics = {
      testName: monitor.testName,
      executionTime,
      renderTime: 0, // Will be set if render monitoring was used
      memoryUsage,
      peakMemoryUsage,
      componentCount: 0, // Will be set if render result is available
      rerenderCount: monitor.rerenderCount,
      domUpdates: monitor.domUpdates,
      startTime: monitor.startTime,
      endTime,
      warnings: [...monitor.warnings],
      context: {}
    };

    // Calculate component count if render result is available
    if (monitor.renderResult) {
      metrics.componentCount = monitor.renderResult.container.querySelectorAll('*').length;
    }

    // Check thresholds and add warnings
    this.checkThresholds(metrics);

    // Store in history
    this.performanceHistory.push(metrics);

    // Clean up
    this.activeMonitors.delete(monitorId);

    return metrics;
  }

  /**
   * Start render monitoring for a component
   */
  startRenderMonitoring(monitorId: string): void {
    const monitor = this.activeMonitors.get(monitorId);
    if (monitor) {
      monitor.renderStartTime = performance.now();
    }
  }

  /**
   * Stop render monitoring and record render time
   */
  stopRenderMonitoring(monitorId: string, renderResult: RenderResult): void {
    const monitor = this.activeMonitors.get(monitorId);
    if (monitor && monitor.renderStartTime) {
      const renderTime = performance.now() - monitor.renderStartTime;
      monitor.renderResult = renderResult;
      
      // Start DOM mutation monitoring
      this.startDOMMonitoring(monitorId, renderResult.container);
      
      // Update peak memory
      const currentMemory = this.getMemorySnapshot();
      if (currentMemory.heapUsed > monitor.peakMemory.heapUsed) {
        monitor.peakMemory = currentMemory;
      }
    }
  }

  /**
   * Record a re-render event
   */
  recordRerender(monitorId: string): void {
    const monitor = this.activeMonitors.get(monitorId);
    if (monitor) {
      monitor.rerenderCount++;
      
      // Update peak memory
      const currentMemory = this.getMemorySnapshot();
      if (currentMemory.heapUsed > monitor.peakMemory.heapUsed) {
        monitor.peakMemory = currentMemory;
      }
    }
  }

  /**
   * Context manager for monitoring test performance
   */
  async monitorTest<T>(testName: string, testFn: (monitorId: string) => Promise<T>): Promise<T> {
    const monitorId = this.startMonitoring(testName);
    try {
      const result = await testFn(monitorId);
      return result;
    } finally {
      const metrics = this.stopMonitoring(monitorId);
      this.logPerformanceSummary(metrics);
    }
  }

  /**
   * Monitor component render performance
   */
  async monitorComponentRender<T>(
    monitorId: string,
    renderFn: () => T
  ): Promise<{ result: T; renderTime: number }> {
    this.startRenderMonitoring(monitorId);
    const startTime = performance.now();
    
    const result = renderFn();
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    if (result && typeof result === 'object' && 'container' in result) {
      this.stopRenderMonitoring(monitorId, result as RenderResult);
    }
    
    return { result, renderTime };
  }

  /**
   * Detect memory leaks by comparing memory usage before and after test
   */
  detectMemoryLeaks(testName: string): {
    hasLeak: boolean;
    leakSize: number;
    details: string;
  } {
    const testMetrics = this.performanceHistory.filter(m => m.testName === testName);
    
    if (testMetrics.length < 2) {
      return {
        hasLeak: false,
        leakSize: 0,
        details: 'Insufficient data for leak detection'
      };
    }

    // Compare memory usage trend
    const recent = testMetrics.slice(-5); // Last 5 runs
    const memoryTrend = recent.map(m => m.memoryUsage);
    const averageIncrease = memoryTrend.reduce((sum, usage, index) => {
      if (index === 0) return 0;
      return sum + (usage - memoryTrend[index - 1]);
    }, 0) / (memoryTrend.length - 1);

    const hasLeak = averageIncrease > this.thresholds.memoryLeakThreshold;

    return {
      hasLeak,
      leakSize: averageIncrease,
      details: hasLeak 
        ? `Memory usage increasing by ${averageIncrease.toFixed(2)}MB per test run`
        : 'No significant memory leak detected'
    };
  }

  /**
   * Check for performance regressions
   */
  checkPerformanceRegression(testName: string, baselineWindow: number = 10): {
    hasRegression: boolean;
    regressionPercentage: number;
    details: string;
  } {
    const testMetrics = this.performanceHistory.filter(m => m.testName === testName);
    
    if (testMetrics.length < baselineWindow + 5) {
      return {
        hasRegression: false,
        regressionPercentage: 0,
        details: 'Insufficient data for regression analysis'
      };
    }

    // Compare recent performance with baseline
    const baseline = testMetrics.slice(0, baselineWindow);
    const recent = testMetrics.slice(-5);

    const baselineAvg = baseline.reduce((sum, m) => sum + m.executionTime, 0) / baseline.length;
    const recentAvg = recent.reduce((sum, m) => sum + m.executionTime, 0) / recent.length;

    const regressionPercentage = ((recentAvg - baselineAvg) / baselineAvg) * 100;
    const hasRegression = regressionPercentage > 20; // 20% regression threshold

    return {
      hasRegression,
      regressionPercentage,
      details: hasRegression
        ? `Performance degraded by ${regressionPercentage.toFixed(2)}%`
        : 'Performance within acceptable range'
    };
  }

  /**
   * Get performance summary for all tests
   */
  getPerformanceSummary(): {
    totalTests: number;
    averageExecutionTime: number;
    averageRenderTime: number;
    averageMemoryUsage: number;
    slowTests: Array<{ name: string; time: number }>;
    memoryIntensiveTests: Array<{ name: string; memory: number }>;
    testsWithWarnings: Array<{ name: string; warnings: string[] }>;
    memoryLeaks: Array<{ name: string; leakSize: number }>;
  } {
    if (this.performanceHistory.length === 0) {
      return {
        totalTests: 0,
        averageExecutionTime: 0,
        averageRenderTime: 0,
        averageMemoryUsage: 0,
        slowTests: [],
        memoryIntensiveTests: [],
        testsWithWarnings: [],
        memoryLeaks: []
      };
    }

    const totalTests = this.performanceHistory.length;
    const averageExecutionTime = this.performanceHistory.reduce((sum, m) => sum + m.executionTime, 0) / totalTests;
    const averageRenderTime = this.performanceHistory.reduce((sum, m) => sum + m.renderTime, 0) / totalTests;
    const averageMemoryUsage = this.performanceHistory.reduce((sum, m) => sum + m.memoryUsage, 0) / totalTests;

    const slowTests = this.performanceHistory
      .filter(m => m.executionTime > this.thresholds.maxExecutionTime)
      .map(m => ({ name: m.testName, time: m.executionTime }))
      .sort((a, b) => b.time - a.time);

    const memoryIntensiveTests = this.performanceHistory
      .filter(m => m.memoryUsage > this.thresholds.maxMemoryUsage)
      .map(m => ({ name: m.testName, memory: m.memoryUsage }))
      .sort((a, b) => b.memory - a.memory);

    const testsWithWarnings = this.performanceHistory
      .filter(m => m.warnings.length > 0)
      .map(m => ({ name: m.testName, warnings: m.warnings }));

    // Check for memory leaks in unique test names
    const uniqueTestNames = [...new Set(this.performanceHistory.map(m => m.testName))];
    const memoryLeaks = uniqueTestNames
      .map(testName => {
        const leakInfo = this.detectMemoryLeaks(testName);
        return leakInfo.hasLeak ? { name: testName, leakSize: leakInfo.leakSize } : null;
      })
      .filter(Boolean) as Array<{ name: string; leakSize: number }>;

    return {
      totalTests,
      averageExecutionTime,
      averageRenderTime,
      averageMemoryUsage,
      slowTests,
      memoryIntensiveTests,
      testsWithWarnings,
      memoryLeaks
    };
  }

  /**
   * Export performance metrics to JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      thresholds: this.thresholds,
      summary: this.getPerformanceSummary(),
      detailedMetrics: this.performanceHistory
    }, null, 2);
  }

  /**
   * Clear performance history
   */
  clearHistory(): void {
    this.performanceHistory = [];
    this.memorySnapshots = [];
  }

  private getMemorySnapshot(): MemorySnapshot {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      timestamp: Date.now()
    };
  }

  private startMemoryMonitoring(monitorId: string): void {
    // Take periodic memory snapshots
    const interval = setInterval(() => {
      const monitor = this.activeMonitors.get(monitorId);
      if (!monitor) {
        clearInterval(interval);
        return;
      }

      const currentMemory = this.getMemorySnapshot();
      this.memorySnapshots.push(currentMemory);

      if (currentMemory.heapUsed > monitor.peakMemory.heapUsed) {
        monitor.peakMemory = currentMemory;
      }
    }, 100); // Every 100ms

    // Store interval for cleanup
    setTimeout(() => clearInterval(interval), 30000); // Max 30 seconds
  }

  private startDOMMonitoring(monitorId: string, container: Element): void {
    const monitor = this.activeMonitors.get(monitorId);
    if (!monitor) return;

    this.mutationObserver = new MutationObserver((mutations) => {
      monitor.domUpdates += mutations.length;
    });

    this.mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      characterData: true,
      characterDataOldValue: true
    });
  }

  private stopDOMMonitoring(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = undefined;
    }
  }

  private checkThresholds(metrics: TestPerformanceMetrics): void {
    if (metrics.executionTime > this.thresholds.maxExecutionTime) {
      metrics.warnings.push(
        `Slow test: ${metrics.testName} took ${metrics.executionTime.toFixed(2)}ms ` +
        `(threshold: ${this.thresholds.maxExecutionTime}ms)`
      );
    }

    if (metrics.renderTime > this.thresholds.maxRenderTime) {
      metrics.warnings.push(
        `Slow render: ${metrics.testName} render took ${metrics.renderTime.toFixed(2)}ms ` +
        `(threshold: ${this.thresholds.maxRenderTime}ms)`
      );
    }

    if (metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      metrics.warnings.push(
        `High memory usage: ${metrics.testName} used ${metrics.memoryUsage.toFixed(2)}MB ` +
        `(threshold: ${this.thresholds.maxMemoryUsage}MB)`
      );
    }

    if (metrics.componentCount > this.thresholds.maxComponentCount) {
      metrics.warnings.push(
        `Too many components: ${metrics.testName} rendered ${metrics.componentCount} components ` +
        `(threshold: ${this.thresholds.maxComponentCount})`
      );
    }

    if (metrics.rerenderCount > this.thresholds.maxRerenderCount) {
      metrics.warnings.push(
        `Too many re-renders: ${metrics.testName} had ${metrics.rerenderCount} re-renders ` +
        `(threshold: ${this.thresholds.maxRerenderCount})`
      );
    }
  }

  private logPerformanceSummary(metrics: TestPerformanceMetrics): void {
    const status = metrics.warnings.length === 0 ? '✅' : '⚠️';
    console.log(
      `${status} ${metrics.testName}: ` +
      `${metrics.executionTime.toFixed(2)}ms, ` +
      `${metrics.memoryUsage.toFixed(2)}MB, ` +
      `${metrics.componentCount} components, ` +
      `${metrics.rerenderCount} re-renders`
    );

    metrics.warnings.forEach(warning => {
      console.warn(`  ⚠️  ${warning}`);
    });
  }
}

// Global performance monitor instance
let globalMonitor: FrontendTestPerformanceMonitor | null = null;

export function getPerformanceMonitor(): FrontendTestPerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new FrontendTestPerformanceMonitor();
  }
  return globalMonitor;
}

export function resetPerformanceMonitor(): void {
  globalMonitor = null;
}

// Convenience function for monitoring tests
export async function monitorTestPerformance<T>(
  testName: string,
  testFn: (monitorId: string) => Promise<T>
): Promise<T> {
  const monitor = getPerformanceMonitor();
  return monitor.monitorTest(testName, testFn);
}

// Jest test utilities
export function createPerformanceTest(
  testName: string,
  testFn: (monitorId: string) => Promise<void>,
  thresholds?: Partial<PerformanceThresholds>
) {
  return async () => {
    const monitor = new FrontendTestPerformanceMonitor(thresholds);
    await monitor.monitorTest(testName, testFn);
    
    const summary = monitor.getPerformanceSummary();
    expect(summary.testsWithWarnings.length).toBe(0);
  };
}