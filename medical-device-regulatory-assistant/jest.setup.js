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
