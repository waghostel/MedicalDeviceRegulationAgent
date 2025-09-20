/**
 * Automated Migration Validation and Rollback Triggers
 * Monitors migration health and triggers rollbacks when needed
 */

export interface ValidationTrigger {
  id: string;
  name: string;
  description: string;
  type: TriggerType;
  condition: TriggerCondition;
  action: TriggerAction;
  enabled: boolean;
  priority: TriggerPriority;
  cooldown: number; // minutes
  lastTriggered?: string;
  triggerCount: number;
}

export enum TriggerType {
  PERFORMANCE = 'performance',
  ERROR_RATE = 'error_rate',
  USER_FEEDBACK = 'user_feedback',
  BUSINESS_METRIC = 'business_metric',
  SYSTEM_HEALTH = 'system_health',
  DATA_QUALITY = 'data_quality',
}

export interface TriggerCondition {
  metric: string;
  operator: ConditionOperator;
  threshold: number;
  timeWindow: number; // minutes
  aggregation: AggregationType;
  sampleSize?: number;
}

export enum ConditionOperator {
  GREATER_THAN = 'gt',
  LESS_THAN = 'lt',
  EQUALS = 'eq',
  NOT_EQUALS = 'ne',
  GREATER_THAN_OR_EQUAL = 'gte',
  LESS_THAN_OR_EQUAL = 'lte',
}

export enum AggregationType {
  AVERAGE = 'avg',
  MAXIMUM = 'max',
  MINIMUM = 'min',
  PERCENTILE_95 = 'p95',
  PERCENTILE_99 = 'p99',
  COUNT = 'count',
  SUM = 'sum',
}

export interface TriggerAction {
  type: ActionType;
  parameters: ActionParameters;
  notifications: NotificationConfig[];
  rollbackStrategy?: RollbackStrategy;
}

export enum ActionType {
  ROLLBACK_COMPONENT = 'rollback_component',
  DISABLE_FEATURE_FLAG = 'disable_feature_flag',
  REDUCE_TRAFFIC = 'reduce_traffic',
  ALERT_TEAM = 'alert_team',
  PAUSE_MIGRATION = 'pause_migration',
  COLLECT_DIAGNOSTICS = 'collect_diagnostics',
}

export interface ActionParameters {
  componentPath?: string;
  featureFlagKey?: string;
  trafficReduction?: number; // percentage
  alertChannels?: string[];
  diagnosticLevel?: 'basic' | 'detailed' | 'comprehensive';
  customParameters?: Record<string, any>;
}

export interface NotificationConfig {
  channel: NotificationChannel;
  recipients: string[];
  template: string;
  urgency: NotificationUrgency;
}

export enum NotificationChannel {
  EMAIL = 'email',
  SLACK = 'slack',
  SMS = 'sms',
  WEBHOOK = 'webhook',
  DASHBOARD = 'dashboard',
}

export enum NotificationUrgency {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum TriggerPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4,
}

export enum RollbackStrategy {
  IMMEDIATE = 'immediate',
  GRADUAL = 'gradual',
  SELECTIVE = 'selective',
}

export interface ValidationMetrics {
  timestamp: string;
  metrics: MetricValue[];
  systemHealth: SystemHealthStatus;
  userFeedback: UserFeedbackSummary;
}

export interface MetricValue {
  name: string;
  value: number;
  unit: string;
  tags: Record<string, string>;
}

export interface SystemHealthStatus {
  overall: HealthStatus;
  components: ComponentHealth[];
  dependencies: DependencyHealth[];
}

export enum HealthStatus {
  HEALTHY = 'healthy',
  WARNING = 'warning',
  CRITICAL = 'critical',
  UNKNOWN = 'unknown',
}

export interface ComponentHealth {
  name: string;
  status: HealthStatus;
  responseTime: number;
  errorRate: number;
  lastCheck: string;
}

export interface DependencyHealth {
  name: string;
  type: 'database' | 'api' | 'service';
  status: HealthStatus;
  latency: number;
  availability: number;
}

