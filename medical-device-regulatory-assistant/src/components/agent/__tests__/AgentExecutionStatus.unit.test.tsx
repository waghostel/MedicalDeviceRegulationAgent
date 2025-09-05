/**
 * Unit tests for AgentExecutionStatus component
 * Tests status display, progress tracking, and user interactions
 */

import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders, createMockSession } from '@/lib/testing/test-utils';
import { AgentExecutionStatusComponent, AgentExecutionStatusInline } from '../AgentExecutionStatus';
import { AgentExecutionStatus } from '@/hooks/useAgentExecution';

describe('AgentExecutionStatusComponent', () => {
  const mockSession = createMockSession();

  const createMockStatus = (overrides: Partial<AgentExecutionStatus> = {}): AgentExecutionStatus => ({
    status: 'idle',
    sessionId: 'session-123',
    currentTask: null,
    completedTasks: [],
    progress: null,
    message: null,
    error: null,
    executionTime: null,
    ...overrides,
  });

  const defaultProps = {
    status: createMockStatus(),
    onCancel: jest.fn(),
    onRetry: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Idle State', () => {
    it('renders idle state correctly', () => {
      renderWithProviders(
        <AgentExecutionStatusComponent {...defaultProps} />,
        { session: mockSession }
      );

      expect(screen.getByText('Agent Status')).toBeInTheDocument();
      expect(screen.getByText('Ready')).toBeInTheDocument();
      
      // Should show clock icon for idle state
      const clockIcon = document.querySelector('[data-lucide="clock"]');
      expect(clockIcon).toBeInTheDocument();
    });

    it('does not show cancel or retry buttons in idle state', () => {
      renderWithProviders(
        <AgentExecutionStatusComponent {...defaultProps} />,
        { session: mockSession }
      );

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
    });
  });

  describe('Processing State', () => {
    it('renders processing state correctly', () => {
      const processingStatus = createMockStatus({
        status: 'processing',
        currentTask: 'predicate_search',
        message: 'Searching FDA database for similar devices...',
        progress: 45,
      });

      renderWithProviders(
        <AgentExecutionStatusComponent status={processingStatus} onCancel={jest.fn()} />,
        { session: mockSession }
      );

      expect(screen.getByText('Processing')).toBeInTheDocument();
      expect(screen.getByText('Current Task:')).toBeInTheDocument();
      expect(screen.getByText('Predicate Search')).toBeInTheDocument();
      expect(screen.getByText('Searching FDA database for similar devices...')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();
    });

    it('shows progress bar during processing', () => {
      const processingStatus = createMockStatus({
        status: 'processing',
        progress: 65,
      });

      renderWithProviders(
        <AgentExecutionStatusComponent status={processingStatus} onCancel={jest.fn()} />,
        { session: mockSession }
      );

      const progressBar = document.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument();
    });

    it('shows cancel button during processing', () => {
      const processingStatus = createMockStatus({
        status: 'processing',
      });

      const mockOnCancel = jest.fn();
      renderWithProviders(
        <AgentExecutionStatusComponent status={processingStatus} onCancel={mockOnCancel} />,
        { session: mockSession }
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();

      fireEvent.click(cancelButton);
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('shows spinning loader icon during processing', () => {
      const processingStatus = createMockStatus({
        status: 'processing',
      });

      renderWithProviders(
        <AgentExecutionStatusComponent status={processingStatus} />,
        { session: mockSession }
      );

      const spinnerIcon = document.querySelector('.animate-spin');
      expect(spinnerIcon).toBeInTheDocument();
    });
  });

  describe('Completed State', () => {
    it('renders completed state correctly', () => {
      const completedStatus = createMockStatus({
        status: 'completed',
        completedTasks: ['device_classification', 'predicate_search'],
        executionTime: 5500,
      });

      renderWithProviders(
        <AgentExecutionStatusComponent status={completedStatus} />,
        { session: mockSession }
      );

      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Execution time: 5.5s')).toBeInTheDocument();
      
      // Should show check icon for completed state
      const checkIcon = document.querySelector('.text-green-600');
      expect(checkIcon).toBeInTheDocument();
    });

    it('displays completed tasks when showDetails is true', () => {
      const completedStatus = createMockStatus({
        status: 'completed',
        completedTasks: ['device_classification', 'predicate_search'],
      });

      renderWithProviders(
        <AgentExecutionStatusComponent status={completedStatus} showDetails={true} />,
        { session: mockSession }
      );

      expect(screen.getByText('Completed Tasks:')).toBeInTheDocument();
      expect(screen.getByText('Device Classification')).toBeInTheDocument();
      expect(screen.getByText('Predicate Search')).toBeInTheDocument();
    });

    it('does not display completed tasks when showDetails is false', () => {
      const completedStatus = createMockStatus({
        status: 'completed',
        completedTasks: ['device_classification', 'predicate_search'],
      });

      renderWithProviders(
        <AgentExecutionStatusComponent status={completedStatus} showDetails={false} />,
        { session: mockSession }
      );

      expect(screen.queryByText('Completed Tasks:')).not.toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('renders error state correctly', () => {
      const errorStatus = createMockStatus({
        status: 'error',
        error: 'Failed to connect to FDA database',
      });

      renderWithProviders(
        <AgentExecutionStatusComponent status={errorStatus} onRetry={jest.fn()} />,
        { session: mockSession }
      );

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Failed to connect to FDA database')).toBeInTheDocument();
      
      // Should show error icon
      const errorIcon = document.querySelector('.text-red-600');
      expect(errorIcon).toBeInTheDocument();
    });

    it('shows retry button in error state', () => {
      const errorStatus = createMockStatus({
        status: 'error',
        error: 'Test error',
      });

      const mockOnRetry = jest.fn();
      renderWithProviders(
        <AgentExecutionStatusComponent status={errorStatus} onRetry={mockOnRetry} />,
        { session: mockSession }
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(mockOnRetry).toHaveBeenCalled();
    });
  });

  describe('Cancelled State', () => {
    it('renders cancelled state correctly', () => {
      const cancelledStatus = createMockStatus({
        status: 'cancelled',
      });

      renderWithProviders(
        <AgentExecutionStatusComponent status={cancelledStatus} onRetry={jest.fn()} />,
        { session: mockSession }
      );

      expect(screen.getByText('Cancelled')).toBeInTheDocument();
      
      // Should show stop icon for cancelled state
      const stopIcon = document.querySelector('.text-orange-600');
      expect(stopIcon).toBeInTheDocument();
    });

    it('shows retry button in cancelled state', () => {
      const cancelledStatus = createMockStatus({
        status: 'cancelled',
      });

      const mockOnRetry = jest.fn();
      renderWithProviders(
        <AgentExecutionStatusComponent status={cancelledStatus} onRetry={mockOnRetry} />,
        { session: mockSession }
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton).toBeInTheDocument();

      fireEvent.click(retryButton);
      expect(mockOnRetry).toHaveBeenCalled();
    });
  });

  describe('Execution Time Formatting', () => {
    it('formats milliseconds correctly', () => {
      const status = createMockStatus({
        status: 'completed',
        executionTime: 500,
      });

      renderWithProviders(
        <AgentExecutionStatusComponent status={status} />,
        { session: mockSession }
      );

      expect(screen.getByText('Execution time: 500ms')).toBeInTheDocument();
    });

    it('formats seconds correctly', () => {
      const status = createMockStatus({
        status: 'completed',
        executionTime: 2500,
      });

      renderWithProviders(
        <AgentExecutionStatusComponent status={status} />,
        { session: mockSession }
      );

      expect(screen.getByText('Execution time: 2.5s')).toBeInTheDocument();
    });

    it('formats minutes and seconds correctly', () => {
      const status = createMockStatus({
        status: 'completed',
        executionTime: 125000, // 2 minutes 5 seconds
      });

      renderWithProviders(
        <AgentExecutionStatusComponent status={status} />,
        { session: mockSession }
      );

      expect(screen.getByText('Execution time: 2m 5s')).toBeInTheDocument();
    });
  });

  describe('Session ID Display', () => {
    it('displays session ID when showDetails is true', () => {
      const status = createMockStatus({
        sessionId: 'session-abcd1234',
      });

      renderWithProviders(
        <AgentExecutionStatusComponent status={status} showDetails={true} />,
        { session: mockSession }
      );

      expect(screen.getByText('Session: abcd1234')).toBeInTheDocument();
    });

    it('does not display session ID when showDetails is false', () => {
      const status = createMockStatus({
        sessionId: 'session-abcd1234',
      });

      renderWithProviders(
        <AgentExecutionStatusComponent status={status} showDetails={false} />,
        { session: mockSession }
      );

      expect(screen.queryByText(/Session:/)).not.toBeInTheDocument();
    });
  });

  describe('Task Name Formatting', () => {
    it('formats task names correctly', () => {
      const status = createMockStatus({
        status: 'processing',
        currentTask: 'predicate_search_analysis',
      });

      renderWithProviders(
        <AgentExecutionStatusComponent status={status} />,
        { session: mockSession }
      );

      expect(screen.getByText('Predicate Search Analysis')).toBeInTheDocument();
    });

    it('formats completed task names correctly', () => {
      const status = createMockStatus({
        status: 'completed',
        completedTasks: ['device_classification', 'fda_guidance_search'],
      });

      renderWithProviders(
        <AgentExecutionStatusComponent status={status} showDetails={true} />,
        { session: mockSession }
      );

      expect(screen.getByText('Device Classification')).toBeInTheDocument();
      expect(screen.getByText('Fda Guidance Search')).toBeInTheDocument();
    });
  });
});

describe('AgentExecutionStatusInline', () => {
  const mockSession = createMockSession();

  const createMockStatus = (overrides: Partial<AgentExecutionStatus> = {}): AgentExecutionStatus => ({
    status: 'idle',
    sessionId: 'session-123',
    currentTask: null,
    completedTasks: [],
    progress: null,
    message: null,
    error: null,
    executionTime: null,
    ...overrides,
  });

  describe('Inline Component Rendering', () => {
    it('renders inline status correctly', () => {
      const status = createMockStatus({
        status: 'processing',
        message: 'Analyzing device characteristics...',
      });

      renderWithProviders(
        <AgentExecutionStatusInline status={status} />,
        { session: mockSession }
      );

      expect(screen.getByText('Analyzing device characteristics...')).toBeInTheDocument();
      
      // Should show spinner for processing
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('shows cancel button during processing', () => {
      const status = createMockStatus({
        status: 'processing',
      });

      const mockOnCancel = jest.fn();
      renderWithProviders(
        <AgentExecutionStatusInline status={status} onCancel={mockOnCancel} />,
        { session: mockSession }
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toBeInTheDocument();

      fireEvent.click(cancelButton);
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('does not show cancel button when not processing', () => {
      const status = createMockStatus({
        status: 'completed',
      });

      renderWithProviders(
        <AgentExecutionStatusInline status={status} onCancel={jest.fn()} />,
        { session: mockSession }
      );

      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument();
    });

    it('displays status when no message is provided', () => {
      const status = createMockStatus({
        status: 'idle',
        message: null,
      });

      renderWithProviders(
        <AgentExecutionStatusInline status={status} />,
        { session: mockSession }
      );

      expect(screen.getByText('idle')).toBeInTheDocument();
    });
  });

  describe('Icon Display', () => {
    it('shows correct icons for different states', () => {
      const { rerender } = renderWithProviders(
        <AgentExecutionStatusInline status={createMockStatus({ status: 'processing' })} />,
        { session: mockSession }
      );

      // Processing - spinner
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();

      // Completed - check
      rerender(<AgentExecutionStatusInline status={createMockStatus({ status: 'completed' })} />);
      expect(document.querySelector('.text-green-600')).toBeInTheDocument();

      // Error - X
      rerender(<AgentExecutionStatusInline status={createMockStatus({ status: 'error' })} />);
      expect(document.querySelector('.text-red-600')).toBeInTheDocument();

      // Cancelled - stop
      rerender(<AgentExecutionStatusInline status={createMockStatus({ status: 'cancelled' })} />);
      expect(document.querySelector('.text-orange-600')).toBeInTheDocument();
    });
  });
});

describe('Error Handling', () => {
  const mockSession = createMockSession();

  it('handles missing callback props gracefully', () => {
    const status = {
      status: 'processing' as const,
      sessionId: 'session-123',
      currentTask: null,
      completedTasks: [],
      progress: null,
      message: null,
      error: null,
      executionTime: null,
    };

    renderWithProviders(
      <AgentExecutionStatusComponent status={status} />,
      { session: mockSession }
    );

    // Should render without crashing
    expect(screen.getByText('Agent Status')).toBeInTheDocument();
  });

  it('handles unknown status gracefully', () => {
    const status = {
      status: 'unknown' as any,
      sessionId: 'session-123',
      currentTask: null,
      completedTasks: [],
      progress: null,
      message: null,
      error: null,
      executionTime: null,
    };

    renderWithProviders(
      <AgentExecutionStatusComponent status={status} />,
      { session: mockSession }
    );

    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });
});