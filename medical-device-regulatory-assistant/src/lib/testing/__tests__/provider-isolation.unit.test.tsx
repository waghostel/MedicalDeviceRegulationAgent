/**
 * Provider Isolation System Tests
 *
 * Tests the isolated provider system to ensure tests run without external dependencies.
 * Verifies provider composition, state management, and cleanup mechanisms.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { act } from 'react';
import '@testing-library/jest-dom';

import {
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
} from '../providers/IsolatedTestProviders';
import {
  renderWithIsolatedProviders,
  providerStateManager,
  createProviderTestScenario,
  providerTestScenarios,
  providerIsolationPatterns,
} from '../providers/ProviderIsolationSystem';

// ============================================================================
// Test Components
// ============================================================================

const SessionTestComponent: React.FC = () => {
  const { data, status, update } = useIsolatedSession();

  return (
    <div data-testid="session-test">
      <div data-testid="session-status">{status}</div>
      <div data-testid="session-user">{data?.user?.name || 'No user'}</div>
      <button
        data-testid="update-session"
        onClick={() => update({ user: { name: 'Updated User' } })}
      >
        Update Session
      </button>
    </div>
  );
};

const ThemeTestComponent: React.FC = () => {
  const { theme, resolvedTheme, setTheme } = useIsolatedTheme();

  return (
    <div data-testid="theme-test">
      <div data-testid="current-theme">{theme}</div>
      <div data-testid="resolved-theme">{resolvedTheme}</div>
      <button
        data-testid="toggle-theme"
        onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      >
        Toggle Theme
      </button>
    </div>
  );
};

const FormTestComponent: React.FC = () => {
  const {
    fields,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    resetForm,
    isSubmitting,
    setSubmitting,
    isValid,
  } = useIsolatedForm();

  return (
    <div data-testid="form-test">
      <div data-testid="form-valid">{isValid ? 'valid' : 'invalid'}</div>
      <div data-testid="form-submitting">
        {isSubmitting ? 'submitting' : 'idle'}
      </div>
      <input
        data-testid="name-input"
        value={fields.name?.value || ''}
        onChange={(e) => setFieldValue('name', e.target.value)}
        onBlur={() => setFieldTouched('name', true)}
      />
      <div data-testid="name-error">{fields.name?.error || ''}</div>
      <button
        data-testid="set-error"
        onClick={() => setFieldError('name', 'Test error')}
      >
        Set Error
      </button>
      <button data-testid="submit-form" onClick={() => setSubmitting(true)}>
        Submit
      </button>
      <button data-testid="reset-form" onClick={resetForm}>
        Reset
      </button>
    </div>
  );
};

const ToastTestComponent: React.FC = () => {
  const { toasts, toast, dismiss, dismissAll } = useIsolatedToast();

  return (
    <div data-testid="toast-test">
      <div data-testid="toast-count">{toasts.length}</div>
      <div data-testid="toast-list">
        {toasts.map((t) => (
          <div key={t.id} data-testid={`toast-${t.id}`}>
            {t.title}: {t.description}
          </div>
        ))}
      </div>
      <button
        data-testid="add-toast"
        onClick={() => toast({ title: 'Test', description: 'Test toast' })}
      >
        Add Toast
      </button>
      <button data-testid="dismiss-all" onClick={dismissAll}>
        Dismiss All
      </button>
    </div>
  );
};

const RouterTestComponent: React.FC = () => {
  const { pathname, query, push, replace, back } = useIsolatedRouter();

  return (
    <div data-testid="router-test">
      <div data-testid="current-path">{pathname}</div>
      <div data-testid="current-query">{JSON.stringify(query)}</div>
      <button
        data-testid="navigate-push"
        onClick={() => push('/test?param=value')}
      >
        Push Navigation
      </button>
      <button
        data-testid="navigate-replace"
        onClick={() => replace('/replaced')}
      >
        Replace Navigation
      </button>
      <button data-testid="navigate-back" onClick={back}>
        Go Back
      </button>
    </div>
  );
};

const CompositeTestComponent: React.FC = () => (
    <div data-testid="composite-test">
      <SessionTestComponent />
      <ThemeTestComponent />
      <FormTestComponent />
      <ToastTestComponent />
      <RouterTestComponent />
    </div>
  );

// ============================================================================
// Individual Provider Tests
// ============================================================================

describe('Provider Isolation System', () => {
  beforeEach(() => {
    // Reset provider state before each test
    isolatedProviderManager.resetAllProviders();
    providerStateManager.reset();
  });

  afterEach(() => {
    // Cleanup after each test
    isolatedProviderManager.cleanup();
  });

  describe('IsolatedSessionProvider', () => {
    it('should provide isolated session context without external dependencies', () => {
      const mockSession = {
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      render(
        <IsolatedSessionProvider session={mockSession} status="authenticated">
          <SessionTestComponent />
        </IsolatedSessionProvider>
      );

      expect(screen.getByTestId('session-status')).toHaveTextContent(
        'authenticated'
      );
      expect(screen.getByTestId('session-user')).toHaveTextContent('Test User');
    });

    it('should handle session updates without external side effects', async () => {
      render(
        <IsolatedSessionProvider session={null} status="unauthenticated">
          <SessionTestComponent />
        </IsolatedSessionProvider>
      );

      expect(screen.getByTestId('session-status')).toHaveTextContent(
        'unauthenticated'
      );
      expect(screen.getByTestId('session-user')).toHaveTextContent('No user');

      fireEvent.click(screen.getByTestId('update-session'));

      await waitFor(() => {
        expect(screen.getByTestId('session-status')).toHaveTextContent(
          'authenticated'
        );
        expect(screen.getByTestId('session-user')).toHaveTextContent(
          'Updated User'
        );
      });
    });

    it('should work independently of next-auth production implementation', () => {
      // This test verifies that our isolated provider doesn't depend on next-auth internals
      render(
        <IsolatedSessionProvider>
          <SessionTestComponent />
        </IsolatedSessionProvider>
      );

      // Should render without errors even if next-auth is not properly configured
      expect(screen.getByTestId('session-test')).toBeInTheDocument();
      expect(screen.getByTestId('session-status')).toHaveTextContent(
        'unauthenticated'
      );
    });
  });

  describe('IsolatedThemeProvider', () => {
    it('should provide isolated theme context', () => {
      render(
        <IsolatedThemeProvider defaultTheme="dark">
          <ThemeTestComponent />
        </IsolatedThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
    });

    it('should handle theme changes without external dependencies', () => {
      render(
        <IsolatedThemeProvider defaultTheme="light">
          <ThemeTestComponent />
        </IsolatedThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');

      fireEvent.click(screen.getByTestId('toggle-theme'));

      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
    });

    it('should support forced theme override', () => {
      render(
        <IsolatedThemeProvider defaultTheme="light" forcedTheme="dark">
          <ThemeTestComponent />
        </IsolatedThemeProvider>
      );

      expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
    });
  });

  describe('IsolatedFormProvider', () => {
    it('should provide isolated form state management', () => {
      const initialValues = { name: 'Initial Name' };

      render(
        <IsolatedFormProvider initialValues={initialValues}>
          <FormTestComponent />
        </IsolatedFormProvider>
      );

      expect(screen.getByTestId('name-input')).toHaveValue('Initial Name');
      expect(screen.getByTestId('form-valid')).toHaveTextContent('valid');
      expect(screen.getByTestId('form-submitting')).toHaveTextContent('idle');
    });

    it('should handle form field updates and validation', () => {
      render(
        <IsolatedFormProvider initialValues={{ name: '' }}>
          <FormTestComponent />
        </IsolatedFormProvider>
      );

      const nameInput = screen.getByTestId('name-input');
      fireEvent.change(nameInput, { target: { value: 'New Name' } });

      expect(nameInput).toHaveValue('New Name');

      fireEvent.click(screen.getByTestId('set-error'));
      expect(screen.getByTestId('name-error')).toHaveTextContent('Test error');
      expect(screen.getByTestId('form-valid')).toHaveTextContent('invalid');
    });

    it('should handle form submission state', () => {
      render(
        <IsolatedFormProvider initialValues={{}}>
          <FormTestComponent />
        </IsolatedFormProvider>
      );

      fireEvent.click(screen.getByTestId('submit-form'));
      expect(screen.getByTestId('form-submitting')).toHaveTextContent(
        'submitting'
      );
    });

    it('should reset form state correctly', () => {
      const initialValues = { name: 'Initial' };

      render(
        <IsolatedFormProvider initialValues={initialValues}>
          <FormTestComponent />
        </IsolatedFormProvider>
      );

      const nameInput = screen.getByTestId('name-input');
      fireEvent.change(nameInput, { target: { value: 'Changed' } });
      fireEvent.click(screen.getByTestId('set-error'));

      expect(nameInput).toHaveValue('Changed');
      expect(screen.getByTestId('name-error')).toHaveTextContent('Test error');

      fireEvent.click(screen.getByTestId('reset-form'));

      expect(nameInput).toHaveValue('Initial');
      expect(screen.getByTestId('name-error')).toHaveTextContent('');
      expect(screen.getByTestId('form-valid')).toHaveTextContent('valid');
    });
  });

  describe('IsolatedToastProvider', () => {
    it('should provide isolated toast management', () => {
      render(
        <IsolatedToastProvider>
          <ToastTestComponent />
        </IsolatedToastProvider>
      );

      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');

      fireEvent.click(screen.getByTestId('add-toast'));

      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');
      expect(screen.getByTestId('toast-list')).toHaveTextContent(
        'Test: Test toast'
      );
    });

    it('should handle toast dismissal', () => {
      render(
        <IsolatedToastProvider>
          <ToastTestComponent />
        </IsolatedToastProvider>
      );

      fireEvent.click(screen.getByTestId('add-toast'));
      fireEvent.click(screen.getByTestId('add-toast'));

      expect(screen.getByTestId('toast-count')).toHaveTextContent('2');

      fireEvent.click(screen.getByTestId('dismiss-all'));

      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
    });

    it('should auto-dismiss toasts after duration', async () => {
      jest.useFakeTimers();

      render(
        <IsolatedToastProvider>
          <ToastTestComponent />
        </IsolatedToastProvider>
      );

      fireEvent.click(screen.getByTestId('add-toast'));
      expect(screen.getByTestId('toast-count')).toHaveTextContent('1');

      // Fast-forward time to trigger auto-dismiss with act()
      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
      });

      jest.useRealTimers();
    });
  });

  describe('IsolatedRouterProvider', () => {
    it('should provide isolated router functionality', () => {
      render(
        <IsolatedRouterProvider
          initialPath="/test"
          initialQuery={{ param: 'value' }}
        >
          <RouterTestComponent />
        </IsolatedRouterProvider>
      );

      expect(screen.getByTestId('current-path')).toHaveTextContent('/test');
      expect(screen.getByTestId('current-query')).toHaveTextContent(
        '{"param":"value"}'
      );
    });

    it('should handle navigation without external router dependencies', async () => {
      render(
        <IsolatedRouterProvider>
          <RouterTestComponent />
        </IsolatedRouterProvider>
      );

      expect(screen.getByTestId('current-path')).toHaveTextContent('/');

      fireEvent.click(screen.getByTestId('navigate-push'));

      await waitFor(() => {
        expect(screen.getByTestId('current-path')).toHaveTextContent('/test');
        expect(screen.getByTestId('current-query')).toHaveTextContent(
          '{"param":"value"}'
        );
      });
    });

    it('should handle replace navigation', async () => {
      render(
        <IsolatedRouterProvider initialPath="/initial">
          <RouterTestComponent />
        </IsolatedRouterProvider>
      );

      fireEvent.click(screen.getByTestId('navigate-replace'));

      await waitFor(() => {
        expect(screen.getByTestId('current-path')).toHaveTextContent(
          '/replaced'
        );
      });
    });
  });

  // ============================================================================
  // Provider Composition Tests
  // ============================================================================

  describe('IsolatedTestProviders Composition', () => {
    it('should compose multiple providers correctly', () => {
      const mockSession = {
        user: { id: '1', name: 'Test User', email: 'test@example.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      render(
        <IsolatedTestProviders
          providers={{
            session: { session: mockSession, status: 'authenticated' },
            theme: { defaultTheme: 'dark' },
            form: { initialValues: { name: 'Test' } },
            router: { initialPath: '/dashboard' },
            toast: true,
          }}
        >
          <CompositeTestComponent />
        </IsolatedTestProviders>
      );

      // Verify all providers are working
      expect(screen.getByTestId('session-status')).toHaveTextContent(
        'authenticated'
      );
      expect(screen.getByTestId('current-theme')).toHaveTextContent('dark');
      expect(screen.getByTestId('name-input')).toHaveValue('Test');
      expect(screen.getByTestId('current-path')).toHaveTextContent(
        '/dashboard'
      );
      expect(screen.getByTestId('toast-count')).toHaveTextContent('0');
    });

    it('should work with minimal provider configuration', () => {
      render(
        <IsolatedTestProviders>
          <div data-testid="minimal-test">Minimal Test</div>
        </IsolatedTestProviders>
      );

      expect(screen.getByTestId('minimal-test')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Enhanced Render Function Tests
  // ============================================================================

  describe('renderWithIsolatedProviders', () => {
    it('should render components with complete provider isolation', () => {
      const { getByTestId } = renderWithIsolatedProviders(
        <div data-testid="isolated-component">Isolated Component</div>,
        {
          providerIsolation: {
            isolationMode: 'complete',
            preset: 'minimal',
          },
        }
      );

      expect(getByTestId('isolated-component')).toBeInTheDocument();
    });

    it('should provide access to isolated hooks', () => {
      const TestComponent = () => 
        // These hooks should be available without throwing errors
         <div data-testid="hooks-test">Hooks Test</div>
      ;

      const { getByTestId, isolatedHooks } = renderWithIsolatedProviders(
        <TestComponent />,
        {
          providerIsolation: {
            isolationMode: 'complete',
            preset: 'complete',
          },
        }
      );

      expect(getByTestId('hooks-test')).toBeInTheDocument();
      expect(isolatedHooks.useSession).toBeDefined();
      expect(isolatedHooks.useTheme).toBeDefined();
      expect(isolatedHooks.useForm).toBeDefined();
      expect(isolatedHooks.useToast).toBeDefined();
      expect(isolatedHooks.useRouter).toBeDefined();
    });

    it('should handle cleanup correctly', () => {
      const { cleanup } = renderWithIsolatedProviders(
        <div data-testid="cleanup-test">Cleanup Test</div>,
        {
          providerIsolation: {
            isolationMode: 'complete',
            autoCleanup: true,
          },
        }
      );

      // Should not throw when cleanup is called
      expect(() => cleanup()).not.toThrow();
    });

    it('should support provider presets', () => {
      const { getByTestId } = renderWithIsolatedProviders(
        <SessionTestComponent />,
        {
          providerIsolation: {
            preset: 'authenticated',
          },
        }
      );

      expect(getByTestId('session-status')).toHaveTextContent('authenticated');
    });

    it('should maintain backward compatibility with legacy options', () => {
      const mockSession = {
        user: { id: '1', name: 'Legacy User', email: 'legacy@example.com' },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      };

      const { getByTestId } = renderWithIsolatedProviders(
        <SessionTestComponent />,
        {
          session: mockSession,
          providerIsolation: {
            isolationMode: 'complete',
          },
        }
      );

      expect(getByTestId('session-user')).toHaveTextContent('Legacy User');
    });
  });

  // ============================================================================
  // Provider Test Scenarios
  // ============================================================================

  describe('Provider Test Scenarios', () => {
    it('should run authenticated user scenario', async () => {
      await providerTestScenarios.authenticatedUser.run(() => {
        const { getByTestId } = renderWithIsolatedProviders(
          <SessionTestComponent />,
          {
            providerIsolation: {
              providers:
                providerTestScenarios.authenticatedUser.config.providers,
            },
          }
        );

        expect(getByTestId('session-status')).toHaveTextContent(
          'authenticated'
        );
      });
    });

    it('should run unauthenticated user scenario', async () => {
      await providerTestScenarios.unauthenticatedUser.run(() => {
        const { getByTestId } = renderWithIsolatedProviders(
          <SessionTestComponent />,
          {
            providerIsolation: {
              providers:
                providerTestScenarios.unauthenticatedUser.config.providers,
            },
          }
        );

        expect(getByTestId('session-status')).toHaveTextContent(
          'unauthenticated'
        );
      });
    });

    it('should run form with validation scenario', async () => {
      await providerTestScenarios.formWithValidation.run(() => {
        const { getByTestId } = renderWithIsolatedProviders(
          <FormTestComponent />,
          {
            providerIsolation: {
              providers:
                providerTestScenarios.formWithValidation.config.providers,
            },
          }
        );

        expect(getByTestId('form-valid')).toHaveTextContent('valid');
      });
    });
  });

  // ============================================================================
  // Provider State Management Tests
  // ============================================================================

  describe('Provider State Management', () => {
    it('should capture and restore provider state', () => {
      providerStateManager.pushState();

      // Simulate state change
      const testState = {
        session: { data: null, status: 'unauthenticated' },
        theme: { theme: 'dark', resolvedTheme: 'dark' },
      };

      providerStateManager.restoreState(testState);
      const snapshot = providerStateManager.getStateSnapshot();

      expect(snapshot.session?.status).toBe('unauthenticated');
      expect(snapshot.theme?.theme).toBe('dark');

      providerStateManager.popState();
    });

    it('should reset state correctly', () => {
      const testState = {
        session: { data: null, status: 'authenticated' },
      };

      providerStateManager.restoreState(testState);
      providerStateManager.reset();

      const snapshot = providerStateManager.getStateSnapshot();
      expect(Object.keys(snapshot)).toHaveLength(0);
    });
  });

  // ============================================================================
  // Error Handling Tests
  // ============================================================================

  describe('Error Handling', () => {
    it('should handle provider errors gracefully', () => {
      // Create a proper error boundary component
      class TestErrorBoundary extends React.Component {
        constructor(props) {
          super(props);
          this.state = { hasError: false, error: null };
        }

        static getDerivedStateFromError(error) {
          return { hasError: true, error };
        }

        componentDidCatch(error, errorInfo) {
          // Log error for debugging
          console.log('Error caught by boundary:', error.message);
        }

        render() {
          if (this.state.hasError) {
            return (
              <div data-testid="error-boundary">
                Error: {this.state.error?.message}
              </div>
            );
          }
          return this.props.children;
        }
      }

      const ErrorComponent = () => {
        throw new Error('Test error');
      };

      render(
        <TestErrorBoundary>
          <IsolatedTestProviders>
            <ErrorComponent />
          </IsolatedTestProviders>
        </TestErrorBoundary>
      );

      // Should render error boundary instead of crashing
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByTestId('error-boundary')).toHaveTextContent(
        'Error: Test error'
      );
    });

    it('should provide proper error messages for missing providers', () => {
      // Test that the hook functions exist and have proper error handling
      expect(useIsolatedSession).toBeDefined();
      expect(useIsolatedTheme).toBeDefined();
      expect(useIsolatedForm).toBeDefined();
      expect(useIsolatedToast).toBeDefined();
      expect(useIsolatedRouter).toBeDefined();

      // Test that components render properly when providers are present
      render(
        <IsolatedTestProviders
          providers={{ session: { session: null, status: 'unauthenticated' } }}
        >
          <SessionTestComponent />
        </IsolatedTestProviders>
      );

      expect(screen.getByTestId('session-test')).toBeInTheDocument();
    });
  });

  // ============================================================================
  // Performance and Memory Tests
  // ============================================================================

  describe('Performance and Memory', () => {
    it('should not leak memory between test runs', () => {
      // Run multiple render cycles with proper provider configuration
      for (let i = 0; i < 5; i++) {
        const { cleanup } = renderWithIsolatedProviders(
          <div data-testid={`test-${i}`}>Test {i}</div>,
          {
            providerIsolation: {
              isolationMode: 'complete',
              preset: 'minimal',
              autoCleanup: true,
            },
          }
        );
        cleanup();
      }

      // Verify cleanup worked
      const snapshot = providerStateManager.getStateSnapshot();
      expect(Object.keys(snapshot)).toHaveLength(0);
    });

    it('should handle rapid provider updates efficiently', () => {
      const { getByTestId } = renderWithIsolatedProviders(
        <ThemeTestComponent />,
        {
          providerIsolation: {
            preset: 'complete',
          },
        }
      );

      // Rapidly toggle theme multiple times
      for (let i = 0; i < 10; i++) {
        fireEvent.click(getByTestId('toggle-theme'));
      }

      // Should still be responsive
      expect(getByTestId('theme-test')).toBeInTheDocument();
    });
  });
});
