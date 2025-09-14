/**
 * Consolidated Test Setup - Simplified MSW Integration
 * 
 * This file provides a single, unified test setup that handles all mocking needs
 * without complex imports or TypeScript/JavaScript conflicts.
 */

import { generateMockProject, generateMockDeviceClassification, generateMockPredicateDevices } from '@/lib/mock-data';

// Mock endpoint configuration
export interface MockEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  response: any;
  delay?: number;
  error?: boolean;
  statusCode?: number;
}

// Simple mock server state
let mockEndpoints: Map<string, MockEndpoint> = new Map();
let originalFetch: typeof global.fetch;

// Helper function to simulate delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock Response class for test environment
class MockResponse {
  private _body: string;
  private _status: number;
  private _headers: Record<string, string>;

  constructor(body: string, init?: { status?: number; headers?: Record<string, string> }) {
    this._body = body;
    this._status = init?.status || 200;
    this._headers = init?.headers || {};
  }

  get ok() {
    return this._status >= 200 && this._status < 300;
  }

  get status() {
    return this._status;
  }

  get headers() {
    return {
      get: (name: string) => this._headers[name.toLowerCase()],
    };
  }

  async json() {
    return JSON.parse(this._body);
  }

  async text() {
    return this._body;
  }
}

// Default mock data generators
const createDefaultMockData = () => ({
  projects: [
    generateMockProject({ id: 1, name: 'CardioProbe X' }),
    generateMockProject({ id: 2, name: 'NeuroStim Device' }),
    generateMockProject({ id: 3, name: 'BloodGlucose Monitor' }),
  ],
  classification: generateMockDeviceClassification({ projectId: '1' }),
  predicates: generateMockPredicateDevices(8),
});

/**
 * Setup mock API server with simplified fetch mocking
 */
export const setupTestMocks = (customEndpoints: MockEndpoint[] = []): void => {
  // Store original fetch
  originalFetch = global.fetch;
  
  // Setup mock endpoints
  customEndpoints.forEach(endpoint => {
    const key = `${endpoint.method}:${endpoint.path}`;
    mockEndpoints.set(key, endpoint);
  });

  // Mock fetch function
  global.fetch = jest.fn().mockImplementation(async (url: string, options: RequestInit = {}) => {
    const method = (options.method || 'GET').toUpperCase();
    const key = `${method}:${url}`;
    
    const endpoint = mockEndpoints.get(key);
    if (endpoint) {
      // Simulate delay if specified
      if (endpoint.delay) {
        await delay(endpoint.delay);
      }
      
      // Return error if specified
      if (endpoint.error) {
        throw new Error(`Mock API error for ${key}`);
      }
      
      // Return mock response
      return new MockResponse(JSON.stringify(endpoint.response), {
        status: endpoint.statusCode || 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    // Default mock responses for common endpoints
    const mockData = createDefaultMockData();
    
    if (url.includes('/api/projects') && method === 'GET') {
      return new MockResponse(JSON.stringify({ projects: mockData.projects, total: 3 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (url.includes('/api/projects') && method === 'POST') {
      const newProject = generateMockProject({ 
        id: Date.now(), 
        name: 'New Project',
        status: 'draft' as any
      });
      return new MockResponse(JSON.stringify(newProject), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Default mock response for unmatched endpoints
    return new MockResponse(JSON.stringify({ message: 'Mock API response' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });
};

/**
 * Teardown mock API server
 */
export const teardownTestMocks = (): void => {
  // Restore original fetch
  if (originalFetch) {
    global.fetch = originalFetch;
  }
  
  // Clear mock endpoints
  mockEndpoints.clear();
  
  // Clear fetch mock
  if (jest.isMockFunction(global.fetch)) {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockRestore();
  }
};

/**
 * Reset mock API handlers to default state
 */
export const resetTestMocks = (): void => {
  mockEndpoints.clear();
  if (jest.isMockFunction(global.fetch)) {
    (global.fetch as jest.MockedFunction<typeof fetch>).mockClear();
  }
};

/**
 * Add runtime handlers to existing mock server
 */
export const addMockHandlers = (endpoints: MockEndpoint[]): void => {
  endpoints.forEach(endpoint => {
    const key = `${endpoint.method}:${endpoint.path}`;
    mockEndpoints.set(key, endpoint);
  });
};

/**
 * Setup WebSocket mocks for real-time features
 */
export const setupWebSocketMocks = (): void => {
  // Mock WebSocket class
  global.WebSocket = jest.fn().mockImplementation(() => ({
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    send: jest.fn(),
    close: jest.fn(),
    readyState: 1, // OPEN
    CONNECTING: 0,
    OPEN: 1,
    CLOSING: 2,
    CLOSED: 3,
  }));
};

/**
 * Setup component mocks for UI testing
 */
export const setupComponentMocks = (): void => {
  // Mock toast notifications
  jest.mock('@/hooks/use-toast', () => ({
    toast: {
      success: jest.fn(),
      error: jest.fn(),
      warning: jest.fn(),
      info: jest.fn(),
      authExpired: jest.fn(),
      networkError: jest.fn(),
      validationError: jest.fn(),
    },
  }));

  // Mock WebSocket hooks
  jest.mock('@/hooks/use-websocket', () => ({
    useWebSocket: jest.fn(() => ({
      connectionStatus: 'connected',
      send: jest.fn(),
      lastMessage: null,
      error: null,
      reconnect: jest.fn(),
    })),
    useProjectWebSocket: jest.fn(() => ({
      connectionStatus: 'connected',
      sendMessage: jest.fn(),
      subscribe: jest.fn(),
    })),
  }));

  // Mock offline functionality
  jest.mock('@/hooks/use-offline', () => ({
    useOffline: jest.fn(() => ({
      isOffline: false,
      pendingActions: [],
    })),
  }));
};

/**
 * Complete test environment setup
 * This is the main function to call in test setup
 */
export const setupTestEnvironment = (options: {
  mockAPI?: boolean;
  mockWebSocket?: boolean;
  mockComponents?: boolean;
  customEndpoints?: MockEndpoint[];
} = {}): void => {
  const {
    mockAPI = true,
    mockWebSocket = true,
    mockComponents = true,
    customEndpoints = [],
  } = options;

  if (mockAPI) {
    setupTestMocks(customEndpoints);
  }

  if (mockWebSocket) {
    setupWebSocketMocks();
  }

  if (mockComponents) {
    setupComponentMocks();
  }
};

/**
 * Complete test environment teardown
 */
export const teardownTestEnvironment = (): void => {
  teardownTestMocks();
  jest.clearAllMocks();
  jest.resetModules();
};

// Export legacy compatibility functions
export const setupMockAPI = setupTestMocks;
export const teardownMockAPI = teardownTestMocks;
export const resetMockAPI = resetTestMocks;

// Default export for easy importing
export default {
  setupTestEnvironment,
  teardownTestEnvironment,
  setupTestMocks,
  teardownTestMocks,
  resetTestMocks,
  addMockHandlers,
  setupWebSocketMocks,
  setupComponentMocks,
};