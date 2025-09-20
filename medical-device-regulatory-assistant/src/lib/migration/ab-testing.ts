/**
 * A/B Testing Framework for Migration Performance Comparison
 * Compares performance between mock and real data implementations
 */

export interface ABTestConfig {
  testId: string;
  name: string;
  description: string;
  variants: ABTestVariant[];
  trafficAllocation: TrafficAllocation;
  metrics: ABTestMetric[];
  duration: number; // days
  startDate: string;
  endDate?: string;
  status: ABTestStatus;
}

export interface ABTestVariant {
  id: string;
  name: string;
  description: string;
  allocation: number; // percentage 0-100
  configuration: VariantConfiguration;
}

export interface VariantConfiguration {
  useRealData: boolean;
  featureFlags: Record<string, boolean>;
  customSettings?: Record<string, any>;
}

export interface TrafficAllocation {
  strategy: AllocationStrategy;
  rules: AllocationRule[];
  stickyness: StickinessConfig;
}

export enum AllocationStrategy {
  RANDOM = 'random',
  USER_ID_HASH = 'user_id_hash',
  GEOGRAPHIC = 'geographic',
  DEVICE_TYPE = 'device_type',
  CUSTOM = 'custom',
}

export interface AllocationRule {
  condition: string;
  variantId: string;
  priority: number;
}

export interface StickinessConfig {
  enabled: boolean;
  duration: number; // days
  storageKey: string;
}

export interface ABTestMetric {
  id: string;
  name: string;
  type: MetricType;
  aggregation: MetricAggregation;
  target?: number;
  threshold?: number;
  significance: number; // 0-1
}

export enum MetricType {
  CONVERSION_RATE = 'conversion_rate',
  RESPONSE_TIME = 'response_time',
  ERROR_RATE = 'error_rate',
  USER_SATISFACTION = 'user_satisfaction',
  TASK_COMPLETION = 'task_completion',
  CUSTOM = 'custom',
}

export enum MetricAggregation {
  MEAN = 'mean',
  MEDIAN = 'median',
  P95 = 'p95',
  P99 = 'p99',
  COUNT = 'count',
  SUM = 'sum',
}

export enum ABTestStatus {
  DRAFT = 'draft',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface ABTestResult {
  testId: string;
  variantResults: VariantResult[];
  overallResults: OverallResults;
  statisticalSignificance: StatisticalSignificance;
  recommendations: TestRecommendation[];
  generatedAt: string;
}

export interface VariantResult {
  variantId: string;
  variantName: string;
  participants: number;
  metrics: MetricResult[];
  conversionRate?: number;
  averageResponseTime?: number;
  errorRate?: number;
  userSatisfaction?: number;
}

export interface MetricResult {
  metricId: string;
  metricName: string;
  value: number;
  confidenceInterval: [number, number];
  sampleSize: number;
  standardError: number;
}

export interface OverallResults {
  totalParticipants: number;
  testDuration: number; // days
  winningVariant?: string;
  liftPercentage?: number;
  confidenceLevel: number;
}

export interface StatisticalSignificance {
  isSignificant: boolean;
  pValue: number;
  confidenceLevel: number;
  powerAnalysis: PowerAnalysis;
}

export interface PowerAnalysis {
  achievedPower: number;
  requiredSampleSize: number;
  actualSampleSize: number;
  minimumDetectableEffect: number;
}

export interface TestRecommendation {
  type: 'winner' | 'continue' | 'stop' | 'investigate';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  reasoning: string;
  actions: string[];
}

/**
 * A/B Test Manager
 * Manages A/B tests for migration performance comparison
 */
export class ABTestManager {
  private tests: Map<string, ABTestConfig> = new Map();
  private results: Map<string, ABTestResult> = new Map();
  private participantAssignments: Map<string, string> = new Map(); // userId -> variantId

  constructor() {
    this.initializeMigrationTests();
  }

