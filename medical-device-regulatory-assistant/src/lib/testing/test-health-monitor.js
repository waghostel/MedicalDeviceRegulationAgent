/**
 * Test Health Monitor (JavaScript version for Jest compatibility)
 *
 * Comprehensive test health monitoring system that tracks pass rates, execution times,
 * and provides automated health reporting for CI/CD pipelines and development workflows.
 *
 * Requirements: 5.2 (consistent test results), 8.1 (CI environment success >90% pass rate)
 */

const { performance } = require('perf_hooks');
const { writeFileSync, readFileSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');

class TestHealthMonitor {
  constructor(
    thresholds = {},
    dataDirectory = './test-health-data',
    maxHistorySize = 100
  ) {
    this.thresholds = {
      minimumPassRate: 0.95,
      maximumExecutionTime: 30000,
      maximumTestTime: 5000,
      minimumConsistency: 0.95,
      maximumFlakiness: 0.05,
      maximumRegressionPercentage: 20,
      memoryThreshold: 512,
      ...thresholds,
    };

    this.dataDirectory = dataDirectory;
    this.maxHistorySize = maxHistorySize;
    this.testHistory = [];
    this.healthHistory = [];

    // Ensure data directory exists
    if (!existsSync(this.dataDirectory)) {
      mkdirSync(this.dataDirectory, { recursive: true });
    }

    // Load existing data
    this.loadHistoryFromDisk();
  }

  recordTestSuite(suiteResult) {
    // Add timestamp if not provided
    if (!suiteResult.timestamp) {
      suiteResult.timestamp = Date.now();
    }

    // Calculate pass rate if not provided
    if (!suiteResult.passRate) {
      suiteResult.passRate =
        suiteResult.totalTests > 0
          ? suiteResult.passedTests / suiteResult.totalTests
          : 0;
    }

    this.testHistory.push(suiteResult);

    // Maintain history size limit
    if (this.testHistory.length > this.maxHistorySize) {
      this.testHistory = this.testHistory.slice(-this.maxHistorySize);
    }

    // Update health metrics
    this.updateHealthMetrics();

    // Persist to disk
    this.saveHistoryToDisk();
  }

  recordTestResult(testResult) {
    // Find or create current test suite
    let currentSuite = this.testHistory[this.testHistory.length - 1];

    if (!currentSuite || currentSuite.timestamp < Date.now() - 60000) {
      // 1 minute threshold
      currentSuite = {
        suiteName: 'Current Suite',
        totalTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        pendingTests: 0,
        executionTime: 0,
        passRate: 0,
        timestamp: Date.now(),
        testResults: [],
      };
      this.testHistory.push(currentSuite);
    }

    // Add test result to current suite
    currentSuite.testResults.push(testResult);

    // Update suite metrics
    currentSuite.totalTests++;
    currentSuite.executionTime += testResult.executionTime;

    switch (testResult.status) {
      case 'passed':
        currentSuite.passedTests++;
        break;
      case 'failed':
        currentSuite.failedTests++;
        break;
      case 'skipped':
        currentSuite.skippedTests++;
        break;
      case 'pending':
        currentSuite.pendingTests++;
        break;
    }

    currentSuite.passRate =
      currentSuite.totalTests > 0
        ? currentSuite.passedTests / currentSuite.totalTests
        : 0;

    // Update health metrics
    this.updateHealthMetrics();
  }

  generateHealthReport() {
    const metrics = this.getCurrentHealthMetrics();
    const issues = [];
    const recommendations = [];
    const blockingIssues = [];
    const warnings = [];

    // Check pass rate
    if (metrics.overallPassRate < this.thresholds.minimumPassRate) {
      const severity = metrics.overallPassRate < 0.8 ? 'critical' : 'high';
      issues.push({
        severity,
        category: 'reliability',
        message: `Pass rate ${(metrics.overallPassRate * 100).toFixed(1)}% is below threshold ${(this.thresholds.minimumPassRate * 100).toFixed(1)}%`,
        recommendation:
          'Review failing tests and fix underlying issues before deployment',
        affectedTests: this.getFailingTests(),
      });

      if (severity === 'critical') {
        blockingIssues.push(
          `Critical pass rate: ${(metrics.overallPassRate * 100).toFixed(1)}%`
        );
      } else {
        warnings.push(
          `Low pass rate: ${(metrics.overallPassRate * 100).toFixed(1)}%`
        );
      }
    }

    // Check execution time
    if (metrics.averageExecutionTime > this.thresholds.maximumExecutionTime) {
      const severity =
        metrics.averageExecutionTime >
        this.thresholds.maximumExecutionTime * 1.5
          ? 'high'
          : 'medium';
      issues.push({
        severity,
        category: 'performance',
        message: `Average execution time ${metrics.averageExecutionTime.toFixed(0)}ms exceeds threshold ${this.thresholds.maximumExecutionTime}ms`,
        recommendation: 'Optimize slow tests or increase parallel execution',
        affectedTests: metrics.slowTests.map((t) => t.testName),
      });

      warnings.push(
        `Slow test execution: ${metrics.averageExecutionTime.toFixed(0)}ms`
      );
    }

    // Check consistency
    if (metrics.consistencyScore < this.thresholds.minimumConsistency) {
      const severity = metrics.consistencyScore < 0.8 ? 'high' : 'medium';
      issues.push({
        severity,
        category: 'consistency',
        message: `Consistency score ${(metrics.consistencyScore * 100).toFixed(1)}% is below threshold ${(this.thresholds.minimumConsistency * 100).toFixed(1)}%`,
        recommendation: 'Investigate flaky tests and improve test stability',
        affectedTests: metrics.flakyTests.map((t) => t.testName),
      });

      if (severity === 'high') {
        blockingIssues.push(
          `Poor test consistency: ${(metrics.consistencyScore * 100).toFixed(1)}%`
        );
      } else {
        warnings.push(
          `Inconsistent test results: ${(metrics.consistencyScore * 100).toFixed(1)}%`
        );
      }
    }

    // Generate recommendations
    if (metrics.slowTests.length > 0) {
      recommendations.push(
        `Optimize ${metrics.slowTests.length} slow tests that exceed ${this.thresholds.maximumTestTime}ms`
      );
    }

    if (metrics.flakyTests.length > 0) {
      recommendations.push(
        `Fix ${metrics.flakyTests.length} flaky tests to improve reliability`
      );
    }

    // Determine overall status
    const criticalIssues = issues.filter(
      (i) => i.severity === 'critical'
    ).length;
    const highIssues = issues.filter((i) => i.severity === 'high').length;

    let status;
    if (criticalIssues > 0) {
      status = 'critical';
    } else if (highIssues > 0 || blockingIssues.length > 0) {
      status = 'warning';
    } else {
      status = 'healthy';
    }

    // CI status determination
    const shouldPass =
      blockingIssues.length === 0 &&
      metrics.overallPassRate >= this.thresholds.minimumPassRate &&
      metrics.consistencyScore >= this.thresholds.minimumConsistency;

    return {
      status,
      metrics,
      thresholds: this.thresholds,
      issues,
      recommendations,
      ciStatus: {
        shouldPass,
        blockingIssues,
        warnings,
      },
      generatedAt: Date.now(),
    };
  }

  getCurrentHealthMetrics() {
    if (this.healthHistory.length === 0) {
      this.updateHealthMetrics();
    }

    return (
      this.healthHistory[this.healthHistory.length - 1] ||
      this.createEmptyMetrics()
    );
  }

  getHealthHistory(limit) {
    if (limit) {
      return this.healthHistory.slice(-limit);
    }
    return [...this.healthHistory];
  }

  getTestHistory(limit) {
    if (limit) {
      return this.testHistory.slice(-limit);
    }
    return [...this.testHistory];
  }

  shouldPassCI() {
    const report = this.generateHealthReport();
    return report.ciStatus.shouldPass;
  }

  exportHealthData() {
    return {
      testHistory: this.testHistory,
      healthHistory: this.healthHistory,
      currentReport: this.generateHealthReport(),
      exportedAt: Date.now(),
    };
  }

  clearHealthData() {
    this.testHistory = [];
    this.healthHistory = [];
    this.saveHistoryToDisk();
  }

  updateHealthMetrics() {
    if (this.testHistory.length === 0) {
      return;
    }

    const recentSuites = this.testHistory.slice(-10); // Last 10 test runs
    const allTests = recentSuites.flatMap((suite) => suite.testResults);

    // Calculate overall pass rate
    const totalTests = allTests.length;
    const passedTests = allTests.filter((t) => t.status === 'passed').length;
    const overallPassRate = totalTests > 0 ? passedTests / totalTests : 0;

    // Calculate average execution time
    const averageExecutionTime =
      recentSuites.length > 0
        ? recentSuites.reduce((sum, suite) => sum + suite.executionTime, 0) /
          recentSuites.length
        : 0;

    // Calculate consistency score (variance in pass rates)
    const passRates = recentSuites.map((suite) => suite.passRate);
    const passRateVariance = this.calculateVariance(passRates);
    const consistencyScore = Math.max(0, 1 - passRateVariance * 10); // Scale variance to 0-1

    // Calculate flakiness (tests that sometimes pass, sometimes fail)
    const flakyTests = this.identifyFlakyTests(allTests);
    const flakiness =
      flakyTests.length / Math.max(1, this.getUniqueTestCount(allTests));

    // Calculate performance regression
    const performanceRegression = this.calculatePerformanceRegression();

    // Calculate memory usage
    const memoryUsages = allTests
      .filter((t) => t.memoryUsage !== undefined)
      .map((t) => t.memoryUsage);
    const memoryUsageAverage =
      memoryUsages.length > 0
        ? memoryUsages.reduce((sum, usage) => sum + usage, 0) /
          memoryUsages.length
        : 0;

    // Identify error patterns
    const errorPatterns = this.identifyErrorPatterns(allTests);

    // Identify slow tests
    const slowTests = this.identifySlowTests(allTests);

    const metrics = {
      overallPassRate,
      averageExecutionTime,
      totalTestsRun: totalTests,
      consistencyScore,
      flakiness,
      performanceRegression,
      memoryUsageAverage,
      errorPatterns,
      slowTests,
      flakyTests,
      timestamp: Date.now(),
    };

    this.healthHistory.push(metrics);

    // Maintain history size limit
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory = this.healthHistory.slice(-this.maxHistorySize);
    }
  }

  createEmptyMetrics() {
    return {
      overallPassRate: 0,
      averageExecutionTime: 0,
      totalTestsRun: 0,
      consistencyScore: 1,
      flakiness: 0,
      performanceRegression: 0,
      memoryUsageAverage: 0,
      errorPatterns: [],
      slowTests: [],
      flakyTests: [],
      timestamp: Date.now(),
    };
  }

  calculateVariance(values) {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map((val) => (val - mean)**2);
    return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
  }

  identifyFlakyTests(tests) {
    const testGroups = this.groupTestsByName(tests);
    const flakyTests = [];

    for (const [testName, testResults] of testGroups.entries()) {
      if (testResults.length < 2) continue; // Need multiple runs to detect flakiness

      const passCount = testResults.filter((t) => t.status === 'passed').length;
      const failCount = testResults.filter((t) => t.status === 'failed').length;
      const totalRuns = passCount + failCount;

      if (totalRuns === 0) continue;

      const passRate = passCount / totalRuns;

      // A test is flaky if it sometimes passes and sometimes fails
      if (passCount > 0 && failCount > 0) {
        // Flakiness is higher when pass rate is closer to 50%
        const flakiness = 1 - Math.abs(passRate - 0.5) * 2;

        if (flakiness > 0.3) {
          // Only report significantly flaky tests
          flakyTests.push({
            testName,
            flakiness,
            passRate,
          });
        }
      }
    }

    return flakyTests.sort((a, b) => b.flakiness - a.flakiness);
  }

  calculatePerformanceRegression() {
    if (this.testHistory.length < 10) return 0;

    const recent = this.testHistory.slice(-5);
    const baseline = this.testHistory.slice(-15, -10);

    if (baseline.length === 0 || recent.length === 0) return 0;

    const recentAvg =
      recent.reduce((sum, suite) => sum + suite.executionTime, 0) /
      recent.length;
    const baselineAvg =
      baseline.reduce((sum, suite) => sum + suite.executionTime, 0) /
      baseline.length;

    return baselineAvg > 0
      ? ((recentAvg - baselineAvg) / baselineAvg) * 100
      : 0;
  }

  identifyErrorPatterns(tests) {
    const errorCounts = new Map();
    const failedTests = tests.filter((t) => t.status === 'failed' && t.error);

    failedTests.forEach((test) => {
      if (test.error) {
        // Extract error pattern (first line of error message)
        const pattern = test.error.split('\n')[0].trim();
        errorCounts.set(pattern, (errorCounts.get(pattern) || 0) + 1);
      }
    });

    const totalErrors = failedTests.length;
    const patterns = Array.from(errorCounts.entries())
      .map(([pattern, count]) => ({
        pattern,
        count,
        percentage: totalErrors > 0 ? (count / totalErrors) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 error patterns

    return patterns;
  }

  identifySlowTests(tests) {
    const testGroups = this.groupTestsByName(tests);
    const slowTests = [];

    for (const [testName, testResults] of testGroups.entries()) {
      const averageTime =
        testResults.reduce((sum, t) => sum + t.executionTime, 0) /
        testResults.length;

      if (averageTime > this.thresholds.maximumTestTime) {
        slowTests.push({
          testName,
          averageTime,
          threshold: this.thresholds.maximumTestTime,
        });
      }
    }

    return slowTests.sort((a, b) => b.averageTime - a.averageTime);
  }

  groupTestsByName(tests) {
    const groups = new Map();

    tests.forEach((test) => {
      const existing = groups.get(test.testName) || [];
      existing.push(test);
      groups.set(test.testName, existing);
    });

    return groups;
  }

  getUniqueTestCount(tests) {
    const uniqueNames = new Set(tests.map((t) => t.testName));
    return uniqueNames.size;
  }

  getFailingTests() {
    const recentSuites = this.testHistory.slice(-5);
    const failedTests = recentSuites
      .flatMap((suite) => suite.testResults)
      .filter((test) => test.status === 'failed')
      .map((test) => test.testName);

    return [...new Set(failedTests)]; // Remove duplicates
  }

  saveHistoryToDisk() {
    try {
      const data = {
        testHistory: this.testHistory,
        healthHistory: this.healthHistory,
        lastUpdated: Date.now(),
      };

      const filePath = join(this.dataDirectory, 'test-health-data.json');
      writeFileSync(filePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn('Failed to save test health data to disk:', error);
    }
  }

  loadHistoryFromDisk() {
    try {
      const filePath = join(this.dataDirectory, 'test-health-data.json');

      if (existsSync(filePath)) {
        const data = JSON.parse(readFileSync(filePath, 'utf-8'));
        this.testHistory = data.testHistory || [];
        this.healthHistory = data.healthHistory || [];
      }
    } catch (error) {
      console.warn('Failed to load test health data from disk:', error);
      this.testHistory = [];
      this.healthHistory = [];
    }
  }
}

// Global test health monitor instance
let globalHealthMonitor = null;

function getTestHealthMonitor() {
  if (!globalHealthMonitor) {
    globalHealthMonitor = new TestHealthMonitor();
  }
  return globalHealthMonitor;
}

function resetTestHealthMonitor() {
  globalHealthMonitor = null;
}

// Jest integration utilities
function createHealthReporter() {
  const monitor = getTestHealthMonitor();

  return {
    onTestResult: (test, testResult) => {
      const result = {
        testName: test.path,
        testFile: test.path,
        status: testResult.numFailingTests > 0 ? 'failed' : 'passed',
        executionTime: testResult.perfStats.end - testResult.perfStats.start,
        timestamp: Date.now(),
        error: testResult.failureMessage || undefined,
      };

      monitor.recordTestResult(result);
    },

    onRunComplete: (contexts, results) => {
      const suiteResult = {
        suiteName: 'Jest Test Suite',
        totalTests: results.numTotalTests,
        passedTests: results.numPassedTests,
        failedTests: results.numFailedTests,
        skippedTests: results.numPendingTests,
        pendingTests: results.numTodoTests,
        executionTime: results.testResults.reduce(
          (sum, result) =>
            sum + (result.perfStats.end - result.perfStats.start),
          0
        ),
        passRate:
          results.numTotalTests > 0
            ? results.numPassedTests / results.numTotalTests
            : 0,
        timestamp: Date.now(),
        testResults: [],
      };

      monitor.recordTestSuite(suiteResult);

      // Generate and log health report
      const healthReport = monitor.generateHealthReport();
      console.log('\n📊 Test Health Report:');
      console.log(`Status: ${healthReport.status.toUpperCase()}`);
      console.log(
        `Pass Rate: ${(healthReport.metrics.overallPassRate * 100).toFixed(1)}%`
      );
      console.log(
        `Consistency: ${(healthReport.metrics.consistencyScore * 100).toFixed(1)}%`
      );
      console.log(
        `CI Status: ${healthReport.ciStatus.shouldPass ? '✅ PASS' : '❌ FAIL'}`
      );

      if (healthReport.ciStatus.blockingIssues.length > 0) {
        console.log('\n🚫 Blocking Issues:');
        healthReport.ciStatus.blockingIssues.forEach((issue) => {
          console.log(`  - ${issue}`);
        });
      }

      if (healthReport.ciStatus.warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        healthReport.ciStatus.warnings.forEach((warning) => {
          console.log(`  - ${warning}`);
        });
      }
    },
  };
}

module.exports = {
  TestHealthMonitor,
  getTestHealthMonitor,
  resetTestHealthMonitor,
  createHealthReporter,
};
