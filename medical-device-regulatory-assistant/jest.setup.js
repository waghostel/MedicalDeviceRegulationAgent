require('@testing-library/jest-dom');

// Import jest-axe for accessibility testing
const { configureAxe } = require('jest-axe');

// Configure axe for accessibility testing
const axe = configureAxe({
  rules: {
    // Disable color-contrast rule in tests (can be flaky in jsdom)
    'color-contrast': { enabled: false },
    // Enable other important accessibility rules
    'aria-allowed-attr': { enabled: true },
    'aria-hidden-focus': { enabled: true },
    'aria-labelledby': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-required-children': { enabled: true },
    'aria-required-parent': { enabled: true },
    'aria-roles': { enabled: true },
    'aria-valid-attr': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'button-name': { enabled: true },
    bypass: { enabled: true },
    'document-title': { enabled: true },
    'duplicate-id': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    'frame-title': { enabled: true },
    'html-has-lang': { enabled: true },
    'html-lang-valid': { enabled: true },
    'image-alt': { enabled: true },
    'input-image-alt': { enabled: true },
    label: { enabled: true },
    'link-name': { enabled: true },
    list: { enabled: true },
    listitem: { enabled: true },
    'meta-refresh': { enabled: true },
    'meta-viewport': { enabled: true },
    'object-alt': { enabled: true },
    'role-img-alt': { enabled: true },
    'scrollable-region-focusable': { enabled: true },
    'select-name': { enabled: true },
    'server-side-image-map': { enabled: true },
    'svg-img-alt': { enabled: true },
    'td-headers-attr': { enabled: true },
    'th-has-data-cells': { enabled: true },
    'valid-lang': { enabled: true },
    'video-caption': { enabled: true },
  },
});

// Make axe available globally
global.axe = axe;

// ===== REACT 19 COMPATIBILITY ENHANCEMENTS =====

// React 19 Error Handling Setup
// Enhanced error handling for React 19 AggregateError patterns
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

// Track React 19 specific errors for better debugging
global.__REACT_19_ERROR_TRACKER = {
  aggregateErrors: [],
  renderErrors: [],
  hookErrors: [],
  clear: function() {
    this.aggregateErrors = [];
    this.renderErrors = [];
    this.hookErrors = [];
  }
};

// Enhanced console error handling for React 19
console.error = (...args) => {
  const message = args[0];
  
  // Track React 19 AggregateError patterns
  if (typeof message === 'string') {
    if (message.includes('AggregateError')) {
      global.__REACT_19_ERROR_TRACKER.aggregateErrors.push({
        message,
        args: args.slice(1),
        timestamp: Date.now(),
        stack: new Error().stack
      });
    } else if (message.includes('useToast') || message.includes('is not a function')) {
      global.__REACT_19_ERROR_TRACKER.hookErrors.push({
        message,
        args: args.slice(1),
        timestamp: Date.now(),
        stack: new Error().stack
      });
    } else if (message.includes('render') || message.includes('Cannot read properties')) {
      global.__REACT_19_ERROR_TRACKER.renderErrors.push({
        message,
        args: args.slice(1),
        timestamp: Date.now(),
        stack: new Error().stack
      });
    }
  }
  
  // Filter out known React 19 development warnings that are not actionable in tests
  if (typeof message === 'string' && (
    message.includes('Warning: ReactDOM.render is no longer supported') ||
    message.includes('Warning: React.createFactory() is deprecated') ||
    message.includes('Warning: componentWillReceiveProps has been renamed') ||
    message.includes('Warning: componentWillMount has been renamed') ||
    message.includes('Warning: componentWillUpdate has been renamed')
  )) {
    // Suppress these warnings in test environment
    return;
  }
  
  // Call original console.error for all other messages
  originalConsoleError.apply(console, args);
};

// Enhanced console warn handling for React 19
console.warn = (...args) => {
  const message = args[0];
  
  // Filter out React 19 development warnings that clutter test output
  if (typeof message === 'string' && (
    message.includes('Warning: Each child in a list should have a unique "key" prop') ||
    message.includes('Warning: Failed prop type') ||
    message.includes('Warning: React.createElement: type is invalid') ||
    message.includes('Warning: validateDOMNesting')
  )) {
    // Only show these warnings if JEST_VERBOSE is enabled
    if (process.env.JEST_VERBOSE) {
      originalConsoleWarn.apply(console, args);
    }
    return;
  }
  
  // Call original console.warn for all other messages
  originalConsoleWarn.apply(console, args);
};

