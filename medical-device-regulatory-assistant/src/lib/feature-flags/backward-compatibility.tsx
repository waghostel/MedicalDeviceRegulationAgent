/**
 * Backward Compatibility Layer for Component Migration
 * Provides seamless switching between mock and real data during migration
 */

import React from 'react';

import {
  useFeatureFlag,
  MIGRATION_FLAGS,
  FeatureFlagContext,
} from './feature-flag-system';

export interface BackwardCompatibilityProps {
  children: React.ReactNode;
  flagKey: string;
  mockComponent: React.ComponentType<any>;
  realComponent: React.ComponentType<any>;
  componentProps?: any;
  context?: Partial<FeatureFlagContext>;
  fallbackToMock?: boolean;
}

/**
 * Higher-order component that switches between mock and real implementations
 * based on feature flag evaluation
 */
export const BackwardCompatibilityWrapper = ({
  flagKey,
  mockComponent: MockComponent,
  realComponent: RealComponent,
  componentProps = {},
  context,
  fallbackToMock = true,
  children,
}: BackwardCompatibilityProps) => {
  const { isEnabled, isLoading, evaluation } = useFeatureFlag(flagKey, context);

  // Show loading state while evaluating feature flag
  if (isLoading) {
    return (
      <div className="animate-pulse bg-gray-200 rounded-md h-20 w-full flex items-center justify-center">
        <span className="text-gray-500 text-sm">Loading...</span>
      </div>
    );
  }

  // Log feature flag evaluation for debugging
  if (process.env.NODE_ENV === 'development' && evaluation) {
    console.log(`Feature flag ${flagKey} evaluation:`, {
      enabled: evaluation.enabled,
      reason: evaluation.reason,
      component: context?.component,
    });
  }

  // Render real component if flag is enabled, otherwise render mock
  if (isEnabled) {
    try {
      return <RealComponent {...componentProps}>{children}</RealComponent>;
    } catch (error) {
      console.error(
        `Error rendering real component for flag ${flagKey}:`,
        error
      );

      // Fallback to mock component if real component fails
      if (fallbackToMock) {
        return <MockComponent {...componentProps}>{children}</MockComponent>;
      }

      // Show error state if fallback is disabled
      return (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800 text-sm">
            Error loading component. Please try again later.
          </p>
        </div>
      );
    }
  }

  return <MockComponent {...componentProps}>{children}</MockComponent>;
}

/**
 * Hook for conditional data fetching based on feature flags
 */
export function useConditionalData<T>(
  flagKey: string,
  mockDataFetcher: () => T | Promise<T>,
  realDataFetcher: () => T | Promise<T>,
  context?: Partial<FeatureFlagContext>
) {
  const { isEnabled, isLoading: flagLoading } = useFeatureFlag(
    flagKey,
    context
  );
  const [data, setData] = React.useState<T | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (flagLoading) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const fetcher = isEnabled ? realDataFetcher : mockDataFetcher;
        const result = await fetcher();
        setData(result);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);

        // Fallback to mock data if real data fails
        if (isEnabled) {
          try {
            const fallbackResult = await mockDataFetcher();
            setData(fallbackResult);
            console.warn(`Fallback to mock data for flag ${flagKey}:`, error);
          } catch (fallbackErr) {
            console.error(
              `Both real and mock data fetchers failed for flag ${flagKey}:`,
              {
                realError: error,
                mockError: fallbackErr,
              }
            );
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isEnabled, flagLoading, flagKey]);

  return {
    data,
    isLoading: flagLoading || isLoading,
    error,
    isUsingRealData: isEnabled && !error,
  };
}

/**
 * Migration-specific wrapper components for common use cases
 */

// Project data migration wrapper
export const ProjectDataWrapper = ({
  children,
  ...props
}: Omit<BackwardCompatibilityProps, 'flagKey'>) => (
    <BackwardCompatibilityWrapper
      flagKey={MIGRATION_FLAGS.USE_REAL_PROJECT_DATA}
      context={{ component: 'ProjectData' }}
      {...props}
    >
      {children}
    </BackwardCompatibilityWrapper>
  )