export interface UserFeedbackSummary {
  totalFeedback: number;
  averageRating: number;
  negativePercentage: number;
  commonIssues: string[];
}

export interface TriggerEvent {
  id: string;
  triggerId: string;
  timestamp: string;
  condition: TriggerCondition;
  actualValue: number;
  threshold: number;
  action: TriggerAction;
  result: ActionResult;
}

export interface ActionResult {
  success: boolean;
  message: string;
  details?: Record<string, any>;
  duration: number; // milliseconds
}

/**
 * Migration Validation Monitor
 * Monitors migration health and triggers automated responses
 */
export class MigrationValidationMonitor {
  private triggers: Map<string, ValidationTrigger> = new Map();

  private events: TriggerEvent[] = [];

  private monitoring: boolean = false;

  private metricsCollector: MetricsCollector;

  private actionExecutor: ActionExecutor;

  constructor() {
    this.metricsCollector = new MetricsCollector();
    this.actionExecutor = new ActionExecutor();
    this.initializeDefaultTriggers();
  }

  /**
   * Initialize default validation triggers
   */
  private initializeDefaultTriggers(): void {
    // Performance triggers
    this.addTrigger({
      id: 'high_response_time',
      name: 'High Response Time',
      description: 'Trigger when API response time exceeds threshold',
      type: TriggerType.PERFORMANCE,
      condition: {
        metric: 'api_response_time',
        operator: ConditionOperator.GREATER_THAN,
        threshold: 2000, // 2 seconds
        timeWindow: 5, // 5 minutes
        aggregation: AggregationType.PERCENTILE_95,
        sampleSize: 10,
      },
      action: {
        type: ActionType.REDUCE_TRAFFIC,
        parameters: {
          trafficReduction: 50, // Reduce to 50%
        },
        notifications: [
          {
            channel: NotificationChannel.SLACK,
            recipients: ['#migration-alerts'],
            template: 'high_response_time_alert',
            urgency: NotificationUrgency.HIGH,
          },
        ],
        rollbackStrategy: RollbackStrategy.GRADUAL,
      },
      enabled: true,
      priority: TriggerPriority.HIGH,
      cooldown: 15, // 15 minutes
      triggerCount: 0,
    });

    this.addTrigger({
      id: 'high_error_rate',
      name: 'High Error Rate',
      description: 'Trigger when error rate exceeds acceptable threshold',
      type: TriggerType.ERROR_RATE,
      condition: {
        metric: 'error_rate',
        operator: ConditionOperator.GREATER_THAN,
        threshold: 5, // 5%
        timeWindow: 10, // 10 minutes
        aggregation: AggregationType.AVERAGE,
      },
      action: {
        type: ActionType.ROLLBACK_COMPONENT,
        parameters: {
          componentPath: 'all_migrated_components',
        },
        notifications: [
          {
            channel: NotificationChannel.EMAIL,
            recipients: ['tech-lead@company.com'],
            template: 'critical_error_rate_alert',
            urgency: NotificationUrgency.CRITICAL,
          },
          {
            channel: NotificationChannel.SMS,
            recipients: ['+1234567890'],
            template: 'sms_critical_alert',
            urgency: NotificationUrgency.CRITICAL,
          },
        ],
        rollbackStrategy: RollbackStrategy.IMMEDIATE,
      },
      enabled: true,
      priority: TriggerPriority.CRITICAL,
      cooldown: 5, // 5 minutes
      triggerCount: 0,
    });

    // User feedback trigger
    this.addTrigger({
      id: 'poor_user_satisfaction',
      name: 'Poor User Satisfaction',
      description: 'Trigger when user satisfaction drops significantly',
      type: TriggerType.USER_FEEDBACK,
      condition: {
        metric: 'user_satisfaction_score',
        operator: ConditionOperator.LESS_THAN,
        threshold: 3.5, // Out of 5
        timeWindow: 60, // 1 hour
        aggregation: AggregationType.AVERAGE,
        sampleSize: 20,
      },
      action: {
        type: ActionType.COLLECT_DIAGNOSTICS,
        parameters: {
          diagnosticLevel: 'comprehensive',
        },
        notifications: [
          {
            channel: NotificationChannel.SLACK,
            recipients: ['#product-team'],
            template: 'user_satisfaction_alert',
            urgency: NotificationUrgency.MEDIUM,
          },
        ],
      },
      enabled: true,
      priority: TriggerPriority.MEDIUM,
      cooldown: 30, // 30 minutes
      triggerCount: 0,
    });

    // Data quality trigger
    this.addTrigger({
      id: 'data_integrity_violation',
      name: 'Data Integrity Violation',
      description: 'Trigger when data integrity checks fail',
      type: TriggerType.DATA_QUALITY,
      condition: {
        metric: 'data_integrity_score',
        operator: ConditionOperator.LESS_THAN,
        threshold: 95, // 95%
        timeWindow: 15, // 15 minutes
        aggregation: AggregationType.MINIMUM,
      },
      action: {
        type: ActionType.PAUSE_MIGRATION,
        parameters: {},
        notifications: [
          {
            channel: NotificationChannel.EMAIL,
            recipients: ['data-team@company.com'],
            template: 'data_integrity_alert',
            urgency: NotificationUrgency.HIGH,
          },
        ],
      },
      enabled: true,
      priority: TriggerPriority.HIGH,
      cooldown: 10, // 10 minutes
      triggerCount: 0,
    });

    // Business metric trigger
    this.addTrigger({
      id: 'conversion_rate_drop',
      name: 'Conversion Rate Drop',
      description: 'Trigger when task completion rate drops',
      type: TriggerType.BUSINESS_METRIC,
      condition: {
        metric: 'task_completion_rate',
        operator: ConditionOperator.LESS_THAN,
        threshold: 85, // 85%
        timeWindow: 30, // 30 minutes
        aggregation: AggregationType.AVERAGE,
        sampleSize: 50,
      },
      action: {
        type: ActionType.DISABLE_FEATURE_FLAG,
        parameters: {
          featureFlagKey: 'gradual_migration_rollout',
        },
        notifications: [
          {
            channel: NotificationChannel.SLACK,
            recipients: ['#business-metrics'],
            template: 'conversion_drop_alert',
            urgency: NotificationUrgency.HIGH,
          },
        ],
      },
      enabled: true,
      priority: TriggerPriority.HIGH,
      cooldown: 20, // 20 minutes
      triggerCount: 0,
    });
  }

