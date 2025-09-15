/**
 * React 19 Compatibility Tests
 * Tests for enhanced renderWithProviders and error handling
 */

import React from 'react';
import { screen } from '@testing-library/react';
import {
  renderWithProviders,
  React19ErrorBoundary,
  React19ErrorHandler,
  setupTest,
  type TestErrorReport,
} from '../test-utils';

// Test component that throws an error
const ErrorThrowingComponent: React.FC<{ shouldThrow?: boolean }> = ({
  shouldThrow = false,
}) => {
  if (shouldThrow) {
    throw new Error('Test error for React 19 compatibility');
  }
  return (
    <div data-testid="success-component">Component rendered successfully</div>
  );
};

// Test component that throws AggregateError (simulated)
const AggregateErrorComponent: React.FC<{ shouldThrow?: boolean }> = ({
  shouldThrow = false,
}) => {
  if (shouldThrow) {
    const errors = [
      new Error('First error'),
      new Error('Second error'),
      new Error('useToast is not a function'),
    ];
    const aggregateError = new AggregateError(
      errors,
      'Multiple errors occurred'
    );
    throw aggregateError;
  }
  return <div data-testid="aggregate-success">AggregateError test passed</div>;
};

describe('React 19 Compatibility', () => {
  describe('renderWithProviders', () => {
    it('should render components without errors in React 19', () => {
      const { cleanup } = renderWithProviders(<ErrorThrowingComponent />);

      expect(screen.getByTestId('success-component')).toBeInTheDocument();
      expect(
        screen.getByText('Component rendered successfully')
      ).toBeInTheDocument();

      cleanup();
    });

    it('should handle React 19 error boundary configuration', () => {
      const onError = jest.fn();

      const { cleanup } = renderWithProviders(
        <ErrorThrowingComponent shouldThrow={true} />,
        {
          errorBoundary: true,
          onError,
        }
      );

      // Should show error boundary fallback
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByText('Test Error Boundary')).toBeInTheDocument();

      cleanup();
    });

    it('should provide mock registry and cleanup function', () => {
      const { mockRegistry, cleanup } = renderWithProviders(
        <ErrorThrowingComponent />,
        {
          mockConfig: {
            useToast: true,
            localStorage: true,
            timers: true,
          },
        }
      );

      // Check mock registry is populated
      expect(mockRegistry.hooks.has('useToast')).toBe(true);
      expect(mockRegistry.utilities.has('localStorage')).toBe(true);
      expect(mockRegistry.utilities.has('timers')).toBe(true);

      // Cleanup should clear registry
      cleanup();
      expect(mockRegistry.hooks.size).toBe(0);
      expect(mockRegistry.utilities.size).toBe(0);
    });

    it('should handle localStorage mocking', () => {
      const { cleanup } = renderWithProviders(<ErrorThrowingComponent />, {
        mockConfig: { localStorage: true },
      });

      // localStorage should be mocked
      expect(window.localStorage.setItem).toBeDefined();
      expect(typeof window.localStorage.setItem).toBe('function');

      cleanup();
    });
  });

  describe('React19ErrorBoundary', () => {
    it('should catch and display regular errors', () => {
      renderWithProviders(
        <React19ErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </React19ErrorBoundary>
      );

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByText('Test Error Boundary')).toBeInTheDocument();
      expect(
        screen.getByText('Test error for React 19 compatibility')
      ).toBeInTheDocument();
    });

    it('should handle AggregateError with multiple errors', () => {
      renderWithProviders(
        <React19ErrorBoundary>
          <AggregateErrorComponent shouldThrow={true} />
        </React19ErrorBoundary>
      );

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByText('Multiple errors occurred')).toBeInTheDocument();

      // Should show individual errors
      expect(screen.getByText('Individual Errors (3):')).toBeInTheDocument();
      expect(screen.getByText('First error')).toBeInTheDocument();
      expect(screen.getByText('Second error')).toBeInTheDocument();
      expect(
        screen.getByText('useToast is not a function')
      ).toBeInTheDocument();
    });

    it('should provide retry functionality', () => {
      renderWithProviders(
        <React19ErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </React19ErrorBoundary>
      );

      const retryButton = screen.getByTestId('error-boundary-retry');
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toHaveTextContent('Retry (3 attempts left)');
    });

    it('should call custom onError handler', () => {
      const onError = jest.fn();

      renderWithProviders(
        <React19ErrorBoundary onError={onError}>
          <ErrorThrowingComponent shouldThrow={true} />
        </React19ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });
  });

  describe('React19ErrorHandler', () => {
    it('should handle AggregateError correctly', () => {
      const errors = [
        new Error('useToast is not a function'),
        new Error('Provider not found'),
        new Error('Render failed'),
      ];
      const aggregateError = new AggregateError(errors, 'Multiple test errors');

      const report: TestErrorReport =
        React19ErrorHandler.handleAggregateError(aggregateError);

      expect(report.type).toBe('AggregateError');
      expect(report.totalErrors).toBe(3);
      expect(report.categories).toHaveLength(3);
      expect(report.suggestions).toContain(
        'Check hook mock configuration and ensure all required methods are mocked'
      );
      expect(report.suggestions).toContain(
        'Ensure all required providers are included in test wrapper'
      );
    });

    it('should categorize errors correctly', () => {
      const errors = [
        new Error('useToast is not a function'),
        new Error("Cannot read properties of undefined (reading 'Provider')"),
      ];

      const categories = React19ErrorHandler.categorizeErrors(errors);

      expect(categories[0].type).toBe('HookMockError');
      expect(categories[0].hook).toBe('useToast');
      expect(categories[1].type).toBe('ProviderError');
    });

    it('should determine if errors are recoverable', () => {
      const recoverableErrors = [
        {
          type: 'HookMockError',
          message: 'useToast error',
          stack: '',
          component: '',
          hook: 'useToast',
        },
        {
          type: 'ProviderError',
          message: 'Provider error',
          stack: '',
          component: '',
          hook: '',
        },
      ];

      const nonRecoverableErrors = [
        {
          type: 'UnknownError',
          message: 'Fatal error',
          stack: '',
          component: '',
          hook: '',
        },
      ];

      expect(React19ErrorHandler.isRecoverable(recoverableErrors)).toBe(true);
      expect(React19ErrorHandler.isRecoverable(nonRecoverableErrors)).toBe(
        false
      );
    });
  });

  describe('setupTest with React 19 support', () => {
    it('should setup test environment with error capture', () => {
      const { consoleSpy, cleanup } = setupTest('React 19 test', {
        captureErrors: true,
        mockTimers: true,
        mockLocalStorage: true,
      });

      expect(consoleSpy).toBeDefined();
      expect(jest.isMockFunction(window.localStorage.setItem)).toBe(true);

      cleanup();
    });

    it('should handle AggregateError in global error handler', () => {
      const { cleanup } = setupTest('AggregateError test', {
        captureErrors: true,
      });

      // Simulate AggregateError
      const errors = [new Error('Test error')];
      const aggregateError = new AggregateError(errors, 'Test AggregateError');

      // This should not throw and should be handled gracefully
      expect(() => {
        window.onerror?.(
          'AggregateError occurred',
          'test.js',
          1,
          1,
          aggregateError
        );
      }).not.toThrow();

      cleanup();
    });
  });
});
