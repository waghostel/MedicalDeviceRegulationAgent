/**
 * Mock Toast System for Testing
 * Handles toast calls without React lifecycle issues
 */

// Import act dynamically to avoid Jest hook issues during module loading

// Toast types
export type ToastType =
  | 'default'
  | 'success'
  | 'error'
  | 'warning'
  | 'info'
  | 'destructive';

export interface ToastData {
  id: string;
  title?: string;
  description?: string;
  type: ToastType;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  timestamp: number;
}

export interface ToastCall {
  id: string;
  title?: string;
  description?: string;
  type: ToastType;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  calledAt: number;
}

/**
 * Mock Toast System Class
 * Tracks toast calls and provides testing utilities
 */
export class MockToastSystem {
  private toasts: Map<string, ToastData> = new Map();
  private toastCalls: ToastCall[] = [];
  private idCounter = 0;

  /**
   * Mock toast function that tracks calls
   */
  toast = jest.fn(
    (options: {
      title?: string;
      description?: string;
      variant?: ToastType;
      action?: {
        label: string;
        onClick: () => void;
      };
      duration?: number;
    }) => {
      const id = `toast-${++this.idCounter}`;
      const timestamp = Date.now();

      const toastData: ToastData = {
        id,
        title: options.title,
        description: options.description,
        type: options.variant || 'default',
        action: options.action,
        duration: options.duration || 5000,
        timestamp,
      };

      const toastCall: ToastCall = {
        id,
        title: options.title,
        description: options.description,
        type: options.variant || 'default',
        action: options.action,
        duration: options.duration || 5000,
        calledAt: timestamp,
      };

      // Use dynamic act() import to wrap state updates
      const { act } = require('@testing-library/react');
      act(() => {
        this.toasts.set(id, toastData);
        this.toastCalls.push(toastCall);
      });

      return {
        id,
        dismiss: () => this.dismiss(id),
        update: (newOptions: Partial<typeof options>) =>
          this.update(id, newOptions),
      };
    }
  );

  /**
   * Dismiss a toast by ID
   */
  dismiss = jest.fn((id: string) => {
    const { act } = require('@testing-library/react');
    act(() => {
      this.toasts.delete(id);
    });
  });

  /**
   * Update a toast by ID
   */
  update = jest.fn(
    (
      id: string,
      options: Partial<{
        title?: string;
        description?: string;
        variant?: ToastType;
        action?: {
          label: string;
          onClick: () => void;
        };
        duration?: number;
      }>
    ) => {
      const existingToast = this.toasts.get(id);
      if (existingToast) {
        const { act } = require('@testing-library/react');
        act(() => {
          const updatedToast: ToastData = {
            ...existingToast,
            title: options.title ?? existingToast.title,
            description: options.description ?? existingToast.description,
            type: options.variant ?? existingToast.type,
            action: options.action ?? existingToast.action,
            duration: options.duration ?? existingToast.duration,
          };
          this.toasts.set(id, updatedToast);
        });
      }
    }
  );

  /**
   * Get all active toasts
   */
  getActiveToasts(): ToastData[] {
    return Array.from(this.toasts.values());
  }

  /**
   * Get toast call history
   */
  getToastCalls(): ToastCall[] {
    return [...this.toastCalls];
  }

  /**
   * Get the last toast call
   */
  getLastToastCall(): ToastCall | undefined {
    return this.toastCalls[this.toastCalls.length - 1];
  }

  /**
   * Get toast calls by type
   */
  getToastCallsByType(type: ToastType): ToastCall[] {
    return this.toastCalls.filter((call) => call.type === type);
  }

  /**
   * Check if a toast with specific content was called
   */
  wasToastCalledWith(
    title?: string,
    description?: string,
    type?: ToastType
  ): boolean {
    return this.toastCalls.some(
      (call) =>
        (!title || call.title === title) &&
        (!description || call.description === description) &&
        (!type || call.type === type)
    );
  }

