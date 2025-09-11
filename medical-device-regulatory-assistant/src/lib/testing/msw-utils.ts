/**
 * Simplified Mock Service Worker utilities for API mocking in tests
 * Provides setupMockAPI and teardownMockAPI utilities without MSW dependencies
 */

// Import simplified mock data generators
import { 
  generateMockProject, 
  generateMockDeviceClassification, 
  generateMockPredicateDevices,
  generateMockAgentInteraction,
  generateDatabaseSeed,
  TestScenario,
  generateTestScenario
} from '@/lib/mock-data';

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

// Default mock data generators
const createDefaultMockData = () => ({
  projects: [
    generateMockProject({ id: 1, name: 'CardioProbe X' }),
    generateMockProject({ id: 2, name: 'NeuroStim Device' }),
    generateMockProject({ id: 3, name: 'BloodGlucose Monitor' }),
  ],
  classification: generateMockDeviceClassification({ projectId: '1' }),
  predicates: generateMockPredicateDevices(8),
  interaction: generateMockAgentInteraction({ project_id: 1 }),
});

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
        await delay(endpoint.delay);
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
    
    // Default mock responses for common endpoints
    const mockData = createDefaultMockData();
    
    if (url.includes('/api/projects') && method === 'GET') {
      return new Response(JSON.stringify({ projects: mockData.projects, total: 3 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
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
 * Reset mock API handlers to default state
 */
export const resetMockAPI = (): void => {
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
 * Setup scenario-based mock API responses
 */
export const setupScenarioAPI = (scenario: TestScenario): void => {
  const scenarioData = generateTestScenario(scenario);
  
  const scenarioEndpoints: MockEndpoint[] = [
    {
      method: 'GET',
      path: '/api/projects',
      response: { projects: scenarioData.projects, total: scenarioData.projects.length },
    },
    {
      method: 'GET',
      path: '/api/projects/:id/classification',
      response: scenarioData.classifications[0] || null,
    },
    {
      method: 'GET',
      path: '/api/projects/:id/predicates',
      response: { predicates: scenarioData.predicateDevices, total: scenarioData.predicateDevices.length },
    },
  ];
  
  setupMockAPI(scenarioEndpoints);
};

// Export utilities
export const mswUtils = {
  setupMockAPI,
  teardownMockAPI,
  resetMockAPI,
  addMockHandlers,
  setupScenarioAPI,
};

export default mswUtils;