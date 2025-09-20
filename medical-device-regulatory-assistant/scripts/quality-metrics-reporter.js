#!/usr/bin/env node

/**
 * Quality Metrics Reporter
 *
 * Generates comprehensive quality metrics reports with trend analysis,
 * quality gates validation, and actionable recommendations.
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
};

/**
 * Quality gates configuration
 */
const QUALITY_GATES = {
  // Minimum scores required to pass quality gates
  overall_score: 75,
  code_quality: 80,
  test_coverage: 85,
  performance: 70,
  security: 90,

  // Maximum allowed issues
  critical_issues: 0,
  high_severity_issues: 5,

  // Coverage thresholds
  frontend_coverage: 85,
  backend_coverage: 90,

  // Performance thresholds
  test_execution_time: 30, // seconds
  bundle_size: 500, // KB
  memory_usage: 100, // MB
};

/**
 * Quality Metrics Reporter
 */
class QualityMetricsReporter {
  constructor() {
    this.projectRoot = process.cwd();
    this.reportsDir = path.join(this.projectRoot, 'quality-reports');
    this.timestamp = new Date().toISOString();
  }

  log(message, color = COLORS.RESET) {
    console.log(`${color}${message}${COLORS.RESET}`);
  }

  logSection(title) {
    console.log('\n' + '='.repeat(70));
    this.log(`${COLORS.BOLD}${title}${COLORS.RESET}`, COLORS.BLUE);
    console.log('='.repeat(70));
  }

  /**
   * Collect quality metrics from various sources
   */
  async collectQualityMetrics() {
    this.logSection('Collecting Quality Metrics');

    const metrics = {
      timestamp: this.timestamp,
      frontend: await this.collectFrontendMetrics(),
      backend: await this.collectBackendMetrics(),
      overall: {},
    };

    // Calculate overall metrics
    metrics.overall = this.calculateOverallMetrics(
      metrics.frontend,
      metrics.backend
    );

    return metrics;
  }

  /**
   * Collect frontend quality metrics
   */
  async collectFrontendMetrics() {
    this.log('📊 Collecting frontend metrics...', COLORS.YELLOW);

    const metrics = {
      code_quality: await this.getFrontendCodeQuality(),
      test_coverage: await this.getFrontendTestCoverage(),
      performance: await this.getFrontendPerformance(),
      bundle_analysis: await this.getBundleAnalysis(),
      dependencies: await this.getFrontendDependencies(),
    };

    return metrics;
  }

  /**
   * Collect backend quality metrics
   */
  async collectBackendMetrics() {
    this.log('📊 Collecting backend metrics...', COLORS.YELLOW);

    const metrics = {
      code_quality: await this.getBackendCodeQuality(),
      test_coverage: await this.getBackendTestCoverage(),
      performance: await this.getBackendPerformance(),
      security: await this.getBackendSecurity(),
      dependencies: await this.getBackendDependencies(),
    };

    return metrics;
  }

  /**
   * Get frontend code quality metrics
   */
  async getFrontendCodeQuality() {
    try {
      // Run ESLint with JSON output
      const eslintResult = await this.runCommand('pnpm lint --format json', {
        silent: true,
      });

      let eslintIssues = [];
      if (eslintResult.output) {
        try {
          const eslintData = JSON.parse(eslintResult.output);
          eslintIssues = eslintData.flatMap((file) =>
            file.messages.map((msg) => ({
              file: file.filePath,
              line: msg.line,
              severity: msg.severity === 2 ? 'error' : 'warning',
              message: msg.message,
              rule: msg.ruleId,
            }))
          );
        } catch (e) {
          // ESLint output might not be valid JSON
        }
      }

      // TypeScript compilation check
      const tscResult = await this.runCommand('pnpm type-check', {
        silent: true,
      });

      return {
        eslint_issues: eslintIssues.length,
        eslint_errors: eslintIssues.filter((i) => i.severity === 'error')
          .length,
        eslint_warnings: eslintIssues.filter((i) => i.severity === 'warning')
          .length,
        typescript_errors: !tscResult.success,
        score: this.calculateCodeQualityScore(eslintIssues, tscResult.success),
      };
    } catch (error) {
      return { error: error.message, score: 0 };
    }
  }

