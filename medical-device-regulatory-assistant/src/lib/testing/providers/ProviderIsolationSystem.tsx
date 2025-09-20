/**
 * Provider Isolation System Integration
 *
 * Integrates isolated providers with the existing renderWithProviders system
 * and provides advanced provider composition and testing patterns.
 */

import React, { ReactElement, ReactNode } from 'react';
import { RenderOptions, RenderResult, render } from '@testing-library/react';
import { Session } from 'next-auth';

import {
  IsolatedTestProviders,
  IsolatedProviderComposition,
  isolatedProviderManager,
  isolatedProviderPresets,
  useIsolatedSession,
  useIsolatedTheme,
  useIsolatedForm,
  useIsolatedToast,
  useIsolatedRouter,
} from './IsolatedTestProviders';

// ============================================================================
// Enhanced Provider Isolation Options
// ============================================================================

interface ProviderIsolationOptions {
  // Isolation mode
  isolationMode: 'complete' | 'partial' | 'hybrid';

  // Provider configuration
  providers?: IsolatedProviderComposition;

  // Preset selection
  preset?: keyof typeof isolatedProviderPresets;

  // Fallback behavior
  fallbackToProduction?: boolean;

  // Cleanup configuration
  autoCleanup?: boolean;
  cleanupBetweenTests?: boolean;

  // Debug options
  debugMode?: boolean;
  logProviderState?: boolean;
}

