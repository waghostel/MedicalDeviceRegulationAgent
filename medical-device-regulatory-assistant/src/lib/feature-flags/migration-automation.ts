/**
 * Automated Migration Validation and Rollback System
 * Monitors migration health and triggers automatic rollbacks when needed
 */

import { ABTestManager, ABTestResult } from './ab-testing';
import {
  FeatureFlagManager,
  MIGRATION_FLAGS,
  FeatureFlag,
} from './feature-flag-system';

export interface MigrationHealthCheck {
  flagKey: string;
  component: string;
  timestamp: string;
  metrics: {
    errorRate: number;
    responseTime: number;
    successRate: number;
    userSatisfaction?: number;
  };
  thresholds: {
    maxErrorRate: number;
    maxResponseTime: number;
    minSuccessRate: number;
  };
  status: 'healthy' | 'warning' | 'critical';
  recommendation: 'continue' | 'rollback' | 'investigate';
}

export interface MigrationRule {
  id: string;
  name: string;
  description: string;
  flagKey: string;
  conditions: MigrationCondition[];
  actions: MigrationAction[];
  enabled: boolean;
  priority: number; // Higher number = higher priority
}

export interface MigrationCondition {
  type:
    | 'error_rate'
    | 'response_time'
    | 'success_rate'
    | 'user_feedback'
    | 'custom';
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  duration?: number; // Time window in minutes
}

export interface MigrationAction {
  type: 'rollback' | 'alert' | 'reduce_traffic' | 'pause_migration' | 'custom';
  parameters: Record<string, any>;
  delay?: number; // Delay before executing action in minutes
}

export interface MigrationAlert {
  id: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  flagKey: string;
  component: string;
  message: string;
  metrics: Record<string, number>;
  actionTaken?: string;
}

export class MigrationAutomationManager {
  private flagManager: FeatureFlagManager;

  private abTestManager: ABTestManager;

  private rules: Map<string, MigrationRule> = new Map();

  private healthChecks: Map<string, MigrationHealthCheck[]> = new Map();

  private alerts: MigrationAlert[] = [];

  private monitoringInterval?: NodeJS.Timeout;

  constructor(flagManager: FeatureFlagManager, abTestManager: ABTestManager) {
    this.flagManager = flagManager;
    this.abTestManager = abTestManager;
    this.initializeDefaultRules();
  }

  private initializeDefaultRules(): void {
    // High error rate rollback rule
    this.addRule({
      id: 'high-error-rate-rollback',
      name: 'High Error Rate Rollback',
      description: 'Automatically rollback when error rate exceeds 5%',
      flagKey: '*', // Apply to all flags
      conditions: [
        {
          type: 'error_rate',
          operator: 'gt',
          value: 0.05,
          duration: 5,
        },
      ],
      actions: [
        {
          type: 'rollback',
          parameters: { reason: 'High error rate detected' },
        },
        {
          type: 'alert',
          parameters: {
            severity: 'critical',
            message: 'Automatic rollback triggered due to high error rate',
          },
        },
      ],
      enabled: true,
      priority: 100,
    });

    // Poor performance rollback rule
    this.addRule({
      id: 'poor-performance-rollback',
      name: 'Poor Performance Rollback',
      description: 'Rollback when response time degrades significantly',
      flagKey: '*',
      conditions: [
        {
          type: 'response_time',
          operator: 'gt',
          value: 2000, // 2 seconds
          duration: 10,
        },
      ],
      actions: [
        {
          type: 'reduce_traffic',
          parameters: { percentage: 50 },
          delay: 2,
        },
        {
          type: 'rollback',
          parameters: { reason: 'Poor performance detected' },
          delay: 5,
        },
      ],
      enabled: true,
      priority: 80,
    });

    // Low success rate warning
    this.addRule({
      id: 'low-success-rate-warning',
      name: 'Low Success Rate Warning',
      description: 'Alert when success rate drops below 95%',
      flagKey: '*',
      conditions: [
        {
          type: 'success_rate',
          operator: 'lt',
          value: 0.95,
          duration: 15,
        },
      ],
      actions: [
        {
          type: 'alert',
          parameters: {
            severity: 'warning',
            message: 'Success rate below threshold',
          },
        },
      ],
      enabled: true,
      priority: 60,
    });
  }

  public addRule(rule: MigrationRule): void {
    this.rules.set(rule.id, rule);
  }

