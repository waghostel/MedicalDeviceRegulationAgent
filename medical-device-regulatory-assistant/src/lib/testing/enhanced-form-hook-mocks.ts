/**
 * Enhanced Form Hook Mock Chain for Testing
 * Provides comprehensive mocks for useEnhancedForm, useFormToast, useAutoSave, and useRealTimeValidation
 * Matches actual implementations with complete react-hook-form compatibility
 */

import React from 'react';
import {
  UseFormReturn,
  FieldValues,
  UseFormProps,
  FieldError,
  FieldState,
  FormState,
  UseFormRegister,
  UseFormHandleSubmit,
  Control,
} from 'react-hook-form';
import { z } from 'zod';

// ============================================================================
// useAutoSave Mock
// ============================================================================

export interface UseAutoSaveOptions {
  delay?: number;
  onSave: (content: string) => Promise<void> | void;
  enabled?: boolean;
}

export interface UseAutoSaveReturn {
  saveNow: () => Promise<void>;
  isSaving: boolean;
}

let mockAutoSaveState = {
  isSaving: false,
  lastSaved: null as Date | null,
  saveCount: 0,
  errors: [] as Error[],
};

const mockSaveNow = jest.fn(async () => {
  mockAutoSaveState.isSaving = true;

  try {
    // Simulate async save operation
    await new Promise((resolve) => setTimeout(resolve, 100));
    mockAutoSaveState.saveCount++;
    mockAutoSaveState.lastSaved = new Date();
  } catch (error) {
    mockAutoSaveState.errors.push(error as Error);
    throw error;
  } finally {
    mockAutoSaveState.isSaving = false;
  }
});

export const mockUseAutoSave = jest.fn(
  (content: string, options: UseAutoSaveOptions): UseAutoSaveReturn => {
    const { delay = 2000, onSave, enabled = true } = options;

    // Simulate auto-save behavior
    React.useEffect(() => {
      if (!enabled || !content) return;

      const timeoutId = setTimeout(async () => {
        if (content && content !== '""' && content !== 'null') {
          try {
            mockAutoSaveState.isSaving = true;
            await onSave(content);
            mockAutoSaveState.saveCount++;
            mockAutoSaveState.lastSaved = new Date();
          } catch (error) {
            mockAutoSaveState.errors.push(error as Error);
          } finally {
            mockAutoSaveState.isSaving = false;
          }
        }
      }, delay);

      return () => clearTimeout(timeoutId);
    }, [content, delay, onSave, enabled]);

    return {
      saveNow: mockSaveNow,
      isSaving: mockAutoSaveState.isSaving,
    };
  }
);

// ============================================================================
// useRealTimeValidation Mock
// ============================================================================

export interface ValidationState {
  isValid: boolean;
  isValidating: boolean;
  hasBeenTouched: boolean;
  message?: string;
}

export interface UseRealTimeValidationReturn {
  validateField: (
    fieldName: string,
    value: any,
    immediate?: boolean
  ) => Promise<void>;
  getFieldValidation: (fieldName: string) => ValidationState;
  validateAllFields: (formData: Record<string, unknown>) => Promise<void>;
  clearValidation: (fieldName?: string) => void;
  validationState: Record<string, ValidationState>;
}

let mockValidationState: Record<string, ValidationState> = {};

const mockValidateField = jest.fn(
  async (fieldName: string, value: any, immediate = false) => {
    // Mark as validating
    mockValidationState[fieldName] = {
      ...mockValidationState[fieldName],
      isValidating: !immediate,
      hasBeenTouched: true,
    };

    // Simulate validation delay
    if (!immediate) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Simple validation logic for testing
    let isValid = true;
    let message: string | undefined;

    if (!value || (typeof value === 'string' && value.trim() === '')) {
      isValid = false;
      message = `${fieldName} is required`;
    } else if (typeof value === 'string' && value.length < 3) {
      isValid = false;
      message = `${fieldName} must be at least 3 characters`;
    }

    mockValidationState[fieldName] = {
      isValid,
      isValidating: false,
      hasBeenTouched: true,
      message,
    };
  }
);

