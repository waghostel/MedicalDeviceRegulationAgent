/**
 * Simplified Mock Service Worker utilities for API mocking in tests
 * Provides basic setupMockAPI and teardownMockAPI utilities without complex MSW setup
 */

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

/**
 * Setup mock API server with simplified fetch mocking
 */
export const setupMockAPI = (customEndpoints: MockEndpoint[] = []): void => {
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
        await new Promise(resolve => setTimeout(resolve, endpoint.delay));
      }
      
      // Return error if specified
      if (endpoint.error) {
        throw new Error(`Mock API error for ${key}`);
      }
      
      // Return mock response
      return new Response(JSON.stringify(endpoint.response), {
        status: endpoint.statusCode || 200,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
    
    // Default mock response for unmatched endpoints
    return new Response(JSON.stringify({ message: 'Mock API response' }), {
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
export const teardownMockAPI = (): void => {
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
 * Add a mock endpoint
 */
export const addMockEndpoint = (endpoint: MockEndpoint): void => {
  const key = `${endpoint.method}:${endpoint.path}`;
  mockEndpoints.set(key, endpoint);
};

/**
 * Remove a mock endpoint
 */
export const removeMockEndpoint = (method: string, path: string): void => {
  const key = `${method}:${path}`;
  mockEndpoints.delete(key);
};

/**
 * Clear all mock endpoints
 */
export const clearMockEndpoints = (): void => {
  mockEndpoints.clear();
};

/**
 * Get all mock endpoints
 */
export const getMockEndpoints = (): MockEndpoint[] => {
  return Array.from(mockEndpoints.values());
};

/**
 * Default mock endpoints for common API calls
 */
export const getDefaultMockEndpoints = (): MockEndpoint[] => {
  return [
    {
      method: 'GET',
      path: '/api/projects/1',
      response: {
        id: '1',
        name: 'Test Medical Device',
        description: 'A test device for regulatory analysis',
        deviceType: 'Class II',
        intendedUse: 'For diagnostic purposes',
        status: 'active',
      },
    },
    {
      method: 'POST',
      path: '/api/projects/1/classification',
      response: {
        id: '1',
        projectId: '1',
        deviceClass: 'II',
        productCode: 'ABC',
        regulatoryPathway: '510k',
        confidenceScore: 0.85,
      },
      delay: 300,
    },
    {
      method: 'GET',
      path: '/api/projects/1/predicates',
      response: [
        {
          id: '1',
          projectId: '1',
          kNumber: 'K123456',
          deviceName: 'Similar Diagnostic Device',
          intendedUse: 'For similar diagnostic purposes',
          productCode: 'ABC',
          confidenceScore: 0.9,
        },
      ],
      delay: 200,
    },
  ];
};

export default {
  setupMockAPI,
  teardownMockAPI,
  addMockEndpoint,
  removeMockEndpoint,
  clearMockEndpoints,
  getMockEndpoints,
  getDefaultMockEndpoints,
};