  /**
   * Initialize migration-specific A/B tests
   */
  private initializeMigrationTests(): void {
    // Performance comparison test
    this.createTest({
      testId: 'migration_performance_comparison',
      name: 'Migration Performance Comparison',
      description:
        'Compare performance between mock and real data implementations',
      variants: [
        {
          id: 'control_mock',
          name: 'Control (Mock Data)',
          description: 'Use existing mock data implementation',
          allocation: 50,
          configuration: {
            useRealData: false,
            featureFlags: {
              enable_real_database: false,
              enable_real_classification_api: false,
              enable_real_predicate_api: false,
            },
          },
        },
        {
          id: 'treatment_real',
          name: 'Treatment (Real Data)',
          description: 'Use new real data implementation',
          allocation: 50,
          configuration: {
            useRealData: true,
            featureFlags: {
              enable_real_database: true,
              enable_real_classification_api: true,
              enable_real_predicate_api: true,
            },
          },
        },
      ],
      trafficAllocation: {
        strategy: AllocationStrategy.USER_ID_HASH,
        rules: [],
        stickyness: {
          enabled: true,
          duration: 30, // 30 days
          storageKey: 'ab_test_migration_performance',
        },
      },
      metrics: [
        {
          id: 'page_load_time',
          name: 'Page Load Time',
          type: MetricType.RESPONSE_TIME,
          aggregation: MetricAggregation.P95,
          target: 2000, // 2 seconds
          threshold: 3000, // 3 seconds max
          significance: 0.95,
        },
        {
          id: 'api_response_time',
          name: 'API Response Time',
          type: MetricType.RESPONSE_TIME,
          aggregation: MetricAggregation.MEAN,
          target: 500, // 500ms
          threshold: 1000, // 1 second max
          significance: 0.95,
        },
        {
          id: 'error_rate',
          name: 'Error Rate',
          type: MetricType.ERROR_RATE,
          aggregation: MetricAggregation.MEAN,
          target: 0.01, // 1%
          threshold: 0.05, // 5% max
          significance: 0.95,
        },
        {
          id: 'task_completion_rate',
          name: 'Task Completion Rate',
          type: MetricType.TASK_COMPLETION,
          aggregation: MetricAggregation.MEAN,
          target: 0.95, // 95%
          threshold: 0.85, // 85% min
          significance: 0.95,
        },
      ],
      duration: 14, // 2 weeks
      startDate: new Date().toISOString(),
      status: ABTestStatus.DRAFT,
    });
  }

  /**
   * Create A/B test
   */
  createTest(config: ABTestConfig): void {
    // Validate configuration
    this.validateTestConfig(config);

    this.tests.set(config.testId, config);
  }

  /**
   * Start A/B test
   */
  startTest(testId: string): boolean {
    const test = this.tests.get(testId);
    if (!test) return false;

    test.status = ABTestStatus.RUNNING;
    test.startDate = new Date().toISOString();

    // Calculate end date
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + test.duration);
    test.endDate = endDate.toISOString();

    return true;
  }

  /**
   * Assign user to variant
   */
  assignUserToVariant(testId: string, userId: string): string | null {
    const test = this.tests.get(testId);
    if (!test || test.status !== ABTestStatus.RUNNING) {
      return null;
    }

    // Check if user already assigned (stickiness)
    const assignmentKey = `${testId}_${userId}`;
    const existingAssignment = this.participantAssignments.get(assignmentKey);
    if (existingAssignment) {
      return existingAssignment;
    }

    // Assign based on allocation strategy
    const variantId = this.allocateVariant(test, userId);

    // Store assignment
    this.participantAssignments.set(assignmentKey, variantId);

    return variantId;
  }

  /**
   * Allocate variant based on strategy
   */
  private allocateVariant(test: ABTestConfig, userId: string): string {
    switch (test.trafficAllocation.strategy) {
      case AllocationStrategy.USER_ID_HASH:
        return this.allocateByUserIdHash(test.variants, userId);
      case AllocationStrategy.RANDOM:
        return this.allocateRandomly(test.variants);
      default:
        return test.variants[0].id;
    }
  }

  /**
   * Allocate by user ID hash
   */
  private allocateByUserIdHash(
    variants: ABTestVariant[],
    userId: string
  ): string {
    const hash = this.hashUserId(userId);
    const percentage = hash % 100;

    let cumulativeAllocation = 0;
    for (const variant of variants) {
      cumulativeAllocation += variant.allocation;
      if (percentage < cumulativeAllocation) {
        return variant.id;
      }
    }

    return variants[variants.length - 1].id;
  }

  /**
   * Allocate randomly
   */
  private allocateRandomly(variants: ABTestVariant[]): string {
    const random = Math.random() * 100;

    let cumulativeAllocation = 0;
    for (const variant of variants) {
      cumulativeAllocation += variant.allocation;
      if (random < cumulativeAllocation) {
        return variant.id;
      }
    }

    return variants[variants.length - 1].id;
  }