const mockGetFieldValidation = jest.fn((fieldName: string): ValidationState => (
    mockValidationState[fieldName] || {
      isValid: false,
      isValidating: false,
      hasBeenTouched: false,
      message: undefined,
    }
  ));

const mockValidateAllFields = jest.fn(
  async (formData: Record<string, unknown>) => {
    const promises = Object.entries(formData).map(([fieldName, value]) =>
      mockValidateField(fieldName, value, true)
    );
    await Promise.all(promises);
  }
);

const mockClearValidation = jest.fn((fieldName?: string) => {
  if (fieldName) {
    delete mockValidationState[fieldName];
  } else {
    mockValidationState = {};
  }
});

export const mockUseRealTimeValidation = jest.fn(
  (
    schema: z.ZodSchema,
    debounceMs: number = 300
  ): UseRealTimeValidationReturn => ({
      validateField: mockValidateField,
      getFieldValidation: mockGetFieldValidation,
      validateAllFields: mockValidateAllFields,
      clearValidation: mockClearValidation,
      validationState: mockValidationState,
    })
);

// ============================================================================
// useFormToast Mock
// ============================================================================

export interface FormToastOptions {
  formName?: string;
  fieldName?: string;
  autoFocus?: boolean;
}

export interface UseFormToastReturn {
  showValidationError: (
    field: string,
    message: string,
    options?: FormToastOptions
  ) => void;
  showSubmissionSuccess: (message: string, options?: FormToastOptions) => void;
  showSubmissionError: (error: Error, options?: FormToastOptions) => void;
  showSaveProgress: (
    progress: number,
    options?: FormToastOptions
  ) => {
    updateProgress: (progress: number) => void;
    complete: () => void;
  };
  showAutoSaveSuccess: (options?: FormToastOptions) => void;
  showNetworkError: (onRetry: () => void, options?: FormToastOptions) => void;
  showAuthError: (onSignIn: () => void, options?: FormToastOptions) => void;
  clearFormToasts: () => void;
}

let mockFormToastCalls: Array<{
  method: string;
  args: any[];
  timestamp: number;
}> = [];

const mockShowValidationError = jest.fn(
  (field: string, message: string, options: FormToastOptions = {}) => {
    mockFormToastCalls.push({
      method: 'showValidationError',
      args: [field, message, options],
      timestamp: Date.now(),
    });

    // Simulate focus behavior
    if (options.autoFocus) {
      setTimeout(() => {
        const fieldElement = document.querySelector(
          `[name="${field}"]`
        ) as HTMLElement;
        if (fieldElement && fieldElement.focus) {
          fieldElement.focus();
        }
      }, 100);
    }
  }
);

const mockShowSubmissionSuccess = jest.fn(
  (message: string, options: FormToastOptions = {}) => {
    mockFormToastCalls.push({
      method: 'showSubmissionSuccess',
      args: [message, options],
      timestamp: Date.now(),
    });
  }
);

const mockShowSubmissionError = jest.fn(
  (error: Error, options: FormToastOptions = {}) => {
    mockFormToastCalls.push({
      method: 'showSubmissionError',
      args: [error, options],
      timestamp: Date.now(),
    });
  }
);

const mockShowSaveProgress = jest.fn(
  (progress: number, options: FormToastOptions = {}) => {
    mockFormToastCalls.push({
      method: 'showSaveProgress',
      args: [progress, options],
      timestamp: Date.now(),
    });

    let currentProgress = progress;

    return {
      updateProgress: jest.fn((newProgress: number) => {
        currentProgress = newProgress;
        mockFormToastCalls.push({
          method: 'updateProgress',
          args: [newProgress],
          timestamp: Date.now(),
        });
      }),
      complete: jest.fn(() => {
        mockFormToastCalls.push({
          method: 'complete',
          args: [],
          timestamp: Date.now(),
        });
      }),
    };
  }
);

