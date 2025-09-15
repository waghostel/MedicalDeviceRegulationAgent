/**
 * Enhanced useToast Hook Mock for Testing
 * Matches the actual useToast implementation structure from use-toast.ts
 * Provides complete mock coverage for all toast functionality
 */

import { Toast } from '@/hooks/use-toast';

// Mock toast data for testing
export interface MockToastCall {
  id: string;
  title?: string;
  description?: string;
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info' | 'progress';
  duration?: number;
  onRetry?: () => void;
  retryLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionUrl?: string;
  progress?: number;
  showProgress?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'critical';
  category?: 'system' | 'user' | 'regulatory' | 'api' | 'validation';
  persistent?: boolean;
  retryCount?: number;
  maxRetries?: number;
  timestamp: number;
}

// Mock state for tracking toast calls
interface MockToastState {
  toasts: Toast[];
  queue: Toast[];
  rateLimitCount: number;
  lastResetTime: number;
  calls: MockToastCall[];
}

// Global mock state
let mockState: MockToastState = {
  toasts: [],
  queue: [],
  rateLimitCount: 0,
  lastResetTime: Date.now(),
  calls: [],
};

let idCounter = 0;

// Mock toast function that matches actual implementation
const mockToast = jest.fn((props: Partial<Toast>) => {
  const id = `mock-toast-${++idCounter}`;
  const timestamp = Date.now();
  
  const toastData: Toast = {
    id,
    title: props.title,
    description: props.description,
    variant: props.variant || 'default',
    duration: props.duration || 5000,
    open: true,
    onOpenChange: props.onOpenChange,
    onRetry: props.onRetry,
    retryLabel: props.retryLabel,
    actionLabel: props.actionLabel,
    onAction: props.onAction,
    actionUrl: props.actionUrl,
    progress: props.progress,
    showProgress: props.showProgress,
    priority: props.priority || 'normal',
    category: props.category || 'user',
    persistent: props.persistent,
    retryCount: props.retryCount || 0,
    maxRetries: props.maxRetries || 3,
  };

  const callData: MockToastCall = {
    ...toastData,
    timestamp,
  };

  // Add to mock state
  mockState.toasts.push(toastData);
  mockState.calls.push(callData);

  return {
    id,
    dismiss: () => mockDismiss(id),
    update: (updateProps: Partial<Toast>) => mockUpdate(id, updateProps),
    retry: () => mockRetry(id),
    updateProgress: (progress: number) => mockUpdateProgress(id, progress),
  };
});

// Mock dismiss function
const mockDismiss = jest.fn((toastId?: string) => {
  if (toastId) {
    mockState.toasts = mockState.toasts.filter(t => t.id !== toastId);
  } else {
    mockState.toasts = [];
  }
});

// Mock dismissAll function
const mockDismissAll = jest.fn(() => {
  mockState.toasts = [];
});

// Mock clearQueue function
const mockClearQueue = jest.fn(() => {
  mockState.queue = [];
});

// Mock update function
const mockUpdate = jest.fn((id: string, updateProps: Partial<Toast>) => {
  const toastIndex = mockState.toasts.findIndex(t => t.id === id);
  if (toastIndex !== -1) {
    mockState.toasts[toastIndex] = { ...mockState.toasts[toastIndex], ...updateProps };
  }
});

// Mock retry function
const mockRetry = jest.fn((id: string) => {
  const toast = mockState.toasts.find(t => t.id === id);
  if (toast && toast.onRetry) {
    toast.onRetry();
  }
});

// Mock updateProgress function
const mockUpdateProgress = jest.fn((id: string, progress: number) => {
  const toastIndex = mockState.toasts.findIndex(t => t.id === id);
  if (toastIndex !== -1) {
    mockState.toasts[toastIndex].progress = progress;
  }
});

// Mock getToastsByCategory function
const mockGetToastsByCategory = jest.fn((category: string) => {
  return mockState.toasts.filter(t => t.category === category);
});

// Mock getToastsByPriority function
const mockGetToastsByPriority = jest.fn((priority: 'low' | 'normal' | 'high' | 'critical') => {
  return mockState.toasts.filter(t => t.priority === priority);
});

