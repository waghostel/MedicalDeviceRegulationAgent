/**
 * Tests for React19ErrorBoundary component
 * Verifies React 19 AggregateError handling, error reporting, and fallback UI
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import {
  React19ErrorBoundary,
  React19ErrorHandler,
  DefaultTestErrorFallback,
  type TestErrorReport,
  type ErrorCategory,
} from '../React19ErrorBoundary';

// Mock console methods to avoid noise in tests
const originalConsoleError = console.error;
const originalConsoleGroup = console.group;
const originalConsoleGroupEnd = console.groupEnd;

beforeEach(() => {
  console.error = jest.fn();
  console.group = jest.fn();
  console.groupEnd = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.group = originalConsoleGroup;
  console.groupEnd = originalConsoleGroupEnd;
  jest.clearAllMocks();
});

// Test component that throws errors
const ThrowingComponent: React.FC<{
  shouldThrow?: boolean;
  errorType?: 'standard' | 'aggregate' | 'hook';
}> = ({ shouldThrow = false, errorType = 'standard' }) => {
  if (shouldThrow) {
    switch (errorType) {
      case 'aggregate':
        const aggregateError = new AggregateError(
          [
            new Error('useToast is not a function'),
            new Error(
              "Cannot read properties of undefined (reading 'provider')"
            ),
          ],
          'Multiple React errors occurred'
        );
        throw aggregateError;

      case 'hook':
        throw new Error('useToast is not a function');

      default:
        throw new Error('Test error');
    }
  }

  return <div data-testid="working-component">Component works!</div>;
};

describe('React19ErrorBoundary', () => {
  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      render(
        <React19ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </React19ErrorBoundary>
      );

      expect(screen.getByTestId('working-component')).toBeInTheDocument();
      expect(screen.getByText('Component works!')).toBeInTheDocument();
    });

    it('should not render error boundary UI when no error', () => {
      render(
        <React19ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </React19ErrorBoundary>
      );

      expect(
        screen.queryByTestId('react19-error-boundary')
      ).not.toBeInTheDocument();
    });
  });

  describe('Standard Error Handling', () => {
    it('should catch and display standard errors', () => {
      render(
        <React19ErrorBoundary>
          <ThrowingComponent shouldThrow={true} errorType="standard" />
        </React19ErrorBoundary>
      );

      expect(screen.getByTestId('react19-error-boundary')).toBeInTheDocument();
      expect(
        screen.getByText('React 19 Test Error Boundary')
      ).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('should show error type and recovery status', () => {
      render(
        <React19ErrorBoundary>
          <ThrowingComponent shouldThrow={true} errorType="standard" />
        </React19ErrorBoundary>
      );

      expect(screen.getByText(/Error Type:/)).toBeInTheDocument();
      expect(screen.getByText(/Recoverable:/)).toBeInTheDocument();
    });

    it('should provide retry functionality', () => {
      render(
        <React19ErrorBoundary maxRetries={2}>
          <ThrowingComponent shouldThrow={true} errorType="standard" />
        </React19ErrorBoundary>
      );

      const retryButton = screen.getByTestId('error-boundary-retry');
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toHaveTextContent('Retry Test');
    });
  });

  describe('AggregateError Handling', () => {
    it('should catch and display AggregateError', () => {
      render(
        <React19ErrorBoundary>
          <ThrowingComponent shouldThrow={true} errorType="aggregate" />
        </React19ErrorBoundary>
      );

      expect(screen.getByTestId('react19-error-boundary')).toBeInTheDocument();
      expect(
        screen.getByText('React 19 Test Error Boundary')
      ).toBeInTheDocument();
      expect(screen.getByText(/AggregateError/)).toBeInTheDocument();
      expect(screen.getByText(/2 errors/)).toBeInTheDocument();
    });

    it('should show individual error count for AggregateError', () => {
      render(
        <React19ErrorBoundary>
          <ThrowingComponent shouldThrow={true} errorType="aggregate" />
        </React19ErrorBoundary>
      );

      expect(screen.getByText(/\(2 errors\)/)).toBeInTheDocument();
    });
  });

  describe('Hook Error Handling', () => {
    it('should categorize hook errors correctly', () => {
      render(
        <React19ErrorBoundary>
          <ThrowingComponent shouldThrow={true} errorType="hook" />
        </React19ErrorBoundary>
      );

      expect(screen.getByTestId('react19-error-boundary')).toBeInTheDocument();
      expect(
        screen.getByText('useToast is not a function')
      ).toBeInTheDocument();
    });

    it('should provide hook-specific suggestions', () => {
      render(
        <React19ErrorBoundary>
          <ThrowingComponent shouldThrow={true} errorType="hook" />
        </React19ErrorBoundary>
      );

      // Check for hook-related suggestions
      expect(
        screen.getByText(/Check hook mock configuration/)
      ).toBeInTheDocument();
    });
  });

  describe('Error Details and Debug Info', () => {
    it('should allow toggling error details', () => {
      render(
        <React19ErrorBoundary>
          <ThrowingComponent shouldThrow={true} errorType="aggregate" />
        </React19ErrorBoundary>
      );

      const showDetailsButton = screen.getByText('Show Error Details');
      expect(showDetailsButton).toBeInTheDocument();

      fireEvent.click(showDetailsButton);
      expect(screen.getByText('Hide Error Details')).toBeInTheDocument();
      expect(screen.getByText(/Error Categories/)).toBeInTheDocument();
    });

    it('should allow toggling debug information', () => {
      render(
        <React19ErrorBoundary>
          <ThrowingComponent shouldThrow={true} errorType="standard" />
        </React19ErrorBoundary>
      );

      const showDebugButton = screen.getByText('Show Debug Info');
      expect(showDebugButton).toBeInTheDocument();

      fireEvent.click(showDebugButton);
      expect(screen.getByText('Hide Debug Info')).toBeInTheDocument();
      expect(screen.getByText('Debug Information')).toBeInTheDocument();
    });
  });

  describe('Retry Functionality', () => {
    it('should allow retrying within max retry limit', () => {
      const { rerender } = render(
        <React19ErrorBoundary maxRetries={2}>
          <ThrowingComponent shouldThrow={true} errorType="standard" />
        </React19ErrorBoundary>
      );

      const retryButton = screen.getByTestId('error-boundary-retry');
      expect(retryButton).toBeInTheDocument();

      // First retry
      fireEvent.click(retryButton);

      // Should still show retry button (within limit)
      expect(screen.getByTestId('error-boundary-retry')).toBeInTheDocument();
    });

    it('should disable retry after max attempts', () => {
      render(
        <React19ErrorBoundary maxRetries={0}>
          <ThrowingComponent shouldThrow={true} errorType="standard" />
        </React19ErrorBoundary>
      );

      // Should not show retry button when maxRetries is 0
      expect(
        screen.queryByTestId('error-boundary-retry')
      ).not.toBeInTheDocument();
    });
  });

  describe('Custom Props', () => {
    it('should use custom test name in error reporting', () => {
      const onError = jest.fn();

      render(
        <React19ErrorBoundary testName="CustomTest" onError={onError}>
          <ThrowingComponent shouldThrow={true} errorType="standard" />
        </React19ErrorBoundary>
      );

      expect(onError).toHaveBeenCalled();
      const [error, errorInfo, report] = onError.mock.calls[0];
      expect(report.errorBoundary).toBe('React19ErrorBoundary');
    });

    it('should call custom onError handler', () => {
      const onError = jest.fn();

      render(
        <React19ErrorBoundary onError={onError}>
          <ThrowingComponent shouldThrow={true} errorType="standard" />
        </React19ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should use custom fallback component', () => {
      const CustomFallback: React.FC<unknown> = ({ error }) => (
        <div data-testid="custom-fallback">Custom Error: {error.message}</div>
      );

      render(
        <React19ErrorBoundary fallback={CustomFallback}>
          <ThrowingComponent shouldThrow={true} errorType="standard" />
        </React19ErrorBoundary>
      );

      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom Error: Test error')).toBeInTheDocument();
      expect(
        screen.queryByTestId('react19-error-boundary')
      ).not.toBeInTheDocument();
    });
  });
});

describe('React19ErrorHandler', () => {
  describe('Error Categorization', () => {
    it('should categorize hook mock errors correctly', () => {
      const error = new Error('useToast is not a function');
      const category = React19ErrorHandler.categorizeError(error);

      expect(category.type).toBe('HookMockError');
      expect(category.severity).toBe('critical');
      expect(category.source).toBe('hook');
      expect(category.hook).toBe('useToast');
    });

    it('should categorize provider errors correctly', () => {
      const error = new Error('Provider not found in context');
      const category = React19ErrorHandler.categorizeError(error);

      expect(category.type).toBe('ProviderError');
      expect(category.severity).toBe('high');
      expect(category.source).toBe('provider');
    });

    it('should categorize render errors correctly', () => {
      const error = new Error('Cannot read properties of undefined');
      const category = React19ErrorHandler.categorizeError(error);

      expect(category.type).toBe('RenderError');
      expect(category.severity).toBe('critical');
    });
  });

  describe('AggregateError Handling', () => {
    it('should handle AggregateError with multiple errors', () => {
      const aggregateError = new AggregateError(
        [
          new Error('useToast is not a function'),
          new Error('Provider not found'),
        ],
        'Multiple errors'
      );

      const report = React19ErrorHandler.handleAggregateError(aggregateError);

      expect(report.type).toBe('AggregateError');
      expect(report.totalErrors).toBe(2);
      expect(report.categories).toHaveLength(2);
      expect(report.suggestions).toContain(
        'Check hook mock configuration in test setup'
      );
    });

    it('should determine recoverability correctly', () => {
      const recoverableError = new AggregateError(
        [
          new Error('useToast is not a function'),
          new Error('localStorage is not defined'),
        ],
        'Recoverable errors'
      );

      const report = React19ErrorHandler.handleAggregateError(recoverableError);
      expect(report.recoverable).toBe(true);

      const nonRecoverableError = new AggregateError(
        [
          new Error('Cannot read properties of null'),
          new Error('ReferenceError: undefined variable'),
        ],
        'Non-recoverable errors'
      );

      const nonRecoverableReport =
        React19ErrorHandler.handleAggregateError(nonRecoverableError);
      expect(nonRecoverableReport.recoverable).toBe(false);
    });
  });

  describe('Suggestion Generation', () => {
    it('should generate appropriate suggestions for hook errors', () => {
      const categories: ErrorCategory[] = [
        {
          type: 'HookMockError',
          message: 'useToast is not a function',
          severity: 'critical',
          source: 'hook',
          hook: 'useToast',
        },
      ];

      const suggestions = React19ErrorHandler.generateSuggestions(categories);

      expect(suggestions).toContain(
        'Check hook mock configuration in test setup'
      );
      expect(suggestions).toContain(
        'Ensure all required hook methods are properly mocked'
      );
    });

    it('should generate appropriate suggestions for provider errors', () => {
      const categories: ErrorCategory[] = [
        {
          type: 'ProviderError',
          message: 'Provider not found',
          severity: 'high',
          source: 'provider',
        },
      ];

      const suggestions = React19ErrorHandler.generateSuggestions(categories);

      expect(suggestions).toContain(
        'Ensure all required providers are included in test wrapper'
      );
      expect(suggestions).toContain(
        'Check provider order and nesting structure'
      );
    });

    it('should remove duplicate suggestions', () => {
      const categories: ErrorCategory[] = [
        {
          type: 'HookMockError',
          message: 'useToast is not a function',
          severity: 'critical',
          source: 'hook',
        },
        {
          type: 'HookMockError',
          message: 'useForm is not a function',
          severity: 'critical',
          source: 'hook',
        },
      ];

      const suggestions = React19ErrorHandler.generateSuggestions(categories);
      const uniqueSuggestions = [...new Set(suggestions)];

      expect(suggestions.length).toBe(uniqueSuggestions.length);
    });
  });

  describe('Debug Information', () => {
    it('should generate comprehensive debug information', () => {
      const error = new Error('Test error');
      const errorInfo = { componentStack: 'at TestComponent' };
      const report: TestErrorReport = {
        type: 'Error',
        totalErrors: 1,
        categories: [
          {
            type: 'RenderError',
            message: 'Test error',
            severity: 'high',
            source: 'component',
          },
        ],
        suggestions: ['Check component props'],
        recoverable: true,
        timestamp: Date.now(),
        errorBoundary: 'React19ErrorBoundary',
      };

      const debugInfo = React19ErrorHandler.generateDebugInfo(
        error,
        errorInfo,
        report
      );

      expect(debugInfo).toContain('React 19 Error Boundary Debug Report');
      expect(debugInfo).toContain('Error Type: Error');
      expect(debugInfo).toContain('Total Errors: 1');
      expect(debugInfo).toContain('Recoverable: Yes');
      expect(debugInfo).toContain('Error Categories:');
      expect(debugInfo).toContain('Suggestions:');
    });
  });
});

describe('DefaultTestErrorFallback', () => {
  it('should render error information correctly', () => {
    const error = new Error('Test error message');
    const errorReport: TestErrorReport = {
      type: 'Error',
      totalErrors: 1,
      categories: [
        {
          type: 'RenderError',
          message: 'Test error message',
          severity: 'high',
          source: 'component',
        },
      ],
      suggestions: ['Check component props', 'Verify provider setup'],
      recoverable: true,
      timestamp: Date.now(),
      errorBoundary: 'React19ErrorBoundary',
    };

    const mockRetry = jest.fn();

    render(
      <DefaultTestErrorFallback
        error={error}
        errorReport={errorReport}
        retry={mockRetry}
        canRetry={true}
      />
    );

    expect(
      screen.getByText('React 19 Test Error Boundary')
    ).toBeInTheDocument();
    expect(screen.getByText(/Error Type:/)).toBeInTheDocument();
    expect(screen.getByText(/Error/)).toBeInTheDocument();
    expect(screen.getByText(/Recoverable:/)).toBeInTheDocument();
    expect(screen.getByText(/Yes/)).toBeInTheDocument();
    expect(screen.getByText(/Primary Message:/)).toBeInTheDocument();
    expect(screen.getByText(/Test error message/)).toBeInTheDocument();
    expect(screen.getByText('Check component props')).toBeInTheDocument();
    expect(screen.getByTestId('error-boundary-retry')).toBeInTheDocument();
  });

  it('should handle retry button click', () => {
    const error = new Error('Test error');
    const errorReport: TestErrorReport = {
      type: 'Error',
      recoverable: true,
      timestamp: Date.now(),
      errorBoundary: 'React19ErrorBoundary',
    };

    const mockRetry = jest.fn();

    render(
      <DefaultTestErrorFallback
        error={error}
        errorReport={errorReport}
        retry={mockRetry}
        canRetry={true}
      />
    );

    const retryButton = screen.getByTestId('error-boundary-retry');
    fireEvent.click(retryButton);

    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('should not show retry button when canRetry is false', () => {
    const error = new Error('Test error');
    const errorReport: TestErrorReport = {
      type: 'Error',
      recoverable: false,
      timestamp: Date.now(),
      errorBoundary: 'React19ErrorBoundary',
    };

    const mockRetry = jest.fn();

    render(
      <DefaultTestErrorFallback
        error={error}
        errorReport={errorReport}
        retry={mockRetry}
        canRetry={false}
      />
    );

    expect(
      screen.queryByTestId('error-boundary-retry')
    ).not.toBeInTheDocument();
  });
});
