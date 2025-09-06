/**
 * Feature Flags System for Gradual Migration
 * Enables safe rollout of real data connections with rollback capabilities
 */

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  conditions: FlagCondition[];
  metadata: FlagMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface FlagCondition {
  type: ConditionType;
  operator: ConditionOperator;
  value: any;
  description: string;
}

export enum ConditionType {
  USER_ID = 'user_id',
  USER_ROLE = 'user_role',
  PROJECT_ID = 'project_id',
  COMPONENT_PATH = 'component_path',
  ENVIRONMENT = 'environment',
  TIME_WINDOW = 'time_window',
  RANDOM_PERCENTAGE = 'random_percentage'
}

export enum ConditionOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  IN = 'in',
  NOT_IN = 'not_in',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  CONTAINS = 'contains',
  MATCHES = 'matches'
}

export interface FlagMetadata {
  component?: string;
  migrationPhase?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  rollbackTriggers: RollbackTrigger[];
  owner: string;
  reviewers: string[];
  tags: string[];
}

export interface RollbackTrigger {
  metric: string;
  threshold: number;
  timeWindow: number; // minutes
  action: 'disable' | 'reduce_rollout' | 'alert';
}

export interface FlagEvaluationContext {
  userId?: string;
  userRole?: string;
  projectId?: string;
  componentPath?: string;
  environment: string;
  timestamp: number;
  sessionId?: string;
  customAttributes?: Record<string, any>;
}

export interface FlagEvaluationResult {
  flagKey: string;
  enabled: boolean;
  reason: string;
  variant?: string;
  metadata?: Record<string, any>;
}

export interface FlagConfiguration {
  flags: FeatureFlag[];
  defaultEnabled: boolean;
  evaluationMode: 'strict' | 'permissive';
  cacheTtl: number; // seconds
  metricsEnabled: boolean;
}

export interface FlagMetrics {
  flagKey: string;
  evaluations: number;
  enabledCount: number;
  disabledCount: number;
  errorCount: number;
  lastEvaluated: string;
  averageEvaluationTime: number; // milliseconds
}

/**
 * Feature Flag Manager
 * Manages feature flags for gradual migration rollout
 */
export class FeatureFlagManager {
  private flags: Map<string, FeatureFlag> = new Map();
  private config: FlagConfiguration;
  private metrics: Map<string, FlagMetrics> = new Map();
  private cache: Map<string, { result: FlagEvaluationResult; expiry: number }> = new Map();

  constructor(config?: Partial<FlagConfiguration>) {
    this.config = {
      flags: [],
      defaultEnabled: false,
      evaluationMode: 'strict',
      cacheTtl: 300, // 5 minutes
      metricsEnabled: true,
      ...config
    };

    this.initializeMigrationFlags();
  }