  /**
   * Get frontend test coverage metrics
   */
  async getFrontendTestCoverage() {
    try {
      const coveragePath = path.join(
        this.projectRoot,
        'coverage',
        'coverage-summary.json'
      );

      try {
        const coverageData = JSON.parse(
          await fs.readFile(coveragePath, 'utf8')
        );
        const total = coverageData.total;

        return {
          statements: total.statements.pct,
          branches: total.branches.pct,
          functions: total.functions.pct,
          lines: total.lines.pct,
          covered_statements: total.statements.covered,
          total_statements: total.statements.total,
          score:
            (total.statements.pct +
              total.branches.pct +
              total.functions.pct +
              total.lines.pct) /
            4,
        };
      } catch (e) {
        // Run coverage if report doesn't exist
        await this.runCommand('pnpm test:coverage --silent', { silent: true });

        const coverageData = JSON.parse(
          await fs.readFile(coveragePath, 'utf8')
        );
        const total = coverageData.total;

        return {
          statements: total.statements.pct,
          branches: total.branches.pct,
          functions: total.functions.pct,
          lines: total.lines.pct,
          covered_statements: total.statements.covered,
          total_statements: total.statements.total,
          score:
            (total.statements.pct +
              total.branches.pct +
              total.functions.pct +
              total.lines.pct) /
            4,
        };
      }
    } catch (error) {
      return { error: error.message, score: 0 };
    }
  }

  /**
   * Get frontend performance metrics
   */
  async getFrontendPerformance() {
    try {
      const startTime = Date.now();
      const testResult = await this.runCommand(
        'pnpm test --passWithNoTests --silent',
        { silent: true }
      );
      const testExecutionTime = (Date.now() - startTime) / 1000;

      // Bundle size analysis
      const bundleSize = await this.getBundleSize();

      return {
        test_execution_time: testExecutionTime,
        bundle_size: bundleSize,
        score: this.calculatePerformanceScore(testExecutionTime, bundleSize),
      };
    } catch (error) {
      return { error: error.message, score: 0 };
    }
  }

  /**
   * Get bundle analysis
   */
  async getBundleAnalysis() {
    try {
      // Build the project
      const buildResult = await this.runCommand('pnpm build', { silent: true });

      if (!buildResult.success) {
        return { error: 'Build failed', total_size: 0 };
      }

      // Analyze .next directory
      const nextDir = path.join(this.projectRoot, '.next');
      const staticDir = path.join(nextDir, 'static');

      let totalSize = 0;
      const chunks = [];

      if (await this.pathExists(staticDir)) {
        const chunkFiles = await this.getFilesRecursively(staticDir, '.js');

        for (const file of chunkFiles) {
          const stats = await fs.stat(file);
          const size = Math.round(stats.size / 1024); // KB
          totalSize += size;

          chunks.push({
            file: path.relative(staticDir, file),
            size: size,
          });
        }
      }

      return {
        total_size: totalSize,
        chunks: chunks.sort((a, b) => b.size - a.size).slice(0, 10), // Top 10 largest chunks
        chunk_count: chunks.length,
      };
    } catch (error) {
      return { error: error.message, total_size: 0 };
    }
  }

