/**
 * Rollback Strategy and Automation
 * Provides comprehensive rollback capabilities for migration failures
 */

export interface RollbackConfiguration {
  strategy: RollbackStrategyType;
  triggers: RollbackTrigger[];
  automation: AutomationConfig;
  validation: ValidationConfig;
  communication: CommunicationConfig;
}

export enum RollbackStrategyType {
  IMMEDIATE = 'immediate',
  GRADUAL = 'gradual',
  SELECTIVE = 'selective',
  MANUAL = 'manual'
}

export interface RollbackTrigger {
  id: string;
  name: string;
  type: TriggerType;
  condition: TriggerCondition;
  threshold: number;
  timeWindow: number; // minutes
  enabled: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  autoExecute: boolean;
}

export enum TriggerType {
  ERROR_RATE = 'error_rate',
  RESPONSE_TIME = 'response_time',
  USER_COMPLAINTS = 'user_complaints',
  FUNCTIONALITY_FAILURE = 'functionality_failure',
  DATA_CORRUPTION = 'data_corruption',
  MANUAL = 'manual'
}

export interface TriggerCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  aggregation?: 'avg' | 'max' | 'min' | 'sum' | 'count';
  timeframe?: number; // minutes
}

export interface AutomationConfig {
  enabled: boolean;
  requireApproval: boolean;
  approvers: string[];
  maxAutoRollbacks: number;
  cooldownPeriod: number; // minutes
  notifications: NotificationConfig[];
}

export interface NotificationConfig {
  channel: 'email' | 'slack' | 'sms' | 'webhook';
  recipients: string[];
  template: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface ValidationConfig {
  preRollbackChecks: ValidationCheck[];
  postRollbackChecks: ValidationCheck[];
  timeout: number; // minutes
  retryAttempts: number;
}

export interface ValidationCheck {
  id: string;
  name: string;
  type: 'health_check' | 'data_integrity' | 'functionality' | 'performance';
  command: string;
  expectedResult: any;
  timeout: number; // seconds
  critical: boolean;
}

export interface CommunicationConfig {
  stakeholders: Stakeholder[];
  templates: CommunicationTemplate[];
  channels: CommunicationChannel[];
}

export interface Stakeholder {
  role: string;
  contacts: string[];
  notificationLevel: 'all' | 'critical' | 'manual';
}

export interface CommunicationTemplate {
  type: 'rollback_initiated' | 'rollback_completed' | 'rollback_failed';
  subject: string;
  body: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface CommunicationChannel {
  type: 'email' | 'slack' | 'teams' | 'webhook';
  config: Record<string, any>;
  enabled: boolean;
}

export interface RollbackPlan {
  id: string;
  name: string;
  description: string;
  components: ComponentRollback[];
  steps: RollbackStep[];
  estimatedTime: number; // minutes
  riskLevel: 'low' | 'medium' | 'high';
  prerequisites: string[];
  postRollbackActions: string[];
}

export interface ComponentRollback {
  componentPath: string;
  rollbackMethod: RollbackMethod;
  backupLocation: string;
  dependencies: string[];
  validationSteps: string[];
  estimatedTime: number; // minutes
}

export enum RollbackMethod {
  FEATURE_FLAG = 'feature_flag',
  CODE_REVERT = 'code_revert',
  DATABASE_RESTORE = 'database_restore',
  CONFIG_CHANGE = 'config_change',
  SERVICE_RESTART = 'service_restart'
}

export interface RollbackStep {
  order: number;
  name: string;
  description: string;
  method: RollbackMethod;
  parameters: Record<string, any>;
  validation: ValidationCheck;
  rollbackOnFailure: boolean;
  estimatedTime: number; // minutes
  dependencies: string[];
}

export interface RollbackExecution {
  id: string;
  planId: string;
  triggeredBy: string;
  triggerReason: string;
  startTime: string;
  endTime?: string;
  status: ExecutionStatus;
  steps: StepExecution[];
  logs: ExecutionLog[];
  metrics: ExecutionMetrics;
}

export enum ExecutionStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface StepExecution {
  stepId: string;
  startTime: string;
  endTime?: string;
  status: ExecutionStatus;
  output?: string;
  error?: string;
  retryCount: number;
}

export interface ExecutionLog {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, any>;
}

export interface ExecutionMetrics {
  totalTime: number; // minutes
  stepsCompleted: number;
  stepsTotal: number;
  errorsEncountered: number;
  validationsPassed: number;
  validationsTotal: number;
}

/**
 * Rollback Strategy Manager
 * Manages rollback plans, triggers, and execution
 */
export class RollbackStrategyManager {
  private config: RollbackConfiguration;
  private plans: Map<string, RollbackPlan> = new Map();
  private executions: Map<string, RollbackExecution> = new Map();
  private monitoring: boolean = false;

