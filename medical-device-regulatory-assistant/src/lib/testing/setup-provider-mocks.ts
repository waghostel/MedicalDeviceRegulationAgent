/**
 * Setup Provider Mocks for Testing
 * Configures jest mocks to use the provider mock system
 * Requirements: 2.4, 7.1
 */

import React from 'react';
import { Session } from 'next-auth';
import {
  MockToastProvider,
  MockFormProvider,
  MockThemeProvider,
  MockSessionProvider,
  MockProviderStack,
  providerMockUtils,
  setupProviderMocks,
  cleanupProviderMocks,
  type ProviderMockOptions,
} from './provider-mock-system';

/**
 * Setup provider mocks for jest tests
 * Call this in jest.setup.js or individual test files
 */
export const setupProviderMockSystem = (options: ProviderMockOptions = {}) => {
  // Setup basic provider mocks
  setupProviderMocks();

  // Configure specific provider options
  const {
    toast = { enabled: true },
    form = { enabled: true },
    theme = { enabled: true, defaultTheme: 'light' },
    session = { enabled: true },
  } = options;

  // Initialize provider states based on options
  if (toast.enabled && toast.initialToasts) {
    toast.initialToasts.forEach(toastData => {
      providerMockUtils.addMockToast(toastData);
    });
  }

  if (form.enabled && form.initialValues) {
    providerMockUtils.setFormState({
      values: form.initialValues,
      formId: form.formId || 'test-form',
    });
  }

  if (theme.enabled && theme.defaultTheme) {
    providerMockUtils.setThemeState({
      theme: theme.defaultTheme,
      resolvedTheme: theme.defaultTheme === 'system' ? 'light' : theme.defaultTheme,
    });
  }

  if (session.enabled && session.session) {
    providerMockUtils.setSessionState({
      data: session.session,
      status: 'authenticated',
    });
  }
};

/**
 * Cleanup provider mocks
 * Call this in test cleanup or afterEach
 */
export const cleanupProviderMockSystem = () => {
  cleanupProviderMocks();
  providerMockUtils.clearAllProviderStates();
};

/**
 * Reset provider mocks between tests
 * Call this in beforeEach
 */
export const resetProviderMockSystem = () => {
  providerMockUtils.clearAllProviderStates();
  jest.clearAllMocks();
};

/**
 * Create a test wrapper with provider mocks
 * Useful for individual test files that need specific provider setup
 */
export const createProviderTestWrapper = (options: ProviderMockOptions = {}) => {
  return ({ children }: { children: React.ReactNode }) => {
    return React.createElement(MockProviderStack, { options }, children);
  };
};

/**
 * Create a mock session for testing
 */
