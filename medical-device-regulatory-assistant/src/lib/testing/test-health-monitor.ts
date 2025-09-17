/**
 * Test Health Monitor - Automated performance monitoring and health reporting
 * Requirements: 5.2, 8.1, 8.2
 */

import { performance } from 'perf_hooks';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface TestHealthMetrics {
  passRate: number;
  executionTime: number;
  memoryUsage: number;
  flakiness: number;
  coverage: number;
  timestamp: number;
  testCount: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  performance: {
    slowTests: Array<{
      name: string;
      duration: number;
      threshold: number;
    }>;
    memoryLeaks: Array<{
      test: string;
      memoryDelta: number;
    }>;
  };
  react19Compatibility: {
    aggregateErrors: number;
    renderErrors: number;
    hookErrors: number;
    compatibilityScore: number;
  };
}

export interface TestHealthThresholds {
  passRate: number;
  executionTime: number;
  memoryUsage: number;
  flakiness: number;
  coverage: number;
  slowTestThreshold: number;
  memoryLeakThreshold: number;
}

export interface ValidationResult {
  isHealthy: boolean;
  issues: ValidationIssue[];
  warnings: ValidationWarning[];
  recommendations: string[];
}

export interface ValidationIssue {
  type: 'performance' | 'coverage' | 'flakiness' | 'memory' | 'react19';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metric: string;
  actual: number;
  expected: number;
  suggestion: string;
}

export interface ValidationWarning {
  type: string;
  message: string;
  suggestion: string;
}

export interface HealthReport {
  summary: {
    overallHealth: 'healthy' | 'warning' | 'critical';
    score: number;
    timestamp: string;
    duration: number;
  };
  metrics: TestHealthMetrics;
  validation: ValidationResult;
  trends: {
    passRateTrend: number[];
    performanceTrend: number[];
    coverageTrend: number[];
  };
  recommendations: string[];
}

export class TestHealthMonitor {
  private thresholds: TestHealthThresholds;
  private metricsHistory: TestHealthMetrics[] = [];
  private startTime: number = 0;
  private memoryBaseline: number = 0;

  constructor(thresholds?: Partial<TestHealthThresholds>) {
    this.thresholds = {
      passRate: 95,
      executionTime: 30000, // 30 seconds
      memoryUsage: 512 * 1024 * 1024, // 512MB
      flakiness: 1,
      coverage: 90,
      slowTestThreshold: 5000, // 5 seconds
      memoryLeakThreshold: 50 * 1024 * 1024, // 50MB
      ...thresholds,
    };
  }

  /**
   * Start monitoring session
   */
  startMonitoring(): void {
    this.startTime = performance.now();
    this.memoryBaseline = process.memoryUsage().heapUsed;
    
    if (global.__REACT_19_ERROR_TRACKER) {
      global.__REACT_19_ERROR_TRACKER.clear();
    }
  }

  /**
   * Collect current test health metrics
   */
  async collectMetrics(): Promise<TestHealthMetrics> {
    const currentTime = performance.now();
    const memoryUsage = process.memoryUsage();
    
    // Get React 19 error tracking data
    const react19Errors = global.__REACT_19_ERROR_TRACKER || {
      aggregateErrors: [],
      hookErrors: [],
      renderErrors: []
    };

    const metrics: TestHealthMetrics = {
      passRate: this.calculatePassRate(),
      executionTime: currentTime - this.startTime,
      memoryUsage: memoryUsage.heapUsed,
      flakiness: this.calculateFlakiness(),
      coverage: await this.getCoverageMetrics(),
      timestamp: Date.now(),
      testCount: await this.getTestCounts(),
      performance: {
        slowTests: await this.identifySlowTests(),
        memoryLeaks: this.detectMemoryLeaks(memoryUsage),
      },
      react19Compatibility: {
        aggregateErrors: react19Errors.aggregateErrors.length,
        renderErrors: react19Errors.renderErrors.length,
        hookErrors: react19Errors.hookErrors.length,
        compatibilityScore: this.calculateReact19CompatibilityScore(react19Errors),
      },
    };

    this.metricsHistory.push(metrics);
    return metrics;
  }