  /**
   * Add validation trigger
   */
  addTrigger(trigger: ValidationTrigger): void {
    this.triggers.set(trigger.id, trigger);
  }

  /**
   * Start monitoring
   */
  startMonitoring(): void {
    if (this.monitoring) {
      console.log('Monitoring already active');
      return;
    }

    this.monitoring = true;
    console.log('Starting migration validation monitoring...');

    // Start monitoring loop
    this.monitoringLoop();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    this.monitoring = false;
    console.log('Stopped migration validation monitoring');
  }

  /**
   * Main monitoring loop
   */
  private async monitoringLoop(): Promise<void> {
    while (this.monitoring) {
      try {
        // Collect current metrics
        const metrics = await this.metricsCollector.collectMetrics();

        // Check all triggers
        await this.checkTriggers(metrics);

        // Wait before next check (30 seconds)
        await this.delay(30000);
      } catch (error) {
        console.error('Error in monitoring loop:', error);
        await this.delay(5000); // Wait 5 seconds before retry
      }
    }
  }

  /**
   * Check all triggers against current metrics
   */
  private async checkTriggers(metrics: ValidationMetrics): Promise<void> {
    for (const trigger of this.triggers.values()) {
      if (!trigger.enabled) continue;

      // Check cooldown
      if (this.isInCooldown(trigger)) continue;

      // Evaluate trigger condition
      const shouldTrigger = this.evaluateTriggerCondition(trigger, metrics);

      if (shouldTrigger) {
        await this.executeTrigger(trigger, metrics);
      }
    }
  }

