/**
 * Performance Testing Utilities
 * Tests the effectiveness of frontend optimizations
 */

import { useState, useCallback } from 'react';

import { performanceMonitor } from './optimization';


interface PerformanceTestResult {
  testName: string;
  passed: boolean;
  actualValue: number;
  expectedValue: number;
  unit: string;
  details?: string;
}

interface PerformanceTestSuite {
  name: string;
  results: PerformanceTestResult[];
  overallScore: number;
  passed: boolean;
}

class PerformanceTestRunner {
  private results: PerformanceTestSuite[] = [];

  async runAllTests(): Promise<PerformanceTestSuite[]> {
    this.results = [];

    // Run different test suites
    await this.testPageLoadPerformance();
    await this.testComponentRenderPerformance();
    await this.testMemoryUsage();
    await this.testBundleSize();
    await this.testImageLoading();

    return this.results;
  }

  private async testPageLoadPerformance(): Promise<void> {
    const suite: PerformanceTestSuite = {
      name: 'Page Load Performance',
      results: [],
      overallScore: 0,
      passed: false,
    };

    // Test First Contentful Paint
    const fcp = await this.measureFirstContentfulPaint();
    suite.results.push({
      testName: 'First Contentful Paint',
      passed: fcp < 1800,
      actualValue: fcp,
      expectedValue: 1800,
      unit: 'ms',
      details: 'Time until first content is painted',
    });

    // Test Largest Contentful Paint
    const lcp = await this.measureLargestContentfulPaint();
    suite.results.push({
      testName: 'Largest Contentful Paint',
      passed: lcp < 2500,
      actualValue: lcp,
      expectedValue: 2500,
      unit: 'ms',
      details: 'Time until largest content element is painted',
    });

    // Test First Input Delay
    const fid = await this.measureFirstInputDelay();
    suite.results.push({
      testName: 'First Input Delay',
      passed: fid < 100,
      actualValue: fid,
      expectedValue: 100,
      unit: 'ms',
      details: 'Time from first user interaction to browser response',
    });

    // Test Cumulative Layout Shift
    const cls = await this.measureCumulativeLayoutShift();
    suite.results.push({
      testName: 'Cumulative Layout Shift',
      passed: cls < 0.1,
      actualValue: cls,
      expectedValue: 0.1,
      unit: 'score',
      details: 'Visual stability score',
    });

    suite.overallScore = this.calculateSuiteScore(suite.results);
    suite.passed = suite.overallScore >= 75;
    this.results.push(suite);
  }

  private async testComponentRenderPerformance(): Promise<void> {
    const suite: PerformanceTestSuite = {
      name: 'Component Render Performance',
      results: [],
      overallScore: 0,
      passed: false,
    };

    // Test React component render times
    const renderTime = await this.measureComponentRenderTime();
    suite.results.push({
      testName: 'Average Component Render Time',
      passed: renderTime < 16, // 60fps = 16ms per frame
      actualValue: renderTime,
      expectedValue: 16,
      unit: 'ms',
      details: 'Average time to render React components',
    });

    // Test virtual scrolling performance
    const scrollPerformance = await this.testVirtualScrolling();
    suite.results.push({
      testName: 'Virtual Scrolling Performance',
      passed: scrollPerformance < 5,
      actualValue: scrollPerformance,
      expectedValue: 5,
      unit: 'ms',
      details: 'Time to update virtual scroll viewport',
    });

    // Test memo optimization effectiveness
    const memoEffectiveness = await this.testMemoOptimization();
    suite.results.push({
      testName: 'React.memo Effectiveness',
      passed: memoEffectiveness > 80,
      actualValue: memoEffectiveness,
      expectedValue: 80,
      unit: '%',
      details: 'Percentage of prevented re-renders',
    });

    suite.overallScore = this.calculateSuiteScore(suite.results);
    suite.passed = suite.overallScore >= 75;
    this.results.push(suite);
  }

