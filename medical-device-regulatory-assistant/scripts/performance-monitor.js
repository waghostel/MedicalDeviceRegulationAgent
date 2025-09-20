#!/usr/bin/env node

/**
 * Performance Monitor Script
 *
 * Standalone script to monitor test performance and validate thresholds
 * Implements Requirements 5.1 and 5.2 validation
 */

const { execSync } = require('child_process');
const { existsSync, readFileSync, writeFileSync } = require('fs');
const { join } = require('path');

// Configuration
const CONFIG = {
  thresholds: {
    maxSuiteExecutionTime: 30000, // 30 seconds (Requirement 5.1)
    maxTestExecutionTime: 5000, // 5 seconds per test
    maxMemoryUsage: 512, // 512MB
    consistencyThreshold: 0.2, // 20% variance (Requirement 5.2)
    memoryLeakThreshold: 10, // 10MB
  },
  reportDir: join(process.cwd(), 'test-reports', 'performance'),
  historyFile: join(
    process.cwd(),
    'test-reports',
    'performance',
    'performance-history.json'
  ),
  outputFile: join(
    process.cwd(),
    'test-reports',
    'performance',
    'latest-report.json'
  ),
};

/**
 * Run performance monitoring
 */
async function runPerformanceMonitoring() {
  console.log('📊 Starting Test Performance Monitoring');
  console.log('='.repeat(50));

  try {
    // Run tests with performance tracking
    console.log('🧪 Running test suite with performance tracking...');

    const testCommand = 'pnpm test --coverage --verbose --passWithNoTests';
    const startTime = Date.now();

    try {
      execSync(testCommand, {
        stdio: 'inherit',
        cwd: process.cwd(),
        env: {
          ...process.env,
          NODE_ENV: 'test',
          PERFORMANCE_MONITORING: 'true',
        },
      });
    } catch (error) {
      console.warn(
        '⚠️  Some tests failed, but continuing with performance analysis...'
      );
    }

    const endTime = Date.now();
    const totalExecutionTime = endTime - startTime;

    console.log(
      `\n⏱️  Total test execution time: ${(totalExecutionTime / 1000).toFixed(2)}s`
    );

    // Analyze performance results
    await analyzePerformanceResults(totalExecutionTime);

    // Generate recommendations
    generateRecommendations();

    console.log('\n✅ Performance monitoring completed');
  } catch (error) {
    console.error('❌ Performance monitoring failed:', error.message);
    process.exit(1);
  }
}

/**
 * Analyze performance results
 */
async function analyzePerformanceResults(totalExecutionTime) {
  console.log('\n📊 Analyzing Performance Results');
  console.log('-'.repeat(40));

  // Check if performance report exists
  if (!existsSync(CONFIG.outputFile)) {
    console.warn(
      '⚠️  No performance report found. Tests may not have performance tracking enabled.'
    );
    return;
  }

  try {
    const reportData = JSON.parse(readFileSync(CONFIG.outputFile, 'utf8'));

    // Validate against thresholds
    const validation = validatePerformanceThresholds(
      reportData,
      totalExecutionTime
    );

    // Display results
    displayValidationResults(validation);

    // Check requirements compliance
    checkRequirementsCompliance(validation);
  } catch (error) {
    console.error('Failed to analyze performance results:', error.message);
  }
}

/**
 * Validate performance against thresholds
 */
function validatePerformanceThresholds(reportData, totalExecutionTime) {
  const validation = {
    overallTime: {
      actual: totalExecutionTime,
      threshold: CONFIG.thresholds.maxSuiteExecutionTime,
      passed: totalExecutionTime <= CONFIG.thresholds.maxSuiteExecutionTime,
      requirement: '5.1',
    },
    consistency: {
      actual: reportData.consistency || 0,
      threshold: 1 - CONFIG.thresholds.consistencyThreshold,
      passed:
        (reportData.consistency || 0) >=
        1 - CONFIG.thresholds.consistencyThreshold,
      requirement: '5.2',
    },
    memory: {
      actual: reportData.peakMemory || 0,
      threshold: CONFIG.thresholds.maxMemoryUsage,
      passed: (reportData.peakMemory || 0) <= CONFIG.thresholds.maxMemoryUsage,
      requirement: 'General',
    },
    violations: reportData.violations || [],
    recommendations: reportData.recommendations || [],
  };

  return validation;
}

