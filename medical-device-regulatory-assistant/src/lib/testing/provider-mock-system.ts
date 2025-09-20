/**
 * Provider Mock System for Test Isolation
 * Implements toast, form, theme, and context provider mocks
 * Requirements: 2.4, 7.1
 */

import React, { ReactNode, createContext, useContext } from 'react';
import { Session } from 'next-auth';
import { useToastMock } from './use-toast-mock';
import { enhancedFormMocks } from './enhanced-form-hook-mocks';

// ============================================================================
// Toast Provider Mock System
// ============================================================================

export interface ToastContextValue {
  toasts: Array<{
    id: string;
    title?: string;
    description?: string;
    variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info';
    duration?: number;
  }>;
  addToast: (toast: any) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

// Mock toast context
const MockToastContext = createContext<ToastContextValue | undefined>(
  undefined
);

let mockToastState = {
  toasts: [] as ToastContextValue['toasts'],
  nextId: 1,
};

export const MockToastProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const addToast = jest.fn((toast: any) => {
    const newToast = {
      id: `toast-${mockToastState.nextId++}`,
      ...toast,
    };
    mockToastState.toasts.push(newToast);

    // Auto-remove after duration
    if (toast.duration !== Infinity) {
      setTimeout(() => {
        removeToast(newToast.id);
      }, toast.duration || 5000);
    }
  });

  const removeToast = jest.fn((id: string) => {
    mockToastState.toasts = mockToastState.toasts.filter(
      (toast) => toast.id !== id
    );
  });

  const clearToasts = jest.fn(() => {
    mockToastState.toasts = [];
  });

  const contextValue: ToastContextValue = {
    toasts: mockToastState.toasts,
    addToast,
    removeToast,
    clearToasts,
  };

  return React.createElement(
    MockToastContext.Provider,
    { value: contextValue },
    children
  );
};

export const useMockToastContext = () => {
  const context = useContext(MockToastContext);
  if (!context) {
    throw new Error(
      'useMockToastContext must be used within MockToastProvider'
    );
  }
  return context;
};

// ============================================================================
// Form Provider Mock System
// ============================================================================

export interface FormContextValue {
  formId: string;
  isSubmitting: boolean;
  isDirty: boolean;
  errors: Record<string, any>;
  values: Record<string, any>;
  setFieldValue: (name: string, value: any) => void;
  setFieldError: (name: string, error: any) => void;
  clearFieldError: (name: string) => void;
  resetForm: () => void;
  submitForm: () => Promise<void>;
}

const MockFormContext = createContext<FormContextValue | undefined>(undefined);

let mockFormState = {
  formId: 'test-form',
  isSubmitting: false,
  isDirty: false,
  errors: {} as Record<string, any>,
  values: {} as Record<string, any>,
};

export const MockFormProvider: React.FC<{
  children: ReactNode;
  formId?: string;
  initialValues?: Record<string, any>;
}> = ({ children, formId = 'test-form', initialValues = {} }) => {
  // Initialize form state
  React.useEffect(() => {
    mockFormState = {
      formId,
      isSubmitting: false,
      isDirty: false,
      errors: {},
      values: { ...initialValues },
    };
  }, [formId, initialValues]);

  const setFieldValue = jest.fn((name: string, value: any) => {
    mockFormState.values[name] = value;
    mockFormState.isDirty = true;

    // Clear error when value changes
    if (mockFormState.errors[name]) {
      delete mockFormState.errors[name];
    }
  });

  const setFieldError = jest.fn((name: string, error: any) => {
    mockFormState.errors[name] = error;
  });

  const clearFieldError = jest.fn((name: string) => {
    delete mockFormState.errors[name];
  });

  const resetForm = jest.fn(() => {
    mockFormState = {
      formId,
      isSubmitting: false,
      isDirty: false,
      errors: {},
      values: { ...initialValues },
    };
  });

  const submitForm = jest.fn(async () => {
    mockFormState.isSubmitting = true;

    // Simulate async submission
    await new Promise((resolve) => setTimeout(resolve, 100));

    mockFormState.isSubmitting = false;
    mockFormState.isDirty = false;
  });

  const contextValue: FormContextValue = {
    formId: mockFormState.formId,
    isSubmitting: mockFormState.isSubmitting,
    isDirty: mockFormState.isDirty,
    errors: mockFormState.errors,
    values: mockFormState.values,
    setFieldValue,
    setFieldError,
    clearFieldError,
    resetForm,
    submitForm,
  };

  return React.createElement(
    MockFormContext.Provider,
    { value: contextValue },
    children
  );
};

