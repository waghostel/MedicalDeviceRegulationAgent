#!/usr/bin/env node

/**
 * Regression Detection System
 *
 * Compares current quality metrics with previous builds to detect
 * quality regressions and performance degradations.
 */

const fs = require('fs').promises;
const path = require('path');

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
};

/**
 * Regression thresholds
 */
const REGRESSION_THRESHOLDS = {
  overall_score: -5, // -5 points or more is a regression
  test_coverage: -3, // -3% coverage or more is a regression
  performance_time: 5, // +5 seconds or more is a regression
  bundle_size: 50, // +50KB or more is a regression
  critical_issues: 1, // Any increase in critical issues is a regression
  security_vulnerabilities: 1, // Any increase in vulnerabilities is a regression
};

/**
 * Regression Detector
 */
class RegressionDetector {
  constructor() {
    this.projectRoot = process.cwd();
    this.reportsDir = path.join(this.projectRoot, 'quality-reports');
    this.previousReportsDir = path.join(this.projectRoot, 'previous-reports');
    this.regressions = [];
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
   * Load current quality report
   */
  async loadCurrentReport() {
    try {
      const files = await fs.readdir(this.reportsDir);
      const reportFiles = files
        .filter((f) => f.startsWith('quality-metrics-') && f.endsWith('.json'))
        .sort()
        .reverse(); // Most recent first

      if (reportFiles.length === 0) {
        throw new Error('No current quality reports found');
      }

      const reportPath = path.join(this.reportsDir, reportFiles[0]);
      const reportContent = await fs.readFile(reportPath, 'utf8');
      return JSON.parse(reportContent);
    } catch (error) {
      throw new Error(`Failed to load current report: ${error.message}`);
    }
  }

  /**
   * Load previous quality report
   */
  async loadPreviousReport() {
    try {
      // Try to load from previous-reports directory (CI artifact)
      if (await this.pathExists(this.previousReportsDir)) {
        const files = await fs.readdir(this.previousReportsDir);
        const reportFiles = files
          .filter(
            (f) => f.startsWith('quality-metrics-') && f.endsWith('.json')
          )
          .sort()
          .reverse();

        if (reportFiles.length > 0) {
          const reportPath = path.join(this.previousReportsDir, reportFiles[0]);
          const reportContent = await fs.readFile(reportPath, 'utf8');
          return JSON.parse(reportContent);
        }
      }

      // Fallback: try to find previous report in current reports directory
      const files = await fs.readdir(this.reportsDir);
      const reportFiles = files
        .filter((f) => f.startsWith('quality-metrics-') && f.endsWith('.json'))
        .sort()
        .reverse();

      if (reportFiles.length < 2) {
        return null; // No previous report available
      }

      const reportPath = path.join(this.reportsDir, reportFiles[1]); // Second most recent
      const reportContent = await fs.readFile(reportPath, 'utf8');
      return JSON.parse(reportContent);
    } catch (error) {
      this.log(
        `Warning: Could not load previous report: ${error.message}`,
        COLORS.YELLOW
      );
      return null;
    }
  }

  /**
   * Compare overall quality scores
   */
  compareOverallScores(current, previous) {
    const currentScore = current.overall?.overall_score || 0;
    const previousScore = previous.overall?.overall_score || 0;
    const difference = currentScore - previousScore;

    if (difference <= REGRESSION_THRESHOLDS.overall_score) {
      this.regressions.push({
        type: 'overall_score',
        severity: 'high',
        message: 'Overall quality score regression detected',
        current: currentScore,
        previous: previousScore,
        difference: difference,
        threshold: REGRESSION_THRESHOLDS.overall_score,
      });
    }

    return {
      current: currentScore,
      previous: previousScore,
      difference: difference,
      regression: difference <= REGRESSION_THRESHOLDS.overall_score,
    };
  }

  /**
   * Compare test coverage
   */
  compareTestCoverage(current, previous) {
    const comparisons = [];

    // Frontend coverage
    const currentFrontendCoverage = current.frontend?.test_coverage?.score || 0;
    const previousFrontendCoverage =
      previous.frontend?.test_coverage?.score || 0;
    const frontendDifference =
      currentFrontendCoverage - previousFrontendCoverage;

    if (frontendDifference <= REGRESSION_THRESHOLDS.test_coverage) {
      this.regressions.push({
        type: 'frontend_coverage',
        severity: 'medium',
        message: 'Frontend test coverage regression detected',
        current: currentFrontendCoverage,
        previous: previousFrontendCoverage,
        difference: frontendDifference,
        threshold: REGRESSION_THRESHOLDS.test_coverage,
      });
    }

    comparisons.push({
      name: 'Frontend Coverage',
      current: currentFrontendCoverage,
      previous: previousFrontendCoverage,
      difference: frontendDifference,
      regression: frontendDifference <= REGRESSION_THRESHOLDS.test_coverage,
    });

    // Backend coverage
    const currentBackendCoverage = current.backend?.test_coverage?.score || 0;
    const previousBackendCoverage = previous.backend?.test_coverage?.score || 0;
    const backendDifference = currentBackendCoverage - previousBackendCoverage;

    if (backendDifference <= REGRESSION_THRESHOLDS.test_coverage) {
      this.regressions.push({
        type: 'backend_coverage',
        severity: 'medium',
        message: 'Backend test coverage regression detected',
        current: currentBackendCoverage,
        previous: previousBackendCoverage,
        difference: backendDifference,
        threshold: REGRESSION_THRESHOLDS.test_coverage,
      });
    }

    comparisons.push({
      name: 'Backend Coverage',
      current: currentBackendCoverage,
      previous: previousBackendCoverage,
      difference: backendDifference,
      regression: backendDifference <= REGRESSION_THRESHOLDS.test_coverage,
    });

    return comparisons;
  }

  /**
   * Compare performance metrics
   */
  comparePerformanceMetrics(current, previous) {
    const comparisons = [];

    // Frontend test execution time
    const currentFrontendTime =
      current.frontend?.performance?.test_execution_time || 0;
    const previousFrontendTime =
      previous.frontend?.performance?.test_execution_time || 0;
    const frontendTimeDifference = currentFrontendTime - previousFrontendTime;

    if (frontendTimeDifference >= REGRESSION_THRESHOLDS.performance_time) {
      this.regressions.push({
        type: 'frontend_performance',
        severity: 'medium',
        message: 'Frontend test performance regression detected',
        current: currentFrontendTime,
        previous: previousFrontendTime,
        difference: frontendTimeDifference,
        threshold: REGRESSION_THRESHOLDS.performance_time,
      });
    }

    comparisons.push({
      name: 'Frontend Test Time',
      current: currentFrontendTime,
      previous: previousFrontendTime,
      difference: frontendTimeDifference,
      unit: 's',
      regression:
        frontendTimeDifference >= REGRESSION_THRESHOLDS.performance_time,
    });

    // Backend test execution time
    const currentBackendTime =
      current.backend?.performance?.test_execution_time || 0;
    const previousBackendTime =
      previous.backend?.performance?.test_execution_time || 0;
    const backendTimeDifference = currentBackendTime - previousBackendTime;

    if (backendTimeDifference >= REGRESSION_THRESHOLDS.performance_time) {
      this.regressions.push({
        type: 'backend_performance',
        severity: 'medium',
        message: 'Backend test performance regression detected',
        current: currentBackendTime,
        previous: previousBackendTime,
        difference: backendTimeDifference,
        threshold: REGRESSION_THRESHOLDS.performance_time,
      });
    }

    comparisons.push({
      name: 'Backend Test Time',
      current: currentBackendTime,
      previous: previousBackendTime,
      difference: backendTimeDifference,
      unit: 's',
      regression:
        backendTimeDifference >= REGRESSION_THRESHOLDS.performance_time,
    });

    // Bundle size
    const currentBundleSize =
      current.frontend?.bundle_analysis?.total_size || 0;
    const previousBundleSize =
      previous.frontend?.bundle_analysis?.total_size || 0;
    const bundleSizeDifference = currentBundleSize - previousBundleSize;

    if (bundleSizeDifference >= REGRESSION_THRESHOLDS.bundle_size) {
      this.regressions.push({
        type: 'bundle_size',
        severity: 'medium',
        message: 'Bundle size regression detected',
        current: currentBundleSize,
        previous: previousBundleSize,
        difference: bundleSizeDifference,
        threshold: REGRESSION_THRESHOLDS.bundle_size,
      });
    }

    comparisons.push({
      name: 'Bundle Size',
      current: currentBundleSize,
      previous: previousBundleSize,
      difference: bundleSizeDifference,
      unit: 'KB',
      regression: bundleSizeDifference >= REGRESSION_THRESHOLDS.bundle_size,
    });

    return comparisons;
  }

  /**
   * Compare security metrics
   */
  compareSecurityMetrics(current, previous) {
    const currentVulns =
      current.backend?.security?.critical_vulnerabilities || 0;
    const previousVulns =
      previous.backend?.security?.critical_vulnerabilities || 0;
    const difference = currentVulns - previousVulns;

    if (difference >= REGRESSION_THRESHOLDS.security_vulnerabilities) {
      this.regressions.push({
        type: 'security_vulnerabilities',
        severity: 'critical',
        message: 'Security vulnerability regression detected',
        current: currentVulns,
        previous: previousVulns,
        difference: difference,
        threshold: REGRESSION_THRESHOLDS.security_vulnerabilities,
      });
    }

    return {
      name: 'Critical Vulnerabilities',
      current: currentVulns,
      previous: previousVulns,
      difference: difference,
      regression: difference >= REGRESSION_THRESHOLDS.security_vulnerabilities,
    };
  }

  /**
   * Compare code quality metrics
   */
  compareCodeQualityMetrics(current, previous) {
    const comparisons = [];

    // Frontend code quality
    const currentFrontendQuality = current.frontend?.code_quality?.score || 0;
    const previousFrontendQuality = previous.frontend?.code_quality?.score || 0;
    const frontendQualityDifference =
      currentFrontendQuality - previousFrontendQuality;

    if (frontendQualityDifference <= REGRESSION_THRESHOLDS.overall_score) {
      this.regressions.push({
        type: 'frontend_code_quality',
        severity: 'medium',
        message: 'Frontend code quality regression detected',
        current: currentFrontendQuality,
        previous: previousFrontendQuality,
        difference: frontendQualityDifference,
        threshold: REGRESSION_THRESHOLDS.overall_score,
      });
    }

    comparisons.push({
      name: 'Frontend Code Quality',
      current: currentFrontendQuality,
      previous: previousFrontendQuality,
      difference: frontendQualityDifference,
      regression:
        frontendQualityDifference <= REGRESSION_THRESHOLDS.overall_score,
    });

    // Backend code quality
    const currentBackendQuality = current.backend?.code_quality?.score || 0;
    const previousBackendQuality = previous.backend?.code_quality?.score || 0;
    const backendQualityDifference =
      currentBackendQuality - previousBackendQuality;

    if (backendQualityDifference <= REGRESSION_THRESHOLDS.overall_score) {
      this.regressions.push({
        type: 'backend_code_quality',
        severity: 'medium',
        message: 'Backend code quality regression detected',
        current: currentBackendQuality,
        previous: previousBackendQuality,
        difference: backendQualityDifference,
        threshold: REGRESSION_THRESHOLDS.overall_score,
      });
    }

    comparisons.push({
      name: 'Backend Code Quality',
      current: currentBackendQuality,
      previous: previousBackendQuality,
      difference: backendQualityDifference,
      regression:
        backendQualityDifference <= REGRESSION_THRESHOLDS.overall_score,
    });

    return comparisons;
  }

  /**
   * Generate regression report
   */
  generateRegressionReport(current, previous, comparisons) {
    const report = {
      timestamp: new Date().toISOString(),
      current_build: {
        timestamp: current.timestamp,
        overall_score: current.overall?.overall_score || 0,
      },
      previous_build: {
        timestamp: previous.timestamp,
        overall_score: previous.overall?.overall_score || 0,
      },
      regressions: this.regressions,
      comparisons: comparisons,
      summary: {
        total_regressions: this.regressions.length,
        critical_regressions: this.regressions.filter(
          (r) => r.severity === 'critical'
        ).length,
        high_regressions: this.regressions.filter((r) => r.severity === 'high')
          .length,
        medium_regressions: this.regressions.filter(
          (r) => r.severity === 'medium'
        ).length,
        has_regressions: this.regressions.length > 0,
      },
      recommendations: this.generateRegressionRecommendations(),
    };

    return report;
  }

  /**
   * Generate recommendations for addressing regressions
   */
  generateRegressionRecommendations() {
    const recommendations = [];

    // Group regressions by type
    const regressionsByType = {};
    this.regressions.forEach((regression) => {
      if (!regressionsByType[regression.type]) {
        regressionsByType[regression.type] = [];
      }
      regressionsByType[regression.type].push(regression);
    });

    // Generate specific recommendations
    Object.entries(regressionsByType).forEach(([type, regressions]) => {
      switch (type) {
        case 'overall_score':
          recommendations.push({
            category: 'Overall Quality',
            priority: 'high',
            message: 'Overall quality score has decreased',
            actions: [
              'Review recent code changes for quality issues',
              'Run comprehensive quality checks',
              'Address failing tests and linting errors',
            ],
          });
          break;

        case 'frontend_coverage':
        case 'backend_coverage':
          const component = type.includes('frontend') ? 'frontend' : 'backend';
          recommendations.push({
            category: 'Test Coverage',
            priority: 'medium',
            message: `${component} test coverage has decreased`,
            actions: [
              `Add more unit tests for ${component} components`,
              'Review recent changes that may have reduced coverage',
              'Ensure new code includes appropriate tests',
            ],
          });
          break;

        case 'frontend_performance':
        case 'backend_performance':
          const perfComponent = type.includes('frontend')
            ? 'frontend'
            : 'backend';
          recommendations.push({
            category: 'Performance',
            priority: 'medium',
            message: `${perfComponent} test execution time has increased`,
            actions: [
              'Profile test execution to identify slow tests',
              'Optimize test setup and teardown processes',
              'Consider parallel test execution',
            ],
          });
          break;

        case 'bundle_size':
          recommendations.push({
            category: 'Performance',
            priority: 'medium',
            message: 'Bundle size has increased significantly',
            actions: [
              'Analyze bundle composition for large dependencies',
              'Implement code splitting and lazy loading',
              'Remove unused dependencies and code',
            ],
          });
          break;

        case 'security_vulnerabilities':
          recommendations.push({
            category: 'Security',
            priority: 'critical',
            message: 'New security vulnerabilities detected',
            actions: [
              'Update vulnerable dependencies immediately',
              'Review security audit results',
              'Implement additional security measures if needed',
            ],
          });
          break;

        case 'frontend_code_quality':
        case 'backend_code_quality':
          const qualityComponent = type.includes('frontend')
            ? 'frontend'
            : 'backend';
          recommendations.push({
            category: 'Code Quality',
            priority: 'medium',
            message: `${qualityComponent} code quality has decreased`,
            actions: [
              'Fix linting and formatting issues',
              'Address code complexity warnings',
              'Review recent code changes for quality issues',
            ],
          });
          break;
      }
    });

    return recommendations;
  }

  /**
   * Print regression analysis results
   */
  printRegressionAnalysis(report) {
    this.logSection('Regression Analysis Results');

    if (!report.summary.has_regressions) {
      this.log('✅ No quality regressions detected!', COLORS.GREEN);
      this.log(
        `Current overall score: ${report.current_build.overall_score}`,
        COLORS.GREEN
      );
      this.log(
        `Previous overall score: ${report.previous_build.overall_score}`,
        COLORS.GREEN
      );
      return true;
    }

    this.log('❌ Quality regressions detected!', COLORS.RED);
    this.log(
      `Total regressions: ${report.summary.total_regressions}`,
      COLORS.RED
    );
    this.log(
      `Critical: ${report.summary.critical_regressions}, High: ${report.summary.high_regressions}, Medium: ${report.summary.medium_regressions}`
    );

    // Print detailed regressions
    console.log('\n📊 Regression Details:');
    console.log(
      '┌─────────────────────────┬──────────┬──────────┬────────────┬──────────┐'
    );
    console.log(
      '│ Metric                  │ Current  │ Previous │ Difference │ Severity │'
    );
    console.log(
      '├─────────────────────────┼──────────┼──────────┼────────────┼──────────┤'
    );

    this.regressions.forEach((regression) => {
      const metric = regression.type
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
      const current = regression.current.toString().padEnd(8);
      const previous = regression.previous.toString().padEnd(8);
      const difference =
        (regression.difference > 0 ? '+' : '') +
        regression.difference.toString().padEnd(10);
      const severity = regression.severity.padEnd(8);

      console.log(
        `│ ${metric.padEnd(23)} │ ${current} │ ${previous} │ ${difference} │ ${severity} │`
      );
    });

    console.log(
      '└─────────────────────────┴──────────┴──────────┴────────────┴──────────┘'
    );

    // Print recommendations
    if (report.recommendations.length > 0) {
      console.log('\n🔧 Regression Fix Recommendations:');
      report.recommendations.forEach((rec, i) => {
        const priorityColor =
          rec.priority === 'critical'
            ? COLORS.RED
            : rec.priority === 'high'
              ? COLORS.YELLOW
              : COLORS.BLUE;
        this.log(
          `\n${i + 1}. [${rec.priority.toUpperCase()}] ${rec.category}: ${rec.message}`,
          priorityColor
        );
        rec.actions.forEach((action) => {
          this.log(`   • ${action}`, COLORS.RESET);
        });
      });
    }

    return false;
  }

  /**
   * Save regression report
   */
  async saveRegressionReport(report) {
    try {
      await this.ensureReportsDirectory();
      const reportFileName = `regression-analysis-${new Date().toISOString().split('T')[0]}.json`;
      const reportPath = path.join(this.reportsDir, reportFileName);

      await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
      this.log(`\n📄 Regression report saved to: ${reportPath}`, COLORS.BLUE);
    } catch (error) {
      this.log(
        `Warning: Could not save regression report: ${error.message}`,
        COLORS.YELLOW
      );
    }
  }

  /**
   * Helper methods
   */
  async pathExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
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
        `${COLORS.BOLD}🔍 Regression Detection System - Medical Device Regulatory Assistant${COLORS.RESET}`,
        COLORS.BLUE
      );

