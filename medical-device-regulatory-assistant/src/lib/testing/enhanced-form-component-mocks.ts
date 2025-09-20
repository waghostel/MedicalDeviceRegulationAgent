/**
 * Enhanced Form Component Mocks
 *
 * Implements component mocks for enhanced form components with proper test attributes
 * and functionality preservation for testing scenarios.
 *
 * Requirements: 2.4, 3.1
 */

import React from 'react';
import { registerMock } from './MockRegistry';

// ============================================================================
// Type Definitions for Component Props
// ============================================================================

export interface EnhancedInputProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'search';
  placeholder?: string;
  description?: string;
  required?: boolean;
  error?: any;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  disabled?: boolean;
  className?: string;
  maxLength?: number;
  showCharacterCount?: boolean;
  validation?: {
    isValid?: boolean;
    isValidating?: boolean;
    hasBeenTouched?: boolean;
    message?: string;
  };
  autoComplete?: string;
  autoFocus?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
  [key: string]: any;
}

export interface EnhancedTextareaProps {
  label: string;
  name: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  error?: any;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  disabled?: boolean;
  className?: string;
  rows?: number;
  maxLength?: number;
  showCharacterCount?: boolean;
  validation?: {
    isValid?: boolean;
    isValidating?: boolean;
    hasBeenTouched?: boolean;
    message?: string;
  };
  resize?: boolean;
  autoFocus?: boolean;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
  [key: string]: any;
}

export interface AutoSaveIndicatorProps {
  isSaving: boolean;
  lastSaved?: Date;
  className?: string;
  'data-testid'?: string;
}

export interface ProgressProps {
  progress: number;
  currentStep: string;
  totalSteps?: number;
  className?: string;
  'data-testid'?: string;
}

export interface EnhancedButtonProps {
  children: React.ReactNode;
  type?: 'button' | 'submit' | 'reset';
  variant?:
    | 'default'
    | 'destructive'
    | 'outline'
    | 'secondary'
    | 'ghost'
    | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
  loading?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
  'data-testid'?: string;
  [key: string]: any;
}

// ============================================================================
// Component Mock Registry Interface
// ============================================================================

export interface ComponentMockRegistry {
  EnhancedInput: jest.MockedFunction<React.FC<EnhancedInputProps>>;
  EnhancedTextarea: jest.MockedFunction<React.FC<EnhancedTextareaProps>>;
  AutoSaveIndicator: jest.MockedFunction<React.FC<AutoSaveIndicatorProps>>;
  FormSubmissionProgress: jest.MockedFunction<React.FC<ProgressProps>>;
  EnhancedButton: jest.MockedFunction<React.FC<EnhancedButtonProps>>;
}

// ============================================================================
// Mock Implementations
// ============================================================================

/**
 * Enhanced Input Mock
 * Preserves essential functionality for testing while providing proper test attributes
 */
export const EnhancedInputMock = jest.fn<
  React.ReactElement,
  [EnhancedInputProps]
