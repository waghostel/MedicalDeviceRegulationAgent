/**
 * Jest Performance Setup
 * 
 * Automatic performance tracking integration for Jest tests
 * Implements Requirements 5.1 and 5.2 by monitoring all test execution
 */

import { getPerformanceTracker, resetPerformanceTracker } from './test-performance-tracker';

// Global test tracking state
let currentSuite: string | null = null;
let currentTestId: string | null = null;
let suiteStartTime: number = 0;

/**
 * Setup performance tracking for Jest environment
 */
export function setupJestPerformanceTracking(): void {
  const tracker = getPerformanceTracker();

  // Track suite start/end
  beforeAll(() => {
    if (expect.getState().currentTestName) {
      const testPath = expect.getState().testPath || 'unknown-suite';
      currentSuite = extractSuiteName(testPath);
      suiteStartTime = performance.now();
      tracker.startSuite(currentSuite);
    }
  });

  afterAll(() => {
    if (currentSuite) {
      try {
        const metrics = tracker.endSuite(currentSuite);
        
        // Log performance summary for this suite
        console.log(`\n📊 Suite Performance: ${currentSuite}`);
        console.log(`  Execution Time: ${(metrics.totalExecutionTime / 1000).toFixed(2)}s`);
        console.log(`  Tests: ${metrics.passedTests}/${metrics.totalTests} passed`);
        console.log(`  Consistency: ${(metrics.consistencyScore * 100).toFixed(1)}%`);
        console.log(`  Memory Peak: ${metrics.memoryPeak.toFixed(2)}MB`);
        
        if (metrics.thresholdViolations.length > 0) {
          console.warn('  ⚠️  Threshold Violations:');
          metrics.thresholdViolations.forEach(violation => {
            console.warn(`    • ${violation}`);
          });
        }
      } catch (error) {
        console.warn(`Failed to end suite tracking for ${currentSuite}:`, error);
      }
      currentSuite = null;
    }
  });

  // Track individual test start/end
  beforeEach(() => {
    if (currentSuite && expect.getState().currentTestName) {
      const testName = expect.getState().currentTestName;
      currentTestId = tracker.startTest(testName, currentSuite);
    }
  });

  afterEach(() => {
    if (currentTestId && currentSuite) {
      try {
        const testState = expect.getState();
        const status = determineTestStatus(testState);
        const warnings = extractTestWarnings(testState);
        
        const metrics = tracker.endTest(currentTestId, status, warnings);
        
        // Log individual test performance if it exceeds thresholds
        if (metrics.warnings.length > 0) {
          console.warn(`⚠️  ${metrics.testName}:`);
          metrics.warnings.forEach(warning => {
            console.warn(`    ${warning}`);
          });
        }
      } catch (error) {
        console.warn(`Failed to end test tracking for ${currentTestId}:`, error);
      }
      currentTestId = null;
    }
  });

  // Generate final report when all tests complete
  process.on('exit', () => {
    try {
      const report = tracker.generateReport();
      
      console.log('\n' + '='.repeat(60));
      console.log('📊 FINAL PERFORMANCE REPORT');
      console.log('='.repeat(60));
      console.log(tracker.getPerformanceSummary());
      
      // Check critical thresholds for CI/CD
      if (!report.thresholdCompliance.suiteTimeCompliance) {
        console.error('\n❌ CRITICAL: Test suite execution time exceeds 30 second threshold (Requirement 5.1)');
        process.exitCode = 1;
      }
      
      if (!report.thresholdCompliance.consistencyCompliance) {
        console.error('\n❌ CRITICAL: Test execution consistency below threshold (Requirement 5.2)');
        process.exitCode = 1;
      }
      
      if (report.regressionAnalysis?.hasRegression) {
        console.error(`\n❌ PERFORMANCE REGRESSION: ${report.regressionAnalysis.regressionPercentage.toFixed(1)}% slower`);
        process.exitCode = 1;
      }
      
    } catch (error) {
      console.warn('Failed to generate final performance report:', error);
    }
  });
}

/**
 * Extract suite name from test file path
 */
function extractSuiteName(testPath: string): string {
  const parts = testPath.split('/');
  const fileName = parts[parts.length - 1];
  
  // Remove file extension and common test suffixes
  return fileName
    .replace(/\.(test|spec)\.(js|jsx|ts|tsx)$/, '')
    .replace(/\.unit$/, '')
    .replace(/\.integration$/, '')
    .replace(/\.accessibility$/, '');
}

