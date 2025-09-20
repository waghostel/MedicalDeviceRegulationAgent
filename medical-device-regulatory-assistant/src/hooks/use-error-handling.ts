/**
 * React hook for comprehensive error handling in the Medical Device Regulatory Assistant
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { APIError } from '@/types/error';
import { errorReporting, trackAction } from '@/lib/services/error-reporting';

interface ErrorState {
  error: APIError | null;
  isRetrying: boolean;
  retryCount: number;
  lastRetryAt?: Date;
}

interface UseErrorHandlingOptions {
  maxRetries?: number;
  retryDelay?: number;
  showToast?: boolean;
  reportError?: boolean;
  context?: string;
  onError?: (error: APIError) => void;
  onRetry?: (retryCount: number) => void;
  onMaxRetriesReached?: (error: APIError) => void;
}

interface UseErrorHandlingReturn {
  error: APIError | null;
  isRetrying: boolean;
  retryCount: number;
  handleError: (error: any, context?: string) => void;
  retry: () => Promise<void>;
  clearError: () => void;
  canRetry: boolean;
}

/**
 * Hook for handling errors with automatic retry, reporting, and user feedback
 */
export function useErrorHandling(
  operation?: () => Promise<any>,
  options: UseErrorHandlingOptions = {}
): UseErrorHandlingReturn {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    showToast = true,
    reportError = true,
    context = 'operation',
    onError,
    onRetry,
    onMaxRetriesReached,
  } = options;

  const [errorState, setErrorState] = useState<ErrorState>({
    error: null,
    isRetrying: false,
    retryCount: 0,
  });

  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const operationRef = useRef(operation);

  // Update operation ref when it changes
  useEffect(() => {
    operationRef.current = operation;
  }, [operation]);

  const handleError = useCallback(
    (error: any, errorContext?: string) => {
      const apiError =
        error instanceof APIError
          ? error
          : APIError.fromError(error, {
              type: 'server',
              code: 'OPERATION_ERROR',
            });

      setErrorState((prev) => ({
        ...prev,
        error: apiError,
        isRetrying: false,
      }));

      // Track error
      trackAction(`Error: ${errorContext || context}`, {
        errorType: apiError.type,
        errorCode: apiError.code,
        retryable: apiError.retryable,
      });

      // Report error
      if (reportError) {
        errorReporting.reportError(apiError, {
          context: errorContext || context,
          retryCount: errorState.retryCount,
        });
      }

      // Show toast notification
      if (showToast) {
        toast({
          title: 'Error',
          description: apiError.userMessage,
          variant: 'destructive',
        });
      }

      // Call custom error handler
      onError?.(apiError);
    },
    [context, reportError, showToast, onError, errorState.retryCount]
  );

  const retry = useCallback(async () => {
    if (!operationRef.current || !errorState.error || errorState.isRetrying) {
      return;
    }

    const newRetryCount = errorState.retryCount + 1;

    // Check if max retries reached
    if (newRetryCount > maxRetries) {
      onMaxRetriesReached?.(errorState.error);
      toast({
        title: 'Max Retries Reached',
        description:
          'The operation failed after multiple attempts. Please try again later.',
        variant: 'destructive',
      });
      return;
    }

    setErrorState((prev) => ({
      ...prev,
      isRetrying: true,
      retryCount: newRetryCount,
      lastRetryAt: new Date(),
    }));

    // Track retry attempt
    trackAction(`Retry: ${context}`, {
      retryCount: newRetryCount,
      maxRetries,
    });

    // Call custom retry handler
    onRetry?.(newRetryCount);

    try {
      // Add delay before retry
      if (retryDelay > 0) {
        await new Promise((resolve) => {
          retryTimeoutRef.current = setTimeout(
            resolve,
            retryDelay * newRetryCount
          );
        });
      }

      // Execute the operation
      await operationRef.current();

      // Success - clear error state
      setErrorState({
        error: null,
        isRetrying: false,
        retryCount: 0,
      });

      toast({
        title: 'Success',
        description: 'Operation completed successfully.',
      });
    } catch (error) {
      // Retry failed - handle the new error
      handleError(error, `${context} (retry ${newRetryCount})`);
    }
  }, [
    errorState.error,
    errorState.isRetrying,
    errorState.retryCount,
    maxRetries,
    retryDelay,
    context,
    onRetry,
    onMaxRetriesReached,
    handleError,
  ]);

  const clearError = useCallback(() => {
    // Clear any pending retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    setErrorState({
      error: null,
      isRetrying: false,
      retryCount: 0,
    });
  }, []);

  const canRetry =
    errorState.error?.retryable && errorState.retryCount < maxRetries;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    error: errorState.error,
    isRetrying: errorState.isRetrying,
    retryCount: errorState.retryCount,
    handleError,
    retry,
    clearError,
    canRetry,
  };
}

