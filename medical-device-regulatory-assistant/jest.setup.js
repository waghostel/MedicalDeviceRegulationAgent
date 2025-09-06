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
    'bypass': { enabled: true },
    'document-title': { enabled: true },
    'duplicate-id': { enabled: true },
    'form-field-multiple-labels': { enabled: true },
    'frame-title': { enabled: true },
    'html-has-lang': { enabled: true },
    'html-lang-valid': { enabled: true },
    'image-alt': { enabled: true },
    'input-image-alt': { enabled: true },
    'label': { enabled: true },
    'link-name': { enabled: true },
    'list': { enabled: true },
    'listitem': { enabled: true },
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
  value: jest.fn().mockImplementation(query => ({
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
