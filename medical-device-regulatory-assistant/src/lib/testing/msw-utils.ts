/**
 * MSW (Mock Service Worker) utilities for testing
 * Provides centralized API mocking setup for integration tests
 */

// Simple mock implementations to avoid MSW complexity in tests
const mockProjects = [
  { id: 1, name: 'Test Project 1', status: 'draft' },
  { id: 2, name: 'Test Project 2', status: 'in_progress' },
];

const mockUsers = [
  { id: '1', name: 'Test User', email: 'test@example.com' },
];

// Mock server implementation
export const server = {
  listen: jest.fn(),
  close: jest.fn(),
  resetHandlers: jest.fn(),
  use: jest.fn(),
};

/**
 * Setup mock API for tests
 */
export function setupMockAPI() {
  server.listen({
    onUnhandledRequest: 'warn',
  });
}

/**
 * Teardown mock API after tests
 */
export function teardownMockAPI() {
  server.close();
}

/**
 * Reset handlers between tests
 */
export function resetMockAPI() {
  server.resetHandlers();
}

/**
 * Add custom handlers for specific tests
 */
export function addMockHandlers(...newHandlers: Parameters<typeof server.use>) {
  server.use(...newHandlers);
}

/**
 * Mock WebSocket for testing
 */
export class MockWebSocketServer {
  private clients: Set<MockWebSocket> = new Set();
  
  constructor() {
    // Replace global WebSocket with mock
    (global as any).WebSocket = MockWebSocket;
  }

  broadcast(message: any) {
    this.clients.forEach(client => {
      if (client.readyState === MockWebSocket.OPEN) {
        client.simulateMessage(message);
      }
    });
  }

  addClient(client: MockWebSocket) {
    this.clients.add(client);
  }

  removeClient(client: MockWebSocket) {
    this.clients.delete(client);
  }

  close() {
    this.clients.forEach(client => client.close());
    this.clients.clear();
  }
}

/**
 * Mock WebSocket implementation for testing
 */
export class MockWebSocket {
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
    // Mock sending data - in real tests, this would be handled by the server
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

  // Helper method to simulate receiving messages
  simulateMessage(data: any) {
    if (this.readyState === MockWebSocket.OPEN && this.onmessage) {
      this.onmessage(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  // Helper method to simulate connection error
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// Global mock WebSocket server instance
let mockWebSocketServer: MockWebSocketServer | null = null;

/**
 * Setup mock WebSocket server for tests
 */
export function setupMockWebSocket(): MockWebSocketServer {
  if (!mockWebSocketServer) {
    mockWebSocketServer = new MockWebSocketServer();
  }
  return mockWebSocketServer;
}

/**
 * Teardown mock WebSocket server
 */
export function teardownMockWebSocket() {
  if (mockWebSocketServer) {
    mockWebSocketServer.close();
    mockWebSocketServer = null;
  }
}