const mockShowAutoSaveSuccess = jest.fn((options: FormToastOptions = {}) => {
  mockFormToastCalls.push({
    method: 'showAutoSaveSuccess',
    args: [options],
    timestamp: Date.now(),
  });
});

const mockShowNetworkError = jest.fn(
  (onRetry: () => void, options: FormToastOptions = {}) => {
    mockFormToastCalls.push({
      method: 'showNetworkError',
      args: [onRetry, options],
      timestamp: Date.now(),
    });
  }
);

const mockShowAuthError = jest.fn(
  (onSignIn: () => void, options: FormToastOptions = {}) => {
    mockFormToastCalls.push({
      method: 'showAuthError',
      args: [onSignIn, options],
      timestamp: Date.now(),
    });
  }
);

const mockClearFormToasts = jest.fn(() => {
  mockFormToastCalls.push({
    method: 'clearFormToasts',
    args: [],
    timestamp: Date.now(),
  });
});

export const mockUseFormToast = jest.fn((): UseFormToastReturn => ({
    showValidationError: mockShowValidationError,
    showSubmissionSuccess: mockShowSubmissionSuccess,
    showSubmissionError: mockShowSubmissionError,
    showSaveProgress: mockShowSaveProgress,
    showAutoSaveSuccess: mockShowAutoSaveSuccess,
    showNetworkError: mockShowNetworkError,
    showAuthError: mockShowAuthError,
    clearFormToasts: mockClearFormToasts,
  }));

// ============================================================================
// useEnhancedForm Mock
// ============================================================================

export interface EnhancedFormOptions<T extends FieldValues>
  extends UseFormProps<T> {
  schema: z.ZodSchema<T>;
  autoSave?: {
    enabled: boolean;
    interval?: number;
    onSave: (data: T) => Promise<void> | void;
    storageKey?: string;
  };
  realTimeValidation?: {
    enabled: boolean;
    debounceMs?: number;
  };
  accessibility?: {
    announceErrors: boolean;
    focusFirstError: boolean;
  };
  formName?: string;
}

export interface EnhancedFormReturn<T extends FieldValues>
  extends UseFormReturn<T> {
  // Real-time validation
  validateField: (
    fieldName: keyof T,
    value: any,
    immediate?: boolean
  ) => Promise<void>;
  getFieldValidation: (fieldName: keyof T) => ValidationState;

  // Auto-save functionality
  saveNow: () => Promise<void>;
  isSaving: boolean;
  lastSaved?: Date;

  // Enhanced submission
  submitWithFeedback: (onSubmit: (data: T) => Promise<void>) => Promise<void>;

  // Form state helpers
  isDirtyField: (fieldName: keyof T) => boolean;
  getTouchedFields: () => (keyof T)[];

  // Accessibility helpers
  focusFirstError: () => void;
  announceFormState: (message: string) => void;
}

let mockEnhancedFormState = {
  isDirty: false,
  isValid: false,
  isSubmitting: false,
  isSubmitted: false,
  isSubmitSuccessful: false,
  submitCount: 0,
  errors: {} as Record<string, FieldError>,
  touchedFields: {} as Record<string, boolean>,
  dirtyFields: {} as Record<string, boolean>,
  defaultValues: {} as any,
  values: {} as any,
};

// Mock react-hook-form functions
const mockRegister = jest.fn((name: string, options?: any) => ({
  name,
  onChange: jest.fn(),
  onBlur: jest.fn(),
  ref: jest.fn(),
}));

const mockHandleSubmit = jest.fn((onSubmit: (data: any) => void) =>
  jest.fn(async (e?: React.FormEvent) => {
    e?.preventDefault();
    mockEnhancedFormState.isSubmitting = true;

    try {
      await onSubmit(mockEnhancedFormState.values);
      mockEnhancedFormState.isSubmitSuccessful = true;
    } catch (error) {
      mockEnhancedFormState.isSubmitSuccessful = false;
      throw error;
    } finally {
      mockEnhancedFormState.isSubmitting = false;
      mockEnhancedFormState.isSubmitted = true;
      mockEnhancedFormState.submitCount++;
    }
  })
);

