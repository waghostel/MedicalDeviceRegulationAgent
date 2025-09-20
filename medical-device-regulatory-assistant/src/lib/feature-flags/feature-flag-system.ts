/**
 * Feature Flag System for Gradual Migration Rollout
 * Enables gradual migration from mock data to real backend connections
 */

import React from 'react';

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage: number; // 0-100
  conditions: FeatureFlagCondition[];
  metadata: FeatureFlagMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureFlagCondition {
  type: 'user' | 'environment' | 'time' | 'custom';
  operator:
    | 'equals'
    | 'not_equals'
    | 'in'
    | 'not_in'
    | 'greater_than'
    | 'less_than'
    | 'contains';
  property: string;
  value: any;
}

export interface FeatureFlagMetadata {
  owner: string;
  tags: string[];
  migrationPhase?: string;
  component?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  rollbackPlan: string;
  successMetrics: string[];
}

export interface FeatureFlagEvaluation {
  flagKey: string;
  enabled: boolean;
  reason: string;
  conditions: ConditionEvaluation[];
  metadata: Record<string, any>;
  evaluatedAt: string;
}

export interface ConditionEvaluation {
  condition: FeatureFlagCondition;
  result: boolean;
  reason: string;
}

export interface FeatureFlagContext {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  environment: string;
  component?: string;
  testSuite?: string;
  timestamp: string;
  customProperties: Record<string, any>;
}

export interface FeatureFlagConfiguration {
  flags: FeatureFlag[];
  defaultEnabled: boolean;
  evaluationMode: 'strict' | 'permissive';
  cacheTtl: number; // seconds
  enableLogging: boolean;
  enableMetrics: boolean;
  fallbackBehavior: 'mock' | 'real' | 'error';
}

/**
 * Singleton instance management
 */
let globalFeatureFlagManager: FeatureFlagManager | null = null;

/**
 * Feature Flag Manager - Core service for evaluating feature flags
 */
export class FeatureFlagManager {
  private flags: Map<string, FeatureFlag> = new Map();

  private cache: Map<string, FeatureFlagEvaluation> = new Map();

  private config: FeatureFlagConfiguration;

  private evaluationLog: FeatureFlagEvaluation[] = [];

  constructor(config: FeatureFlagConfiguration) {
    this.config = config;
    this.loadFlags(config.flags);
  }

