/**
 * Isolated Test Provider System
 *
 * Provides completely isolated test providers that don't depend on production implementations.
 * This system ensures tests run in complete isolation without external provider dependencies.
 */

import { Session } from 'next-auth';
import React, {
  ReactNode,
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
} from 'react';

// ============================================================================
// Session Provider Isolation
// ============================================================================

interface IsolatedSessionContextValue {
  data: Session | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  update: (data?: Partial<Session>) => Promise<Session | null>;
}

const IsolatedSessionContext = createContext<IsolatedSessionContextValue>({
  data: null,
  status: 'unauthenticated',
  update: async () => null,
});

interface IsolatedSessionProviderProps {
  children: ReactNode;
  session?: Session | null;
  status?: 'loading' | 'authenticated' | 'unauthenticated';
}

export const IsolatedSessionProvider: React.FC<
  IsolatedSessionProviderProps
> = ({ children, session = null, status: initialStatus }) => {
  const [currentSession, setCurrentSession] = useState<Session | null>(session);
  const [currentStatus, setCurrentStatus] = useState<
    'loading' | 'authenticated' | 'unauthenticated'
  >(initialStatus || (session ? 'authenticated' : 'unauthenticated'));

  const update = useCallback(
    async (data?: Partial<Session>): Promise<Session | null> => {
      if (data) {
        setCurrentSession(data);
        setCurrentStatus('authenticated');
        return data;
      } 
        setCurrentSession(null);
        setCurrentStatus('unauthenticated');
        return null;
      
    },
    []
  );

  const value = useMemo(
    () => ({
      data: currentSession,
      status: currentStatus,
      update,
    }),
    [currentSession, currentStatus, update]
  );

  return (
    <IsolatedSessionContext.Provider value={value}>
      {children}
    </IsolatedSessionContext.Provider>
  );
};

export const useIsolatedSession = () => {
  const context = useContext(IsolatedSessionContext);
  if (!context) {
    throw new Error(
      'useIsolatedSession must be used within an IsolatedSessionProvider'
    );
  }
  return context;
};

// ============================================================================
// Theme Provider Isolation
// ============================================================================

interface IsolatedThemeContextValue {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  resolvedTheme: 'light' | 'dark';
}

const IsolatedThemeContext = createContext<IsolatedThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
  resolvedTheme: 'light',
});

interface IsolatedThemeProviderProps {
  children: ReactNode;
  defaultTheme?: 'light' | 'dark' | 'system';
  forcedTheme?: 'light' | 'dark';
}

export const IsolatedThemeProvider: React.FC<IsolatedThemeProviderProps> = ({
  children,
  defaultTheme = 'system',
  forcedTheme,
}) => {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>(defaultTheme);

  const resolvedTheme = useMemo(() => {
    if (forcedTheme) return forcedTheme;
    if (theme === 'system') {
      // Mock system preference as light for testing
      return 'light';
    }
    return theme;
  }, [theme, forcedTheme]);

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
    }),
    [theme, resolvedTheme]
  );

  return (
    <IsolatedThemeContext.Provider value={value}>
      {children}
    </IsolatedThemeContext.Provider>
  );
};

export const useIsolatedTheme = () => {
  const context = useContext(IsolatedThemeContext);
  if (!context) {
    throw new Error(
      'useIsolatedTheme must be used within an IsolatedThemeProvider'
    );
  }
  return context;
};

// ============================================================================
// Form State Provider Isolation
// ============================================================================

interface FormFieldState {
  value: string | number | boolean | null;
  error?: string;
  touched: boolean;
  dirty: boolean;
}

interface IsolatedFormContextValue {
  fields: Record<string, FormFieldState>;
  setFieldValue: (
    name: string,
    value: string | number | boolean | null
  ) => void;
  setFieldError: (name: string, error: string) => void;
  setFieldTouched: (name: string, touched: boolean) => void;
  resetForm: () => void;
  isSubmitting: boolean;
  setSubmitting: (submitting: boolean) => void;
  submitCount: number;
  isValid: boolean;
}