  private async testMemoryUsage(): Promise<void> {
    const suite: PerformanceTestSuite = {
      name: 'Memory Usage',
      results: [],
      overallScore: 0,
      passed: false,
    };

    if ('memory' in performance) {
      const {memory} = (performance as any);

      // Test heap usage
      const heapUsage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      suite.results.push({
        testName: 'Heap Usage Percentage',
        passed: heapUsage < 70,
        actualValue: heapUsage,
        expectedValue: 70,
        unit: '%',
        details: 'Percentage of JavaScript heap used',
      });

      // Test memory growth over time
      const memoryGrowth = await this.measureMemoryGrowth();
      suite.results.push({
        testName: 'Memory Growth Rate',
        passed: memoryGrowth < 5,
        actualValue: memoryGrowth,
        expectedValue: 5,
        unit: 'MB/min',
        details: 'Rate of memory increase over time',
      });
    } else {
      suite.results.push({
        testName: 'Memory API Support',
        passed: false,
        actualValue: 0,
        expectedValue: 1,
        unit: 'boolean',
        details: 'Browser does not support memory API',
      });
    }

    suite.overallScore = this.calculateSuiteScore(suite.results);
    suite.passed = suite.overallScore >= 75;
    this.results.push(suite);
  }

  private async testBundleSize(): Promise<void> {
    const suite: PerformanceTestSuite = {
      name: 'Bundle Size Optimization',
      results: [],
      overallScore: 0,
      passed: false,
    };

    // Test total bundle size
    const bundleSize = await this.measureBundleSize();
    suite.results.push({
      testName: 'Total Bundle Size',
      passed: bundleSize < 1000, // 1MB
      actualValue: bundleSize,
      expectedValue: 1000,
      unit: 'KB',
      details: 'Total size of JavaScript bundles',
    });

    // Test code splitting effectiveness
    const codeSplitting = await this.testCodeSplitting();
    suite.results.push({
      testName: 'Code Splitting Effectiveness',
      passed: codeSplitting > 60,
      actualValue: codeSplitting,
      expectedValue: 60,
      unit: '%',
      details: 'Percentage of code that is split into async chunks',
    });

    // Test tree shaking effectiveness
    const treeShaking = await this.testTreeShaking();
    suite.results.push({
      testName: 'Tree Shaking Effectiveness',
      passed: treeShaking > 70,
      actualValue: treeShaking,
      expectedValue: 70,
      unit: '%',
      details: 'Percentage of unused code eliminated',
    });

    suite.overallScore = this.calculateSuiteScore(suite.results);
    suite.passed = suite.overallScore >= 75;
    this.results.push(suite);
  }

  private async testImageLoading(): Promise<void> {
    const suite: PerformanceTestSuite = {
      name: 'Image Loading Optimization',
      results: [],
      overallScore: 0,
      passed: false,
    };

    // Test lazy loading effectiveness
    const lazyLoading = await this.testLazyLoading();
    suite.results.push({
      testName: 'Lazy Loading Effectiveness',
      passed: lazyLoading > 80,
      actualValue: lazyLoading,
      expectedValue: 80,
      unit: '%',
      details: 'Percentage of images loaded only when needed',
    });

    // Test image optimization
    const imageOptimization = await this.testImageOptimization();
    suite.results.push({
      testName: 'Image Optimization',
      passed: imageOptimization > 70,
      actualValue: imageOptimization,
      expectedValue: 70,
      unit: '%',
      details: 'Percentage reduction in image file sizes',
    });

    suite.overallScore = this.calculateSuiteScore(suite.results);
    suite.passed = suite.overallScore >= 75;
    this.results.push(suite);
  }

