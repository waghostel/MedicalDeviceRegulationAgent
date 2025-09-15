/**
 * Form-specific toast integration hook
 * Provides specialized toast notifications for form interactions
 */

import { useCallback } from 'react';
import { useToast, contextualToast } from './use-toast';

export interface FormToastOptions {
  formName?: string;
  fieldName?: string;
  autoFocus?: boolean;
}

export interface UseFormToastReturn {
  showValidationError: (field: string, message: string, options?: FormToastOptions) => void;
  showSubmissionSuccess: (message: string, options?: FormToastOptions) => void;
  showSubmissionError: (error: Error, options?: FormToastOptions) => void;
  showSaveProgress: (progress: number, options?: FormToastOptions) => { updateProgress: (progress: number) => void; complete: () => void };
  showAutoSaveSuccess: (options?: FormToastOptions) => void;
  showNetworkError: (onRetry: () => void, options?: FormToastOptions) => void;
  showAuthError: (onSignIn: () => void, options?: FormToastOptions) => void;
  clearFormToasts: () => void;
}

export function useFormToast(): UseFormToastReturn {
  const { toast, getToastsByCategory, contextualToast } = useToast();

  const showValidationError = useCallback((
    field: string, 
    message: string, 
    options: FormToastOptions = {}
  ) => {
    const { formName, autoFocus } = options;
    
    // Focus on the field if requested
    if (autoFocus) {
      setTimeout(() => {
        const fieldElement = document.querySelector(`[name="${field}"]`) as HTMLElement;
        if (fieldElement) {
          fieldElement.focus();
        }
      }, 100);
    }

    return contextualToast.validationError(
      formName ? `${formName}: ${message}` : message
    );
  }, [contextualToast]);

  const showSubmissionSuccess = useCallback((
    message: string, 
    options: FormToastOptions = {}
  ) => {
    const { formName } = options;
    
    return contextualToast.success(
      formName ? `${formName} Saved` : 'Form Submitted',
      message
    );
  }, [contextualToast]);

  const showSubmissionError = useCallback((
    error: Error, 
    options: FormToastOptions = {}
  ) => {
    const { formName } = options;
    
    // Determine error type and show appropriate toast
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return contextualToast.networkError();
    } else if (error.message.includes('auth') || error.message.includes('unauthorized')) {
      return contextualToast.authExpired();
    } else if (error.message.includes('validation')) {
      return contextualToast.validationError(error.message);
    } else {
      return toast({
        variant: 'destructive',
        title: formName ? `${formName} Submission Failed` : 'Submission Failed',
        description: error.message || 'An unexpected error occurred. Please try again.',
        category: 'user',
        priority: 'high',
      });
    }
  }, [toast, contextualToast]);

  const showSaveProgress = useCallback((
    initialProgress: number, 
    options: FormToastOptions = {}
  ) => {
    const { formName } = options;
    
    const progressToast = contextualToast.progress(
      formName ? `Saving ${formName}...` : 'Saving...',
      'Please wait while we save your changes.'
    );

    progressToast.updateProgress(initialProgress);

    return {
      updateProgress: (progress: number) => {
        progressToast.updateProgress(progress);
      },
      complete: () => {
        progressToast.updateProgress(100);
        setTimeout(() => {
          progressToast.dismiss();
          showSubmissionSuccess('Changes saved successfully.', options);
        }, 500);
      }
    };
  }, [contextualToast, showSubmissionSuccess]);

  const showAutoSaveSuccess = useCallback((options: FormToastOptions = {}) => {
    const { formName } = options;
    
    return toast({
      variant: 'success',
      title: 'Auto-saved',
      description: formName ? `${formName} changes saved automatically.` : 'Changes saved automatically.',
      duration: 2000, // Shorter duration for auto-save
      category: 'system',
      priority: 'low',
    });
  }, [toast]);

  const showNetworkError = useCallback((
    onRetry: () => void, 
    options: FormToastOptions = {}
  ) => {
    return contextualToast.networkError(onRetry);
  }, [contextualToast]);

  const showAuthError = useCallback((
    onSignIn: () => void, 
    options: FormToastOptions = {}
  ) => {
    return contextualToast.authExpired(onSignIn);
  }, [contextualToast]);

  const clearFormToasts = useCallback(() => {
    // Clear all form-related toasts
    const formToasts = [
      ...getToastsByCategory('user'),
      ...getToastsByCategory('validation')
    ];
    
    formToasts.forEach(toast => {
      // Dismiss each form-related toast
      // Note: This would need to be implemented in the main toast system
    });
  }, [getToastsByCategory]);

  return {
    showValidationError,
    showSubmissionSuccess,
    showSubmissionError,
    showSaveProgress,
    showAutoSaveSuccess,
    showNetworkError,
    showAuthError,
    clearFormToasts,
  };
}