  /**
   * Check if trigger is in cooldown period
   */
  private isInCooldown(trigger: ValidationTrigger): boolean {
    if (!trigger.lastTriggered) return false;

    const lastTriggered = new Date(trigger.lastTriggered).getTime();
    const cooldownEnd = lastTriggered + trigger.cooldown * 60 * 1000;

    return Date.now() < cooldownEnd;
  }

  /**
   * Evaluate trigger condition against metrics
   */
  private evaluateTriggerCondition(
    trigger: ValidationTrigger,
    metrics: ValidationMetrics
  ): boolean {
    const {condition} = trigger;

    // Find metric value
    const metricValue = this.getMetricValue(
      metrics,
      condition.metric,
      condition.aggregation
    );
    if (metricValue === null) return false;

    // Evaluate condition
    switch (condition.operator) {
      case ConditionOperator.GREATER_THAN:
        return metricValue > condition.threshold;
      case ConditionOperator.LESS_THAN:
        return metricValue < condition.threshold;
      case ConditionOperator.GREATER_THAN_OR_EQUAL:
        return metricValue >= condition.threshold;
      case ConditionOperator.LESS_THAN_OR_EQUAL:
        return metricValue <= condition.threshold;
      case ConditionOperator.EQUALS:
        return metricValue === condition.threshold;
      case ConditionOperator.NOT_EQUALS:
        return metricValue !== condition.threshold;
      default:
        return false;
    }
  }

  /**
   * Get metric value with aggregation
   */
  private getMetricValue(
    metrics: ValidationMetrics,
    metricName: string,
    aggregation: AggregationType
  ): number | null {
    const metricValues = metrics.metrics
      .filter((m) => m.name === metricName)
      .map((m) => m.value);

    if (metricValues.length === 0) return null;

    switch (aggregation) {
      case AggregationType.AVERAGE:
        return (
          metricValues.reduce((sum, val) => sum + val, 0) / metricValues.length
        );
      case AggregationType.MAXIMUM:
        return Math.max(...metricValues);
      case AggregationType.MINIMUM:
        return Math.min(...metricValues);
      case AggregationType.PERCENTILE_95:
        return this.calculatePercentile(metricValues, 95);
      case AggregationType.PERCENTILE_99:
        return this.calculatePercentile(metricValues, 99);
      case AggregationType.COUNT:
        return metricValues.length;
      case AggregationType.SUM:
        return metricValues.reduce((sum, val) => sum + val, 0);
      default:
        return metricValues[0];
    }
  }

  /**
   * Calculate percentile
   */
  private calculatePercentile(values: number[], percentile: number): number {
    const sorted = values.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Execute trigger action
   */
  private async executeTrigger(
    trigger: ValidationTrigger,
    metrics: ValidationMetrics
  ): Promise<void> {
    console.log(`[ValidationMonitor] Executing trigger: ${trigger.name}`);

    const actualValue =
      this.getMetricValue(
        metrics,
        trigger.condition.metric,
        trigger.condition.aggregation
      ) || 0;

    try {
      // Execute action
      const result = await this.actionExecutor.executeAction(trigger.action);

      // Record trigger event
      const event: TriggerEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        triggerId: trigger.id,
        timestamp: new Date().toISOString(),
        condition: trigger.condition,
        actualValue,
        threshold: trigger.condition.threshold,
        action: trigger.action,
        result,
      };

      this.events.push(event);

      // Update trigger
      trigger.lastTriggered = new Date().toISOString();
      trigger.triggerCount++;

      // Send notifications
      await this.sendNotifications(trigger.action.notifications, {
        triggerName: trigger.name,
        actualValue,
        threshold: trigger.condition.threshold,
        actionResult: result,
      });

      console.log(
        `[ValidationMonitor] Trigger executed successfully: ${trigger.name}`
      );
    } catch (error) {
      console.error(
        `[ValidationMonitor] Failed to execute trigger ${trigger.name}:`,
        error
      );
    }
  }