// React 19 Feature Detection and Compatibility
global.__REACT_VERSION = '19.1.0';
global.__REACT_19_FEATURES = {
  concurrentFeatures: true,
  automaticBatching: true,
  suspenseSSR: true,
  strictMode: true,
  errorBoundaryEnhancements: true,
  aggregateErrorSupport: true
};

// React 19 Development Tools Hook Enhancement
if (typeof global.__REACT_DEVTOOLS_GLOBAL_HOOK__ === 'undefined') {
  global.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    isDisabled: true,
    supportsFiber: true,
    inject: () => {},
    onCommitFiberRoot: () => {},
    onCommitFiberUnmount: () => {},
    // React 19 specific hooks
    onErrorCaptured: () => {},
    onRecoverableError: () => {},
    onAggregateError: (error) => {
      if (error instanceof AggregateError) {
        global.__REACT_19_ERROR_TRACKER.aggregateErrors.push({
          message: error.message,
          errors: error.errors?.map(e => e.message) || [],
          timestamp: Date.now(),
          source: 'devtools'
        });
      }
    }
  };
}

// Polyfills for MSW and Node.js compatibility
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Add Response polyfill for MSW
if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || 'OK';
      this.headers = new Map(Object.entries(init.headers || {}));
    }

    json() {
      return Promise.resolve(JSON.parse(this.body));
    }

    text() {
      return Promise.resolve(this.body);
    }
  };
}

// Add Request polyfill for MSW
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(url, init = {}) {
      this.url = url;
      this.method = init.method || 'GET';
      this.headers = new Map(Object.entries(init.headers || {}));
      this.body = init.body;
    }

    json() {
      return Promise.resolve(JSON.parse(this.body));
    }
  };
}

// Add Headers polyfill for MSW
if (typeof global.Headers === 'undefined') {
  global.Headers = Map;
}

// Mock fetch for tests
global.fetch = jest.fn();

// Mock WebSocket for tests
global.WebSocket = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock IntersectionObserver for accessibility tests
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock ResizeObserver for accessibility tests
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock matchMedia for responsive accessibility tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Polyfills for Pointer Capture API (required by Radix UI)
Object.defineProperty(Element.prototype, 'hasPointerCapture', {
  value: jest.fn(() => false),
  writable: true,
});

Object.defineProperty(Element.prototype, 'setPointerCapture', {
  value: jest.fn(),
  writable: true,
});

Object.defineProperty(Element.prototype, 'releasePointerCapture', {
  value: jest.fn(),
  writable: true,
});

// Mock getComputedStyle for better component testing
Object.defineProperty(window, 'getComputedStyle', {
  value: jest.fn().mockImplementation(() => ({
    getPropertyValue: jest.fn(() => ''),
    display: 'block',
    visibility: 'visible',
    opacity: '1',
    transform: 'none',
    transition: 'none',
    animation: 'none',
  })),
  writable: true,
});

// Mock scrollIntoView for better component testing
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  value: jest.fn(),
  writable: true,
});

// Mock getBoundingClientRect for layout-dependent tests
Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
  value: jest.fn(() => ({
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
    x: 0,
    y: 0,
  })),
  writable: true,
});

// Mock focus and blur methods for accessibility testing
Object.defineProperty(HTMLElement.prototype, 'focus', {
  value: jest.fn(),
  writable: true,
});

Object.defineProperty(HTMLElement.prototype, 'blur', {
  value: jest.fn(),
  writable: true,
});

// Note: Clipboard API mock removed to avoid conflicts with user-event library

// Setup Radix UI mocks for better testing compatibility
try {
  const { setupRadixUIMocks } = require('./src/lib/testing/radix-ui-mocks');
  setupRadixUIMocks();
} catch (error) {
  console.warn('Could not setup Radix UI mocks:', error.message);
}

// ===== GLOBAL MOCK REGISTRY AND CLEANUP SYSTEM =====

