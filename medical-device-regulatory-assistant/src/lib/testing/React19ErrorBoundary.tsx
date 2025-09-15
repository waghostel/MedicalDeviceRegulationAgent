/**
 * React 19 Error Boundary Component
 * Specifically designed to handle React 19 AggregateError patterns in test environments
 * Provides detailed error reporting, debugging information, and fallback UI for test error states
 */

import React, { ReactNode, Component, ErrorInfo } from 'react';

// Enhanced error reporting interfaces
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

export interface ErrorCategory {
  type: string;
  message: string;
  stack?: string;
  component?: string;
  hook?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source?: 'react' | 'hook' | 'component' | 'provider' | 'unknown';
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error | AggregateError;
  errorInfo?: ErrorInfo;
  retryCount: number;
  maxRetries: number;
  errorReport?: TestErrorReport;
  debugMode: boolean;
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

/**
 * Enhanced React 19 Error Handler
 * Provides comprehensive error analysis and categorization for test environments
 */
export class React19ErrorHandler {
  /**
   * Handle React 19 AggregateError with detailed analysis
   */
  static handleAggregateError(
    error: AggregateError,
    errorInfo?: ErrorInfo,
    context?: { testName?: string; componentName?: string }
  ): TestErrorReport {
    const individualErrors = error.errors || [];
    const categorizedErrors = this.categorizeErrors(
      individualErrors,
      errorInfo
    );

    return {
      type: 'AggregateError',
      totalErrors: individualErrors.length,
      categories: categorizedErrors,
      suggestions: this.generateSuggestions(categorizedErrors),
      recoverable: this.isRecoverable(categorizedErrors),
      timestamp: Date.now(),
      componentStack: errorInfo?.componentStack,
      errorBoundary: context?.componentName || 'React19ErrorBoundary',
    };
  }

  /**
   * Handle standard Error with enhanced analysis
   */
  static handleStandardError(
    error: Error,
    errorInfo?: ErrorInfo,
    context?: { testName?: string; componentName?: string }
  ): TestErrorReport {
    const category = this.categorizeError(error, errorInfo);

    return {
      type: this.getErrorType(error) as unknown,
      totalErrors: 1,
      categories: [category],
      suggestions: this.generateSuggestions([category]),
      recoverable: this.isRecoverable([category]),
      timestamp: Date.now(),
      componentStack: errorInfo?.componentStack,
      errorBoundary: context?.componentName || 'React19ErrorBoundary',
    };
  }

  /**
   * Categorize multiple errors from AggregateError
   */
  static categorizeErrors(
    errors: Error[],
    errorInfo?: ErrorInfo
  ): ErrorCategory[] {
    return errors.map((error) => this.categorizeError(error, errorInfo));
  }

  /**
   * Categorize a single error with enhanced analysis
   */
  static categorizeError(error: Error, errorInfo?: ErrorInfo): ErrorCategory {
    const type = this.getErrorType(error);
    const severity = this.getErrorSeverity(error);
    const source = this.getErrorSource(error, errorInfo);

    return {
      type,
      message: error.message,
      stack: error.stack,
      component: this.extractComponent(error, errorInfo),
      hook: this.extractHook(error),
      severity,
      source,
    };
  }

  /**
   * Determine error type from error object
   */
  static getErrorType(error: Error): string {
    // Check for specific React 19 patterns
    if (
      error.message.includes('useToast') ||
      error.message.includes('is not a function')
    ) {
      return 'HookMockError';
    }
    if (
      error.message.includes('Provider') ||
      error.message.includes('Context')
    ) {
      return 'ProviderError';
    }
    if (
      error.message.includes('render') ||
      error.message.includes('Cannot read properties')
    ) {
      return 'RenderError';
    }
    if (
      error.message.includes('localStorage') ||
      error.message.includes('sessionStorage')
    ) {
      return 'StorageError';
    }
    if (
      error.message.includes('timer') ||
      error.message.includes('setTimeout')
    ) {
      return 'TimerError';
    }

    // Use error constructor name if available
    if (error.constructor.name && error.constructor.name !== 'Error') {
      return error.constructor.name;
    }

    return 'UnknownError';
  }

  /**
   * Determine error severity level
   */
  static getErrorSeverity(
    error: Error
  ): 'low' | 'medium' | 'high' | 'critical' {
    const message = error.message.toLowerCase();

    // Critical errors that prevent test execution
    if (
      message.includes('cannot read properties') ||
      message.includes('is not a function')
    ) {
      return 'critical';
    }

    // High severity errors that affect core functionality
    if (
      message.includes('provider') ||
      message.includes('context') ||
      message.includes('render')
    ) {
      return 'high';
    }

    // Medium severity errors that affect specific features
    if (
      message.includes('hook') ||
      message.includes('mock') ||
      message.includes('storage')
    ) {
      return 'medium';
    }

    // Low severity errors that are warnings or minor issues
    return 'low';
  }

