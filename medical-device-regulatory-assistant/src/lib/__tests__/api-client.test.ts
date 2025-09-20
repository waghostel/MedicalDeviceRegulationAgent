/**
 * Unit tests for API client functionality
 */

import { apiClient, ApiClient } from '../api-client';

// Mock fetch
global.fetch = jest.fn();

describe('API Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic functionality', () => {
    test('should make GET requests', async () => {
      const mockResponse = { data: { message: 'success' } };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => mockResponse,
      });

      const response = await apiClient.get('/test');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );

      expect(response.data).toEqual(mockResponse);
      expect(response.status).toBe(200);
    });

    test('should make POST requests with body', async () => {
      const mockResponse = { id: 1, name: 'Test' };
      const requestBody = { name: 'Test' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 201,
        statusText: 'Created',
        headers: new Headers(),
        json: async () => mockResponse,
      });

      const response = await apiClient.post('/test', requestBody);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/test',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify(requestBody),
        })
      );

      expect(response.data).toEqual(mockResponse);
      expect(response.status).toBe(201);
    });

    test('should set authentication token', () => {
      const token = 'test-jwt-token';
      apiClient.setAuthToken(token);

      // Access private property for testing
      const headers = (apiClient as any).defaultHeaders;
      expect(headers['Authorization']).toBe(`Bearer ${token}`);
    });

    test('should remove authentication token', () => {
      apiClient.setAuthToken('test-token');
      apiClient.setAuthToken(null);

      const headers = (apiClient as any).defaultHeaders;
      expect(headers['Authorization']).toBeUndefined();
    });
  });

  describe('Error handling', () => {
    test('should handle HTTP errors', async () => {
      const errorResponse = {
        error: 'Not found',
        message: 'Resource not found',
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Headers(),
        json: async () => errorResponse,
      });

      await expect(apiClient.get('/test')).rejects.toMatchObject({
        message: 'Resource not found',
        status: 404,
        details: errorResponse,
      });
    });

    test('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(
        new TypeError('Failed to fetch')
      );

      await expect(apiClient.get('/test')).rejects.toMatchObject({
        message: 'Network error - please check your internet connection',
        code: 'NETWORK_ERROR',
      });
    });

    test('should handle timeout errors', async () => {
      // Mock a request that takes longer than the timeout
      (global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 35000))
      );

      await expect(apiClient.get('/test')).rejects.toMatchObject({
        message: 'Request timeout',
        code: 'TIMEOUT',
      });
    });
  });

  describe('Retry logic', () => {
    test('should retry failed requests', async () => {
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            headers: new Headers(),
            json: async () => ({ error: 'Server error' }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          headers: new Headers(),
          json: async () => ({ success: true }),
        });
      });

      const response = await apiClient.get('/test');

      expect(callCount).toBe(3);
      expect(response.data).toEqual({ success: true });
    });

    test('should not retry client errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: new Headers(),
        json: async () => ({ error: 'Bad request' }),
      });

      await expect(apiClient.get('/test')).rejects.toMatchObject({
        status: 400,
      });

      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    test('should stop retrying after max attempts', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
        json: async () => ({ error: 'Persistent error' }),
      });

      await expect(apiClient.get('/test')).rejects.toMatchObject({
        status: 500,
      });

      // Should try 4 times (initial + 3 retries)
      expect(global.fetch).toHaveBeenCalledTimes(4);
    });
  });

  describe('Request configuration', () => {
    test('should skip error toast when requested', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers(),
        json: async () => ({ error: 'Server error' }),
      });

      await expect(
        apiClient.get('/test', { skipErrorToast: true })
      ).rejects.toMatchObject({
        status: 500,
      });

      consoleSpy.mockRestore();
    });

    test('should use custom timeout', async () => {
      const shortTimeout = 100;

      (global.fetch as jest.Mock).mockImplementationOnce(
        () => new Promise((resolve) => setTimeout(resolve, 200))
      );

      await expect(
        apiClient.get('/test', { timeout: shortTimeout })
      ).rejects.toMatchObject({
        message: 'Request timeout',
        code: 'TIMEOUT',
      });
    });
  });

  describe('HTTP methods', () => {
    test('should make PUT requests', async () => {
      const mockResponse = { id: 1, name: 'Updated' };
      const requestBody = { name: 'Updated' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => mockResponse,
      });

      const response = await apiClient.put('/test/1', requestBody);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/test/1',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(requestBody),
        })
      );

      expect(response.data).toEqual(mockResponse);
    });

    test('should make DELETE requests', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 204,
        statusText: 'No Content',
        headers: new Headers(),
        json: async () => ({}),
      });

      const response = await apiClient.delete('/test/1');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/test/1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );

      expect(response.status).toBe(204);
    });

    test('should make PATCH requests', async () => {
      const mockResponse = { id: 1, name: 'Patched' };
      const requestBody = { name: 'Patched' };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
        json: async () => mockResponse,
      });

      const response = await apiClient.patch('/test/1', requestBody);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:8000/test/1',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(requestBody),
        })
      );

      expect(response.data).toEqual(mockResponse);
    });
  });
});
