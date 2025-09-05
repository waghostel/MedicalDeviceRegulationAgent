/**
 * Comprehensive test utilities for consistent component testing
 * Provides renderWithProviders, mock API setup, and database utilities
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { Session } from 'next-auth';
import { generateMockSession, generateMockUser } from '@/lib/mock-data';

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

// Enhanced render options
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: Session | null;
  router?: Partial<MockRouter>;
  initialProps?: Record<string, any>;
}

/**
 * Custom render function with providers for consistent component testing
 * Includes SessionProvider, mock router, and other necessary providers
 */
export const renderWithProviders = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
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

// Test data management utilities
export interface TestState {
  id: string;
  data: any;
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

// Utility functions for test setup and cleanup
export const setupTest = (testName: string) => {
  // Clear any existing mocks
  jest.clearAllMocks();
  
  // Clear test data
  testDataManager.clearTestStates();
  
  // Setup console spy to catch errors
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  
  return {
    consoleSpy,
    cleanup: () => {
      consoleSpy.mockRestore();
      testDataManager.clearTestStates();
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
export const createMockComponent = (name: string, props: any = {}) => {
  const MockComponent = jest.fn((componentProps) => (
    <div data-testid={`mock-${name.toLowerCase()}`} {...componentProps}>
      {name} Mock Component
    </div>
  ));
  
  MockComponent.displayName = `Mock${name}`;
  return MockComponent;
};

// Async test utilities
export const waitForNextTick = () => new Promise(resolve => setTimeout(resolve, 0));

export const waitForCondition = async (
  condition: () => boolean,
  timeout: number = 5000,
  interval: number = 100
): Promise<void> => {
  const startTime = Date.now();
  
  while (!condition() && Date.now() - startTime < timeout) {
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  if (!condition()) {
    throw new Error(`Condition not met within ${timeout}ms`);
  }
};

// Form testing utilities
export const fillForm = async (form: HTMLFormElement, data: Record<string, string>) => {
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

// Error boundary testing
export const TestErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hasError, setHasError] = React.useState(false);
  
  React.useEffect(() => {
    const handleError = () => setHasError(true);
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);
  
  if (hasError) {
    return <div data-testid="error-boundary">Something went wrong</div>;
  }
  
  return <>{children}</>;
};

// Performance testing utilities
export const measureRenderTime = async (renderFn: () => void): Promise<number> => {
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

// Export all utilities
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

export default testUtils;