// Global mock registry for comprehensive cleanup (Requirement 7.1)
global.__GLOBAL_MOCK_REGISTRY = {
  hooks: new Map(),
  components: new Map(),
  providers: new Map(),
  utilities: new Map(),
  timers: new Set(),
  storage: new Map(),
  
  // Register a mock for cleanup tracking
  register: function(type, name, mock) {
    if (this[type] && this[type].set) {
      this[type].set(name, mock);
    }
  },
  
  // Clear all registered mocks
  clearAll: function() {
    this.hooks.clear();
    this.components.clear();
    this.providers.clear();
    this.utilities.clear();
    this.timers.clear();
    this.storage.clear();
  },
  
  // Get cleanup summary
  getSummary: function() {
    return {
      hooks: this.hooks.size,
      components: this.components.size,
      providers: this.providers.size,
      utilities: this.utilities.size,
      timers: this.timers.size,
      storage: this.storage.size
    };
  }
};

// Enhanced global cleanup function (Requirements 5.3 and 7.1)
global.__ENHANCED_CLEANUP = function() {
  // Clear React 19 error tracking
  if (global.__REACT_19_ERROR_TRACKER) {
    global.__REACT_19_ERROR_TRACKER.clear();
  }
  
  // Clear all Jest mocks
  jest.clearAllMocks();
  jest.restoreAllMocks();
  
  // Clear global mock registry
  global.__GLOBAL_MOCK_REGISTRY.clearAll();
  
  // Clear localStorage mock
  if (global.localStorage && typeof global.localStorage.clear === 'function') {
    global.localStorage.clear();
  }
  
  // Clear sessionStorage mock
  if (global.sessionStorage && typeof global.sessionStorage.clear === 'function') {
    global.sessionStorage.clear();
  }
  
  // Clear fetch mock
  if (global.fetch && global.fetch.mockClear) {
    global.fetch.mockClear();
  }
  
  // Clear WebSocket mock
  if (global.WebSocket && global.WebSocket.mockClear) {
    global.WebSocket.mockClear();
  }
  
  // Clear timers if they were mocked
  if (jest.isMockFunction(setTimeout)) {
    jest.useRealTimers();
  }
  
  // Clear any DOM modifications
  if (typeof document !== 'undefined') {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  }
  
  // Force garbage collection if available (helps with memory cleanup)
  if (global.gc) {
    global.gc();
  }
  
  // Clear module cache for dynamic imports (React 19 compatibility)
  if (jest.resetModules) {
    jest.resetModules();
  }
};

// Global beforeEach setup for React 19 compatibility
beforeEach(() => {
  // Clear React 19 error tracking before each test
  if (global.__REACT_19_ERROR_TRACKER) {
    global.__REACT_19_ERROR_TRACKER.clear();
  }
  
  // Reset console methods to ensure clean state
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
  
  // Re-apply React 19 enhanced error handling
  console.error = (...args) => {
    const message = args[0];
    
    if (typeof message === 'string') {
      if (message.includes('AggregateError')) {
        global.__REACT_19_ERROR_TRACKER.aggregateErrors.push({
          message,
          args: args.slice(1),
          timestamp: Date.now(),
          stack: new Error().stack
        });
      } else if (message.includes('useToast') || message.includes('is not a function')) {
        global.__REACT_19_ERROR_TRACKER.hookErrors.push({
          message,
          args: args.slice(1),
          timestamp: Date.now(),
          stack: new Error().stack
        });
      } else if (message.includes('render') || message.includes('Cannot read properties')) {
        global.__REACT_19_ERROR_TRACKER.renderErrors.push({
          message,
          args: args.slice(1),
          timestamp: Date.now(),
          stack: new Error().stack
        });
      }
    }
    
    // Filter React 19 development warnings
    if (typeof message === 'string' && (
      message.includes('Warning: ReactDOM.render is no longer supported') ||
      message.includes('Warning: React.createFactory() is deprecated') ||
      message.includes('Warning: componentWillReceiveProps has been renamed') ||
      message.includes('Warning: componentWillMount has been renamed') ||
      message.includes('Warning: componentWillUpdate has been renamed')
    )) {
      return;
    }
    
    originalConsoleError.apply(console, args);
  };
});