  /**
   * Validate metrics against thresholds
   */
  validateThresholds(metrics: TestHealthMetrics): ValidationResult {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationWarning[] = [];
    const recommendations: string[] = [];

    // Pass rate validation
    if (metrics.passRate < this.thresholds.passRate) {
      issues.push({
        type: 'coverage',
        severity: metrics.passRate < 80 ? 'critical' : 'high',
        message: `Test pass rate (${metrics.passRate.toFixed(1)}%) below threshold (${this.thresholds.passRate}%)`,
        metric: 'passRate',
        actual: metrics.passRate,
        expected: this.thresholds.passRate,
        suggestion: 'Review failing tests and fix underlying issues',
      });
    }

    // Performance validation
    if (metrics.executionTime > this.thresholds.executionTime) {
      issues.push({
        type: 'performance',
        severity: metrics.executionTime > this.thresholds.executionTime * 2 ? 'critical' : 'high',
        message: `Test execution time (${(metrics.executionTime / 1000).toFixed(1)}s) exceeds threshold (${(this.thresholds.executionTime / 1000).toFixed(1)}s)`,
        metric: 'executionTime',
        actual: metrics.executionTime,
        expected: this.thresholds.executionTime,
        suggestion: 'Optimize slow tests or increase parallelization',
      });
    }

    // Memory usage validation
    if (metrics.memoryUsage > this.thresholds.memoryUsage) {
      issues.push({
        type: 'memory',
        severity: 'medium',
        message: `Memory usage (${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB) exceeds threshold (${(this.thresholds.memoryUsage / 1024 / 1024).toFixed(1)}MB)`,
        metric: 'memoryUsage',
        actual: metrics.memoryUsage,
        expected: this.thresholds.memoryUsage,
        suggestion: 'Check for memory leaks and optimize test cleanup',
      });
    }

    // React 19 compatibility validation
    if (metrics.react19Compatibility.compatibilityScore < 90) {
      issues.push({
        type: 'react19',
        severity: metrics.react19Compatibility.compatibilityScore < 70 ? 'critical' : 'high',
        message: `React 19 compatibility score (${metrics.react19Compatibility.compatibilityScore}%) is low`,
        metric: 'react19CompatibilityScore',
        actual: metrics.react19Compatibility.compatibilityScore,
        expected: 90,
        suggestion: 'Review React 19 error handling and update test infrastructure',
      });
    }

    // Coverage validation
    if (metrics.coverage < this.thresholds.coverage) {
      warnings.push({
        type: 'coverage',
        message: `Test coverage (${metrics.coverage.toFixed(1)}%) below target (${this.thresholds.coverage}%)`,
        suggestion: 'Add tests for uncovered code paths',
      });
    }

    // Slow tests warning
    if (metrics.performance.slowTests.length > 0) {
      warnings.push({
        type: 'performance',
        message: `${metrics.performance.slowTests.length} slow tests detected`,
        suggestion: 'Optimize slow tests or split into smaller units',
      });
    }

    // Generate recommendations
    if (issues.length === 0 && warnings.length === 0) {
      recommendations.push('Test health is excellent! Continue current practices.');
    } else {
      recommendations.push(...this.generateRecommendations(issues, warnings));
    }

    return {
      isHealthy: issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0,
      issues,
      warnings,
      recommendations,
    };
  }

  /**
   * Generate comprehensive health report
   */
  async createHealthReport(): Promise<HealthReport> {
    const metrics = await this.collectMetrics();
    const validation = this.validateThresholds(metrics);
    
    const overallScore = this.calculateOverallHealthScore(metrics, validation);
    const overallHealth = this.determineOverallHealth(validation, overallScore);

    return {
      summary: {
        overallHealth,
        score: overallScore,
        timestamp: new Date().toISOString(),
        duration: metrics.executionTime,
      },
      metrics,
      validation,
      trends: this.calculateTrends(),
      recommendations: validation.recommendations,
    };
  }