const IsolatedFormContext = createContext<IsolatedFormContextValue | null>(
  null
);

interface IsolatedFormProviderProps {
  children: ReactNode;
  initialValues?: Record<string, string | number | boolean | null>;
}

export const IsolatedFormProvider: React.FC<IsolatedFormProviderProps> = ({
  children,
  initialValues = {},
}) => {
  const [fields, setFields] = useState<Record<string, FormFieldState>>(() => {
    const initialFields: Record<string, FormFieldState> = {};
    Object.entries(initialValues).forEach(([name, value]) => {
      initialFields[name] = {
        value,
        touched: false,
        dirty: false,
      };
    });
    return initialFields;
  });

  const [isSubmitting, setSubmitting] = useState(false);
  const [submitCount, setSubmitCount] = useState(0);

  const setFieldValue = useCallback(
    (name: string, value: string | number | boolean | null) => {
      setFields((prev) => ({
        ...prev,
        [name]: {
          ...prev[name],
          value,
          dirty: value !== initialValues[name],
        },
      }));
    },
    [initialValues]
  );

  const setFieldError = useCallback((name: string, error: string) => {
    setFields((prev) => ({
      ...prev,
      [name]: {
        ...prev[name],
        error,
      },
    }));
  }, []);

  const setFieldTouched = useCallback((name: string, touched: boolean) => {
    setFields((prev) => ({
      ...prev,
      [name]: {
        ...prev[name],
        touched,
      },
    }));
  }, []);

  const resetForm = useCallback(() => {
    const resetFields: Record<string, FormFieldState> = {};
    Object.entries(initialValues).forEach(([name, value]) => {
      resetFields[name] = {
        value,
        touched: false,
        dirty: false,
      };
    });
    setFields(resetFields);
    setSubmitting(false);
    setSubmitCount(0);
  }, [initialValues]);

  const isValid = useMemo(() => Object.values(fields).every((field) => !field.error), [fields]);

  const value = useMemo(
    () => ({
      fields,
      setFieldValue,
      setFieldError,
      setFieldTouched,
      resetForm,
      isSubmitting,
      setSubmitting: (submitting: boolean) => {
        setSubmitting(submitting);
        if (submitting) {
          setSubmitCount((prev) => prev + 1);
        }
      },
      submitCount,
      isValid,
    }),
    [
      fields,
      setFieldValue,
      setFieldError,
      setFieldTouched,
      resetForm,
      isSubmitting,
      submitCount,
      isValid,
    ]
  );

  return (
    <IsolatedFormContext.Provider value={value}>
      {children}
    </IsolatedFormContext.Provider>
  );
};

export const useIsolatedForm = () => {
  const context = useContext(IsolatedFormContext);
  if (!context) {
    throw new Error(
      'useIsolatedForm must be used within an IsolatedFormProvider'
    );
  }
  return context;
};

// ============================================================================
// Toast Provider Isolation
// ============================================================================

interface ToastMessage {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  duration?: number;
}

interface IsolatedToastContextValue {
  toasts: ToastMessage[];
  toast: (message: Omit<ToastMessage, 'id'>) => string;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}

const IsolatedToastContext = createContext<IsolatedToastContextValue | null>(
  null
);

interface IsolatedToastProviderProps {
  children: ReactNode;
}

export const IsolatedToastProvider: React.FC<IsolatedToastProviderProps> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = useCallback((message: Omit<ToastMessage, 'id'>): string => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastMessage = {
      id,
      ...message,
    };

    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after duration
    if (message.duration !== 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, message.duration || 5000);
    }

    return id;
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const value = useMemo(
    () => ({
      toasts,
      toast,
      dismiss,
      dismissAll,
    }),
    [toasts, toast, dismiss, dismissAll]
  );

  return (
    <IsolatedToastContext.Provider value={value}>
      {children}
    </IsolatedToastContext.Provider>
  );
};

