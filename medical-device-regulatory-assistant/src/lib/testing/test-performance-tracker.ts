/**
 * Test Performance Tracker
 *
 * Enhanced performance monitoring system for test infrastructure
 * Implements Requirements 5.1 and 5.2:
 * - 5.1: Complete test suite within 30 seconds
 * - 5.2: Consistent results across multiple runs
 */

import { performance } from 'perf_hooks';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export interface TestExecutionMetrics {
  testName: string;
  suiteName: string;
  executionTime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  };
  startTime: number;
  endTime: number;
  status: 'passed' | 'failed' | 'skipped';
  retryCount: number;
  warnings: string[];
  context: {
    nodeVersion: string;
    reactVersion: string;
    testEnvironment: string;
    ci: boolean;
  };
}

export interface SuitePerformanceMetrics {
  suiteName: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  totalExecutionTime: number;
  averageTestTime: number;
  slowestTest: {
    name: string;
    time: number;
  };
  fastestTest: {
    name: string;
    time: number;
  };
  memoryPeak: number;
  memoryAverage: number;
  consistencyScore: number; // 0-1, based on execution time variance
  thresholdViolations: string[];
}

export interface PerformanceThresholds {
  maxSuiteExecutionTime: number; // 30 seconds as per requirement 5.1
  maxTestExecutionTime: number; // Individual test threshold
  maxMemoryUsage: number; // MB
  consistencyThreshold: number; // Variance threshold for requirement 5.2
  memoryLeakThreshold: number; // MB increase per test
}

export interface PerformanceReport {
  timestamp: string;
  totalSuites: number;
  totalTests: number;
  overallExecutionTime: number;
  overallPassRate: number;
  thresholdCompliance: {
    suiteTimeCompliance: boolean;
    consistencyCompliance: boolean;
    memoryCompliance: boolean;
  };
  suiteMetrics: SuitePerformanceMetrics[];
  recommendations: string[];
  regressionAnalysis?: {
    hasRegression: boolean;
    regressionPercentage: number;
    affectedTests: string[];
  };
}

export class TestPerformanceTracker {
  private activeTests: Map<
    string,
    {
      testName: string;
      suiteName: string;
      startTime: number;
      startMemory: NodeJS.MemoryUsage;
      retryCount: number;
    }
  > = new Map();

  private completedTests: TestExecutionMetrics[] = [];
  private suiteStartTimes: Map<string, number> = new Map();
  private suiteMetrics: Map<string, SuitePerformanceMetrics> = new Map();

  private readonly thresholds: PerformanceThresholds;
  private readonly reportDir: string;
  private readonly historyFile: string;

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = {
      maxSuiteExecutionTime: 30000, // 30 seconds (Requirement 5.1)
      maxTestExecutionTime: 5000, // 5 seconds per test
      maxMemoryUsage: 512, // 512MB
      consistencyThreshold: 0.2, // 20% variance (Requirement 5.2)
      memoryLeakThreshold: 10, // 10MB
      ...thresholds,
    };

    this.reportDir = join(process.cwd(), 'test-reports', 'performance');
    this.historyFile = join(this.reportDir, 'performance-history.json');