  /**
   * Determine error source
   */
  static getErrorSource(
    error: Error,
    errorInfo?: ErrorInfo
  ): 'react' | 'hook' | 'component' | 'provider' | 'unknown' {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    const componentStack = errorInfo?.componentStack?.toLowerCase() || '';

    if (message.includes('hook') || message.includes('use')) {
      return 'hook';
    }
    if (message.includes('provider') || message.includes('context')) {
      return 'provider';
    }
    if (stack.includes('react') || componentStack.includes('react')) {
      return 'react';
    }
    if (componentStack.includes('component') || stack.includes('component')) {
      return 'component';
    }

    return 'unknown';
  }

  /**
   * Extract component name from error or error info
   */
  static extractComponent(
    error: Error,
    errorInfo?: ErrorInfo
  ): string | undefined {
    // Try to extract from component stack first
    if (errorInfo?.componentStack) {
      const componentMatch = errorInfo.componentStack.match(/at (\w+)/);
      if (componentMatch) {
        return componentMatch[1];
      }
    }

    // Fall back to error stack
    const stack = error.stack || '';
    const componentMatch = stack.match(
      /at (\w+Component|\w+Form|\w+Provider|\w+Boundary)/
    );
    return componentMatch ? componentMatch[1] : undefined;
  }

  /**
   * Extract hook name from error message
   */
  static extractHook(error: Error): string | undefined {
    const message = error.message || '';
    const hookMatch = message.match(/use\w+/i);
    return hookMatch ? hookMatch[0] : undefined;
  }

  /**
   * Generate actionable suggestions based on error categories
   */
  static generateSuggestions(categories: ErrorCategory[]): string[] {
    const suggestions: string[] = [];
    const seenSuggestions = new Set<string>();

    categories.forEach((category) => {
      let categorySuggestions: string[] = [];

      switch (category.type) {
        case 'HookMockError':
          categorySuggestions = [
            'Check hook mock configuration in test setup',
            'Ensure all required hook methods are properly mocked',
            'Verify hook dependencies are correctly imported',
            'Review useToast mock structure for completeness',
          ];
          break;

        case 'RenderError':
          categorySuggestions = [
            'Verify component props are correctly provided',
            'Check provider setup in renderWithProviders',
            'Ensure all required context providers are included',
            'Review component dependencies and imports',
          ];
          break;

        case 'ProviderError':
          categorySuggestions = [
            'Ensure all required providers are included in test wrapper',
            'Check provider order and nesting structure',
            'Verify provider props and initial values',
            'Review context provider configuration',
          ];
          break;

        case 'StorageError':
          categorySuggestions = [
            'Mock localStorage/sessionStorage in test setup',
            'Check storage mock configuration',
            'Verify storage cleanup in test teardown',
            'Review auto-save functionality mocks',
          ];
          break;

        case 'TimerError':
          categorySuggestions = [
            'Use jest.useFakeTimers() for timer-dependent tests',
            'Check timer mock configuration',
            'Verify timer cleanup in test teardown',
            'Review debounced functionality mocks',
          ];
          break;

        default:
          categorySuggestions = [
            'Review error stack trace for specific component issues',
            'Check test setup and mock configuration',
            'Verify component dependencies and imports',
            'Consider adding error boundary for better error handling',
          ];
      }

      // Add unique suggestions
      categorySuggestions.forEach((suggestion) => {
        if (!seenSuggestions.has(suggestion)) {
          seenSuggestions.add(suggestion);
          suggestions.push(suggestion);
        }
      });
    });

    return suggestions;
  }

  /**
   * Determine if errors are recoverable
   */
  static isRecoverable(categories: ErrorCategory[]): boolean {
    // Consider error recoverable if all errors are medium severity or lower
    // OR are primarily mock-related (even if high severity)
    return categories.every((cat) => {
      const isLowSeverity = ['low', 'medium'].includes(cat.severity);
      const isMockRelated = [
        'HookMockError',
        'ProviderError',
        'StorageError',
        'TimerError',
      ].includes(cat.type);
      return isLowSeverity || isMockRelated;
    });
  }