>(
  ({
    label,
    name,
    type = 'text',
    placeholder,
    value = '',
    onChange,
    onBlur,
    onFocus,
    disabled,
    required,
    error,
    validation,
    className,
    maxLength,
    showCharacterCount,
    autoComplete,
    autoFocus,
    ...props
  }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e.target.value);
    };

    return React.createElement(
      'div',
      {
        'data-testid': 'enhanced-input-wrapper',
        className: `enhanced-input-wrapper ${className || ''}`,
      },
      [
        // Label
        React.createElement(
          'label',
          {
            key: 'label',
            htmlFor: name,
            'data-testid': 'enhanced-input-label',
            className: 'enhanced-input-label',
          },
          [
            label,
            required &&
              React.createElement(
                'span',
                {
                  key: 'required',
                  'data-testid': 'required-indicator',
                  'aria-label': 'required',
                  className: 'required-indicator',
                },
                '*'
              ),
          ]
        ),

        // Input field
        React.createElement('input', {
          key: 'input',
          id: name,
          name,
          type,
          placeholder,
          value,
          onChange: handleChange,
          onBlur,
          onFocus,
          disabled,
          maxLength,
          autoComplete,
          autoFocus,
          'data-testid': 'enhanced-input',
          'data-error': !!error,
          'data-valid': validation?.isValid,
          'data-validating': validation?.isValidating,
          'data-touched': validation?.hasBeenTouched,
          'aria-invalid': !!error,
          'aria-required': required,
          'aria-describedby': error ? `${name}-error` : undefined,
          className: 'enhanced-input',
          ...props,
        }),

        // Character count
        showCharacterCount &&
          maxLength &&
          React.createElement(
            'div',
            {
              key: 'char-count',
              'data-testid': 'character-count',
              className: 'character-count',
            },
            `${value.length}/${maxLength}`
          ),

        // Error message
        error &&
          React.createElement(
            'div',
            {
              key: 'error',
              id: `${name}-error`,
              'data-testid': 'input-error',
              role: 'alert',
              className: 'input-error',
            },
            error.message || error
          ),

        // Validation message
        validation?.message &&
          !error &&
          React.createElement(
            'div',
            {
              key: 'validation',
              'data-testid': 'validation-message',
              role: 'status',
              className: 'validation-message',
            },
            validation.message
          ),
      ]
    );
  }
);

/**
 * Enhanced Textarea Mock
 * Preserves essential functionality for testing while providing proper test attributes
 */
export const EnhancedTextareaMock = jest.fn<
  React.ReactElement,
  [EnhancedTextareaProps]
>(
  ({
    label,
    name,
    placeholder,
    value = '',
    onChange,
    onBlur,
    onFocus,
    disabled,
    required,
    error,
    validation,
    className,
    rows = 4,
    maxLength,
    showCharacterCount,
    resize = true,
    autoFocus,
    ...props
  }) => {
    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e.target.value);
    };

    return React.createElement(
      'div',
      {
        'data-testid': 'enhanced-textarea-wrapper',
        className: `enhanced-textarea-wrapper ${className || ''}`,
      },
      [
        // Label
        React.createElement(
          'label',
          {
            key: 'label',
            htmlFor: name,
            'data-testid': 'enhanced-textarea-label',
            className: 'enhanced-textarea-label',
          },
          [
            label,
            required &&
              React.createElement(
                'span',
                {
                  key: 'required',
                  'data-testid': 'required-indicator',
                  'aria-label': 'required',
                  className: 'required-indicator',
                },
                '*'
              ),
          ]
        ),

        // Textarea field
        React.createElement('textarea', {
          key: 'textarea',
          id: name,
          name,
          placeholder,
          value,
          onChange: handleChange,
          onBlur,
          onFocus,
          disabled,
          rows,
          maxLength,
          autoFocus,
          'data-testid': 'enhanced-textarea',
          'data-error': !!error,
          'data-valid': validation?.isValid,
          'data-validating': validation?.isValidating,
          'data-touched': validation?.hasBeenTouched,
          'data-resize': resize,
          'aria-invalid': !!error,
          'aria-required': required,
          'aria-describedby': error ? `${name}-error` : undefined,
          className: 'enhanced-textarea',
          style: resize ? {} : { resize: 'none' },
          ...props,
        }),

        // Character count
        showCharacterCount &&
          maxLength &&
          React.createElement(
            'div',
            {
              key: 'char-count',
              'data-testid': 'character-count',
              className: 'character-count',
            },
            `${value.length}/${maxLength}`
          ),

        // Error message
        error &&
          React.createElement(
            'div',
            {
              key: 'error',
              id: `${name}-error`,
              'data-testid': 'textarea-error',
              role: 'alert',
              className: 'textarea-error',
            },
            error.message || error
          ),

        // Validation message
        validation?.message &&
          !error &&
          React.createElement(
            'div',
            {
              key: 'validation',
              'data-testid': 'validation-message',
              role: 'status',
              className: 'validation-message',
            },
            validation.message
          ),
      ]
    );
  }
);