  /**
   * Send notifications
   */
  private async sendNotifications(
    notifications: NotificationConfig[],
    context: Record<string, any>
  ): Promise<void> {
    for (const notification of notifications) {
      try {
        await this.sendNotification(notification, context);
      } catch (error) {
        console.error(
          `Failed to send notification via ${notification.channel}:`,
          error
        );
      }
    }
  }

  /**
   * Send individual notification
   */
  private async sendNotification(
    notification: NotificationConfig,
    context: Record<string, any>
  ): Promise<void> {
    console.log(
      `[Notification] ${notification.channel} to ${notification.recipients.join(', ')}`
    );
    console.log(`[Notification] Template: ${notification.template}`);
    console.log(`[Notification] Context:`, context);

    // In a real implementation, this would integrate with actual notification services
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get trigger by ID
   */
  getTrigger(id: string): ValidationTrigger | undefined {
    return this.triggers.get(id);
  }

  /**
   * Get all triggers
   */
  getAllTriggers(): ValidationTrigger[] {
    return Array.from(this.triggers.values());
  }

  /**
   * Get trigger events
   */
  getTriggerEvents(triggerId?: string): TriggerEvent[] {
    if (triggerId) {
      return this.events.filter((event) => event.triggerId === triggerId);
    }
    return [...this.events];
  }

  /**
   * Enable/disable trigger
   */
  setTriggerEnabled(id: string, enabled: boolean): boolean {
    const trigger = this.triggers.get(id);
    if (!trigger) return false;

    trigger.enabled = enabled;
    return true;
  }
}

/**
 * Metrics Collector
 * Collects system metrics for validation
 */
class MetricsCollector {
  async collectMetrics(): Promise<ValidationMetrics> {
    // In a real implementation, this would collect actual metrics
    // For now, generate mock metrics

    return {
      timestamp: new Date().toISOString(),
      metrics: [
        {
          name: 'api_response_time',
          value: Math.random() * 3000,
          unit: 'ms',
          tags: {},
        },
        {
          name: 'error_rate',
          value: Math.random() * 10,
          unit: 'percent',
          tags: {},
        },
        {
          name: 'user_satisfaction_score',
          value: 3.5 + Math.random() * 1.5,
          unit: 'score',
          tags: {},
        },
        {
          name: 'data_integrity_score',
          value: 90 + Math.random() * 10,
          unit: 'percent',
          tags: {},
        },
        {
          name: 'task_completion_rate',
          value: 80 + Math.random() * 20,
          unit: 'percent',
          tags: {},
        },
      ],
      systemHealth: {
        overall: HealthStatus.HEALTHY,
        components: [
          {
            name: 'frontend',
            status: HealthStatus.HEALTHY,
            responseTime: 200,
            errorRate: 0.1,
            lastCheck: new Date().toISOString(),
          },
          {
            name: 'backend',
            status: HealthStatus.HEALTHY,
            responseTime: 150,
            errorRate: 0.2,
            lastCheck: new Date().toISOString(),
          },
        ],
        dependencies: [
          {
            name: 'database',
            type: 'database',
            status: HealthStatus.HEALTHY,
            latency: 50,
            availability: 99.9,
          },
        ],
      },
      userFeedback: {
        totalFeedback: 100,
        averageRating: 4.2,
        negativePercentage: 15,
        commonIssues: ['Slow loading', 'Confusing UI'],
      },
    };
  }
}

/**
 * Action Executor
 * Executes trigger actions
 */
class ActionExecutor {
  async executeAction(action: TriggerAction): Promise<ActionResult> {
    const startTime = Date.now();

    try {
      switch (action.type) {
        case ActionType.ROLLBACK_COMPONENT:
          return await this.executeRollbackComponent(action.parameters);
        case ActionType.DISABLE_FEATURE_FLAG:
          return await this.executeDisableFeatureFlag(action.parameters);
        case ActionType.REDUCE_TRAFFIC:
          return await this.executeReduceTraffic(action.parameters);
        case ActionType.ALERT_TEAM:
          return await this.executeAlertTeam(action.parameters);
        case ActionType.PAUSE_MIGRATION:
          return await this.executePauseMigration(action.parameters);
        case ActionType.COLLECT_DIAGNOSTICS:
          return await this.executeCollectDiagnostics(action.parameters);
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }
    } catch (error) {
      return {
        success: false,
        message: `Action execution failed: ${error}`,
        duration: Date.now() - startTime,
      };
    }
  }