  constructor(config: RollbackConfiguration) {
    this.config = config;
    this.initializeDefaultPlans();
  }

  /**
   * Initialize default rollback plans for common scenarios
   */
  private initializeDefaultPlans(): void {
    // Feature flag rollback plan
    const featureFlagPlan: RollbackPlan = {
      id: 'feature-flag-rollback',
      name: 'Feature Flag Rollback',
      description: 'Rollback using feature flags to disable new functionality',
      components: [],
      steps: [
        {
          order: 1,
          name: 'Disable Feature Flags',
          description: 'Set feature flags to disable new implementation',
          method: RollbackMethod.FEATURE_FLAG,
          parameters: { action: 'disable_all_migration_flags' },
          validation: {
            id: 'feature-flag-validation',
            name: 'Verify Feature Flags Disabled',
            type: 'functionality',
            command: 'check_feature_flags',
            expectedResult: { migrationEnabled: false },
            timeout: 30,
            critical: true
          },
          rollbackOnFailure: false,
          estimatedTime: 2,
          dependencies: []
        },
        {
          order: 2,
          name: 'Verify Mock Data Active',
          description: 'Confirm components are using mock data',
          method: RollbackMethod.CONFIG_CHANGE,
          parameters: { action: 'verify_mock_data_usage' },
          validation: {
            id: 'mock-data-validation',
            name: 'Verify Mock Data Usage',
            type: 'functionality',
            command: 'check_mock_data_active',
            expectedResult: { mockDataActive: true },
            timeout: 60,
            critical: true
          },
          rollbackOnFailure: false,
          estimatedTime: 3,
          dependencies: ['feature-flag-validation']
        }
      ],
      estimatedTime: 5,
      riskLevel: 'low',
      prerequisites: ['Feature flags implemented', 'Mock data still available'],
      postRollbackActions: [
        'Monitor application stability',
        'Investigate root cause of migration failure',
        'Plan remediation strategy'
      ]
    };

    // Database restore rollback plan
    const databaseRestorePlan: RollbackPlan = {
      id: 'database-restore-rollback',
      name: 'Database Restore Rollback',
      description: 'Rollback by restoring database to pre-migration state',
      components: [],
      steps: [
        {
          order: 1,
          name: 'Stop Application Services',
          description: 'Stop all services to prevent data corruption',
          method: RollbackMethod.SERVICE_RESTART,
          parameters: { action: 'stop_services' },
          validation: {
            id: 'services-stopped',
            name: 'Verify Services Stopped',
            type: 'health_check',
            command: 'check_service_status',
            expectedResult: { allServicesStopped: true },
            timeout: 30,
            critical: true
          },
          rollbackOnFailure: false,
          estimatedTime: 2,
          dependencies: []
        },
        {
          order: 2,
          name: 'Restore Database Backup',
          description: 'Restore database from pre-migration backup',
          method: RollbackMethod.DATABASE_RESTORE,
          parameters: { 
            backupFile: 'pre_migration_backup.db',
            targetDatabase: 'medical_device_assistant.db'
          },
          validation: {
            id: 'database-restored',
            name: 'Verify Database Restored',
            type: 'data_integrity',
            command: 'verify_database_integrity',
            expectedResult: { integrityCheck: 'passed' },
            timeout: 120,
            critical: true
          },
          rollbackOnFailure: true,
          estimatedTime: 10,
          dependencies: ['services-stopped']
        },
        {
          order: 3,
          name: 'Restart Application Services',
          description: 'Restart services with restored database',
          method: RollbackMethod.SERVICE_RESTART,
          parameters: { action: 'start_services' },
          validation: {
            id: 'services-started',
            name: 'Verify Services Started',
            type: 'health_check',
            command: 'check_service_health',
            expectedResult: { allServicesHealthy: true },
            timeout: 60,
            critical: true
          },
          rollbackOnFailure: true,
          estimatedTime: 3,
          dependencies: ['database-restored']
        }
      ],
      estimatedTime: 15,
      riskLevel: 'medium',
      prerequisites: ['Database backup available', 'Services can be safely stopped'],
      postRollbackActions: [
        'Verify all functionality works correctly',
        'Check data consistency',
        'Monitor for any issues'
      ]
    };

    this.plans.set(featureFlagPlan.id, featureFlagPlan);
    this.plans.set(databaseRestorePlan.id, databaseRestorePlan);
  }

