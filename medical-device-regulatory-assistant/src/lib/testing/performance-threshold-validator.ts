/**
 * Performance Threshold Validator
 * 
 * Validates test performance against defined thresholds
 * Implements Requirements 5.1 and 5.2 validation logic
 */

import { TestExecutionMetrics, SuitePerformanceMetrics, PerformanceThresholds } from './test-performance-tracker';

export interface ValidationResult {
  passed: boolean;
  violations: ThresholdViolation[];
  score: number; // 0-100
  recommendations: string[];
}

export interface ThresholdViolation {
  type: 'suite_time' | 'test_time' | 'memory' | 'consistency' | 'regression';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  actualValue: number;
  thresholdValue: number;
  testName?: string;
  suiteName?: string;
}

export interface ValidationConfig {
  thresholds: PerformanceThresholds;
  strictMode: boolean; // Fail on any violation vs warnings only
  requirementCompliance: {
    requirement51: boolean; // 30-second suite time limit
    requirement52: boolean; // Consistency across runs
  };
}

export class PerformanceThresholdValidator {
  private config: ValidationConfig;

  constructor(config?: Partial<ValidationConfig>) {
    this.config = {
      thresholds: {
        maxSuiteExecutionTime: 30000, // 30 seconds (Requirement 5.1)
        maxTestExecutionTime: 5000, // 5 seconds per test
        maxMemoryUsage: 512, // 512MB
        consistencyThreshold: 0.2, // 20% variance (Requirement 5.2)
        memoryLeakThreshold: 10, // 10MB
      },
      strictMode: false,
      requirementCompliance: {
        requirement51: true,
        requirement52: true,
      },
      ...config
    };
  }

  /**
   * Validate individual test metrics
   */
  validateTest(metrics: TestExecutionMetrics): ValidationResult {
    const violations: ThresholdViolation[] = [];

    // Check test execution time
    if (metrics.executionTime > this.config.thresholds.maxTestExecutionTime) {
      violations.push({
        type: 'test_time',
        severity: 'warning',
        message: `Test execution time ${metrics.executionTime.toFixed(2)}ms exceeds threshold`,
        actualValue: metrics.executionTime,
        thresholdValue: this.config.thresholds.maxTestExecutionTime,
        testName: metrics.testName,
        suiteName: metrics.suiteName
      });
    }

    // Check memory usage
    const memoryUsageMB = metrics.memoryUsage.heapUsed / 1024 / 1024;
    if (memoryUsageMB > this.config.thresholds.maxMemoryUsage) {
      violations.push({
        type: 'memory',
        severity: 'warning',
        message: `Memory usage ${memoryUsageMB.toFixed(2)}MB exceeds threshold`,
        actualValue: memoryUsageMB,
        thresholdValue: this.config.thresholds.maxMemoryUsage,
        testName: metrics.testName,
        suiteName: metrics.suiteName
      });
    }

    // Generate recommendations
    const recommendations = this.generateTestRecommendations(metrics, violations);

    // Calculate score
    const score = this.calculateTestScore(metrics, violations);

    return {
      passed: violations.length === 0 || (!this.config.strictMode && !this.hasCriticalViolations(violations)),
      violations,
      score,
      recommendations
    };
  }

