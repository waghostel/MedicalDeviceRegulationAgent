/**
 * Comprehensive test utilities for consistent component testing
 * Provides renderWithProviders, mock API setup, and database utilities
 * Enhanced with React 19 compatibility and AggregateError handling
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { Session } from 'next-auth';
import { generateMockSession, generateMockUser } from '@/lib/mock-data';
// Import the dedicated React19ErrorBoundary component
import {
  React19ErrorBoundary,
  React19ErrorHandler,
  type TestErrorReport,
  type ErrorCategory,
  type ErrorBoundaryState as React19ErrorBoundaryState,
  type React19ErrorBoundaryProps,
} from './React19ErrorBoundary';

// React 19 Error Handling Types (imported from React19ErrorBoundary)

interface MockConfiguration {
  useToast?: boolean;
  useEnhancedForm?: boolean;
  localStorage?: boolean;
  timers?: boolean;
}

interface MockRegistry {
  hooks: Map<string, jest.MockedFunction<any>>;
  components: Map<string, jest.MockedFunction<React.FC<any>>>;
  providers: Map<string, jest.MockedFunction<React.FC<any>>>;
  utilities: Map<string, jest.MockedFunction<any>>;
}

// React 19 Error Handler Class is imported from React19ErrorBoundary.tsx

// Mock router for testing navigation
export interface MockRouter {
  push: jest.Mock;
  replace: jest.Mock;
  back: jest.Mock;
  forward: jest.Mock;
  refresh: jest.Mock;
  prefetch: jest.Mock;
  pathname: string;
  query: Record<string, string | string[]>;
  asPath: string;
  route: string;
  basePath: string;
  locale?: string;
  locales?: string[];
  defaultLocale?: string;
  isReady: boolean;
  isPreview: boolean;
}

export const createMockRouter = (initialRoute: string = '/'): MockRouter => ({
  push: jest.fn().mockResolvedValue(true),
  replace: jest.fn().mockResolvedValue(true),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn().mockResolvedValue(undefined),
  pathname: initialRoute,
  query: {},
  asPath: initialRoute,
  route: initialRoute,
  basePath: '',
  locale: 'en',
  locales: ['en'],
  defaultLocale: 'en',
  isReady: true,
  isPreview: false,
});

// Mock session for testing authentication
export const createMockSession = (userOverrides?: Partial<any>): Session => {
  const mockUser = generateMockUser(userOverrides);
  const mockSession = generateMockSession({ userId: mockUser.id });

  return {
    user: {
      id: mockUser.id,
      name: mockUser.name,
      email: mockUser.email,
      image: mockUser.image,
    },
    expires: mockSession.expires,
    accessToken: mockSession.accessToken,
  } as Session;
};

// Test providers wrapper
interface TestProvidersProps {
  children: ReactNode;
  session?: Session | null;
  router?: Partial<MockRouter>;
}

const TestProviders: React.FC<TestProvidersProps> = ({
  children,
  session = null,
  router = {},
}) => {
  // Mock Next.js router
  const mockRouter = { ...createMockRouter(), ...router };

  // Mock useRouter hook
  jest.doMock('next/router', () => ({
    useRouter: () => mockRouter,
  }));

  return <SessionProvider session={session}>{children}</SessionProvider>;
};

// Enhanced render options with React 19 support
interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: Session | null;
  router?: Partial<MockRouter>;
  initialProps?: Record<string, any>;
  mockConfig?: MockConfiguration;
  reactVersion?: 'react18' | 'react19';
  errorBoundary?: boolean;
  onError?: (error: Error | AggregateError, errorInfo: React.ErrorInfo) => void;
}

/**
 * Enhanced render function with React 19 compatibility and error handling
 * Includes SessionProvider, mock router, error boundary, and mock registry
 */
