/**
 * React 19 Error Boundary Component - Minimal Implementation
 */
import React, { Component, ReactNode, ErrorInfo } from 'react';

export interface ErrorCategory {
  type: string;
  message: string;
  stack?: string;
  component?: string;
  hook?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: 'react' | 'hook' | 'component' | 'provider' | 'unknown';
}

export interface TestErrorReport {
  type: 'AggregateError' | 'Error' | 'TypeError' | 'ReferenceError';
  totalErrors?: number;
  categories?: ErrorCategory[];
  suggestions?: string[];
  recoverable: boolean;
  timestamp: number;
  componentStack?: string;
  errorBoundary: string;
}

export interface React19ErrorBoundaryProps {
  children: ReactNode;
  onError?: (
    error: Error | AggregateError,
    errorInfo: ErrorInfo,
    report: TestErrorReport
  ) => void;
  fallback?: React.ComponentType<{
    error: Error | AggregateError;
    errorReport: TestErrorReport;
    retry: () => void;
    canRetry: boolean;
  }>;
  resetOnPropsChange?: boolean;
  maxRetries?: number;
  debugMode?: boolean;
  testName?: string;
  componentName?: string;
}

export interface React19ErrorBoundaryState {
  hasError: boolean;
  error?: Error | AggregateError;
  errorInfo?: ErrorInfo;
  errorReport?: TestErrorReport;
  retryCount: number;
  maxRetries: number;
}

// AggregateError polyfill for environments that don't support it
if (typeof AggregateError === 'undefined') {
  (global as any).AggregateError = class AggregateError extends Error {
    errors: Error[];

    constructor(errors: Error[], message?: string) {
      super(message || 'Multiple errors occurred');
      this.name = 'AggregateError';
      this.errors = errors;
    }
  };
}

export class React19ErrorHandler {
  static handleAggregateError(
    error: AggregateError,
    errorInfo?: ErrorInfo,
    context?: { testName?: string; componentName?: string }
  ): TestErrorReport {
    return {
      type: 'AggregateError',
      totalErrors: error.errors?.length || 0,
      categories: [],
      suggestions: ['Check component imports and mock configurations'],
      recoverable: true,
      timestamp: Date.now(),
      componentStack: errorInfo?.componentStack,
      errorBoundary: context?.componentName || 'React19ErrorBoundary',
    };
  }

  static handleStandardError(
    error: Error,
    errorInfo?: ErrorInfo,
    context?: { testName?: string; componentName?: string }
  ): TestErrorReport {
    return {
      type: error.name as any,
      totalErrors: 1,
      categories: [],
      suggestions: ['Check component imports and mock configurations'],
      recoverable: true,
      timestamp: Date.now(),
      componentStack: errorInfo?.componentStack,
      errorBoundary: context?.componentName || 'React19ErrorBoundary',
    };
  }
}

const DefaultErrorFallback: React.FC<{
  error: Error | AggregateError;
  errorReport: TestErrorReport;
  retry: () => void;
  canRetry: boolean;
}> = ({ error, errorReport, retry, canRetry }) => (
  <div data-testid="react19-error-boundary" role="alert">
    <h2>React 19 Test Error Boundary</h2>
    <p>{error.message}</p>
    {canRetry && (
      <button onClick={retry} data-testid="error-boundary-retry">
        Retry
      </button>
    )}
  </div>
);

export class React19ErrorBoundary extends Component<
  React19ErrorBoundaryProps,
  React19ErrorBoundaryState
> {
  constructor(props: React19ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      retryCount: 0,
      maxRetries: props.maxRetries || 3,
    };
  }

  static getDerivedStateFromError(
    error: Error | AggregateError
  ): Partial<React19ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error | AggregateError, errorInfo: ErrorInfo) {
    const context = {
      testName: this.props.testName,
      componentName: this.props.componentName || 'React19ErrorBoundary',
    };

    const errorReport =
      error instanceof AggregateError
        ? React19ErrorHandler.handleAggregateError(error, errorInfo, context)
        : React19ErrorHandler.handleStandardError(error, errorInfo, context);

    this.setState({
      errorInfo,
      errorReport,
    });

    this.props.onError?.(error, errorInfo, errorReport);

    if (this.props.debugMode) {
      console.error('React19ErrorBoundary caught error:', error, errorInfo);
    }
  }

  handleRetry = () => {
    const { retryCount, maxRetries } = this.state;

    if (retryCount < maxRetries) {
      this.setState((prevState) => ({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        errorReport: undefined,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  render() {
    const { hasError, error, errorReport, retryCount, maxRetries } = this.state;
    const { children, fallback: Fallback = DefaultErrorFallback } = this.props;

    if (hasError && error && errorReport) {
      const canRetry = retryCount < maxRetries && errorReport.recoverable;

      return (
        <Fallback
          error={error}
          errorReport={errorReport}
          retry={this.handleRetry}
          canRetry={canRetry}
        />
      );
    }

    return children;
  }
}

export class TestErrorBoundary extends React19ErrorBoundary {}

// Export types for compatibility
export type { React19ErrorBoundaryState as ErrorBoundaryState };

export default React19ErrorBoundary;
