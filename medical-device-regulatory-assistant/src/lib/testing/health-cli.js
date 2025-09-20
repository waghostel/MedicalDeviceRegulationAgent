#!/usr/bin/env node

/**
 * Test Health CLI
 *
 * Command-line utility for generating test health reports and monitoring
 * test infrastructure health outside of Jest execution.
 *
 * Requirements: 5.2 (consistent test results), 8.1 (CI environment success >90% pass rate)
 */

const { writeFileSync, existsSync } = require('fs');
const { join } = require('path');
const { getTestHealthMonitor } = require('./test-health-monitor');

function printUsage() {
  console.log(`
Test Health CLI - Monitor and report on test infrastructure health

Usage:
  node health-cli.js <command> [options]

Commands:
  report                    Generate current health report
  history [limit]          Show health metrics history
  status                   Check if tests should pass CI
  export [file]            Export all health data to JSON
  clear                    Clear all health data
  thresholds               Show current health thresholds

Options:
  --json                   Output in JSON format
  --verbose                Show detailed information
  --ci                     CI-friendly output (exit codes)

Examples:
  node health-cli.js report --verbose
  node health-cli.js status --ci
  node health-cli.js history 10
  node health-cli.js export health-data.json
`);
}

function formatDuration(ms) {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatPercentage(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes.toFixed(0)}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function printHealthReport(report, options = {}) {
  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  console.log('\n📊 Test Health Report');
  console.log('='.repeat(50));

  // Status
  const statusIcon =
    report.status === 'healthy'
      ? '✅'
      : report.status === 'warning'
        ? '⚠️'
        : '❌';
  console.log(`${statusIcon} Status: ${report.status.toUpperCase()}`);

  // Key metrics
  console.log('\n📈 Metrics:');
  console.log(
    `  Pass Rate: ${formatPercentage(report.metrics.overallPassRate)}`
  );
  console.log(
    `  Consistency: ${formatPercentage(report.metrics.consistencyScore)}`
  );
  console.log(
    `  Execution Time: ${formatDuration(report.metrics.averageExecutionTime)}`
  );
  console.log(`  Flakiness: ${formatPercentage(report.metrics.flakiness)}`);
  console.log(`  Total Tests: ${report.metrics.totalTestsRun}`);

  if (Math.abs(report.metrics.performanceRegression) > 1) {
    const direction =
      report.metrics.performanceRegression > 0 ? 'slower' : 'faster';
    console.log(
      `  Performance: ${Math.abs(report.metrics.performanceRegression).toFixed(1)}% ${direction}`
    );
  }

  // CI Status
  console.log('\n🚀 CI Status:');
  const ciIcon = report.ciStatus.shouldPass ? '✅' : '❌';
  console.log(
    `  ${ciIcon} Should Pass: ${report.ciStatus.shouldPass ? 'YES' : 'NO'}`
  );

  if (report.ciStatus.blockingIssues.length > 0) {
    console.log('\n🚫 Blocking Issues:');
    report.ciStatus.blockingIssues.forEach((issue) => {
      console.log(`  • ${issue}`);
    });
  }

  if (report.ciStatus.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    report.ciStatus.warnings.forEach((warning) => {
      console.log(`  • ${warning}`);
    });
  }

  if (options.verbose) {
    // Detailed issues
    if (report.issues.length > 0) {
      console.log('\n🔍 Detailed Issues:');
      report.issues.forEach((issue) => {
        const severityIcon =
          issue.severity === 'critical'
            ? '❤️'
            : issue.severity === 'high'
              ? '🧡'
              : issue.severity === 'medium'
                ? '💛'
                : '💙';
        console.log(
          `  ${severityIcon} ${issue.category.toUpperCase()}: ${issue.message}`
        );
        console.log(`     Recommendation: ${issue.recommendation}`);
        if (issue.affectedTests && issue.affectedTests.length > 0) {
          console.log(
            `     Affected Tests: ${issue.affectedTests.slice(0, 3).join(', ')}${issue.affectedTests.length > 3 ? '...' : ''}`
          );
        }
      });
    }

    // Slow tests
    if (report.metrics.slowTests.length > 0) {
      console.log('\n🐌 Slowest Tests:');
      report.metrics.slowTests.slice(0, 10).forEach((test) => {
        console.log(
          `  • ${test.testName}: ${formatDuration(test.averageTime)}`
        );
      });
    }

    // Flaky tests
    if (report.metrics.flakyTests.length > 0) {
      console.log('\n🎲 Flaky Tests:');
      report.metrics.flakyTests.slice(0, 10).forEach((test) => {
        console.log(
          `  • ${test.testName}: ${formatPercentage(test.flakiness)} flaky, ${formatPercentage(test.passRate)} pass rate`
        );
      });
    }

    // Error patterns
    if (report.metrics.errorPatterns.length > 0) {
      console.log('\n🚨 Common Error Patterns:');
      report.metrics.errorPatterns.slice(0, 5).forEach((pattern) => {
        console.log(
          `  • ${pattern.pattern} (${pattern.count} times, ${formatPercentage(pattern.percentage / 100)})`
        );
      });
    }
  }

  console.log(
    `\n📅 Generated: ${new Date(report.generatedAt).toLocaleString()}`
  );
}

function printHealthHistory(history, limit, options = {}) {
  if (options.json) {
    console.log(JSON.stringify(history, null, 2));
    return;
  }

  console.log('\n📈 Health Metrics History');
  console.log('='.repeat(50));

  if (history.length === 0) {
    console.log('No health history available.');
    return;
  }

  console.log(
    `Showing last ${Math.min(limit || 10, history.length)} entries:\n`
  );

  // Table header
  console.log(
    'Date/Time           | Pass Rate | Consistency | Exec Time | Flakiness'
  );
  console.log('-'.repeat(70));

  const recentHistory = history.slice(-(limit || 10));
  recentHistory.forEach((metrics) => {
    const date = new Date(metrics.timestamp).toLocaleString().padEnd(18);
    const passRate = formatPercentage(metrics.overallPassRate).padEnd(8);
    const consistency = formatPercentage(metrics.consistencyScore).padEnd(10);
    const execTime = formatDuration(metrics.averageExecutionTime).padEnd(8);
    const flakiness = formatPercentage(metrics.flakiness).padEnd(8);

    console.log(
      `${date} | ${passRate} | ${consistency} | ${execTime} | ${flakiness}`
    );
  });

  if (options.verbose && recentHistory.length > 0) {
    const latest = recentHistory[recentHistory.length - 1];
    console.log(
      `\nLatest metrics (${new Date(latest.timestamp).toLocaleString()}):`
    );
    console.log(`  Total Tests: ${latest.totalTestsRun}`);
    console.log(
      `  Memory Usage: ${formatBytes(latest.memoryUsageAverage * 1024 * 1024)}`
    );
    console.log(`  Slow Tests: ${latest.slowTests.length}`);
    console.log(`  Flaky Tests: ${latest.flakyTests.length}`);
    console.log(`  Error Patterns: ${latest.errorPatterns.length}`);
  }
}

function printThresholds(thresholds, options = {}) {
  if (options.json) {
    console.log(JSON.stringify(thresholds, null, 2));
    return;
  }

  console.log('\n⚙️  Health Thresholds');
  console.log('='.repeat(50));
  console.log(
    `Minimum Pass Rate: ${formatPercentage(thresholds.minimumPassRate)}`
  );
  console.log(
    `Maximum Execution Time: ${formatDuration(thresholds.maximumExecutionTime)}`
  );
  console.log(
    `Maximum Test Time: ${formatDuration(thresholds.maximumTestTime)}`
  );
  console.log(
    `Minimum Consistency: ${formatPercentage(thresholds.minimumConsistency)}`
  );
  console.log(
    `Maximum Flakiness: ${formatPercentage(thresholds.maximumFlakiness)}`
  );
  console.log(`Maximum Regression: ${thresholds.maximumRegressionPercentage}%`);
  console.log(
    `Memory Threshold: ${formatBytes(thresholds.memoryThreshold * 1024 * 1024)}`
  );
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    printUsage();
    return;
  }

  const command = args[0];
  const options = {
    json: args.includes('--json'),
    verbose: args.includes('--verbose'),
    ci: args.includes('--ci'),
  };

  const monitor = getTestHealthMonitor();

  try {
    switch (command) {
      case 'report': {
        const report = monitor.generateHealthReport();
        printHealthReport(report, options);

        if (options.ci) {
          process.exit(report.ciStatus.shouldPass ? 0 : 1);
        }
        break;
      }

      case 'history': {
        const limit = parseInt(args[1]) || 10;
        const history = monitor.getHealthHistory(limit);
        printHealthHistory(history, limit, options);
        break;
      }

      case 'status': {
        const shouldPass = monitor.shouldPassCI();

        if (options.json) {
          console.log(JSON.stringify({ shouldPassCI: shouldPass }, null, 2));
        } else {
          const icon = shouldPass ? '✅' : '❌';
          console.log(`${icon} CI Status: ${shouldPass ? 'PASS' : 'FAIL'}`);
        }

        if (options.ci) {
          process.exit(shouldPass ? 0 : 1);
        }
        break;
      }

      case 'export': {
        const filename = args[1] || 'test-health-export.json';
        const data = monitor.exportHealthData();

        writeFileSync(filename, JSON.stringify(data, null, 2));
        console.log(`✅ Health data exported to ${filename}`);
        break;
      }

      case 'clear': {
        monitor.clearHealthData();
        console.log('✅ Health data cleared');
        break;
      }

      case 'thresholds': {
        const report = monitor.generateHealthReport();
        printThresholds(report.thresholds, options);
        break;
      }

      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  main,
  printHealthReport,
  printHealthHistory,
  printThresholds,
};