export const renderWithProviders = (
  ui: ReactElement,
  options: RenderWithProvidersOptions = {}
): RenderResult & {
  mockRouter: MockRouter;
  mockRegistry: MockRegistry;
  cleanup: () => void;
} => {
  const {
    session,
    router,
    mockConfig = {},
    reactVersion = 'react19',
    errorBoundary = true,
    onError,
    ...renderOptions
  } = options;

  const mockRouter = { ...createMockRouter(), ...router };

  // Initialize mock registry
  const mockRegistry: MockRegistry = {
    hooks: new Map(),
    components: new Map(),
    providers: new Map(),
    utilities: new Map(),
  };

  // Setup mocks based on configuration
  if (mockConfig.useToast) {
    // Mock useToast hook (will be implemented in later tasks)
    mockRegistry.hooks.set('useToast', jest.fn());
  }

  if (mockConfig.localStorage) {
    // Mock localStorage for auto-save functionality
    const localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    mockRegistry.utilities.set('localStorage', localStorageMock);
  }

  if (mockConfig.timers) {
    // Mock timers for debounced functionality
    jest.useFakeTimers();
    mockRegistry.utilities.set('timers', { useFakeTimers: true });
  }

  // Enhanced wrapper with error boundary and React 19 support
  const Wrapper = ({ children }: { children: ReactNode }) => {
    const content = (
      <TestProviders session={session} router={router}>
        {children}
      </TestProviders>
    );

    // Wrap with error boundary if enabled
    if (errorBoundary) {
      return (
        <React19ErrorBoundary
          onError={(error, errorInfo, report) => {
            // Enhanced error logging for React 19
            if (error instanceof AggregateError) {
              console.error('React 19 AggregateError in test:', {
                totalErrors: error.errors?.length || 0,
                errors: error.errors?.map((e) => e.message) || [],
                component: (ui.type as any)?.name || 'Unknown',
                report,
              });
            }
            onError?.(error, errorInfo);
          }}
          resetOnPropsChange={true}
          debugMode={true}
          testName="renderWithProviders"
        >
          {content}
        </React19ErrorBoundary>
      );
    }

    return content;
  };

  // Cleanup function for test teardown
  const cleanup = () => {
    // Clear mock registry
    mockRegistry.hooks.clear();
    mockRegistry.components.clear();
    mockRegistry.providers.clear();
    mockRegistry.utilities.clear();

    // Restore timers if mocked
    if (mockConfig.timers) {
      jest.useRealTimers();
    }

    // Clear localStorage mock
    if (mockConfig.localStorage) {
      delete (window as any).localStorage;
    }

    // Clear all mocks
    jest.clearAllMocks();
  };

  let result: RenderResult;

  try {
    // React 19 compatible rendering with enhanced error handling
    result = render(ui, { wrapper: Wrapper, ...renderOptions });
  } catch (error) {
    // Handle React 19 AggregateError during rendering
    if (error instanceof AggregateError) {
      const errorReport = React19ErrorHandler.handleAggregateError(error);
      console.error('AggregateError during render:', errorReport);

      // If error is recoverable, try rendering with minimal setup
      if (errorReport.recoverable) {
        console.warn('Attempting recovery render with minimal setup...');
        const MinimalWrapper = ({ children }: { children: ReactNode }) => (
          <React19ErrorBoundary>{children}</React19ErrorBoundary>
        );
        result = render(ui, { wrapper: MinimalWrapper, ...renderOptions });
      } else {
        throw error;
      }
    } else {
      throw error;
    }
  }

  return {
    ...result,
    mockRouter,
    mockRegistry,
    cleanup,
  };
};

// Test data management utilities
export interface TestState {
  id: string;
  data: unknown;
  timestamp: number;
  scenario: string;
}

class TestDataManager {
  private states: Map<string, TestState> = new Map();

  saveTestState(state: TestState): void {
    this.states.set(state.id, state);
  }

  restoreTestState(stateId: string): TestState | undefined {
    return this.states.get(stateId);
  }

  clearTestStates(): void {
    this.states.clear();
  }

  getAllStates(): TestState[] {
    return Array.from(this.states.values());
  }
}

export const testDataManager = new TestDataManager();

