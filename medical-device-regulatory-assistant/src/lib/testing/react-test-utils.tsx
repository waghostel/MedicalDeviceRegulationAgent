/**
 * Enhanced React Testing Utilities
 * Provides proper act() wrapping and async state update handling
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult, act, waitFor } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { Session } from 'next-auth';
import { generateMockSession, generateMockUser } from '@/lib/mock-data';

// Enhanced render options with proper typing
interface EnhancedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: Session | null;
  router?: Partial<MockRouter>;
  initialProps?: Record<string, any>;
  skipActWarnings?: boolean;
}

// Mock router interface
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

// Create mock router with proper defaults
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

// Create mock session with proper typing
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

// Test providers wrapper with proper act() handling
interface TestProvidersProps {
  children: ReactNode;
  session?: Session | null;
  router?: Partial<MockRouter>;
}

const TestProviders: React.FC<TestProvidersProps> = ({ 
  children, 
  session = null,
  router = {}
}) => {
  // Mock Next.js router
  const mockRouter = { ...createMockRouter(), ...router };
  
  // Mock useRouter hook
  jest.doMock('next/router', () => ({
    useRouter: () => mockRouter,
  }));

  return (
    <SessionProvider session={session}>
      {children}
    </SessionProvider>
  );
};

/**
 * Enhanced render function with proper act() wrapping for all async operations
 */
export const renderWithProviders = async (
  ui: ReactElement,
  options: EnhancedRenderOptions = {}
): Promise<RenderResult & { mockRouter: MockRouter }> => {
  const { session, router, skipActWarnings = false, ...renderOptions } = options;
  
  const mockRouter = { ...createMockRouter(), ...router };
  
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <TestProviders session={session} router={router}>
      {children}
    </TestProviders>
  );

  let result: RenderResult;

  // Wrap render in act() to handle initial state updates
  await act(async () => {
    result = render(ui, { wrapper: Wrapper, ...renderOptions });
    // Allow any immediate state updates to complete
    await waitForAsyncUpdates();
  });

  return {
    ...result!,
    mockRouter,
  };
};

/**
 * Synchronous version of renderWithProviders for cases where act() wrapping is not needed
 */
export const renderWithProvidersSync = (
  ui: ReactElement,
  options: EnhancedRenderOptions = {}
): RenderResult & { mockRouter: MockRouter } => {
  const { session, router, ...renderOptions } = options;
  
  const mockRouter = { ...createMockRouter(), ...router };
  
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <TestProviders session={session} router={router}>
      {children}
    </TestProviders>
  );

  const result = render(ui, { wrapper: Wrapper, ...renderOptions });
  
  return {
    ...result,
    mockRouter,
  };
};

/**
 * Wait for async state updates to complete with proper act() wrapping
 */
export const waitForAsyncUpdates = async (timeout: number = 1000): Promise<void> => {
  await act(async () => {
    // Wait for next tick to allow state updates
    await new Promise(resolve => setTimeout(resolve, 0));
  });
  
  // Additional wait for any pending async operations
  await waitFor(() => {
    // This will resolve immediately if no async operations are pending
    return Promise.resolve();
  }, { timeout });
};

/**
 * Enhanced waitFor with proper act() wrapping
 */
export const waitForWithAct = async <T>(
  callback: () => T | Promise<T>,
  options?: Parameters<typeof waitFor>[1]
): Promise<T> => {
  let result: T;
  
  await act(async () => {
    result = await waitFor(callback, options);
  });
  
  return result!;
};

/**
 * Fire event with proper act() wrapping for async state updates
 */
export const fireEventWithAct = async (
  eventFunction: () => void | Promise<void>
): Promise<void> => {
  await act(async () => {
    await eventFunction();
    // Allow state updates to complete
    await waitForAsyncUpdates();
  });
};

/**
 * Test configuration interface
 */
export interface TestConfig {
  skipActWarnings?: boolean;
  mockToasts?: boolean;
  mockRouter?: Partial<MockRouter>;
  session?: Session | null;
  timeout?: number;
}

/**
 * Setup test environment with enhanced configuration
 */
export const setupTestEnvironment = (config: TestConfig = {}) => {
  const {
    skipActWarnings = false,
    mockToasts = true,
    mockRouter,
    session,
    timeout = 5000
  } = config;

  // Setup console spy to catch act warnings if needed
  let consoleSpy: jest.SpyInstance | undefined;
  if (skipActWarnings) {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation((message) => {
      if (typeof message === 'string' && message.includes('act(')) {
        return; // Suppress act warnings
      }
      console.error(message); // Log other errors normally
    });
  }

  // Setup mock toast system if requested
  if (mockToasts) {
    // Skip toast system setup for now to avoid module resolution issues
    // const { setupMockToastSystem } = require('./mock-toast-system');
    // setupMockToastSystem();
  }

  // Setup default timeout
  jest.setTimeout(timeout);

  const cleanup = () => {
    if (consoleSpy) {
      consoleSpy.mockRestore();
    }
    jest.clearAllMocks();
    jest.restoreAllMocks();
  };

  return {
    cleanup,
    mockRouter: mockRouter ? { ...createMockRouter(), ...mockRouter } : createMockRouter(),
    session: session || null,
  };
};

/**
 * Cleanup test environment
 */
export const cleanupTestEnvironment = () => {
  // Clear all mocks
  jest.clearAllMocks();
  jest.restoreAllMocks();
  
  // Reset modules
  jest.resetModules();
  
  // Clear any pending timers
  jest.clearAllTimers();
};

/**
 * Enhanced test utilities with proper act() handling
 */
export const enhancedTestUtils = {
  renderWithProviders,
  renderWithProvidersSync,
  waitForAsyncUpdates,
  waitForWithAct,
  fireEventWithAct,
  setupTestEnvironment,
  cleanupTestEnvironment,
  createMockRouter,
  createMockSession,
};

export default enhancedTestUtils;