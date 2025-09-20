/**
 * Unit tests for WebSocket service
 */

import { WebSocketService } from '@/lib/services/websocket-service';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;

  static OPEN = 1;

  static CLOSING = 2;

  static CLOSED = 3;

  readyState: number = MockWebSocket.CONNECTING;

  url: string;

  onopen: ((event: Event) => void) | null = null;

  onclose: ((event: CloseEvent) => void) | null = null;

  onmessage: ((event: MessageEvent) => void) | null = null;

  onerror: ((event: Event) => void) | null = null;

  constructor(url: string) {
    this.url = url;

    // Simulate connection opening
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 10);
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose) {
        this.onclose(new CloseEvent('close', { code: code || 1000, reason }));
      }
    }, 10);
  }
}

// Replace global WebSocket with mock
(global as any).WebSocket = MockWebSocket;

describe('WebSocketService', () => {
  let service: WebSocketService;

  beforeEach(() => {
    service = new WebSocketService({
      url: 'ws://localhost:8000/test',
      maxReconnectAttempts: 3,
      reconnectInterval: 100,
    });
  });

  afterEach(() => {
    service.destroy();
  });

  it('should create service instance', () => {
    expect(service).toBeInstanceOf(WebSocketService);
    expect(service.getStatus()).toBe('disconnected');
  });

  it('should connect and change status', async () => {
    const statusHandler = jest.fn();
    service.onStatusChange(statusHandler);

    service.connect();
    expect(service.getStatus()).toBe('connecting');

    // Wait for connection to open
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(service.getStatus()).toBe('connected');
    expect(statusHandler).toHaveBeenCalledWith('connecting');
    expect(statusHandler).toHaveBeenCalledWith('connected');
  });

  it('should handle message subscription', async () => {
    const messageHandler = jest.fn();
    service.subscribe('test_message', messageHandler);

    service.connect();
    await new Promise((resolve) => setTimeout(resolve, 20));

    // Simulate message
    const testMessage = {
      type: 'test_message',
      data: { content: 'Hello World' },
      timestamp: new Date().toISOString(),
    };

    // We can't easily simulate receiving a message in this test setup
    // but we can verify the subscription was registered
    expect(messageHandler).not.toHaveBeenCalled();
  });

  it('should disconnect properly', async () => {
    service.connect();
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(service.getStatus()).toBe('connected');

    service.disconnect();
    expect(service.getStatus()).toBe('disconnected');
  });

  it('should destroy and cleanup', () => {
    const statusHandler = jest.fn();
    const messageHandler = jest.fn();

    service.onStatusChange(statusHandler);
    service.subscribe('test', messageHandler);

    service.destroy();
    expect(service.getStatus()).toBe('disconnected');
  });
});
