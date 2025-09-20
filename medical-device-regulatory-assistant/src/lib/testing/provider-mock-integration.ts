/**
 * Provider Mock Integration for Test Utils
 * Integrates provider mock system with existing test infrastructure
 * Enhanced with Provider Stack Management (Task B3.2)
 * Requirements: 2.4, 7.1, 7.2
 */

import { Session } from 'next-auth';
import React, { ReactNode } from 'react';

import {
  MockProviderStack,
  providerMockUtils,
  setupProviderMocks,
  cleanupProviderMocks,
  type ProviderMockOptions,
} from './provider-mock-system';
import {
  providerStackManager,
  createProviderStack,
  createProviderStackFromOptions,
  cleanupProviderStack,
  resetProviderStack,
  cleanupAllProviderStacks,
  resetAllProviderStates,
  EnhancedProviderStack,
  providerStackUtils,
} from './ProviderStackManager';

/**
 * Enhanced test providers wrapper with provider mock integration
 */
export interface EnhancedTestProvidersProps {
  children: ReactNode;
  session?: Session | null;
  router?: any;
  providerOptions?: ProviderMockOptions;
}

export const EnhancedTestProviders: React.FC<EnhancedTestProvidersProps> = ({
  children,
  session = null,
  router = {},
  providerOptions = {},
}) => {
  // Set up default provider options
  const defaultProviderOptions: ProviderMockOptions = {
    toast: { enabled: true },
    form: { enabled: true },
    theme: { enabled: true, defaultTheme: 'light' },
    session: { enabled: true, session },
    ...providerOptions,
  };

  // Update session in provider options if provided
  if (session !== null) {
    defaultProviderOptions.session = {
      ...defaultProviderOptions.session,
      session,
    };
  }

  return React.createElement(
    MockProviderStack,
    { options: defaultProviderOptions },
    children
  );
};

/**
 * Provider mock configuration for renderWithProviders
 */
export interface ProviderMockConfiguration {
  enabled: boolean;
  options?: ProviderMockOptions;
}

/**
 * Enhanced render options with provider mock support
 */
export interface EnhancedRenderOptions {
  session?: Session | null;
  router?: any;
  providerMocks?: ProviderMockConfiguration;
  mockToast?: boolean;
  mockEnhancedForm?: boolean;
  mockConfig?: any;
  reactVersion?: 'react18' | 'react19';
  errorBoundary?: boolean;
  onError?: (error: Error | AggregateError, errorInfo: React.ErrorInfo) => void;
}

/**
 * Create enhanced wrapper with provider mocks
 */
export const createEnhancedWrapper = (options: EnhancedRenderOptions = {}) => {
  const {
    session,
    router,
    providerMocks = { enabled: true },
    mockToast = true,
    mockEnhancedForm = true,
  } = options;

  return ({ children }: { children: ReactNode }) => {
    if (!providerMocks.enabled) {
      // Return children without provider mocks if disabled
      return children as React.ReactElement;
    }

    // Configure provider options based on mock settings
    const providerOptions: ProviderMockOptions = {
      toast: { enabled: mockToast },
      form: { enabled: mockEnhancedForm },
      theme: { enabled: true, defaultTheme: 'light' },
      session: { enabled: true, session },
      ...providerMocks.options,
    };

    return React.createElement(
      EnhancedTestProviders,
      {
        session,
        router,
        providerOptions,
      },
      children
    );
  };
};

/**
 * Enhanced provider mock utilities for test integration with stack management
 */
export const providerMockIntegration = {
  // Setup and cleanup (enhanced with stack management)
  setup: (options: ProviderMockOptions = {}) => {
    setupProviderMocks();

    // Initialize provider states based on options
    if (options.toast?.initialToasts) {
      options.toast.initialToasts.forEach((toast) => {
        providerMockUtils.addMockToast(toast);
      });
    }

    if (options.form?.initialValues) {
      providerMockUtils.setFormState({
        values: options.form.initialValues,
        formId: options.form.formId || 'test-form',
      });
    }

    if (options.theme?.defaultTheme) {
      providerMockUtils.setThemeState({
        theme: options.theme.defaultTheme,
        resolvedTheme:
          options.theme.defaultTheme === 'system'
            ? 'light'
            : options.theme.defaultTheme,
      });
    }

    if (options.session?.session) {
      providerMockUtils.setSessionState({
        data: options.session.session,
        status: 'authenticated',
      });
    }
  },

  cleanup: () => {
    cleanupProviderMocks();
    providerMockUtils.clearAllProviderStates();
    // Enhanced cleanup with stack management
    cleanupAllProviderStacks();
  },

  reset: () => {
    providerMockUtils.clearAllProviderStates();
    resetAllProviderStates();
    jest.clearAllMocks();
  },

  // State management
  getProviderStates: () => ({
    toast: providerMockUtils.getToastState(),
    form: providerMockUtils.getFormState(),
    theme: providerMockUtils.getThemeState(),
    session: providerMockUtils.getSessionState(),
  }),

  // Validation
  validate: () => providerMockUtils.validateProviderMocks(),

  // Enhanced stack management utilities (Task B3.2)
  stack: {
    create: createProviderStack,
    createFromOptions: createProviderStackFromOptions,
    cleanup: cleanupProviderStack,
    reset: resetProviderStack,
    cleanupAll: cleanupAllProviderStacks,
    resetAllStates: resetAllProviderStates,
    getInfo: (stackId: string) => providerStackManager.getStackInfo(stackId),
    getDebugInfo: () => providerStackManager.getDebugInfo(),
    validate: () => providerStackManager.validateConfiguration(),
    manager: providerStackManager,
  },

  // Utilities
  utils: providerMockUtils,
};