  public removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  public updateRule(ruleId: string, updates: Partial<MigrationRule>): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      this.rules.set(ruleId, { ...rule, ...updates });
    }
  }

  public recordHealthCheck(healthCheck: MigrationHealthCheck): void {
    const {flagKey} = healthCheck;

    if (!this.healthChecks.has(flagKey)) {
      this.healthChecks.set(flagKey, []);
    }

    const checks = this.healthChecks.get(flagKey)!;
    checks.push(healthCheck);

    // Keep only last 100 health checks per flag
    if (checks.length > 100) {
      checks.splice(0, checks.length - 100);
    }

    // Evaluate rules for this health check
    this.evaluateRules(healthCheck);
  }

  private evaluateRules(healthCheck: MigrationHealthCheck): void {
    const applicableRules = Array.from(this.rules.values())
      .filter(
        (rule) =>
          rule.enabled &&
          (rule.flagKey === '*' || rule.flagKey === healthCheck.flagKey)
      )
      .sort((a, b) => b.priority - a.priority);

    for (const rule of applicableRules) {
      if (this.evaluateConditions(rule.conditions, healthCheck)) {
        this.executeActions(rule.actions, healthCheck, rule);
        break; // Execute only the highest priority matching rule
      }
    }
  }

  private evaluateConditions(
    conditions: MigrationCondition[],
    healthCheck: MigrationHealthCheck
  ): boolean {
    return conditions.every((condition) => {
      let value: number;

      switch (condition.type) {
        case 'error_rate':
          value = healthCheck.metrics.errorRate;
          break;
        case 'response_time':
          value = healthCheck.metrics.responseTime;
          break;
        case 'success_rate':
          value = healthCheck.metrics.successRate;
          break;
        case 'user_feedback':
          value = healthCheck.metrics.userSatisfaction || 0;
          break;
        default:
          return false;
      }

      return this.compareValues(value, condition.operator, condition.value);
    });
  }

  private compareValues(
    actual: number,
    operator: string,
    expected: number
  ): boolean {
    switch (operator) {
      case 'gt':
        return actual > expected;
      case 'lt':
        return actual < expected;
      case 'eq':
        return actual === expected;
      case 'gte':
        return actual >= expected;
      case 'lte':
        return actual <= expected;
      default:
        return false;
    }
  }

  private async executeActions(
    actions: MigrationAction[],
    healthCheck: MigrationHealthCheck,
    rule: MigrationRule
  ): Promise<void> {
    for (const action of actions) {
      if (action.delay) {
        setTimeout(
          () => this.executeAction(action, healthCheck, rule),
          action.delay * 60 * 1000
        );
      } else {
        await this.executeAction(action, healthCheck, rule);
      }
    }
  }

  private async executeAction(
    action: MigrationAction,
    healthCheck: MigrationHealthCheck,
    rule: MigrationRule
  ): Promise<void> {
    try {
      switch (action.type) {
        case 'rollback':
          await this.performRollback(
            healthCheck.flagKey,
            action.parameters.reason
          );
          break;

        case 'alert':
          this.createAlert({
            id: `alert-${Date.now()}`,
            timestamp: new Date().toISOString(),
            severity: action.parameters.severity,
            flagKey: healthCheck.flagKey,
            component: healthCheck.component,
            message: action.parameters.message,
            metrics: healthCheck.metrics,
            actionTaken: `Rule: ${rule.name}`,
          });
          break;

        case 'reduce_traffic':
          await this.reduceTraffic(
            healthCheck.flagKey,
            action.parameters.percentage
          );
          break;

        case 'pause_migration':
          await this.pauseMigration(healthCheck.flagKey);
          break;
      }
    } catch (error) {
      console.error(`Failed to execute action ${action.type}:`, error);
      this.createAlert({
        id: `error-${Date.now()}`,
        timestamp: new Date().toISOString(),
        severity: 'error',
        flagKey: healthCheck.flagKey,
        component: healthCheck.component,
        message: `Failed to execute action: ${action.type}`,
        metrics: healthCheck.metrics,
        actionTaken: `Error: ${error}`,
      });
    }
  }

  private async performRollback(
    flagKey: string,
    reason: string
  ): Promise<void> {
    console.log(`Performing rollback for flag ${flagKey}: ${reason}`);

    // Set flag to 0% (fully rolled back)
    await this.flagManager.updateFlag(flagKey, { percentage: 0 });

    this.createAlert({
      id: `rollback-${Date.now()}`,
      timestamp: new Date().toISOString(),
      severity: 'critical',
      flagKey,
      component: 'migration-automation',
      message: `Automatic rollback executed: ${reason}`,
      metrics: {},
      actionTaken: 'Rollback completed',
    });
  }

  private async reduceTraffic(
    flagKey: string,
    percentage: number
  ): Promise<void> {
    const currentFlag = await this.flagManager.getFlag(flagKey);
    if (currentFlag) {
      const newPercentage = Math.max(0, currentFlag.percentage - percentage);
      await this.flagManager.updateFlag(flagKey, { percentage: newPercentage });

      console.log(`Reduced traffic for flag ${flagKey} to ${newPercentage}%`);
    }
  }

  private async pauseMigration(flagKey: string): Promise<void> {
    await this.flagManager.updateFlag(flagKey, { enabled: false });
    console.log(`Paused migration for flag ${flagKey}`);
  }

  private createAlert(alert: MigrationAlert): void {
    this.alerts.push(alert);

    // Keep only last 1000 alerts
    if (this.alerts.length > 1000) {
      this.alerts.splice(0, this.alerts.length - 1000);
    }

    // Log alert
    console.log(
      `Migration Alert [${alert.severity.toUpperCase()}]: ${alert.message}`,
      {
        flagKey: alert.flagKey,
        component: alert.component,
        metrics: alert.metrics,
      }
    );

    // In a real implementation, you might send alerts to external systems
    // this.sendToSlack(alert);
    // this.sendToEmail(alert);
    // this.sendToPagerDuty(alert);
  }

  public getHealthHistory(
    flagKey: string,
    limit: number = 50
  ): MigrationHealthCheck[] {
    const checks = this.healthChecks.get(flagKey) || [];
    return checks.slice(-limit);
  }

  public getAlerts(
    flagKey?: string,
    severity?: string,
    limit: number = 100
  ): MigrationAlert[] {
    let filteredAlerts = this.alerts;

    if (flagKey) {
      filteredAlerts = filteredAlerts.filter(
        (alert) => alert.flagKey === flagKey
      );
    }

    if (severity) {
      filteredAlerts = filteredAlerts.filter(
        (alert) => alert.severity === severity
      );
    }

    return filteredAlerts.slice(-limit);
  }

  public generateHealthReport(flagKey: string): {
    overall: 'healthy' | 'warning' | 'critical';
    metrics: {
      avgErrorRate: number;
      avgResponseTime: number;
      avgSuccessRate: number;
    };
    trends: {
      errorRateTrend: 'improving' | 'stable' | 'degrading';
      responseTimeTrend: 'improving' | 'stable' | 'degrading';
      successRateTrend: 'improving' | 'stable' | 'degrading';
    };
    recommendations: string[];
  } {
    const checks = this.getHealthHistory(flagKey, 20);

    if (checks.length === 0) {
      return {
        overall: 'healthy',
        metrics: { avgErrorRate: 0, avgResponseTime: 0, avgSuccessRate: 1 },
        trends: {
          errorRateTrend: 'stable',
          responseTimeTrend: 'stable',
          successRateTrend: 'stable',
        },
        recommendations: ['No health data available'],
      };
    }

    // Calculate averages
    const avgErrorRate =
      checks.reduce((sum, check) => sum + check.metrics.errorRate, 0) /
      checks.length;
    const avgResponseTime =
      checks.reduce((sum, check) => sum + check.metrics.responseTime, 0) /
      checks.length;
    const avgSuccessRate =
      checks.reduce((sum, check) => sum + check.metrics.successRate, 0) /
      checks.length;

    // Determine overall health
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (
      avgErrorRate > 0.05 ||
      avgResponseTime > 2000 ||
      avgSuccessRate < 0.95
    ) {
      overall = 'critical';
    } else if (
      avgErrorRate > 0.02 ||
      avgResponseTime > 1000 ||
      avgSuccessRate < 0.98
    ) {
      overall = 'warning';
    }

    // Calculate trends (compare first half vs second half)
    const midpoint = Math.floor(checks.length / 2);
    const firstHalf = checks.slice(0, midpoint);
    const secondHalf = checks.slice(midpoint);

    const trends = {
      errorRateTrend: this.calculateTrend(firstHalf, secondHalf, 'errorRate'),
      responseTimeTrend: this.calculateTrend(
        firstHalf,
        secondHalf,
        'responseTime'
      ),
      successRateTrend: this.calculateTrend(
        firstHalf,
        secondHalf,
        'successRate',
        true
      ),
    };

    // Generate recommendations
    const recommendations: string[] = [];
    if (avgErrorRate > 0.02)
      recommendations.push('Consider investigating error causes');
    if (avgResponseTime > 1000)
      recommendations.push('Performance optimization may be needed');
    if (avgSuccessRate < 0.98)
      recommendations.push('Review success rate metrics');
    if (trends.errorRateTrend === 'degrading')
      recommendations.push('Error rate is increasing');
    if (trends.responseTimeTrend === 'degrading')
      recommendations.push('Response time is degrading');
    if (trends.successRateTrend === 'degrading')
      recommendations.push('Success rate is declining');

    return {
      overall,
      metrics: { avgErrorRate, avgResponseTime, avgSuccessRate },
      trends,
      recommendations:
        recommendations.length > 0
          ? recommendations
          : ['System appears healthy'],
    };
  }

  private calculateTrend(
    firstHalf: MigrationHealthCheck[],
    secondHalf: MigrationHealthCheck[],
    metric: keyof MigrationHealthCheck['metrics'],
    higherIsBetter: boolean = false
  ): 'improving' | 'stable' | 'degrading' {
    if (firstHalf.length === 0 || secondHalf.length === 0) return 'stable';

    const firstAvg =
      firstHalf.reduce(
        (sum, check) => sum + (check.metrics[metric] as number),
        0
      ) / firstHalf.length;
    const secondAvg =
      secondHalf.reduce(
        (sum, check) => sum + (check.metrics[metric] as number),
        0
      ) / secondHalf.length;

    const threshold = 0.05; // 5% change threshold
    const change = (secondAvg - firstAvg) / firstAvg;

    if (Math.abs(change) < threshold) return 'stable';

    if (higherIsBetter) {
      return change > 0 ? 'improving' : 'degrading';
    } 
      return change < 0 ? 'improving' : 'degrading';
    
  }

  public startMonitoring(intervalMinutes: number = 5): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(
      () => {
        this.performHealthChecks();
      },
      intervalMinutes * 60 * 1000
    );

    console.log(
      `Migration monitoring started with ${intervalMinutes} minute intervals`
    );
  }

  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      console.log('Migration monitoring stopped');
    }
  }

  private async performHealthChecks(): Promise<void> {
    // In a real implementation, this would collect metrics from various sources
    // For now, we'll simulate health checks for active migration flags

    const activeFlags = await this.flagManager.getActiveFlags();

    for (const flag of activeFlags) {
      if (flag.key.startsWith('migrate_')) {
        // Simulate health check (in real implementation, collect actual metrics)
        const healthCheck: MigrationHealthCheck = {
          flagKey: flag.key,
          component: flag.key.replace('migrate_', ''),
          timestamp: new Date().toISOString(),
          metrics: {
            errorRate: Math.random() * 0.1, // 0-10% error rate
            responseTime: 500 + Math.random() * 1000, // 500-1500ms response time
            successRate: 0.95 + Math.random() * 0.05, // 95-100% success rate
            userSatisfaction: 0.8 + Math.random() * 0.2, // 80-100% satisfaction
          },
          thresholds: {
            maxErrorRate: 0.05,
            maxResponseTime: 2000,
            minSuccessRate: 0.95,
          },
          status: 'healthy',
          recommendation: 'continue',
        };

        // Determine status based on metrics
        if (
          healthCheck.metrics.errorRate > healthCheck.thresholds.maxErrorRate ||
          healthCheck.metrics.responseTime >
            healthCheck.thresholds.maxResponseTime ||
          healthCheck.metrics.successRate <
            healthCheck.thresholds.minSuccessRate
        ) {
          healthCheck.status = 'critical';
          healthCheck.recommendation = 'rollback';
        } else if (
          healthCheck.metrics.errorRate >
            healthCheck.thresholds.maxErrorRate * 0.7 ||
          healthCheck.metrics.responseTime >
            healthCheck.thresholds.maxResponseTime * 0.7 ||
          healthCheck.metrics.successRate <
            healthCheck.thresholds.minSuccessRate + 0.02
        ) {
          healthCheck.status = 'warning';
          healthCheck.recommendation = 'investigate';
        }

        this.recordHealthCheck(healthCheck);
      }
    }
  }

  public getRules(): MigrationRule[] {
    return Array.from(this.rules.values());
  }

  public getRule(ruleId: string): MigrationRule | undefined {
    return this.rules.get(ruleId);
  }
}
