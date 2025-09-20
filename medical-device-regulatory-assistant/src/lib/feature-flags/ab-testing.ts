/**
 * A/B Testing Framework for Migration Performance Comparison
 * Compares performance between mock and real data implementations
 */

// Add React import
import React from 'react';

export interface ABTestMetric {
  testId: string;
  variant: 'mock' | 'real';
  component: string;
  userId?: string;
  sessionId: string;
  timestamp: string;
  metrics: {
    renderTime: number;
    apiResponseTime?: number;
    errorCount: number;
    userInteractions: number;
    memoryUsage?: number;
    bundleSize?: number;
  };
  userAgent: string;
  viewport: {
    width: number;
    height: number;
  };
}

export interface ABTestConfiguration {
  testId: string;
  name: string;
  description: string;
  flagKey: string;
  startDate: string;
  endDate: string;
  targetMetrics: string[];
  sampleSize: number;
  confidenceLevel: number; // 0.95 for 95%
  minimumDetectableEffect: number; // percentage
  enabled: boolean;
}

export interface ABTestResult {
  testId: string;
  variant: 'mock' | 'real';
  sampleSize: number;
  metrics: {
    [key: string]: {
      mean: number;
      median: number;
      standardDeviation: number;
      min: number;
      max: number;
      percentile95: number;
    };
  };
  significance: {
    pValue: number;
    isSignificant: boolean;
    confidenceInterval: [number, number];
  };
  recommendation: 'continue_mock' | 'migrate_to_real' | 'needs_more_data';
}

/**
 * A/B Test Manager for tracking and analyzing migration performance
 */
export class ABTestManager {
  private metrics: ABTestMetric[] = [];

  private tests: Map<string, ABTestConfiguration> = new Map();

  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  /**
   * Register a new A/B test configuration
   */
  public registerTest(config: ABTestConfiguration): void {
    this.tests.set(config.testId, config);
  }

  /**
   * Record a metric for an A/B test
   */
  public recordMetric(
    metric: Omit<
      ABTestMetric,
      'sessionId' | 'timestamp' | 'userAgent' | 'viewport'
    >
  ): void {
    const fullMetric: ABTestMetric = {
      ...metric,
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
    };

    this.metrics.push(fullMetric);

    // Store in localStorage for persistence
    this.persistMetrics();

    // Send to analytics if configured
    this.sendToAnalytics(fullMetric);
  }

  /**
   * Get metrics for a specific test
   */
  public getTestMetrics(testId: string): ABTestMetric[] {
    return this.metrics.filter((metric) => metric.testId === testId);
  }

  /**
   * Analyze A/B test results
   */
  public analyzeTest(testId: string): ABTestResult | null {
    const testConfig = this.tests.get(testId);
    if (!testConfig) {
      console.warn(`Test configuration not found for testId: ${testId}`);
      return null;
    }

    const testMetrics = this.getTestMetrics(testId);
    const mockMetrics = testMetrics.filter((m) => m.variant === 'mock');
    const realMetrics = testMetrics.filter((m) => m.variant === 'real');

    if (mockMetrics.length === 0 || realMetrics.length === 0) {
      return null; // Need both variants to compare
    }

    const mockStats = this.calculateStatistics(mockMetrics);
    const realStats = this.calculateStatistics(realMetrics);

    // Perform statistical significance test (simplified t-test)
    const significance = this.performSignificanceTest(
      mockMetrics,
      realMetrics,
      testConfig.confidenceLevel
    );

    // Generate recommendation based on results
    const recommendation = this.generateRecommendation(
      mockStats,
      realStats,
      significance,
      testConfig
    );

    return {
      testId,
      variant: 'real', // This will be determined by the recommendation
      sampleSize: testMetrics.length,
      metrics: {
        mock: mockStats,
        real: realStats,
      },
      significance,
      recommendation,
    };
  }

  /**
   * Get all active tests
   */
  public getActiveTests(): ABTestConfiguration[] {
    const now = new Date();
    return Array.from(this.tests.values()).filter((test) => {
      const startDate = new Date(test.startDate);
      const endDate = new Date(test.endDate);
      return test.enabled && now >= startDate && now <= endDate;
    });
  }