      // Load reports
      this.log('Loading current quality report...', COLORS.YELLOW);
      const currentReport = await this.loadCurrentReport();

      this.log('Loading previous quality report...', COLORS.YELLOW);
      const previousReport = await this.loadPreviousReport();

      if (!previousReport) {
        this.log(
          '⚠️  No previous report available for comparison',
          COLORS.YELLOW
        );
        this.log(
          'Regression detection will be available after the next build',
          COLORS.YELLOW
        );
        return true;
      }

      // Perform comparisons
      this.log('Analyzing quality metrics for regressions...', COLORS.YELLOW);

      const overallComparison = this.compareOverallScores(
        currentReport,
        previousReport
      );
      const coverageComparisons = this.compareTestCoverage(
        currentReport,
        previousReport
      );
      const performanceComparisons = this.comparePerformanceMetrics(
        currentReport,
        previousReport
      );
      const securityComparison = this.compareSecurityMetrics(
        currentReport,
        previousReport
      );
      const codeQualityComparisons = this.compareCodeQualityMetrics(
        currentReport,
        previousReport
      );

      const allComparisons = {
        overall: overallComparison,
        coverage: coverageComparisons,
        performance: performanceComparisons,
        security: securityComparison,
        code_quality: codeQualityComparisons,
      };

      // Generate and save report
      const regressionReport = this.generateRegressionReport(
        currentReport,
        previousReport,
        allComparisons
      );
      await this.saveRegressionReport(regressionReport);

      // Print results
      const noRegressions = this.printRegressionAnalysis(regressionReport);

      if (noRegressions) {
        this.log(
          '\n🎉 No quality regressions detected! System quality is stable or improving.',
          COLORS.GREEN
        );
        process.exit(0);
      } else {
        this.log(
          '\n❌ Quality regressions detected. Please address the issues above.',
          COLORS.RED
        );
        process.exit(1);
      }
    } catch (error) {
      this.log(
        `\n💥 Regression detection failed: ${error.message}`,
        COLORS.RED
      );
      process.exit(1);
    }
  }
}

// CLI interface
async function main() {
  const detector = new RegressionDetector();
  await detector.run();
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = RegressionDetector;