  /**
   * Hash user ID for consistent allocation
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Record test event
   */
  recordEvent(
    testId: string,
    userId: string,
    eventType: string,
    value?: number,
    metadata?: Record<string, any>
  ): void {
    const variantId = this.participantAssignments.get(`${testId}_${userId}`);
    if (!variantId) return;

    // In a real implementation, this would store events in a database
    console.log(
      `[ABTest] ${testId} - ${variantId} - ${eventType}:`,
      value,
      metadata
    );
  }

  /**
   * Analyze test results
   */
  analyzeResults(testId: string): ABTestResult | null {
    const test = this.tests.get(testId);
    if (!test) return null;

    // In a real implementation, this would query actual data
    // For now, generate mock results
    const mockResults = this.generateMockResults(test);

    this.results.set(testId, mockResults);
    return mockResults;
  }

  /**
   * Generate mock results for demonstration
   */
  private generateMockResults(test: ABTestConfig): ABTestResult {
    const variantResults: VariantResult[] = test.variants.map((variant) => {
      const participants = Math.floor(Math.random() * 1000) + 500;

      // Mock data shows real implementation is slightly slower but more reliable
      const isRealData = variant.configuration.useRealData;

      return {
        variantId: variant.id,
        variantName: variant.name,
        participants,
        metrics: test.metrics.map((metric) =>
          this.generateMockMetricResult(metric, isRealData)
        ),
        conversionRate: isRealData ? 0.92 : 0.89,
        averageResponseTime: isRealData ? 650 : 200,
        errorRate: isRealData ? 0.02 : 0.001,
        userSatisfaction: isRealData ? 4.3 : 4.1,
      };
    });

    const totalParticipants = variantResults.reduce(
      (sum, result) => sum + result.participants,
      0
    );

    // Determine winner (real data wins on reliability, mock on speed)
    const realDataVariant = variantResults.find((v) =>
      v.variantName.includes('Real')
    );
    const mockDataVariant = variantResults.find((v) =>
      v.variantName.includes('Mock')
    );

    const winningVariant =
      realDataVariant &&
      realDataVariant.conversionRate > (mockDataVariant?.conversionRate || 0)
        ? realDataVariant.variantId
        : mockDataVariant?.variantId;

    return {
      testId: test.testId,
      variantResults,
      overallResults: {
        totalParticipants,
        testDuration: 7, // 7 days so far
        winningVariant,
        liftPercentage: 3.4, // 3.4% improvement
        confidenceLevel: 0.95,
      },
      statisticalSignificance: {
        isSignificant: true,
        pValue: 0.03,
        confidenceLevel: 0.95,
        powerAnalysis: {
          achievedPower: 0.85,
          requiredSampleSize: 1000,
          actualSampleSize: totalParticipants,
          minimumDetectableEffect: 0.05,
        },
      },
      recommendations: this.generateRecommendations(variantResults),
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate mock metric result
   */
  private generateMockMetricResult(
    metric: ABTestMetric,
    isRealData: boolean
  ): MetricResult {
    let baseValue: number;

    switch (metric.type) {
      case MetricType.RESPONSE_TIME:
        baseValue = isRealData ? 650 : 200; // Real data is slower
        break;
      case MetricType.ERROR_RATE:
        baseValue = isRealData ? 0.02 : 0.001; // Real data has slightly more errors initially
        break;
      case MetricType.TASK_COMPLETION:
        baseValue = isRealData ? 0.92 : 0.89; // Real data has better completion rate
        break;
      default:
        baseValue = Math.random() * 100;
    }

    const variance = baseValue * 0.1; // 10% variance
    const value = baseValue + (Math.random() - 0.5) * variance;

    return {
      metricId: metric.id,
      metricName: metric.name,
      value,
      confidenceInterval: [value * 0.9, value * 1.1],
      sampleSize: Math.floor(Math.random() * 500) + 250,
      standardError: value * 0.05,
    };
  }

  /**
   * Generate recommendations based on results
   */
  private generateRecommendations(
    variantResults: VariantResult[]
  ): TestRecommendation[] {
    const recommendations: TestRecommendation[] = [];

    const realDataResult = variantResults.find((v) =>
      v.variantName.includes('Real')
    );
    const mockDataResult = variantResults.find((v) =>
      v.variantName.includes('Mock')
    );

    if (realDataResult && mockDataResult) {
      // Compare conversion rates
      if (realDataResult.conversionRate! > mockDataResult.conversionRate!) {
        recommendations.push({
          type: 'winner',
          priority: 'high',
          title: 'Real Data Implementation Shows Better Results',
          description:
            'Real data implementation has higher task completion rate',
          reasoning: `Real data: ${(realDataResult.conversionRate! * 100).toFixed(1)}% vs Mock data: ${(mockDataResult.conversionRate! * 100).toFixed(1)}%`,
          actions: [
            'Proceed with real data migration',
            'Address performance concerns',
            'Monitor error rates closely',
          ],
        });
      }

      // Performance concerns
      if (
        realDataResult.averageResponseTime! >
        mockDataResult.averageResponseTime! * 2
      ) {
        recommendations.push({
          type: 'investigate',
          priority: 'medium',
          title: 'Performance Optimization Needed',
          description: 'Real data implementation is significantly slower',
          reasoning: `Real data response time: ${realDataResult.averageResponseTime}ms vs Mock: ${mockDataResult.averageResponseTime}ms`,
          actions: [
            'Optimize API performance',
            'Implement caching',
            'Consider database indexing',
            'Add performance monitoring',
          ],
        });
      }
    }

    return recommendations;
  }

  /**
   * Validate test configuration
   */
  private validateTestConfig(config: ABTestConfig): void {
    // Check variant allocations sum to 100%
    const totalAllocation = config.variants.reduce(
      (sum, variant) => sum + variant.allocation,
      0
    );
    if (Math.abs(totalAllocation - 100) > 0.01) {
      throw new Error(
        `Variant allocations must sum to 100%, got ${totalAllocation}%`
      );
    }

    // Check for duplicate variant IDs
    const variantIds = config.variants.map((v) => v.id);
    if (new Set(variantIds).size !== variantIds.length) {
      throw new Error('Variant IDs must be unique');
    }

    // Validate metrics
    for (const metric of config.metrics) {
      if (metric.significance < 0 || metric.significance > 1) {
        throw new Error(
          `Metric significance must be between 0 and 1, got ${metric.significance}`
        );
      }
    }
  }

  /**
   * Get test configuration
   */
  getTest(testId: string): ABTestConfig | undefined {
    return this.tests.get(testId);
  }

  /**
   * Get all tests
   */
  getAllTests(): ABTestConfig[] {
    return Array.from(this.tests.values());
  }

  /**
   * Get test results
   */
  getResults(testId: string): ABTestResult | undefined {
    return this.results.get(testId);
  }
}

/**
 * React Hook for A/B Testing
 */
export function useABTest(
  testId: string,
  userId: string
): {
  variantId: string | null;
  isLoading: boolean;
  recordEvent: (
    eventType: string,
    value?: number,
    metadata?: Record<string, any>
  ) => void;
} {
  // This would integrate with React in a real implementation
  const manager = new ABTestManager();
  const variantId = manager.assignUserToVariant(testId, userId);

  return {
    variantId,
    isLoading: false,
    recordEvent: (eventType, value, metadata) => {
      manager.recordEvent(testId, userId, eventType, value, metadata);
    },
  };
}

/**
 * Utility functions for A/B testing
 */
export function createMigrationABTest(
  testId: string,
  name: string,
  duration: number = 14
): ABTestConfig {
  return {
    testId,
    name,
    description: `A/B test comparing mock vs real data for ${name}`,
    variants: [
      {
        id: 'control',
        name: 'Control (Mock Data)',
        description: 'Existing mock data implementation',
        allocation: 50,
        configuration: { useRealData: false, featureFlags: {} },
      },
      {
        id: 'treatment',
        name: 'Treatment (Real Data)',
        description: 'New real data implementation',
        allocation: 50,
        configuration: { useRealData: true, featureFlags: {} },
      },
    ],
    trafficAllocation: {
      strategy: AllocationStrategy.USER_ID_HASH,
      rules: [],
      stickyness: {
        enabled: true,
        duration: 30,
        storageKey: `ab_test_${testId}`,
      },
    },
    metrics: [
      {
        id: 'response_time',
        name: 'Response Time',
        type: MetricType.RESPONSE_TIME,
        aggregation: MetricAggregation.P95,
        significance: 0.95,
      },
      {
        id: 'error_rate',
        name: 'Error Rate',
        type: MetricType.ERROR_RATE,
        aggregation: MetricAggregation.MEAN,
        significance: 0.95,
      },
    ],
    duration,
    startDate: new Date().toISOString(),
    status: ABTestStatus.DRAFT,
  };
}