export const useIsolatedToast = () => {
  const context = useContext(IsolatedToastContext);
  if (!context) {
    throw new Error(
      'useIsolatedToast must be used within an IsolatedToastProvider'
    );
  }
  return context;
};

// ============================================================================
// Router Provider Isolation
// ============================================================================

interface IsolatedRouterContextValue {
  pathname: string;
  query: Record<string, string | string[]>;
  push: (url: string) => Promise<boolean>;
  replace: (url: string) => Promise<boolean>;
  back: () => void;
  forward: () => void;
  refresh: () => void;
  prefetch: (url: string) => Promise<void>;
}

const IsolatedRouterContext = createContext<IsolatedRouterContextValue | null>(
  null
);

interface IsolatedRouterProviderProps {
  children: ReactNode;
  initialPath?: string;
  initialQuery?: Record<string, string | string[]>;
}

export const IsolatedRouterProvider: React.FC<IsolatedRouterProviderProps> = ({
  children,
  initialPath = '/',
  initialQuery = {},
}) => {
  const [pathname, setPathname] = useState(initialPath);
  const [query, setQuery] = useState(initialQuery);

  const push = useCallback(async (url: string): Promise<boolean> => {
    const [path, queryString] = url.split('?');
    setPathname(path);

    if (queryString) {
      const newQuery: Record<string, string | string[]> = {};
      const params = new URLSearchParams(queryString);
      params.forEach((value, key) => {
        newQuery[key] = value;
      });
      setQuery(newQuery);
    } else {
      setQuery({});
    }

    return true;
  }, []);

  const replace = useCallback(
    async (url: string): Promise<boolean> => push(url),
    [push]
  );

  const back = useCallback(() => {
    // Mock implementation - in real tests, you might want to maintain history
    console.log('Router back called');
  }, []);

  const forward = useCallback(() => {
    // Mock implementation
    console.log('Router forward called');
  }, []);

  const refresh = useCallback(() => {
    // Mock implementation
    console.log('Router refresh called');
  }, []);

  const prefetch = useCallback(async (url: string): Promise<void> => {
    // Mock implementation
    console.log('Router prefetch called for:', url);
  }, []);

  const value = useMemo(
    () => ({
      pathname,
      query,
      push,
      replace,
      back,
      forward,
      refresh,
      prefetch,
    }),
    [pathname, query, push, replace, back, forward, refresh, prefetch]
  );

  return (
    <IsolatedRouterContext.Provider value={value}>
      {children}
    </IsolatedRouterContext.Provider>
  );
};

export const useIsolatedRouter = () => {
  const context = useContext(IsolatedRouterContext);
  if (!context) {
    throw new Error(
      'useIsolatedRouter must be used within an IsolatedRouterProvider'
    );
  }
  return context;
};

// ============================================================================
// Composite Provider System
// ============================================================================

interface IsolatedProviderComposition {
  session?: {
    session?: Session | null;
    status?: 'loading' | 'authenticated' | 'unauthenticated';
  };
  theme?: {
    defaultTheme?: 'light' | 'dark' | 'system';
    forcedTheme?: 'light' | 'dark';
  };
  form?: {
    initialValues?: Record<string, string | number | boolean | null>;
  };
  router?: {
    initialPath?: string;
    initialQuery?: Record<string, string | string[]>;
  };
  toast?: boolean;
}

interface IsolatedTestProvidersProps {
  children: ReactNode;
  providers?: IsolatedProviderComposition;
}

