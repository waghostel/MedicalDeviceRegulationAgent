/**
 * Integration tests for offline functionality and sync capabilities
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';

import { useOffline, useOfflineApi } from '@/hooks/use-offline';
import { useProjects } from '@/hooks/use-projects';
import { ProjectStatus } from '@/types/project';

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Mock toast
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

// Mock server setup
const server = setupServer(
  rest.get('/api/projects', (req, res, ctx) => res(
      ctx.json([
        {
          id: 1,
          name: 'Test Project',
          description: 'A test project',
          device_type: 'Class II',
          intended_use: 'Testing',
          status: ProjectStatus.DRAFT,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ])
    )),

  rest.post('/api/projects', (req, res, ctx) => res(
      ctx.json({
        id: 2,
        name: 'New Project',
        description: 'Created offline',
        device_type: 'Class I',
        intended_use: 'Testing offline creation',
        status: ProjectStatus.DRAFT,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      })
    )),

  rest.put('/api/projects/:id', (req, res, ctx) => res(
      ctx.json({
        id: parseInt(req.params.id as string),
        name: 'Updated Project',
        description: 'Updated offline',
        device_type: 'Class II',
        intended_use: 'Testing offline updates',
        status: ProjectStatus.IN_PROGRESS,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T01:00:00Z',
      })
    )),

  rest.delete('/api/projects/:id', (req, res, ctx) => res(ctx.json({ message: 'Project deleted' })))
);

beforeAll(() => server.listen());
afterEach(() => {
  server.resetHandlers();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
});
afterAll(() => server.close());

describe('Offline Functionality Tests', () => {
  describe('useOffline Hook', () => {
    test('should detect online/offline status', async () => {
      const { result } = renderHook(() => useOffline());

      // Initially online
      expect(result.current.isOnline).toBe(true);
      expect(result.current.isOffline).toBe(false);

      // Simulate going offline
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: false });
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
        expect(result.current.isOffline).toBe(true);
      });

      // Simulate going back online
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: true });
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
        expect(result.current.isOffline).toBe(false);
      });
    });

    test('should queue actions when offline', async () => {
      const { result } = renderHook(() => useOffline());

      // Go offline
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: false });
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(result.current.isOffline).toBe(true);
      });

      // Add pending actions
      act(() => {
        result.current.addPendingAction({
          type: 'create',
          endpoint: '/api/projects',
          data: { name: 'Offline Project' },
        });

        result.current.addPendingAction({
          type: 'update',
          endpoint: '/api/projects/1',
          data: { name: 'Updated Offline' },
        });
      });

      expect(result.current.pendingActions).toHaveLength(2);
      expect(result.current.pendingActions[0].type).toBe('create');
      expect(result.current.pendingActions[1].type).toBe('update');
    });

    test('should sync pending actions when coming back online', async () => {
      const { result } = renderHook(() =>
        useOffline({ syncOnReconnect: true })
      );

      // Start offline with pending actions
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: false });
        result.current.addPendingAction({
          type: 'create',
          endpoint: '/api/projects',
          data: { name: 'Offline Project' },
        });
      });

      expect(result.current.pendingActions).toHaveLength(1);

      // Go back online
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: true });
        window.dispatchEvent(new Event('online'));
      });

      // Wait for sync to complete
      await waitFor(
        () => {
          expect(result.current.pendingActions).toHaveLength(0);
        },
        { timeout: 3000 }
      );

      expect(result.current.syncInProgress).toBe(false);
    });

    test('should persist pending actions to localStorage', async () => {
      const { result } = renderHook(() => useOffline());

      act(() => {
        result.current.addPendingAction({
          type: 'create',
          endpoint: '/api/projects',
          data: { name: 'Persistent Project' },
        });
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'pendingActions',
        expect.stringContaining('Persistent Project')
      );
    });

    test('should load pending actions from localStorage on mount', async () => {
      const storedActions = JSON.stringify([
        {
          id: 'test-1',
          type: 'create',
          endpoint: '/api/projects',
          data: { name: 'Stored Project' },
          timestamp: Date.now(),
          retryCount: 0,
        },
      ]);

      localStorageMock.getItem.mockReturnValue(storedActions);

      const { result } = renderHook(() => useOffline());

      await waitFor(() => {
        expect(result.current.pendingActions).toHaveLength(1);
        expect(result.current.pendingActions[0].data.name).toBe(
          'Stored Project'
        );
      });
    });

    test('should handle sync failures with retry logic', async () => {
      let requestCount = 0;
      server.use(
        rest.post('/api/projects', (req, res, ctx) => {
          requestCount++;
          if (requestCount < 3) {
            return res(ctx.status(500), ctx.json({ error: 'Server error' }));
          }
          return res(ctx.json({ id: 2, name: 'Eventually Created' }));
        })
      );

      const { result } = renderHook(() =>
        useOffline({ maxRetries: 3, retryDelay: 100 })
      );

      // Add action and sync
      act(() => {
        result.current.addPendingAction({
          type: 'create',
          endpoint: '/api/projects',
          data: { name: 'Retry Project' },
        });
      });

      act(() => {
        result.current.syncPendingActions();
      });

      // Wait for retries to complete
      await waitFor(
        () => {
          expect(result.current.pendingActions).toHaveLength(0);
        },
        { timeout: 5000 }
      );

      expect(requestCount).toBe(3);
    });

    test('should discard actions after max retries', async () => {
      server.use(
        rest.post('/api/projects', (req, res, ctx) => res(ctx.status(500), ctx.json({ error: 'Persistent error' })))
      );

      const { result } = renderHook(() =>
        useOffline({ maxRetries: 2, retryDelay: 100 })
      );

      act(() => {
        result.current.addPendingAction({
          type: 'create',
          endpoint: '/api/projects',
          data: { name: 'Failed Project' },
        });
      });

      act(() => {
        result.current.syncPendingActions();
      });

      // Wait for all retries to fail
      await waitFor(
        () => {
          expect(result.current.syncInProgress).toBe(false);
        },
        { timeout: 3000 }
      );

      // Action should be discarded after max retries
      expect(result.current.pendingActions).toHaveLength(0);
    });
  });

  describe('useOfflineApi Hook', () => {
    test('should make normal requests when online', async () => {
      const { result } = renderHook(() => useOfflineApi());

      const response = await result.current.makeRequest('/api/projects');

      expect(response.offline).toBe(false);
      expect(response.data).toHaveLength(1);
      expect(response.data[0].name).toBe('Test Project');
    });

    test('should queue requests when offline', async () => {
      const { result } = renderHook(() => useOfflineApi());

      // Go offline
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: false });
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(result.current.isOffline).toBe(true);
      });

      // Try to make a request with fallback data
      const fallbackData = { id: 999, name: 'Fallback Project' };
      const response = await result.current.makeRequest(
        '/api/projects',
        { method: 'GET' },
        fallbackData
      );

      expect(response.offline).toBe(true);
      expect(response.data).toEqual(fallbackData);
      expect(result.current.pendingActions).toHaveLength(1);
    });

    test('should throw error when offline without fallback data', async () => {
      const { result } = renderHook(() => useOfflineApi());

      // Go offline
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: false });
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(result.current.isOffline).toBe(true);
      });

      // Try to make a request without fallback data
      await expect(
        result.current.makeRequest('/api/projects', { method: 'POST' })
      ).rejects.toThrow('Operation queued for sync when online');
    });
  });

  describe('Project Management Offline Integration', () => {
    test('should handle project creation while offline', async () => {
      // Mock useProjects hook behavior
      const mockCreateProject = jest.fn();
      const mockProjects = [
        {
          id: 1,
          name: 'Existing Project',
          status: ProjectStatus.DRAFT,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ];

      // This would require more complex mocking of the useProjects hook
      // For now, we'll test the offline functionality directly
      const { result: offlineResult } = renderHook(() => useOffline());

      // Go offline
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: false });
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(offlineResult.current.isOffline).toBe(true);
      });

      // Simulate project creation while offline
      act(() => {
        offlineResult.current.addPendingAction({
          type: 'create',
          endpoint: '/api/projects',
          data: {
            name: 'Offline Created Project',
            description: 'Created while offline',
            device_type: 'Class I',
            intended_use: 'Testing offline creation',
          },
        });
      });

      expect(offlineResult.current.pendingActions).toHaveLength(1);
      expect(offlineResult.current.pendingActions[0].type).toBe('create');
    });

    test('should sync offline changes when reconnected', async () => {
      const { result } = renderHook(() =>
        useOffline({ syncOnReconnect: true })
      );

      // Start offline with multiple pending actions
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: false });

        // Add multiple actions
        result.current.addPendingAction({
          type: 'create',
          endpoint: '/api/projects',
          data: { name: 'Offline Project 1' },
        });

        result.current.addPendingAction({
          type: 'update',
          endpoint: '/api/projects/1',
          data: { name: 'Updated Offline' },
        });

        result.current.addPendingAction({
          type: 'delete',
          endpoint: '/api/projects/2',
        });
      });

      expect(result.current.pendingActions).toHaveLength(3);

      // Go back online
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: true });
        window.dispatchEvent(new Event('online'));
      });

      // Wait for all actions to sync
      await waitFor(
        () => {
          expect(result.current.pendingActions).toHaveLength(0);
          expect(result.current.syncInProgress).toBe(false);
        },
        { timeout: 5000 }
      );
    });

    test('should handle partial sync failures', async () => {
      let createCallCount = 0;
      server.use(
        // First create succeeds
        rest.post('/api/projects', (req, res, ctx) => {
          createCallCount++;
          if (createCallCount === 1) {
            return res(ctx.json({ id: 2, name: 'Success' }));
          }
          return res(ctx.status(500), ctx.json({ error: 'Server error' }));
        }),

        // Update succeeds
        rest.put('/api/projects/1', (req, res, ctx) => res(ctx.json({ id: 1, name: 'Updated' })))
      );

      const { result } = renderHook(() =>
        useOffline({ maxRetries: 1, retryDelay: 100 })
      );

      act(() => {
        // Add actions that will have mixed success
        result.current.addPendingAction({
          type: 'create',
          endpoint: '/api/projects',
          data: { name: 'Success Project' },
        });

        result.current.addPendingAction({
          type: 'create',
          endpoint: '/api/projects',
          data: { name: 'Fail Project' },
        });

        result.current.addPendingAction({
          type: 'update',
          endpoint: '/api/projects/1',
          data: { name: 'Updated Project' },
        });
      });

      act(() => {
        result.current.syncPendingActions();
      });

      // Wait for sync to complete
      await waitFor(
        () => {
          expect(result.current.syncInProgress).toBe(false);
        },
        { timeout: 3000 }
      );

      // Should have one failed action remaining (after retries)
      expect(result.current.pendingActions).toHaveLength(0); // Failed actions are discarded after max retries
    });
  });

  describe('Cache Management', () => {
    test('should clear pending actions', async () => {
      const { result } = renderHook(() => useOffline());

      act(() => {
        result.current.addPendingAction({
          type: 'create',
          endpoint: '/api/projects',
          data: { name: 'Test Project' },
        });
      });

      expect(result.current.pendingActions).toHaveLength(1);

      act(() => {
        result.current.clearPendingActions();
      });

      expect(result.current.pendingActions).toHaveLength(0);
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        'pendingActions'
      );
    });

    test('should force sync when online', async () => {
      const { result } = renderHook(() => useOffline());

      act(() => {
        result.current.addPendingAction({
          type: 'create',
          endpoint: '/api/projects',
          data: { name: 'Force Sync Project' },
        });
      });

      act(() => {
        result.current.forcSync();
      });

      await waitFor(
        () => {
          expect(result.current.pendingActions).toHaveLength(0);
        },
        { timeout: 2000 }
      );
    });

    test('should not sync when offline and show error', async () => {
      const { result } = renderHook(() => useOffline());
      const { toast } = require('@/hooks/use-toast');

      // Go offline
      act(() => {
        Object.defineProperty(navigator, 'onLine', { value: false });
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(result.current.isOffline).toBe(true);
      });

      act(() => {
        result.current.addPendingAction({
          type: 'create',
          endpoint: '/api/projects',
          data: { name: 'Cannot Sync Project' },
        });
      });

      act(() => {
        result.current.forcSync();
      });

      expect(toast).toHaveBeenCalledWith({
        title: 'Cannot Sync',
        description:
          'You are currently offline. Sync will happen automatically when connection is restored.',
        variant: 'destructive',
      });

      expect(result.current.pendingActions).toHaveLength(1); // Should still have pending action
    });
  });
});