/**
 * Auto Save Indicator Mock
 * Displays saving state and last saved time with proper test attributes
 */
export const AutoSaveIndicatorMock = jest.fn<
  React.ReactElement,
  [AutoSaveIndicatorProps]
>(
  ({
    isSaving,
    lastSaved,
    className,
    'data-testid': testId = 'auto-save-indicator',
  }) => {
    const formatLastSaved = (date: Date) => {
      const now = new Date();
      const diff = now.getTime() - date.getTime();

      if (diff < 60000) {
        return 'Just now';
      } else if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      } else {
        return date.toLocaleTimeString();
      }
    };

    if (isSaving) {
      return React.createElement(
        'div',
        {
          'data-testid': testId,
          'data-saving': true,
          'data-status': 'saving',
          className: `auto-save-indicator saving ${className || ''}`,
          role: 'status',
          'aria-live': 'polite',
        },
        [
          React.createElement(
            'span',
            {
              key: 'icon',
              'data-testid': 'saving-icon',
              className: 'saving-icon',
              'aria-hidden': 'true',
            },
            '⏳'
          ),
          React.createElement(
            'span',
            {
              key: 'text',
              'data-testid': 'saving-text',
            },
            'Saving...'
          ),
        ]
      );
    }

    if (lastSaved) {
      return React.createElement(
        'div',
        {
          'data-testid': testId,
          'data-saving': false,
          'data-status': 'saved',
          'data-last-saved': lastSaved.toISOString(),
          className: `auto-save-indicator saved ${className || ''}`,
          role: 'status',
          'aria-live': 'polite',
        },
        [
          React.createElement(
            'span',
            {
              key: 'icon',
              'data-testid': 'saved-icon',
              className: 'saved-icon',
              'aria-hidden': 'true',
            },
            '✓'
          ),
          React.createElement(
            'span',
            {
              key: 'text',
              'data-testid': 'saved-text',
            },
            `Saved ${formatLastSaved(lastSaved)}`
          ),
        ]
      );
    }

    return React.createElement(
      'div',
      {
        'data-testid': testId,
        'data-saving': false,
        'data-status': 'idle',
        className: `auto-save-indicator idle ${className || ''}`,
        style: { display: 'none' },
      },
      null
    );
  }
);

/**
 * Form Submission Progress Mock
 * Displays form submission progress with proper test attributes
 */
export const FormSubmissionProgressMock = jest.fn<
  React.ReactElement,
  [ProgressProps]
>(
  ({
    progress,
    currentStep,
    totalSteps = 100,
    className,
    'data-testid': testId = 'form-submission-progress',
  }) => {
    const progressPercentage = Math.min(Math.max(progress, 0), 100);

    return React.createElement(
      'div',
      {
        'data-testid': testId,
        'data-progress': progressPercentage,
        'data-current-step': currentStep,
        'data-total-steps': totalSteps,
        className: `form-submission-progress ${className || ''}`,
        role: 'progressbar',
        'aria-valuenow': progressPercentage,
        'aria-valuemin': 0,
        'aria-valuemax': 100,
        'aria-label': `Form submission progress: ${progressPercentage}%`,
      },
      [
        // Progress bar
        React.createElement(
          'div',
          {
            key: 'progress-bar',
            'data-testid': 'progress-bar',
            className: 'progress-bar',
            style: {
              width: '100%',
              height: '8px',
              backgroundColor: '#e5e7eb',
              borderRadius: '4px',
              overflow: 'hidden',
            },
          },
          React.createElement('div', {
            'data-testid': 'progress-fill',
            className: 'progress-fill',
            style: {
              width: `${progressPercentage}%`,
              height: '100%',
              backgroundColor: '#3b82f6',
              transition: 'width 0.3s ease',
            },
          })
        ),

        // Current step text
        React.createElement(
          'div',
          {
            key: 'step-text',
            'data-testid': 'current-step-text',
            className: 'current-step-text',
            style: {
              marginTop: '8px',
              fontSize: '14px',
              color: '#6b7280',
            },
          },
          currentStep
        ),

        // Progress percentage
        React.createElement(
          'div',
          {
            key: 'progress-text',
            'data-testid': 'progress-percentage',
            className: 'progress-percentage',
            style: {
              fontSize: '12px',
              color: '#9ca3af',
            },
          },
          `${progressPercentage}%`
        ),
      ]
    );
  }
);