  private async executeRollbackComponent(
    params: ActionParameters
  ): Promise<ActionResult> {
    console.log(`[Action] Rolling back component: ${params.componentPath}`);

    // Simulate rollback action
    await this.delay(2000);

    return {
      success: true,
      message: `Component ${params.componentPath} rolled back successfully`,
      details: { componentPath: params.componentPath },
      duration: 2000,
    };
  }

  private async executeDisableFeatureFlag(
    params: ActionParameters
  ): Promise<ActionResult> {
    console.log(`[Action] Disabling feature flag: ${params.featureFlagKey}`);

    // Simulate feature flag disable
    await this.delay(500);

    return {
      success: true,
      message: `Feature flag ${params.featureFlagKey} disabled successfully`,
      details: { featureFlagKey: params.featureFlagKey },
      duration: 500,
    };
  }

  private async executeReduceTraffic(
    params: ActionParameters
  ): Promise<ActionResult> {
    console.log(`[Action] Reducing traffic to ${params.trafficReduction}%`);

    // Simulate traffic reduction
    await this.delay(1000);

    return {
      success: true,
      message: `Traffic reduced to ${params.trafficReduction}%`,
      details: { trafficReduction: params.trafficReduction },
      duration: 1000,
    };
  }

  private async executeAlertTeam(
    params: ActionParameters
  ): Promise<ActionResult> {
    console.log(
      `[Action] Alerting team via channels: ${params.alertChannels?.join(', ')}`
    );

    return {
      success: true,
      message: 'Team alerted successfully',
      details: { channels: params.alertChannels },
      duration: 100,
    };
  }

  private async executePauseMigration(
    params: ActionParameters
  ): Promise<ActionResult> {
    console.log('[Action] Pausing migration');

    // Simulate migration pause
    await this.delay(1500);

    return {
      success: true,
      message: 'Migration paused successfully',
      duration: 1500,
    };
  }

  private async executeCollectDiagnostics(
    params: ActionParameters
  ): Promise<ActionResult> {
    console.log(
      `[Action] Collecting diagnostics at level: ${params.diagnosticLevel}`
    );

    // Simulate diagnostic collection
    await this.delay(3000);

    return {
      success: true,
      message: `Diagnostics collected at ${params.diagnosticLevel} level`,
      details: { diagnosticLevel: params.diagnosticLevel },
      duration: 3000,
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Export utility functions
 */
export function createValidationMonitor(): MigrationValidationMonitor {
  return new MigrationValidationMonitor();
}

export function createPerformanceTrigger(
  threshold: number,
  timeWindow: number = 5
): ValidationTrigger {
  return {
    id: `performance_trigger_${Date.now()}`,
    name: 'Performance Threshold Trigger',
    description: `Trigger when response time exceeds ${threshold}ms`,
    type: TriggerType.PERFORMANCE,
    condition: {
      metric: 'api_response_time',
      operator: ConditionOperator.GREATER_THAN,
      threshold,
      timeWindow,
      aggregation: AggregationType.PERCENTILE_95,
    },
    action: {
      type: ActionType.REDUCE_TRAFFIC,
      parameters: { trafficReduction: 50 },
      notifications: [],
    },
    enabled: true,
    priority: TriggerPriority.HIGH,
    cooldown: 15,
    triggerCount: 0,
  };
}