/**
 * Provider mock test scenarios for integration
 */
export const integrationScenarios = {
  // Basic authenticated user scenario
  authenticatedUser: (
    userOverrides: Partial<Session> = {}
  ): ProviderMockOptions => ({
    toast: { enabled: true },
    form: { enabled: true },
    theme: { enabled: true, defaultTheme: 'light' },
    session: {
      enabled: true,
      session: {
        user: {
          id: 'test-user-id',
          name: 'Test User',
          email: 'test@example.com',
          image: 'https://example.com/avatar.jpg',
          ...userOverrides.user,
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        accessToken: 'mock-access-token',
        ...userOverrides,
      } as Session,
    },
  }),

  // Form with pre-filled data
  formWithData: (formData: Record<string, any> = {}): ProviderMockOptions => ({
    toast: { enabled: true },
    form: {
      enabled: true,
      formId: 'project-form',
      initialValues: {
        name: 'Test Project',
        description: 'Test Description',
        device_type: 'Test Device',
        intended_use: 'Test intended use for medical device',
        ...formData,
      },
    },
    theme: { enabled: true, defaultTheme: 'light' },
    session: { enabled: true },
  }),

  // Dark theme scenario
  darkTheme: (): ProviderMockOptions => ({
    toast: { enabled: true },
    form: { enabled: true },
    theme: { enabled: true, defaultTheme: 'dark' },
    session: { enabled: true },
  }),

  // Minimal providers (only essential ones)
  minimal: (): ProviderMockOptions => ({
    toast: { enabled: false },
    form: { enabled: false },
    theme: { enabled: false },
    session: { enabled: false },
  }),

  // All providers with notifications
  withNotifications: (toasts: any[] = []): ProviderMockOptions => ({
    toast: {
      enabled: true,
      initialToasts: [
        {
          title: 'System Ready',
          description: 'All systems are operational',
          variant: 'success',
        },
        ...toasts,
      ],
    },
    form: { enabled: true },
    theme: { enabled: true, defaultTheme: 'light' },
    session: { enabled: true },
  }),
};

/**
 * Integration with global mock registry
 */
export const registerProviderMocks = () => {
  if (typeof global !== 'undefined' && (global as any).__GLOBAL_MOCK_REGISTRY) {
    // Register provider mocks in global registry
    (global as any).__GLOBAL_MOCK_REGISTRY.register(
      'providers',
      'toast',
      'MockToastProvider'
    );
    (global as any).__GLOBAL_MOCK_REGISTRY.register(
      'providers',
      'form',
      'MockFormProvider'
    );
    (global as any).__GLOBAL_MOCK_REGISTRY.register(
      'providers',
      'theme',
      'MockThemeProvider'
    );
    (global as any).__GLOBAL_MOCK_REGISTRY.register(
      'providers',
      'session',
      'MockSessionProvider'
    );
    (global as any).__GLOBAL_MOCK_REGISTRY.register(
      'providers',
      'stack',
      'MockProviderStack'
    );
  }
};

/**
 * Cleanup provider mocks from global registry
 */
export const unregisterProviderMocks = () => {
  if (typeof global !== 'undefined' && (global as any).__GLOBAL_MOCK_REGISTRY) {
    // Clear provider mocks from global registry
    const registry = (global as any).__GLOBAL_MOCK_REGISTRY;
    if (registry.providers) {
      registry.providers.clear();
    }
  }
};

// Export main integration components
export { MockProviderStack, providerMockUtils };

export default {
  EnhancedTestProviders,
  createEnhancedWrapper,
  integration: providerMockIntegration,
  scenarios: integrationScenarios,
  register: registerProviderMocks,
  unregister: unregisterProviderMocks,
  // Enhanced Provider Stack Management (Task B3.2)
  ProviderStack: EnhancedProviderStack,
  stackUtils: providerStackUtils,
  stackManager: providerStackManager,
};