/**
 * Hook for handling async operations with error handling
 */
export function useAsyncOperation<T = any>(
  operation: () => Promise<T>,
  options: UseErrorHandlingOptions = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);

  const errorHandling = useErrorHandling(operation, options);

  const execute = useCallback(async (): Promise<T | null> => {
    setLoading(true);
    errorHandling.clearError();

    try {
      const result = await operation();
      setData(result);
      return result;
    } catch (error) {
      errorHandling.handleError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [operation, errorHandling]);

  const retryOperation = useCallback(async () => {
    if (errorHandling.canRetry) {
      setLoading(true);
      try {
        await errorHandling.retry();
      } finally {
        setLoading(false);
      }
    }
  }, [errorHandling]);

  return {
    data,
    loading: loading || errorHandling.isRetrying,
    error: errorHandling.error,
    retryCount: errorHandling.retryCount,
    execute,
    retry: retryOperation,
    clearError: errorHandling.clearError,
    canRetry: errorHandling.canRetry,
  };
}

/**
 * Hook for handling form submission errors
 */
export function useFormErrorHandling(options: UseErrorHandlingOptions = {}) {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const errorHandling = useErrorHandling(undefined, {
    ...options,
    showToast: false, // Handle form errors differently
  });

  const handleFormError = useCallback(
    (error: any) => {
      const apiError =
        error instanceof APIError ? error : APIError.fromError(error);

      // Extract field errors for validation errors
      if (apiError.type === 'validation' && apiError.details?.fieldErrors) {
        setFieldErrors(apiError.details.fieldErrors);
      } else {
        setFieldErrors({});
      }

      errorHandling.handleError(apiError, 'form submission');
    },
    [errorHandling]
  );

  const clearFieldErrors = useCallback(() => {
    setFieldErrors({});
    errorHandling.clearError();
  }, [errorHandling]);

  return {
    error: errorHandling.error,
    fieldErrors,
    handleFormError,
    clearFieldErrors,
    clearError: errorHandling.clearError,
  };
}

/**
 * Hook for handling API call errors with automatic retry
 */
export function useAPIErrorHandling(options: UseErrorHandlingOptions = {}) {
  const errorHandling = useErrorHandling(undefined, options);

  const handleAPIError = useCallback(
    (error: any, endpoint?: string, method?: string) => {
      const apiError =
        error instanceof APIError ? error : APIError.fromError(error);

      // Add API-specific context
      const context = `API ${method || 'call'}${endpoint ? ` to ${endpoint}` : ''}`;

      errorHandling.handleError(apiError, context);
    },
    [errorHandling]
  );

  return {
    ...errorHandling,
    handleAPIError,
  };
}

/**
 * Hook for handling project-specific errors
 */
export function useProjectErrorHandling(
  projectId?: number,
  options: UseErrorHandlingOptions = {}
) {
  const errorHandling = useErrorHandling(undefined, {
    ...options,
    context: `project ${projectId || 'operation'}`,
  });

  const handleProjectError = useCallback(
    (
      error: any,
      operation?: 'create' | 'read' | 'update' | 'delete' | 'export'
    ) => {
      const apiError =
        error instanceof APIError
          ? error
          : APIError.project(operation || 'read', error.message, { projectId });

      errorHandling.handleError(
        apiError,
        `project ${operation || 'operation'}`
      );
    },
    [errorHandling, projectId]
  );

  return {
    ...errorHandling,
    handleProjectError,
  };
}

/**
 * Hook for handling agent-specific errors
 */
export function useAgentErrorHandling(
  agentType?: string,
  options: UseErrorHandlingOptions = {}
) {
  const errorHandling = useErrorHandling(undefined, {
    ...options,
    context: `agent ${agentType || 'operation'}`,
  });

  const handleAgentError = useCallback(
    (error: unknown, step?: string) => {
      const apiError =
        error instanceof APIError
          ? error
          : APIError.agent(error.message, { agentType, step });

      errorHandling.handleError(apiError, `agent ${step || 'operation'}`);
    },
    [errorHandling, agentType]
  );

  return {
    ...errorHandling,
    handleAgentError,
  };
}