  /**
   * Generate detailed debug information
   */
  static generateDebugInfo(
    error: Error | AggregateError,
    errorInfo: ErrorInfo,
    report: TestErrorReport
  ): string {
    const debugLines: string[] = [];

    debugLines.push('=== React 19 Error Boundary Debug Report ===');
    debugLines.push(`Timestamp: ${new Date(report.timestamp).toISOString()}`);
    debugLines.push(`Error Type: ${report.type}`);
    debugLines.push(`Total Errors: ${report.totalErrors || 1}`);
    debugLines.push(`Recoverable: ${report.recoverable ? 'Yes' : 'No'}`);
    debugLines.push('');

    if (error instanceof AggregateError) {
      debugLines.push('Individual Errors:');
      error.errors?.forEach((err, index) => {
        debugLines.push(`  ${index + 1}. ${err.message}`);
      });
      debugLines.push('');
    }

    debugLines.push('Error Categories:');
    report.categories?.forEach((category, index) => {
      debugLines.push(`  ${index + 1}. Type: ${category.type}`);
      debugLines.push(`     Severity: ${category.severity}`);
      debugLines.push(`     Source: ${category.source}`);
      debugLines.push(`     Message: ${category.message}`);
      if (category.component) {
        debugLines.push(`     Component: ${category.component}`);
      }
      if (category.hook) {
        debugLines.push(`     Hook: ${category.hook}`);
      }
      debugLines.push('');
    });

    debugLines.push('Suggestions:');
    report.suggestions?.forEach((suggestion, index) => {
      debugLines.push(`  ${index + 1}. ${suggestion}`);
    });
    debugLines.push('');

    if (errorInfo.componentStack) {
      debugLines.push('Component Stack:');
      debugLines.push(errorInfo.componentStack);
      debugLines.push('');
    }

    if (error.stack) {
      debugLines.push('Error Stack:');
      debugLines.push(error.stack);
    }

    return debugLines.join('\n');
  }
}

/**
 * Default Fallback UI Component for Test Errors
 */
export const DefaultTestErrorFallback: React.FC<{
  error: Error | AggregateError;
  errorReport: TestErrorReport;
  retry: () => void;
  canRetry: boolean;
}> = ({ error, errorReport, retry, canRetry }) => {
  const [showDetails, setShowDetails] = React.useState(false);
  const [showDebugInfo, setShowDebugInfo] = React.useState(false);

  return (
    <div
      data-testid="react19-error-boundary"
      role="alert"
      style={{
        padding: '16px',
        border: '2px solid #ef4444',
        borderRadius: '8px',
        backgroundColor: '#fef2f2',
        color: '#991b1b',
        fontFamily: 'monospace',
        fontSize: '14px',
        margin: '16px',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}
      >
        <span style={{ fontSize: '18px', marginRight: '8px' }}>⚠️</span>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
          React 19 Test Error Boundary
        </h2>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <strong>Error Type:</strong> {errorReport.type}
        {errorReport.totalErrors && errorReport.totalErrors > 1 && (
          <span> ({errorReport.totalErrors} errors)</span>
        )}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <strong>Recoverable:</strong> {errorReport.recoverable ? 'Yes' : 'No'}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <strong>Primary Message:</strong> {error.message}
      </div>

      {errorReport.suggestions && errorReport.suggestions.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <strong>Suggestions:</strong>
          <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
            {errorReport.suggestions.slice(0, 3).map((suggestion, index) => (
              <li key={index} style={{ marginBottom: '4px' }}>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginBottom: '12px' }}>
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          style={{
            marginRight: '8px',
            padding: '4px 8px',
            border: '1px solid #991b1b',
            backgroundColor: 'transparent',
            color: '#991b1b',
            cursor: 'pointer',
            borderRadius: '4px',
          }}
        >
          {showDetails ? 'Hide' : 'Show'} Error Details
        </button>

        <button
          type="button"
          onClick={() => setShowDebugInfo(!showDebugInfo)}
          style={{
            marginRight: '8px',
            padding: '4px 8px',
            border: '1px solid #991b1b',
            backgroundColor: 'transparent',
            color: '#991b1b',
            cursor: 'pointer',
            borderRadius: '4px',
          }}
        >
          {showDebugInfo ? 'Hide' : 'Show'} Debug Info
        </button>

        {canRetry && (
          <button
            type="button"
            onClick={retry}
            data-testid="error-boundary-retry"
            style={{
              padding: '4px 8px',
              border: '1px solid #991b1b',
              backgroundColor: '#991b1b',
              color: 'white',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
          >
            Retry Test
          </button>
        )}
      </div>

      {showDetails && (
        <details open style={{ marginBottom: '12px' }}>
          <summary style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            Error Categories ({errorReport.categories?.length || 0})
          </summary>
          {errorReport.categories?.map((category, index) => (
            <div
              key={index}
              style={{ marginBottom: '8px', paddingLeft: '16px' }}
            >
              <div>
                <strong>Type:</strong> {category.type}
              </div>
              <div>
                <strong>Severity:</strong> {category.severity}
              </div>
              <div>
                <strong>Source:</strong> {category.source}
              </div>
              <div>
                <strong>Message:</strong> {category.message}
              </div>
              {category.component && (
                <div>
                  <strong>Component:</strong> {category.component}
                </div>
              )}
              {category.hook && (
                <div>
                  <strong>Hook:</strong> {category.hook}
                </div>
              )}
            </div>
          ))}
        </details>
      )}

      {showDebugInfo && (
        <details open>
          <summary style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            Debug Information
          </summary>
          <pre
            style={{
              fontSize: '12px',
              overflow: 'auto',
              backgroundColor: '#f9fafb',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
            }}
          >
            {React19ErrorHandler.generateDebugInfo(
              error,
              { componentStack: '' },
              errorReport
            )}
          </pre>
        </details>
      )}
    </div>
  );
};

/**
 * React 19 Error Boundary Component
 * Enhanced error boundary specifically designed for React 19 AggregateError handling
 * Provides detailed error reporting, debugging information, and fallback UI for test error states
 */
export class React19ErrorBoundary extends Component<
  React19ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: React19ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
      maxRetries: props.maxRetries || 3,
      errorReport: undefined,
      debugMode: props.debugMode || false,
    };
  }

  static getDerivedStateFromError(
    error: Error | AggregateError
  ): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error | AggregateError, errorInfo: ErrorInfo) {
    const context = {
      testName: this.props.testName,
      componentName: this.props.componentName || 'React19ErrorBoundary',
    };

    // Generate comprehensive error report
    const errorReport =
      error instanceof AggregateError
        ? React19ErrorHandler.handleAggregateError(error, errorInfo, context)
        : React19ErrorHandler.handleStandardError(error, errorInfo, context);

    this.setState({
      errorInfo,
      errorReport,
    });

    // Enhanced logging for React 19 AggregateError
    if (error instanceof AggregateError) {
      console.group('🚨 React 19 AggregateError Caught');
      console.error('Total Errors:', error.errors?.length || 0);
      console.error('Recoverable:', errorReport.recoverable);
      console.error('Error Report:', errorReport);

      error.errors?.forEach((individualError, index) => {
        console.error(`Error ${index + 1}:`, individualError);
      });

      if (this.state.debugMode) {
        console.error(
          'Debug Info:',
          React19ErrorHandler.generateDebugInfo(error, errorInfo, errorReport)
        );
      }

      console.groupEnd();
    } else {
      console.group('🚨 React Error Caught');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Error Report:', errorReport);

      if (this.state.debugMode) {
        console.error(
          'Debug Info:',
          React19ErrorHandler.generateDebugInfo(error, errorInfo, errorReport)
        );
      }

      console.groupEnd();
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo, errorReport);
  }

  componentDidUpdate(prevProps: React19ErrorBoundaryProps) {
    // Reset error boundary if props change and resetOnPropsChange is true
    if (
      this.props.resetOnPropsChange &&
      this.state.hasError &&
      (prevProps.children !== this.props.children ||
        prevProps.testName !== this.props.testName)
    ) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorReport: undefined,
      retryCount: 0,
    });
  };