export const IsolatedTestProviders: React.FC<IsolatedTestProvidersProps> = ({
  children,
  providers = {},
}) => {
  let content = children;

  // Wrap with toast provider if requested
  if (providers.toast !== false) {
    content = <IsolatedToastProvider>{content}</IsolatedToastProvider>;
  }

  // Wrap with router provider if configured
  if (providers.router) {
    content = (
      <IsolatedRouterProvider
        initialPath={providers.router.initialPath}
        initialQuery={providers.router.initialQuery}
      >
        {content}
      </IsolatedRouterProvider>
    );
  }

  // Wrap with form provider if configured
  if (providers.form) {
    content = (
      <IsolatedFormProvider initialValues={providers.form.initialValues}>
        {content}
      </IsolatedFormProvider>
    );
  }

  // Wrap with theme provider if configured
  if (providers.theme) {
    content = (
      <IsolatedThemeProvider
        defaultTheme={providers.theme.defaultTheme}
        forcedTheme={providers.theme.forcedTheme}
      >
        {content}
      </IsolatedThemeProvider>
    );
  }

  // Wrap with session provider if configured
  if (providers.session) {
    content = (
      <IsolatedSessionProvider
        session={providers.session.session}
        status={providers.session.status}
      >
        {content}
      </IsolatedSessionProvider>
    );
  }

  return <>{content}</>;
};

// ============================================================================
// Provider Reset and Cleanup System
// ============================================================================

interface ProviderCleanupRegistry {
  session: (() => void)[];
  theme: (() => void)[];
  form: (() => void)[];
  toast: (() => void)[];
  router: (() => void)[];
}

class IsolatedProviderManager {
  private cleanupRegistry: ProviderCleanupRegistry = {
    session: [],
    theme: [],
    form: [],
    toast: [],
    router: [],
  };

  registerCleanup(
    providerType: keyof ProviderCleanupRegistry,
    cleanup: () => void
  ) {
    this.cleanupRegistry[providerType].push(cleanup);
  }

  resetProvider(providerType: keyof ProviderCleanupRegistry) {
    this.cleanupRegistry[providerType].forEach((cleanup) => cleanup());
    this.cleanupRegistry[providerType] = [];
  }

  resetAllProviders() {
    Object.keys(this.cleanupRegistry).forEach((providerType) => {
      this.resetProvider(providerType as keyof ProviderCleanupRegistry);
    });
  }

  cleanup() {
    this.resetAllProviders();
  }
}

export const isolatedProviderManager = new IsolatedProviderManager();

// ============================================================================
// Utility Functions
// ============================================================================

export const createIsolatedProviderPreset = (
  name: string,
  config: IsolatedProviderComposition
) => ({
    name,
    config,
    apply: (children: ReactNode) => (
      <IsolatedTestProviders providers={config}>
        {children}
      </IsolatedTestProviders>
    ),
  });

// Common presets
export const isolatedProviderPresets = {
  minimal: createIsolatedProviderPreset('minimal', {}),

  authenticated: createIsolatedProviderPreset('authenticated', {
    session: {
      session: {
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } as Session,
      status: 'authenticated',
    },
    toast: true,
  }),

  unauthenticated: createIsolatedProviderPreset('unauthenticated', {
    session: {
      session: null,
      status: 'unauthenticated',
    },
    toast: true,
  }),

  formTesting: createIsolatedProviderPreset('formTesting', {
    session: {
      session: {
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } as Session,
      status: 'authenticated',
    },
    form: {
      initialValues: {},
    },
    toast: true,
  }),

  complete: createIsolatedProviderPreset('complete', {
    session: {
      session: {
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } as Session,
      status: 'authenticated',
    },
    theme: {
      defaultTheme: 'light',
    },
    form: {
      initialValues: {},
    },
    router: {
      initialPath: '/',
      initialQuery: {},
    },
    toast: true,
  }),
};

const defaultExport = {
  IsolatedTestProviders,
  IsolatedSessionProvider,
  IsolatedThemeProvider,
  IsolatedFormProvider,
  IsolatedToastProvider,
  IsolatedRouterProvider,
  useIsolatedSession,
  useIsolatedTheme,
  useIsolatedForm,
  useIsolatedToast,
  useIsolatedRouter,
  isolatedProviderManager,
  isolatedProviderPresets,
  createIsolatedProviderPreset,
};

export default defaultExport;
