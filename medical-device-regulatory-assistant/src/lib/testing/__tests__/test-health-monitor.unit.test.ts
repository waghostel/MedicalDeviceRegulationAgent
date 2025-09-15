/**
 * Test Health Monitor Tests
 * 
 * Comprehensive tests for the TestHealthMonitor class to ensure it correctly
 * collects metrics, generates health reports, and supports CI/CD integration.
 * 
 * Requirements: 5.2 (consistent test results), 8.1 (CI environment success >90% pass rate)
 */

import { TestHealthMonitor, TestResult, TestSuiteResult, HealthThresholds } from '../test-health-monitor';
import { existsSync, rmSync, mkdirSync } from 'fs';
import { join } from 'path';

describe('TestHealthMonitor', () => {
  let monitor: TestHealthMonitor;
  let testDataDir: string;

  beforeEach(() => {
    testDataDir = join(__dirname, 'test-health-data-temp');
    
    // Clean up any existing test data
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true, force: true });
    }
    
    // Create fresh monitor instance
    monitor = new TestHealthMonitor(
      {
        minimumPassRate: 0.9,
        maximumExecutionTime: 5000,
        maximumTestTime: 1000,
        minimumConsistency: 0.9,
        maximumFlakiness: 0.1,
        maximumRegressionPercentage: 20,
        memoryThreshold: 100
      },
      testDataDir,
      50 // Smaller history for testing
    );
  });

  afterEach(() => {
    // Clean up test data
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true, force: true });
    }
  });

  describe('Test Result Recording', () => {
    it('should record individual test results correctly', () => {
      const testResult: TestResult = {
        testName: 'sample test',
        testFile: 'sample.test.ts',
        status: 'passed',
        executionTime: 100,
        timestamp: Date.now(),
        memoryUsage: 5
      };

      monitor.recordTestResult(testResult);
      
      const history = monitor.getTestHistory();
      expect(history).toHaveLength(1);
      expect(history[0].testResults).toContain(testResult);
      expect(history[0].passedTests).toBe(1);
      expect(history[0].totalTests).toBe(1);
      expect(history[0].passRate).toBe(1);
    });

    it('should record test suite results correctly', () => {
      const suiteResult: TestSuiteResult = {
        suiteName: 'Test Suite',
        totalTests: 10,
        passedTests: 8,
        failedTests: 2,
        skippedTests: 0,
        pendingTests: 0,
        executionTime: 1000,
        passRate: 0.8,
        timestamp: Date.now(),
        testResults: []
      };

      monitor.recordTestSuite(suiteResult);
      
      const history = monitor.getTestHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(suiteResult);
    });

    it('should calculate pass rate automatically if not provided', () => {
      const suiteResult: TestSuiteResult = {
        suiteName: 'Test Suite',
        totalTests: 10,
        passedTests: 7,
        failedTests: 3,
        skippedTests: 0,
        pendingTests: 0,
        executionTime: 1000,
        passRate: 0, // Will be calculated
        timestamp: Date.now(),
        testResults: []
      };

      monitor.recordTestSuite(suiteResult);
      
      const history = monitor.getTestHistory();
      expect(history[0].passRate).toBe(0.7);
    });
  });

  describe('Health Metrics Calculation', () => {
    beforeEach(() => {
      // Add some test data for metrics calculation
      const testResults: TestResult[] = [
        {
          testName: 'test1',
          testFile: 'test1.ts',
          status: 'passed',
          executionTime: 100,
          timestamp: Date.now(),
          memoryUsage: 5
        },
        {
          testName: 'test2',
          testFile: 'test2.ts',
          status: 'failed',
          executionTime: 200,
          timestamp: Date.now(),
          memoryUsage: 8,
          error: 'Test failed'
        },
        {
          testName: 'test3',
          testFile: 'test3.ts',
          status: 'passed',
          executionTime: 150,
          timestamp: Date.now(),
          memoryUsage: 6
        }
      ];

      const suiteResult: TestSuiteResult = {
        suiteName: 'Test Suite',
        totalTests: 3,
        passedTests: 2,
        failedTests: 1,
        skippedTests: 0,
        pendingTests: 0,
        executionTime: 450,
        passRate: 2/3,
        timestamp: Date.now(),
        testResults
      };

      monitor.recordTestSuite(suiteResult);
    });

    it('should calculate overall pass rate correctly', () => {
      const metrics = monitor.getCurrentHealthMetrics();
      expect(metrics.overallPassRate).toBeCloseTo(2/3, 2);
    });

    it('should calculate average execution time correctly', () => {
      const metrics = monitor.getCurrentHealthMetrics();
      expect(metrics.averageExecutionTime).toBe(450);
    });

    it('should calculate total tests run correctly', () => {
      const metrics = monitor.getCurrentHealthMetrics();
      expect(metrics.totalTestsRun).toBe(3);
    });

    it('should calculate memory usage average correctly', () => {
      const metrics = monitor.getCurrentHealthMetrics();
      expect(metrics.memoryUsageAverage).toBeCloseTo((5 + 8 + 6) / 3, 2);
    });

    it('should identify error patterns correctly', () => {
      const metrics = monitor.getCurrentHealthMetrics();
      expect(metrics.errorPatterns).toHaveLength(1);
      expect(metrics.errorPatterns[0].pattern).toBe('Test failed');
      expect(metrics.errorPatterns[0].count).toBe(1);
    });
  });

  describe('Flaky Test Detection', () => {
    it('should identify flaky tests correctly', () => {
      // Add multiple runs of the same test with different outcomes
      const flakyTestResults = [
        { testName: 'flaky-test', status: 'passed' as const, executionTime: 100, timestamp: Date.now(), testFile: 'flaky.test.ts' },
        { testName: 'flaky-test', status: 'failed' as const, executionTime: 100, timestamp: Date.now(), testFile: 'flaky.test.ts', error: 'Random failure' },
        { testName: 'flaky-test', status: 'passed' as const, executionTime: 100, timestamp: Date.now(), testFile: 'flaky.test.ts' },
        { testName: 'flaky-test', status: 'failed' as const, executionTime: 100, timestamp: Date.now(), testFile: 'flaky.test.ts', error: 'Random failure' },
        { testName: 'stable-test', status: 'passed' as const, executionTime: 100, timestamp: Date.now(), testFile: 'stable.test.ts' },
        { testName: 'stable-test', status: 'passed' as const, executionTime: 100, timestamp: Date.now(), testFile: 'stable.test.ts' }
      ];

      flakyTestResults.forEach(result => monitor.recordTestResult(result));

      const metrics = monitor.getCurrentHealthMetrics();
      expect(metrics.flakyTests).toHaveLength(1);
      expect(metrics.flakyTests[0].testName).toBe('flaky-test');
      expect(metrics.flakyTests[0].passRate).toBe(0.5);
      expect(metrics.flakyTests[0].flakiness).toBeGreaterThan(0.3);
    });
  });

  describe('Slow Test Detection', () => {
    it('should identify slow tests correctly', () => {
      const slowTestResults = [
        { testName: 'slow-test', status: 'passed' as const, executionTime: 2000, timestamp: Date.now(), testFile: 'slow.test.ts' },
        { testName: 'slow-test', status: 'passed' as const, executionTime: 1800, timestamp: Date.now(), testFile: 'slow.test.ts' },
        { testName: 'fast-test', status: 'passed' as const, executionTime: 50, timestamp: Date.now(), testFile: 'fast.test.ts' }
      ];

      slowTestResults.forEach(result => monitor.recordTestResult(result));

      const metrics = monitor.getCurrentHealthMetrics();
      expect(metrics.slowTests).toHaveLength(1);
      expect(metrics.slowTests[0].testName).toBe('slow-test');
      expect(metrics.slowTests[0].averageTime).toBe(1900);
    });
  });

  describe('Health Report Generation', () => {
    beforeEach(() => {
      // Add test data that will trigger various health issues
      const problematicSuite: TestSuiteResult = {
        suiteName: 'Problematic Suite',
        totalTests: 10,
        passedTests: 7, // 70% pass rate (below 90% threshold)
        failedTests: 3,
        skippedTests: 0,
        pendingTests: 0,
        executionTime: 8000, // Above 5000ms threshold
        passRate: 0.7,
        timestamp: Date.now(),
        testResults: [
          { testName: 'slow-test', status: 'passed', executionTime: 2000, timestamp: Date.now(), testFile: 'slow.test.ts' },
          { testName: 'failing-test', status: 'failed', executionTime: 100, timestamp: Date.now(), testFile: 'failing.test.ts', error: 'Assertion failed' }
        ]
      };

      monitor.recordTestSuite(problematicSuite);
    });

    it('should generate health report with correct status', () => {
      const report = monitor.generateHealthReport();
      
      expect(report.status).toBe('critical'); // Should be critical due to very low pass rate (70%)
      expect(report.metrics.overallPassRate).toBeCloseTo(0.5, 1); // 1 failed out of 2 test results
      expect(report.ciStatus.shouldPass).toBe(false); // Should not pass CI
    });

    it('should identify pass rate issues', () => {
      const report = monitor.generateHealthReport();
      
      const passRateIssue = report.issues.find(issue => 
        issue.category === 'reliability' && issue.message.includes('Pass rate')
      );
      
      expect(passRateIssue).toBeDefined();
      expect(passRateIssue?.severity).toBe('critical');
    });

    it('should identify performance issues', () => {
      const report = monitor.generateHealthReport();
      
      const performanceIssue = report.issues.find(issue => 
        issue.category === 'performance' && issue.message.includes('execution time')
      );
      
      expect(performanceIssue).toBeDefined();
    });

    it('should provide recommendations', () => {
      const report = monitor.generateHealthReport();
      
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(rec => rec.includes('slow tests'))).toBe(true);
    });

    it('should determine CI status correctly', () => {
      const report = monitor.generateHealthReport();
      
      expect(report.ciStatus.shouldPass).toBe(false);
      expect(report.ciStatus.blockingIssues.length).toBeGreaterThan(0);
    });
  });

  describe('CI Integration', () => {
    it('should pass CI when all metrics are healthy', () => {
      const healthySuite: TestSuiteResult = {
        suiteName: 'Healthy Suite',
        totalTests: 10,
        passedTests: 10, // 100% pass rate
        failedTests: 0,
        skippedTests: 0,
        pendingTests: 0,
        executionTime: 2000, // Under threshold
        passRate: 1.0,
        timestamp: Date.now(),
        testResults: []
      };

      monitor.recordTestSuite(healthySuite);
      
      // Add multiple healthy suites to establish consistency
      for (let i = 0; i < 5; i++) {
        const additionalSuite: TestSuiteResult = {
          ...healthySuite,
          suiteName: `Healthy Suite ${i}`,
          timestamp: Date.now() + i * 1000,
          testResults: [
            {
              testName: `healthy-test-${i}`,
              testFile: `healthy-${i}.test.ts`,
              status: 'passed',
              executionTime: 100,
              timestamp: Date.now() + i * 1000
            }
          ]
        };
        monitor.recordTestSuite(additionalSuite);
      }
      
      expect(monitor.shouldPassCI()).toBe(true);
      
      const report = monitor.generateHealthReport();
      expect(report.status).toBe('healthy');
      expect(report.ciStatus.shouldPass).toBe(true);
      expect(report.ciStatus.blockingIssues).toHaveLength(0);
    });

    it('should fail CI when pass rate is too low', () => {
      const unhealthySuite: TestSuiteResult = {
        suiteName: 'Unhealthy Suite',
        totalTests: 10,
        passedTests: 5, // 50% pass rate (well below threshold)
        failedTests: 5,
        skippedTests: 0,
        pendingTests: 0,
        executionTime: 1000,
        passRate: 0.5,
        timestamp: Date.now(),
        testResults: []
      };

      monitor.recordTestSuite(unhealthySuite);
      
      expect(monitor.shouldPassCI()).toBe(false);
      
      const report = monitor.generateHealthReport();
      expect(report.ciStatus.shouldPass).toBe(false);
      expect(report.ciStatus.blockingIssues.length).toBeGreaterThan(0);
    });
  });

  describe('Data Persistence', () => {
    it('should persist and load health data from disk', async () => {
      const testResult: TestResult = {
        testName: 'persistent test',
        testFile: 'persistent.test.ts',
        status: 'passed',
        executionTime: 100,
        timestamp: Date.now()
      };

      monitor.recordTestResult(testResult);
      
      // Force save to disk
      const testSuite: TestSuiteResult = {
        suiteName: 'Persistence Test Suite',
        totalTests: 1,
        passedTests: 1,
        failedTests: 0,
        skippedTests: 0,
        pendingTests: 0,
        executionTime: 100,
        passRate: 1,
        timestamp: Date.now(),
        testResults: [testResult]
      };
      monitor.recordTestSuite(testSuite);
      
      // Wait a bit for file system operations
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Create new monitor instance (should load from disk)
      const newMonitor = new TestHealthMonitor(undefined, testDataDir);
      const history = newMonitor.getTestHistory();
      
      expect(history.length).toBeGreaterThanOrEqual(1);
      const foundSuite = history.find(suite => 
        suite.testResults.some(test => test.testName === 'persistent test')
      );
      expect(foundSuite).toBeDefined();
      expect(foundSuite!.testResults[0].testName).toBe('persistent test');
    });

    it('should handle missing data files gracefully', () => {
      const nonExistentDir = join(__dirname, 'non-existent-dir');
      
      expect(() => {
        new TestHealthMonitor(undefined, nonExistentDir);
      }).not.toThrow();
    });
  });

  describe('Data Export', () => {
    it('should export health data correctly', () => {
      const testResult: TestResult = {
        testName: 'export test',
        testFile: 'export.test.ts',
        status: 'passed',
        executionTime: 100,
        timestamp: Date.now()
      };

      monitor.recordTestResult(testResult);
      
      const exportData = monitor.exportHealthData();
      
      expect(exportData.testHistory).toHaveLength(1);
      expect(exportData.healthHistory).toHaveLength(1);
      expect(exportData.currentReport).toBeDefined();
      expect(exportData.exportedAt).toBeGreaterThan(0);
    });
  });

  describe('History Management', () => {
    it('should maintain history size limit', () => {
      // Create monitor with small history limit
      const smallMonitor = new TestHealthMonitor(undefined, testDataDir, 3);
      
      // Add more suites than the limit
      for (let i = 0; i < 5; i++) {
        const suite: TestSuiteResult = {
          suiteName: `Suite ${i}`,
          totalTests: 1,
          passedTests: 1,
          failedTests: 0,
          skippedTests: 0,
          pendingTests: 0,
          executionTime: 100,
          passRate: 1,
          timestamp: Date.now() + i,
          testResults: []
        };
        
        smallMonitor.recordTestSuite(suite);
      }
      
      const history = smallMonitor.getTestHistory();
      expect(history).toHaveLength(3); // Should be limited to 3
      expect(history[0].suiteName).toBe('Suite 2'); // Should keep the most recent
    });

    it('should clear health data correctly', () => {
      monitor.recordTestResult({
        testName: 'test',
        testFile: 'test.ts',
        status: 'passed',
        executionTime: 100,
        timestamp: Date.now()
      });
      
      expect(monitor.getTestHistory()).toHaveLength(1);
      
      monitor.clearHealthData();
      
      expect(monitor.getTestHistory()).toHaveLength(0);
      expect(monitor.getHealthHistory()).toHaveLength(0);
    });
  });
});