/**
 * Setup useToast Mock for Testing
 * Configures jest mocks to use the enhanced useToast mock structure
 */

import { useToastMock, toastMockUtils } from './use-toast-mock';

/**
 * Setup useToast mock for jest tests
 * Call this in jest.setup.js or individual test files
 */
export const setupUseToastMock = () => {
  // Mock the main useToast hook
  jest.doMock('@/hooks/use-toast', () => ({
    useToast: useToastMock.useToast,
    toast: useToastMock.toast,
    contextualToast: useToastMock.contextualToast,
  }));

  // Also mock any direct imports of toast functions
  jest.doMock('@/hooks/use-toast', () => ({
    __esModule: true,
    useToast: useToastMock.useToast,
    toast: useToastMock.toast,
    contextualToast: useToastMock.contextualToast,
    default: {
      useToast: useToastMock.useToast,
      toast: useToastMock.toast,
      contextualToast: useToastMock.contextualToast,
    },
  }));
};

/**
 * Cleanup useToast mock
 * Call this in test cleanup or afterEach
 */
export const cleanupUseToastMock = () => {
  toastMockUtils.clear();
  toastMockUtils.resetMocks();
};

/**
 * Reset useToast mock between tests
 * Call this in beforeEach
 */
export const resetUseToastMock = () => {
  toastMockUtils.resetMocks();
  toastMockUtils.clear();
};

// Export utilities for easy access in tests
export { toastMockUtils };

// Export the mock for direct usage
export { useToastMock };

export default {
  setup: setupUseToastMock,
  cleanup: cleanupUseToastMock,
  reset: resetUseToastMock,
  utils: toastMockUtils,
  mock: useToastMock,
};