/**
 * Display validation results
 */
function displayValidationResults(validation) {
  console.log('Threshold Validation Results:');
  console.log('');

  // Overall execution time (Requirement 5.1)
  const timeStatus = validation.overallTime.passed ? '✅' : '❌';
  console.log(`${timeStatus} Suite Execution Time (Req 5.1):`);
  console.log(
    `    Actual: ${(validation.overallTime.actual / 1000).toFixed(2)}s`
  );
  console.log(
    `    Threshold: ${(validation.overallTime.threshold / 1000).toFixed(2)}s`
  );
  console.log(
    `    Status: ${validation.overallTime.passed ? 'PASSED' : 'FAILED'}`
  );
  console.log('');

  // Consistency (Requirement 5.2)
  const consistencyStatus = validation.consistency.passed ? '✅' : '❌';
  console.log(`${consistencyStatus} Test Consistency (Req 5.2):`);
  console.log(
    `    Actual: ${(validation.consistency.actual * 100).toFixed(1)}%`
  );
  console.log(
    `    Threshold: ${(validation.consistency.threshold * 100).toFixed(1)}%`
  );
  console.log(
    `    Status: ${validation.consistency.passed ? 'PASSED' : 'FAILED'}`
  );
  console.log('');

  // Memory usage
  const memoryStatus = validation.memory.passed ? '✅' : '❌';
  console.log(`${memoryStatus} Memory Usage:`);
  console.log(`    Actual: ${validation.memory.actual.toFixed(2)}MB`);
  console.log(`    Threshold: ${validation.memory.threshold}MB`);
  console.log(`    Status: ${validation.memory.passed ? 'PASSED' : 'FAILED'}`);
  console.log('');

  // Violations
  if (validation.violations.length > 0) {
    console.log('⚠️  Performance Violations:');
    validation.violations.forEach((violation, index) => {
      console.log(`    ${index + 1}. ${violation}`);
    });
    console.log('');
  }
}

/**
 * Check requirements compliance
 */
function checkRequirementsCompliance(validation) {
  console.log('Requirements Compliance Check:');
  console.log('-'.repeat(30));

  const req51Passed = validation.overallTime.passed;
  const req52Passed = validation.consistency.passed;

  console.log(
    `Requirement 5.1 (30s limit): ${req51Passed ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`
  );
  console.log(
    `Requirement 5.2 (consistency): ${req52Passed ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`
  );

  const overallCompliant = req51Passed && req52Passed;
  console.log(
    `Overall Compliance: ${overallCompliant ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`
  );

  if (!overallCompliant) {
    console.log('');
    console.log('🚨 CRITICAL: Requirements compliance failure detected!');

    if (!req51Passed) {
      console.log(
        '   • Test suite execution exceeds 30-second limit (Requirement 5.1)'
      );
    }

    if (!req52Passed) {
      console.log(
        '   • Test execution consistency below threshold (Requirement 5.2)'
      );
    }

    console.log('   • This may block deployment and CI/CD pipeline');
    process.exitCode = 1;
  }
}

/**
 * Generate performance recommendations
 */
function generateRecommendations() {
  console.log('\n💡 Performance Recommendations:');
  console.log('-'.repeat(35));

  const recommendations = [
    'Run tests in parallel to reduce overall execution time',
    'Optimize slow test cases identified in the performance report',
    'Implement test mocking to reduce external dependencies',
    'Use test.concurrent() for independent test cases',
    'Consider splitting large test suites into smaller, focused suites',
    'Monitor memory usage and implement proper cleanup in tests',
    'Use performance budgets in CI/CD to catch regressions early',
  ];

  recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });
}

/**
 * Watch mode for continuous monitoring
 */