  /**
   * Validate test suite metrics
   */
  validateSuite(metrics: SuitePerformanceMetrics): ValidationResult {
    const violations: ThresholdViolation[] = [];

    // Requirement 5.1: Suite execution time must be ≤ 30 seconds
    if (this.config.requirementCompliance.requirement51 && 
        metrics.totalExecutionTime > this.config.thresholds.maxSuiteExecutionTime) {
      violations.push({
        type: 'suite_time',
        severity: 'critical',
        message: `Suite execution time ${(metrics.totalExecutionTime / 1000).toFixed(2)}s exceeds 30-second limit (Requirement 5.1)`,
        actualValue: metrics.totalExecutionTime,
        thresholdValue: this.config.thresholds.maxSuiteExecutionTime,
        suiteName: metrics.suiteName
      });
    }

    // Requirement 5.2: Consistency across runs
    if (this.config.requirementCompliance.requirement52 && 
        metrics.consistencyScore < (1 - this.config.thresholds.consistencyThreshold)) {
      violations.push({
        type: 'consistency',
        severity: 'critical',
        message: `Test consistency ${(metrics.consistencyScore * 100).toFixed(1)}% below threshold (Requirement 5.2)`,
        actualValue: metrics.consistencyScore * 100,
        thresholdValue: (1 - this.config.thresholds.consistencyThreshold) * 100,
        suiteName: metrics.suiteName
      });
    }

    // Memory usage validation
    if (metrics.memoryPeak > this.config.thresholds.maxMemoryUsage) {
      violations.push({
        type: 'memory',
        severity: 'warning',
        message: `Peak memory usage ${metrics.memoryPeak.toFixed(2)}MB exceeds threshold`,
        actualValue: metrics.memoryPeak,
        thresholdValue: this.config.thresholds.maxMemoryUsage,
        suiteName: metrics.suiteName
      });
    }

    // Generate recommendations
    const recommendations = this.generateSuiteRecommendations(metrics, violations);

    // Calculate score
    const score = this.calculateSuiteScore(metrics, violations);

    return {
      passed: violations.length === 0 || (!this.config.strictMode && !this.hasCriticalViolations(violations)),
      violations,
      score,
      recommendations
    };
  }

  /**
   * Validate performance regression
   */
  validateRegression(
    currentMetrics: TestExecutionMetrics[],
    historicalMetrics: TestExecutionMetrics[],
    regressionThreshold: number = 0.2
  ): ValidationResult {
    const violations: ThresholdViolation[] = [];

    if (historicalMetrics.length === 0) {
      return {
        passed: true,
        violations: [],
        score: 100,
        recommendations: ['No historical data available for regression analysis']
      };
    }

    // Group metrics by test name
    const currentByTest = this.groupMetricsByTest(currentMetrics);
    const historicalByTest = this.groupMetricsByTest(historicalMetrics);

    // Check each test for regression
    Object.keys(currentByTest).forEach(testName => {
      const current = currentByTest[testName];
      const historical = historicalByTest[testName];

      if (!historical) return;

      const currentAvg = this.calculateAverageExecutionTime(current);
      const historicalAvg = this.calculateAverageExecutionTime(historical);
      const regressionPercentage = (currentAvg - historicalAvg) / historicalAvg;

      if (regressionPercentage > regressionThreshold) {
        violations.push({
          type: 'regression',
          severity: 'critical',
          message: `Performance regression of ${(regressionPercentage * 100).toFixed(1)}% detected`,
          actualValue: regressionPercentage * 100,
          thresholdValue: regressionThreshold * 100,
          testName
        });
      }
    });

    const recommendations = this.generateRegressionRecommendations(violations);
    const score = violations.length === 0 ? 100 : Math.max(0, 100 - (violations.length * 20));

    return {
      passed: violations.length === 0,
      violations,
      score,
      recommendations
    };
  }