  /**
   * Get count of toast calls
   */
  getToastCallCount(): number {
    return this.toastCalls.length;
  }

  /**
   * Clear all toasts and history
   */
  clear(): void {
    const { act } = require('@testing-library/react');
    act(() => {
      this.toasts.clear();
      this.toastCalls.length = 0;
      this.idCounter = 0;
    });
  }

  /**
   * Reset all mocks
   */
  resetMocks(): void {
    this.toast.mockClear();
    this.dismiss.mockClear();
    this.update.mockClear();
  }

  /**
   * Setup automatic cleanup after specified duration
   */
  setupAutoCleanup(duration: number = 5000): void {
    setTimeout(() => {
      const { act } = require('@testing-library/react');
      act(() => {
        this.toasts.clear();
      });
    }, duration);
  }
}

// Global mock toast system instance
let mockToastSystemInstance: MockToastSystem | null = null;

/**
 * Get or create the global mock toast system
 */
export const getMockToastSystem = (): MockToastSystem => {
  if (!mockToastSystemInstance) {
    mockToastSystemInstance = new MockToastSystem();
  }
  return mockToastSystemInstance;
};

/**
 * Setup mock toast system for testing
 */
export const setupMockToastSystem = (): MockToastSystem => {
  const mockSystem = getMockToastSystem();

  // Mock the useToast hook
  jest.doMock('@/hooks/use-toast', () => ({
    useToast: () => ({
      toast: mockSystem.toast,
      dismiss: mockSystem.dismiss,
      toasts: mockSystem.getActiveToasts(),
    }),
  }));

  // Mock the toast function directly
  jest.doMock('@/components/ui/use-toast', () => ({
    toast: mockSystem.toast,
    useToast: () => ({
      toast: mockSystem.toast,
      dismiss: mockSystem.dismiss,
      toasts: mockSystem.getActiveToasts(),
    }),
  }));

  return mockSystem;
};

/**
 * Cleanup mock toast system
 */
export const cleanupMockToastSystem = (): void => {
  if (mockToastSystemInstance) {
    mockToastSystemInstance.clear();
    mockToastSystemInstance.resetMocks();
  }

  // Restore original modules
  jest.dontMock('@/hooks/use-toast');
  jest.dontMock('@/components/ui/use-toast');
};

/**
 * Test utilities for toast assertions
 */
export const toastTestUtils = {
  /**
   * Assert that a toast was called with specific content
   */
  expectToastCalledWith: (
    title?: string,
    description?: string,
    type?: ToastType
  ) => {
    const mockSystem = getMockToastSystem();
    expect(mockSystem.wasToastCalledWith(title, description, type)).toBe(true);
  },

  /**
   * Assert that no toasts were called
   */
  expectNoToastsCalled: () => {
    const mockSystem = getMockToastSystem();
    expect(mockSystem.getToastCallCount()).toBe(0);
  },

  /**
   * Assert toast call count
   */
  expectToastCallCount: (count: number) => {
    const mockSystem = getMockToastSystem();
    expect(mockSystem.getToastCallCount()).toBe(count);
  },

  /**
   * Assert toast type count
   */
  expectToastTypeCount: (type: ToastType, count: number) => {
    const mockSystem = getMockToastSystem();
    expect(mockSystem.getToastCallsByType(type)).toHaveLength(count);
  },

  /**
   * Get last toast for detailed assertions
   */
  getLastToast: () => {
    const mockSystem = getMockToastSystem();
    return mockSystem.getLastToastCall();
  },

  /**
   * Get all toast calls for detailed assertions
   */
  getAllToastCalls: () => {
    const mockSystem = getMockToastSystem();
    return mockSystem.getToastCalls();
  },
};

export default {
  MockToastSystem,
  getMockToastSystem,
  setupMockToastSystem,
  cleanupMockToastSystem,
  toastTestUtils,
};
