/**
 * Enhanced form hook with real-time validation, auto-save, and accessibility features
 */

import {
  useForm,
  UseFormProps,
  UseFormReturn,
  FieldValues,
  Path,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAutoSave } from './use-auto-save';
import { useFormToast } from './use-form-toast';
import { useRealTimeValidation } from '@/components/forms/FormValidation';

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
  getFieldValidation: (fieldName: keyof T) => {
    isValid: boolean;
    isValidating: boolean;
    hasBeenTouched: boolean;
    message?: string;
  };

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

export function useEnhancedForm<T extends FieldValues>(
  options: EnhancedFormOptions<T>
): EnhancedFormReturn<T> {
  const {
    schema,
    autoSave,
    realTimeValidation = { enabled: true, debounceMs: 300 },
    accessibility = { announceErrors: true, focusFirstError: true },
    formName,
    ...formOptions
  } = options;

  // Initialize react-hook-form with schema resolver
  const form = useForm<T>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    ...formOptions,
  });

  // Real-time validation
  const { validateField, getFieldValidation, validateAllFields } =
    useRealTimeValidation(schema, realTimeValidation.debounceMs);

  // Form toast notifications
  const formToast = useFormToast();

  // Auto-save state
  const [lastSaved, setLastSaved] = useState<Date>();
  const watchedData = form.watch();
  const previousDataRef = useRef<T>();

  // Auto-save functionality
  const { saveNow, isSaving } = useAutoSave(JSON.stringify(watchedData), {
    delay: autoSave?.interval || 2000,
    enabled: autoSave?.enabled || false,
    onSave: async (content: string) => {
      if (autoSave?.onSave) {
        const data = JSON.parse(content) as T;
        await autoSave.onSave(data);
        setLastSaved(new Date());
        formToast.showAutoSaveSuccess({ formName });
      }
    },
  });

  // Real-time validation on field changes
  useEffect(() => {
    if (!realTimeValidation.enabled) return;

    const subscription = form.watch((data, { name }) => {
      if (name && data[name] !== undefined) {
        validateField(name as keyof T, data[name]);
      }
    });

    return () => subscription.unsubscribe();
  }, [form, validateField, realTimeValidation.enabled]);

  // Enhanced field validation function
  const enhancedValidateField = useCallback(
    async (fieldName: keyof T, value: any, immediate = false) => {
      await validateField(fieldName as string, value, immediate);
    },
    [validateField]
  );

  // Enhanced submission with comprehensive error handling
  const submitWithFeedback = useCallback(
    async (onSubmit: (data: T) => Promise<void>) => {
      try {
        // Validate all fields first
        const isValid = await form.trigger();

        if (!isValid) {
          if (accessibility.focusFirstError) {
            focusFirstError();
          }

          if (accessibility.announceErrors) {
            const errors = Object.keys(form.formState.errors);
            formToast.showValidationError(
              errors[0],
              `Please fix ${errors.length} validation error${errors.length > 1 ? 's' : ''}`
            );
          }
          return;
        }

        // Get form data
        const data = form.getValues();

        // Submit the form
        await onSubmit(data);

        // Show success message
        formToast.showSubmissionSuccess(
          `${formName || 'Form'} submitted successfully`,
          { formName }
        );
      } catch (error) {
        console.error('Form submission error:', error);
        formToast.showSubmissionError(error as Error, { formName });
      }
    },
    [form, formToast, formName, accessibility]
  );

  // Focus first error field
  const focusFirstError = useCallback(() => {
    const firstErrorField = Object.keys(form.formState.errors)[0];
    if (firstErrorField) {
      const element = document.querySelector(
        `[name="${firstErrorField}"]`
      ) as HTMLElement;
      if (element) {
        element.focus();
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [form.formState.errors]);

  // Announce form state for screen readers
  const announceFormState = useCallback((message: string) => {
    // Create a live region announcement
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;

    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, []);

  // Helper to check if specific field is dirty
  const isDirtyField = useCallback(
    (fieldName: keyof T) => {
      return form.formState.dirtyFields[fieldName] || false;
    },
    [form.formState.dirtyFields]
  );

  // Get list of touched fields
  const getTouchedFields = useCallback(() => {
    return Object.keys(form.formState.touchedFields) as (keyof T)[];
  }, [form.formState.touchedFields]);

  // Load saved data from localStorage if available
  useEffect(() => {
    if (autoSave?.storageKey) {
      try {
        const saved = localStorage.getItem(autoSave.storageKey);
        if (saved) {
          const data = JSON.parse(saved);
          form.reset(data);
          setLastSaved(
            new Date(
              localStorage.getItem(`${autoSave.storageKey}_timestamp`) || ''
            )
          );
        }
      } catch (error) {
        console.warn('Failed to load saved form data:', error);
      }
    }
  }, [autoSave?.storageKey, form]);

  // Save to localStorage when data changes
  useEffect(() => {
    if (autoSave?.storageKey && form.formState.isDirty) {
      try {
        localStorage.setItem(autoSave.storageKey, JSON.stringify(watchedData));
        localStorage.setItem(
          `${autoSave.storageKey}_timestamp`,
          new Date().toISOString()
        );
      } catch (error) {
        console.warn('Failed to save form data to localStorage:', error);
      }
    }
  }, [watchedData, autoSave?.storageKey, form.formState.isDirty]);

  return {
    ...form,
    validateField: enhancedValidateField,
    getFieldValidation,
    saveNow,
    isSaving,
    lastSaved,
    submitWithFeedback,
    isDirtyField,
    getTouchedFields,
    focusFirstError,
    announceFormState,
  };
}