/**
 * Enhanced Button Mock
 * Preserves button functionality with proper test attributes and accessibility
 */
export const EnhancedButtonMock = jest.fn<
  React.ReactElement,
  [EnhancedButtonProps]
>(
  ({
    children,
    type = 'button',
    variant = 'default',
    size = 'default',
    disabled,
    loading,
    onClick,
    className,
    'data-testid': testId = 'enhanced-button',
    ...props
  }) => {
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && !loading) {
        onClick?.(event);
      }
    };

    const getVariantClass = (variant: string) => {
      const variants = {
        default: 'btn-default',
        destructive: 'btn-destructive',
        outline: 'btn-outline',
        secondary: 'btn-secondary',
        ghost: 'btn-ghost',
        link: 'btn-link',
      };
      return variants[variant as keyof typeof variants] || 'btn-default';
    };

    const getSizeClass = (size: string) => {
      const sizes = {
        default: 'btn-default-size',
        sm: 'btn-sm',
        lg: 'btn-lg',
        icon: 'btn-icon',
      };
      return sizes[size as keyof typeof sizes] || 'btn-default-size';
    };

    return React.createElement(
      'button',
      {
        type,
        onClick: handleClick,
        disabled: disabled || loading,
        'data-testid': testId,
        'data-variant': variant,
        'data-size': size,
        'data-loading': loading,
        'data-disabled': disabled,
        className: `enhanced-button ${getVariantClass(variant)} ${getSizeClass(size)} ${className || ''}`,
        'aria-disabled': disabled || loading,
        'aria-busy': loading,
        ...props,
      },
      [
        loading &&
          React.createElement(
            'span',
            {
              key: 'loading-icon',
              'data-testid': 'loading-icon',
              className: 'loading-icon',
              'aria-hidden': 'true',
            },
            '⏳'
          ),
        React.createElement(
          'span',
          {
            key: 'button-content',
            'data-testid': 'button-content',
            className: 'button-content',
          },
          children
        ),
      ]
    );
  }
);

// ============================================================================
// Component Mock Registry
// ============================================================================

export const componentMocks: ComponentMockRegistry = {
  EnhancedInput: EnhancedInputMock,
  EnhancedTextarea: EnhancedTextareaMock,
  AutoSaveIndicator: AutoSaveIndicatorMock,
  FormSubmissionProgress: FormSubmissionProgressMock,
  EnhancedButton: EnhancedButtonMock,
};

// ============================================================================
// Registration and Setup Functions
// ============================================================================

/**
 * Register all enhanced form component mocks with the MockRegistry
 */