// Enhanced test setup with React 19 error handling
export const setupTest = (
  testName: string,
  options: {
    captureErrors?: boolean;
    mockTimers?: boolean;
    mockLocalStorage?: boolean;
  } = {}
) => {
  const {
    captureErrors = true,
    mockTimers = false,
    mockLocalStorage = false,
  } = options;

  // Clear any existing mocks
  jest.clearAllMocks();

  // Clear test data
  testDataManager.clearTestStates();

  // Setup console spy to catch errors (including AggregateError)
  const consoleSpy = captureErrors
    ? jest.spyOn(console, 'error').mockImplementation((message, ...args) => {
        // Log React 19 AggregateErrors for debugging
        if (
          message &&
          typeof message === 'string' &&
          message.includes('AggregateError')
        ) {
          console.warn(
            'AggregateError detected in test:',
            testName,
            message,
            ...args
          );
        }
      })
    : null;

  // Setup timers if requested
  if (mockTimers) {
    jest.useFakeTimers();
  }

  // Setup localStorage mock if requested
  let localStorageMock;
  if (mockLocalStorage) {
    localStorageMock = {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
  }

  // Setup global error handler for unhandled React 19 errors
  const originalErrorHandler = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    if (error instanceof AggregateError) {
      console.warn('Unhandled AggregateError in test:', testName, {
        message,
        totalErrors: error.errors?.length || 0,
        errors: error.errors?.map((e) => e.message) || [],
      });
    }
    return (
      originalErrorHandler?.(message, source, lineno, colno, error) || false
    );
  };

  return {
    consoleSpy,
    localStorageMock,
    cleanup: () => {
      // Restore console spy
      consoleSpy?.mockRestore();

      // Clear test data
      testDataManager.clearTestStates();

      // Restore timers
      if (mockTimers) {
        jest.useRealTimers();
      }

      // Restore localStorage
      if (mockLocalStorage) {
        delete (window as unknown).localStorage;
      }

      // Restore error handler
      window.onerror = originalErrorHandler;

      // Clear all mocks
      jest.clearAllMocks();
    },
  };
};

export const teardownTest = () => {
  // Clear all mocks
  jest.clearAllMocks();

  // Clear test data
  testDataManager.clearTestStates();

  // Reset modules
  jest.resetModules();
};

// Mock component factory for testing
export const createMockComponent = (name: string, props: unknown = {}) => {
  const MockComponent = jest.fn((componentProps) => (
    <div data-testid={`mock-${name.toLowerCase()}`} {...componentProps}>
      {name} Mock Component
    </div>
  ));

  MockComponent.displayName = `Mock${name}`;
  return MockComponent;
};

// Async test utilities
export const waitForNextTick = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

export const waitForCondition = async (
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> => {
  const startTime = Date.now();

  while (!condition() && Date.now() - startTime < timeout) {
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  if (!condition()) {
    throw new Error(`Condition not met within ${timeout}ms`);
  }
};

// Form testing utilities
export const fillForm = async (
  form: HTMLFormElement,
  data: Record<string, string>
) => {
  const { fireEvent } = await import('@testing-library/react');

  Object.entries(data).forEach(([name, value]) => {
    const input = form.querySelector(`[name="${name}"]`) as HTMLInputElement;
    if (input) {
      fireEvent.change(input, { target: { value } });
    }
  });
};

export const submitForm = async (form: HTMLFormElement) => {
  const { fireEvent } = await import('@testing-library/react');
  fireEvent.submit(form);
};

// React19ErrorBoundary components are imported at the top of the file

// Legacy error boundary for backward compatibility (re-export from dedicated component)
export { TestErrorBoundary } from './React19ErrorBoundary';

// Performance testing utilities
export const measureRenderTime = async (
  renderFn: () => void
): Promise<number> => {
  const startTime = performance.now();
  renderFn();
  await waitForNextTick();
  const endTime = performance.now();
  return endTime - startTime;
};

// Accessibility testing utilities
export const checkAccessibility = async (container: HTMLElement) => {
  const { axe } = await import('jest-axe');
  const results = await axe(container);
  return results;
};

// Export all utilities including React 19 enhancements
export const testUtils = {
  renderWithProviders,
  createMockRouter,
  createMockSession,
  setupTest,
  teardownTest,
  createMockComponent,
  waitForNextTick,
  waitForCondition,
  fillForm,
  submitForm,
  measureRenderTime,
  checkAccessibility,
  testDataManager,
};

// Export React 19 specific utilities (imported from dedicated component)
export {
  React19ErrorBoundary,
  React19ErrorHandler,
  type TestErrorReport,
  type ErrorCategory,
  type React19ErrorBoundaryState as ErrorBoundaryState,
  type React19ErrorBoundaryProps,
  type MockConfiguration,
  type MockRegistry,
  type RenderWithProvidersOptions,
};

export default testUtils;