const mockGetValues = jest.fn((fieldName?: string) => {
  if (fieldName) {
    return mockEnhancedFormState.values[fieldName];
  }
  return mockEnhancedFormState.values;
});

const mockSetValue = jest.fn((name: string, value: any, options?: any) => {
  mockEnhancedFormState.values[name] = value;
  mockEnhancedFormState.dirtyFields[name] = true;
  mockEnhancedFormState.isDirty = true;
});

const mockGetFieldState = jest.fn(
  (name: string): FieldState => ({
    invalid: !!mockEnhancedFormState.errors[name],
    isTouched: !!mockEnhancedFormState.touchedFields[name],
    isDirty: !!mockEnhancedFormState.dirtyFields[name],
    error: mockEnhancedFormState.errors[name],
  })
);

const mockTrigger = jest.fn(async (name?: string | string[]) => {
  // Simulate validation
  await new Promise((resolve) => setTimeout(resolve, 50));
  return Object.keys(mockEnhancedFormState.errors).length === 0;
});

const mockReset = jest.fn((values?: any) => {
  mockEnhancedFormState = {
    isDirty: false,
    isValid: false,
    isSubmitting: false,
    isSubmitted: false,
    isSubmitSuccessful: false,
    submitCount: 0,
    errors: {},
    touchedFields: {},
    dirtyFields: {},
    defaultValues: values || {},
    values: values || {},
  };
});

const mockWatch = jest.fn((name?: string | string[]) => {
  if (typeof name === 'string') {
    return mockEnhancedFormState.values[name];
  }
  if (Array.isArray(name)) {
    return name.map((n) => mockEnhancedFormState.values[n]);
  }
  return mockEnhancedFormState.values;
});

const mockControl: Control = {
  register: mockRegister,
  unregister: jest.fn(),
  getFieldState: mockGetFieldState,
  handleSubmit: mockHandleSubmit,
  setError: jest.fn(),
  clearErrors: jest.fn(),
  setValue: mockSetValue,
  getValues: mockGetValues,
  reset: mockReset,
  resetField: jest.fn(),
  trigger: mockTrigger,
  formState: mockEnhancedFormState as FormState<any>,
  watch: mockWatch,
  _subjects: {} as any,
  _proxyFormState: {} as any,
  _formState: mockEnhancedFormState as any,
  _reset: jest.fn(),
  _executeSchema: jest.fn(),
  _getWatch: jest.fn(),
  _getDirty: jest.fn(),
  _updateValid: jest.fn(),
  _removeUnmounted: jest.fn(),
  _names: {} as any,
  _state: {} as any,
  _defaultValues: {} as any,
  _stateFlags: {} as any,
  _updateFormState: jest.fn(),
  _subjects: {} as any,
  _options: {} as any,
  _formValues: {} as any,
};

// Enhanced form specific functions
const mockEnhancedValidateField = jest.fn(
  async (fieldName: string, value: any, immediate = false) => 
    // Mock validation logic - return success by default
     ({ isValid: true, errors: [] })
  
);

const mockEnhancedGetFieldValidation = jest.fn((fieldName: string) => 
  // Mock field validation - return no errors by default
   ({ errors: [], isValid: true })
);

const mockSubmitWithFeedback = jest.fn(
  async (onSubmit: (data: any) => Promise<void>) => {
    const formToast = mockUseFormToast();

    try {
      // Validate form
      const isValid = await mockTrigger();

      if (!isValid) {
        const errors = Object.keys(mockEnhancedFormState.errors);
        if (errors.length > 0) {
          formToast.showValidationError(
            errors[0],
            `Please fix ${errors.length} validation error${errors.length > 1 ? 's' : ''}`
          );
        }
        return;
      }

      // Submit form
      await onSubmit(mockEnhancedFormState.values);
      formToast.showSubmissionSuccess('Form submitted successfully');
    } catch (error) {
      formToast.showSubmissionError(error as Error);
      throw error;
    }
  }
);