// Mock contextual toast methods
const mockContextualToast = {
  fdaApiError: jest.fn((onRetry?: () => void) => {
    return mockToast({
      variant: 'destructive',
      title: 'FDA API Connection Failed',
      description: 'Unable to connect to FDA database. This may affect predicate searches and device classifications.',
      onRetry,
      retryLabel: 'Retry Connection',
      actionUrl: 'https://open.fda.gov/status/',
      actionLabel: 'Check FDA Status',
      category: 'api',
      priority: 'high',
    });
  }),

  predicateSearchFailed: jest.fn((onRetry?: () => void) => {
    return mockToast({
      variant: 'destructive',
      title: 'Predicate Search Failed',
      description: 'Could not complete predicate device search. Please check your search criteria and try again.',
      onRetry,
      retryLabel: 'Retry Search',
      category: 'regulatory',
      priority: 'high',
    });
  }),

  classificationError: jest.fn((onRetry?: () => void) => {
    return mockToast({
      variant: 'destructive',
      title: 'Device Classification Error',
      description: 'Unable to classify your device. Please verify device description and intended use.',
      onRetry,
      retryLabel: 'Try Again',
      actionUrl: 'https://www.fda.gov/medical-devices/classify-your-medical-device',
      actionLabel: 'Classification Guide',
      category: 'regulatory',
      priority: 'high',
    });
  }),

  projectSaveFailed: jest.fn((onRetry?: () => void) => {
    return mockToast({
      variant: 'destructive',
      title: 'Project Save Failed',
      description: 'Your project changes could not be saved. Your work may be lost if you navigate away.',
      onRetry,
      retryLabel: 'Save Again',
      category: 'user',
      priority: 'critical',
      persistent: true,
    });
  }),

  exportFailed: jest.fn((onRetry?: () => void) => {
    return mockToast({
      variant: 'destructive',
      title: 'Export Failed',
      description: 'Could not generate the requested export. Please try a different format or contact support.',
      onRetry,
      retryLabel: 'Retry Export',
      category: 'user',
      priority: 'normal',
    });
  }),

  validationError: jest.fn((message?: string) => {
    return mockToast({
      variant: 'warning',
      title: 'Validation Error',
      description: message || 'Please check the highlighted fields and ensure all required information is provided.',
      category: 'validation',
      priority: 'normal',
    });
  }),

  authExpired: jest.fn((onAction?: () => void) => {
    return mockToast({
      variant: 'warning',
      title: 'Session Expired',
      description: 'Your session has expired. Please sign in again to continue.',
      onAction,
      actionLabel: 'Sign In',
      category: 'system',
      priority: 'high',
      persistent: true,
    });
  }),

  networkError: jest.fn((onRetry?: () => void) => {
    return mockToast({
      variant: 'destructive',
      title: 'Network Connection Error',
      description: 'Please check your internet connection and try again.',
      onRetry,
      retryLabel: 'Retry',
      category: 'system',
      priority: 'high',
    });
  }),

  progress: jest.fn((title: string, description?: string) => {
    return mockToast({
      variant: 'progress',
      title,
      description,
      showProgress: true,
      progress: 0,
      persistent: true,
      category: 'system',
      priority: 'normal',
    });
  }),

  success: jest.fn((title: string, description?: string) => {
    return mockToast({
      variant: 'success',
      title,
      description,
      category: 'user',
      priority: 'normal',
    });
  }),

  info: jest.fn((title: string, description?: string, actionUrl?: string) => {
    return mockToast({
      variant: 'info',
      title,
      description,
      actionUrl,
      actionLabel: actionUrl ? 'Learn More' : undefined,
      category: 'system',
      priority: 'low',
    });
  }),
};

// Mock useToast hook
export const mockUseToast = jest.fn(() => ({
  // State properties (return current state)
  get toasts() { return mockState.toasts; },
  get queue() { return mockState.queue; },
  get rateLimitCount() { return mockState.rateLimitCount; },
  get lastResetTime() { return mockState.lastResetTime; },

  // Functions
  toast: mockToast,
  contextualToast: mockContextualToast,
  dismiss: mockDismiss,
  dismissAll: mockDismissAll,
  clearQueue: mockClearQueue,
  getToastsByCategory: mockGetToastsByCategory,
  getToastsByPriority: mockGetToastsByPriority,
}));

// Test utilities for assertions
export const toastMockUtils = {
  // Get all toast calls
  getCalls: () => [...mockState.calls],

  // Get last toast call
  getLastCall: () => mockState.calls[mockState.calls.length - 1],

  // Get calls by type
  getCallsByVariant: (variant: string) => 
    mockState.calls.filter(call => call.variant === variant),

  // Get calls by category
  getCallsByCategory: (category: string) => 
    mockState.calls.filter(call => call.category === category),

  // Check if toast was called with specific content
  wasCalledWith: (title?: string, description?: string, variant?: string) => {
    return mockState.calls.some(call => 
      (!title || call.title === title) &&
      (!description || call.description === description) &&
      (!variant || call.variant === variant)
    );
  },

  // Get call count
  getCallCount: () => mockState.calls.length,

  // Clear all mock data
  clear: () => {
    mockState = {
      toasts: [],
      queue: [],
      rateLimitCount: 0,
      lastResetTime: Date.now(),
      calls: [],
    };
    idCounter = 0;
  },

  // Reset all mocks
  resetMocks: () => {
    mockToast.mockClear();
    mockDismiss.mockClear();
    mockDismissAll.mockClear();
    mockClearQueue.mockClear();
    mockUpdate.mockClear();
    mockRetry.mockClear();
    mockUpdateProgress.mockClear();
    mockGetToastsByCategory.mockClear();
    mockGetToastsByPriority.mockClear();
    mockUseToast.mockClear();
    
    // Reset contextual toast mocks
    Object.values(mockContextualToast).forEach(mockFn => {
      if (jest.isMockFunction(mockFn)) {
        mockFn.mockClear();
      }
    });
  },

  // Get current state
  getState: () => ({ ...mockState }),

  // Set mock state (for testing specific scenarios)
  setState: (newState: Partial<MockToastState>) => {
    mockState = { ...mockState, ...newState };
  },
};

// Export the complete mock structure
export const useToastMock = {
  useToast: mockUseToast,
  toast: mockToast,
  contextualToast: mockContextualToast,
  utils: toastMockUtils,
};

export default useToastMock;