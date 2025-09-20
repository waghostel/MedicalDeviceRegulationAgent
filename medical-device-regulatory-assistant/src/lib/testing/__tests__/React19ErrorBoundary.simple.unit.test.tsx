/**
 * Simple test to verify React19ErrorBoundary basic functionality
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { React19ErrorBoundary } from '../React19ErrorBoundary';

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

// Simple component that throws an error
const ErrorComponent: React.FC = () => {
  throw new Error('Test error for error boundary');
};

// Working component
const WorkingComponent: React.FC = () => <div data-testid="working-component">Component works!</div>;

describe('React19ErrorBoundary Basic Functionality', () => {
  it('should render children when no error occurs', () => {
    render(
      <React19ErrorBoundary>
        <WorkingComponent />
      </React19ErrorBoundary>
    );

    expect(screen.getByTestId('working-component')).toBeInTheDocument();
    expect(screen.getByText('Component works!')).toBeInTheDocument();
  });

  it('should catch errors and display error boundary UI', () => {
    render(
      <React19ErrorBoundary>
        <ErrorComponent />
      </React19ErrorBoundary>
    );

    // Should show error boundary UI
    expect(screen.getByTestId('react19-error-boundary')).toBeInTheDocument();
    expect(
      screen.getByText('React 19 Test Error Boundary')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Test error for error boundary')
    ).toBeInTheDocument();
  });

  it('should provide retry functionality', () => {
    render(
      <React19ErrorBoundary>
        <ErrorComponent />
      </React19ErrorBoundary>
    );

    // Should show retry button
    expect(screen.getByTestId('error-boundary-retry')).toBeInTheDocument();
  });

  it('should handle AggregateError', () => {
    const AggregateErrorComponent: React.FC = () => {
      const aggregateError = new AggregateError(
        [new Error('First error'), new Error('Second error')],
        'Multiple errors occurred'
      );
      throw aggregateError;
    };

    render(
      <React19ErrorBoundary>
        <AggregateErrorComponent />
      </React19ErrorBoundary>
    );

    // Should show error boundary UI with AggregateError info
    expect(screen.getByTestId('react19-error-boundary')).toBeInTheDocument();
    expect(screen.getByText(/AggregateError/)).toBeInTheDocument();
    expect(screen.getByText(/2 errors/)).toBeInTheDocument();
  });
});
