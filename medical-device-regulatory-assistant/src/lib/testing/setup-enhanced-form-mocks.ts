/**
 * Setup Enhanced Form Hook Mocks for Testing
 * Configures jest mocks to use the enhanced form hook mock chain
 */

import React from 'react';

import {
  enhancedFormMocks,
  enhancedFormMockUtils,
  mockUseEnhancedForm,
  mockUseFormToast,
  mockUseAutoSave,
  mockUseRealTimeValidation,
} from './enhanced-form-hook-mocks';

/**
 * Setup enhanced form hook mocks for jest tests
 * Call this in jest.setup.js or individual test files
 */
export const setupEnhancedFormMocks = () => {
  // Mock useEnhancedForm hook
  jest.doMock('@/hooks/use-enhanced-form', () => ({
    __esModule: true,
    useEnhancedForm: mockUseEnhancedForm,
    default: mockUseEnhancedForm,
  }));

  // Mock useFormToast hook
  jest.doMock('@/hooks/use-form-toast', () => ({
    __esModule: true,
    useFormToast: mockUseFormToast,
    default: mockUseFormToast,
  }));

  // Mock useAutoSave hook
  jest.doMock('@/hooks/use-auto-save', () => ({
    __esModule: true,
    useAutoSave: mockUseAutoSave,
    default: mockUseAutoSave,
  }));

  // Mock useRealTimeValidation from FormValidation component
  jest.doMock('@/components/forms/FormValidation', () => ({
    __esModule: true,
    useRealTimeValidation: mockUseRealTimeValidation,
    // Keep other exports from FormValidation
    projectFormSchema: jest.fn(),
    deviceSearchSchema: jest.fn(),
    ValidatedInput: jest.fn(({ children, ...props }) =>
      React.createElement(
        'input',
        { 'data-testid': 'validated-input', ...props },
        children
      )
    ),
    ValidatedTextarea: jest.fn(({ children, ...props }) =>
      React.createElement(
        'textarea',
        { 'data-testid': 'validated-textarea', ...props },
        children
      )
    ),
  }));

  // Mock localStorage for auto-save functionality
  const localStorageMock = {
    getItem: jest.fn((key: string) => {
      // Return mock saved data for testing
      if (key.includes('_timestamp')) {
        return new Date().toISOString();
      }
      return JSON.stringify({ mockData: 'test' });
    }),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  };

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  });

  // Mock timers for auto-save debouncing
  jest.useFakeTimers();
};

/**
 * Cleanup enhanced form hook mocks
 * Call this in test cleanup or afterEach
 */
export const cleanupEnhancedFormMocks = () => {
  enhancedFormMockUtils.resetAllMocks();
  jest.useRealTimers();
  jest.restoreAllMocks();
};

/**
 * Reset enhanced form hook mocks between tests
 * Call this in beforeEach
 */
export const resetEnhancedFormMocks = () => {
  enhancedFormMockUtils.resetAllMocks();

  // Reset fake timers
  if (jest.isMockFunction(setTimeout)) {
    jest.clearAllTimers();
  }
};

/**
 * Fast-forward timers for auto-save testing
 * Useful for testing debounced auto-save functionality
 */
export const fastForwardAutoSave = (ms: number = 2000) => {
  if (jest.isMockFunction(setTimeout)) {
    jest.advanceTimersByTime(ms);
  }
};

/**
 * Simulate form field change for testing
 * Triggers validation and auto-save as appropriate
 */
export const simulateFieldChange = async (fieldName: string, value: any) => {
  const formState = enhancedFormMockUtils.getFormState();

  // Update form state
  enhancedFormMockUtils.setFormState({
    ...formState,
    values: { ...formState.values, [fieldName]: value },
    dirtyFields: { ...formState.dirtyFields, [fieldName]: true },
    touchedFields: { ...formState.touchedFields, [fieldName]: true },
    isDirty: true,
  });

  // Trigger validation
  await mockUseRealTimeValidation({} as any).validateField(fieldName, value);

  // Fast-forward auto-save timer
  fastForwardAutoSave(300); // debounce time
};

/**
 * Simulate form submission for testing
 */
export const simulateFormSubmission = async (formData: Record<string, any>) => {
  const formState = enhancedFormMockUtils.getFormState();

  enhancedFormMockUtils.setFormState({
    ...formState,
    values: formData,
    isSubmitting: true,
  });

  // Simulate async submission
  await new Promise((resolve) => setTimeout(resolve, 100));

  enhancedFormMockUtils.setFormState({
    ...formState,
    values: formData,
    isSubmitting: false,
    isSubmitted: true,
    isSubmitSuccessful: true,
    submitCount: formState.submitCount + 1,
  });
};

/**
 * Create test scenario with pre-configured form state
 */
export const createFormTestScenario = (
  scenario: 'empty' | 'filled' | 'invalid' | 'submitting'
) => {
  const baseState = enhancedFormMockUtils.getFormState();

  switch (scenario) {
    case 'empty':
      enhancedFormMockUtils.setFormState({
        ...baseState,
        values: {},
        errors: {},
        isDirty: false,
        isValid: false,
      });
      break;

    case 'filled':
      enhancedFormMockUtils.setFormState({
        ...baseState,
        values: {
          name: 'Test Project',
          description: 'Test Description',
          device_type: 'Test Device',
          intended_use: 'Test intended use for medical device',
        },
        isDirty: true,
        isValid: true,
        dirtyFields: {
          name: true,
          description: true,
          device_type: true,
          intended_use: true,
        },
        touchedFields: {
          name: true,
          description: true,
          device_type: true,
          intended_use: true,
        },
      });
      break;

    case 'invalid':
      enhancedFormMockUtils.setFormState({
        ...baseState,
        values: {
          name: 'Te', // Too short
          description: '',
        },
        errors: {
          name: {
            type: 'minLength',
            message: 'Name must be at least 3 characters',
          },
          description: { type: 'required', message: 'Description is required' },
        },
        isDirty: true,
        isValid: false,
      });
      break;

    case 'submitting':
      enhancedFormMockUtils.setFormState({
        ...baseState,
        values: {
          name: 'Test Project',
          description: 'Test Description',
        },
        isSubmitting: true,
        isDirty: true,
        isValid: true,
      });
      break;
  }
};

// Export utilities for easy access in tests
export { enhancedFormMockUtils };

// Export the mocks for direct usage
export { enhancedFormMocks };

export default {
  setup: setupEnhancedFormMocks,
  cleanup: cleanupEnhancedFormMocks,
  reset: resetEnhancedFormMocks,
  fastForwardAutoSave,
  simulateFieldChange,
  simulateFormSubmission,
  createFormTestScenario,
  utils: enhancedFormMockUtils,
  mocks: enhancedFormMocks,
};
