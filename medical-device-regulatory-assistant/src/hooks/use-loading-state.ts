/**
 * Enhanced loading state management hook
 * Provides comprehensive loading state management with progress tracking
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface LoadingState {
  isLoading: boolean;
  progress?: number;
  currentStep?: string;
  error?: string;
  startTime?: number;
  estimatedTimeRemaining?: string;
}

export interface LoadingOptions {
  showProgress?: boolean;
  estimatedDuration?: number; // in milliseconds
  steps?: string[];
  onProgress?: (progress: number, step?: string) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

export function useLoadingState(initialState: Partial<LoadingState> = {}) {
  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    progress: 0,
    currentStep: undefined,
    error: undefined,
    startTime: undefined,
    estimatedTimeRemaining: undefined,
    ...initialState,
  });

  const progressInterval = useRef<NodeJS.Timeout>();
  const optionsRef = useRef<LoadingOptions>();

  // Start loading with optional configuration
  const startLoading = useCallback((options: LoadingOptions = {}) => {
    optionsRef.current = options;

    setState({
      isLoading: true,
      progress: options.showProgress ? 0 : undefined,
      currentStep: options.steps?.[0],
      error: undefined,
      startTime: Date.now(),
      estimatedTimeRemaining: undefined,
    });

    // Auto-progress simulation if estimated duration is provided
    if (options.estimatedDuration && options.showProgress) {
      const startTime = Date.now();
      const updateInterval = Math.max(100, options.estimatedDuration / 100); // Update every 1% of duration

      progressInterval.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(
          (elapsed / options.estimatedDuration!) * 100,
          95
        ); // Cap at 95% until manually completed
        const remaining = Math.max(0, options.estimatedDuration! - elapsed);

        setState((prev) => ({
          ...prev,
          progress,
          estimatedTimeRemaining:
            remaining > 0 ? formatTimeRemaining(remaining) : undefined,
        }));

        options.onProgress?.(progress);

        // Auto-advance steps based on progress
        if (options.steps && options.steps.length > 0) {
          const stepIndex = Math.floor((progress / 100) * options.steps.length);
          const currentStep =
            options.steps[Math.min(stepIndex, options.steps.length - 1)];

          setState((prev) => ({
            ...prev,
            currentStep,
          }));
        }
      }, updateInterval);
    }
  }, []);

  // Update progress manually
  const updateProgress = useCallback((progress: number, step?: string) => {
    setState((prev) => ({
      ...prev,
      progress,
      currentStep: step || prev.currentStep,
    }));

    optionsRef.current?.onProgress?.(progress, step);
  }, []);

  // Update current step
  const updateStep = useCallback((step: string) => {
    setState((prev) => ({
      ...prev,
      currentStep: step,
    }));
  }, []);

  // Complete loading
  const completeLoading = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }

    setState((prev) => ({
      ...prev,
      isLoading: false,
      progress: optionsRef.current?.showProgress ? 100 : undefined,
      estimatedTimeRemaining: undefined,
    }));

    optionsRef.current?.onComplete?.();
  }, []);

  // Set error state
  const setError = useCallback((error: string) => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }

    setState((prev) => ({
      ...prev,
      isLoading: false,
      error,
      estimatedTimeRemaining: undefined,
    }));

    optionsRef.current?.onError?.(error);
  }, []);

  // Reset state
  const reset = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
    }

    setState({
      isLoading: false,
      progress: 0,
      currentStep: undefined,
      error: undefined,
      startTime: undefined,
      estimatedTimeRemaining: undefined,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }, []);

  return {
    ...state,
    startLoading,
    updateProgress,
    updateStep,
    completeLoading,
    setError,
    reset,
  };
}

// Specialized hook for form submissions
export function useFormSubmissionState() {
  const loadingState = useLoadingState();

  const submitForm = useCallback(
    async <T>(
      submitFn: () => Promise<T>,
      options: {
        steps?: string[];
        onSuccess?: (result: T) => void;
        onError?: (error: string) => void;
      } = {}
    ) => {
      const defaultSteps = [
        'Validating data',
        'Saving changes',
        'Updating interface',
      ];
      const steps = options.steps || defaultSteps;

      loadingState.startLoading({
        showProgress: true,
        estimatedDuration: 3000, // 3 seconds estimated
        steps,
      });

      try {
        // Simulate validation step
        loadingState.updateStep(steps[0]);
        await new Promise((resolve) => setTimeout(resolve, 500));
        loadingState.updateProgress(33);

        // Execute the actual submission
        loadingState.updateStep(steps[1]);
        const result = await submitFn();
        loadingState.updateProgress(66);

        // Finalize
        loadingState.updateStep(steps[2]);
        await new Promise((resolve) => setTimeout(resolve, 300));
        loadingState.updateProgress(100);

        loadingState.completeLoading();
        options.onSuccess?.(result);

        return result;
      } catch (error: any) {
        const errorMessage =
          error.message || 'An error occurred during submission';
        loadingState.setError(errorMessage);
        options.onError?.(errorMessage);
        throw error;
      }
    },
    [loadingState]
  );

  return {
    ...loadingState,
    submitForm,
  };
}

// Specialized hook for bulk operations
export function useBulkOperationState() {
  const [state, setState] = useState({
    isRunning: false,
    totalItems: 0,
    processedItems: 0,
    currentItem: '',
    errors: 0,
    results: [] as any[],
  });

  const startBulkOperation = useCallback(
    <T>(
      items: T[],
      operation: (item: T, index: number) => Promise<any>,
      options: {
        onProgress?: (processed: number, total: number, current: T) => void;
        onComplete?: (results: any[]) => void;
        onError?: (error: string, item: T) => void;
        batchSize?: number;
      } = {}
    ) => {
      setState({
        isRunning: true,
        totalItems: items.length,
        processedItems: 0,
        currentItem: '',
        errors: 0,
        results: [],
      });

      const { batchSize = 1 } = options;
      const results: any[] = [];
      let processed = 0;
      let errors = 0;

      const processBatch = async (batch: T[], startIndex: number) => {
        const batchPromises = batch.map(async (item, batchIndex) => {
          const itemIndex = startIndex + batchIndex;

          setState((prev) => ({
            ...prev,
            currentItem:
              typeof item === 'string' ? item : `Item ${itemIndex + 1}`,
          }));

          try {
            const result = await operation(item, itemIndex);
            results[itemIndex] = result;
            processed++;

            setState((prev) => ({
              ...prev,
              processedItems: processed,
              results: [...results],
            }));

            options.onProgress?.(processed, items.length, item);
            return result;
          } catch (error: any) {
            errors++;
            setState((prev) => ({
              ...prev,
              processedItems: processed,
              errors,
            }));

            options.onError?.(error.message, item);
            return null;
          }
        });

        await Promise.all(batchPromises);
      };

      // Process items in batches
      const processBatches = async () => {
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);
          await processBatch(batch, i);
        }

        setState((prev) => ({
          ...prev,
          isRunning: false,
          currentItem: '',
        }));

        options.onComplete?.(results);
      };

      processBatches();
    },
    []
  );

  const cancelOperation = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isRunning: false,
      currentItem: '',
    }));
  }, []);

  return {
    ...state,
    startBulkOperation,
    cancelOperation,
  };
}

// Utility function to format time remaining
function formatTimeRemaining(milliseconds: number): string {
  const seconds = Math.ceil(milliseconds / 1000);

  if (seconds < 60) {
    return `${seconds}s`;
  } if (seconds < 3600) {
    const minutes = Math.ceil(seconds / 60);
    return `${minutes}m`;
  } 
    const hours = Math.ceil(seconds / 3600);
    return `${hours}h`;
  
}