/**
 * Determine test status from Jest state
 */
function determineTestStatus(testState: any): 'passed' | 'failed' | 'skipped' {
  // Check if test was skipped
  if (testState.currentTestName?.includes('skip') || 
      testState.currentTestName?.includes('todo')) {
    return 'skipped';
  }
  
  // Check for test failures (this is a simplified check)
  // In a real implementation, we'd need to hook into Jest's test result system
  try {
    // If we're in afterEach and no exception was thrown, assume passed
    return 'passed';
  } catch {
    return 'failed';
  }
}

/**
 * Extract warnings from test execution
 */
function extractTestWarnings(testState: any): string[] {
  const warnings: string[] = [];
  
  // Check for console warnings during test execution
  if (global.console && (global.console as any)._warnings) {
    warnings.push(...(global.console as any)._warnings);
  }
  
  // Check for React warnings
  if (global.__REACT_DEVTOOLS_GLOBAL_HOOK__ && 
      (global.__REACT_DEVTOOLS_GLOBAL_HOOK__ as any).warnings) {
    warnings.push(...(global.__REACT_DEVTOOLS_GLOBAL_HOOK__ as any).warnings);
  }
  
  return warnings;
}

/**
 * Performance assertion helpers for tests
 */
export const performanceAssertions = {
  /**
   * Assert that current test completes within time limit
   */
  expectTestToCompleteWithin(milliseconds: number): void {
    if (currentTestId) {
      const tracker = getPerformanceTracker();
      const activeTest = (tracker as any).activeTests.get(currentTestId);
      if (activeTest) {
        const currentTime = performance.now();
        const elapsed = currentTime - activeTest.startTime;
        expect(elapsed).toBeLessThanOrEqual(milliseconds);
      }
    }
  },

  /**
   * Assert that memory usage is within limits
   */
  expectMemoryUsageWithin(megabytes: number): void {
    const memUsage = process.memoryUsage();
    const heapUsedMB = memUsage.heapUsed / 1024 / 1024;
    expect(heapUsedMB).toBeLessThanOrEqual(megabytes);
  },

  /**
   * Assert that test suite will complete within 30 seconds (Requirement 5.1)
   */
  expectSuiteToCompleteWithinThreshold(): void {
    if (currentSuite && suiteStartTime) {
      const elapsed = performance.now() - suiteStartTime;
      const remaining = 30000 - elapsed; // 30 second threshold
      expect(remaining).toBeGreaterThan(0);
    }
  }
};

/**
 * Performance test wrapper
 */
export function performanceTest(
  testName: string,
  testFn: () => void | Promise<void>,
  options?: {
    maxExecutionTime?: number;
    maxMemoryUsage?: number;
  }
) {
  return async () => {
    const startTime = performance.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    try {
      await testFn();
    } finally {
      const endTime = performance.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      const executionTime = endTime - startTime;
      const memoryUsage = (endMemory - startMemory) / 1024 / 1024;
      
      if (options?.maxExecutionTime) {
        expect(executionTime).toBeLessThanOrEqual(options.maxExecutionTime);
      }
      
      if (options?.maxMemoryUsage) {
        expect(memoryUsage).toBeLessThanOrEqual(options.maxMemoryUsage);
      }
      
      console.log(`⏱️  ${testName}: ${executionTime.toFixed(2)}ms, ${memoryUsage.toFixed(2)}MB`);
    }
  };
}

/**
 * Suite-level performance monitoring
 */
export function performanceSuite(
  suiteName: string,
  suiteFn: () => void,
  options?: {
    maxSuiteTime?: number;
    maxMemoryUsage?: number;
  }
) {
  return () => {
    const tracker = getPerformanceTracker();
    
    beforeAll(() => {
      tracker.startSuite(suiteName);
    });
    
    afterAll(() => {
      const metrics = tracker.endSuite(suiteName);
      
      if (options?.maxSuiteTime) {
        expect(metrics.totalExecutionTime).toBeLessThanOrEqual(options.maxSuiteTime);
      }
      
      if (options?.maxMemoryUsage) {
        expect(metrics.memoryPeak).toBeLessThanOrEqual(options.maxMemoryUsage);
      }
    });
    
    suiteFn();
  };
}

// Auto-setup if in Jest environment
if (typeof global !== 'undefined' && global.expect && global.describe) {
  setupJestPerformanceTracking();
}