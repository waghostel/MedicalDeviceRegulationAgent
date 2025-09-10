/**
 * Mock Service Worker utilities for API mocking in tests
 * Provides setupMockAPI and teardownMockAPI utilities
 */

// Temporarily disable MSW imports to fix parsing issues
// import { setupServer } from 'msw/node';
// import { http, HttpResponse, delay } from 'msw';
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

// Mock API server instance
let mockServer: ReturnType<typeof setupServer> | null = null;

// Default mock handlers for common API endpoints
const createDefaultHandlers = () => [
  // Projects API
  http.get('/api/projects', async () => {
    await delay(100);
    const projects = [
      generateMockProject({ id: 1, name: 'CardioProbe X' }),
      generateMockProject({ id: 2, name: 'NeuroStim Device' }),
      generateMockProject({ id: 3, name: 'BloodGlucose Monitor' }),
    ];
    return HttpResponse.json({ projects, total: 3 });
  }),

  http.post('/api/projects', async ({ request }) => {
    await delay(200);
    const body = await request.json() as any;
    const newProject = generateMockProject({
      id: Math.floor(Math.random() * 10000),
      name: body.name,
      description: body.description,
      device_type: body.device_type,
      intended_use: body.intended_use,
    });
    return HttpResponse.json(newProject, { status: 201 });
  }),

  http.get('/api/projects/:id', async ({ params }) => {
    await delay(100);
    const project = generateMockProject({ 
      id: parseInt(params.id as string),
      name: 'Test Project'
    });
    return HttpResponse.json(project);
  }),

  // Classification API
  http.get('/api/projects/:id/classification', async ({ params }) => {
    await delay(150);
    const classification = generateMockDeviceClassification({
      projectId: params.id as string,
    });
    return HttpResponse.json(classification);
  }),

  http.post('/api/projects/:id/classification', async ({ params }) => {
    await delay(2000); // Simulate classification processing time
    const classification = generateMockDeviceClassification({
      projectId: params.id as string,
      confidenceScore: 0.87,
    });
    return HttpResponse.json(classification, { status: 201 });
  }),
]; 
 // Predicate devices API
  http.get('/api/projects/:id/predicates', async ({ params }) => {
    await delay(200);
    const predicates = generateMockPredicateDevices(8);
    return HttpResponse.json({ predicates, total: 8 });
  }),

  http.post('/api/projects/:id/predicates/search', async ({ params }) => {
    await delay(3000); // Simulate predicate search time
    const predicates = generateMockPredicateDevices(10);
    return HttpResponse.json({ predicates, total: 10 });
  }),

  // Agent interactions API
  http.post('/api/projects/:id/agent/interact', async ({ params, request }) => {
    await delay(1500);
    const body = await request.json() as any;
    const interaction = generateMockAgentInteraction({
      project_id: parseInt(params.id as string),
      agent_action: body.action || 'general_query',
      input_data: body.input || {},
    });
    return HttpResponse.json(interaction, { status: 201 });
  }),

  // Authentication API
  http.get('/api/auth/session', async () => {
    await delay(50);
    return HttpResponse.json({
      user: {
        id: 'user-1',
        name: 'Test User',
        email: 'test@example.com',
        image: 'https://example.com/avatar.jpg',
      },
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }),

  // FDA API mock endpoints
  http.get('https://api.fda.gov/device/510k.json', async ({ request }) => {
    await delay(500);
    const url = new URL(request.url);
    const search = url.searchParams.get('search');
    
    // Mock FDA API response
    return HttpResponse.json({
      meta: {
        disclaimer: 'Mock FDA API response for testing',
        terms: 'https://open.fda.gov/terms/',
        license: 'https://open.fda.gov/license/',
        last_updated: '2023-12-01',
        results: {
          skip: 0,
          limit: 100,
          total: 5,
        },
      },
      results: [
        {
          k_number: 'K123456',
          device_name: 'CardioMonitor Pro',
          applicant: 'MedTech Solutions Inc.',
          date_received: '2023-01-01',
          decision_date: '2023-01-15',
          decision: 'SESE',
          product_code: 'LRH',
          statement_or_summary: 'Device for continuous cardiac monitoring',
        },
        // Add more mock FDA results as needed
      ],
    });
  }),
];

/**
 * Setup mock API server with default or custom handlers
 */
export const setupMockAPI = (customEndpoints: MockEndpoint[] = []): void => {
  const defaultHandlers = createDefaultHandlers();
  
  // Convert custom endpoints to MSW handlers
  const customHandlers = customEndpoints.map(endpoint => {
    const handler = http[endpoint.method.toLowerCase() as keyof typeof http](
      endpoint.path,
      async ({ request, params }) => {
        if (endpoint.delay) {
          await delay(endpoint.delay);
        }
        
        if (endpoint.error) {
          return HttpResponse.json(
            { error: 'Mock API Error', message: 'Simulated error for testing' },
            { status: endpoint.statusCode || 500 }
          );
        }
        
        return HttpResponse.json(endpoint.response, { 
          status: endpoint.statusCode || 200 
        });
      }
    );
    
    return handler;
  });
  
  // Create server with all handlers
  mockServer = setupServer(...defaultHandlers, ...customHandlers);
  
  // Start the server
  mockServer.listen({
    onUnhandledRequest: 'warn',
  });
};

/**
 * Teardown mock API server
 */
export const teardownMockAPI = (): void => {
  if (mockServer) {
    mockServer.close();
    mockServer = null;
  }
};

/**
 * Reset mock API handlers to default state
 */
export const resetMockAPI = (): void => {
  if (mockServer) {
    mockServer.resetHandlers();
  }
};

/**
 * Add runtime handlers to existing mock server
 */
export const addMockHandlers = (endpoints: MockEndpoint[]): void => {
  if (!mockServer) {
    throw new Error('Mock server not initialized. Call setupMockAPI first.');
  }
  
  const handlers = endpoints.map(endpoint =>
    http[endpoint.method.toLowerCase() as keyof typeof http](
      endpoint.path,
      async () => {
        if (endpoint.delay) await delay(endpoint.delay);
        if (endpoint.error) {
          return HttpResponse.json(
            { error: 'Mock API Error' },
            { status: endpoint.statusCode || 500 }
          );
        }
        return HttpResponse.json(endpoint.response, { 
          status: endpoint.statusCode || 200 
        });
      }
    )
  );
  
  mockServer.use(...handlers);
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
  createDefaultHandlers,
};

export default mswUtils;