  /**
   * Get singleton instance
   */
  public static getInstance(
    config?: FeatureFlagConfiguration
  ): FeatureFlagManager {
    if (!globalFeatureFlagManager) {
      globalFeatureFlagManager = new FeatureFlagManager(
        config || DEFAULT_MIGRATION_CONFIG
      );
    }
    return globalFeatureFlagManager;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  public static resetInstance(): void {
    globalFeatureFlagManager = null;
  }

  /**
   * Load feature flags into the manager
   */
  private loadFlags(flags: FeatureFlag[]): void {
    this.flags.clear();
    flags.forEach((flag) => {
      this.flags.set(flag.key, flag);
    });
  }

  /**
   * Evaluate a feature flag for the given context
   */
  public async evaluate(
    flagKey: string,
    context: FeatureFlagContext
  ): Promise<FeatureFlagEvaluation> {
    const cacheKey = this.getCacheKey(flagKey, context);

    // Check cache first
    if (this.config.cacheTtl > 0) {
      const cached = this.cache.get(cacheKey);
      if (cached && this.isCacheValid(cached)) {
        return cached;
      }
    }

    const flag = this.flags.get(flagKey);
    if (!flag) {
      return this.createEvaluation(
        flagKey,
        this.config.defaultEnabled,
        'Flag not found',
        [],
        context
      );
    }

    // Check if flag is globally disabled
    if (!flag.enabled) {
      return this.createEvaluation(
        flagKey,
        false,
        'Flag globally disabled',
        [],
        context
      );
    }

    // Evaluate rollout percentage
    if (
      !this.isInRollout(
        context.userId || context.userEmail || '',
        flag.rolloutPercentage
      )
    ) {
      return this.createEvaluation(
        flagKey,
        false,
        'Not in rollout percentage',
        [],
        context
      );
    }

    // Evaluate conditions
    const conditionResults = await this.evaluateConditions(
      flag.conditions,
      context
    );
    const allConditionsMet = conditionResults.every((result) => result.result);

    const evaluation = this.createEvaluation(
      flagKey,
      allConditionsMet,
      allConditionsMet ? 'All conditions met' : 'Some conditions failed',
      conditionResults,
      context
    );

    // Cache the result
    if (this.config.cacheTtl > 0) {
      this.cache.set(cacheKey, evaluation);
    }

    // Log the evaluation
    if (this.config.enableLogging) {
      this.evaluationLog.push(evaluation);
    }

    return evaluation;
  }

  /**
   * Simple boolean check for feature flag
   */
  public async isEnabled(
    flagKey: string,
    context: FeatureFlagContext
  ): Promise<boolean> {
    const evaluation = await this.evaluate(flagKey, context);
    return evaluation.enabled;
  }

  /**
   * Get all evaluations for debugging
   */
  public getEvaluationLog(): FeatureFlagEvaluation[] {
    return [...this.evaluationLog];
  }

  /**
   * Clear evaluation cache
   */
  public clearCache(): void {
    this.cache.clear();
  }

  /**
   * Update a feature flag
   */
  public updateFlag(flag: FeatureFlag): void {
    this.flags.set(flag.key, flag);
    this.clearCache(); // Clear cache when flags change
  }

  /**
   * Remove a feature flag
   */
  public removeFlag(flagKey: string): void {
    this.flags.delete(flagKey);
    this.clearCache();
  }

  private createEvaluation(
    flagKey: string,
    enabled: boolean,
    reason: string,
    conditions: ConditionEvaluation[],
    context: FeatureFlagContext
  ): FeatureFlagEvaluation {
    return {
      flagKey,
      enabled,
      reason,
      conditions,
      metadata: {
        context,
        evaluatedBy: 'FeatureFlagManager',
        version: '1.0.0',
      },
      evaluatedAt: new Date().toISOString(),
    };
  }

  private getCacheKey(flagKey: string, context: FeatureFlagContext): string {
    const contextKey = JSON.stringify({
      userId: context.userId,
      userEmail: context.userEmail,
      environment: context.environment,
      component: context.component,
    });
    return `${flagKey}:${contextKey}`;
  }

  private isCacheValid(evaluation: FeatureFlagEvaluation): boolean {
    const evaluatedAt = new Date(evaluation.evaluatedAt);
    const now = new Date();
    const diffSeconds = (now.getTime() - evaluatedAt.getTime()) / 1000;
    return diffSeconds < this.config.cacheTtl;
  }

  private isInRollout(identifier: string, percentage: number): boolean {
    if (percentage >= 100) return true;
    if (percentage <= 0) return false;

    // Use consistent hash-based rollout
    const hash = this.simpleHash(identifier);
    return hash % 100 < percentage;
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash &= hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  private async evaluateConditions(
    conditions: FeatureFlagCondition[],
    context: FeatureFlagContext
  ): Promise<ConditionEvaluation[]> {
    return Promise.all(
      conditions.map((condition) => this.evaluateCondition(condition, context))
    );
  }

  private async evaluateCondition(
    condition: FeatureFlagCondition,
    context: FeatureFlagContext
  ): Promise<ConditionEvaluation> {
    try {
      const contextValue = this.getContextValue(condition.property, context);
      const result = this.compareValues(
        contextValue,
        condition.operator,
        condition.value
      );

      return {
        condition,
        result,
        reason: result
          ? `Condition met: ${condition.property} ${condition.operator} ${condition.value}`
          : `Condition failed: ${condition.property} (${contextValue}) ${condition.operator} ${condition.value}`,
      };
    } catch (error) {
      return {
        condition,
        result: false,
        reason: `Condition evaluation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private getContextValue(property: string, context: FeatureFlagContext): any {
    const propertyMap: Record<string, any> = {
      userId: context.userId,
      userEmail: context.userEmail,
      userRole: context.userRole,
      environment: context.environment,
      component: context.component,
      testSuite: context.testSuite,
      timestamp: context.timestamp,
      ...context.customProperties,
    };

    return propertyMap[property];
  }

  private compareValues(
    contextValue: any,
    operator: string,
    expectedValue: any
  ): boolean {
    switch (operator) {
      case 'equals':
        return contextValue === expectedValue;
      case 'not_equals':
        return contextValue !== expectedValue;
      case 'in':
        return (
          Array.isArray(expectedValue) && expectedValue.includes(contextValue)
        );
      case 'not_in':
        return (
          Array.isArray(expectedValue) && !expectedValue.includes(contextValue)
        );
      case 'greater_than':
        return Number(contextValue) > Number(expectedValue);
      case 'less_than':
        return Number(contextValue) < Number(expectedValue);
      case 'contains':
        return String(contextValue).includes(String(expectedValue));
      default:
        throw new Error(`Unknown operator: ${operator}`);
    }
  }
}

/**
 * Migration-specific feature flags for component rollout
 */
export const MIGRATION_FLAGS = {
  // Component migration flags
  USE_REAL_PROJECT_DATA: 'use_real_project_data',
  USE_REAL_CLASSIFICATION_DATA: 'use_real_classification_data',
  USE_REAL_PREDICATE_DATA: 'use_real_predicate_data',
  USE_REAL_AGENT_BACKEND: 'use_real_agent_backend',
  USE_REAL_AUTH_FLOW: 'use_real_auth_flow',

  // Feature rollout flags
  ENABLE_WEBSOCKET_UPDATES: 'enable_websocket_updates',
  ENABLE_ADVANCED_SEARCH: 'enable_advanced_search',
  ENABLE_BATCH_OPERATIONS: 'enable_batch_operations',
  ENABLE_AUDIT_LOGGING: 'enable_audit_logging',

  // Testing and debugging flags
  ENABLE_DEBUG_MODE: 'enable_debug_mode',
  ENABLE_PERFORMANCE_MONITORING: 'enable_performance_monitoring',
  ENABLE_ERROR_REPORTING: 'enable_error_reporting',
} as const;

/**
 * Default feature flag configuration for migration
 */
export const DEFAULT_MIGRATION_CONFIG: FeatureFlagConfiguration = {
  flags: [
    {
      key: MIGRATION_FLAGS.USE_REAL_PROJECT_DATA,
      name: 'Use Real Project Data',
      description:
        'Enable real backend API calls for project data instead of mock data',
      enabled: false,
      rolloutPercentage: 0,
      conditions: [
        {
          type: 'environment',
          operator: 'in',
          property: 'environment',
          value: ['development', 'staging'],
        },
      ],
      metadata: {
        owner: 'frontend-team',
        tags: ['migration', 'phase-1'],
        migrationPhase: 'phase-1',
        component: 'ProjectCard',
        riskLevel: 'low',
        rollbackPlan: 'Disable flag to revert to mock data',
        successMetrics: [
          'component_render_time',
          'api_response_time',
          'error_rate',
        ],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      key: MIGRATION_FLAGS.USE_REAL_CLASSIFICATION_DATA,
      name: 'Use Real Classification Data',
      description: 'Enable real FDA API calls for device classification',
      enabled: false,
      rolloutPercentage: 0,
      conditions: [
        {
          type: 'environment',
          operator: 'equals',
          property: 'environment',
          value: 'development',
        },
      ],
      metadata: {
        owner: 'backend-team',
        tags: ['migration', 'phase-2'],
        migrationPhase: 'phase-2',
        component: 'ClassificationWidget',
        riskLevel: 'medium',
        rollbackPlan: 'Disable flag and use cached mock responses',
        successMetrics: [
          'classification_accuracy',
          'api_latency',
          'user_satisfaction',
        ],
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
  defaultEnabled: false,
  evaluationMode: 'strict',
  cacheTtl: 300, // 5 minutes
  enableLogging: true,
  enableMetrics: true,
  fallbackBehavior: 'mock',
};

/**
 * React hook for using feature flags in components
 */
export function useFeatureFlag(
  flagKey: string,
  context?: Partial<FeatureFlagContext>
) {
  const [isEnabled, setIsEnabled] = React.useState<boolean>(false);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);
  const [evaluation, setEvaluation] =
    React.useState<FeatureFlagEvaluation | null>(null);

  React.useEffect(() => {
    const evaluateFlag = async () => {
      setIsLoading(true);
      try {
        const flagManager = FeatureFlagManager.getInstance();
        const fullContext: FeatureFlagContext = {
          environment: process.env.NODE_ENV || 'development',
          timestamp: new Date().toISOString(),
          customProperties: {},
          ...context,
        };

        const result = await flagManager.evaluate(flagKey, fullContext);
        setEvaluation(result);
        setIsEnabled(result.enabled);
      } catch (error) {
        console.error(`Error evaluating feature flag ${flagKey}:`, error);
        setIsEnabled(false);
      } finally {
        setIsLoading(false);
      }
    };

    evaluateFlag();
  }, [flagKey, context]);

  return {
    isEnabled,
    isLoading,
    evaluation,
  };
}
