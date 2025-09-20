/**
 * Integration tests for WebSocket real-time updates
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocket, useProjectWebSocket } from '@/hooks/use-websocket';
import { WebSocketMessage } from '@/types/project';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  url: string;
  protocols?: string | string[];

  onopen: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url: string, protocols?: string | string[]) {
    this.url = url;
    this.protocols = protocols;

    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 100);
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }

    // Echo back certain messages for testing
    const message = JSON.parse(data);
    if (message.type === 'ping') {
      setTimeout(() => {
        if (this.onmessage) {
          this.onmessage(
            new MessageEvent('message', {
              data: JSON.stringify({ type: 'pong' }),
            })
          );
        }
      }, 50);
    }
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { code, reason }));
    }
  }

  // Helper method to simulate receiving messages
  simulateMessage(message: WebSocketMessage) {
    if (this.onmessage) {
      this.onmessage(
        new MessageEvent('message', {
          data: JSON.stringify(message),
        })
      );
    }
  }

  // Helper method to simulate errors
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// Replace global WebSocket with mock
global.WebSocket = MockWebSocket as any;

// Store reference to mock instances for testing
let mockWebSocketInstances: MockWebSocket[] = [];
const originalWebSocket = global.WebSocket;

beforeEach(() => {
  mockWebSocketInstances = [];
  global.WebSocket = class extends MockWebSocket {
    constructor(url: string, protocols?: string | string[]) {
      super(url, protocols);
      mockWebSocketInstances.push(this);
    }
  } as any;
});

afterEach(() => {
  mockWebSocketInstances.forEach((ws) => ws.close());
  mockWebSocketInstances = [];
});

afterAll(() => {
  global.WebSocket = originalWebSocket;
});

describe('WebSocket Integration Tests', () => {
  describe('useWebSocket Hook', () => {
    test('should establish WebSocket connection', async () => {
      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8000/ws',
          enabled: true,
        })
      );

      // Initially connecting
      expect(result.current.connecting).toBe(true);
      expect(result.current.connected).toBe(false);

      // Wait for connection to establish
      await waitFor(() => {
        expect(result.current.connected).toBe(true);
        expect(result.current.connecting).toBe(false);
      });

      expect(mockWebSocketInstances).toHaveLength(1);
      expect(mockWebSocketInstances[0].url).toBe('ws://localhost:8000/ws');
    });

    test('should handle connection with protocols', async () => {
      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8000/ws',
          protocols: ['protocol1', 'protocol2'],
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      expect(mockWebSocketInstances[0].protocols).toEqual([
        'protocol1',
        'protocol2',
      ]);
    });

    test('should handle incoming messages', async () => {
      const onMessage = jest.fn();
      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8000/ws',
          onMessage,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Simulate incoming message
      const testMessage: WebSocketMessage = {
        type: 'project_updated',
        project_id: 1,
        data: { name: 'Updated Project' },
        timestamp: '2024-01-01T00:00:00Z',
      };

      act(() => {
        mockWebSocketInstances[0].simulateMessage(testMessage);
      });

      expect(onMessage).toHaveBeenCalledWith(testMessage);
      expect(result.current.lastMessage).toEqual(testMessage);
    });

    test('should send messages when connected', async () => {
      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8000/ws',
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      const sendSpy = jest.spyOn(mockWebSocketInstances[0], 'send');

      const testMessage = { type: 'ping' };
      const success = result.current.sendMessage(testMessage);

      expect(success).toBe(true);
      expect(sendSpy).toHaveBeenCalledWith(JSON.stringify(testMessage));
    });

    test('should not send messages when disconnected', async () => {
      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8000/ws',
          enabled: true,
        })
      );

      // Don't wait for connection
      const testMessage = { type: 'ping' };
      const success = result.current.sendMessage(testMessage);

      expect(success).toBe(false);
    });

    test('should handle connection errors', async () => {
      const onError = jest.fn();
      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8000/ws',
          onError,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Simulate error
      act(() => {
        mockWebSocketInstances[0].simulateError();
      });

      expect(onError).toHaveBeenCalled();
      expect(result.current.error).toBe('WebSocket connection error');
    });

    test('should handle connection close', async () => {
      const onDisconnect = jest.fn();
      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8000/ws',
          onDisconnect,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Close connection
      act(() => {
        mockWebSocketInstances[0].close();
      });

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
      });

      expect(onDisconnect).toHaveBeenCalled();
    });

    test('should attempt reconnection on close', async () => {
      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8000/ws',
          reconnectAttempts: 2,
          reconnectInterval: 100,
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      const initialInstanceCount = mockWebSocketInstances.length;

      // Close connection to trigger reconnect
      act(() => {
        mockWebSocketInstances[0].close();
      });

      // Wait for reconnection attempt
      await waitFor(
        () => {
          expect(mockWebSocketInstances.length).toBe(initialInstanceCount + 1);
        },
        { timeout: 500 }
      );
    });

    test('should stop reconnecting after max attempts', async () => {
      // Mock WebSocket that always fails to connect
      global.WebSocket = class extends MockWebSocket {
        constructor(url: string, protocols?: string | string[]) {
          super(url, protocols);
          mockWebSocketInstances.push(this);

          // Immediately close to simulate connection failure
          setTimeout(() => {
            this.readyState = MockWebSocket.CLOSED;
            if (this.onclose) {
              this.onclose(new CloseEvent('close', { code: 1006 }));
            }
          }, 50);
        }
      } as any;

      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8000/ws',
          reconnectAttempts: 2,
          reconnectInterval: 100,
          enabled: true,
        })
      );

      // Wait for all reconnection attempts to complete
      await waitFor(
        () => {
          expect(mockWebSocketInstances.length).toBe(3); // Initial + 2 reconnect attempts
        },
        { timeout: 1000 }
      );

      expect(result.current.connected).toBe(false);
    });

    test('should disconnect cleanly', async () => {
      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8000/ws',
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      const closeSpy = jest.spyOn(mockWebSocketInstances[0], 'close');

      act(() => {
        result.current.disconnect();
      });

      expect(closeSpy).toHaveBeenCalled();

      await waitFor(() => {
        expect(result.current.connected).toBe(false);
      });
    });

    test('should reconnect manually', async () => {
      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8000/ws',
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      const initialInstanceCount = mockWebSocketInstances.length;

      act(() => {
        result.current.reconnect();
      });

      // Should create new connection
      await waitFor(() => {
        expect(mockWebSocketInstances.length).toBe(initialInstanceCount + 1);
      });
    });

    test('should not connect when disabled', async () => {
      const { result } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8000/ws',
          enabled: false,
        })
      );

      // Wait a bit to ensure no connection is attempted
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(result.current.connected).toBe(false);
      expect(result.current.connecting).toBe(false);
      expect(mockWebSocketInstances).toHaveLength(0);
    });
  });

  describe('useProjectWebSocket Hook', () => {
    test('should filter messages by project ID', async () => {
      const onUpdate = jest.fn();
      const projectId = 123;

      const { result } = renderHook(() =>
        useProjectWebSocket(projectId, onUpdate)
      );

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      // Send message for correct project
      const correctMessage: WebSocketMessage = {
        type: 'project_updated',
        project_id: projectId,
        data: { name: 'Updated Project' },
        timestamp: '2024-01-01T00:00:00Z',
      };

      act(() => {
        mockWebSocketInstances[0].simulateMessage(correctMessage);
      });

      expect(onUpdate).toHaveBeenCalledWith(correctMessage);

      // Send message for different project
      const wrongMessage: WebSocketMessage = {
        type: 'project_updated',
        project_id: 456,
        data: { name: 'Other Project' },
        timestamp: '2024-01-01T00:00:00Z',
      };

      act(() => {
        mockWebSocketInstances[0].simulateMessage(wrongMessage);
      });

      // Should not be called again
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });

    test('should subscribe to project updates', async () => {
      const projectId = 123;
      const { result } = renderHook(() => useProjectWebSocket(projectId));

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      const sendSpy = jest.spyOn(mockWebSocketInstances[0], 'send');

      act(() => {
        result.current.subscribeToProject(456);
      });

      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'subscribe',
          project_id: 456,
        })
      );
    });

    test('should unsubscribe from project updates', async () => {
      const projectId = 123;
      const { result } = renderHook(() => useProjectWebSocket(projectId));

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      const sendSpy = jest.spyOn(mockWebSocketInstances[0], 'send');

      act(() => {
        result.current.unsubscribeFromProject(456);
      });

      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'unsubscribe',
          project_id: 456,
        })
      );
    });

    test('should auto-subscribe when project ID changes', async () => {
      const { result, rerender } = renderHook(
        ({ projectId }) => useProjectWebSocket(projectId),
        { initialProps: { projectId: 123 } }
      );

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      const sendSpy = jest.spyOn(mockWebSocketInstances[0], 'send');

      // Change project ID
      rerender({ projectId: 456 });

      await waitFor(() => {
        expect(sendSpy).toHaveBeenCalledWith(
          JSON.stringify({
            type: 'subscribe',
            project_id: 456,
          })
        );
      });
    });

    test('should not connect when project ID is null', async () => {
      const { result } = renderHook(() => useProjectWebSocket(null));

      // Wait a bit to ensure no connection is attempted
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(result.current.connected).toBe(false);
      expect(mockWebSocketInstances).toHaveLength(0);
    });
  });

  describe('Real-time Update Scenarios', () => {
    test('should handle project update notifications', async () => {
      const onUpdate = jest.fn();
      const projectId = 123;

      const { result } = renderHook(() =>
        useProjectWebSocket(projectId, onUpdate)
      );

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      const updateMessage: WebSocketMessage = {
        type: 'project_updated',
        project_id: projectId,
        data: {
          id: projectId,
          name: 'Updated Project Name',
          description: 'Updated description',
          status: 'in_progress',
          updated_at: '2024-01-01T01:00:00Z',
        },
        timestamp: '2024-01-01T01:00:00Z',
      };

      act(() => {
        mockWebSocketInstances[0].simulateMessage(updateMessage);
      });

      expect(onUpdate).toHaveBeenCalledWith(updateMessage);
    });

    test('should handle classification completion notifications', async () => {
      const onUpdate = jest.fn();
      const projectId = 123;

      const { result } = renderHook(() =>
        useProjectWebSocket(projectId, onUpdate)
      );

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      const classificationMessage: WebSocketMessage = {
        type: 'classification_completed',
        project_id: projectId,
        data: {
          device_class: 'II',
          product_code: 'DQK',
          regulatory_pathway: '510k',
          confidence_score: 0.85,
        },
        timestamp: '2024-01-01T01:00:00Z',
      };

      act(() => {
        mockWebSocketInstances[0].simulateMessage(classificationMessage);
      });

      expect(onUpdate).toHaveBeenCalledWith(classificationMessage);
    });

    test('should handle predicate search completion notifications', async () => {
      const onUpdate = jest.fn();
      const projectId = 123;

      const { result } = renderHook(() =>
        useProjectWebSocket(projectId, onUpdate)
      );

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      const predicateMessage: WebSocketMessage = {
        type: 'predicate_search_completed',
        project_id: projectId,
        data: {
          predicates: [
            {
              k_number: 'K123456',
              device_name: 'Similar Device',
              confidence_score: 0.92,
            },
          ],
          search_query: 'cardiac monitor',
          total_results: 15,
        },
        timestamp: '2024-01-01T01:00:00Z',
      };

      act(() => {
        mockWebSocketInstances[0].simulateMessage(predicateMessage);
      });

      expect(onUpdate).toHaveBeenCalledWith(predicateMessage);
    });

    test('should handle agent interaction notifications', async () => {
      const onUpdate = jest.fn();
      const projectId = 123;

      const { result } = renderHook(() =>
        useProjectWebSocket(projectId, onUpdate)
      );

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      const agentMessage: WebSocketMessage = {
        type: 'agent_interaction',
        project_id: projectId,
        data: {
          action: 'predicate_search',
          status: 'completed',
          confidence_score: 0.88,
          execution_time_ms: 2500,
        },
        timestamp: '2024-01-01T01:00:00Z',
      };

      act(() => {
        mockWebSocketInstances[0].simulateMessage(agentMessage);
      });

      expect(onUpdate).toHaveBeenCalledWith(agentMessage);
    });
  });

  describe('Connection Management', () => {
    test('should handle multiple concurrent connections', async () => {
      const { result: result1 } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8000/ws',
          enabled: true,
        })
      );

      const { result: result2 } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8000/ws',
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result1.current.connected).toBe(true);
        expect(result2.current.connected).toBe(true);
      });

      expect(mockWebSocketInstances).toHaveLength(2);
    });

    test('should clean up connections on unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useWebSocket({
          url: 'ws://localhost:8000/ws',
          enabled: true,
        })
      );

      await waitFor(() => {
        expect(result.current.connected).toBe(true);
      });

      const closeSpy = jest.spyOn(mockWebSocketInstances[0], 'close');

      unmount();

      expect(closeSpy).toHaveBeenCalled();
    });
  });
});