  /**
   * Validate overall test run compliance
   */
  validateOverallCompliance(
    suiteResults: ValidationResult[],
    testResults: ValidationResult[]
  ): ValidationResult {
    const allViolations: ThresholdViolation[] = [
      ...suiteResults.flatMap(result => result.violations),
      ...testResults.flatMap(result => result.violations)
    ];

    // Check critical requirement violations
    const requirement51Violations = allViolations.filter(v => 
      v.type === 'suite_time' && v.severity === 'critical'
    );
    
    const requirement52Violations = allViolations.filter(v => 
      v.type === 'consistency' && v.severity === 'critical'
    );

    const criticalViolations = allViolations.filter(v => v.severity === 'critical');

    // Generate compliance recommendations
    const recommendations: string[] = [];
    
    if (requirement51Violations.length > 0) {
      recommendations.push(
        'CRITICAL: Test suite execution time exceeds 30-second limit (Requirement 5.1). ' +
        'Consider parallelizing tests or optimizing slow test cases.'
      );
    }
    
    if (requirement52Violations.length > 0) {
      recommendations.push(
        'CRITICAL: Test execution consistency below threshold (Requirement 5.2). ' +
        'Investigate flaky tests and improve test reliability.'
      );
    }

    if (criticalViolations.length === 0 && allViolations.length > 0) {
      recommendations.push(
        'Performance warnings detected. Consider optimizing tests to improve execution speed and memory usage.'
      );
    }

    // Calculate overall score
    const totalTests = testResults.length;
    const totalSuites = suiteResults.length;
    const avgTestScore = testResults.reduce((sum, result) => sum + result.score, 0) / Math.max(totalTests, 1);
    const avgSuiteScore = suiteResults.reduce((sum, result) => sum + result.score, 0) / Math.max(totalSuites, 1);
    const overallScore = (avgTestScore + avgSuiteScore) / 2;

    return {
      passed: criticalViolations.length === 0,
      violations: allViolations,
      score: overallScore,
      recommendations
    };
  }

  /**
   * Generate performance report with validation results
   */
  generateValidationReport(
    suiteResults: ValidationResult[],
    testResults: ValidationResult[],
    overallResult: ValidationResult
  ): string {
    const lines: string[] = [];

    lines.push('📊 PERFORMANCE VALIDATION REPORT');
    lines.push('='.repeat(50));
    lines.push('');

    // Overall compliance
    lines.push(`Overall Score: ${overallResult.score.toFixed(1)}/100`);
    lines.push(`Status: ${overallResult.passed ? '✅ PASSED' : '❌ FAILED'}`);
    lines.push('');

    // Requirement compliance
    const requirement51Passed = !overallResult.violations.some(v => 
      v.type === 'suite_time' && v.severity === 'critical'
    );
    const requirement52Passed = !overallResult.violations.some(v => 
      v.type === 'consistency' && v.severity === 'critical'
    );

    lines.push('Requirement Compliance:');
    lines.push(`  5.1 (30s suite limit): ${requirement51Passed ? '✅' : '❌'}`);
    lines.push(`  5.2 (consistency): ${requirement52Passed ? '✅' : '❌'}`);
    lines.push('');

    // Suite summary
    if (suiteResults.length > 0) {
      lines.push('Suite Performance:');
      suiteResults.forEach(result => {
        const suiteName = result.violations[0]?.suiteName || 'Unknown';
        const status = result.passed ? '✅' : '❌';
        lines.push(`  ${status} ${suiteName}: ${result.score.toFixed(1)}/100`);
        
        result.violations.forEach(violation => {
          const icon = violation.severity === 'critical' ? '🚨' : '⚠️';
          lines.push(`    ${icon} ${violation.message}`);
        });
      });
      lines.push('');
    }

    // Critical violations
    const criticalViolations = overallResult.violations.filter(v => v.severity === 'critical');
    if (criticalViolations.length > 0) {
      lines.push('🚨 CRITICAL VIOLATIONS:');
      criticalViolations.forEach(violation => {
        lines.push(`  • ${violation.message}`);
      });
      lines.push('');
    }

    // Recommendations
    if (overallResult.recommendations.length > 0) {
      lines.push('💡 RECOMMENDATIONS:');
      overallResult.recommendations.forEach(rec => {
        lines.push(`  • ${rec}`);
      });
    }

    return lines.join('\n');
  }

  private hasCriticalViolations(violations: ThresholdViolation[]): boolean {
    return violations.some(v => v.severity === 'critical');
  }

