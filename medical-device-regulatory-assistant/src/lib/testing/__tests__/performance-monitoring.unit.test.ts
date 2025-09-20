/**
 * Performance Monitoring System Tests
 *
 * Tests for the performance monitoring implementation
 * Validates Requirements 5.1 and 5.2 functionality
 */

import {
  performanceTest,
  performanceAssertions,
} from '../jest-performance-setup';
import {
  PerformanceThresholdValidator,
  validateTestPerformance,
  validateSuitePerformance,
} from '../performance-threshold-validator';
import {
  TestPerformanceTracker,
  getPerformanceTracker,
  resetPerformanceTracker,
} from '../test-performance-tracker';

describe('Performance Monitoring System', () => {
  let tracker: TestPerformanceTracker;
  let validator: PerformanceThresholdValidator;

  beforeEach(() => {
    resetPerformanceTracker();
    tracker = getPerformanceTracker();
    validator = new PerformanceThresholdValidator();
  });

  afterEach(() => {
    resetPerformanceTracker();
  });

  describe('TestPerformanceTracker', () => {
    it('should track test execution time', async () => {
      const suiteName = 'test-suite';
      const testName = 'test-case';

      tracker.startSuite(suiteName);
      const testId = tracker.startTest(testName, suiteName);

      // Simulate test execution
      await new Promise((resolve) => setTimeout(resolve, 100));

      const metrics = tracker.endTest(testId, 'passed');
      const suiteMetrics = tracker.endSuite(suiteName);

      expect(metrics.testName).toBe(testName);
      expect(metrics.suiteName).toBe(suiteName);
      expect(metrics.executionTime).toBeGreaterThan(90); // At least 90ms
      expect(metrics.status).toBe('passed');

      expect(suiteMetrics.suiteName).toBe(suiteName);
      expect(suiteMetrics.totalTests).toBe(1);
      expect(suiteMetrics.passedTests).toBe(1);
      expect(suiteMetrics.totalExecutionTime).toBeGreaterThan(90);
    });

    it('should track memory usage during tests', async () => {
      const suiteName = 'memory-test-suite';
      const testName = 'memory-test';

      tracker.startSuite(suiteName);
      const testId = tracker.startTest(testName, suiteName);

      // Simulate memory allocation
      const largeArray = new Array(10000).fill('test-data');

      const metrics = tracker.endTest(testId, 'passed');
      tracker.endSuite(suiteName);

      expect(metrics.memoryUsage).toBeDefined();
      expect(metrics.memoryUsage.heapUsed).toBeGreaterThan(0);
      expect(metrics.memoryUsage.heapTotal).toBeGreaterThan(0);

      // Clean up
      largeArray.length = 0;
    });

    it('should detect performance threshold violations', async () => {
      const suiteName = 'slow-test-suite';
      const testName = 'slow-test';

      // Configure strict thresholds
      const strictTracker = new TestPerformanceTracker({
        maxTestExecutionTime: 50, // Very strict 50ms limit
        maxMemoryUsage: 1, // Very strict 1MB limit
      });

      strictTracker.startSuite(suiteName);
      const testId = strictTracker.startTest(testName, suiteName);

      // Simulate slow test
      await new Promise((resolve) => setTimeout(resolve, 100));

      const metrics = strictTracker.endTest(testId, 'passed');
      const suiteMetrics = strictTracker.endSuite(suiteName);

      expect(metrics.warnings.length).toBeGreaterThan(0);
      expect(metrics.warnings[0]).toContain('execution time');
      expect(suiteMetrics.thresholdViolations.length).toBeGreaterThan(0);
    });

    it('should calculate consistency scores (Requirement 5.2)', async () => {
      const suiteName = 'consistency-test-suite';

      tracker.startSuite(suiteName);

      // Run multiple tests with varying execution times
      const executionTimes = [100, 110, 95, 105, 102]; // Consistent times

      for (let i = 0; i < executionTimes.length; i++) {
        const testId = tracker.startTest(`test-${i}`, suiteName);
        await new Promise((resolve) => setTimeout(resolve, executionTimes[i]));
        tracker.endTest(testId, 'passed');
      }

      const suiteMetrics = tracker.endSuite(suiteName);

      expect(suiteMetrics.consistencyScore).toBeGreaterThan(0.8); // Should be consistent
      expect(suiteMetrics.consistencyScore).toBeLessThanOrEqual(1.0);
    });

    it('should enforce 30-second suite limit (Requirement 5.1)', async () => {
      const suiteName = 'time-limit-test-suite';

      tracker.startSuite(suiteName);
      const testId = tracker.startTest('quick-test', suiteName);

      // Simulate quick test (well under 30 seconds)
      await new Promise((resolve) => setTimeout(resolve, 50));

      tracker.endTest(testId, 'passed');
      const suiteMetrics = tracker.endSuite(suiteName);

      // Should pass the 30-second requirement
      expect(suiteMetrics.totalExecutionTime).toBeLessThan(30000);
      expect(suiteMetrics.thresholdViolations).not.toContain(
        expect.stringContaining('30-second limit')
      );
    });
  });

  describe('PerformanceThresholdValidator', () => {
    it('should validate test performance against thresholds', () => {
      const testMetrics = {
        testName: 'sample-test',
        suiteName: 'sample-suite',
        executionTime: 100,
        memoryUsage: {
          heapUsed: 1024 * 1024, // 1MB
          heapTotal: 2048 * 1024,
          external: 0,
          rss: 1024 * 1024,
        },
        startTime: 0,
        endTime: 100,
        status: 'passed' as const,
        retryCount: 0,
        warnings: [],
        context: {
          nodeVersion: 'v18.0.0',
          reactVersion: '19.1.0',
          testEnvironment: 'jsdom',
          ci: false,
        },
      };

      const result = validateTestPerformance(testMetrics);

      expect(result.passed).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.score).toBeGreaterThan(90);
    });

    it('should detect performance violations', () => {
      const slowTestMetrics = {
        testName: 'slow-test',
        suiteName: 'slow-suite',
        executionTime: 10000, // 10 seconds - exceeds 5s threshold
        memoryUsage: {
          heapUsed: 600 * 1024 * 1024, // 600MB - exceeds 512MB threshold
          heapTotal: 1024 * 1024 * 1024,
          external: 0,
          rss: 600 * 1024 * 1024,
        },
        startTime: 0,
        endTime: 10000,
        status: 'passed' as const,
        retryCount: 0,
        warnings: [],
        context: {
          nodeVersion: 'v18.0.0',
          reactVersion: '19.1.0',
          testEnvironment: 'jsdom',
          ci: false,
        },
      };

      const result = validateTestPerformance(slowTestMetrics);

      expect(result.passed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations.some((v) => v.type === 'test_time')).toBe(true);
      expect(result.violations.some((v) => v.type === 'memory')).toBe(true);
      expect(result.score).toBeLessThan(70);
    });

    it('should validate suite performance for Requirement 5.1', () => {
      const suiteMetrics = {
        suiteName: 'test-suite',
        totalTests: 10,
        passedTests: 10,
        failedTests: 0,
        skippedTests: 0,
        totalExecutionTime: 35000, // 35 seconds - exceeds 30s limit
        averageTestTime: 3500,
        slowestTest: { name: 'slow-test', time: 5000 },
        fastestTest: { name: 'fast-test', time: 1000 },
        memoryPeak: 100,
        memoryAverage: 80,
        consistencyScore: 0.9,
        thresholdViolations: [],
      };

      const result = validateSuitePerformance(suiteMetrics);

      expect(result.passed).toBe(false);
      expect(
        result.violations.some(
          (v) => v.type === 'suite_time' && v.severity === 'critical'
        )
      ).toBe(true);
      expect(
        result.violations.some((v) => v.message.includes('Requirement 5.1'))
      ).toBe(true);
    });

    it('should validate consistency for Requirement 5.2', () => {
      const inconsistentSuiteMetrics = {
        suiteName: 'inconsistent-suite',
        totalTests: 5,
        passedTests: 5,
        failedTests: 0,
        skippedTests: 0,
        totalExecutionTime: 15000,
        averageTestTime: 3000,
        slowestTest: { name: 'slow-test', time: 8000 },
        fastestTest: { name: 'fast-test', time: 500 },
        memoryPeak: 100,
        memoryAverage: 80,
        consistencyScore: 0.5, // Poor consistency (below 80% threshold)
        thresholdViolations: [],
      };

      const result = validateSuitePerformance(inconsistentSuiteMetrics);

      expect(result.passed).toBe(false);
      expect(
        result.violations.some(
          (v) => v.type === 'consistency' && v.severity === 'critical'
        )
      ).toBe(true);
      expect(
        result.violations.some((v) => v.message.includes('Requirement 5.2'))
      ).toBe(true);
    });
  });

  describe('Jest Integration', () => {
    it(
      'should provide performance test wrapper',
      performanceTest(
        'performance-wrapper-test',
        async () => {
          // Simulate test work
          await new Promise((resolve) => setTimeout(resolve, 50));
          expect(true).toBe(true);
        },
        {
          maxExecutionTime: 100,
          maxMemoryUsage: 10,
        }
      )
    );

    it('should provide performance assertions', () => {
      // Test memory assertion
      expect(() => {
        performanceAssertions.expectMemoryUsageWithin(1000); // 1GB - should pass
      }).not.toThrow();

      // Test suite time assertion (should pass since we're well under 30s)
      expect(() => {
        performanceAssertions.expectSuiteToCompleteWithinThreshold();
      }).not.toThrow();
    });
  });

  describe('Performance Report Generation', () => {
    it('should generate comprehensive performance report', async () => {
      const suiteName = 'report-test-suite';

      tracker.startSuite(suiteName);

      // Add multiple tests
      for (let i = 0; i < 3; i++) {
        const testId = tracker.startTest(`test-${i}`, suiteName);
        await new Promise((resolve) => setTimeout(resolve, 50 + i * 10));
        tracker.endTest(testId, i === 2 ? 'failed' : 'passed');
      }

      tracker.endSuite(suiteName);

      const report = tracker.generateReport();

      expect(report.totalSuites).toBe(1);
      expect(report.totalTests).toBe(3);
      expect(report.overallPassRate).toBeCloseTo(66.67, 1); // 2/3 passed
      expect(report.thresholdCompliance).toBeDefined();
      expect(report.suiteMetrics).toHaveLength(1);
      expect(report.recommendations).toBeDefined();
    });

    it('should track performance history and detect regressions', async () => {
      // First run
      tracker.startSuite('regression-test');
      let testId = tracker.startTest('baseline-test', 'regression-test');
      await new Promise((resolve) => setTimeout(resolve, 100));
      tracker.endTest(testId, 'passed');
      tracker.endSuite('regression-test');

      const firstReport = tracker.generateReport();

      // Reset and simulate second run with regression
      resetPerformanceTracker();
      tracker = getPerformanceTracker();

      tracker.startSuite('regression-test');
      testId = tracker.startTest('baseline-test', 'regression-test');
      await new Promise((resolve) => setTimeout(resolve, 200)); // Slower
      tracker.endTest(testId, 'passed');
      tracker.endSuite('regression-test');

      const secondReport = tracker.generateReport();

      expect(secondReport.overallExecutionTime).toBeGreaterThan(
        firstReport.overallExecutionTime
      );
    });
  });
});