  retry = () => {
    if (this.state.retryCount < this.state.maxRetries) {
      console.log(
        `🔄 Retrying error boundary (attempt ${this.state.retryCount + 1}/${this.state.maxRetries})`
      );

      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        errorReport: undefined,
        retryCount: this.state.retryCount + 1,
      });

      // Add a small delay to allow for cleanup
      this.retryTimeoutId = setTimeout(() => {
        // Force re-render by updating a dummy state if needed
        this.forceUpdate();
      }, 100);
    }
  };

  render() {
    if (this.state.hasError && this.state.error && this.state.errorReport) {
      const canRetry = this.state.retryCount < this.state.maxRetries;

      // Use custom fallback component if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            errorReport={this.state.errorReport}
            retry={this.retry}
            canRetry={canRetry}
          />
        );
      }

      // Use default fallback UI
      return (
        <DefaultTestErrorFallback
          error={this.state.error}
          errorReport={this.state.errorReport}
          retry={this.retry}
          canRetry={canRetry}
        />
      );
    }

    return this.props.children;
  }
}

// Export all components and utilities
export default React19ErrorBoundary;

// Convenience wrapper for backward compatibility
export const TestErrorBoundary: React.FC<{
  children: ReactNode;
  testName?: string;
}> = ({ children, testName }) => {
  return (
    <React19ErrorBoundary testName={testName} debugMode={true}>
      {children}
    </React19ErrorBoundary>
  );
};

// Export types for external use
export type {
  React19ErrorBoundaryProps,
  ErrorBoundaryState,
  TestErrorReport,
  ErrorCategory,
};
