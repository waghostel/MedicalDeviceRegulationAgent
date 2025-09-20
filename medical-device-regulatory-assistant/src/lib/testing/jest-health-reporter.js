/**
 * Jest Health Reporter
 *
 * Custom Jest reporter that integrates with the TestHealthMonitor to collect
 * metrics for pass rates, execution times, and automated health reporting.
 *
 * Requirements: 5.2 (consistent test results), 8.1 (CI environment success >90% pass rate)
 */

const { getTestHealthMonitor } = require('./test-health-monitor.js');
const { writeFileSync, existsSync, mkdirSync } = require('fs');
const { join } = require('path');

class JestHealthReporter {
  constructor(globalConfig, options) {
    this.globalConfig = globalConfig;
    this.options = options || {};
    this.healthMonitor = getTestHealthMonitor();
    this.testResults = [];
    this.suiteStartTime = Date.now();

    // Resolve output directory with proper path handling
    let outputDir = this.options.outputDir || 'test-reports';

    // Get the root directory from Jest config or use current working directory
    const rootDir = globalConfig.rootDir || process.cwd();

    // Ensure we have an absolute path for cross-platform compatibility
    // If outputDir is relative, resolve it relative to the root directory
    if (!require('path').isAbsolute(outputDir)) {
      this.reportsDir = require('path').resolve(rootDir, outputDir);
    } else {
      this.reportsDir = outputDir;
    }
    if (!existsSync(this.reportsDir)) {
      mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  onRunStart(aggregatedResult, options) {
    this.suiteStartTime = Date.now();
    this.testResults = [];
    console.log('🏥 Test Health Monitor: Starting test suite monitoring...');
  }

  onTestResult(test, testResult, aggregatedResult) {
    // Record individual test results
    testResult.testResults.forEach((result) => {
      const testRecord = {
        testName: `${test.path}::${result.fullName}`,
        testFile: test.path,
        status: this.mapJestStatusToHealthStatus(result.status),
        executionTime: result.duration || 0,
        error:
          result.failureMessages.length > 0
            ? result.failureMessages.join('\n')
            : undefined,
        timestamp: Date.now(),
        retryCount: result.invocations || 0,
        memoryUsage: this.estimateMemoryUsage(result),
        warnings: this.extractWarnings(result),
      };

      this.testResults.push(testRecord);
      this.healthMonitor.recordTestResult(testRecord);
    });
  }

  onRunComplete(contexts, results) {
    const suiteEndTime = Date.now();
    const totalExecutionTime = suiteEndTime - this.suiteStartTime;

    // Record test suite results
    const suiteResult = {
      suiteName: 'Jest Test Suite',
      totalTests: results.numTotalTests,
      passedTests: results.numPassedTests,
      failedTests: results.numFailedTests,
      skippedTests: results.numPendingTests,
      pendingTests: results.numTodoTests,
      executionTime: totalExecutionTime,
      passRate:
        results.numTotalTests > 0
          ? results.numPassedTests / results.numTotalTests
          : 0,
      timestamp: this.suiteStartTime,
      testResults: this.testResults,
    };

    this.healthMonitor.recordTestSuite(suiteResult);

    // Generate comprehensive health report
    const healthReport = this.healthMonitor.generateHealthReport();

    // Log health summary to console
    this.logHealthSummary(healthReport);

    // Save detailed health report to file
    this.saveHealthReport(healthReport);

    // Save health data export
    this.saveHealthData();

    // Check CI status and exit with appropriate code if configured
    if (this.options.failOnHealthIssues && !healthReport.ciStatus.shouldPass) {
      console.error('\n❌ Test health check failed - CI should not pass');
      process.exitCode = 1;
    }
  }

  mapJestStatusToHealthStatus(jestStatus) {
    switch (jestStatus) {
      case 'passed':
        return 'passed';
      case 'failed':
        return 'failed';
      case 'skipped':
        return 'skipped';
      case 'pending':
        return 'pending';
      case 'todo':
        return 'pending';
      default:
        return 'failed';
    }
  }

  estimateMemoryUsage(testResult) {
    // Estimate memory usage based on test duration and complexity
    // This is a rough estimate since Jest doesn't provide per-test memory metrics
    const baseLine = 1; // 1MB baseline
    const durationFactor = (testResult.duration || 0) / 1000; // Convert ms to seconds
    const complexityFactor = testResult.failureMessages.length > 0 ? 1.5 : 1;

    return baseLine + durationFactor * complexityFactor;
  }

  extractWarnings(testResult) {
    const warnings = [];

    // Check for slow tests
    if (testResult.duration && testResult.duration > 5000) {
      warnings.push(`Slow test: ${testResult.duration}ms execution time`);
    }

    // Check for console warnings in test output
    if (testResult.console && testResult.console.length > 0) {
      const warningLogs = testResult.console.filter(
        (log) => log.type === 'warn' || log.message.includes('Warning')
      );

      warningLogs.forEach((log) => {
        warnings.push(`Console warning: ${log.message}`);
      });
    }

    return warnings;
  }

  logHealthSummary(healthReport) {
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST HEALTH REPORT');
    console.log('='.repeat(60));

    // Overall status
    const statusIcon = this.getStatusIcon(healthReport.status);
    console.log(
      `${statusIcon} Overall Status: ${healthReport.status.toUpperCase()}`
    );

    // Key metrics
    console.log('\n📈 Key Metrics:');
    console.log(
      `  Pass Rate: ${(healthReport.metrics.overallPassRate * 100).toFixed(1)}% (threshold: ${(healthReport.thresholds.minimumPassRate * 100).toFixed(1)}%)`
    );
    console.log(
      `  Consistency: ${(healthReport.metrics.consistencyScore * 100).toFixed(1)}% (threshold: ${(healthReport.thresholds.minimumConsistency * 100).toFixed(1)}%)`
    );
    console.log(
      `  Avg Execution Time: ${healthReport.metrics.averageExecutionTime.toFixed(0)}ms (threshold: ${healthReport.thresholds.maximumExecutionTime}ms)`
    );
    console.log(
      `  Flakiness: ${(healthReport.metrics.flakiness * 100).toFixed(1)}% (threshold: ${(healthReport.thresholds.maximumFlakiness * 100).toFixed(1)}%)`
    );
    console.log(`  Total Tests: ${healthReport.metrics.totalTestsRun}`);

    // Performance regression
    if (Math.abs(healthReport.metrics.performanceRegression) > 5) {
      const direction =
        healthReport.metrics.performanceRegression > 0 ? 'slower' : 'faster';
      console.log(
        `  Performance: ${Math.abs(healthReport.metrics.performanceRegression).toFixed(1)}% ${direction} than baseline`
      );
    }

    // CI Status
    console.log('\n🚀 CI Status:');
    const ciIcon = healthReport.ciStatus.shouldPass ? '✅' : '❌';
    console.log(
      `  ${ciIcon} Should Pass CI: ${healthReport.ciStatus.shouldPass ? 'YES' : 'NO'}`
    );

    // Issues
    if (healthReport.issues.length > 0) {
      console.log('\n⚠️  Issues Found:');
      healthReport.issues.forEach((issue) => {
        const severityIcon = this.getSeverityIcon(issue.severity);
        console.log(
          `  ${severityIcon} ${issue.category.toUpperCase()}: ${issue.message}`
        );
        if (
          issue.affectedTests &&
          issue.affectedTests.length > 0 &&
          issue.affectedTests.length <= 3
        ) {
          console.log(`    Affected: ${issue.affectedTests.join(', ')}`);
        } else if (issue.affectedTests && issue.affectedTests.length > 3) {
          console.log(
            `    Affected: ${issue.affectedTests.slice(0, 3).join(', ')} and ${issue.affectedTests.length - 3} more`
          );
        }
      });
    }

    // Blocking issues
    if (healthReport.ciStatus.blockingIssues.length > 0) {
      console.log('\n🚫 Blocking Issues:');
      healthReport.ciStatus.blockingIssues.forEach((issue) => {
        console.log(`  ❌ ${issue}`);
      });
    }

    // Warnings
    if (healthReport.ciStatus.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      healthReport.ciStatus.warnings.forEach((warning) => {
        console.log(`  ⚠️  ${warning}`);
      });
    }

    // Recommendations
    if (healthReport.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      healthReport.recommendations.forEach((rec) => {
        console.log(`  • ${rec}`);
      });
    }

    // Slow tests
    if (healthReport.metrics.slowTests.length > 0) {
      console.log('\n🐌 Slowest Tests:');
      healthReport.metrics.slowTests.slice(0, 5).forEach((test) => {
        console.log(`  • ${test.testName}: ${test.averageTime.toFixed(0)}ms`);
      });
    }

    // Flaky tests
    if (healthReport.metrics.flakyTests.length > 0) {
      console.log('\n🎲 Flaky Tests:');
      healthReport.metrics.flakyTests.slice(0, 5).forEach((test) => {
        console.log(
          `  • ${test.testName}: ${(test.flakiness * 100).toFixed(1)}% flaky, ${(test.passRate * 100).toFixed(1)}% pass rate`
        );
      });
    }

    console.log('\n' + '='.repeat(60));
    console.log(
      `📄 Detailed report saved to: ${join(this.reportsDir, 'test-health-report.json')}`
    );
    console.log('='.repeat(60) + '\n');
  }

  getStatusIcon(status) {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'critical':
        return '❌';
      default:
        return '❓';
    }
  }

  getSeverityIcon(severity) {
    switch (severity) {
      case 'low':
        return '💙';
      case 'medium':
        return '💛';
      case 'high':
        return '🧡';
      case 'critical':
        return '❤️';
      default:
        return '⚪';
    }
  }

  saveHealthReport(healthReport) {
    try {
      const reportPath = join(this.reportsDir, 'test-health-report.json');
      writeFileSync(reportPath, JSON.stringify(healthReport, null, 2));

      // Also save a timestamped version for history
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const historicalPath = join(
        this.reportsDir,
        `test-health-report-${timestamp}.json`
      );
      writeFileSync(historicalPath, JSON.stringify(healthReport, null, 2));
    } catch (error) {
      console.warn('Failed to save health report:', error.message);
    }
  }

  saveHealthData() {
    try {
      const healthData = this.healthMonitor.exportHealthData();
      const dataPath = join(this.reportsDir, 'test-health-data.json');
      writeFileSync(dataPath, JSON.stringify(healthData, null, 2));
    } catch (error) {
      console.warn('Failed to save health data:', error.message);
    }
  }
}

module.exports = JestHealthReporter;