  /**
   * Add a custom rollback plan
   */
  addRollbackPlan(plan: RollbackPlan): void {
    this.plans.set(plan.id, plan);
  }

  /**
   * Get rollback plan by ID
   */
  getRollbackPlan(planId: string): RollbackPlan | undefined {
    return this.plans.get(planId);
  }

  /**
   * Start monitoring for rollback triggers
   */
  startMonitoring(): void {
    if (this.monitoring) {
      console.log('Rollback monitoring already active');
      return;
    }

    this.monitoring = true;
    console.log('Starting rollback monitoring...');

    // Set up monitoring for each trigger
    for (const trigger of this.config.triggers) {
      if (trigger.enabled) {
        this.setupTriggerMonitoring(trigger);
      }
    }
  }

  /**
   * Stop monitoring for rollback triggers
   */
  stopMonitoring(): void {
    this.monitoring = false;
    console.log('Stopped rollback monitoring');
  }

  /**
   * Execute rollback plan
   */
  async executeRollback(
    planId: string, 
    triggeredBy: string, 
    reason: string
  ): Promise<RollbackExecution> {
    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error(`Rollback plan not found: ${planId}`);
    }

    const execution: RollbackExecution = {
      id: this.generateExecutionId(),
      planId,
      triggeredBy,
      triggerReason: reason,
      startTime: new Date().toISOString(),
      status: ExecutionStatus.PENDING,
      steps: [],
      logs: [],
      metrics: {
        totalTime: 0,
        stepsCompleted: 0,
        stepsTotal: plan.steps.length,
        errorsEncountered: 0,
        validationsPassed: 0,
        validationsTotal: plan.steps.length
      }
    };

    this.executions.set(execution.id, execution);

    try {
      await this.executeRollbackPlan(execution, plan);
    } catch (error) {
      execution.status = ExecutionStatus.FAILED;
      this.addExecutionLog(execution, 'error', `Rollback execution failed: ${error}`);
    }

    execution.endTime = new Date().toISOString();
    execution.metrics.totalTime = this.calculateExecutionTime(execution);

    return execution;
  }

  /**
   * Execute rollback plan steps
   */
  private async executeRollbackPlan(execution: RollbackExecution, plan: RollbackPlan): Promise<void> {
    execution.status = ExecutionStatus.IN_PROGRESS;
    this.addExecutionLog(execution, 'info', `Starting rollback plan: ${plan.name}`);

    // Send rollback initiated notification
    await this.sendNotification('rollback_initiated', {
      planName: plan.name,
      triggeredBy: execution.triggeredBy,
      reason: execution.triggerReason
    });

    // Execute pre-rollback checks
    await this.executeValidationChecks(execution, this.config.validation.preRollbackChecks);

    // Execute rollback steps in order
    for (const step of plan.steps.sort((a, b) => a.order - b.order)) {
      const stepExecution = await this.executeRollbackStep(execution, step);
      execution.steps.push(stepExecution);

      if (stepExecution.status === ExecutionStatus.FAILED) {
        if (step.rollbackOnFailure) {
          this.addExecutionLog(execution, 'error', `Step failed, initiating step rollback: ${step.name}`);
          // Implement step-level rollback logic here
        } else {
          throw new Error(`Critical step failed: ${step.name}`);
        }
      } else {
        execution.metrics.stepsCompleted++;
      }
    }

    // Execute post-rollback checks
    await this.executeValidationChecks(execution, this.config.validation.postRollbackChecks);

    execution.status = ExecutionStatus.COMPLETED;
    this.addExecutionLog(execution, 'info', 'Rollback completed successfully');

    // Send rollback completed notification
    await this.sendNotification('rollback_completed', {
      planName: plan.name,
      executionTime: execution.metrics.totalTime,
      stepsCompleted: execution.metrics.stepsCompleted
    });
  }