export const createMockSession = (overrides: Partial<Session> = {}): Session => {
  return {
    user: {
      id: 'test-user-id',
      name: 'Test User',
      email: 'test@example.com',
      image: 'https://example.com/avatar.jpg',
      ...overrides.user,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
    accessToken: 'mock-access-token',
    ...overrides,
  } as Session;
};

/**
 * Simulate provider interactions for testing
 */
export const simulateProviderInteractions = {
  // Toast interactions
  addToast: (toast: any) => {
    return providerMockUtils.addMockToast(toast);
  },
  
  removeToast: (id: string) => {
    const state = providerMockUtils.getToastState();
    providerMockUtils.setToastState({
      toasts: state.toasts.filter(t => t.id !== id),
    });
  },

  // Form interactions
  setFormField: (name: string, value: any) => {
    const state = providerMockUtils.getFormState();
    providerMockUtils.setFormState({
      values: { ...state.values, [name]: value },
      isDirty: true,
    });
  },

  setFormError: (name: string, error: any) => {
    const state = providerMockUtils.getFormState();
    providerMockUtils.setFormState({
      errors: { ...state.errors, [name]: error },
    });
  },

  submitForm: async () => {
    providerMockUtils.setFormState({ isSubmitting: true });
    
    // Simulate async submission
    await new Promise(resolve => setTimeout(resolve, 100));
    
    providerMockUtils.setFormState({ 
      isSubmitting: false,
      isDirty: false,
    });
  },

  // Theme interactions
  switchTheme: (theme: 'light' | 'dark' | 'system') => {
    providerMockUtils.setThemeState({
      theme,
      resolvedTheme: theme === 'system' ? 'light' : theme,
    });
  },

  // Session interactions
  signIn: (session: Session) => {
    providerMockUtils.setSessionState({
      data: session,
      status: 'authenticated',
    });
  },

  signOut: () => {
    providerMockUtils.setSessionState({
      data: null,
      status: 'unauthenticated',
    });
  },

  updateSession: (updates: Partial<Session>) => {
    const state = providerMockUtils.getSessionState();
    if (state.data) {
      providerMockUtils.setSessionState({
        data: { ...state.data, ...updates },
      });
    }
  },
};

/**
 * Provider mock test scenarios
 * Pre-configured scenarios for common testing situations
 */
export const providerMockScenarios = {
  // Empty/default state
  empty: (): ProviderMockOptions => ({
    toast: { enabled: true },
    form: { enabled: true },
    theme: { enabled: true, defaultTheme: 'light' },
    session: { enabled: true },
  }),

  // Authenticated user with form data
  authenticatedWithForm: (): ProviderMockOptions => ({
    toast: { enabled: true },
    form: { 
      enabled: true,
      formId: 'project-form',
      initialValues: {
        name: 'Test Project',
        description: 'Test Description',
        device_type: 'Test Device',
      },
    },
    theme: { enabled: true, defaultTheme: 'light' },
    session: { 
      enabled: true,
      session: createMockSession(),
    },
  }),

  // Dark theme with notifications
  darkThemeWithToasts: (): ProviderMockOptions => ({
    toast: { 
      enabled: true,
      initialToasts: [
        {
          title: 'Welcome',
          description: 'Welcome to the application',
          variant: 'success',
        },
      ],
    },
    form: { enabled: true },
    theme: { enabled: true, defaultTheme: 'dark' },
    session: { enabled: true },
  }),

  // Form with validation errors
  formWithErrors: (): ProviderMockOptions => {
    const options = providerMockScenarios.authenticatedWithForm();
    
    // Set up form errors after initialization
    setTimeout(() => {
      simulateProviderInteractions.setFormError('name', {
        type: 'required',
        message: 'Name is required',
      });
      simulateProviderInteractions.setFormError('description', {
        type: 'minLength',
        message: 'Description must be at least 10 characters',
      });
    }, 0);
    
    return options;
  },

  // Unauthenticated user
  unauthenticated: (): ProviderMockOptions => ({
    toast: { enabled: true },
    form: { enabled: true },
    theme: { enabled: true, defaultTheme: 'light' },
    session: { 
      enabled: true,
      session: null,
    },
  }),

  // Loading states
  loading: (): ProviderMockOptions => {
    const options = providerMockScenarios.authenticatedWithForm();
    
    // Set loading states
    setTimeout(() => {
      providerMockUtils.setFormState({ isSubmitting: true });
      providerMockUtils.setSessionState({ status: 'loading' });
    }, 0);
    
    return options;
  },
};

/**
 * Validate provider mock setup
 * Useful for debugging provider mock issues
 */
export const validateProviderMockSetup = () => {
  const validation = providerMockUtils.validateProviderMocks();
  
  if (!validation.allValid) {
    console.warn('Provider mock validation failed:', validation.results);
    return false;
  }
  
  console.log('✅ All provider mocks are properly configured');
  return true;
};

// Export utilities for easy access in tests
export { providerMockUtils };

// Export provider components for direct usage
export {
  MockToastProvider,
  MockFormProvider,
  MockThemeProvider,
  MockSessionProvider,
  MockProviderStack,
};

export default {
  setup: setupProviderMockSystem,
  cleanup: cleanupProviderMockSystem,
  reset: resetProviderMockSystem,
  createWrapper: createProviderTestWrapper,
  createSession: createMockSession,
  simulate: simulateProviderInteractions,
  scenarios: providerMockScenarios,
  validate: validateProviderMockSetup,
  utils: providerMockUtils,
  providers: {
    MockToastProvider,
    MockFormProvider,
    MockThemeProvider,
    MockSessionProvider,
    MockProviderStack,
  },
};