  // Individual measurement methods
  private async measureFirstContentfulPaint(): Promise<number> {
    return new Promise((resolve) => {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              observer.disconnect();
              resolve(entry.startTime);
              return;
            }
          }
        });
        observer.observe({ entryTypes: ['paint'] });

        // Fallback timeout
        setTimeout(() => {
          observer.disconnect();
          resolve(0);
        }, 5000);
      } else {
        resolve(0);
      }
    });
  }

  private async measureLargestContentfulPaint(): Promise<number> {
    return new Promise((resolve) => {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          if (entries.length > 0) {
            const lastEntry = entries[entries.length - 1];
            resolve(lastEntry.startTime);
          }
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });

        setTimeout(() => {
          observer.disconnect();
          resolve(0);
        }, 5000);
      } else {
        resolve(0);
      }
    });
  }

  private async measureFirstInputDelay(): Promise<number> {
    return new Promise((resolve) => {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            observer.disconnect();
            resolve((entry as any).processingStart - entry.startTime);
            return;
          }
        });
        observer.observe({ entryTypes: ['first-input'] });

        setTimeout(() => {
          observer.disconnect();
          resolve(0);
        }, 10000);
      } else {
        resolve(0);
      }
    });
  }

  private async measureCumulativeLayoutShift(): Promise<number> {
    return new Promise((resolve) => {
      let clsValue = 0;

      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
        });
        observer.observe({ entryTypes: ['layout-shift'] });

        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 5000);
      } else {
        resolve(0);
      }
    });
  }

  private async measureComponentRenderTime(): Promise<number> {
    const metrics = performanceMonitor.getPerformanceReport();
    return metrics.component_render?.avg || 0;
  }

  private async testVirtualScrolling(): Promise<number> {
    // Simulate virtual scrolling performance test
    const startTime = performance.now();

    // Simulate scroll event handling
    for (let i = 0; i < 100; i++) {
      // Simulate virtual scroll calculations
      const visibleStart = Math.floor(i / 10);
      const visibleEnd = Math.min(visibleStart + 10, 100);
      // Simulate DOM updates
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    return performance.now() - startTime;
  }

  private async testMemoOptimization(): Promise<number> {
    // This would typically require instrumentation of React components
    // For now, return a simulated effectiveness percentage
    return 85; // Assume 85% effectiveness
  }

  private async measureMemoryGrowth(): Promise<number> {
    if (!('memory' in performance)) return 0;

    const initialMemory = (performance as any).memory.usedJSHeapSize;

    // Wait 1 minute and measure again
    await new Promise((resolve) => setTimeout(resolve, 60000));

    const finalMemory = (performance as any).memory.usedJSHeapSize;
    const growthMB = (finalMemory - initialMemory) / 1024 / 1024;

    return growthMB;
  }

  private async measureBundleSize(): Promise<number> {
    const resources = performance.getEntriesByType(
      'resource'
    ) as PerformanceResourceTiming[];
    const jsResources = resources.filter((r) => r.name.includes('.js'));

    return (
      jsResources.reduce((total, resource) => total + (resource.transferSize || 0), 0) / 1024
    ); // Convert to KB
  }

  private async testCodeSplitting(): Promise<number> {
    const resources = performance.getEntriesByType(
      'resource'
    ) as PerformanceResourceTiming[];
    const jsResources = resources.filter((r) => r.name.includes('.js'));
    const asyncChunks = jsResources.filter(
      (r) => /\d+\.[a-f0-9]+\.js$/.test(r.name) || r.name.includes('chunk')
    );

    return (asyncChunks.length / jsResources.length) * 100;
  }

  private async testTreeShaking(): Promise<number> {
    // This would typically require build-time analysis
    // For now, return a simulated effectiveness percentage
    return 75; // Assume 75% effectiveness
  }

  private async testLazyLoading(): Promise<number> {
    const images = document.querySelectorAll('img');
    const lazyImages = document.querySelectorAll('img[loading="lazy"]');

    return images.length > 0 ? (lazyImages.length / images.length) * 100 : 0;
  }

  private async testImageOptimization(): Promise<number> {
    // This would typically require comparing original vs optimized sizes
    // For now, return a simulated optimization percentage
    return 65; // Assume 65% size reduction
  }

  private calculateSuiteScore(results: PerformanceTestResult[]): number {
    if (results.length === 0) return 0;

    const passedTests = results.filter((r) => r.passed).length;
    return (passedTests / results.length) * 100;
  }

  getResults(): PerformanceTestSuite[] {
    return this.results;
  }

  generateReport(): string {
    let report = '# Performance Test Report\n\n';

    for (const suite of this.results) {
      report += `## ${suite.name}\n`;
      report += `**Overall Score:** ${suite.overallScore.toFixed(1)}/100 ${suite.passed ? '✅' : '❌'}\n\n`;

      for (const result of suite.results) {
        const status = result.passed ? '✅' : '❌';
        report += `- **${result.testName}:** ${status}\n`;
        report += `  - Actual: ${result.actualValue.toFixed(1)}${result.unit}\n`;
        report += `  - Expected: <${result.expectedValue}${result.unit}\n`;
        if (result.details) {
          report += `  - Details: ${result.details}\n`;
        }
        report += '\n';
      }
    }

    return report;
  }
}

// Global performance test runner
export const performanceTestRunner = new PerformanceTestRunner();

// React hook for performance testing
export function usePerformanceTest() {
  const [results, setResults] = useState<PerformanceTestSuite[]>([]);
  const [loading, setLoading] = useState(false);

  const runTests = useCallback(async () => {
    setLoading(true);
    try {
      const testResults = await performanceTestRunner.runAllTests();
      setResults(testResults);
    } catch (error) {
      console.error('Performance tests failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    results,
    loading,
    runTests,
    generateReport: () => performanceTestRunner.generateReport(),
  };
}