  /**
   * Execute individual rollback step
   */
  private async executeRollbackStep(
    execution: RollbackExecution, 
    step: RollbackStep
  ): Promise<StepExecution> {
    const stepExecution: StepExecution = {
      stepId: step.name,
      startTime: new Date().toISOString(),
      status: ExecutionStatus.IN_PROGRESS,
      retryCount: 0
    };

    this.addExecutionLog(execution, 'info', `Executing step: ${step.name}`);

    try {
      // Execute the rollback step based on method
      await this.executeStepMethod(step);

      // Validate step execution
      const validationResult = await this.validateStep(step.validation);
      if (validationResult.success) {
        stepExecution.status = ExecutionStatus.COMPLETED;
        execution.metrics.validationsPassed++;
        this.addExecutionLog(execution, 'info', `Step completed successfully: ${step.name}`);
      } else {
        stepExecution.status = ExecutionStatus.FAILED;
        stepExecution.error = validationResult.error;
        execution.metrics.errorsEncountered++;
        this.addExecutionLog(execution, 'error', `Step validation failed: ${step.name} - ${validationResult.error}`);
      }
    } catch (error) {
      stepExecution.status = ExecutionStatus.FAILED;
      stepExecution.error = String(error);
      execution.metrics.errorsEncountered++;
      this.addExecutionLog(execution, 'error', `Step execution failed: ${step.name} - ${error}`);
    }

    stepExecution.endTime = new Date().toISOString();
    return stepExecution;
  }

  /**
   * Execute step method based on rollback method type
   */
  private async executeStepMethod(step: RollbackStep): Promise<void> {
    switch (step.method) {
      case RollbackMethod.FEATURE_FLAG:
        await this.executeFeatureFlagRollback(step.parameters);
        break;
      case RollbackMethod.CODE_REVERT:
        await this.executeCodeRevert(step.parameters);
        break;
      case RollbackMethod.DATABASE_RESTORE:
        await this.executeDatabaseRestore(step.parameters);
        break;
      case RollbackMethod.CONFIG_CHANGE:
        await this.executeConfigChange(step.parameters);
        break;
      case RollbackMethod.SERVICE_RESTART:
        await this.executeServiceRestart(step.parameters);
        break;
      default:
        throw new Error(`Unknown rollback method: ${step.method}`);
    }
  }

  /**
   * Execute feature flag rollback
   */
  private async executeFeatureFlagRollback(parameters: Record<string, any>): Promise<void> {
    // Implementation would integrate with feature flag system
    console.log('Executing feature flag rollback:', parameters);
    
    // Simulate feature flag changes
    if (parameters.action === 'disable_all_migration_flags') {
      // Set all migration-related feature flags to false
      const migrationFlags = [
        'enable_real_classification_api',
        'enable_real_predicate_api',
        'enable_real_project_api',
        'enable_database_integration'
      ];
      
      for (const flag of migrationFlags) {
        // In real implementation, this would call feature flag service
        console.log(`Disabling feature flag: ${flag}`);
      }
    }
  }

  /**
   * Execute code revert
   */
  private async executeCodeRevert(parameters: Record<string, any>): Promise<void> {
    console.log('Executing code revert:', parameters);
    
    // In real implementation, this would:
    // 1. Checkout previous commit/branch
    // 2. Deploy previous version
    // 3. Restart services
    
    throw new Error('Code revert not implemented - use feature flags for safer rollback');
  }