  /**
   * Export metrics for external analysis
   */
  public exportMetrics(testId?: string): string {
    const metricsToExport = testId ? this.getTestMetrics(testId) : this.metrics;
    return JSON.stringify(metricsToExport, null, 2);
  }

  /**
   * Clear all metrics (useful for testing)
   */
  public clearMetrics(): void {
    this.metrics = [];
    localStorage.removeItem('ab_test_metrics');
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private persistMetrics(): void {
    try {
      localStorage.setItem('ab_test_metrics', JSON.stringify(this.metrics));
    } catch (error) {
      console.warn('Failed to persist A/B test metrics:', error);
    }
  }

  private loadPersistedMetrics(): void {
    try {
      const stored = localStorage.getItem('ab_test_metrics');
      if (stored) {
        this.metrics = JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load persisted A/B test metrics:', error);
    }
  }

  private sendToAnalytics(metric: ABTestMetric): void {
    // In a real implementation, this would send to your analytics service
    if (process.env.NODE_ENV === 'development') {
      console.log('A/B Test Metric:', metric);
    }

    // Example: Send to Google Analytics, Mixpanel, etc.
    // analytics.track('ab_test_metric', metric);
  }

  private calculateStatistics(metrics: ABTestMetric[]): {
    renderTime: any;
    apiResponseTime?: any;
    errorCount: any;
    userInteractions: any;
  } {
    const renderTimes = metrics.map((m) => m.metrics.renderTime);
    const apiResponseTimes = metrics
      .map((m) => m.metrics.apiResponseTime)
      .filter(Boolean) as number[];
    const errorCounts = metrics.map((m) => m.metrics.errorCount);
    const userInteractions = metrics.map((m) => m.metrics.userInteractions);

    return {
      renderTime: this.calculateMetricStats(renderTimes),
      ...(apiResponseTimes.length > 0 && {
        apiResponseTime: this.calculateMetricStats(apiResponseTimes),
      }),
      errorCount: this.calculateMetricStats(errorCounts),
      userInteractions: this.calculateMetricStats(userInteractions),
    };
  }

  private calculateMetricStats(values: number[]) {
    const sorted = [...values].sort((a, b) => a - b);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const variance =
      values.reduce((sum, val) => sum + (val - mean)**2, 0) /
      values.length;
    const standardDeviation = Math.sqrt(variance);
    const percentile95Index = Math.floor(sorted.length * 0.95);

    return {
      mean,
      median,
      standardDeviation,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      percentile95: sorted[percentile95Index],
    };
  }

  private performSignificanceTest(
    mockMetrics: ABTestMetric[],
    realMetrics: ABTestMetric[],
    confidenceLevel: number
  ): {
    pValue: number;
    isSignificant: boolean;
    confidenceInterval: [number, number];
  } {
    // Simplified t-test implementation
    // In production, use a proper statistical library like jStat

    const mockRenderTimes = mockMetrics.map((m) => m.metrics.renderTime);
    const realRenderTimes = realMetrics.map((m) => m.metrics.renderTime);

    const mockMean =
      mockRenderTimes.reduce((sum, val) => sum + val, 0) /
      mockRenderTimes.length;
    const realMean =
      realRenderTimes.reduce((sum, val) => sum + val, 0) /
      realRenderTimes.length;

    const mockVariance =
      mockRenderTimes.reduce(
        (sum, val) => sum + (val - mockMean)**2,
        0
      ) /
      (mockRenderTimes.length - 1);
    const realVariance =
      realRenderTimes.reduce(
        (sum, val) => sum + (val - realMean)**2,
        0
      ) /
      (realRenderTimes.length - 1);

    const pooledStandardError = Math.sqrt(
      mockVariance / mockRenderTimes.length +
        realVariance / realRenderTimes.length
    );

    const tStatistic = (realMean - mockMean) / pooledStandardError;

    // Simplified p-value calculation (use proper statistical library in production)
    const pValue = 2 * (1 - this.normalCDF(Math.abs(tStatistic)));
    const alpha = 1 - confidenceLevel;
    const isSignificant = pValue < alpha;

    // Simplified confidence interval
    const marginOfError = 1.96 * pooledStandardError; // 95% CI
    const confidenceInterval: [number, number] = [
      realMean - mockMean - marginOfError,
      realMean - mockMean + marginOfError,
    ];

    return {
      pValue,
      isSignificant,
      confidenceInterval,
    };
  }

  private normalCDF(x: number): number {
    // Simplified normal CDF approximation
    // Use proper statistical library in production
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }

  private erf(x: number): number {
    // Simplified error function approximation
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);

    const t = 1.0 / (1.0 + p * x);
    const y =
      1.0 -
      ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return sign * y;
  }

  private generateRecommendation(
    mockStats: any,
    realStats: any,
    significance: any,
    config: ABTestConfiguration
  ): 'continue_mock' | 'migrate_to_real' | 'needs_more_data' {
    // Check if we have enough data
    const totalSamples = this.getTestMetrics(config.testId).length;
    if (totalSamples < config.sampleSize) {
      return 'needs_more_data';
    }

    // If not statistically significant, continue with mock
    if (!significance.isSignificant) {
      return 'continue_mock';
    }

    // Check if real implementation performs better
    const renderTimeImprovement =
      (mockStats.renderTime.mean - realStats.renderTime.mean) /
      mockStats.renderTime.mean;
    const errorRateImprovement =
      (mockStats.errorCount.mean - realStats.errorCount.mean) /
      Math.max(mockStats.errorCount.mean, 1);

    // Real implementation is better if it has significantly better performance
    if (
      renderTimeImprovement > config.minimumDetectableEffect / 100 &&
      errorRateImprovement >= 0
    ) {
      return 'migrate_to_real';
    }

    return 'continue_mock';
  }
}

/**
 * React hook for A/B testing integration
 */
export function useABTest(testId: string, component: string) {
  const abTestManager = React.useRef(new ABTestManager()).current;
  const [isRecording, setIsRecording] = React.useState(false);

  const recordMetric = React.useCallback(
    (
      variant: 'mock' | 'real',
      metrics: ABTestMetric['metrics'],
      userId?: string
    ) => {
      abTestManager.recordMetric({
        testId,
        variant,
        component,
        userId,
        metrics,
      });
    },
    [testId, component, abTestManager]
  );

  const startRecording = React.useCallback(() => {
    setIsRecording(true);
  }, []);

  const stopRecording = React.useCallback(() => {
    setIsRecording(false);
  }, []);

  const getResults = React.useCallback(() => abTestManager.analyzeTest(testId), [testId, abTestManager]);

  return {
    recordMetric,
    startRecording,
    stopRecording,
    isRecording,
    getResults,
  };
}

/**
 * Performance monitoring hook for A/B testing
 */
export function usePerformanceMonitoring(
  testId: string,
  variant: 'mock' | 'real',
  component: string
) {
  const { recordMetric } = useABTest(testId, component);
  const startTime = React.useRef<number>(0);
  const errorCount = React.useRef<number>(0);
  const interactionCount = React.useRef<number>(0);

  const startMeasurement = React.useCallback(() => {
    startTime.current = performance.now();
    errorCount.current = 0;
    interactionCount.current = 0;
  }, []);

  const recordError = React.useCallback(() => {
    errorCount.current += 1;
  }, []);

  const recordInteraction = React.useCallback(() => {
    interactionCount.current += 1;
  }, []);

  const finishMeasurement = React.useCallback(
    (apiResponseTime?: number) => {
      const renderTime = performance.now() - startTime.current;

      recordMetric(variant, {
        renderTime,
        apiResponseTime,
        errorCount: errorCount.current,
        userInteractions: interactionCount.current,
        memoryUsage: (performance as any).memory?.usedJSHeapSize,
      });
    },
    [variant, recordMetric]
  );

  return {
    startMeasurement,
    recordError,
    recordInteraction,
    finishMeasurement,
  };
}