// Classification data migration wrapper
export const ClassificationDataWrapper = ({
  children,
  ...props
}: Omit<BackwardCompatibilityProps, 'flagKey'>) => (
    <BackwardCompatibilityWrapper
      flagKey={MIGRATION_FLAGS.USE_REAL_CLASSIFICATION_DATA}
      context={{ component: 'ClassificationData' }}
      {...props}
    >
      {children}
    </BackwardCompatibilityWrapper>
  )

// Predicate data migration wrapper
export const PredicateDataWrapper = ({
  children,
  ...props
}: Omit<BackwardCompatibilityProps, 'flagKey'>) => (
    <BackwardCompatibilityWrapper
      flagKey={MIGRATION_FLAGS.USE_REAL_PREDICATE_DATA}
      context={{ component: 'PredicateData' }}
      {...props}
    >
      {children}
    </BackwardCompatibilityWrapper>
  )

// Agent backend migration wrapper
export const AgentBackendWrapper = ({
  children,
  ...props
}: Omit<BackwardCompatibilityProps, 'flagKey'>) => (
    <BackwardCompatibilityWrapper
      flagKey={MIGRATION_FLAGS.USE_REAL_AGENT_BACKEND}
      context={{ component: 'AgentBackend' }}
      {...props}
    >
      {children}
    </BackwardCompatibilityWrapper>
  )

/**
 * Migration status indicator component
 */
export const MigrationStatusIndicator = ({
  flagKey,
  className = '',
}: {
  flagKey: string;
  className?: string;
}) => {
  const { isEnabled, evaluation } = useFeatureFlag(flagKey);

  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }

  return (
    <div
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${className}`}
    >
      <div
        className={`w-2 h-2 rounded-full mr-2 ${
          isEnabled ? 'bg-green-400' : 'bg-gray-400'
        }`}
      />
      <span className={isEnabled ? 'text-green-800' : 'text-gray-600'}>
        {isEnabled ? 'Real Data' : 'Mock Data'}
      </span>
      {evaluation && (
        <span className="ml-2 text-gray-500" title={evaluation.reason}>
          (
          {Math.round(
            (evaluation.conditions.filter((c) => c.result).length /
              evaluation.conditions.length) *
              100
          )}
          %)
        </span>
      )}
    </div>
  );
}

/**
 * A/B Testing component for comparing mock vs real implementations
 */
export interface ABTestProps {
  flagKey: string;
  mockComponent: React.ComponentType<any>;
  realComponent: React.ComponentType<any>;
  componentProps?: any;
  onPerformanceMetric?: (metric: {
    component: 'mock' | 'real';
    renderTime: number;
    errorCount: number;
  }) => void;
  context?: Partial<FeatureFlagContext>;
}

export const ABTestWrapper = ({
  flagKey,
  mockComponent: MockComponent,
  realComponent: RealComponent,
  componentProps = {},
  onPerformanceMetric,
  context,
}: ABTestProps) => {
  const { isEnabled } = useFeatureFlag(flagKey, context);
  const [renderTime, setRenderTime] = React.useState<number>(0);
  const [errorCount, setErrorCount] = React.useState<number>(0);

  const startTime = React.useRef<number>(0);

  React.useEffect(() => {
    startTime.current = performance.now();
  }, [isEnabled]);

  React.useLayoutEffect(() => {
    const endTime = performance.now();
    const duration = endTime - startTime.current;
    setRenderTime(duration);

    if (onPerformanceMetric) {
      onPerformanceMetric({
        component: isEnabled ? 'real' : 'mock',
        renderTime: duration,
        errorCount,
      });
    }
  });

  const handleError = React.useCallback(() => {
    setErrorCount((prev) => prev + 1);
  }, []);

  const ComponentToRender = isEnabled ? RealComponent : MockComponent;

  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      <ErrorBoundary onError={handleError}>
        <ComponentToRender {...componentProps} />
      </ErrorBoundary>
    </React.Suspense>
  );
}

/**
 * Error boundary for catching component errors during migration
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: () => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; onError?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Component error during migration:', error, errorInfo);
    this.props.onError?.();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800 text-sm">
            Component error occurred. Using fallback implementation.
          </p>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-2">
              <summary className="text-red-600 cursor-pointer">
                Error Details
              </summary>
              <pre className="text-xs text-red-600 mt-1 overflow-auto">
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