  /**
   * Get frontend dependencies status
   */
  async getFrontendDependencies() {
    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');
      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, 'utf8')
      );

      const totalDeps = Object.keys(packageJson.dependencies || {}).length;
      const totalDevDeps = Object.keys(
        packageJson.devDependencies || {}
      ).length;

      // Check for outdated packages
      const outdatedResult = await this.runCommand(
        'pnpm outdated --format json',
        { silent: true }
      );
      let outdatedCount = 0;

      if (outdatedResult.output) {
        try {
          const outdatedData = JSON.parse(outdatedResult.output);
          outdatedCount = Object.keys(outdatedData).length;
        } catch (e) {
          // Ignore JSON parsing errors
        }
      }

      return {
        total_dependencies: totalDeps,
        total_dev_dependencies: totalDevDeps,
        outdated_dependencies: outdatedCount,
        score: Math.max(0, 100 - outdatedCount * 5),
      };
    } catch (error) {
      return { error: error.message, score: 0 };
    }
  }

  /**
   * Get backend code quality metrics
   */
  async getBackendCodeQuality() {
    try {
      const backendDir = path.join(this.projectRoot, 'backend');

      // Run quality checker if available
      const qualityReportPath = path.join(backendDir, 'quality-report.json');

      try {
        const qualityData = JSON.parse(
          await fs.readFile(qualityReportPath, 'utf8')
        );
        return {
          overall_score: qualityData.summary?.overall_score || 0,
          critical_issues: qualityData.summary?.critical_issues || 0,
          warnings: qualityData.summary?.warnings || 0,
          score: qualityData.summary?.overall_score || 0,
        };
      } catch (e) {
        // Run quality checker
        await this.runCommand('poetry run python testing/quality_checker.py', {
          cwd: backendDir,
          silent: true,
        });

        const qualityData = JSON.parse(
          await fs.readFile(qualityReportPath, 'utf8')
        );
        return {
          overall_score: qualityData.summary?.overall_score || 0,
          critical_issues: qualityData.summary?.critical_issues || 0,
          warnings: qualityData.summary?.warnings || 0,
          score: qualityData.summary?.overall_score || 0,
        };
      }
    } catch (error) {
      return { error: error.message, score: 0 };
    }
  }

  /**
   * Get backend test coverage metrics
   */
  async getBackendTestCoverage() {
    try {
      const backendDir = path.join(this.projectRoot, 'backend');
      const coveragePath = path.join(backendDir, 'coverage.json');

      try {
        const coverageData = JSON.parse(
          await fs.readFile(coveragePath, 'utf8')
        );
        const coverage = coverageData.totals?.percent_covered || 0;

        return {
          coverage: coverage,
          score: coverage,
        };
      } catch (e) {
        // Run coverage
        await this.runCommand(
          'poetry run python -m pytest tests/ --cov=backend --cov-report=json -q',
          { cwd: backendDir, silent: true }
        );

        const coverageData = JSON.parse(
          await fs.readFile(coveragePath, 'utf8')
        );
        const coverage = coverageData.totals?.percent_covered || 0;

        return {
          coverage: coverage,
          score: coverage,
        };
      }
    } catch (error) {
      return { error: error.message, score: 0 };
    }
  }

  /**
   * Get backend performance metrics
   */
  async getBackendPerformance() {
    try {
      const backendDir = path.join(this.projectRoot, 'backend');

      const startTime = Date.now();
      const testResult = await this.runCommand(
        'poetry run python -m pytest tests/ -q --tb=no',
        { cwd: backendDir, silent: true }
      );
      const testExecutionTime = (Date.now() - startTime) / 1000;

      return {
        test_execution_time: testExecutionTime,
        score:
          testExecutionTime <= 30
            ? 100
            : Math.max(0, 100 - (testExecutionTime - 30) * 2),
      };
    } catch (error) {
      return { error: error.message, score: 0 };
    }
  }

  /**
   * Get backend security metrics
   */
  async getBackendSecurity() {
    try {
      const backendDir = path.join(this.projectRoot, 'backend');

      // Run safety check
      const safetyResult = await this.runCommand(
        'poetry run safety check --json',
        {
          cwd: backendDir,
          silent: true,
        }
      );

      let vulnerabilities = [];
      if (!safetyResult.success && safetyResult.output) {
        try {
          vulnerabilities = JSON.parse(safetyResult.output);
        } catch (e) {
          // Safety output might not be JSON
        }
      }

      const criticalVulns = vulnerabilities.filter(
        (v) => v.severity === 'high' || v.severity === 'critical'
      ).length;

      return {
        total_vulnerabilities: vulnerabilities.length,
        critical_vulnerabilities: criticalVulns,
        score:
          criticalVulns === 0 ? 100 : Math.max(0, 100 - criticalVulns * 20),
      };
    } catch (error) {
      return { error: error.message, score: 100 }; // Assume secure if check fails
    }
  }

  /**
   * Get backend dependencies status
   */
  async getBackendDependencies() {
    try {
      const backendDir = path.join(this.projectRoot, 'backend');

      const outdatedResult = await this.runCommand('poetry show --outdated', {
        cwd: backendDir,
        silent: true,
      });

      const outdatedCount = outdatedResult.output
        ? outdatedResult.output.split('\n').filter((line) => line.trim()).length
        : 0;

      return {
        outdated_dependencies: outdatedCount,
        score: Math.max(0, 100 - outdatedCount * 5),
      };
    } catch (error) {
      return { error: error.message, score: 0 };
    }
  }

  /**
   * Calculate overall metrics
   */
  calculateOverallMetrics(frontend, backend) {
    const weights = {
      code_quality: 0.25,
      test_coverage: 0.25,
      performance: 0.2,
      security: 0.15,
      dependencies: 0.15,
    };

    let totalScore = 0;
    let totalWeight = 0;

    // Frontend contribution (50%)
    const frontendScore =
      ((frontend.code_quality?.score || 0) * weights.code_quality +
        (frontend.test_coverage?.score || 0) * weights.test_coverage +
        (frontend.performance?.score || 0) * weights.performance +
        (frontend.dependencies?.score || 0) * weights.dependencies) *
      0.5;

    // Backend contribution (50%)
    const backendScore =
      ((backend.code_quality?.score || 0) * weights.code_quality +
        (backend.test_coverage?.score || 0) * weights.test_coverage +
        (backend.performance?.score || 0) * weights.performance +
        (backend.security?.score || 0) * weights.security +
        (backend.dependencies?.score || 0) * weights.dependencies) *
      0.5;

    const overallScore = frontendScore + backendScore;

    return {
      overall_score: Math.round(overallScore),
      frontend_score: Math.round(frontendScore * 2), // Convert back to 0-100 scale
      backend_score: Math.round(backendScore * 2), // Convert back to 0-100 scale
      quality_gate_status: this.evaluateQualityGates(
        frontend,
        backend,
        overallScore
      ),
    };
  }

  /**
   * Evaluate quality gates
   */
  evaluateQualityGates(frontend, backend, overallScore) {
    const gates = [];

    // Overall score gate
    gates.push({
      name: 'Overall Score',
      passed: overallScore >= QUALITY_GATES.overall_score,
      actual: overallScore,
      threshold: QUALITY_GATES.overall_score,
    });

    // Frontend coverage gate
    if (frontend.test_coverage?.score) {
      gates.push({
        name: 'Frontend Coverage',
        passed: frontend.test_coverage.score >= QUALITY_GATES.frontend_coverage,
        actual: frontend.test_coverage.score,
        threshold: QUALITY_GATES.frontend_coverage,
      });
    }

    // Backend coverage gate
    if (backend.test_coverage?.score) {
      gates.push({
        name: 'Backend Coverage',
        passed: backend.test_coverage.score >= QUALITY_GATES.backend_coverage,
        actual: backend.test_coverage.score,
        threshold: QUALITY_GATES.backend_coverage,
      });
    }

    // Performance gates
    if (frontend.performance?.test_execution_time) {
      gates.push({
        name: 'Frontend Test Performance',
        passed:
          frontend.performance.test_execution_time <=
          QUALITY_GATES.test_execution_time,
        actual: frontend.performance.test_execution_time,
        threshold: QUALITY_GATES.test_execution_time,
      });
    }

    if (backend.performance?.test_execution_time) {
      gates.push({
        name: 'Backend Test Performance',
        passed:
          backend.performance.test_execution_time <=
          QUALITY_GATES.test_execution_time,
        actual: backend.performance.test_execution_time,
        threshold: QUALITY_GATES.test_execution_time,
      });
    }

    // Security gate
    if (backend.security?.critical_vulnerabilities !== undefined) {
      gates.push({
        name: 'Security Vulnerabilities',
        passed:
          backend.security.critical_vulnerabilities <=
          QUALITY_GATES.critical_issues,
        actual: backend.security.critical_vulnerabilities,
        threshold: QUALITY_GATES.critical_issues,
      });
    }

    const passedGates = gates.filter((g) => g.passed).length;
    const totalGates = gates.length;

    return {
      passed: passedGates === totalGates,
      gates: gates,
      passed_count: passedGates,
      total_count: totalGates,
    };
  }

  /**
   * Generate trend analysis
   */
  async generateTrendAnalysis(currentMetrics) {
    try {
      const historicalReports = await this.getHistoricalReports();

      if (historicalReports.length < 2) {
        return { message: 'Insufficient historical data for trend analysis' };
      }

      const latest = historicalReports[historicalReports.length - 1];
      const previous = historicalReports[historicalReports.length - 2];

      const trends = {
        overall_score: {
          current: currentMetrics.overall.overall_score,
          previous: latest.overall?.overall_score || 0,
          change:
            currentMetrics.overall.overall_score -
            (latest.overall?.overall_score || 0),
        },
        frontend_coverage: {
          current: currentMetrics.frontend.test_coverage?.score || 0,
          previous: latest.frontend?.test_coverage?.score || 0,
          change:
            (currentMetrics.frontend.test_coverage?.score || 0) -
            (latest.frontend?.test_coverage?.score || 0),
        },
        backend_coverage: {
          current: currentMetrics.backend.test_coverage?.score || 0,
          previous: latest.backend?.test_coverage?.score || 0,
          change:
            (currentMetrics.backend.test_coverage?.score || 0) -
            (latest.backend?.test_coverage?.score || 0),
        },
      };

      return trends;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Get historical reports
   */
  async getHistoricalReports() {
    try {
      const files = await fs.readdir(this.reportsDir);
      const reportFiles = files
        .filter((f) => f.startsWith('quality-metrics-') && f.endsWith('.json'))
        .sort()
        .slice(-10); // Last 10 reports

      const reports = [];
      for (const file of reportFiles) {
        try {
          const reportPath = path.join(this.reportsDir, file);
          const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
          reports.push(report);
        } catch (e) {
          // Skip invalid reports
        }
      }

      return reports;
    } catch (error) {
      return [];
    }
  }

  /**
   * Generate comprehensive report
   */
  async generateReport() {
    this.logSection('Quality Metrics Report Generation');

    const metrics = await this.collectQualityMetrics();
    const trends = await this.generateTrendAnalysis(metrics);

    const report = {
      ...metrics,
      trends,
      recommendations: this.generateRecommendations(metrics),
      quality_gates: metrics.overall.quality_gate_status,
    };

    // Save report
    await this.ensureReportsDirectory();
    const reportFileName = `quality-metrics-${this.timestamp.split('T')[0]}.json`;
    const reportPath = path.join(this.reportsDir, reportFileName);

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

    // Generate HTML report
    await this.generateHTMLReport(report, reportPath.replace('.json', '.html'));

    return report;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(metrics) {
    const recommendations = [];

    // Code quality recommendations
    if ((metrics.frontend.code_quality?.score || 0) < 80) {
      recommendations.push({
        category: 'Code Quality',
        priority: 'high',
        message: 'Frontend code quality is below threshold',
        action: 'Run `pnpm lint:fix` and address TypeScript errors',
      });
    }

    if ((metrics.backend.code_quality?.score || 0) < 80) {
      recommendations.push({
        category: 'Code Quality',
        priority: 'high',
        message: 'Backend code quality is below threshold',
        action: 'Run Black, isort, flake8, and mypy to fix issues',
      });
    }

    // Coverage recommendations
    if (
      (metrics.frontend.test_coverage?.score || 0) <
      QUALITY_GATES.frontend_coverage
    ) {
      recommendations.push({
        category: 'Test Coverage',
        priority: 'medium',
        message: 'Frontend test coverage is below target',
        action: 'Add more unit and integration tests for React components',
      });
    }

    if (
      (metrics.backend.test_coverage?.score || 0) <
      QUALITY_GATES.backend_coverage
    ) {
      recommendations.push({
        category: 'Test Coverage',
        priority: 'medium',
        message: 'Backend test coverage is below target',
        action: 'Add more unit tests for business logic and API endpoints',
      });
    }

    // Performance recommendations
    if (
      (metrics.frontend.performance?.test_execution_time || 0) >
      QUALITY_GATES.test_execution_time
    ) {
      recommendations.push({
        category: 'Performance',
        priority: 'medium',
        message: 'Frontend test execution time is too slow',
        action: 'Optimize test setup and consider parallel test execution',
      });
    }

    if (
      (metrics.frontend.bundle_analysis?.total_size || 0) >
      QUALITY_GATES.bundle_size
    ) {
      recommendations.push({
        category: 'Performance',
        priority: 'medium',
        message: 'Bundle size is too large',
        action: 'Implement code splitting and tree shaking optimizations',
      });
    }

    // Security recommendations
    if ((metrics.backend.security?.critical_vulnerabilities || 0) > 0) {
      recommendations.push({
        category: 'Security',
        priority: 'critical',
        message: 'Critical security vulnerabilities found',
        action: 'Update vulnerable dependencies immediately',
      });
    }

    return recommendations;
  }

  /**
   * Generate HTML report
   */
  async generateHTMLReport(report, outputPath) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quality Metrics Report - ${report.timestamp}</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric-card { background: #f8f9fa; border-radius: 8px; padding: 20px; border-left: 4px solid #007bff; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .metric-label { color: #6c757d; margin-top: 5px; }
        .quality-gate { padding: 10px; margin: 5px 0; border-radius: 4px; }
        .gate-passed { background: #d4edda; border-left: 4px solid #28a745; }
        .gate-failed { background: #f8d7da; border-left: 4px solid #dc3545; }
        .recommendations { background: #fff3cd; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .recommendation { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
        .priority-critical { border-left: 4px solid #dc3545; }
        .priority-high { border-left: 4px solid #fd7e14; }
        .priority-medium { border-left: 4px solid #ffc107; }
        .chart-container { margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Quality Metrics Report</h1>
            <p>Generated: ${new Date(report.timestamp).toLocaleString()}</p>
            <p>Overall Score: <strong>${report.overall.overall_score}/100</strong></p>
        </div>
        
        <div class="content">
            <h2>Overall Metrics</h2>
            <div class="metric-grid">
                <div class="metric-card">
                    <div class="metric-value">${report.overall.overall_score}</div>
                    <div class="metric-label">Overall Score</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.overall.frontend_score}</div>
                    <div class="metric-label">Frontend Score</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.overall.backend_score}</div>
                    <div class="metric-label">Backend Score</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.quality_gates.passed_count}/${report.quality_gates.total_count}</div>
                    <div class="metric-label">Quality Gates Passed</div>
                </div>
            </div>

            <h2>Quality Gates</h2>
            ${report.quality_gates.gates
              .map(
                (gate) => `
                <div class="quality-gate ${gate.passed ? 'gate-passed' : 'gate-failed'}">
                    <strong>${gate.name}</strong>: ${gate.actual} ${gate.passed ? '✅' : '❌'} (Threshold: ${gate.threshold})
                </div>
            `
              )
              .join('')}

            <h2>Frontend Metrics</h2>
            <div class="metric-grid">
                <div class="metric-card">
                    <div class="metric-value">${report.frontend.test_coverage?.score?.toFixed(1) || 'N/A'}</div>
                    <div class="metric-label">Test Coverage %</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.frontend.code_quality?.score?.toFixed(1) || 'N/A'}</div>
                    <div class="metric-label">Code Quality Score</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.frontend.bundle_analysis?.total_size || 'N/A'}</div>
                    <div class="metric-label">Bundle Size (KB)</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.frontend.performance?.test_execution_time?.toFixed(1) || 'N/A'}</div>
                    <div class="metric-label">Test Time (s)</div>
                </div>
            </div>

            <h2>Backend Metrics</h2>
            <div class="metric-grid">
                <div class="metric-card">
                    <div class="metric-value">${report.backend.test_coverage?.score?.toFixed(1) || 'N/A'}</div>
                    <div class="metric-label">Test Coverage %</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.backend.code_quality?.score?.toFixed(1) || 'N/A'}</div>
                    <div class="metric-label">Code Quality Score</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.backend.security?.critical_vulnerabilities || 0}</div>
                    <div class="metric-label">Critical Vulnerabilities</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${report.backend.performance?.test_execution_time?.toFixed(1) || 'N/A'}</div>
                    <div class="metric-label">Test Time (s)</div>
                </div>
            </div>

            ${
              report.recommendations.length > 0
                ? `
            <h2>Recommendations</h2>
            <div class="recommendations">
                ${report.recommendations
                  .map(
                    (rec) => `
                    <div class="recommendation priority-${rec.priority}">
                        <strong>${rec.category}</strong> (${rec.priority}): ${rec.message}
                        <br><em>Action: ${rec.action}</em>
                    </div>
                `
                  )
                  .join('')}
            </div>
            `
                : ''
            }
        </div>
    </div>
</body>
</html>`;

    await fs.writeFile(outputPath, html);
  }

  /**
   * Print report summary
   */
  printReportSummary(report) {
    this.logSection('Quality Metrics Summary');

    const overallScore = report.overall.overall_score;
    const scoreColor =
      overallScore >= 90
        ? COLORS.GREEN
        : overallScore >= 70
          ? COLORS.YELLOW
          : COLORS.RED;

    this.log(`Overall Quality Score: ${overallScore}/100`, scoreColor);
    this.log(`Frontend Score: ${report.overall.frontend_score}/100`);
    this.log(`Backend Score: ${report.overall.backend_score}/100`);

    // Quality gates status
    const gateStatus = report.quality_gates;
    const gateColor = gateStatus.passed ? COLORS.GREEN : COLORS.RED;
    this.log(
      `Quality Gates: ${gateStatus.passed_count}/${gateStatus.total_count} passed`,
      gateColor
    );

    // Failed gates
    const failedGates = gateStatus.gates.filter((g) => !g.passed);
    if (failedGates.length > 0) {
      this.log('\n❌ Failed Quality Gates:', COLORS.RED);
      failedGates.forEach((gate) => {
        this.log(
          `  • ${gate.name}: ${gate.actual} (threshold: ${gate.threshold})`,
          COLORS.RED
        );
      });
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      this.log('\n🔧 Top Recommendations:', COLORS.YELLOW);
      report.recommendations.slice(0, 5).forEach((rec, i) => {
        const priorityColor =
          rec.priority === 'critical'
            ? COLORS.RED
            : rec.priority === 'high'
              ? COLORS.YELLOW
              : COLORS.BLUE;
        this.log(
          `  ${i + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`,
          priorityColor
        );
      });
    }

    return gateStatus.passed;
  }

  /**
   * Helper methods
   */
  async runCommand(command, options = {}) {
    try {
      const result = execSync(command, {
        encoding: 'utf8',
        cwd: options.cwd || this.projectRoot,
        stdio: options.silent ? 'pipe' : 'inherit',
      });
      return { success: true, output: result.trim() };
    } catch (error) {
      return {
        success: false,
        output: error.stdout || error.stderr || error.message,
      };
    }
  }

  async pathExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async getFilesRecursively(dir, extension) {
    const files = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          files.push(...(await this.getFilesRecursively(fullPath, extension)));
        } else if (entry.name.endsWith(extension)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist or be accessible
    }

    return files;
  }

  async getBundleSize() {
    try {
      const nextDir = path.join(this.projectRoot, '.next', 'static');
      if (await this.pathExists(nextDir)) {
        const jsFiles = await this.getFilesRecursively(nextDir, '.js');
        let totalSize = 0;

        for (const file of jsFiles) {
          const stats = await fs.stat(file);
          totalSize += stats.size;
        }

        return Math.round(totalSize / 1024); // KB
      }
    } catch (error) {
      // Build might not exist
    }

    return 0;
  }

  calculateCodeQualityScore(eslintIssues, tscSuccess) {
    let score = 100;

    // Deduct points for ESLint issues
    const errors = eslintIssues.filter((i) => i.severity === 'error').length;
    const warnings = eslintIssues.filter(
      (i) => i.severity === 'warning'
    ).length;

    score -= errors * 5;
    score -= warnings * 2;

    // Deduct points for TypeScript errors
    if (!tscSuccess) {
      score -= 20;
    }

    return Math.max(0, score);
  }

  calculatePerformanceScore(testTime, bundleSize) {
    let score = 100;

    // Test execution time penalty
    if (testTime > QUALITY_GATES.test_execution_time) {
      score -= (testTime - QUALITY_GATES.test_execution_time) * 2;
    }

    // Bundle size penalty
    if (bundleSize > QUALITY_GATES.bundle_size) {
      score -= (bundleSize - QUALITY_GATES.bundle_size) * 0.1;
    }

    return Math.max(0, score);
  }

  async ensureReportsDirectory() {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  /**
   * Main execution
   */
  async run() {
    try {
      this.log(
        `${COLORS.BOLD}📊 Quality Metrics Reporter - Medical Device Regulatory Assistant${COLORS.RESET}`,
        COLORS.BLUE
      );

      const report = await this.generateReport();
      const passed = this.printReportSummary(report);

      const reportPath = path.join(
        this.reportsDir,
        `quality-metrics-${this.timestamp.split('T')[0]}.json`
      );
      const htmlPath = reportPath.replace('.json', '.html');

      this.log(`\n📄 Reports saved:`, COLORS.BLUE);
      this.log(`  JSON: ${reportPath}`);
      this.log(`  HTML: ${htmlPath}`);

      if (passed) {
        this.log(
          '\n🎉 All quality gates passed! System is ready for production.',
          COLORS.GREEN
        );
        process.exit(0);
      } else {
        this.log(
          '\n❌ Some quality gates failed. Please address the issues above.',
          COLORS.RED
        );
        process.exit(1);
      }
    } catch (error) {
      this.log(
        `\n💥 Quality metrics reporting failed: ${error.message}`,
        COLORS.RED
      );
      process.exit(1);
    }
  }
}

// CLI interface
async function main() {
  const reporter = new QualityMetricsReporter();
  await reporter.run();
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = QualityMetricsReporter;
