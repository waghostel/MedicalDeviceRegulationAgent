/**
 * React 19 Compatible react-hook-form Mock
 * Fixes "s._removeUnmounted is not a function" error
 */

const React = require('react');

// Mock form state
const createMockFormState = (overrides = {}) => ({
  isDirty: false,
  isValid: true,
  isSubmitting: false,
  isLoading: false,
  isSubmitted: false,
  isSubmitSuccessful: false,
  isValidating: false,
  submitCount: 0,
  touchedFields: {},
  dirtyFields: {},
  validatingFields: {},
  errors: {},
  disabled: false,
  ...overrides,
});

// Mock control object
const createMockControl = () => ({
  _subjects: {
    values: { next: jest.fn() },
    array: { next: jest.fn() },
    state: { next: jest.fn() },
  },
  _removeUnmounted: jest.fn(), // Add the missing method that React 19 removed
  _names: {
    mount: new Set(),
    unMount: new Set(),
    array: new Set(),
    focus: '',
    watch: new Set(),
    watchAll: false,
  },
  _formState: createMockFormState(),
  _defaultValues: {},
  _formValues: {},
  register: jest.fn(),
  unregister: jest.fn(),
  getFieldState: jest.fn(),
  handleSubmit: jest.fn(),
  reset: jest.fn(),
  resetField: jest.fn(),
  clearErrors: jest.fn(),
  setValue: jest.fn(),
  getValue: jest.fn(),
  getValues: jest.fn(),
  watch: jest.fn(),
  trigger: jest.fn(),
  setError: jest.fn(),
  setFocus: jest.fn(),
});

// Mock useForm hook
const useForm = jest.fn((options = {}) => {
  const control = createMockControl();

  return {
    register: jest.fn((name, options) => ({
      name,
      onChange: jest.fn(),
      onBlur: jest.fn(),
      ref: jest.fn(),
    })),
    handleSubmit: jest.fn((onValid, onInvalid) => (event) => {
      event?.preventDefault?.();
      return Promise.resolve(onValid?.({}));
    }),
    control,
    formState: createMockFormState(),
    watch: jest.fn(() => ({})),
    getValues: jest.fn(() => ({})),
    setValue: jest.fn(),
    reset: jest.fn(),
    trigger: jest.fn(() => Promise.resolve(true)),
    clearErrors: jest.fn(),
    setError: jest.fn(),
    setFocus: jest.fn(),
    getFieldState: jest.fn(() => ({
      invalid: false,
      isTouched: false,
      isDirty: false,
      error: undefined,
    })),
    resetField: jest.fn(),
    unregister: jest.fn(),
  };
});

// Mock useWatch hook - this is where the error occurs
const useWatch = jest.fn((props = {}) => {
  // Return mock values based on the watch configuration
  if (props.name) {
    return '';
  }
  return {};
});

// Mock useController hook
const useController = jest.fn((props = {}) => ({
  field: {
    name: props.name || 'field',
    value: props.defaultValue || '',
    onChange: jest.fn(),
    onBlur: jest.fn(),
    ref: jest.fn(),
  },
  fieldState: {
    invalid: false,
    isTouched: false,
    isDirty: false,
    error: undefined,
  },
  formState: createMockFormState(),
}));

// Mock useFormContext hook
const useFormContext = jest.fn(() => {
  const mockForm = useForm();
  return mockForm;
});

// Mock useFieldArray hook
const useFieldArray = jest.fn((props = {}) => ({
  fields: [],
  append: jest.fn(),
  prepend: jest.fn(),
  insert: jest.fn(),
  swap: jest.fn(),
  move: jest.fn(),
  update: jest.fn(),
  replace: jest.fn(),
  remove: jest.fn(),
}));

// Mock Controller component
const Controller = jest.fn(
  ({ render, name, control, defaultValue, ...props }) => {
    const field = {
      name,
      value: defaultValue || '',
      onChange: jest.fn(),
      onBlur: jest.fn(),
      ref: jest.fn(),
    };

    const fieldState = {
      invalid: false,
      isTouched: false,
      isDirty: false,
      error: undefined,
    };

    const formState = createMockFormState();

    if (typeof render === 'function') {
      return render({ field, fieldState, formState });
    }

    return React.createElement('div', { 'data-testid': `controller-${name}` });
  }
);

// Mock FormProvider component
const FormProvider = jest.fn(({ children, ...methods }) => {
  return React.createElement(
    'div',
    { 'data-testid': 'form-provider' },
    children
  );
});

// Mock resolver functions
const zodResolver = jest.fn(() => jest.fn());
const yupResolver = jest.fn(() => jest.fn());
const joiResolver = jest.fn(() => jest.fn());

module.exports = {
  useForm,
  useWatch,
  useController,
  useFormContext,
  useFieldArray,
  Controller,
  FormProvider,
  // Resolvers
  zodResolver,
  yupResolver,
  joiResolver,
  // Utilities for testing
  createMockFormState,
  createMockControl,
};