export const useMockFormContext = () => {
  const context = useContext(MockFormContext);
  if (!context) {
    throw new Error('useMockFormContext must be used within MockFormProvider');
  }
  return context;
};

// ============================================================================
// Theme Provider Mock System
// ============================================================================

export interface ThemeContextValue {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  resolvedTheme: 'light' | 'dark';
  systemTheme: 'light' | 'dark';
}

const MockThemeContext = createContext<ThemeContextValue | undefined>(
  undefined
);

let mockThemeState = {
  theme: 'light' as 'light' | 'dark' | 'system',
  resolvedTheme: 'light' as 'light' | 'dark',
  systemTheme: 'light' as 'light' | 'dark',
};

export const MockThemeProvider: React.FC<{
  children: ReactNode;
  defaultTheme?: 'light' | 'dark' | 'system';
}> = ({ children, defaultTheme = 'light' }) => {
  React.useEffect(() => {
    mockThemeState.theme = defaultTheme;
    mockThemeState.resolvedTheme =
      defaultTheme === 'system' ? 'light' : defaultTheme;
  }, [defaultTheme]);

  const setTheme = jest.fn((theme: 'light' | 'dark' | 'system') => {
    mockThemeState.theme = theme;
    mockThemeState.resolvedTheme =
      theme === 'system' ? mockThemeState.systemTheme : theme;

    // Update document class for theme switching
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('light', 'dark');
      document.documentElement.classList.add(mockThemeState.resolvedTheme);
    }
  });

  const contextValue: ThemeContextValue = {
    theme: mockThemeState.theme,
    setTheme,
    resolvedTheme: mockThemeState.resolvedTheme,
    systemTheme: mockThemeState.systemTheme,
  };

  return React.createElement(
    MockThemeContext.Provider,
    { value: contextValue },
    children
  );
};

export const useMockThemeContext = () => {
  const context = useContext(MockThemeContext);
  if (!context) {
    throw new Error(
      'useMockThemeContext must be used within MockThemeProvider'
    );
  }
  return context;
};

// ============================================================================
// Session Provider Mock System
// ============================================================================

export interface SessionContextValue {
  data: Session | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  update: (data?: any) => Promise<Session | null>;
}

const MockSessionContext = createContext<SessionContextValue | undefined>(
  undefined
);

let mockSessionState = {
  data: null as Session | null,
  status: 'unauthenticated' as 'loading' | 'authenticated' | 'unauthenticated',
};

export const MockSessionProvider: React.FC<{
  children: ReactNode;
  session?: Session | null;
}> = ({ children, session = null }) => {
  React.useEffect(() => {
    mockSessionState.data = session;
    mockSessionState.status = session ? 'authenticated' : 'unauthenticated';
  }, [session]);

  const update = jest.fn(async (data?: any) => {
    if (data) {
      mockSessionState.data = { ...mockSessionState.data, ...data } as Session;
    }
    return mockSessionState.data;
  });

  const contextValue: SessionContextValue = {
    data: mockSessionState.data,
    status: mockSessionState.status,
    update,
  };

  return React.createElement(
    MockSessionContext.Provider,
    { value: contextValue },
    children
  );
};

export const useMockSessionContext = () => {
  const context = useContext(MockSessionContext);
  if (!context) {
    throw new Error(
      'useMockSessionContext must be used within MockSessionProvider'
    );
  }
  return context;
};

// ============================================================================
// Composite Provider Mock System
// ============================================================================