// Global afterEach cleanup for React 19 compatibility
afterEach(() => {
  // Perform enhanced cleanup after each test
  global.__ENHANCED_CLEANUP();
  
  // Log React 19 errors if any occurred during the test (for debugging)
  if (global.__REACT_19_ERROR_TRACKER) {
    const tracker = global.__REACT_19_ERROR_TRACKER;
    const totalErrors = tracker.aggregateErrors.length + tracker.hookErrors.length + tracker.renderErrors.length;
    
    if (totalErrors > 0 && process.env.JEST_VERBOSE) {
      console.log(`\n🔍 React 19 Error Summary for test:`);
      console.log(`  AggregateErrors: ${tracker.aggregateErrors.length}`);
      console.log(`  Hook Errors: ${tracker.hookErrors.length}`);
      console.log(`  Render Errors: ${tracker.renderErrors.length}`);
      
      // Show first error of each type for debugging
      if (tracker.aggregateErrors.length > 0) {
        console.log(`  First AggregateError: ${tracker.aggregateErrors[0].message}`);
      }
      if (tracker.hookErrors.length > 0) {
        console.log(`  First Hook Error: ${tracker.hookErrors[0].message}`);
      }
      if (tracker.renderErrors.length > 0) {
        console.log(`  First Render Error: ${tracker.renderErrors[0].message}`);
      }
    }
  }
});

// Setup consolidated test environment
try {
  const { setupTestEnvironment } = require('./src/lib/testing/test-setup');
  setupTestEnvironment({
    mockAPI: true,
    mockWebSocket: true,
    mockComponents: true,
  });
} catch (error) {
  console.warn('Could not setup test environment:', error.message);
}

// Setup performance tracking for all tests (Requirements 5.1 and 5.2)
try {
  const { setupJestPerformanceTracking } = require('./src/lib/testing/jest-performance-setup');
  setupJestPerformanceTracking();
  console.log('📊 Performance tracking enabled for all tests');
} catch (error) {
  console.warn('Could not setup performance tracking:', error.message);
}

// Setup test health monitoring (Requirements 5.2 and 8.1)
try {
  const { createHealthReporter } = require('./src/lib/testing/test-health-monitor');
  const healthReporter = createHealthReporter();
  
  // Make health reporter available globally for Jest integration
  global.__testHealthReporter = healthReporter;
  console.log('🏥 Test health monitoring enabled');
} catch (error) {
  console.warn('Could not setup test health monitoring:', error.message);
}

// ===== REACT 19 SPECIFIC GLOBAL SETUP =====

// Enhanced unhandled rejection handling for React 19
process.on('unhandledRejection', (reason, promise) => {
  // Track unhandled rejections that might be related to React 19 AggregateError
  if (reason instanceof AggregateError) {
    console.warn('Unhandled AggregateError rejection in test:', {
      totalErrors: reason.errors?.length || 0,
      errors: reason.errors?.map(e => e.message) || [],
      promise: promise.toString()
    });
    
    if (global.__REACT_19_ERROR_TRACKER) {
      global.__REACT_19_ERROR_TRACKER.aggregateErrors.push({
        message: reason.message,
        errors: reason.errors?.map(e => e.message) || [],
        timestamp: Date.now(),
        source: 'unhandledRejection'
      });
    }
  }
});

// Enhanced uncaught exception handling for React 19
process.on('uncaughtException', (error) => {
  // Track uncaught exceptions that might be related to React 19
  if (error instanceof AggregateError) {
    console.warn('Uncaught AggregateError in test:', {
      totalErrors: error.errors?.length || 0,
      errors: error.errors?.map(e => e.message) || [],
      stack: error.stack
    });
    
    if (global.__REACT_19_ERROR_TRACKER) {
      global.__REACT_19_ERROR_TRACKER.aggregateErrors.push({
        message: error.message,
        errors: error.errors?.map(e => e.message) || [],
        timestamp: Date.now(),
        source: 'uncaughtException'
      });
    }
  }
});

// Global test completion summary (Requirements 5.3 and 7.1)
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    // Final cleanup and summary
    const mockSummary = global.__GLOBAL_MOCK_REGISTRY ? global.__GLOBAL_MOCK_REGISTRY.getSummary() : {};
    const errorSummary = global.__REACT_19_ERROR_TRACKER ? {
      aggregateErrors: global.__REACT_19_ERROR_TRACKER.aggregateErrors.length,
      hookErrors: global.__REACT_19_ERROR_TRACKER.hookErrors.length,
      renderErrors: global.__REACT_19_ERROR_TRACKER.renderErrors.length
    } : {};
    
    if (process.env.JEST_VERBOSE) {
      console.log('\n🧹 Final Test Cleanup Summary:');
      console.log('  Mock Registry:', mockSummary);
      console.log('  React 19 Errors:', errorSummary);
    }
    
    // Perform final cleanup
    if (global.__ENHANCED_CLEANUP) {
      global.__ENHANCED_CLEANUP();
    }
  });
}
