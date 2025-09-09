/**
 * Enhanced Loading Components Tests - Simplified
 * Tests for the enhanced loading states and progress indicators
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import {
  EnhancedProgressBar,
  FormSubmissionProgress,
  LoadingSpinner,
  InlineLoader,
} from '../ProgressIndicator';
import {
  ProjectListSkeleton,
  EnhancedFormSkeleton,
  BulkOperationsSkeleton,
  ExportProgressSkeleton,
} from '../LoadingSkeleton';
import { useLoadingState } from '@/hooks/use-loading-state';

// Mock timers for testing
jest.useFakeTimers();

describe('Enhanced Loading Components - Basic Tests', () => {
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
  });

  describe('LoadingSpinner', () => {
    it('renders with default message', () => {
      render(<LoadingSpinner />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('renders with custom message', () => {
      render(<LoadingSpinner message="Processing..." />);

      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });
  });

  describe('InlineLoader', () => {
    it('renders with default text', () => {
      render(<InlineLoader />);

      expect(screen.getByText('Loading')).toBeInTheDocument();
    });

    it('renders with custom text', () => {
      render(<InlineLoader text="Saving" />);

      expect(screen.getByText('Saving')).toBeInTheDocument();
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

    it('resets state', () => {
      const { result } = renderHook(() => useLoadingState());

      act(() => {
        result.current.startLoading();
      });

      act(() => {
        result.current.setError('Error');
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeUndefined();
      expect(result.current.progress).toBe(0);
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
