/**
 * Comprehensive tests for enhanced toast notification system
 */

import { renderHook, act } from '@testing-library/react';
import { useToast, toast, contextualToast } from '../use-toast';

// Mock setTimeout and clearTimeout
jest.useFakeTimers();

describe('Enhanced useToast Hook', () => {
  beforeEach(() => {
    jest.clearAllTimers();
    // Clear any existing toasts by resetting the memory state
    const { result } = renderHook(() => useToast());
    act(() => {
      result.current.clearQueue();
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('Basic Toast Functionality', () => {
    it('should create and display a basic toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        toast({
          title: 'Test Toast',
          description: 'This is a test toast',
        });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].title).toBe('Test Toast');
      expect(result.current.toasts[0].description).toBe('This is a test toast');
    });

    it('should dismiss a toast by ID', () => {
      const { result } = renderHook(() => useToast());

      let toastId: string;
      act(() => {
        const toastResult = toast({
          title: 'Test Toast',
          description: 'This is a test toast',
        });
        toastId = toastResult.id;
      });

      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        result.current.dismiss(toastId);
      });

      // Toast should be marked as closed but still in array
      expect(result.current.toasts[0].open).toBe(false);

      // After timeout, toast should be removed
      act(() => {
        jest.runAllTimers();
      });

      expect(result.current.toasts).toHaveLength(0);
    });

    it('should dismiss all toasts', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        toast({ title: 'Toast 1' });
        toast({ title: 'Toast 2' });
        toast({ title: 'Toast 3' });
      });

      expect(result.current.toasts).toHaveLength(3);

      act(() => {
        result.current.dismissAll();
      });

      // All toasts should be marked as closed
      result.current.toasts.forEach(t => {
        expect(t.open).toBe(false);
      });

      // After timeout, all toasts should be removed
      act(() => {
        jest.runAllTimers();
      });

      expect(result.current.toasts).toHaveLength(0);
    });
  });

  describe('Enhanced Features', () => {
    it('should handle toast variants correctly', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        toast({
          title: 'Success Toast',
          variant: 'success',
        });
        toast({
          title: 'Error Toast',
          variant: 'destructive',
        });
        toast({
          title: 'Warning Toast',
          variant: 'warning',
        });
      });

      expect(result.current.toasts).toHaveLength(3);
      expect(result.current.toasts.find(t => t.title === 'Success Toast')?.variant).toBe('success');
      expect(result.current.toasts.find(t => t.title === 'Error Toast')?.variant).toBe('destructive');
      expect(result.current.toasts.find(t => t.title === 'Warning Toast')?.variant).toBe('warning');
    });

    it('should handle persistent toasts', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        toast({
          title: 'Persistent Toast',
          persistent: true,
        });
      });

      expect(result.current.toasts).toHaveLength(1);

      // Run timers - persistent toast should not be auto-dismissed
      act(() => {
        jest.runAllTimers();
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].open).toBe(true);
    });

    it('should handle progress toasts', () => {
      const { result } = renderHook(() => useToast());

      let toastResult: any;
      act(() => {
        toastResult = toast({
          title: 'Progress Toast',
          variant: 'progress',
          showProgress: true,
          progress: 0,
        });
      });

      expect(result.current.toasts).toHaveLength(1);
      expect(result.current.toasts[0].progress).toBe(0);
      expect(result.current.toasts[0].showProgress).toBe(true);

      // Update progress
      act(() => {
        toastResult.updateProgress(50);
      });

      expect(result.current.toasts[0].progress).toBe(50);

      // Update progress to completion
      act(() => {
        toastResult.updateProgress(100);
      });

      expect(result.current.toasts[0].progress).toBe(100);
    });

    it('should handle retry functionality', () => {
      const { result } = renderHook(() => useToast());
      const mockRetryFn = jest.fn();

      let toastResult: any;
      act(() => {
        toastResult = toast({
          title: 'Retryable Toast',
          onRetry: mockRetryFn,
          maxRetries: 3,
        });
      });

      expect(result.current.toasts).toHaveLength(1);

      // Trigger retry
      act(() => {
        toastResult.retry();
      });

      expect(mockRetryFn).toHaveBeenCalledTimes(1);
      expect(result.current.toasts[0].retryCount).toBe(1);

      // Retry again
      act(() => {
        toastResult.retry();
      });

      expect(mockRetryFn).toHaveBeenCalledTimes(2);
      expect(result.current.toasts[0].retryCount).toBe(2);

      // Retry until max retries
      act(() => {
        toastResult.retry();
      });

      expect(mockRetryFn).toHaveBeenCalledTimes(3);
      expect(result.current.toasts[0].retryCount).toBe(3);

      // Try to retry beyond max - should convert to error
      act(() => {
        toastResult.retry();
      });

      expect(mockRetryFn).toHaveBeenCalledTimes(3); // Should not call retry again
      expect(result.current.toasts[0].variant).toBe('destructive');
      expect(result.current.toasts[0].title).toBe('Max Retries Reached');
      expect(result.current.toasts[0].persistent).toBe(true);
    });
  });

  describe('Queue and Rate Limiting', () => {
    it('should queue toasts when limit is reached', () => {
      const { result } = renderHook(() => useToast());

      // Add toasts up to the limit (5)
      act(() => {
        for (let i = 1; i <= 5; i++) {
          toast({ title: `Toast ${i}` });
        }
      });

      expect(result.current.toasts).toHaveLength(5);
      expect(result.current.queue).toHaveLength(0);

      // Add one more - should be queued
      act(() => {
        toast({ title: 'Queued Toast' });
      });

      expect(result.current.toasts).toHaveLength(5);
      expect(result.current.queue).toHaveLength(1);
      expect(result.current.queue[0].title).toBe('Queued Toast');
    });

    it('should process queue when toasts are dismissed', () => {
      const { result } = renderHook(() => useToast());

      // Fill up the display limit
      act(() => {
        for (let i = 1; i <= 5; i++) {
          toast({ title: `Toast ${i}` });
        }
      });

      // Add queued toast
      act(() => {
        toast({ title: 'Queued Toast' });
      });

      expect(result.current.toasts).toHaveLength(5);
      expect(result.current.queue).toHaveLength(1);

      // Dismiss one toast
      act(() => {
        result.current.dismiss(result.current.toasts[0].id);
      });

      // Run timers to process removal and queue
      act(() => {
        jest.runAllTimers();
      });

      expect(result.current.toasts).toHaveLength(5); // Should have processed queue
      expect(result.current.queue).toHaveLength(0);
      expect(result.current.toasts.some(t => t.title === 'Queued Toast')).toBe(true);
    });

    it('should enforce rate limiting', () => {
      const { result } = renderHook(() => useToast());

      // Add toasts rapidly (more than rate limit)
      act(() => {
        for (let i = 1; i <= 15; i++) {
          toast({ title: `Toast ${i}` });
        }
      });

      // Should have 5 displayed and 10 queued (rate limit of 10 per minute)
      expect(result.current.toasts).toHaveLength(5);
      expect(result.current.queue).toHaveLength(10);
    });
  });

  describe('Contextual Toast Messages', () => {
    it('should create FDA API error toast', () => {
      const { result } = renderHook(() => useToast());
      const mockRetry = jest.fn();

      act(() => {
        contextualToast.fdaApiError(mockRetry);
      });

      expect(result.current.toasts).toHaveLength(1);
      const toast = result.current.toasts[0];
      expect(toast.title).toBe('FDA API Connection Failed');
      expect(toast.variant).toBe('destructive');
      expect(toast.category).toBe('api');
      expect(toast.priority).toBe('high');
      expect(toast.onRetry).toBe(mockRetry);
      expect(toast.actionUrl).toBe('https://open.fda.gov/status/');
    });

    it('should create predicate search failed toast', () => {
      const { result } = renderHook(() => useToast());
      const mockRetry = jest.fn();

      act(() => {
        contextualToast.predicateSearchFailed(mockRetry);
      });

      expect(result.current.toasts).toHaveLength(1);
      const toast = result.current.toasts[0];
      expect(toast.title).toBe('Predicate Search Failed');
      expect(toast.variant).toBe('destructive');
      expect(toast.category).toBe('regulatory');
      expect(toast.priority).toBe('high');
      expect(toast.onRetry).toBe(mockRetry);
    });

    it('should create classification error toast', () => {
      const { result } = renderHook(() => useToast());
      const mockRetry = jest.fn();

      act(() => {
        contextualToast.classificationError(mockRetry);
      });

      expect(result.current.toasts).toHaveLength(1);
      const toast = result.current.toasts[0];
      expect(toast.title).toBe('Device Classification Error');
      expect(toast.variant).toBe('destructive');
      expect(toast.category).toBe('regulatory');
      expect(toast.priority).toBe('high');
      expect(toast.onRetry).toBe(mockRetry);
      expect(toast.actionUrl).toBe('https://www.fda.gov/medical-devices/classify-your-medical-device');
    });

    it('should create project save failed toast', () => {
      const { result } = renderHook(() => useToast());
      const mockRetry = jest.fn();

      act(() => {
        contextualToast.projectSaveFailed(mockRetry);
      });

      expect(result.current.toasts).toHaveLength(1);
      const toast = result.current.toasts[0];
      expect(toast.title).toBe('Project Save Failed');
      expect(toast.variant).toBe('destructive');
      expect(toast.category).toBe('user');
      expect(toast.priority).toBe('critical');
      expect(toast.persistent).toBe(true);
      expect(toast.onRetry).toBe(mockRetry);
    });

    it('should create progress toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        contextualToast.progress('Processing Data', 'Please wait while we process your request...');
      });

      expect(result.current.toasts).toHaveLength(1);
      const toast = result.current.toasts[0];
      expect(toast.title).toBe('Processing Data');
      expect(toast.variant).toBe('progress');
      expect(toast.showProgress).toBe(true);
      expect(toast.progress).toBe(0);
      expect(toast.persistent).toBe(true);
      expect(toast.category).toBe('system');
    });

    it('should create success toast', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        contextualToast.success('Operation Successful', 'Your request has been completed.');
      });

      expect(result.current.toasts).toHaveLength(1);
      const toast = result.current.toasts[0];
      expect(toast.title).toBe('Operation Successful');
      expect(toast.variant).toBe('success');
      expect(toast.category).toBe('user');
      expect(toast.priority).toBe('normal');
    });
  });

  describe('Filtering and Categorization', () => {
    it('should filter toasts by category', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        contextualToast.fdaApiError(); // api category
        contextualToast.predicateSearchFailed(); // regulatory category
        contextualToast.success('Test', 'Test'); // user category
      });

      expect(result.current.toasts).toHaveLength(3);
      expect(result.current.getToastsByCategory('api')).toHaveLength(1);
      expect(result.current.getToastsByCategory('regulatory')).toHaveLength(1);
      expect(result.current.getToastsByCategory('user')).toHaveLength(1);
      expect(result.current.getToastsByCategory('system')).toHaveLength(0);
    });

    it('should filter toasts by priority', () => {
      const { result } = renderHook(() => useToast());

      act(() => {
        contextualToast.fdaApiError(); // high priority
        contextualToast.projectSaveFailed(); // critical priority
        contextualToast.success('Test', 'Test'); // normal priority
        contextualToast.info('Info', 'Info'); // low priority
      });

      expect(result.current.toasts).toHaveLength(4);
      expect(result.current.getToastsByPriority('critical')).toHaveLength(1);
      expect(result.current.getToastsByPriority('high')).toHaveLength(1);
      expect(result.current.getToastsByPriority('normal')).toHaveLength(1);
      expect(result.current.getToastsByPriority('low')).toHaveLength(1);
    });
  });

  describe('Cleanup and Memory Management', () => {
    it('should clear queue', () => {
      const { result } = renderHook(() => useToast());

      // Fill up display and queue
      act(() => {
        for (let i = 1; i <= 10; i++) {
          toast({ title: `Toast ${i}` });
        }
      });

      expect(result.current.toasts).toHaveLength(5);
      expect(result.current.queue).toHaveLength(5);

      act(() => {
        result.current.clearQueue();
      });

      expect(result.current.toasts).toHaveLength(0);
      expect(result.current.queue).toHaveLength(0);
    });

    it('should clean up timeouts when toasts are removed', () => {
      const { result } = renderHook(() => useToast());

      let toastId: string;
      act(() => {
        const toastResult = toast({
          title: 'Test Toast',
          duration: 5000,
        });
        toastId = toastResult.id;
      });

      expect(result.current.toasts).toHaveLength(1);

      // Manually dismiss before timeout
      act(() => {
        result.current.dismiss(toastId);
      });

      // Should not cause any issues when timeout tries to fire
      act(() => {
        jest.runAllTimers();
      });

      expect(result.current.toasts).toHaveLength(0);
    });
  });
});