export function registerEnhancedFormComponentMocks(): void {
  // Register EnhancedInput mock
  registerMock(
    'EnhancedInput',
    EnhancedInputMock,
    {
      name: 'EnhancedInput',
      version: '1.0.0',
      type: 'component',
      dependencies: [],
      compatibleVersions: ['19.1.0'],
      description:
        'Mock for EnhancedInput component with validation and accessibility features',
      tags: ['form', 'input', 'enhanced', 'validation'],
    },
    {
      enabled: true,
      options: {
        preserveProps: true,
        includeTestAttributes: true,
        mockValidation: true,
      },
    }
  );

  // Register EnhancedTextarea mock
  registerMock(
    'EnhancedTextarea',
    EnhancedTextareaMock,
    {
      name: 'EnhancedTextarea',
      version: '1.0.0',
      type: 'component',
      dependencies: [],
      compatibleVersions: ['19.1.0'],
      description:
        'Mock for EnhancedTextarea component with validation and accessibility features',
      tags: ['form', 'textarea', 'enhanced', 'validation'],
    },
    {
      enabled: true,
      options: {
        preserveProps: true,
        includeTestAttributes: true,
        mockValidation: true,
      },
    }
  );

  // Register AutoSaveIndicator mock
  registerMock(
    'AutoSaveIndicator',
    AutoSaveIndicatorMock,
    {
      name: 'AutoSaveIndicator',
      version: '1.0.0',
      type: 'component',
      dependencies: [],
      compatibleVersions: ['19.1.0'],
      description:
        'Mock for AutoSaveIndicator component with saving state display',
      tags: ['form', 'autosave', 'indicator', 'status'],
    },
    {
      enabled: true,
      options: {
        preserveProps: true,
        includeTestAttributes: true,
        mockTimeFormatting: true,
      },
    }
  );

  // Register FormSubmissionProgress mock
  registerMock(
    'FormSubmissionProgress',
    FormSubmissionProgressMock,
    {
      name: 'FormSubmissionProgress',
      version: '1.0.0',
      type: 'component',
      dependencies: [],
      compatibleVersions: ['19.1.0'],
      description:
        'Mock for FormSubmissionProgress component with progress tracking',
      tags: ['form', 'progress', 'submission', 'status'],
    },
    {
      enabled: true,
      options: {
        preserveProps: true,
        includeTestAttributes: true,
        mockProgressAnimation: false, // Disable animations in tests
      },
    }
  );

  // Register EnhancedButton mock
  registerMock(
    'EnhancedButton',
    EnhancedButtonMock,
    {
      name: 'EnhancedButton',
      version: '1.0.0',
      type: 'component',
      dependencies: [],
      compatibleVersions: ['19.1.0'],
      description:
        'Mock for EnhancedButton component with variants and loading states',
      tags: ['button', 'enhanced', 'loading', 'variants'],
    },
    {
      enabled: true,
      options: {
        preserveProps: true,
        includeTestAttributes: true,
        mockLoadingState: true,
      },
    }
  );

  console.log(
    '[Enhanced Form Component Mocks] All component mocks registered successfully'
  );
}

/**
 * Setup enhanced form component mocks for testing
 * This function should be called in test setup files
 */
export function setupEnhancedFormComponentMocks(): void {
  // Register all component mocks
  registerEnhancedFormComponentMocks();

  // Add to global mock registry if available
  if (global.__GLOBAL_MOCK_REGISTRY) {
    Object.entries(componentMocks).forEach(([name, mock]) => {
      global.__GLOBAL_MOCK_REGISTRY.register('component', name, mock);
    });
  }

  // Setup Jest module mocks if in Jest environment
  if (typeof jest !== 'undefined') {
    try {
      // Mock the actual component imports only if they exist
      jest.doMock('@/components/forms/EnhancedFormField', () => ({
        EnhancedInput: EnhancedInputMock,
        EnhancedTextarea: EnhancedTextareaMock,
        AutoSaveIndicator: AutoSaveIndicatorMock,
      }));
      console.log(
        '[Enhanced Form Component Mocks] EnhancedFormField module mocked'
      );
    } catch (error) {
      console.warn(
        '[Enhanced Form Component Mocks] Could not mock modules:',
        error
      );
    }
  }
}

/**
 * Cleanup enhanced form component mocks
 */
export function cleanupEnhancedFormComponentMocks(): void {
  // Clear all mock call history
  Object.values(componentMocks).forEach((mock) => {
    mock.mockClear();
  });

  // Clear from global registry if available
  if (global.__GLOBAL_MOCK_REGISTRY) {
    Object.keys(componentMocks).forEach((name) => {
      const componentMap = global.__GLOBAL_MOCK_REGISTRY.components;
      if (componentMap && componentMap.delete) {
        componentMap.delete(name);
      }
    });
  }
}

// ============================================================================
// Export all mocks and utilities
// ============================================================================

export {
  EnhancedInputMock,
  EnhancedTextareaMock,
  AutoSaveIndicatorMock,
  FormSubmissionProgressMock,
  EnhancedButtonMock,
};

export default componentMocks;