  /**
   * Initialize migration-specific feature flags
   */
  private initializeMigrationFlags(): void {
    // Database integration flags
    this.addFlag({
      key: 'enable_real_database',
      name: 'Enable Real Database Integration',
      description: 'Switch from mock data to real database connections',
      enabled: false,
      rolloutPercentage: 0,
      conditions: [
        {
          type: ConditionType.ENVIRONMENT,
          operator: ConditionOperator.IN,
          value: ['development', 'staging'],
          description: 'Only enable in development and staging environments'
        }
      ],
      metadata: {
        riskLevel: 'critical',
        rollbackTriggers: [
          {
            metric: 'error_rate',
            threshold: 5, // 5% error rate
            timeWindow: 15,
            action: 'disable'
          },
          {
            metric: 'response_time_p95',
            threshold: 5000, // 5 seconds
            timeWindow: 10,
            action: 'reduce_rollout'
          }
        ],
        owner: 'migration-team',
        reviewers: ['tech-lead', 'qa-lead'],
        tags: ['migration', 'database', 'critical']
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Component-specific flags
    this.addFlag({
      key: 'enable_real_classification_api',
      name: 'Enable Real Classification API',
      description: 'Use real API for device classification instead of mock data',
      enabled: false,
      rolloutPercentage: 0,
      conditions: [
        {
          type: ConditionType.COMPONENT_PATH,
          operator: ConditionOperator.CONTAINS,
          value: 'classification-widget',
          description: 'Only apply to classification widget component'
        }
      ],
      metadata: {
        component: 'ClassificationWidget',
        migrationPhase: 'phase-1',
        riskLevel: 'high',
        rollbackTriggers: [
          {
            metric: 'classification_success_rate',
            threshold: 90, // 90% success rate
            timeWindow: 30,
            action: 'disable'
          }
        ],
        owner: 'frontend-team',
        reviewers: ['tech-lead'],
        tags: ['migration', 'classification', 'api']
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    this.addFlag({
      key: 'enable_real_predicate_api',
      name: 'Enable Real Predicate API',
      description: 'Use real API for predicate search instead of mock data',
      enabled: false,
      rolloutPercentage: 0,
      conditions: [
        {
          type: ConditionType.COMPONENT_PATH,
          operator: ConditionOperator.CONTAINS,
          value: 'predicate-widget',
          description: 'Only apply to predicate widget component'
        }
      ],
      metadata: {
        component: 'PredicateWidget',
        migrationPhase: 'phase-1',
        riskLevel: 'high',
        rollbackTriggers: [
          {
            metric: 'predicate_search_success_rate',
            threshold: 85, // 85% success rate
            timeWindow: 30,
            action: 'disable'
          }
        ],
        owner: 'frontend-team',
        reviewers: ['tech-lead'],
        tags: ['migration', 'predicate', 'api']
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    this.addFlag({
      key: 'enable_real_project_api',
      name: 'Enable Real Project API',
      description: 'Use real API for project management instead of mock data',
      enabled: false,
      rolloutPercentage: 0,
      conditions: [
        {
          type: ConditionType.COMPONENT_PATH,
          operator: ConditionOperator.IN,
          value: ['project-card', 'project-list', 'project-form'],
          description: 'Apply to project management components'
        }
      ],
      metadata: {
        component: 'ProjectComponents',
        migrationPhase: 'phase-2',
        riskLevel: 'medium',
        rollbackTriggers: [
          {
            metric: 'project_operation_success_rate',
            threshold: 95, // 95% success rate
            timeWindow: 20,
            action: 'disable'
          }
        ],
        owner: 'frontend-team',
        reviewers: ['product-owner'],
        tags: ['migration', 'projects', 'api']
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // Gradual rollout flags
    this.addFlag({
      key: 'gradual_migration_rollout',
      name: 'Gradual Migration Rollout',
      description: 'Gradually roll out migration to percentage of users',
      enabled: false,
      rolloutPercentage: 10, // Start with 10% of users
      conditions: [
        {
          type: ConditionType.RANDOM_PERCENTAGE,
          operator: ConditionOperator.LESS_THAN,
          value: 10,
          description: 'Roll out to 10% of users randomly'
        }
      ],
      metadata: {
        riskLevel: 'medium',
        rollbackTriggers: [
          {
            metric: 'user_satisfaction_score',
            threshold: 4.0, // 4.0/5.0 satisfaction
            timeWindow: 60,
            action: 'reduce_rollout'
          }
        ],
        owner: 'product-team',
        reviewers: ['tech-lead', 'product-owner'],
        tags: ['migration', 'rollout', 'gradual']
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    // A/B testing flag
    this.addFlag({
      key: 'ab_test_migration_performance',
      name: 'A/B Test Migration Performance',
      description: 'Compare performance between mock and real data implementations',
      enabled: false,
      rolloutPercentage: 50, // 50/50 split
      conditions: [
        {
          type: ConditionType.USER_ID,
          operator: ConditionOperator.MATCHES,
          value: /[02468]$/, // Users with even-ending IDs get real data
          description: 'Split users based on user ID for A/B testing'
        }
      ],
      metadata: {
        riskLevel: 'low',
        rollbackTriggers: [],
        owner: 'data-team',
        reviewers: ['tech-lead', 'data-analyst'],
        tags: ['migration', 'ab-test', 'performance']
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  /**
   * Add feature flag
   */
  addFlag(flag: FeatureFlag): void {
    this.flags.set(flag.key, flag);
    
    // Initialize metrics
    if (this.config.metricsEnabled) {
      this.metrics.set(flag.key, {
        flagKey: flag.key,
        evaluations: 0,
        enabledCount: 0,
        disabledCount: 0,
        errorCount: 0,
        lastEvaluated: new Date().toISOString(),
        averageEvaluationTime: 0
      });
    }
  }

  /**
   * Get feature flag
   */
  getFlag(key: string): FeatureFlag | undefined {
    return this.flags.get(key);
  }

  /**
   * Update feature flag
   */
  updateFlag(key: string, updates: Partial<FeatureFlag>): boolean {
    const flag = this.flags.get(key);
    if (!flag) return false;

    const updatedFlag = {
      ...flag,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.flags.set(key, updatedFlag);
    this.clearCache(key);
    return true;
  }

  /**
   * Enable feature flag
   */
  enableFlag(key: string, rolloutPercentage: number = 100): boolean {
    return this.updateFlag(key, { 
      enabled: true, 
      rolloutPercentage: Math.max(0, Math.min(100, rolloutPercentage))
    });
  }

  /**
   * Disable feature flag
   */
  disableFlag(key: string): boolean {
    return this.updateFlag(key, { enabled: false, rolloutPercentage: 0 });
  }

  /**
   * Evaluate feature flag
   */
  evaluateFlag(key: string, context: FlagEvaluationContext): FlagEvaluationResult {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(key, context);
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiry > Date.now()) {
        this.updateMetrics(key, cached.result.enabled, Date.now() - startTime);
        return cached.result;
      }

      const flag = this.flags.get(key);
      
      // Flag not found
      if (!flag) {
        const result: FlagEvaluationResult = {
          flagKey: key,
          enabled: this.config.defaultEnabled,
          reason: 'Flag not found, using default value'
        };
        this.updateMetrics(key, result.enabled, Date.now() - startTime, true);
        return result;
      }

      // Flag disabled
      if (!flag.enabled) {
        const result: FlagEvaluationResult = {
          flagKey: key,
          enabled: false,
          reason: 'Flag is disabled'
        };
        this.cacheResult(cacheKey, result);
        this.updateMetrics(key, result.enabled, Date.now() - startTime);
        return result;
      }

      // Evaluate conditions
      const conditionResult = this.evaluateConditions(flag.conditions, context);
      if (!conditionResult.passed) {
        const result: FlagEvaluationResult = {
          flagKey: key,
          enabled: false,
          reason: `Condition not met: ${conditionResult.reason}`
        };
        this.cacheResult(cacheKey, result);
        this.updateMetrics(key, result.enabled, Date.now() - startTime);
        return result;
      }

      // Check rollout percentage
      const rolloutResult = this.evaluateRollout(flag.rolloutPercentage, context);
      const enabled = rolloutResult.included;
      
      const result: FlagEvaluationResult = {
        flagKey: key,
        enabled,
        reason: enabled ? 'Flag enabled and conditions met' : rolloutResult.reason,
        metadata: {
          rolloutPercentage: flag.rolloutPercentage,
          conditionsEvaluated: flag.conditions.length
        }
      };

      this.cacheResult(cacheKey, result);
      this.updateMetrics(key, result.enabled, Date.now() - startTime);
      return result;

    } catch (error) {
      const result: FlagEvaluationResult = {
        flagKey: key,
        enabled: this.config.defaultEnabled,
        reason: `Evaluation error: ${error}`
      };
      this.updateMetrics(key, result.enabled, Date.now() - startTime, true);
      return result;
    }
  }

  /**
   * Evaluate multiple flags at once
   */
  evaluateFlags(keys: string[], context: FlagEvaluationContext): Record<string, FlagEvaluationResult> {
    const results: Record<string, FlagEvaluationResult> = {};
    
    for (const key of keys) {
      results[key] = this.evaluateFlag(key, context);
    }
    
    return results;
  }

  /**
   * Evaluate conditions
   */
  private evaluateConditions(
    conditions: FlagCondition[], 
    context: FlagEvaluationContext
  ): { passed: boolean; reason: string } {
    if (conditions.length === 0) {
      return { passed: true, reason: 'No conditions to evaluate' };
    }

    for (const condition of conditions) {
      const result = this.evaluateCondition(condition, context);
      if (!result.passed) {
        return result;
      }
    }

    return { passed: true, reason: 'All conditions passed' };
  }

  /**
   * Evaluate single condition
   */
  private evaluateCondition(
    condition: FlagCondition, 
    context: FlagEvaluationContext
  ): { passed: boolean; reason: string } {
    let contextValue: any;

    // Get context value based on condition type
    switch (condition.type) {
      case ConditionType.USER_ID:
        contextValue = context.userId;
        break;
      case ConditionType.USER_ROLE:
        contextValue = context.userRole;
        break;
      case ConditionType.PROJECT_ID:
        contextValue = context.projectId;
        break;
      case ConditionType.COMPONENT_PATH:
        contextValue = context.componentPath;
        break;
      case ConditionType.ENVIRONMENT:
        contextValue = context.environment;
        break;
      case ConditionType.TIME_WINDOW:
        contextValue = context.timestamp;
        break;
      case ConditionType.RANDOM_PERCENTAGE:
        contextValue = this.generateRandomPercentage(context);
        break;
      default:
        return { passed: false, reason: `Unknown condition type: ${condition.type}` };
    }

    // Evaluate based on operator
    const passed = this.evaluateOperator(condition.operator, contextValue, condition.value);
    
    return {
      passed,
      reason: passed ? 
        `Condition passed: ${condition.description}` : 
        `Condition failed: ${condition.description} (${contextValue} ${condition.operator} ${condition.value})`
    };
  }

  /**
   * Evaluate operator
   */
  private evaluateOperator(operator: ConditionOperator, contextValue: any, conditionValue: any): boolean {
    switch (operator) {
      case ConditionOperator.EQUALS:
        return contextValue === conditionValue;
      case ConditionOperator.NOT_EQUALS:
        return contextValue !== conditionValue;
      case ConditionOperator.IN:
        return Array.isArray(conditionValue) && conditionValue.includes(contextValue);
      case ConditionOperator.NOT_IN:
        return Array.isArray(conditionValue) && !conditionValue.includes(contextValue);
      case ConditionOperator.GREATER_THAN:
        return contextValue > conditionValue;
      case ConditionOperator.LESS_THAN:
        return contextValue < conditionValue;
      case ConditionOperator.CONTAINS:
        return String(contextValue).includes(String(conditionValue));
      case ConditionOperator.MATCHES:
        return conditionValue instanceof RegExp ? 
          conditionValue.test(String(contextValue)) : 
          String(contextValue) === String(conditionValue);
      default:
        return false;
    }
  }

  /**
   * Evaluate rollout percentage
   */
  private evaluateRollout(
    rolloutPercentage: number, 
    context: FlagEvaluationContext
  ): { included: boolean; reason: string } {
    if (rolloutPercentage >= 100) {
      return { included: true, reason: 'Full rollout (100%)' };
    }

    if (rolloutPercentage <= 0) {
      return { included: false, reason: 'No rollout (0%)' };
    }

    // Use consistent hash based on user ID or session ID
    const hashInput = context.userId || context.sessionId || 'anonymous';
    const hash = this.simpleHash(hashInput);
    const userPercentage = hash % 100;

    const included = userPercentage < rolloutPercentage;
    
    return {
      included,
      reason: included ? 
        `Included in ${rolloutPercentage}% rollout` : 
        `Not included in ${rolloutPercentage}% rollout`
    };
  }

  /**
   * Generate random percentage for random conditions
   */
  private generateRandomPercentage(context: FlagEvaluationContext): number {
    // Use session-based randomness for consistency within session
    const seed = context.sessionId || context.userId || String(Date.now());
    const hash = this.simpleHash(seed);
    return hash % 100;
  }

  /**
   * Simple hash function for consistent randomness
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Generate cache key
   */
  private getCacheKey(flagKey: string, context: FlagEvaluationContext): string {
    const keyParts = [
      flagKey,
      context.userId || 'anonymous',
      context.environment,
      context.componentPath || 'global'
    ];
    return keyParts.join(':');
  }

  /**
   * Cache evaluation result
   */
  private cacheResult(cacheKey: string, result: FlagEvaluationResult): void {
    const expiry = Date.now() + (this.config.cacheTtl * 1000);
    this.cache.set(cacheKey, { result, expiry });
  }

  /**
   * Clear cache for specific flag
   */
  private clearCache(flagKey?: string): void {
    if (flagKey) {
      // Clear cache entries for specific flag
      for (const [key] of this.cache) {
        if (key.startsWith(`${flagKey}:`)) {
          this.cache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.cache.clear();
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(
    flagKey: string, 
    enabled: boolean, 
    evaluationTime: number, 
    error: boolean = false
  ): void {
    if (!this.config.metricsEnabled) return;

    const metrics = this.metrics.get(flagKey);
    if (!metrics) return;

    metrics.evaluations++;
    if (enabled) metrics.enabledCount++;
    else metrics.disabledCount++;
    if (error) metrics.errorCount++;
    
    // Update average evaluation time
    metrics.averageEvaluationTime = 
      (metrics.averageEvaluationTime * (metrics.evaluations - 1) + evaluationTime) / metrics.evaluations;
    
    metrics.lastEvaluated = new Date().toISOString();
  }

  /**
   * Get flag metrics
   */
  getMetrics(flagKey?: string): FlagMetrics | Record<string, FlagMetrics> {
    if (flagKey) {
      return this.metrics.get(flagKey) || {
        flagKey,
        evaluations: 0,
        enabledCount: 0,
        disabledCount: 0,
        errorCount: 0,
        lastEvaluated: new Date().toISOString(),
        averageEvaluationTime: 0
      };
    }

    const allMetrics: Record<string, FlagMetrics> = {};
    for (const [key, metrics] of this.metrics) {
      allMetrics[key] = metrics;
    }
    return allMetrics;
  }

  /**
   * Get all flags
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  /**
   * Export flag configuration
   */
  exportConfiguration(): FlagConfiguration {
    return {
      ...this.config,
      flags: this.getAllFlags()
    };
  }

  /**
   * Import flag configuration
   */
  importConfiguration(config: FlagConfiguration): void {
    this.config = config;
    this.flags.clear();
    this.metrics.clear();
    this.cache.clear();

    for (const flag of config.flags) {
      this.addFlag(flag);
    }
  }
}

/**
 * React Hook for Feature Flags
 */
export function useFeatureFlag(
  flagKey: string, 
  context?: Partial<FlagEvaluationContext>
): FlagEvaluationResult {
  // This would integrate with React context in a real implementation
  const manager = new FeatureFlagManager();
  
  const evaluationContext: FlagEvaluationContext = {
    environment: 'development',
    timestamp: Date.now(),
    ...context
  };

  return manager.evaluateFlag(flagKey, evaluationContext);
}

/**
 * Utility functions for common flag operations
 */
export function createMigrationFlag(
  component: string,
  phase: string,
  riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'medium'
): FeatureFlag {
  const key = `enable_real_${component.toLowerCase().replace(/[^a-z0-9]/g, '_')}_api`;
  
  return {
    key,
    name: `Enable Real ${component} API`,
    description: `Use real API for ${component} instead of mock data`,
    enabled: false,
    rolloutPercentage: 0,
    conditions: [
      {
        type: ConditionType.COMPONENT_PATH,
        operator: ConditionOperator.CONTAINS,
        value: component.toLowerCase(),
        description: `Only apply to ${component} component`
      }
    ],
    metadata: {
      component,
      migrationPhase: phase,
      riskLevel,
      rollbackTriggers: [
        {
          metric: `${component.toLowerCase()}_success_rate`,
          threshold: 90,
          timeWindow: 30,
          action: 'disable'
        }
      ],
      owner: 'migration-team',
      reviewers: ['tech-lead'],
      tags: ['migration', component.toLowerCase(), 'api']
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function createGradualRolloutContext(
  userId: string,
  componentPath: string,
  environment: string = 'development'
): FlagEvaluationContext {
  return {
    userId,
    componentPath,
    environment,
    timestamp: Date.now(),
    sessionId: `session_${userId}_${Date.now()}`
  };
}