    // Ensure report directory exists
    if (!existsSync(this.reportDir)) {
      mkdirSync(this.reportDir, { recursive: true });
    }
  }

  /**
   * Start tracking a test suite
   */
  startSuite(suiteName: string): void {
    this.suiteStartTimes.set(suiteName, performance.now());
    console.log(`📊 Performance tracking started for suite: ${suiteName}`);
  }

  /**
   * End tracking a test suite and generate metrics
   */
  endSuite(suiteName: string): SuitePerformanceMetrics {
    const startTime = this.suiteStartTimes.get(suiteName);
    if (!startTime) {
      throw new Error(`Suite ${suiteName} was not started`);
    }

    const endTime = performance.now();
    const totalExecutionTime = endTime - startTime;

    const suiteTests = this.completedTests.filter(
      (test) => test.suiteName === suiteName
    );

    if (suiteTests.length === 0) {
      throw new Error(`No tests found for suite ${suiteName}`);
    }

    const passedTests = suiteTests.filter(
      (test) => test.status === 'passed'
    ).length;
    const failedTests = suiteTests.filter(
      (test) => test.status === 'failed'
    ).length;
    const skippedTests = suiteTests.filter(
      (test) => test.status === 'skipped'
    ).length;

    const executionTimes = suiteTests.map((test) => test.executionTime);
    const averageTestTime =
      executionTimes.reduce((sum, time) => sum + time, 0) /
      executionTimes.length;

    const slowestTest = suiteTests.reduce((slowest, test) =>
      test.executionTime > slowest.executionTime ? test : slowest
    );

    const fastestTest = suiteTests.reduce((fastest, test) =>
      test.executionTime < fastest.executionTime ? test : fastest
    );

    const memoryUsages = suiteTests.map(
      (test) => test.memoryUsage.heapUsed / 1024 / 1024
    );
    const memoryPeak = Math.max(...memoryUsages);
    const memoryAverage =
      memoryUsages.reduce((sum, usage) => sum + usage, 0) / memoryUsages.length;

    // Calculate consistency score (Requirement 5.2)
    const consistencyScore = this.calculateConsistencyScore(executionTimes);

    // Check threshold violations
    const thresholdViolations: string[] = [];

    if (totalExecutionTime > this.thresholds.maxSuiteExecutionTime) {
      thresholdViolations.push(
        `Suite execution time ${(totalExecutionTime / 1000).toFixed(2)}s exceeds threshold ${this.thresholds.maxSuiteExecutionTime / 1000}s`
      );
    }

    if (consistencyScore < 1 - this.thresholds.consistencyThreshold) {
      thresholdViolations.push(
        `Test execution consistency ${(consistencyScore * 100).toFixed(1)}% below threshold ${((1 - this.thresholds.consistencyThreshold) * 100).toFixed(1)}%`
      );
    }

    if (memoryPeak > this.thresholds.maxMemoryUsage) {
      thresholdViolations.push(
        `Peak memory usage ${memoryPeak.toFixed(2)}MB exceeds threshold ${this.thresholds.maxMemoryUsage}MB`
      );
    }

    const metrics: SuitePerformanceMetrics = {
      suiteName,
      totalTests: suiteTests.length,
      passedTests,
      failedTests,
      skippedTests,
      totalExecutionTime,
      averageTestTime,
      slowestTest: {
        name: slowestTest.testName,
        time: slowestTest.executionTime,
      },
      fastestTest: {
        name: fastestTest.testName,
        time: fastestTest.executionTime,
      },
      memoryPeak,
      memoryAverage,
      consistencyScore,
      thresholdViolations,
    };

    this.suiteMetrics.set(suiteName, metrics);
    this.suiteStartTimes.delete(suiteName);

    // Log suite completion
    const status = thresholdViolations.length === 0 ? '✅' : '⚠️';
    console.log(
      `${status} Suite ${suiteName} completed: ` +
        `${(totalExecutionTime / 1000).toFixed(2)}s, ` +
        `${passedTests}/${suiteTests.length} passed, ` +
        `consistency: ${(consistencyScore * 100).toFixed(1)}%`
    );

    if (thresholdViolations.length > 0) {
      thresholdViolations.forEach((violation) => {
        console.warn(`  ⚠️  ${violation}`);
      });
    }

    return metrics;
  }

  /**
   * Start tracking an individual test
   */
  startTest(testName: string, suiteName: string): string {
    const testId = `${suiteName}::${testName}::${Date.now()}`;

    this.activeTests.set(testId, {
      testName,
      suiteName,
      startTime: performance.now(),
      startMemory: process.memoryUsage(),
      retryCount: 0,
    });

    return testId;
  }

  /**
   * End tracking an individual test
   */
  endTest(
    testId: string,
    status: 'passed' | 'failed' | 'skipped',
    warnings: string[] = []
  ): TestExecutionMetrics {
    const activeTest = this.activeTests.get(testId);
    if (!activeTest) {
      throw new Error(`Test ${testId} was not started`);
    }

    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    const executionTime = endTime - activeTest.startTime;

    const memoryUsage = {
      heapUsed: endMemory.heapUsed - activeTest.startMemory.heapUsed,
      heapTotal: endMemory.heapTotal,
      external: endMemory.external - activeTest.startMemory.external,
      rss: endMemory.rss - activeTest.startMemory.rss,
    };

    // Add performance warnings
    const performanceWarnings = [...warnings];

    if (executionTime > this.thresholds.maxTestExecutionTime) {
      performanceWarnings.push(
        `Test execution time ${executionTime.toFixed(2)}ms exceeds threshold ${this.thresholds.maxTestExecutionTime}ms`
      );
    }

    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
    if (memoryUsageMB > this.thresholds.maxMemoryUsage) {
      performanceWarnings.push(
        `Test memory usage ${memoryUsageMB.toFixed(2)}MB exceeds threshold ${this.thresholds.maxMemoryUsage}MB`
      );
    }

    const metrics: TestExecutionMetrics = {
      testName: activeTest.testName,
      suiteName: activeTest.suiteName,
      executionTime,
      memoryUsage,
      startTime: activeTest.startTime,
      endTime,
      status,
      retryCount: activeTest.retryCount,
      warnings: performanceWarnings,
      context: {
        nodeVersion: process.version,
        reactVersion: '19.1.0', // From package.json
        testEnvironment: 'jsdom',
        ci: process.env.CI === 'true',
      },
    };

    this.completedTests.push(metrics);
    this.activeTests.delete(testId);

    return metrics;
  }

  /**
   * Record a test retry
   */
  recordRetry(testId: string): void {
    const activeTest = this.activeTests.get(testId);
    if (activeTest) {
      activeTest.retryCount++;
    }
  }

  /**
   * Generate comprehensive performance report
   */
  generateReport(): PerformanceReport {
    const suiteMetrics = Array.from(this.suiteMetrics.values());
    const totalTests = this.completedTests.length;
    const passedTests = this.completedTests.filter(
      (test) => test.status === 'passed'
    ).length;

    const overallExecutionTime = suiteMetrics.reduce(
      (sum, suite) => sum + suite.totalExecutionTime,
      0
    );

    const overallPassRate =
      totalTests > 0 ? (passedTests / totalTests) * 100 : 0;

    // Check threshold compliance
    const suiteTimeCompliance = suiteMetrics.every(
      (suite) =>
        suite.totalExecutionTime <= this.thresholds.maxSuiteExecutionTime
    );

    const consistencyCompliance = suiteMetrics.every(
      (suite) =>
        suite.consistencyScore >= 1 - this.thresholds.consistencyThreshold
    );

    const memoryCompliance = suiteMetrics.every(
      (suite) => suite.memoryPeak <= this.thresholds.maxMemoryUsage
    );

    // Generate recommendations
    const recommendations = this.generateRecommendations(suiteMetrics);

    // Perform regression analysis
    const regressionAnalysis = this.performRegressionAnalysis();

    const report: PerformanceReport = {
      timestamp: new Date().toISOString(),
      totalSuites: suiteMetrics.length,
      totalTests,
      overallExecutionTime,
      overallPassRate,
      thresholdCompliance: {
        suiteTimeCompliance,
        consistencyCompliance,
        memoryCompliance,
      },
      suiteMetrics,
      recommendations,
      regressionAnalysis,
    };

    // Save report
    this.saveReport(report);

    return report;
  }

  /**
   * Calculate consistency score based on execution time variance
   * Higher score = more consistent (Requirement 5.2)
   */
  private calculateConsistencyScore(executionTimes: number[]): number {
    if (executionTimes.length < 2) return 1.0;

    const mean =
      executionTimes.reduce((sum, time) => sum + time, 0) /
      executionTimes.length;
    const variance =
      executionTimes.reduce((sum, time) => sum + Math.pow(time - mean, 2), 0) /
      executionTimes.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = standardDeviation / mean;

    // Convert coefficient of variation to consistency score (0-1)
    // Lower CV = higher consistency
    return Math.max(0, 1 - coefficientOfVariation);
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(
    suiteMetrics: SuitePerformanceMetrics[]
  ): string[] {
    const recommendations: string[] = [];

    // Check for slow suites
    const slowSuites = suiteMetrics.filter(
      (suite) =>
        suite.totalExecutionTime > this.thresholds.maxSuiteExecutionTime * 0.8
    );

    if (slowSuites.length > 0) {
      recommendations.push(
        `Consider optimizing slow test suites: ${slowSuites.map((s) => s.suiteName).join(', ')}`
      );
    }

    // Check for inconsistent suites
    const inconsistentSuites = suiteMetrics.filter(
      (suite) => suite.consistencyScore < 0.8
    );

    if (inconsistentSuites.length > 0) {
      recommendations.push(
        `Improve test consistency for: ${inconsistentSuites.map((s) => s.suiteName).join(', ')}`
      );
    }

    // Check for memory-intensive suites
    const memoryIntensiveSuites = suiteMetrics.filter(
      (suite) => suite.memoryPeak > this.thresholds.maxMemoryUsage * 0.8
    );

    if (memoryIntensiveSuites.length > 0) {
      recommendations.push(
        `Optimize memory usage for: ${memoryIntensiveSuites.map((s) => s.suiteName).join(', ')}`
      );
    }

    // General recommendations
    const overallPassRate =
      (suiteMetrics.reduce((sum, suite) => sum + suite.passedTests, 0) /
        suiteMetrics.reduce((sum, suite) => sum + suite.totalTests, 0)) *
      100;

    if (overallPassRate < 95) {
      recommendations.push(
        'Focus on improving test reliability to achieve >95% pass rate'
      );
    }

    return recommendations;
  }

  /**
   * Perform regression analysis against historical data
   */
  private performRegressionAnalysis(): PerformanceReport['regressionAnalysis'] {
    if (!existsSync(this.historyFile)) {
      return undefined;
    }

    try {
      const historyData = JSON.parse(readFileSync(this.historyFile, 'utf8'));
      const previousReports: PerformanceReport[] = historyData.reports || [];

      if (previousReports.length === 0) {
        return undefined;
      }

      const latestReport = previousReports[previousReports.length - 1];
      const currentExecutionTime = this.completedTests.reduce(
        (sum, test) => sum + test.executionTime,
        0
      );
      const previousExecutionTime = latestReport.overallExecutionTime;

      const regressionPercentage =
        ((currentExecutionTime - previousExecutionTime) /
          previousExecutionTime) *
        100;
      const hasRegression = regressionPercentage > 20; // 20% regression threshold

      const affectedTests: string[] = [];
      if (hasRegression) {
        // Identify specific tests that regressed
        this.completedTests.forEach((currentTest) => {
          const previousTest = latestReport.suiteMetrics
            .flatMap((suite) => [suite.slowestTest, suite.fastestTest])
            .find((test) => test.name === currentTest.testName);

          if (
            previousTest &&
            currentTest.executionTime > previousTest.time * 1.2
          ) {
            affectedTests.push(currentTest.testName);
          }
        });
      }

      return {
        hasRegression,
        regressionPercentage,
        affectedTests,
      };
    } catch (error) {
      console.warn('Failed to perform regression analysis:', error);
      return undefined;
    }
  }

  /**
   * Save performance report and update history
   */
  private saveReport(report: PerformanceReport): void {
    // Save current report
    const reportFile = join(this.reportDir, `performance-${Date.now()}.json`);
    writeFileSync(reportFile, JSON.stringify(report, null, 2));

    // Update history
    let historyData: { reports: PerformanceReport[] } = { reports: [] };

    if (existsSync(this.historyFile)) {
      try {
        historyData = JSON.parse(readFileSync(this.historyFile, 'utf8'));
      } catch (error) {
        console.warn('Failed to read performance history, starting fresh');
      }
    }

    historyData.reports.push(report);

    // Keep only last 50 reports
    if (historyData.reports.length > 50) {
      historyData.reports = historyData.reports.slice(-50);
    }

    writeFileSync(this.historyFile, JSON.stringify(historyData, null, 2));

    console.log(`📊 Performance report saved: ${reportFile}`);
  }

  /**
   * Get performance summary for console output
   */
  getPerformanceSummary(): string {
    const report = this.generateReport();

    const summary = [
      '📊 Test Performance Summary',
      '='.repeat(50),
      `Total Suites: ${report.totalSuites}`,
      `Total Tests: ${report.totalTests}`,
      `Overall Execution Time: ${(report.overallExecutionTime / 1000).toFixed(2)}s`,
      `Pass Rate: ${report.overallPassRate.toFixed(1)}%`,
      '',
      'Threshold Compliance:',
      `  Suite Time (≤30s): ${report.thresholdCompliance.suiteTimeCompliance ? '✅' : '❌'}`,
      `  Consistency: ${report.thresholdCompliance.consistencyCompliance ? '✅' : '❌'}`,
      `  Memory Usage: ${report.thresholdCompliance.memoryCompliance ? '✅' : '❌'}`,
    ];

    if (report.recommendations.length > 0) {
      summary.push('', 'Recommendations:');
      report.recommendations.forEach((rec) => summary.push(`  • ${rec}`));
    }

    if (report.regressionAnalysis?.hasRegression) {
      summary.push('', '⚠️  Performance Regression Detected:');
      summary.push(
        `  Regression: ${report.regressionAnalysis.regressionPercentage.toFixed(1)}%`
      );
      if (report.regressionAnalysis.affectedTests.length > 0) {
        summary.push(
          `  Affected Tests: ${report.regressionAnalysis.affectedTests.join(', ')}`
        );
      }
    }

    return summary.join('\n');
  }

  /**
   * Clear all tracking data
   */
  reset(): void {
    this.activeTests.clear();
    this.completedTests = [];
    this.suiteStartTimes.clear();
    this.suiteMetrics.clear();
  }
}

// Global performance tracker instance
let globalTracker: TestPerformanceTracker | null = null;

export function getPerformanceTracker(): TestPerformanceTracker {
  if (!globalTracker) {
    globalTracker = new TestPerformanceTracker();
  }
  return globalTracker;
}

export function resetPerformanceTracker(): void {
  globalTracker = null;
}

// Jest integration utilities
export function withPerformanceTracking(suiteName: string) {
  return {
    beforeAll: () => {
      getPerformanceTracker().startSuite(suiteName);
    },
    afterAll: () => {
      const metrics = getPerformanceTracker().endSuite(suiteName);
      console.log(getPerformanceTracker().getPerformanceSummary());
      return metrics;
    },
    beforeEach: (testName: string) => {
      return getPerformanceTracker().startTest(testName, suiteName);
    },
    afterEach: (testId: string, status: 'passed' | 'failed' | 'skipped') => {
      return getPerformanceTracker().endTest(testId, status);
    },
  };
}
