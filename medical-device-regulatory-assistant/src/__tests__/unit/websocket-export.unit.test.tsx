/**
 * Test to verify WebSocket hook exports
 */

// Mock the dependencies first
import { useTypingIndicators } from '@/hooks/use-websocket';

jest.mock('@/types/project', () => ({}));
jest.mock('@/lib/services/websocket-service', () => ({
  getWebSocketService: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    sendMessage: jest.fn(),
    subscribe: jest.fn(() => jest.fn()),
    onStatusChange: jest.fn(() => jest.fn()),
    getStatus: jest.fn(() => 'disconnected'),
  })),
}));

// Mock WebSocket
(global as any).WebSocket = class MockWebSocket {
  static CONNECTING = 0;

  static OPEN = 1;

  static CLOSING = 2;

  static CLOSED = 3;

  readyState = 0;

  constructor() {}

  send() {}

  close() {}
};

describe('WebSocket Hook Exports', () => {
  it('should export useTypingIndicators function', () => {
    expect(typeof useTypingIndicators).toBe('function');
  });
});
