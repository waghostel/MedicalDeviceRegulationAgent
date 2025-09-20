/**
 * Comprehensive test utilities for consistent component testing
 * Provides renderWithProviders, mock API setup, and database utilities
 * Enhanced with React 19 compatibility and AggregateError handling
 */

import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { Session } from 'next-auth';
import { SessionProvider } from 'next-auth/react';
import React, { ReactElement, ReactNode } from 'react';

import { generateMockSession, generateMockUser } from '@/lib/mock-data';


// Import MockRegistry integration
import {
  getDefaultIntegration,
  initializeMockSystem,
  loadMockPreset,
  getMock,
  type SystemInitializationOptions,
} from './MockRegistryIntegration';

// Import the dedicated React19ErrorBoundary component
import {
  React19ErrorBoundary,
  React19ErrorHandler,
  type TestErrorReport,
  type ErrorCategory,
  type ErrorBoundaryState as React19ErrorBoundaryState,
  type React19ErrorBoundaryProps,
} from './React19ErrorBoundary';
import {
  setupEnhancedFormMocks,
  enhancedFormMockUtils,
} from './setup-enhanced-form-mocks';
import { setupUseToastMock, toastMockUtils } from './setup-use-toast-mock';

// React 19 Error Handling Types and Mock Configuration
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

// Enhanced render options with React 19 support and MockRegistry integration
interface RenderWithProvidersOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: Session | null;
  router?: Partial<MockRouter>;
  initialProps?: Record<string, any>;
  mockToast?: boolean; // Enable/disable toast mocking
  mockEnhancedForm?: boolean; // Enable/disable enhanced form mocking
  mockConfig?: MockConfiguration;
  reactVersion?: 'react18' | 'react19';
  errorBoundary?: boolean;
  onError?: (error: Error | AggregateError, errorInfo: React.ErrorInfo) => void;
  // MockRegistry integration options
  useMockRegistry?: boolean;
  mockPreset?: string;
  mockRegistryOptions?: Record<string, any>;
}

/**
 * Enhanced render function with React 19 compatibility and error handling
 * Includes SessionProvider, mock router, error boundary, and MockRegistry integration
 */
export const renderWithProviders = (
  ui: ReactElement,
  options: RenderWithProvidersOptions = {}
): RenderResult & {
  mockRouter: MockRouter;
  mockRegistry: MockRegistry;
  toastUtils: typeof toastMockUtils;
  enhancedFormUtils: typeof enhancedFormMockUtils;
  cleanup: () => void;
} => {
  const {
    session,
    router,
    mockToast = true,
    mockEnhancedForm = true,
    mockConfig = {},
    reactVersion = 'react19',
    errorBoundary = true,
    onError,
    useMockRegistry = true,
    mockPreset,
    mockRegistryOptions = {},
    ...renderOptions
  } = options;

  const mockRouter = { ...createMockRouter(), ...router };

  // Initialize mock registry (legacy interface for backward compatibility)
  const mockRegistry: MockRegistry = {
    hooks: new Map(),
    components: new Map(),
    providers: new Map(),
    utilities: new Map(),
  };

  // Setup MockRegistry system if enabled
  if (useMockRegistry) {
    const integration = getDefaultIntegration();

    // Load preset if specified
    if (mockPreset) {
      loadMockPreset(mockPreset).catch((error) => {
        console.warn(`Failed to load mock preset '${mockPreset}':`, error);
      });
    }

    // Get mocks from registry
    if (mockToast || mockConfig.useToast) {
      const registryToastMock = getMock('useToast');
      if (registryToastMock) {
        mockRegistry.hooks.set('useToast', registryToastMock);
      }
    }

    if (mockEnhancedForm) {
      const registryFormMock = getMock('useEnhancedForm');
      if (registryFormMock) {
        mockRegistry.hooks.set('useEnhancedForm', registryFormMock);
      }
    }
  } else {
    // Fallback to legacy mock setup
    // Setup toast mock if enabled
    if (mockToast) {
      setupUseToastMock();
    }

    // Setup enhanced form mocks if enabled
    if (mockEnhancedForm) {
      setupEnhancedFormMocks();
    }

    // Setup mocks based on configuration
    if (mockConfig.useToast || mockToast) {
      // Mock useToast hook (enhanced with registry tracking)
      const toastMock = jest.fn();
      mockRegistry.hooks.set('useToast', toastMock);
    }
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

    // Clear toast and form mocks
    toastMockUtils.clear();
    enhancedFormMockUtils.resetAllMocks();

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
    toastUtils: toastMockUtils,
    enhancedFormUtils: enhancedFormMockUtils,
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

  // Reset toast mock
  toastMockUtils.clear();
  toastMockUtils.resetMocks();

  // Reset enhanced form mocks
  enhancedFormMockUtils.resetAllMocks();

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
      toastMockUtils.clear();
      enhancedFormMockUtils.resetAllMocks();

      // Restore timers
      if (mockTimers) {
        jest.useRealTimers();
      }

      // Restore localStorage
      if (mockLocalStorage) {
        delete (window as any).localStorage;
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

  // Clear toast mock
  toastMockUtils.clear();

  // Clear enhanced form mocks
  enhancedFormMockUtils.resetAllMocks();

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

// Legacy error boundary for backward compatibility (imported from dedicated component)
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
  toastUtils: toastMockUtils,
  enhancedFormUtils: enhancedFormMockUtils,
  React19ErrorBoundary,
  React19ErrorHandler,
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
