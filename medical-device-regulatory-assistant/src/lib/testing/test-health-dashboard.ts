/**
 * Test Health Dashboard - Real-time monitoring and reporting interface
 * Requirements: 8.1, 8.2, 8.3
 */

import * as fs from 'fs/promises';
import * as path from 'path';

import {
  TestHealthMonitor,
  HealthReport,
  ValidationIssue,
} from './test-health-monitor';

export interface DashboardConfig {
  refreshInterval: number;
  historyLimit: number;
  alertThresholds: {
    critical: number;
    warning: number;
  };
  outputDir: string;
}

export interface DashboardData {
  currentReport: HealthReport;
  historicalReports: HealthReport[];
  alerts: Array<{
    id: string;
    level: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    message: string;
    timestamp: string;
    resolved: boolean;
  }>;
  trends: {
    healthScore: Array<{ timestamp: string; score: number }>;
    performance: Array<{ timestamp: string; duration: number }>;
    coverage: Array<{ timestamp: string; coverage: number }>;
    passRate: Array<{ timestamp: string; passRate: number }>;
  };
  summary: {
    totalTests: number;
    passRate: number;
    avgExecutionTime: number;
    coveragePercentage: number;
    react19CompatibilityScore: number;
    lastUpdated: string;
  };
}

export class TestHealthDashboard {
  private monitor: TestHealthMonitor;

  private config: DashboardConfig;

  private reports: HealthReport[] = [];

  private alerts: DashboardData['alerts'] = [];

  constructor(config?: Partial<DashboardConfig>) {
    this.monitor = new TestHealthMonitor();
    this.config = {
      refreshInterval: 30000, // 30 seconds
      historyLimit: 100,
      alertThresholds: {
        critical: 50,
        warning: 80,
      },
      outputDir: 'test-reports/dashboard',
      ...config,
    };
  }

  /**
   * Initialize dashboard and start monitoring
   */
  async initialize(): Promise<void> {
    await this.loadHistoricalData();
    await this.generateInitialReport();

    console.log('🚀 Test Health Dashboard initialized');
    console.log(`📊 Monitoring ${this.reports.length} historical reports`);
    console.log(`⚡ Refresh interval: ${this.config.refreshInterval / 1000}s`);
  }

  /**
   * Generate current dashboard data
   */
  async generateDashboardData(): Promise<DashboardData> {
    const currentReport = await this.monitor.createHealthReport();
    this.reports.push(currentReport);

    // Limit history
    if (this.reports.length > this.config.historyLimit) {
      this.reports = this.reports.slice(-this.config.historyLimit);
    }

    // Update alerts
    await this.updateAlerts(currentReport);

    const dashboardData: DashboardData = {
      currentReport,
      historicalReports: this.reports.slice(-10), // Last 10 reports
      alerts: this.alerts.filter((a) => !a.resolved).slice(-20), // Last 20 unresolved alerts
      trends: this.calculateTrends(),
      summary: this.generateSummary(currentReport),
    };

    await this.saveDashboardData(dashboardData);
    return dashboardData;
  }