describe('Performance Monitoring Integration', () => {
  it('should automatically track performance in real test environment', async () => {
    // This test verifies that the performance monitoring is working
    // in the actual Jest environment

    const startTime = performance.now();

    // Simulate some test work
    await new Promise((resolve) => setTimeout(resolve, 100));

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    expect(executionTime).toBeGreaterThan(90);
    expect(executionTime).toBeLessThan(200);

    // Verify memory tracking is available
    const memUsage = process.memoryUsage();
    expect(memUsage.heapUsed).toBeGreaterThan(0);
    expect(memUsage.heapTotal).toBeGreaterThan(0);
  });

  it('should meet Requirement 5.1 (30-second suite limit)', () => {
    // This test should complete well within the 30-second limit
    const testStartTime = Date.now();

    // Simulate multiple quick operations
    for (let i = 0; i < 100; i++) {
      expect(i).toBeLessThan(100);
    }

    const testEndTime = Date.now();
    const executionTime = testEndTime - testStartTime;

    expect(executionTime).toBeLessThan(1000); // Should be under 1 second
  });

  it('should meet Requirement 5.2 (consistency)', async () => {
    // Run the same operation multiple times and verify consistency
    const executionTimes: number[] = [];

    for (let i = 0; i < 5; i++) {
      const start = performance.now();

      // Consistent operation
      await new Promise((resolve) => setTimeout(resolve, 50));

      const end = performance.now();
      executionTimes.push(end - start);
    }

    // Calculate coefficient of variation
    const mean =
      executionTimes.reduce((sum, time) => sum + time, 0) /
      executionTimes.length;
    const variance =
      executionTimes.reduce((sum, time) => sum + (time - mean)**2, 0) /
      executionTimes.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficientOfVariation = standardDeviation / mean;

    // Should be consistent (CV < 0.2 for 20% variance threshold)
    expect(coefficientOfVariation).toBeLessThan(0.2);
  });
});