  private generateTestRecommendations(
    metrics: TestExecutionMetrics,
    violations: ThresholdViolation[]
  ): string[] {
    const recommendations: string[] = [];

    if (violations.some(v => v.type === 'test_time')) {
      recommendations.push(`Optimize ${metrics.testName} to reduce execution time`);
    }

    if (violations.some(v => v.type === 'memory')) {
      recommendations.push(`Reduce memory usage in ${metrics.testName} by cleaning up resources`);
    }

    if (metrics.retryCount > 0) {
      recommendations.push(`Investigate flakiness in ${metrics.testName} (${metrics.retryCount} retries)`);
    }

    return recommendations;
  }

  private generateSuiteRecommendations(
    metrics: SuitePerformanceMetrics,
    violations: ThresholdViolation[]
  ): string[] {
    const recommendations: string[] = [];

    if (violations.some(v => v.type === 'suite_time')) {
      recommendations.push(
        `Parallelize tests in ${metrics.suiteName} or optimize the slowest test: ${metrics.slowestTest.name}`
      );
    }

    if (violations.some(v => v.type === 'consistency')) {
      recommendations.push(
        `Improve test reliability in ${metrics.suiteName} to reduce execution time variance`
      );
    }

    if (violations.some(v => v.type === 'memory')) {
      recommendations.push(
        `Optimize memory usage in ${metrics.suiteName} by improving cleanup between tests`
      );
    }

    if (metrics.failedTests > 0) {
      recommendations.push(
        `Fix ${metrics.failedTests} failing tests in ${metrics.suiteName} to improve reliability`
      );
    }

    return recommendations;
  }

  private generateRegressionRecommendations(violations: ThresholdViolation[]): string[] {
    const recommendations: string[] = [];

    if (violations.length > 0) {
      recommendations.push('Performance regression detected. Consider:');
      recommendations.push('  - Reviewing recent code changes');
      recommendations.push('  - Profiling affected tests');
      recommendations.push('  - Optimizing slow operations');
      recommendations.push('  - Checking for memory leaks');
    }

    return recommendations;
  }

  private calculateTestScore(metrics: TestExecutionMetrics, violations: ThresholdViolation[]): number {
    let score = 100;

    // Deduct points for violations
    violations.forEach(violation => {
      switch (violation.severity) {
        case 'critical':
          score -= 30;
          break;
        case 'warning':
          score -= 15;
          break;
        case 'info':
          score -= 5;
          break;
      }
    });

    // Bonus for fast execution
    if (metrics.executionTime < this.config.thresholds.maxTestExecutionTime * 0.5) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  private calculateSuiteScore(metrics: SuitePerformanceMetrics, violations: ThresholdViolation[]): number {
    let score = 100;

    // Deduct points for violations
    violations.forEach(violation => {
      switch (violation.severity) {
        case 'critical':
          score -= 40;
          break;
        case 'warning':
          score -= 20;
          break;
        case 'info':
          score -= 10;
          break;
      }
    });

    // Bonus for high pass rate
    const passRate = metrics.passedTests / metrics.totalTests;
    if (passRate >= 0.95) {
      score += 10;
    }

    // Bonus for good consistency
    if (metrics.consistencyScore >= 0.9) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  private groupMetricsByTest(metrics: TestExecutionMetrics[]): Record<string, TestExecutionMetrics[]> {
    return metrics.reduce((groups, metric) => {
      const key = metric.testName;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(metric);
      return groups;
    }, {} as Record<string, TestExecutionMetrics[]>);
  }

  private calculateAverageExecutionTime(metrics: TestExecutionMetrics[]): number {
    return metrics.reduce((sum, metric) => sum + metric.executionTime, 0) / metrics.length;
  }
}

// Default validator instance
export const defaultValidator = new PerformanceThresholdValidator();

// Convenience functions
export function validateTestPerformance(metrics: TestExecutionMetrics): ValidationResult {
  return defaultValidator.validateTest(metrics);
}

export function validateSuitePerformance(metrics: SuitePerformanceMetrics): ValidationResult {
  return defaultValidator.validateSuite(metrics);
}

export function validatePerformanceRegression(
  current: TestExecutionMetrics[],
  historical: TestExecutionMetrics[]
): ValidationResult {
  return defaultValidator.validateRegression(current, historical);
}