export interface ProviderMockOptions {
  toast?: {
    enabled: boolean;
    initialToasts?: any[];
  };
  form?: {
    enabled: boolean;
    formId?: string;
    initialValues?: Record<string, any>;
  };
  theme?: {
    enabled: boolean;
    defaultTheme?: 'light' | 'dark' | 'system';
  };
  session?: {
    enabled: boolean;
    session?: Session | null;
  };
}

export const MockProviderStack: React.FC<{
  children: ReactNode;
  options?: ProviderMockOptions;
}> = ({ children, options = {} }) => {
  const {
    toast = { enabled: true },
    form = { enabled: true },
    theme = { enabled: true },
    session = { enabled: true },
  } = options;

  let wrappedChildren = children;

  // Wrap with session provider if enabled
  if (session.enabled) {
    wrappedChildren = React.createElement(
      MockSessionProvider,
      { session: session.session },
      wrappedChildren
    );
  }

  // Wrap with theme provider if enabled
  if (theme.enabled) {
    wrappedChildren = React.createElement(
      MockThemeProvider,
      { defaultTheme: theme.defaultTheme },
      wrappedChildren
    );
  }

  // Wrap with form provider if enabled
  if (form.enabled) {
    wrappedChildren = React.createElement(
      MockFormProvider,
      {
        formId: form.formId,
        initialValues: form.initialValues,
      },
      wrappedChildren
    );
  }

  // Wrap with toast provider if enabled
  if (toast.enabled) {
    wrappedChildren = React.createElement(
      MockToastProvider,
      {},
      wrappedChildren
    );
  }

  return wrappedChildren as React.ReactElement;
};

// ============================================================================
// Provider Mock Registry and Management
// ============================================================================

export interface ProviderMockRegistry {
  toast: {
    provider: typeof MockToastProvider;
    context: typeof MockToastContext;
    hook: typeof useMockToastContext;
  };
  form: {
    provider: typeof MockFormProvider;
    context: typeof MockFormContext;
    hook: typeof useMockFormContext;
  };
  theme: {
    provider: typeof MockThemeProvider;
    context: typeof MockThemeContext;
    hook: typeof useMockThemeContext;
  };
  session: {
    provider: typeof MockSessionProvider;
    context: typeof MockSessionContext;
    hook: typeof useMockSessionContext;
  };
}

export const providerMockRegistry: ProviderMockRegistry = {
  toast: {
    provider: MockToastProvider,
    context: MockToastContext,
    hook: useMockToastContext,
  },
  form: {
    provider: MockFormProvider,
    context: MockFormContext,
    hook: useMockFormContext,
  },
  theme: {
    provider: MockThemeProvider,
    context: MockThemeContext,
    hook: useMockThemeContext,
  },
  session: {
    provider: MockSessionProvider,
    context: MockSessionContext,
    hook: useMockSessionContext,
  },
};

// ============================================================================
// Provider Mock Utilities
// ============================================================================

