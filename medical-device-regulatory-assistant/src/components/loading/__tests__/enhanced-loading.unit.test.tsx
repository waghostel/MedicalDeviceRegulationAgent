/**
 * Enhanced Loading Components Tests
 * Tests for the enhanced loading states and progress indicators
 */

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import {
  EnhancedProgressBar,
  FormSubmissionProgress,
  BulkOperationsProgress,
  ExportProgress,
  DataLoadingProgress,
  LoadingOverlay,
} from '../ProgressIndicator';
import {
  ProjectListSkeleton,
  EnhancedFormSkeleton,
  BulkOperationsSkeleton,
  ExportProgressSkeleton,
} from '../LoadingSkeleton';
import {
  useLoadingState,
  useFormSubmissionState,
  useBulkOperationState,
} from '@/hooks/use-loading-state';

// Mock timers for testing
jest.useFakeTimers();

describe('Enhanced Loading Components', () => {
  describe('EnhancedProgressBar', () => {
    it('renders with basic props', () => {
      render(<EnhancedProgressBar value={50} />);

      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('shows ETA when provided', () => {
      render(
        <EnhancedProgressBar
          value={25}
          showETA={true}
          estimatedTimeRemaining="2m 30s"
        />
      );

      expect(screen.getByText('ETA: 2m 30s')).toBeInTheDocument();
    });

    it('applies variant styles correctly', () => {
      const { rerender } = render(
        <EnhancedProgressBar value={50} variant="success" />
      );

      const progressBar = document.querySelector('.bg-green-500');
      expect(progressBar).toBeInTheDocument();

      rerender(<EnhancedProgressBar value={50} variant="error" />);
      const errorBar = document.querySelector('.bg-red-500');
      expect(errorBar).toBeInTheDocument();
    });

    it('caps progress at 100%', () => {
      render(<EnhancedProgressBar value={150} max={100} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('FormSubmissionProgress', () => {
    it('renders nothing when not submitting', () => {
      const { container } = render(
        <FormSubmissionProgress isSubmitting={false} />
      );

      expect(container.firstChild).toBeNull();
    });

    it('shows progress when submitting', () => {
      render(
        <FormSubmissionProgress
          isSubmitting={true}
          currentStep="Validating data"
          progress={33}
        />
      );

      expect(screen.getByText('Validating data')).toBeInTheDocument();
      expect(screen.getByText('33%')).toBeInTheDocument();
    });

    it('displays step progression', () => {
      const steps = ['Step 1', 'Step 2', 'Step 3'];
      render(
        <FormSubmissionProgress
          isSubmitting={true}
          currentStep="Step 2"
          steps={steps}
        />
      );

      expect(screen.getByText('Step 1')).toBeInTheDocument();
      expect(screen.getByText('Step 2')).toBeInTheDocument();
      expect(screen.getByText('Step 3')).toBeInTheDocument();

      // Current step should be highlighted
      const currentStepElement = screen.getByText('Step 2');
      expect(currentStepElement).toHaveClass('text-primary', 'font-medium');
    });
  });

  describe('BulkOperationsProgress', () => {
    it('renders bulk operation progress correctly', () => {
      render(
        <BulkOperationsProgress
          totalItems={100}
          processedItems={25}
          currentItem="Item 25"
          operation="Exporting Projects"
        />
      );

      expect(screen.getByText('Exporting Projects')).toBeInTheDocument();
      expect(
        screen.getByText('Processing 25 of 100 items')
      ).toBeInTheDocument();
      expect(screen.getByText('Current: Item 25')).toBeInTheDocument();
      expect(screen.getByText('✓ 25 completed')).toBeInTheDocument();
    });

    it('shows errors when present', () => {
      render(
        <BulkOperationsProgress
          totalItems={100}
          processedItems={30}
          errors={5}
          operation="Processing Items"
        />
      );

      expect(screen.getByText('✓ 25 completed')).toBeInTheDocument();
      expect(screen.getByText('✗ 5 errors')).toBeInTheDocument();
    });

    it('calls onCancel when cancel button is clicked', () => {
      const mockCancel = jest.fn();
      render(
        <BulkOperationsProgress
          totalItems={100}
          processedItems={25}
          operation="Test Operation"
          onCancel={mockCancel}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);

      expect(mockCancel).toHaveBeenCalled();
    });
  });

  describe('ExportProgress', () => {
    it('renders export progress correctly', () => {
      render(
        <ExportProgress
          exportType="pdf"
          progress={60}
          currentStep="Generating file"
          fileName="project-export.pdf"
          fileSize="2.5 MB"
        />
      );

      expect(screen.getByText('Exporting PDF')).toBeInTheDocument();
      expect(screen.getByText('Generating file')).toBeInTheDocument();
      expect(screen.getByText('project-export.pdf')).toBeInTheDocument();
      expect(screen.getByText('Size: 2.5 MB')).toBeInTheDocument();
    });

    it('shows download button when complete', () => {
      const mockDownload = jest.fn();
      render(
        <ExportProgress
          exportType="json"
          progress={100}
          fileName="export.json"
          onDownload={mockDownload}
        />
      );

      const downloadButton = screen.getByText('Download File');
      expect(downloadButton).toBeInTheDocument();

      fireEvent.click(downloadButton);
      expect(mockDownload).toHaveBeenCalled();
    });

    it('shows step indicators for incomplete exports', () => {
      render(
        <ExportProgress
          exportType="csv"
          progress={25}
          currentStep="Collecting data"
        />
      );

      expect(screen.getByText('→ Collecting data')).toBeInTheDocument();
      expect(screen.getByText('○ Processing records')).toBeInTheDocument();
    });
  });

  describe('DataLoadingProgress', () => {
    it('renders loading state', () => {
      render(
        <DataLoadingProgress
          isLoading={true}
          loadingMessage="Loading projects..."
          progress={45}
        />
      );

      expect(screen.getByText('Loading projects...')).toBeInTheDocument();
      expect(screen.getByText('45%')).toBeInTheDocument();
    });

    it('renders error state with retry', () => {
      const mockRetry = jest.fn();
      render(
        <DataLoadingProgress
          isLoading={false}
          error="Failed to load data"
          onRetry={mockRetry}
          retryCount={1}
          maxRetries={3}
        />
      );

      expect(screen.getByText('Loading Failed')).toBeInTheDocument();
      expect(screen.getByText('Failed to load data')).toBeInTheDocument();
      expect(screen.getByText('Retry 2 of 3')).toBeInTheDocument();

      const retryButton = screen.getByText('Try Again');
      fireEvent.click(retryButton);
      expect(mockRetry).toHaveBeenCalled();
    });

    it('hides retry button when max retries reached', () => {
      render(
        <DataLoadingProgress
          isLoading={false}
          error="Failed to load data"
          retryCount={3}
          maxRetries={3}
        />
      );

      expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
    });
  });

  describe('LoadingOverlay', () => {
    it('renders basic loading overlay', () => {
      render(<LoadingOverlay message="Processing..." />);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('renders with progress steps', () => {
      const steps = [
        { id: '1', title: 'Step 1', status: 'completed' as const },
        { id: '2', title: 'Step 2', status: 'in-progress' as const },
        { id: '3', title: 'Step 3', status: 'pending' as const },
      ];

      render(<LoadingOverlay progress={steps} currentStep="2" />);

      expect(screen.getByText('Step 1')).toBeInTheDocument();
      expect(screen.getByText('Step 2')).toBeInTheDocument();
      expect(screen.getByText('Step 3')).toBeInTheDocument();
    });

    it('shows cancel button when enabled', () => {
      const mockCancel = jest.fn();
      render(
        <LoadingOverlay
          message="Processing..."
          canCancel={true}
          onCancel={mockCancel}
        />
      );

      const cancelButton = screen.getByText('Cancel');
      fireEvent.click(cancelButton);
      expect(mockCancel).toHaveBeenCalled();
    });
  });
});

describe('Enhanced Skeleton Components', () => {
  describe('ProjectListSkeleton', () => {
    it('renders default number of skeleton cards', () => {
      render(<ProjectListSkeleton />);

      const skeletons = document.querySelectorAll(
        '[data-testid="project-card-skeleton"]'
      );
      expect(skeletons).toHaveLength(6);
    });

    it('renders custom number of skeleton cards', () => {
      render(<ProjectListSkeleton count={3} />);

      const skeletons = document.querySelectorAll(
        '[data-testid="project-card-skeleton"]'
      );
      expect(skeletons).toHaveLength(3);
    });
  });

  describe('EnhancedFormSkeleton', () => {
    it('renders form skeleton with default fields', () => {
      render(<EnhancedFormSkeleton />);

      const fieldSkeletons = document.querySelectorAll('.space-y-2');
      expect(fieldSkeletons.length).toBeGreaterThan(0);
    });

    it('shows progress bar when enabled', () => {
      render(<EnhancedFormSkeleton showProgress={true} />);

      const progressSkeleton = document.querySelector('.h-2.w-full');
      expect(progressSkeleton).toBeInTheDocument();
    });

    it('hides buttons when disabled', () => {
      render(<EnhancedFormSkeleton showButtons={false} />);

      const buttonContainer = document.querySelector(
        '.flex.justify-end.space-x-2'
      );
      expect(buttonContainer).not.toBeInTheDocument();
    });
  });

  describe('BulkOperationsSkeleton', () => {
    it('renders bulk operations skeleton structure', () => {
      render(<BulkOperationsSkeleton />);

      const headerSkeleton = document.querySelector(
        '.flex.items-center.justify-between'
      );
      expect(headerSkeleton).toBeInTheDocument();

      const itemSkeletons = document.querySelectorAll(
        '.flex.items-center.space-x-3.p-3'
      );
      expect(itemSkeletons).toHaveLength(5);
    });
  });

  describe('ExportProgressSkeleton', () => {
    it('renders export progress skeleton structure', () => {
      render(<ExportProgressSkeleton />);

      const progressSkeleton = document.querySelector('.h-2.w-full');
      expect(progressSkeleton).toBeInTheDocument();

      const stepSkeletons = document.querySelectorAll(
        '.flex.items-center.space-x-3'
      );
      expect(stepSkeletons).toHaveLength(4);
    });
  });
});

describe('Loading State Hooks', () => {
  describe('useLoadingState', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() => useLoadingState());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.progress).toBe(0);
      expect(result.current.error).toBeUndefined();
    });

    it('starts loading correctly', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        result.current.startLoading({ showProgress: true });
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.progress).toBe(0);
    });

    it('updates progress manually', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        result.current.startLoading({ showProgress: true });
      });

      act(() => {
        result.current.updateProgress(50, 'Halfway done');
      });

      expect(result.current.progress).toBe(50);
      expect(result.current.currentStep).toBe('Halfway done');
    });

    it('completes loading', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        result.current.startLoading({ showProgress: true });
      });

      act(() => {
        result.current.completeLoading();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.progress).toBe(100);
    });

    it('handles errors', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        result.current.startLoading();
      });

      act(() => {
        result.current.setError('Something went wrong');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Something went wrong');
    });
  });

  describe('useFormSubmissionState', () => {
    it('submits form successfully', async () => {
      const mockSubmit = jest.fn().mockResolvedValue({ id: 1, name: 'Test' });
      const mockOnSuccess = jest.fn();

      const { result } = renderHook(() => useFormSubmissionState());

      await act(async () => {
        await result.current.submitForm(mockSubmit, {
          onSuccess: mockOnSuccess,
        });
      });

      expect(mockSubmit).toHaveBeenCalled();
      expect(mockOnSuccess).toHaveBeenCalledWith({ id: 1, name: 'Test' });
    });

    it('handles form submission errors', async () => {
      const mockSubmit = jest
        .fn()
        .mockRejectedValue(new Error('Validation failed'));
      const mockOnError = jest.fn();

      const { result } = renderHook(() => useFormSubmissionState());

      await act(async () => {
        try {
          await result.current.submitForm(mockSubmit, {
            onError: mockOnError,
          });
        } catch (error) {
          // Expected to throw
        }
      });

      expect(mockOnError).toHaveBeenCalledWith('Validation failed');
      expect(result.current.error).toBe('Validation failed');
    });
  });

  describe('useBulkOperationState', () => {
    it('processes bulk operations', async () => {
      const items = ['item1', 'item2', 'item3'];
      const mockOperation = jest
        .fn()
        .mockImplementation((item) => Promise.resolve(`processed-${item}`));
      const mockOnComplete = jest.fn();

      const { result } = renderHook(() => useBulkOperationState());

      act(() => {
        result.current.startBulkOperation(items, mockOperation, {
          onComplete: mockOnComplete,
        });
      });

      // Wait for async operations to complete
      await waitFor(() => {
        expect(result.current.isRunning).toBe(false);
      });

      expect(mockOperation).toHaveBeenCalledTimes(3);
      expect(mockOnComplete).toHaveBeenCalledWith([
        'processed-item1',
        'processed-item2',
        'processed-item3',
      ]);
    });

    it('handles bulk operation errors', async () => {
      const items = ['item1', 'item2'];
      const mockOperation = jest
        .fn()
        .mockResolvedValueOnce('success')
        .mockRejectedValueOnce(new Error('Failed'));
      const mockOnError = jest.fn();

      const { result } = renderHook(() => useBulkOperationState());

      act(() => {
        result.current.startBulkOperation(items, mockOperation, {
          onError: mockOnError,
        });
      });

      await waitFor(() => {
        expect(result.current.isRunning).toBe(false);
      });

      expect(result.current.errors).toBe(1);
      expect(mockOnError).toHaveBeenCalledWith('Failed', 'item2');
    });

    it('cancels bulk operation', () => {
      const { result } = renderHook(() => useBulkOperationState());

      act(() => {
        result.current.startBulkOperation(['item1'], jest.fn());
      });

      act(() => {
        result.current.cancelOperation();
      });

      expect(result.current.isRunning).toBe(false);
    });
  });
});

// Cleanup after tests
afterEach(() => {
  jest.clearAllTimers();
});

afterAll(() => {
  jest.useRealTimers();
});
