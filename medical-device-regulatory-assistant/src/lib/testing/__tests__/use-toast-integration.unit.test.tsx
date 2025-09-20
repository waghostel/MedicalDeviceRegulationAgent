/**
 * Integration test to verify useToast mock works with components
 * Tests the mock structure against actual component usage
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import {
  setupUseToastMock,
  cleanupUseToastMock,
} from '../setup-use-toast-mock';
import { useToastMock, toastMockUtils } from '../use-toast-mock';

// Simple test component that uses useToast
const TestComponent: React.FC = () => {
  // This would normally import from '@/hooks/use-toast'
  const { toast, contextualToast, dismiss, toasts } = useToastMock.useToast();

  const handleBasicToast = () => {
    toast({
      title: 'Basic Toast',
      description: 'This is a basic toast message',
      variant: 'success',
    });
  };

  const handleContextualToast = () => {
    contextualToast.validationError('Please fill in all required fields');
  };

  const handleDismiss = () => {
    dismiss('test-toast-id');
  };

  return (
    <div>
      <button onClick={handleBasicToast}>Show Basic Toast</button>
      <button onClick={handleContextualToast}>Show Validation Error</button>
      <button onClick={handleDismiss}>Dismiss Toast</button>
      <div data-testid="toast-count">{toasts.length}</div>
    </div>
  );
};

describe('useToast Mock Integration', () => {
  beforeEach(() => {
    toastMockUtils.clear();
    toastMockUtils.resetMocks();
    setupUseToastMock();
  });

  afterEach(() => {
    cleanupUseToastMock();
  });

  it('should work with component that uses useToast hook', () => {
    render(<TestComponent />);

    expect(screen.getByText('Show Basic Toast')).toBeInTheDocument();
    expect(screen.getByText('Show Validation Error')).toBeInTheDocument();
    expect(screen.getByText('Dismiss Toast')).toBeInTheDocument();
  });

  it('should track toast calls from component interactions', () => {
    render(<TestComponent />);

    // Initially no toasts
    expect(toastMockUtils.getCallCount()).toBe(0);

    // Click basic toast button
    fireEvent.click(screen.getByText('Show Basic Toast'));

    // Should have tracked the toast call
    expect(toastMockUtils.getCallCount()).toBe(1);
    expect(
      toastMockUtils.wasCalledWith(
        'Basic Toast',
        'This is a basic toast message',
        'success'
      )
    ).toBe(true);

    // Click contextual toast button
    fireEvent.click(screen.getByText('Show Validation Error'));

    // Should have tracked both calls
    expect(toastMockUtils.getCallCount()).toBe(2);
    expect(
      toastMockUtils.wasCalledWith(
        'Validation Error',
        'Please fill in all required fields'
      )
    ).toBe(true);
  });

  it('should track contextual toast calls correctly', () => {
    render(<TestComponent />);

    fireEvent.click(screen.getByText('Show Validation Error'));

    const validationCalls = toastMockUtils.getCallsByCategory('validation');
    expect(validationCalls).toHaveLength(1);
    expect(validationCalls[0].title).toBe('Validation Error');
    expect(validationCalls[0].description).toBe(
      'Please fill in all required fields'
    );
  });

  it('should track dismiss calls', () => {
    const mockReturn = useToastMock.useToast();
    render(<TestComponent />);

    fireEvent.click(screen.getByText('Dismiss Toast'));

    expect(mockReturn.dismiss).toHaveBeenCalledWith('test-toast-id');
    expect(mockReturn.dismiss).toHaveBeenCalledTimes(1);
  });

  it('should provide access to toast state', () => {
    render(<TestComponent />);

    // Initially should show 0 toasts
    expect(screen.getByTestId('toast-count')).toHaveTextContent('0');

    // After clicking, the mock state is updated (but component doesn't re-render)
    fireEvent.click(screen.getByText('Show Basic Toast'));

    // Verify the mock state was updated
    const mockReturn = useToastMock.useToast();
    expect(mockReturn.toasts).toHaveLength(1);
    expect(toastMockUtils.getCallCount()).toBe(1);
  });

  it('should support jest mock assertions on component interactions', () => {
    const mockReturn = useToastMock.useToast();
    render(<TestComponent />);

    fireEvent.click(screen.getByText('Show Basic Toast'));

    expect(mockReturn.toast).toHaveBeenCalledWith({
      title: 'Basic Toast',
      description: 'This is a basic toast message',
      variant: 'success',
    });

    fireEvent.click(screen.getByText('Show Validation Error'));

    expect(mockReturn.contextualToast.validationError).toHaveBeenCalledWith(
      'Please fill in all required fields'
    );
  });

  it('should reset properly between tests', () => {
    const mockReturn = useToastMock.useToast();
    render(<TestComponent />);

    // This test should start with clean mocks
    expect(mockReturn.toast).toHaveBeenCalledTimes(0);
    expect(mockReturn.contextualToast.validationError).toHaveBeenCalledTimes(0);
    expect(toastMockUtils.getCallCount()).toBe(0);
  });
});