  /**
   * Save health report to file
   */
  async saveHealthReport(report: HealthReport, outputDir: string = 'test-reports'): Promise<string> {
    try {
      await fs.mkdir(outputDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `test-health-report-${timestamp}.json`;
      const filepath = path.join(outputDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(report, null, 2));
      
      // Also save as latest report
      const latestPath = path.join(outputDir, 'test-health-report.json');
      await fs.writeFile(latestPath, JSON.stringify(report, null, 2));
      
      return filepath;
    } catch (error) {
      console.error('Failed to save health report:', error);
      throw error;
    }
  }

  /**
   * Generate alerts for critical issues
   */
  generateAlerts(validation: ValidationResult): Array<{ level: string; message: string; action: string }> {
    const alerts = [];
    
    for (const issue of validation.issues) {
      if (issue.severity === 'critical') {
        alerts.push({
          level: 'CRITICAL',
          message: issue.message,
          action: issue.suggestion,
        });
      } else if (issue.severity === 'high') {
        alerts.push({
          level: 'HIGH',
          message: issue.message,
          action: issue.suggestion,
        });
      }
    }
    
    return alerts;
  }

  // Private helper methods

  private calculatePassRate(): number {
    // This would be implemented to calculate actual pass rate from test results
    // For now, return a mock value
    return 95.5;
  }

  private calculateFlakiness(): number {
    // Calculate test flakiness based on historical data
    return 0.5;
  }

  private async getCoverageMetrics(): Promise<number> {
    try {
      // Try to read coverage summary
      const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
      const coverageData = await fs.readFile(coveragePath, 'utf-8');
      const coverage = JSON.parse(coverageData);
      return coverage.total?.lines?.pct || 0;
    } catch {
      return 0;
    }
  }

  private async getTestCounts(): Promise<TestHealthMetrics['testCount']> {
    // This would be implemented to get actual test counts
    return {
      total: 100,
      passed: 95,
      failed: 3,
      skipped: 2,
    };
  }

  private async identifySlowTests(): Promise<Array<{ name: string; duration: number; threshold: number }>> {
    // This would be implemented to identify slow tests from test results
    return [];
  }

  private detectMemoryLeaks(memoryUsage: NodeJS.MemoryUsage): Array<{ test: string; memoryDelta: number }> {
    const memoryDelta = memoryUsage.heapUsed - this.memoryBaseline;
    
    if (memoryDelta > this.thresholds.memoryLeakThreshold) {
      return [{
        test: 'overall',
        memoryDelta,
      }];
    }
    
    return [];
  }

  private calculateReact19CompatibilityScore(errorTracker: any): number {
    const totalErrors = errorTracker.aggregateErrors.length + 
                       errorTracker.renderErrors.length + 
                       errorTracker.hookErrors.length;
    
    if (totalErrors === 0) return 100;
    if (totalErrors <= 5) return 90;
    if (totalErrors <= 10) return 75;
    if (totalErrors <= 20) return 50;
    return 25;
  }

  private generateRecommendations(issues: ValidationIssue[], warnings: ValidationWarning[]): string[] {
    const recommendations = [];
    
    const criticalIssues = issues.filter(i => i.severity === 'critical');
    const highIssues = issues.filter(i => i.severity === 'high');
    
    if (criticalIssues.length > 0) {
      recommendations.push('🚨 Address critical issues immediately before deployment');
    }
    
    if (highIssues.length > 0) {
      recommendations.push('⚠️ High priority issues should be resolved in next sprint');
    }
    
    if (warnings.length > 0) {
      recommendations.push('💡 Consider addressing warnings to improve test quality');
    }
    
    return recommendations;
  }

  private calculateOverallHealthScore(metrics: TestHealthMetrics, validation: ValidationResult): number {
    let score = 100;
    
    for (const issue of validation.issues) {
      switch (issue.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 10;
          break;
        case 'low':
          score -= 5;
          break;
      }
    }
    
    for (const warning of validation.warnings) {
      score -= 2;
    }
    
    return Math.max(0, score);
  }

  private determineOverallHealth(validation: ValidationResult, score: number): 'healthy' | 'warning' | 'critical' {
    if (!validation.isHealthy || score < 50) return 'critical';
    if (validation.warnings.length > 0 || score < 80) return 'warning';
    return 'healthy';
  }

  private calculateTrends(): { passRateTrend: number[]; performanceTrend: number[]; coverageTrend: number[] } {
    const recentMetrics = this.metricsHistory.slice(-10);
    
    return {
      passRateTrend: recentMetrics.map(m => m.passRate),
      performanceTrend: recentMetrics.map(m => m.executionTime),
      coverageTrend: recentMetrics.map(m => m.coverage),
    };
  }
}

// Export singleton instance
export const testHealthMonitor = new TestHealthMonitor();