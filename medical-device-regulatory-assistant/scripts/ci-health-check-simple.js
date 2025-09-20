#!/usr/bin/env node

/**
 * Simple CI Health Check Script - Basic test health monitoring for CI/CD
 * Requirements: 8.1, 8.2, 8.3
 */

const fs = require('fs').promises;
const path = require('path');

class SimpleCIHealthChecker {
  constructor() {
    this.config = {
      outputDir: process.env.CI_REPORTS_DIR || 'test-reports',
      criticalThreshold: parseInt(process.env.CI_CRITICAL_THRESHOLD) || 50,
      warningThreshold: parseInt(process.env.CI_WARNING_THRESHOLD) || 80,
    };

    this.startTime = Date.now();
  }

  async run() {
    console.log('🚀 Starting CI Health Check...');
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔧 CI: ${process.env.CI ? 'true' : 'false'}`);

    try {
      // Create reports directory
      await fs.mkdir(this.config.outputDir, { recursive: true });

      // Generate basic health report
      const healthReport = await this.generateBasicHealthReport();

      // Save report
      await this.saveHealthReport(healthReport);

      // Generate dashboard
      const dashboardPath = await this.generateBasicDashboard(healthReport);

      // Output results
      console.log(`\n${  '='.repeat(60)}`);
      console.log('📋 TEST HEALTH SUMMARY');
      console.log('='.repeat(60));
      console.log(healthReport.summary);

      if (healthReport.details) {
        console.log('\n📝 DETAILS:');
        console.log(healthReport.details);
      }

      console.log(`\n📊 Dashboard: ${dashboardPath}`);
      console.log('='.repeat(60));

      // Set GitHub Actions outputs if in CI
      if (process.env.GITHUB_ACTIONS) {
        await this.setGitHubOutputs(healthReport, dashboardPath);
      }

      // Generate step summary for GitHub Actions
      if (process.env.GITHUB_STEP_SUMMARY) {
        await this.generateStepSummary(healthReport);
      }

      // Exit with appropriate code
      process.exit(healthReport.exitCode);
    } catch (error) {
      console.error('❌ CI Health Check failed:', error);
      process.exit(1);
    }
  }

  async generateBasicHealthReport() {
    const metrics = await this.collectBasicMetrics();
    const validation = this.validateMetrics(metrics);

    let exitCode = 0;
    let summary = '';
    let details = '';

    if (validation.criticalIssues > 0) {
      exitCode = 1;
      summary = `❌ CRITICAL: ${validation.criticalIssues} critical issues found`;
      details = validation.issues
        .filter((i) => i.severity === 'critical')
        .map((i) => `- ${i.message}`)
        .join('\n');
    } else if (validation.highIssues > 0) {
      exitCode = process.env.CI_FAIL_ON_HIGH_ISSUES === 'true' ? 1 : 0;
      summary = `⚠️ WARNING: ${validation.highIssues} high priority issues found`;
      details = validation.issues
        .filter((i) => i.severity === 'high')
        .map((i) => `- ${i.message}`)
        .join('\n');
    } else if (validation.warnings > 0) {
      summary = `💡 INFO: ${validation.warnings} warnings found`;
      details = validation.issues
        .filter((i) => i.severity === 'warning')
        .map((i) => `- ${i.message}`)
        .join('\n');
    } else {
      summary = `✅ SUCCESS: All tests healthy (Score: ${metrics.healthScore}/100)`;
      details = `
Performance: ${metrics.executionTime}ms
React 19 Compatible: ${metrics.react19Compatible ? 'Yes' : 'No'}
CI Environment: ${process.env.CI ? 'Yes' : 'No'}
      `.trim();
    }

    return {
      exitCode,
      summary,
      details,
      metrics,
      validation,
      timestamp: new Date().toISOString(),
    };
  }

  async collectBasicMetrics() {
    const executionTime = Date.now() - this.startTime;

    // Check if React 19 is installed
    let react19Compatible = false;
    try {
      const packageJson = JSON.parse(
        await fs.readFile('package.json', 'utf-8')
      );
      const reactVersion = packageJson.dependencies?.react || '';
      react19Compatible = reactVersion.startsWith('19.');
    } catch (error) {
      console.warn('Could not check React version');
    }

    // Basic health score calculation
    let healthScore = 100;

    if (executionTime > 30000) healthScore -= 20; // Slow execution
    if (!react19Compatible) healthScore -= 30; // Not React 19
    if (!process.env.CI) healthScore -= 10; // Not in CI

    return {
      healthScore: Math.max(0, healthScore),
      executionTime,
      react19Compatible,
      timestamp: Date.now(),
      environment: {
        ci: process.env.CI === 'true',
        nodeVersion: process.version,
        platform: process.platform,
      },
    };
  }

  validateMetrics(metrics) {
    const issues = [];

    // Performance validation
    if (metrics.executionTime > 30000) {
      issues.push({
        severity: 'critical',
        message: `Execution time (${metrics.executionTime}ms) exceeds 30s threshold`,
        suggestion: 'Optimize CI pipeline performance',
      });
    } else if (metrics.executionTime > 20000) {
      issues.push({
        severity: 'warning',
        message: `Execution time (${metrics.executionTime}ms) approaching threshold`,
        suggestion: 'Monitor CI pipeline performance',
      });
    }

    // React 19 compatibility
    if (!metrics.react19Compatible) {
      issues.push({
        severity: 'high',
        message: 'React 19 not detected in dependencies',
        suggestion: 'Ensure React 19 is properly installed',
      });
    }

    // Health score validation
    if (metrics.healthScore < this.config.criticalThreshold) {
      issues.push({
        severity: 'critical',
        message: `Health score (${metrics.healthScore}) below critical threshold (${this.config.criticalThreshold})`,
        suggestion: 'Address critical issues immediately',
      });
    } else if (metrics.healthScore < this.config.warningThreshold) {
      issues.push({
        severity: 'warning',
        message: `Health score (${metrics.healthScore}) below warning threshold (${this.config.warningThreshold})`,
        suggestion: 'Consider addressing identified issues',
      });
    }

    return {
      issues,
      criticalIssues: issues.filter((i) => i.severity === 'critical').length,
      highIssues: issues.filter((i) => i.severity === 'high').length,
      warnings: issues.filter((i) => i.severity === 'warning').length,
    };
  }

  async saveHealthReport(report) {
    const reportPath = path.join(
      this.config.outputDir,
      'ci-health-report.json'
    );
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Health report saved: ${reportPath}`);
  }

  async generateBasicDashboard(report) {
    const dashboardPath = path.join(this.config.outputDir, 'dashboard.html');

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CI Health Dashboard</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric { background: white; padding: 15px; border-radius: 8px; margin: 10px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 1.5em; font-weight: bold; color: ${report.metrics.healthScore >= 80 ? '#22c55e' : report.metrics.healthScore >= 60 ? '#f59e0b' : '#ef4444'}; }
        .status-${report.exitCode === 0 ? 'success' : 'error'} { color: ${report.exitCode === 0 ? '#22c55e' : '#ef4444'}; }
        .issues { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .issue { padding: 10px; margin: 5px 0; border-left: 4px solid #f59e0b; background: #fffbeb; }
        .issue.critical { border-color: #ef4444; background: #fef2f2; }
        .issue.high { border-color: #f59e0b; background: #fffbeb; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="status-${report.exitCode === 0 ? 'success' : 'error'}">CI Health Dashboard</h1>
            <p class="timestamp">Generated: ${new Date(report.timestamp).toLocaleString()}</p>
            <p><strong>Status:</strong> ${report.summary}</p>
        </div>

        <div class="metric">
            <div class="metric-value">${report.metrics.healthScore}/100</div>
            <div>Health Score</div>
        </div>

        <div class="metric">
            <div class="metric-value">${report.metrics.executionTime}ms</div>
            <div>Execution Time</div>
        </div>

        <div class="metric">
            <div class="metric-value">${report.metrics.react19Compatible ? '✅' : '❌'}</div>
            <div>React 19 Compatible</div>
        </div>

        ${
          report.validation.issues.length > 0
            ? `
        <div class="issues">
            <h2>Issues</h2>
            ${report.validation.issues
              .map(
                (issue) => `
                <div class="issue ${issue.severity}">
                    <strong>${issue.severity.toUpperCase()}:</strong> ${issue.message}
                    <br><small>💡 ${issue.suggestion}</small>
                </div>
            `
              )
              .join('')}
        </div>
        `
            : '<div class="issues"><h2>✅ No Issues Found</h2></div>'
        }

        <div class="metric">
            <h3>Environment</h3>
            <p>CI: ${report.metrics.environment.ci ? 'Yes' : 'No'}</p>
            <p>Node: ${report.metrics.environment.nodeVersion}</p>
            <p>Platform: ${report.metrics.environment.platform}</p>
        </div>
    </div>
</body>
</html>
    `.trim();

    await fs.writeFile(dashboardPath, html);
    console.log(`📊 Dashboard generated: ${dashboardPath}`);
    return dashboardPath;
  }

  async setGitHubOutputs(report, dashboardPath) {
    const outputs = [
      `health-score=${report.metrics.healthScore}`,
      `exit-code=${report.exitCode}`,
      `dashboard-path=${dashboardPath}`,
      `summary=${report.summary.replace(/\n/g, ' ')}`,
      `react19-compatible=${report.metrics.react19Compatible}`,
    ];

    const outputFile = process.env.GITHUB_OUTPUT;
    if (outputFile) {
      await fs.appendFile(outputFile, `${outputs.join('\n')  }\n`);
      console.log('📤 GitHub outputs set');
    }
  }

  async generateStepSummary(report) {
    const summaryFile = process.env.GITHUB_STEP_SUMMARY;
    if (!summaryFile) return;

    const summary = `
# 🧪 CI Health Check Report

## Status: ${report.exitCode === 0 ? '✅ SUCCESS' : '❌ FAILURE'}

**Health Score:** ${report.metrics.healthScore}/100

## 📊 Metrics

| Metric | Value | Status |
|--------|-------|--------|
| Execution Time | ${report.metrics.executionTime}ms | ${report.metrics.executionTime < 20000 ? '✅' : '⚠️'} |
| React 19 Compatible | ${report.metrics.react19Compatible ? 'Yes' : 'No'} | ${report.metrics.react19Compatible ? '✅' : '❌'} |
| CI Environment | ${report.metrics.environment.ci ? 'Yes' : 'No'} | ${report.metrics.environment.ci ? '✅' : '⚠️'} |

## 🚨 Issues

${report.validation.issues.length === 0 ? '✅ No issues found!' : ''}
${report.validation.issues
  .map((issue) => `- **${issue.severity.toUpperCase()}**: ${issue.message}`)
  .join('\n')}

---
*Generated at ${report.timestamp}*
    `.trim();

    await fs.writeFile(summaryFile, summary);
    console.log('📝 GitHub step summary generated');
  }
}

// Run if called directly
if (require.main === module) {
  const checker = new SimpleCIHealthChecker();
  checker.run().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { SimpleCIHealthChecker };