  /**
   * Execute database restore
   */
  private async executeDatabaseRestore(parameters: Record<string, any>): Promise<void> {
    console.log('Executing database restore:', parameters);
    
    const { backupFile, targetDatabase } = parameters;
    
    // In real implementation, this would:
    // 1. Stop database connections
    // 2. Restore from backup file
    // 3. Verify data integrity
    // 4. Restart connections
    
    // Simulate database restore
    console.log(`Restoring ${targetDatabase} from ${backupFile}`);
    
    // Add artificial delay to simulate restore time
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  /**
   * Execute config change
   */
  private async executeConfigChange(parameters: Record<string, any>): Promise<void> {
    console.log('Executing config change:', parameters);
    
    // Implementation would modify configuration files or environment variables
    if (parameters.action === 'verify_mock_data_usage') {
      // Check that components are using mock data
      console.log('Verifying mock data usage across components');
    }
  }

  /**
   * Execute service restart
   */
  private async executeServiceRestart(parameters: Record<string, any>): Promise<void> {
    console.log('Executing service restart:', parameters);
    
    const { action } = parameters;
    
    if (action === 'stop_services') {
      console.log('Stopping application services...');
      // Stop backend services, frontend build processes, etc.
    } else if (action === 'start_services') {
      console.log('Starting application services...');
      // Start services in correct order
    }
    
    // Add delay to simulate service restart time
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  /**
   * Validate step execution
   */
  private async validateStep(validation: ValidationCheck): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Validating: ${validation.name}`);
      
      // Simulate validation based on type
      switch (validation.type) {
        case 'health_check':
          return await this.validateHealthCheck(validation);
        case 'data_integrity':
          return await this.validateDataIntegrity(validation);
        case 'functionality':
          return await this.validateFunctionality(validation);
        case 'performance':
          return await this.validatePerformance(validation);
        default:
          return { success: false, error: `Unknown validation type: ${validation.type}` };
      }
    } catch (error) {
      return { success: false, error: String(error) };
    }
  }

  private async validateHealthCheck(validation: ValidationCheck): Promise<{ success: boolean; error?: string }> {
    // Simulate health check validation
    console.log(`Running health check: ${validation.command}`);
    
    // In real implementation, this would check service health endpoints
    return { success: true };
  }

  private async validateDataIntegrity(validation: ValidationCheck): Promise<{ success: boolean; error?: string }> {
    // Simulate data integrity validation
    console.log(`Checking data integrity: ${validation.command}`);
    
    // In real implementation, this would run database integrity checks
    return { success: true };
  }

  private async validateFunctionality(validation: ValidationCheck): Promise<{ success: boolean; error?: string }> {
    // Simulate functionality validation
    console.log(`Testing functionality: ${validation.command}`);
    
    // In real implementation, this would run automated tests
    return { success: true };
  }

  private async validatePerformance(validation: ValidationCheck): Promise<{ success: boolean; error?: string }> {
    // Simulate performance validation
    console.log(`Checking performance: ${validation.command}`);
    
    // In real implementation, this would measure response times, etc.
    return { success: true };
  }

  /**
   * Execute validation checks
   */
  private async executeValidationChecks(
    execution: RollbackExecution, 
    checks: ValidationCheck[]
  ): Promise<void> {
    for (const check of checks) {
      const result = await this.validateStep(check);
      if (!result.success && check.critical) {
        throw new Error(`Critical validation failed: ${check.name} - ${result.error}`);
      }
    }
  }

  /**
   * Setup monitoring for a specific trigger
   */
  private setupTriggerMonitoring(trigger: RollbackTrigger): void {
    console.log(`Setting up monitoring for trigger: ${trigger.name}`);
    
    // In real implementation, this would:
    // 1. Set up metrics collection
    // 2. Configure alerting thresholds
    // 3. Connect to monitoring systems
    
    // Simulate trigger monitoring
    setInterval(() => {
      if (this.monitoring) {
        this.checkTriggerCondition(trigger);
      }
    }, trigger.timeWindow * 1000); // Convert minutes to milliseconds
  }

  /**
   * Check if trigger condition is met
   */
  private checkTriggerCondition(trigger: RollbackTrigger): void {
    // In real implementation, this would query monitoring systems
    // For simulation, we'll randomly trigger based on probability
    
    const shouldTrigger = Math.random() < 0.001; // Very low probability for demo
    
    if (shouldTrigger && trigger.autoExecute) {
      console.log(`Trigger activated: ${trigger.name}`);
      
      // Execute appropriate rollback plan
      const planId = this.selectRollbackPlan(trigger);
      if (planId) {
        this.executeRollback(planId, 'automated', `Trigger: ${trigger.name}`);
      }
    }
  }

  /**
   * Select appropriate rollback plan for trigger
   */
  private selectRollbackPlan(trigger: RollbackTrigger): string | null {
    // Select rollback plan based on trigger type and severity
    switch (trigger.type) {
      case TriggerType.ERROR_RATE:
      case TriggerType.FUNCTIONALITY_FAILURE:
        return 'feature-flag-rollback';
      case TriggerType.DATA_CORRUPTION:
        return 'database-restore-rollback';
      default:
        return 'feature-flag-rollback';
    }
  }

  /**
   * Send notification
   */
  private async sendNotification(type: string, data: Record<string, any>): Promise<void> {
    console.log(`Sending notification: ${type}`, data);
    
    // In real implementation, this would send notifications via configured channels
    for (const notification of this.config.automation.notifications) {
      console.log(`Notification sent via ${notification.channel} to ${notification.recipients.join(', ')}`);
    }
  }

  /**
   * Add execution log entry
   */
  private addExecutionLog(
    execution: RollbackExecution, 
    level: 'debug' | 'info' | 'warn' | 'error', 
    message: string,
    context?: Record<string, any>
  ): void {
    execution.logs.push({
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    });
  }

  /**
   * Calculate execution time
   */
  private calculateExecutionTime(execution: RollbackExecution): number {
    if (!execution.endTime) return 0;
    
    const start = new Date(execution.startTime).getTime();
    const end = new Date(execution.endTime).getTime();
    return Math.round((end - start) / 1000 / 60); // Convert to minutes
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `rollback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get execution status
   */
  getExecution(executionId: string): RollbackExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Get all executions
   */
  getAllExecutions(): RollbackExecution[] {
    return Array.from(this.executions.values());
  }

  /**
   * Get rollback statistics
   */
  getStatistics(): {
    totalExecutions: number;
    successfulExecutions: number;
    failedExecutions: number;
    averageExecutionTime: number;
  } {
    const executions = this.getAllExecutions();
    const successful = executions.filter(e => e.status === ExecutionStatus.COMPLETED);
    const failed = executions.filter(e => e.status === ExecutionStatus.FAILED);
    const avgTime = executions.reduce((sum, e) => sum + e.metrics.totalTime, 0) / executions.length || 0;

    return {
      totalExecutions: executions.length,
      successfulExecutions: successful.length,
      failedExecutions: failed.length,
      averageExecutionTime: avgTime
    };
  }
}

/**
 * Create default rollback configuration
 */
export function createDefaultRollbackConfig(): RollbackConfiguration {
  return {
    strategy: RollbackStrategyType.GRADUAL,
    triggers: [
      {
        id: 'error-rate-trigger',
        name: 'High Error Rate',
        type: TriggerType.ERROR_RATE,
        condition: {
          metric: 'error_rate',
          operator: 'gt',
          value: 5, // 5% error rate
          aggregation: 'avg',
          timeframe: 5 // 5 minutes
        },
        threshold: 5,
        timeWindow: 15,
        enabled: true,
        priority: 'high',
        autoExecute: true
      },
      {
        id: 'response-time-trigger',
        name: 'Slow Response Time',
        type: TriggerType.RESPONSE_TIME,
        condition: {
          metric: 'response_time_p95',
          operator: 'gt',
          value: 5000, // 5 seconds
          aggregation: 'avg',
          timeframe: 10 // 10 minutes
        },
        threshold: 5000,
        timeWindow: 10,
        enabled: true,
        priority: 'medium',
        autoExecute: false
      }
    ],
    automation: {
      enabled: true,
      requireApproval: false,
      approvers: ['tech-lead@company.com'],
      maxAutoRollbacks: 3,
      cooldownPeriod: 60, // 1 hour
      notifications: [
        {
          channel: 'email',
          recipients: ['dev-team@company.com'],
          template: 'rollback-notification',
          urgency: 'high'
        }
      ]
    },
    validation: {
      preRollbackChecks: [
        {
          id: 'backup-exists',
          name: 'Verify Backup Exists',
          type: 'data_integrity',
          command: 'check_backup_availability',
          expectedResult: { backupExists: true },
          timeout: 30,
          critical: true
        }
      ],
      postRollbackChecks: [
        {
          id: 'system-health',
          name: 'System Health Check',
          type: 'health_check',
          command: 'health_check_all',
          expectedResult: { healthy: true },
          timeout: 60,
          critical: true
        }
      ],
      timeout: 30,
      retryAttempts: 3
    },
    communication: {
      stakeholders: [
        {
          role: 'Development Team',
          contacts: ['dev-team@company.com'],
          notificationLevel: 'all'
        },
        {
          role: 'Product Management',
          contacts: ['product@company.com'],
          notificationLevel: 'critical'
        }
      ],
      templates: [
        {
          type: 'rollback_initiated',
          subject: 'Migration Rollback Initiated',
          body: 'A migration rollback has been initiated due to: {{reason}}',
          urgency: 'high'
        },
        {
          type: 'rollback_completed',
          subject: 'Migration Rollback Completed',
          body: 'Migration rollback completed successfully in {{executionTime}} minutes',
          urgency: 'medium'
        }
      ],
      channels: [
        {
          type: 'email',
          config: { smtpServer: 'smtp.company.com' },
          enabled: true
        }
      ]
    }
  };
}