function watchMode() {
  console.log('👀 Starting performance monitoring in watch mode...');
  console.log('Press Ctrl+C to stop');

  const chokidar = require('chokidar');

  // Watch test files
  const watcher = chokidar.watch(
    [
      'src/**/*.test.{js,jsx,ts,tsx}',
      'src/**/*.spec.{js,jsx,ts,tsx}',
      '__tests__/**/*.{js,jsx,ts,tsx}',
    ],
    {
      ignored: /node_modules/,
      persistent: true,
    }
  );

  let timeout;

  watcher.on('change', (path) => {
    console.log(`\n📝 Test file changed: ${path}`);

    // Debounce test runs
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      console.log('🔄 Re-running performance monitoring...');
      runPerformanceMonitoring();
    }, 2000);
  });

  // Initial run
  runPerformanceMonitoring();
}

/**
 * Generate performance dashboard
 */
function generateDashboard() {
  console.log('📊 Generating Performance Dashboard...');

  if (!existsSync(CONFIG.historyFile)) {
    console.warn('No performance history available for dashboard');
    return;
  }

  try {
    const historyData = JSON.parse(readFileSync(CONFIG.historyFile, 'utf8'));
    const reports = historyData.reports || [];

    if (reports.length === 0) {
      console.warn('No performance reports available for dashboard');
      return;
    }

    // Generate HTML dashboard
    const dashboardHtml = generateDashboardHtml(reports);
    const dashboardFile = join(CONFIG.reportDir, 'dashboard.html');

    writeFileSync(dashboardFile, dashboardHtml);
    console.log(`📊 Dashboard generated: ${dashboardFile}`);
  } catch (error) {
    console.error('Failed to generate dashboard:', error.message);
  }
}

/**
 * Generate HTML dashboard
 */
function generateDashboardHtml(reports) {
  const latestReport = reports[reports.length - 1];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Performance Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 8px; }
        .metric { display: inline-block; margin: 10px; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .passed { border-color: #4caf50; background: #f1f8e9; }
        .failed { border-color: #f44336; background: #ffebee; }
        .chart { margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 Test Performance Dashboard</h1>
        <p>Last updated: ${new Date().toLocaleString()}</p>
    </div>
    
    <h2>Current Status</h2>
    <div class="metric ${latestReport.thresholdCompliance?.suiteTimeCompliance ? 'passed' : 'failed'}">
        <h3>Suite Time (Req 5.1)</h3>
        <p>${(latestReport.overallExecutionTime / 1000).toFixed(2)}s / 30s</p>
        <p>${latestReport.thresholdCompliance?.suiteTimeCompliance ? '✅ PASSED' : '❌ FAILED'}</p>
    </div>
    
    <div class="metric ${latestReport.thresholdCompliance?.consistencyCompliance ? 'passed' : 'failed'}">
        <h3>Consistency (Req 5.2)</h3>
        <p>${latestReport.overallPassRate?.toFixed(1)}% pass rate</p>
        <p>${latestReport.thresholdCompliance?.consistencyCompliance ? '✅ PASSED' : '❌ FAILED'}</p>
    </div>
    
    <div class="metric ${latestReport.thresholdCompliance?.memoryCompliance ? 'passed' : 'failed'}">
        <h3>Memory Usage</h3>
        <p>Peak: ${latestReport.suiteMetrics?.[0]?.memoryPeak?.toFixed(2) || 'N/A'}MB</p>
        <p>${latestReport.thresholdCompliance?.memoryCompliance ? '✅ PASSED' : '❌ FAILED'}</p>
    </div>
    
    <h2>Recommendations</h2>
    <ul>
        ${(latestReport.recommendations || []).map((rec) => `<li>${rec}</li>`).join('')}
    </ul>
    
    <h2>Historical Trend</h2>
    <div class="chart">
        <p>Execution time trend over last ${reports.length} runs:</p>
        <pre>${reports.map((r, i) => `${i + 1}: ${(r.overallExecutionTime / 1000).toFixed(2)}s`).join('\\n')}</pre>
    </div>
</body>
</html>
  `;
}

// CLI interface
const command = process.argv[2];

switch (command) {
  case 'watch':
    watchMode();
    break;
  case 'dashboard':
    generateDashboard();
    break;
  case 'analyze':
    analyzePerformanceResults(0);
    break;
  default:
    runPerformanceMonitoring();
}