const mockIsDirtyField = jest.fn((fieldName: string) => !!mockEnhancedFormState.dirtyFields[fieldName]);

const mockGetTouchedFields = jest.fn(() => Object.keys(mockEnhancedFormState.touchedFields));

const mockFocusFirstError = jest.fn(() => {
  const firstErrorField = Object.keys(mockEnhancedFormState.errors)[0];
  if (firstErrorField) {
    const element = document.querySelector(
      `[name="${firstErrorField}"]`
    ) as HTMLElement;
    if (element && element.focus) {
      element.focus();
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
});

const mockAnnounceFormState = jest.fn((message: string) => {
  // Create a live region announcement
  const announcement = document.createElement('div');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement
  setTimeout(() => {
    if (document.body.contains(announcement)) {
      document.body.removeChild(announcement);
    }
  }, 1000);
});

export const mockUseEnhancedForm = jest.fn(
  <T extends FieldValues>(
    options: EnhancedFormOptions<T>
  ): EnhancedFormReturn<T> => {
    const {
      schema,
      autoSave,
      realTimeValidation = { enabled: true, debounceMs: 300 },
      accessibility = { announceErrors: true, focusFirstError: true },
      formName,
      defaultValues,
      ...formOptions
    } = options;

    // Initialize form state with default values
    if (defaultValues) {
      mockEnhancedFormState.values = { ...defaultValues };
      mockEnhancedFormState.defaultValues = { ...defaultValues };
    }

    // Setup auto-save if enabled
    const autoSaveHook = autoSave?.enabled
      ? mockUseAutoSave(JSON.stringify(mockEnhancedFormState.values), {
          delay: autoSave.interval || 2000,
          enabled: autoSave.enabled,
          onSave: async (content: string) => {
            if (autoSave.onSave) {
              const data = JSON.parse(content) as T;
              await autoSave.onSave(data);
              mockAutoSaveState.lastSaved = new Date();
              const formToast = mockUseFormToast();
              formToast.showAutoSaveSuccess({ formName });
            }
          },
        })
      : { saveNow: jest.fn(), isSaving: false };

    // Setup real-time validation
    const validationHook = mockUseRealTimeValidation(
      schema,
      realTimeValidation.debounceMs
    );

    return {
      // Standard react-hook-form methods
      register: mockRegister as UseFormRegister<T>,
      handleSubmit: mockHandleSubmit as UseFormHandleSubmit<T>,
      watch: mockWatch,
      getValues: mockGetValues,
      setValue: mockSetValue,
      getFieldState: mockGetFieldState,
      trigger: mockTrigger,
      reset: mockReset,
      resetField: jest.fn(),
      setError: jest.fn(),
      clearErrors: jest.fn(),
      unregister: jest.fn(),
      control: mockControl as Control<T>,
      formState: mockEnhancedFormState as FormState<T>,

      // Enhanced form methods
      validateField: mockEnhancedValidateField as (
        fieldName: keyof T,
        value: any,
        immediate?: boolean
      ) => Promise<void>,
      getFieldValidation: mockEnhancedGetFieldValidation as (
        fieldName: keyof T
      ) => ValidationState,
      saveNow: autoSaveHook.saveNow,
      isSaving: autoSaveHook.isSaving,
      lastSaved: mockAutoSaveState.lastSaved || undefined,
      submitWithFeedback: mockSubmitWithFeedback,
      isDirtyField: mockIsDirtyField as (fieldName: keyof T) => boolean,
      getTouchedFields: mockGetTouchedFields as () => (keyof T)[],
      focusFirstError: mockFocusFirstError,
      announceFormState: mockAnnounceFormState,
    };
  }
);

// ============================================================================
// Test Utilities
// ============================================================================

export const enhancedFormMockUtils = {
  // Auto-save utilities
  getAutoSaveState: () => ({ ...mockAutoSaveState }),
  setAutoSaveState: (state: Partial<typeof mockAutoSaveState>) => {
    mockAutoSaveState = { ...mockAutoSaveState, ...state };
  },
  clearAutoSaveState: () => {
    mockAutoSaveState = {
      isSaving: false,
      lastSaved: null,
      saveCount: 0,
      errors: [],
    };
  },

  // Validation utilities
  getValidationState: () => ({ ...mockValidationState }),
  setValidationState: (state: Record<string, ValidationState>) => {
    mockValidationState = { ...state };
  },
  clearValidationState: () => {
    mockValidationState = {};
  },

  // Form toast utilities
  getFormToastCalls: () => [...mockFormToastCalls],
  clearFormToastCalls: () => {
    mockFormToastCalls = [];
  },
  getLastFormToastCall: () => mockFormToastCalls[mockFormToastCalls.length - 1],

  // Enhanced form utilities
  getFormState: () => ({ ...mockEnhancedFormState }),
  setFormState: (state: Partial<typeof mockEnhancedFormState>) => {
    mockEnhancedFormState = { ...mockEnhancedFormState, ...state };
  },
  clearFormState: () => {
    mockEnhancedFormState = {
      isDirty: false,
      isValid: false,
      isSubmitting: false,
      isSubmitted: false,
      isSubmitSuccessful: false,
      submitCount: 0,
      errors: {},
      touchedFields: {},
      dirtyFields: {},
      defaultValues: {},
      values: {},
    };
  },

  // Reset all mocks
  resetAllMocks: () => {
    // Clear states
    mockAutoSaveState = {
      isSaving: false,
      lastSaved: null,
      saveCount: 0,
      errors: [],
    };
    mockValidationState = {};
    mockFormToastCalls = [];
    mockEnhancedFormState = {
      isDirty: false,
      isValid: false,
      isSubmitting: false,
      isSubmitted: false,
      isSubmitSuccessful: false,
      submitCount: 0,
      errors: {},
      touchedFields: {},
      dirtyFields: {},
      defaultValues: {},
      values: {},
    };

    // Clear jest mocks
    jest.clearAllMocks();

    // Reset specific mocks
    mockUseAutoSave.mockClear();
    mockUseRealTimeValidation.mockClear();
    mockUseFormToast.mockClear();
    mockUseEnhancedForm.mockClear();
    mockSaveNow.mockClear();
    mockValidateField.mockClear();
    mockGetFieldValidation.mockClear();
    mockEnhancedValidateField.mockClear();
    mockEnhancedGetFieldValidation.mockClear();
    mockValidateAllFields.mockClear();
    mockClearValidation.mockClear();
    mockShowValidationError.mockClear();
    mockShowSubmissionSuccess.mockClear();
    mockShowSubmissionError.mockClear();
    mockShowSaveProgress.mockClear();
    mockShowAutoSaveSuccess.mockClear();
    mockShowNetworkError.mockClear();
    mockShowAuthError.mockClear();
    mockClearFormToasts.mockClear();
    mockRegister.mockClear();
    mockHandleSubmit.mockClear();
    mockGetValues.mockClear();
    mockSetValue.mockClear();
    mockGetFieldState.mockClear();
    mockTrigger.mockClear();
    mockReset.mockClear();
    mockWatch.mockClear();
    mockSubmitWithFeedback.mockClear();
    mockIsDirtyField.mockClear();
    mockGetTouchedFields.mockClear();
    mockFocusFirstError.mockClear();
    mockAnnounceFormState.mockClear();
  },
};

// Export all mocks
export const enhancedFormMocks = {
  useAutoSave: mockUseAutoSave,
  useRealTimeValidation: mockUseRealTimeValidation,
  useFormToast: mockUseFormToast,
  useEnhancedForm: mockUseEnhancedForm,
  utils: enhancedFormMockUtils,
};

export default enhancedFormMocks;
