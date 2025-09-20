/**
 * Simplified integration test setup
 * Configures basic mocking for integration tests without complex MSW setup
 */

// Simple mock setup for integration tests
beforeAll(async () => {
  // Setup basic fetch mocking
  global.fetch = jest.fn().mockImplementation(async (url, options = {}) => {
    // Default mock response
    return new Response(JSON.stringify({ message: 'Mock API response' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  });
});

// Reset between tests
beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();
});

// Cleanup after all tests
afterAll(() => {
  // Restore original fetch if it was mocked
  if (jest.isMockFunction(global.fetch)) {
    global.fetch.mockRestore();
  }
});