interface EnhancedRenderWithProvidersOptions
  extends Omit<RenderOptions, 'wrapper'> {
  // Legacy options for backward compatibility
  session?: Session | null;
  router?: {
    pathname?: string;
    query?: Record<string, string | string[]>;
  };
  mockConfig?: Record<string, unknown>;

  // New provider isolation options
  providerIsolation?: ProviderIsolationOptions;

  // Error handling
  errorBoundary?: boolean;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

// ============================================================================
// Provider State Management
// ============================================================================

interface ProviderState {
  session: {
    data: Session | null;
    status: string;
  };
  theme: {
    theme: string;
    resolvedTheme: string;
  };
  form: {
    fields: Record<string, FormFieldState>;
    isSubmitting: boolean;
    isValid: boolean;
  };
  toast: {
    toasts: ToastMessage[];
  };
  router: {
    pathname: string;
    query: Record<string, string | string[]>;
  };
}

interface FormFieldState {
  value: string | number | boolean | null;
  error?: string;
  touched: boolean;
  dirty: boolean;
}

interface ToastMessage {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning';
  duration?: number;
}

class ProviderStateManager {
  private currentState: Partial<ProviderState> = {};
  private stateHistory: Partial<ProviderState>[] = [];
  private debugMode = false;

  setDebugMode(enabled: boolean) {
    this.debugMode = enabled;
  }

  captureState(): Partial<ProviderState> {
    // This would be called by the isolated providers to capture their state
    return { ...this.currentState };
  }

  restoreState(state: Partial<ProviderState>) {
    this.currentState = { ...state };
    if (this.debugMode) {
      console.log('Provider state restored:', state);
    }
  }

  pushState() {
    this.stateHistory.push(this.captureState());
  }

  popState() {
    const previousState = this.stateHistory.pop();
    if (previousState) {
      this.restoreState(previousState);
    }
  }

  reset() {
    this.currentState = {};
    this.stateHistory = [];
    if (this.debugMode) {
      console.log('Provider state reset');
    }
  }

  getStateSnapshot(): Partial<ProviderState> {
    return { ...this.currentState };
  }
}

export const providerStateManager = new ProviderStateManager();

// ============================================================================
// Provider Composition System
// ============================================================================

interface ProviderCompositionRule {
  name: string;
  condition: (options: ProviderIsolationOptions) => boolean;
  apply: (children: ReactNode, options: ProviderIsolationOptions) => ReactNode;
  priority: number;
}

class ProviderCompositionEngine {
  private rules: ProviderCompositionRule[] = [];

  addRule(rule: ProviderCompositionRule) {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  compose(children: ReactNode, options: ProviderIsolationOptions): ReactNode {
    let result = children;

    for (const rule of this.rules) {
      if (rule.condition(options)) {
        result = rule.apply(result, options);
      }
    }

    return result;
  }
}

const compositionEngine = new ProviderCompositionEngine();

// Add default composition rules
compositionEngine.addRule({
  name: 'preset-application',
  condition: (options) => !!options.preset,
  apply: (children, options) => {
    const preset = isolatedProviderPresets[options.preset!];
    return preset.apply(children);
  },
  priority: 100,
});

compositionEngine.addRule({
  name: 'custom-providers',
  condition: (options) => !!options.providers && !options.preset,
  apply: (children, options) => (
    <IsolatedTestProviders providers={options.providers}>
      {children}
    </IsolatedTestProviders>
  ),
  priority: 90,
});

compositionEngine.addRule({
  name: 'minimal-fallback',
  condition: (options) => !options.preset && !options.providers,
  apply: (children) => (
    <IsolatedTestProviders providers={{}}>{children}</IsolatedTestProviders>
  ),
  priority: 10,
});

// ============================================================================
// Enhanced Render Function with Provider Isolation
// ============================================================================

export const renderWithIsolatedProviders = (
  ui: ReactElement,
  options: EnhancedRenderWithProvidersOptions = {}
): RenderResult & {
  providerState: ProviderStateManager;
  isolatedHooks: {
    useSession: typeof useIsolatedSession;
    useTheme: typeof useIsolatedTheme;
    useForm: typeof useIsolatedForm;
    useToast: typeof useIsolatedToast;
    useRouter: typeof useIsolatedRouter;
  };
  cleanup: () => void;
} => {
  const {
    providerIsolation = {
      isolationMode: 'complete',
      autoCleanup: true,
      cleanupBetweenTests: true,
    },
    errorBoundary = true,
    onError,
    ...renderOptions
  } = options;

  // Set up debug mode
  if (providerIsolation.debugMode) {
    providerStateManager.setDebugMode(true);
  }

  // Handle legacy options for backward compatibility
  if (options.session !== undefined || options.router !== undefined) {
    // Convert legacy options to new provider isolation format
    if (!providerIsolation.providers) {
      providerIsolation.providers = {};
    }

    if (options.session !== undefined) {
      providerIsolation.providers.session = {
        session: options.session,
        status: options.session ? 'authenticated' : 'unauthenticated',
      };
    }

    if (options.router !== undefined) {
      providerIsolation.providers.router = {
        initialPath: options.router.pathname || '/',
        initialQuery: options.router.query || {},
      };
    }
  }

  // Apply default preset if none specified
  if (!providerIsolation.preset && !providerIsolation.providers) {
    providerIsolation.preset = 'minimal';
  }

  // Capture initial state
  providerStateManager.pushState();

  // Create wrapper with provider composition
  const Wrapper = ({ children }: { children: ReactNode }) => {
    let content = compositionEngine.compose(children, providerIsolation);

    // Add error boundary if enabled
    if (errorBoundary) {
      const ErrorBoundary = ({ children }: { children: ReactNode }) => {
        const [hasError, setHasError] = React.useState(false);
        const [error, setError] = React.useState<Error | null>(null);

        React.useEffect(() => {
          const handleError = (event: ErrorEvent) => {
            setHasError(true);
            setError(new Error(event.message));
            onError?.(new Error(event.message), {} as React.ErrorInfo);
          };

          window.addEventListener('error', handleError);
          return () => window.removeEventListener('error', handleError);
        }, []);

        if (hasError && error) {
          return (
            <div data-testid="error-boundary">
              <h2>Test Error</h2>
              <p>{error.message}</p>
            </div>
          );
        }

        return <>{children}</>;
      };

      content = <ErrorBoundary>{content}</ErrorBoundary>;
    }

    return <>{content}</>;
  };

  // Render with isolated providers
  const result = render(ui, {
    wrapper: Wrapper,
    ...renderOptions,
  });

  // Create cleanup function
  const cleanup = () => {
    if (providerIsolation.autoCleanup) {
      isolatedProviderManager.cleanup();
      providerStateManager.popState();
    }

    if (providerIsolation.cleanupBetweenTests) {
      providerStateManager.reset();
    }
  };

  // Auto-cleanup on unmount
  if (providerIsolation.autoCleanup) {
    const originalUnmount = result.unmount;
    result.unmount = () => {
      cleanup();
      originalUnmount();
    };
  }

  return {
    ...result,
    providerState: providerStateManager,
    isolatedHooks: {
      useSession: useIsolatedSession,
      useTheme: useIsolatedTheme,
      useForm: useIsolatedForm,
      useToast: useIsolatedToast,
      useRouter: useIsolatedRouter,
    },
    cleanup,
  };
};

// ============================================================================
// Provider Testing Utilities
// ============================================================================

export const createProviderTestScenario = (
  name: string,
  config: {
    providers: IsolatedProviderComposition;
    setup?: () => void;
    teardown?: () => void;
    assertions?: (state: Partial<ProviderState>) => void;
  }
) => {
  return {
    name,
    config,
    run: async (testFn: () => Promise<void> | void) => {
      // Setup
      config.setup?.();

      try {
        // Run test
        await testFn();

        // Assertions
        if (config.assertions) {
          const state = providerStateManager.getStateSnapshot();
          config.assertions(state);
        }
      } finally {
        // Teardown
        config.teardown?.();
      }
    },
  };
};

export const providerTestScenarios = {
  authenticatedUser: createProviderTestScenario('authenticated-user', {
    providers: {
      session: {
        session: {
          user: { id: '1', name: 'Test User', email: 'test@example.com' },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        } as Session,
        status: 'authenticated',
      },
      toast: true,
    },
  }),

  unauthenticatedUser: createProviderTestScenario('unauthenticated-user', {
    providers: {
      session: {
        session: null,
        status: 'unauthenticated',
      },
      toast: true,
    },
  }),

  formWithValidation: createProviderTestScenario('form-with-validation', {
    providers: {
      form: {
        initialValues: {
          name: '',
          email: '',
          description: '',
        },
      },
      toast: true,
    },
  }),

  darkTheme: createProviderTestScenario('dark-theme', {
    providers: {
      theme: {
        forcedTheme: 'dark',
      },
    },
  }),
};

// ============================================================================
// Provider Isolation Patterns
// ============================================================================

export const providerIsolationPatterns = {
  // Complete isolation - no production dependencies
  completeIsolation: {
    isolationMode: 'complete' as const,
    providers: {},
    fallbackToProduction: false,
    autoCleanup: true,
    cleanupBetweenTests: true,
  },

  // Partial isolation - some production providers allowed
  partialIsolation: {
    isolationMode: 'partial' as const,
    fallbackToProduction: true,
    autoCleanup: true,
    cleanupBetweenTests: false,
  },

  // Hybrid approach - isolated for critical providers, production for others
  hybridIsolation: {
    isolationMode: 'hybrid' as const,
    providers: {
      session: { session: null, status: 'unauthenticated' as const },
      toast: true,
    },
    fallbackToProduction: true,
    autoCleanup: true,
    cleanupBetweenTests: true,
  },

  // Debug mode for troubleshooting
  debugIsolation: {
    isolationMode: 'complete' as const,
    providers: {},
    debugMode: true,
    logProviderState: true,
    autoCleanup: false,
    cleanupBetweenTests: false,
  },
} as const;

// ============================================================================
// Best Practices Documentation
// ============================================================================

export const providerIsolationBestPractices = {
  // Use complete isolation for unit tests
  unitTesting: providerIsolationPatterns.completeIsolation,

  // Use partial isolation for integration tests
  integrationTesting: providerIsolationPatterns.partialIsolation,

  // Use hybrid isolation for component tests
  componentTesting: providerIsolationPatterns.hybridIsolation,

  // Use debug isolation for troubleshooting
  debugging: providerIsolationPatterns.debugIsolation,
};

const defaultExport = {
  renderWithIsolatedProviders,
  providerStateManager,
  isolatedProviderManager,
  createProviderTestScenario,
  providerTestScenarios,
  providerIsolationPatterns,
  providerIsolationBestPractices,
};

export default defaultExport;
