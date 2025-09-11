/**
 * Test for simplified mock service integration
 * Verifies that the simplified MSW utils work without complex HTTP server simulation
 */

import { setupMockAPI, teardownMockAPI, MockEndpoint } from '../msw-utils-simple';

describe('Simplified Mock Service Integration', () => {
  afterEach(() => {
    teardownMockAPI();
  });

  it('should setup and teardown mock API without errors', () => {
    expect(() => {
      setupMockAPI();
      teardownMockAPI();
    }).not.toThrow();
  });

  it('should mock fetch with custom endpoints', async () => {
    const mockEndpoints: MockEndpoint[] = [
      {
        method: 'GET',
        path: '/api/test',
        response: { message: 'test response' },
      },
    ];

    setupMockAPI(mockEndpoints);

    const response = await fetch('/api/test');
    const data = await response.json();

    expect(data).toEqual({ message: 'test response' });
    expect(response.status).toBe(200);
  });

  it('should handle errors in mock endpoints', async () => {
    const mockEndpoints: MockEndpoint[] = [
      {
        method: 'GET',
        path: '/api/error',
        response: { error: 'test error' },
        error: true,
      },
    ];

    setupMockAPI(mockEndpoints);

    await expect(fetch('/api/error')).rejects.toThrow('Mock API error for GET:/api/error');
  });

  it('should simulate delays in mock endpoints', async () => {
    const mockEndpoints: MockEndpoint[] = [
      {
        method: 'GET',
        path: '/api/slow',
        response: { message: 'slow response' },
        delay: 100,
      },
    ];

    setupMockAPI(mockEndpoints);

    const startTime = Date.now();
    const response = await fetch('/api/slow');
    const endTime = Date.now();
    const data = await response.json();

    expect(data).toEqual({ message: 'slow response' });
    expect(endTime - startTime).toBeGreaterThanOrEqual(100);
  });

  it('should return default mock response for unmatched endpoints', async () => {
    setupMockAPI();

    const response = await fetch('/api/unknown');
    const data = await response.json();

    expect(data).toEqual({ message: 'Mock API response' });
    expect(response.status).toBe(200);
  });

  it('should handle different HTTP methods', async () => {
    const mockEndpoints: MockEndpoint[] = [
      {
        method: 'POST',
        path: '/api/create',
        response: { id: 1, created: true },
        statusCode: 201,
      },
      {
        method: 'PUT',
        path: '/api/update',
        response: { updated: true },
      },
      {
        method: 'DELETE',
        path: '/api/delete',
        response: { deleted: true },
        statusCode: 204,
      },
    ];

    setupMockAPI(mockEndpoints);

    // Test POST
    const postResponse = await fetch('/api/create', { method: 'POST' });
    const postData = await postResponse.json();
    expect(postData).toEqual({ id: 1, created: true });
    expect(postResponse.status).toBe(201);

    // Test PUT
    const putResponse = await fetch('/api/update', { method: 'PUT' });
    const putData = await putResponse.json();
    expect(putData).toEqual({ updated: true });
    expect(putResponse.status).toBe(200);

    // Test DELETE
    const deleteResponse = await fetch('/api/delete', { method: 'DELETE' });
    const deleteData = await deleteResponse.json();
    expect(deleteData).toEqual({ deleted: true });
    expect(deleteResponse.status).toBe(204);
  });
});