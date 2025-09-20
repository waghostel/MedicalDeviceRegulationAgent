#!/usr/bin/env node

/**
 * Test monitoring and reporting script
 * Monitors test execution, generates reports, and tracks metrics over time
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class TestMonitor {
  constructor() {
    this.metricsHistory = this.loadMetricsHistory();
    this.thresholds = {
      coverage: {
        frontend: 90,
        backend: 90,
      },
      performance: {
        classification: 2000, // 2 seconds
        predicate_search: 10000, // 10 seconds
        project_creation: 1000, // 1 second
        dashboard_load: 500, // 500ms
      },
      reliability: {
        success_rate: 95, // 95%
      },
    };
  }

  loadMetricsHistory() {
    const historyFile = path.join(process.cwd(), 'test-metrics-history.json');
    if (fs.existsSync(historyFile)) {
      return JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    }
    return { runs: [] };
  }

  saveMetricsHistory() {
    const historyFile = path.join(process.cwd(), 'test-metrics-history.json');
    fs.writeFileSync(historyFile, JSON.stringify(this.metricsHistory, null, 2));
  }

  addTestRun(results) {
    const testRun = {
      timestamp: new Date().toISOString(),
      commit: this.getGitCommit(),
      branch: this.getGitBranch(),
      results: results,
      metrics: this.calculateMetrics(results),
    };

    this.metricsHistory.runs.push(testRun);

    // Keep only last 50 runs
    if (this.metricsHistory.runs.length > 50) {
      this.metricsHistory.runs = this.metricsHistory.runs.slice(-50);
    }

    this.saveMetricsHistory();
    return testRun;
  }

  getGitCommit() {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch (error) {
      return 'unknown';
    }
  }

  getGitBranch() {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', {
        encoding: 'utf8',
      }).trim();
    } catch (error) {
      return 'unknown';
    }
  }

  calculateMetrics(results) {
    const metrics = {
      quality_score: 0,
      performance_score: 0,
      reliability_score: 0,
      overall_score: 0,
      trends: {},
    };

    // Calculate quality score based on coverage
    if (results.frontend && results.frontend.coverage) {
      const frontendQuality = Math.min(
        100,
        (results.frontend.coverage / this.thresholds.coverage.frontend) * 100
      );
      metrics.quality_score += frontendQuality * 0.5;
    }

    if (results.backend && results.backend.coverage) {
      const backendQuality = Math.min(
        100,
        (results.backend.coverage / this.thresholds.coverage.backend) * 100
      );
      metrics.quality_score += backendQuality * 0.5;
    }

    // Calculate performance score
    let performanceTests = 0;
    let performanceScore = 0;

    Object.entries(this.thresholds.performance).forEach(([test, threshold]) => {
      if (results.performance && results.performance[test]) {
        const actualTime = results.performance[test];
        const score = Math.max(
          0,
          Math.min(100, ((threshold - actualTime) / threshold) * 100)
        );
        performanceScore += score;
        performanceTests++;
      }
    });

    if (performanceTests > 0) {
      metrics.performance_score = performanceScore / performanceTests;
    }

    // Calculate reliability score
    const passedTests = Object.values(results).filter(
      (r) => r && r.passed
    ).length;
    const totalTests = Object.keys(results).length;
    metrics.reliability_score = (passedTests / totalTests) * 100;

    // Calculate overall score
    metrics.overall_score =
      metrics.quality_score * 0.4 +
      metrics.performance_score * 0.3 +
      metrics.reliability_score * 0.3;

    // Calculate trends
    if (this.metricsHistory.runs.length > 1) {
      const previousRun =
        this.metricsHistory.runs[this.metricsHistory.runs.length - 1];
      metrics.trends = {
        quality:
          metrics.quality_score - (previousRun.metrics?.quality_score || 0),
        performance:
          metrics.performance_score -
          (previousRun.metrics?.performance_score || 0),
        reliability:
          metrics.reliability_score -
          (previousRun.metrics?.reliability_score || 0),
        overall:
          metrics.overall_score - (previousRun.metrics?.overall_score || 0),
      };
    }

    return metrics;
  }

  generateReport(testRun) {
    const report = {
      summary: this.generateSummary(testRun),
      details: this.generateDetails(testRun),
      recommendations: this.generateRecommendations(testRun),
      trends: this.generateTrends(),
    };

    // Save HTML report
    const htmlReport = this.generateHTMLReport(report, testRun);
    fs.writeFileSync('test-report.html', htmlReport);

    // Save JSON report
    fs.writeFileSync('test-report.json', JSON.stringify(report, null, 2));

    return report;
  }

  generateSummary(testRun) {
    const { results, metrics } = testRun;
    const passedTests = Object.values(results).filter(
      (r) => r && r.passed
    ).length;
    const totalTests = Object.keys(results).length;

    return {
      timestamp: testRun.timestamp,
      commit: testRun.commit.substring(0, 8),
      branch: testRun.branch,
      overall_status: passedTests === totalTests ? 'PASS' : 'FAIL',
      tests_passed: `${passedTests}/${totalTests}`,
      overall_score: Math.round(metrics.overall_score),
      quality_score: Math.round(metrics.quality_score),
      performance_score: Math.round(metrics.performance_score),
      reliability_score: Math.round(metrics.reliability_score),
    };
  }

  generateDetails(testRun) {
    const { results } = testRun;
    const details = {};

    Object.entries(results).forEach(([suite, result]) => {
      if (result) {
        details[suite] = {
          status: result.passed ? 'PASS' : 'FAIL',
          duration: result.duration
            ? `${(result.duration / 1000).toFixed(1)}s`
            : 'N/A',
          coverage: result.coverage ? `${result.coverage}%` : 'N/A',
          issues: this.identifyIssues(suite, result),
        };
      }
    });

    return details;
  }

  identifyIssues(suite, result) {
    const issues = [];

    if (!result.passed) {
      issues.push('Test suite failed');
    }

    if (
      suite === 'frontend' &&
      result.coverage < this.thresholds.coverage.frontend
    ) {
      issues.push(
        `Coverage below threshold (${result.coverage}% < ${this.thresholds.coverage.frontend}%)`
      );
    }

    if (
      suite === 'backend' &&
      result.coverage < this.thresholds.coverage.backend
    ) {
      issues.push(
        `Coverage below threshold (${result.coverage}% < ${this.thresholds.coverage.backend}%)`
      );
    }

    if (result.duration > 60000) {
      // 1 minute
      issues.push('Test suite taking too long');
    }

    return issues;
  }

  generateRecommendations(testRun) {
    const { results, metrics } = testRun;
    const recommendations = [];

    // Coverage recommendations
    if (metrics.quality_score < 90) {
      recommendations.push({
        type: 'coverage',
        priority: 'high',
        message: 'Increase test coverage to meet 90% threshold',
        actions: [
          'Add unit tests for uncovered functions',
          'Implement integration tests for critical paths',
          'Review and test error handling scenarios',
        ],
      });
    }

    // Performance recommendations
    if (metrics.performance_score < 80) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        message: 'Optimize performance to meet response time targets',
        actions: [
          'Profile slow API endpoints',
          'Implement caching for frequently accessed data',
          'Optimize database queries',
          'Consider async processing for long-running tasks',
        ],
      });
    }

    // Reliability recommendations
    if (metrics.reliability_score < 95) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        message: 'Improve test reliability and stability',
        actions: [
          'Fix failing tests',
          'Improve error handling',
          'Add retry mechanisms for flaky tests',
          'Review test environment setup',
        ],
      });
    }

    // Trend-based recommendations
    if (metrics.trends && metrics.trends.overall < -5) {
      recommendations.push({
        type: 'regression',
        priority: 'high',
        message: 'Quality regression detected',
        actions: [
          'Review recent changes',
          'Run additional regression tests',
          'Consider reverting problematic commits',
        ],
      });
    }

    return recommendations;
  }

  generateTrends() {
    if (this.metricsHistory.runs.length < 2) {
      return { message: 'Insufficient data for trend analysis' };
    }

    const recentRuns = this.metricsHistory.runs.slice(-10);
    const trends = {
      quality: this.calculateTrend(recentRuns, 'quality_score'),
      performance: this.calculateTrend(recentRuns, 'performance_score'),
      reliability: this.calculateTrend(recentRuns, 'reliability_score'),
      overall: this.calculateTrend(recentRuns, 'overall_score'),
    };

    return trends;
  }

  calculateTrend(runs, metric) {
    const values = runs.map((run) => run.metrics?.[metric] || 0);
    if (values.length < 2) return { trend: 'stable', change: 0 };

    const first = values[0];
    const last = values[values.length - 1];
    const change = last - first;

    let trend = 'stable';
    if (change > 5) trend = 'improving';
    else if (change < -5) trend = 'declining';

    return { trend, change: Math.round(change * 100) / 100 };
  }

  generateHTMLReport(report, testRun) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Medical Device Regulatory Assistant - Test Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { padding: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #64748b; font-size: 0.9em; }
        .pass { color: #059669; }
        .fail { color: #dc2626; }
        .warning { color: #d97706; }
        .section { margin-bottom: 30px; }
        .section h2 { border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; }
        .test-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; }
        .test-card { border: 1px solid #e2e8f0; border-radius: 6px; padding: 15px; }
        .recommendations { background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 15px; }
        .recommendation { margin-bottom: 15px; }
        .priority-high { border-left: 4px solid #dc2626; }
        .priority-medium { border-left: 4px solid #d97706; }
        .priority-low { border-left: 4px solid #059669; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Medical Device Regulatory Assistant</h1>
            <h2>Test Report - ${new Date(testRun.timestamp).toLocaleString()}</h2>
            <p>Branch: ${testRun.branch} | Commit: ${testRun.commit.substring(0, 8)}</p>
        </div>
        
        <div class="content">
            <div class="section">
                <h2>Summary</h2>
                <div class="summary">
                    <div class="metric-card">
                        <div class="metric-value ${report.summary.overall_status === 'PASS' ? 'pass' : 'fail'}">
                            ${report.summary.overall_status}
                        </div>
                        <div class="metric-label">Overall Status</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${report.summary.tests_passed}</div>
                        <div class="metric-label">Tests Passed</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${report.summary.overall_score}%</div>
                        <div class="metric-label">Overall Score</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${report.summary.quality_score}%</div>
                        <div class="metric-label">Quality Score</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${report.summary.performance_score}%</div>
                        <div class="metric-label">Performance Score</div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-value">${report.summary.reliability_score}%</div>
                        <div class="metric-label">Reliability Score</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <h2>Test Suite Details</h2>
                <div class="test-grid">
                    ${Object.entries(report.details)
                      .map(
                        ([suite, details]) => `
                        <div class="test-card">
                            <h3>${suite.charAt(0).toUpperCase() + suite.slice(1)}</h3>
                            <p><strong>Status:</strong> <span class="${details.status === 'PASS' ? 'pass' : 'fail'}">${details.status}</span></p>
                            <p><strong>Duration:</strong> ${details.duration}</p>
                            <p><strong>Coverage:</strong> ${details.coverage}</p>
                            ${
                              details.issues.length > 0
                                ? `
                                <div class="issues">
                                    <strong>Issues:</strong>
                                    <ul>
                                        ${details.issues.map((issue) => `<li>${issue}</li>`).join('')}
                                    </ul>
                                </div>
                            `
                                : ''
                            }
                        </div>
                    `
                      )
                      .join('')}
                </div>
            </div>

            ${
              report.recommendations.length > 0
                ? `
                <div class="section">
                    <h2>Recommendations</h2>
                    ${report.recommendations
                      .map(
                        (rec) => `
                        <div class="recommendations recommendation priority-${rec.priority}">
                            <h4>${rec.message}</h4>
                            <p><strong>Priority:</strong> ${rec.priority.toUpperCase()}</p>
                            <p><strong>Actions:</strong></p>
                            <ul>
                                ${rec.actions.map((action) => `<li>${action}</li>`).join('')}
                            </ul>
                        </div>
                    `
                      )
                      .join('')}
                </div>
            `
                : ''
            }

            <div class="section">
                <h2>Trends</h2>
                <div class="test-grid">
                    ${Object.entries(report.trends)
                      .map(
                        ([metric, trend]) => `
                        <div class="test-card">
                            <h4>${metric.charAt(0).toUpperCase() + metric.slice(1)}</h4>
                            ${
                              trend.trend
                                ? `
                                <p><strong>Trend:</strong> ${trend.trend}</p>
                                <p><strong>Change:</strong> ${trend.change > 0 ? '+' : ''}${trend.change}%</p>
                            `
                                : `<p>${trend.message || 'No trend data available'}</p>`
                            }
                        </div>
                    `
                      )
                      .join('')}
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;
  }

  async monitorTestExecution(testResultsFile) {
    console.log('📊 Monitoring test execution...');

    // Wait for test results file
    let attempts = 0;
    while (!fs.existsSync(testResultsFile) && attempts < 60) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      attempts++;
    }

    if (!fs.existsSync(testResultsFile)) {
      throw new Error('Test results file not found after 60 seconds');
    }

    // Load and process results
    const results = JSON.parse(fs.readFileSync(testResultsFile, 'utf8'));
    const testRun = this.addTestRun(results.results);
    const report = this.generateReport(testRun);

    console.log('\n📈 Test Monitoring Summary:');
    console.log(
      `   Overall Score: ${Math.round(testRun.metrics.overall_score)}%`
    );
    console.log(
      `   Quality Score: ${Math.round(testRun.metrics.quality_score)}%`
    );
    console.log(
      `   Performance Score: ${Math.round(testRun.metrics.performance_score)}%`
    );
    console.log(
      `   Reliability Score: ${Math.round(testRun.metrics.reliability_score)}%`
    );

    if (report.recommendations.length > 0) {
      console.log(
        `\n⚠️  ${report.recommendations.length} recommendations generated`
      );
    }

    console.log('\n📄 Reports generated:');
    console.log('   - test-report.html (detailed HTML report)');
    console.log('   - test-report.json (machine-readable report)');

    return report;
  }
}

// CLI interface
if (require.main === module) {
  const monitor = new TestMonitor();

  const command = process.argv[2];

  if (command === 'monitor') {
    const testResultsFile = process.argv[3] || 'test-results.json';
    monitor
      .monitorTestExecution(testResultsFile)
      .then(() => {
        console.log('✅ Test monitoring completed');
        process.exit(0);
      })
      .catch((error) => {
        console.error('❌ Test monitoring failed:', error.message);
        process.exit(1);
      });
  } else {
    console.log('Usage: node test-monitor.js monitor [test-results-file]');
    process.exit(1);
  }
}

module.exports = TestMonitor;