  /**
   * Generate HTML dashboard
   */
  async generateHTMLDashboard(): Promise<string> {
    const data = await this.generateDashboardData();
    const html = this.createHTMLTemplate(data);

    const outputPath = path.join(this.config.outputDir, 'dashboard.html');
    await fs.mkdir(this.config.outputDir, { recursive: true });
    await fs.writeFile(outputPath, html);

    console.log(`📊 Dashboard generated: ${outputPath}`);
    return outputPath;
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(): void {
    console.log('🔄 Starting continuous test health monitoring...');

    const monitoringInterval = setInterval(async () => {
      try {
        await this.generateDashboardData();
        console.log(`✅ Dashboard updated at ${new Date().toISOString()}`);
      } catch (error) {
        console.error('❌ Dashboard update failed:', error);
      }
    }, this.config.refreshInterval);

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('🛑 Stopping test health monitoring...');
      clearInterval(monitoringInterval);
      process.exit(0);
    });
  }

  /**
   * Generate CI/CD integration report
   */
  async generateCIReport(): Promise<{
    exitCode: number;
    summary: string;
    details: string;
  }> {
    const data = await this.generateDashboardData();
    const { currentReport } = data;

    const criticalIssues = currentReport.validation.issues.filter(
      (i) => i.severity === 'critical'
    );
    const highIssues = currentReport.validation.issues.filter(
      (i) => i.severity === 'high'
    );

    let exitCode = 0;
    let summary = '';
    let details = '';

    if (criticalIssues.length > 0) {
      exitCode = 1;
      summary = `❌ CRITICAL: ${criticalIssues.length} critical issues found`;
      details = criticalIssues.map((i) => `- ${i.message}`).join('\n');
    } else if (highIssues.length > 0) {
      exitCode = process.env.CI_FAIL_ON_HIGH_ISSUES === 'true' ? 1 : 0;
      summary = `⚠️ WARNING: ${highIssues.length} high priority issues found`;
      details = highIssues.map((i) => `- ${i.message}`).join('\n');
    } else if (currentReport.validation.warnings.length > 0) {
      summary = `💡 INFO: ${currentReport.validation.warnings.length} warnings found`;
      details = currentReport.validation.warnings
        .map((w) => `- ${w.message}`)
        .join('\n');
    } else {
      summary = `✅ SUCCESS: All tests healthy (Score: ${currentReport.summary.score}/100)`;
      details = `
Performance: ${(currentReport.metrics.executionTime / 1000).toFixed(1)}s
Coverage: ${currentReport.metrics.coverage.toFixed(1)}%
Pass Rate: ${currentReport.metrics.passRate.toFixed(1)}%
React 19 Compatibility: ${currentReport.metrics.react19Compatibility.compatibilityScore}%
      `.trim();
    }

    return { exitCode, summary, details };
  }

  // Private helper methods

  private async loadHistoricalData(): Promise<void> {
    try {
      const reportsDir = path.join(this.config.outputDir, 'history');
      const files = await fs.readdir(reportsDir);

      for (const file of files.filter((f) => f.endsWith('.json'))) {
        try {
          const content = await fs.readFile(
            path.join(reportsDir, file),
            'utf-8'
          );
          const report = JSON.parse(content) as HealthReport;
          this.reports.push(report);
        } catch (error) {
          console.warn(`Failed to load report ${file}:`, error);
        }
      }

      // Sort by timestamp
      this.reports.sort(
        (a, b) =>
          new Date(a.summary.timestamp).getTime() -
          new Date(b.summary.timestamp).getTime()
      );
    } catch (error) {
      console.log('No historical data found, starting fresh');
    }
  }

  private async generateInitialReport(): Promise<void> {
    if (this.reports.length === 0) {
      const initialReport = await this.monitor.createHealthReport();
      this.reports.push(initialReport);
    }
  }

  private async updateAlerts(report: HealthReport): Promise<void> {
    const newAlerts = this.monitor.generateAlerts(report.validation);

    for (const alert of newAlerts) {
      const alertId = this.generateAlertId(alert.message);

      // Check if alert already exists
      const existingAlert = this.alerts.find(
        (a) => a.id === alertId && !a.resolved
      );

      if (!existingAlert) {
        this.alerts.push({
          id: alertId,
          level: alert.level as any,
          message: alert.message,
          timestamp: new Date().toISOString(),
          resolved: false,
        });
      }
    }

    // Mark resolved alerts
    const currentIssueMessages = report.validation.issues.map((i) => i.message);
    for (const alert of this.alerts) {
      if (!alert.resolved && !currentIssueMessages.includes(alert.message)) {
        alert.resolved = true;
      }
    }
  }

  private calculateTrends(): DashboardData['trends'] {
    const recentReports = this.reports.slice(-20);

    return {
      healthScore: recentReports.map((r) => ({
        timestamp: r.summary.timestamp,
        score: r.summary.score,
      })),
      performance: recentReports.map((r) => ({
        timestamp: r.summary.timestamp,
        duration: r.metrics.executionTime,
      })),
      coverage: recentReports.map((r) => ({
        timestamp: r.summary.timestamp,
        coverage: r.metrics.coverage,
      })),
      passRate: recentReports.map((r) => ({
        timestamp: r.summary.timestamp,
        passRate: r.metrics.passRate,
      })),
    };
  }

  private generateSummary(report: HealthReport): DashboardData['summary'] {
    return {
      totalTests: report.metrics.testCount.total,
      passRate: report.metrics.passRate,
      avgExecutionTime: report.metrics.executionTime,
      coveragePercentage: report.metrics.coverage,
      react19CompatibilityScore:
        report.metrics.react19Compatibility.compatibilityScore,
      lastUpdated: report.summary.timestamp,
    };
  }

  private async saveDashboardData(data: DashboardData): Promise<void> {
    await fs.mkdir(this.config.outputDir, { recursive: true });

    // Save current data
    const dataPath = path.join(this.config.outputDir, 'dashboard-data.json');
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));

    // Save historical report
    const historyDir = path.join(this.config.outputDir, 'history');
    await fs.mkdir(historyDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const historyPath = path.join(historyDir, `report-${timestamp}.json`);
    await fs.writeFile(
      historyPath,
      JSON.stringify(data.currentReport, null, 2)
    );
  }

  private generateAlertId(message: string): string {
    return Buffer.from(message).toString('base64').substring(0, 16);
  }

  private createHTMLTemplate(data: DashboardData): string {
    const { currentReport, trends, summary, alerts } = data;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Health Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .metric-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .metric-value { font-size: 2em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #666; font-size: 0.9em; }
        .health-score { color: ${currentReport.summary.score >= 80 ? '#22c55e' : currentReport.summary.score >= 60 ? '#f59e0b' : '#ef4444'}; }
        .alerts { background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .alert { padding: 10px; margin: 10px 0; border-radius: 4px; }
        .alert.CRITICAL { background: #fef2f2; border-left: 4px solid #ef4444; }
        .alert.HIGH { background: #fffbeb; border-left: 4px solid #f59e0b; }
        .alert.MEDIUM { background: #f0f9ff; border-left: 4px solid #3b82f6; }
        .charts { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .chart-container { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .timestamp { color: #666; font-size: 0.9em; }
        .status-indicator { display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }
        .status-healthy { background: #22c55e; }
        .status-warning { background: #f59e0b; }
        .status-critical { background: #ef4444; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>
                <span class="status-indicator status-${currentReport.summary.overallHealth}"></span>
                Test Health Dashboard
            </h1>
            <p class="timestamp">Last updated: ${new Date(summary.lastUpdated).toLocaleString()}</p>
            <p>Overall Health: <strong>${currentReport.summary.overallHealth.toUpperCase()}</strong> (Score: ${currentReport.summary.score}/100)</p>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value health-score">${currentReport.summary.score}/100</div>
                <div class="metric-label">Health Score</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${summary.passRate.toFixed(1)}%</div>
                <div class="metric-label">Pass Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${(summary.avgExecutionTime / 1000).toFixed(1)}s</div>
                <div class="metric-label">Execution Time</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${summary.coveragePercentage.toFixed(1)}%</div>
                <div class="metric-label">Coverage</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${summary.react19CompatibilityScore}%</div>
                <div class="metric-label">React 19 Compatibility</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${summary.totalTests}</div>
                <div class="metric-label">Total Tests</div>
            </div>
        </div>

        ${
          alerts.length > 0
            ? `
        <div class="alerts">
            <h2>Active Alerts</h2>
            ${alerts
              .map(
                (alert) => `
                <div class="alert ${alert.level}">
                    <strong>${alert.level}:</strong> ${alert.message}
                    <div class="timestamp">${new Date(alert.timestamp).toLocaleString()}</div>
                </div>
            `
              )
              .join('')}
        </div>
        `
            : ''
        }

        <div class="charts">
            <div class="chart-container">
                <h3>Health Score Trend</h3>
                <canvas id="healthChart" width="400" height="200"></canvas>
            </div>
            <div class="chart-container">
                <h3>Performance Trend</h3>
                <canvas id="performanceChart" width="400" height="200"></canvas>
            </div>
        </div>
    </div>

    <script>
        // Health Score Chart
        const healthCtx = document.getElementById('healthChart').getContext('2d');
        new Chart(healthCtx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(trends.healthScore.map((d) => new Date(d.timestamp).toLocaleTimeString()))},
                datasets: [{
                    label: 'Health Score',
                    data: ${JSON.stringify(trends.healthScore.map((d) => d.score))},
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, max: 100 }
                }
            }
        });

        // Performance Chart
        const performanceCtx = document.getElementById('performanceChart').getContext('2d');
        new Chart(performanceCtx, {
            type: 'line',
            data: {
                labels: ${JSON.stringify(trends.performance.map((d) => new Date(d.timestamp).toLocaleTimeString()))},
                datasets: [{
                    label: 'Execution Time (ms)',
                    data: ${JSON.stringify(trends.performance.map((d) => d.duration))},
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });

        // Auto-refresh every 30 seconds
        setTimeout(() => {
            window.location.reload();
        }, 30000);
    </script>
</body>
</html>
    `.trim();
  }
}

// Export singleton instance
export const testHealthDashboard = new TestHealthDashboard();