export const providerMockUtils = {
  // Toast utilities
  getToastState: () => ({ ...mockToastState }),
  setToastState: (state: Partial<typeof mockToastState>) => {
    mockToastState = { ...mockToastState, ...state };
  },
  clearToastState: () => {
    mockToastState = { toasts: [], nextId: 1 };
  },
  addMockToast: (toast: any) => {
    const newToast = {
      id: `toast-${mockToastState.nextId++}`,
      ...toast,
    };
    mockToastState.toasts.push(newToast);
    return newToast;
  },

  // Form utilities
  getFormState: () => ({ ...mockFormState }),
  setFormState: (state: Partial<typeof mockFormState>) => {
    mockFormState = { ...mockFormState, ...state };
  },
  clearFormState: () => {
    mockFormState = {
      formId: 'test-form',
      isSubmitting: false,
      isDirty: false,
      errors: {},
      values: {},
    };
  },

  // Theme utilities
  getThemeState: () => ({ ...mockThemeState }),
  setThemeState: (state: Partial<typeof mockThemeState>) => {
    mockThemeState = { ...mockThemeState, ...state };
  },
  clearThemeState: () => {
    mockThemeState = {
      theme: 'light',
      resolvedTheme: 'light',
      systemTheme: 'light',
    };
  },

  // Session utilities
  getSessionState: () => ({ ...mockSessionState }),
  setSessionState: (state: Partial<typeof mockSessionState>) => {
    mockSessionState = { ...mockSessionState, ...state };
  },
  clearSessionState: () => {
    mockSessionState = {
      data: null,
      status: 'unauthenticated',
    };
  },

  // Global utilities
  clearAllProviderStates: () => {
    mockToastState = { toasts: [], nextId: 1 };
    mockFormState = {
      formId: 'test-form',
      isSubmitting: false,
      isDirty: false,
      errors: {},
      values: {},
    };
    mockThemeState = {
      theme: 'light',
      resolvedTheme: 'light',
      systemTheme: 'light',
    };
    mockSessionState = {
      data: null,
      status: 'unauthenticated',
    };
  },

  // Provider composition utilities
  createProviderStack: (options: ProviderMockOptions) => {
    return ({ children }: { children: ReactNode }) =>
      React.createElement(MockProviderStack, { options }, children);
  },

  // Mock validation utilities
  validateProviderMocks: () => {
    const results = {
      toast: {
        provider: typeof MockToastProvider === 'function',
        context: MockToastContext !== undefined,
        hook: typeof useMockToastContext === 'function',
      },
      form: {
        provider: typeof MockFormProvider === 'function',
        context: MockFormContext !== undefined,
        hook: typeof useMockFormContext === 'function',
      },
      theme: {
        provider: typeof MockThemeProvider === 'function',
        context: MockThemeContext !== undefined,
        hook: typeof useMockThemeContext === 'function',
      },
      session: {
        provider: typeof MockSessionProvider === 'function',
        context: MockSessionContext !== undefined,
        hook: typeof useMockSessionContext === 'function',
      },
    };

    const allValid = Object.values(results).every((provider) =>
      Object.values(provider).every(Boolean)
    );

    return { results, allValid };
  },
};

// ============================================================================
// Jest Mock Setup Integration
// ============================================================================

export const setupProviderMocks = () => {
  // Mock next-auth/react
  jest.doMock('next-auth/react', () => ({
    SessionProvider: MockSessionProvider,
    useSession: useMockSessionContext,
    signIn: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(() => Promise.resolve(mockSessionState.data)),
  }));

  // Mock toast hooks if they exist
  jest.doMock('@/hooks/use-toast', () => ({
    useToast: useToastMock.useToast,
    toast: useToastMock.toast,
  }));

  // Mock theme provider if it exists
  jest.doMock('next-themes', () => ({
    ThemeProvider: MockThemeProvider,
    useTheme: useMockThemeContext,
  }));

  // Register providers in global mock registry
  if ((global as any).__GLOBAL_MOCK_REGISTRY) {
    (global as any).__GLOBAL_MOCK_REGISTRY.register(
      'providers',
      'toast',
      MockToastProvider
    );
    (global as any).__GLOBAL_MOCK_REGISTRY.register(
      'providers',
      'form',
      MockFormProvider
    );
    (global as any).__GLOBAL_MOCK_REGISTRY.register(
      'providers',
      'theme',
      MockThemeProvider
    );
    (global as any).__GLOBAL_MOCK_REGISTRY.register(
      'providers',
      'session',
      MockSessionProvider
    );
  }
};

export const cleanupProviderMocks = () => {
  // Clear all provider states
  providerMockUtils.clearAllProviderStates();

  // Clear jest mocks
  jest.clearAllMocks();
};

// Export all provider mocks and utilities
export {
  MockToastProvider,
  MockFormProvider,
  MockThemeProvider,
  MockSessionProvider,
  MockProviderStack,
  useMockToastContext,
  useMockFormContext,
  useMockThemeContext,
  useMockSessionContext,
};

export default {
  providers: {
    MockToastProvider,
    MockFormProvider,
    MockThemeProvider,
    MockSessionProvider,
    MockProviderStack,
  },
  hooks: {
    useMockToastContext,
    useMockFormContext,
    useMockThemeContext,
    useMockSessionContext,
  },
  registry: providerMockRegistry,
  utils: providerMockUtils,
  setup: setupProviderMocks,
  cleanup: cleanupProviderMocks,
};
