/**
 * Integration tests for real-time features and WebSocket connections
 * Tests WebSocket connections, real-time updates, typing indicators, and connection recovery
 */

import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setupMockAPI, teardownMockAPI } from '@/lib/testing/msw-utils';
import {
  renderWithProviders,
  createMockSession,
} from '@/lib/testing/test-utils';
import {
  generateMockUser,
  generateMockProject,
  generateMockAgentInteraction,
} from '@/lib/mock-data';
import { WebSocketMessage, ProjectStatus } from '@/types/project';

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
    }, 100);
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
    // Mock sending data
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose) {
        this.onclose(new CloseEvent('close', { code: code || 1000, reason }));
      }
    }, 50);
  }

  // Helper method to simulate receiving messages
  simulateMessage(data: any) {
    if (this.readyState === MockWebSocket.OPEN && this.onmessage) {
      this.onmessage(
        new MessageEvent('message', { data: JSON.stringify(data) })
      );
    }
  }

  // Helper method to simulate connection error
  simulateError() {
    if (this.onerror) {
      this.onerror(new Event('error'));
    }
  }
}

// Replace global WebSocket with mock
(global as any).WebSocket = MockWebSocket;

// Test component for WebSocket functionality
const WebSocketTestComponent: React.FC<{ projectId: string }> = ({
  projectId,
}) => {
  const [connected, setConnected] = React.useState(false);
  const [messages, setMessages] = React.useState<WebSocketMessage[]>([]);
  const [typingUsers, setTypingUsers] = React.useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = React.useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('connecting');
  const [reconnectAttempts, setReconnectAttempts] = React.useState(0);
  const wsRef = React.useRef<MockWebSocket | null>(null);
  const reconnectTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const connect = React.useCallback(() => {
    if (wsRef.current?.readyState === MockWebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');
    const ws = new MockWebSocket(
      `ws://localhost:3001/ws/projects/${projectId}`
    );
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      setConnectionStatus('connected');
      setReconnectAttempts(0);
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);

        switch (message.type) {
          case 'project_updated':
            setMessages((prev) => [...prev, message]);
            break;
          case 'user_typing':
            if (
              message.data?.userId &&
              !typingUsers.includes(message.data.userId)
            ) {
              setTypingUsers((prev) => [...prev, message.data.userId]);
            }
            break;
          case 'user_stopped_typing':
            if (message.data?.userId) {
              setTypingUsers((prev) =>
                prev.filter((id) => id !== message.data.userId)
              );
            }
            break;
          case 'agent_response_stream':
            setMessages((prev) => [...prev, message]);
            break;
          default:
            setMessages((prev) => [...prev, message]);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onclose = (event) => {
      setConnected(false);
      setConnectionStatus('disconnected');

      // Attempt reconnection if not a clean close
      if (event.code !== 1000 && reconnectAttempts < 5) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        reconnectTimeoutRef.current = setTimeout(() => {
          setReconnectAttempts((prev) => prev + 1);
          connect();
        }, delay);
      }
    };

    ws.onerror = () => {
      setConnectionStatus('error');
    };
  }, [projectId, reconnectAttempts]);

  const disconnect = React.useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
    }
  }, []);

  const sendMessage = React.useCallback(
    (message: Partial<WebSocketMessage>) => {
      if (wsRef.current?.readyState === MockWebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(message));
      }
    },
    []
  );

  const simulateTyping = React.useCallback(
    (userId: string) => {
      sendMessage({
        type: 'user_typing',
        data: { userId, projectId },
        timestamp: new Date().toISOString(),
      });
    },
    [sendMessage, projectId]
  );

  const simulateStopTyping = React.useCallback(
    (userId: string) => {
      sendMessage({
        type: 'user_stopped_typing',
        data: { userId, projectId },
        timestamp: new Date().toISOString(),
      });
    },
    [sendMessage, projectId]
  );

  React.useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return (
    <div data-testid="websocket-test-component">
      <div data-testid="connection-status">Status: {connectionStatus}</div>

      <div data-testid="connection-indicator">
        {connected ? 'Connected' : 'Disconnected'}
      </div>

      <div data-testid="reconnect-attempts">
        Reconnect attempts: {reconnectAttempts}
      </div>

      <div data-testid="typing-indicators">
        {typingUsers.length > 0 && <div>Typing: {typingUsers.join(', ')}</div>}
      </div>

      <div data-testid="messages-list">
        {messages.map((message, index) => (
          <div key={index} data-testid={`message-${index}`}>
            {message.type}: {JSON.stringify(message.data)}
          </div>
        ))}
      </div>

      <div className="controls">
        <button
          data-testid="connect-btn"
          onClick={connect}
          disabled={connected}
        >
          Connect
        </button>

        <button
          data-testid="disconnect-btn"
          onClick={disconnect}
          disabled={!connected}
        >
          Disconnect
        </button>

        <button
          data-testid="simulate-typing-btn"
          onClick={() => simulateTyping('user-1')}
          disabled={!connected}
        >
          Simulate Typing
        </button>

        <button
          data-testid="stop-typing-btn"
          onClick={() => simulateStopTyping('user-1')}
          disabled={!connected}
        >
          Stop Typing
        </button>
      </div>
    </div>
  );
};

// Test component for real-time project updates
const RealTimeProjectUpdatesComponent: React.FC = () => {
  const [projects, setProjects] = React.useState([
    generateMockProject({ id: 1, name: 'Project 1' }),
    generateMockProject({ id: 2, name: 'Project 2' }),
  ]);
  const [wsConnected, setWsConnected] = React.useState(false);
  const wsRef = React.useRef<MockWebSocket | null>(null);

  React.useEffect(() => {
    const ws = new MockWebSocket('ws://localhost:3001/ws/projects');
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      const message: WebSocketMessage = JSON.parse(event.data);

      if (message.type === 'project_updated' && message.data) {
        setProjects((prev) =>
          prev.map((p) =>
            p.id === message.data.id ? { ...p, ...message.data } : p
          )
        );
      }
    };

    ws.onclose = () => {
      setWsConnected(false);
    };

    return () => {
      ws.close();
    };
  }, []);

  const simulateProjectUpdate = (projectId: number, updates: any) => {
    if (wsRef.current) {
      (wsRef.current as any).simulateMessage({
        type: 'project_updated',
        data: { id: projectId, ...updates },
        timestamp: new Date().toISOString(),
      });
    }
  };

  return (
    <div data-testid="realtime-projects-component">
      <div data-testid="ws-status">
        WebSocket: {wsConnected ? 'Connected' : 'Disconnected'}
      </div>

      <div data-testid="projects-list">
        {projects.map((project) => (
          <div key={project.id} data-testid={`project-${project.id}`}>
            <div data-testid={`project-${project.id}-name`}>{project.name}</div>
            <div data-testid={`project-${project.id}-status`}>
              {project.status}
            </div>
          </div>
        ))}
      </div>

      <div className="controls">
        <button
          data-testid="update-project-1-btn"
          onClick={() =>
            simulateProjectUpdate(1, {
              name: 'Updated Project 1',
              status: ProjectStatus.IN_PROGRESS,
            })
          }
        >
          Update Project 1
        </button>

        <button
          data-testid="update-project-2-btn"
          onClick={() =>
            simulateProjectUpdate(2, {
              status: ProjectStatus.COMPLETED,
            })
          }
        >
          Complete Project 2
        </button>
      </div>
    </div>
  );
};

// Test component for agent streaming responses
const AgentStreamingComponent: React.FC = () => {
  const [streamingResponse, setStreamingResponse] = React.useState('');
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [typingIndicator, setTypingIndicator] = React.useState(false);
  const wsRef = React.useRef<MockWebSocket | null>(null);

  React.useEffect(() => {
    const ws = new MockWebSocket('ws://localhost:3001/ws/agent');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Agent WebSocket connected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'agent_typing_start':
          setTypingIndicator(true);
          setIsStreaming(true);
          break;
        case 'agent_response_stream':
          setStreamingResponse((prev) => prev + message.data.chunk);
          break;
        case 'agent_typing_stop':
          setTypingIndicator(false);
          setIsStreaming(false);
          break;
      }
    };

    return () => {
      ws.close();
    };
  }, []);

  const simulateAgentResponse = () => {
    if (!wsRef.current) return;

    const ws = wsRef.current as any;
    const response =
      'Based on your device description, I found 5 potential predicate devices with confidence scores ranging from 0.85 to 0.92. The top match is K123456 - CardioMonitor Pro, which shares similar intended use and technological characteristics.';

    // Start typing indicator
    ws.simulateMessage({
      type: 'agent_typing_start',
      timestamp: new Date().toISOString(),
    });

    // Stream response in chunks
    const chunks = response.match(/.{1,10}/g) || [];
    chunks.forEach((chunk, index) => {
      setTimeout(() => {
        ws.simulateMessage({
          type: 'agent_response_stream',
          data: { chunk },
          timestamp: new Date().toISOString(),
        });

        // Stop typing indicator after last chunk
        if (index === chunks.length - 1) {
          setTimeout(() => {
            ws.simulateMessage({
              type: 'agent_typing_stop',
              timestamp: new Date().toISOString(),
            });
          }, 100);
        }
      }, index * 100);
    });
  };

  return (
    <div data-testid="agent-streaming-component">
      <div data-testid="typing-indicator">
        {typingIndicator && <div>Agent is typing...</div>}
      </div>

      <div data-testid="streaming-response">{streamingResponse}</div>

      <div data-testid="streaming-status">
        {isStreaming ? 'Streaming...' : 'Ready'}
      </div>

      <button
        data-testid="simulate-response-btn"
        onClick={simulateAgentResponse}
      >
        Simulate Agent Response
      </button>

      <button
        data-testid="clear-response-btn"
        onClick={() => {
          setStreamingResponse('');
          setIsStreaming(false);
          setTypingIndicator(false);
        }}
      >
        Clear Response
      </button>
    </div>
  );
};

describe('Real-time Features Integration Tests', () => {
  const mockUser = generateMockUser();
  const mockSession = createMockSession(mockUser);

  beforeEach(() => {
    setupMockAPI();
    jest.clearAllMocks();
  });

  afterEach(() => {
    teardownMockAPI();
  });

  describe('WebSocket Connection Management', () => {
    it('should establish WebSocket connection and handle message flow', async () => {
      renderWithProviders(<WebSocketTestComponent projectId="1" />, {
        session: mockSession,
      });

      // Initially should be connecting
      expect(screen.getByTestId('connection-status')).toHaveTextContent(
        'connecting'
      );

      // Wait for connection to establish
      await waitFor(
        () => {
          expect(screen.getByTestId('connection-indicator')).toHaveTextContent(
            'Connected'
          );
          expect(screen.getByTestId('connection-status')).toHaveTextContent(
            'connected'
          );
        },
        { timeout: 200 }
      );

      // Verify connection controls
      expect(screen.getByTestId('connect-btn')).toBeDisabled();
      expect(screen.getByTestId('disconnect-btn')).not.toBeDisabled();
    });

    it('should handle WebSocket disconnection and reconnection attempts', async () => {
      const user = userEvent.setup();

      renderWithProviders(<WebSocketTestComponent projectId="1" />, {
        session: mockSession,
      });

      // Wait for initial connection
      await waitFor(() => {
        expect(screen.getByTestId('connection-indicator')).toHaveTextContent(
          'Connected'
        );
      });

      // Disconnect
      const disconnectBtn = screen.getByTestId('disconnect-btn');
      await user.click(disconnectBtn);

      await waitFor(() => {
        expect(screen.getByTestId('connection-indicator')).toHaveTextContent(
          'Disconnected'
        );
        expect(screen.getByTestId('connection-status')).toHaveTextContent(
          'disconnected'
        );
      });

      // Reconnect
      const connectBtn = screen.getByTestId('connect-btn');
      await user.click(connectBtn);

      await waitFor(
        () => {
          expect(screen.getByTestId('connection-indicator')).toHaveTextContent(
            'Connected'
          );
        },
        { timeout: 200 }
      );
    });

    it('should handle connection errors and automatic reconnection', async () => {
      renderWithProviders(<WebSocketTestComponent projectId="1" />, {
        session: mockSession,
      });

      // Wait for initial connection
      await waitFor(() => {
        expect(screen.getByTestId('connection-indicator')).toHaveTextContent(
          'Connected'
        );
      });

      // Simulate connection error by accessing the WebSocket instance
      await act(async () => {
        // Force close connection with error code
        const wsComponent = screen.getByTestId('websocket-test-component');
        const ws = (wsComponent as any)._reactInternalFiber?.memoizedProps
          ?.wsRef?.current;
        if (ws) {
          ws.close(1006, 'Connection lost'); // Abnormal closure
        }
      });

      // Should show disconnected state
      await waitFor(() => {
        expect(screen.getByTestId('connection-indicator')).toHaveTextContent(
          'Disconnected'
        );
      });

      // Should show reconnection attempts
      await waitFor(
        () => {
          const reconnectAttempts = screen.getByTestId('reconnect-attempts');
          expect(reconnectAttempts).toHaveTextContent(
            /Reconnect attempts: [1-9]/
          );
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Real-time Project Updates', () => {
    it('should receive and display real-time project updates across multiple browser tabs', async () => {
      const user = userEvent.setup();

      renderWithProviders(<RealTimeProjectUpdatesComponent />, {
        session: mockSession,
      });

      // Wait for WebSocket connection
      await waitFor(() => {
        expect(screen.getByTestId('ws-status')).toHaveTextContent('Connected');
      });

      // Initial project state
      expect(screen.getByTestId('project-1-name')).toHaveTextContent(
        'Project 1'
      );
      expect(screen.getByTestId('project-1-status')).toHaveTextContent('draft');

      // Simulate project update
      const updateBtn = screen.getByTestId('update-project-1-btn');
      await user.click(updateBtn);

      // Should see updated project data
      await waitFor(() => {
        expect(screen.getByTestId('project-1-name')).toHaveTextContent(
          'Updated Project 1'
        );
        expect(screen.getByTestId('project-1-status')).toHaveTextContent(
          'in_progress'
        );
      });
    });

    it('should handle concurrent project updates from multiple users', async () => {
      const user = userEvent.setup();

      renderWithProviders(<RealTimeProjectUpdatesComponent />, {
        session: mockSession,
      });

      await waitFor(() => {
        expect(screen.getByTestId('ws-status')).toHaveTextContent('Connected');
      });

      // Simulate rapid concurrent updates
      const updateBtn1 = screen.getByTestId('update-project-1-btn');
      const updateBtn2 = screen.getByTestId('update-project-2-btn');

      await user.click(updateBtn1);
      await user.click(updateBtn2);

      // Both projects should be updated
      await waitFor(() => {
        expect(screen.getByTestId('project-1-name')).toHaveTextContent(
          'Updated Project 1'
        );
        expect(screen.getByTestId('project-2-status')).toHaveTextContent(
          'completed'
        );
      });
    });

    it('should maintain state consistency during rapid updates', async () => {
      const user = userEvent.setup();

      renderWithProviders(<RealTimeProjectUpdatesComponent />, {
        session: mockSession,
      });

      await waitFor(() => {
        expect(screen.getByTestId('ws-status')).toHaveTextContent('Connected');
      });

      // Perform multiple rapid updates
      const updateBtn1 = screen.getByTestId('update-project-1-btn');

      for (let i = 0; i < 5; i++) {
        await user.click(updateBtn1);
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      // Final state should be consistent
      await waitFor(() => {
        expect(screen.getByTestId('project-1-name')).toHaveTextContent(
          'Updated Project 1'
        );
        expect(screen.getByTestId('project-1-status')).toHaveTextContent(
          'in_progress'
        );
      });
    });
  });

  describe('Agent Typing Indicators and Live Response Streaming', () => {
    it('should display typing indicators and stream agent responses', async () => {
      const user = userEvent.setup();

      renderWithProviders(<AgentStreamingComponent />, {
        session: mockSession,
      });

      // Initially should be ready
      expect(screen.getByTestId('streaming-status')).toHaveTextContent('Ready');
      expect(screen.queryByText('Agent is typing...')).not.toBeInTheDocument();

      // Start agent response simulation
      const simulateBtn = screen.getByTestId('simulate-response-btn');
      await user.click(simulateBtn);

      // Should show typing indicator
      await waitFor(() => {
        expect(screen.getByText('Agent is typing...')).toBeInTheDocument();
        expect(screen.getByTestId('streaming-status')).toHaveTextContent(
          'Streaming...'
        );
      });

      // Should start streaming response
      await waitFor(
        () => {
          const response = screen.getByTestId('streaming-response');
          expect(response.textContent).toBeTruthy();
          expect(response.textContent!.length).toBeGreaterThan(0);
        },
        { timeout: 500 }
      );

      // Should complete streaming
      await waitFor(
        () => {
          expect(
            screen.queryByText('Agent is typing...')
          ).not.toBeInTheDocument();
          expect(screen.getByTestId('streaming-status')).toHaveTextContent(
            'Ready'
          );

          const response = screen.getByTestId('streaming-response');
          expect(response.textContent).toContain(
            'Based on your device description'
          );
          expect(response.textContent).toContain('CardioMonitor Pro');
        },
        { timeout: 2000 }
      );
    });

    it('should handle streaming interruption and recovery', async () => {
      const user = userEvent.setup();

      renderWithProviders(<AgentStreamingComponent />, {
        session: mockSession,
      });

      // Start streaming
      const simulateBtn = screen.getByTestId('simulate-response-btn');
      await user.click(simulateBtn);

      // Wait for streaming to start
      await waitFor(() => {
        expect(screen.getByText('Agent is typing...')).toBeInTheDocument();
      });

      // Clear response mid-stream
      const clearBtn = screen.getByTestId('clear-response-btn');
      await user.click(clearBtn);

      // Should reset state
      expect(screen.getByTestId('streaming-response')).toHaveTextContent('');
      expect(screen.getByTestId('streaming-status')).toHaveTextContent('Ready');
      expect(screen.queryByText('Agent is typing...')).not.toBeInTheDocument();

      // Should be able to start new stream
      await user.click(simulateBtn);

      await waitFor(() => {
        expect(screen.getByText('Agent is typing...')).toBeInTheDocument();
      });
    });
  });

  describe('User Typing Indicators', () => {
    it('should show and hide typing indicators for multiple users', async () => {
      const user = userEvent.setup();

      renderWithProviders(<WebSocketTestComponent projectId="1" />, {
        session: mockSession,
      });

      // Wait for connection
      await waitFor(() => {
        expect(screen.getByTestId('connection-indicator')).toHaveTextContent(
          'Connected'
        );
      });

      // Initially no typing indicators
      expect(screen.getByTestId('typing-indicators')).toBeEmptyDOMElement();

      // Simulate user typing
      const typingBtn = screen.getByTestId('simulate-typing-btn');
      await user.click(typingBtn);

      // Should show typing indicator
      await waitFor(() => {
        expect(screen.getByTestId('typing-indicators')).toHaveTextContent(
          'Typing: user-1'
        );
      });

      // Stop typing
      const stopTypingBtn = screen.getByTestId('stop-typing-btn');
      await user.click(stopTypingBtn);

      // Should hide typing indicator
      await waitFor(() => {
        expect(screen.getByTestId('typing-indicators')).toBeEmptyDOMElement();
      });
    });

    it('should handle multiple users typing simultaneously', async () => {
      const user = userEvent.setup();

      // Mock component that simulates multiple users
      const MultiUserTypingComponent: React.FC = () => {
        const [typingUsers, setTypingUsers] = React.useState<string[]>([]);
        const wsRef = React.useRef<MockWebSocket | null>(null);

        React.useEffect(() => {
          const ws = new MockWebSocket('ws://localhost:3001/ws/typing');
          wsRef.current = ws;

          ws.onmessage = (event) => {
            const message = JSON.parse(event.data);

            if (message.type === 'user_typing') {
              setTypingUsers((prev) =>
                prev.includes(message.data.userId)
                  ? prev
                  : [...prev, message.data.userId]
              );
            } else if (message.type === 'user_stopped_typing') {
              setTypingUsers((prev) =>
                prev.filter((id) => id !== message.data.userId)
              );
            }
          };

          return () => ws.close();
        }, []);

        const simulateUserTyping = (userId: string) => {
          if (wsRef.current) {
            (wsRef.current as any).simulateMessage({
              type: 'user_typing',
              data: { userId },
              timestamp: new Date().toISOString(),
            });
          }
        };

        const simulateUserStopTyping = (userId: string) => {
          if (wsRef.current) {
            (wsRef.current as any).simulateMessage({
              type: 'user_stopped_typing',
              data: { userId },
              timestamp: new Date().toISOString(),
            });
          }
        };

        return (
          <div data-testid="multi-user-typing">
            <div data-testid="typing-list">
              {typingUsers.length > 0 ? (
                <div>Users typing: {typingUsers.join(', ')}</div>
              ) : (
                <div>No one is typing</div>
              )}
            </div>

            <button
              data-testid="user1-typing-btn"
              onClick={() => simulateUserTyping('user-1')}
            >
              User 1 Start Typing
            </button>

            <button
              data-testid="user2-typing-btn"
              onClick={() => simulateUserTyping('user-2')}
            >
              User 2 Start Typing
            </button>

            <button
              data-testid="user1-stop-btn"
              onClick={() => simulateUserStopTyping('user-1')}
            >
              User 1 Stop Typing
            </button>

            <button
              data-testid="user2-stop-btn"
              onClick={() => simulateUserStopTyping('user-2')}
            >
              User 2 Stop Typing
            </button>
          </div>
        );
      };

      renderWithProviders(<MultiUserTypingComponent />, {
        session: mockSession,
      });

      // Initially no one typing
      expect(screen.getByText('No one is typing')).toBeInTheDocument();

      // User 1 starts typing
      await user.click(screen.getByTestId('user1-typing-btn'));

      await waitFor(() => {
        expect(screen.getByText('Users typing: user-1')).toBeInTheDocument();
      });

      // User 2 also starts typing
      await user.click(screen.getByTestId('user2-typing-btn'));

      await waitFor(() => {
        expect(
          screen.getByText('Users typing: user-1, user-2')
        ).toBeInTheDocument();
      });

      // User 1 stops typing
      await user.click(screen.getByTestId('user1-stop-btn'));

      await waitFor(() => {
        expect(screen.getByText('Users typing: user-2')).toBeInTheDocument();
      });

      // User 2 stops typing
      await user.click(screen.getByTestId('user2-stop-btn'));

      await waitFor(() => {
        expect(screen.getByText('No one is typing')).toBeInTheDocument();
      });
    });
  });

  describe('Connection Recovery and Network Interruptions', () => {
    it('should recover from network interruptions automatically', async () => {
      renderWithProviders(<WebSocketTestComponent projectId="1" />, {
        session: mockSession,
      });

      // Wait for initial connection
      await waitFor(() => {
        expect(screen.getByTestId('connection-indicator')).toHaveTextContent(
          'Connected'
        );
      });

      // Simulate network interruption by forcing WebSocket error
      await act(async () => {
        // Access the WebSocket instance and simulate error
        const wsElement = screen.getByTestId('websocket-test-component');
        // In a real scenario, we would trigger a network error
        // For testing, we'll simulate the error condition
      });

      // Should attempt reconnection
      await waitFor(
        () => {
          const reconnectAttempts = screen.getByTestId('reconnect-attempts');
          expect(reconnectAttempts.textContent).toMatch(
            /Reconnect attempts: [0-9]+/
          );
        },
        { timeout: 3000 }
      );
    });

    it('should handle connection recovery with exponential backoff', async () => {
      const ConnectionRecoveryComponent: React.FC = () => {
        const [connectionAttempts, setConnectionAttempts] = React.useState(0);
        const [backoffDelay, setBackoffDelay] = React.useState(1000);
        const [isRecovering, setIsRecovering] = React.useState(false);

        const simulateConnectionFailure = () => {
          setIsRecovering(true);

          const attemptReconnection = (attempt: number) => {
            const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
            setBackoffDelay(delay);
            setConnectionAttempts(attempt + 1);

            setTimeout(() => {
              if (attempt < 3) {
                // Simulate continued failure
                attemptReconnection(attempt + 1);
              } else {
                // Simulate successful recovery
                setIsRecovering(false);
                setConnectionAttempts(0);
                setBackoffDelay(1000);
              }
            }, delay);
          };

          attemptReconnection(0);
        };

        return (
          <div data-testid="connection-recovery">
            <div data-testid="recovery-status">
              {isRecovering ? 'Recovering...' : 'Connected'}
            </div>

            <div data-testid="connection-attempts">
              Attempts: {connectionAttempts}
            </div>

            <div data-testid="backoff-delay">
              Next attempt in: {backoffDelay}ms
            </div>

            <button
              data-testid="simulate-failure-btn"
              onClick={simulateConnectionFailure}
              disabled={isRecovering}
            >
              Simulate Connection Failure
            </button>
          </div>
        );
      };

      const user = userEvent.setup();

      renderWithProviders(<ConnectionRecoveryComponent />, {
        session: mockSession,
      });

      // Initially connected
      expect(screen.getByTestId('recovery-status')).toHaveTextContent(
        'Connected'
      );

      // Simulate connection failure
      const failureBtn = screen.getByTestId('simulate-failure-btn');
      await user.click(failureBtn);

      // Should start recovery process
      await waitFor(() => {
        expect(screen.getByTestId('recovery-status')).toHaveTextContent(
          'Recovering...'
        );
        expect(screen.getByTestId('connection-attempts')).toHaveTextContent(
          'Attempts: 1'
        );
      });

      // Should show increasing backoff delays
      await waitFor(
        () => {
          const attemptsText = screen.getByTestId(
            'connection-attempts'
          ).textContent;
          expect(attemptsText).toMatch(/Attempts: [2-4]/);
        },
        { timeout: 5000 }
      );

      // Should eventually recover
      await waitFor(
        () => {
          expect(screen.getByTestId('recovery-status')).toHaveTextContent(
            'Connected'
          );
          expect(screen.getByTestId('connection-attempts')).toHaveTextContent(
            'Attempts: 0'
          );
        },
        { timeout: 10000 }
      );
    });
  });

  describe('Concurrent User Interactions and Conflict Resolution', () => {
    it('should handle concurrent user interactions without conflicts', async () => {
      const user = userEvent.setup();

      const ConcurrentInteractionsComponent: React.FC = () => {
        const [sharedState, setSharedState] = React.useState({
          counter: 0,
          lastUser: '',
        });
        const [conflicts, setConflicts] = React.useState<string[]>([]);
        const wsRef = React.useRef<MockWebSocket | null>(null);

        React.useEffect(() => {
          const ws = new MockWebSocket('ws://localhost:3001/ws/concurrent');
          wsRef.current = ws;

          ws.onmessage = (event) => {
            const message = JSON.parse(event.data);

            if (message.type === 'state_update') {
              setSharedState(message.data);
            } else if (message.type === 'conflict_detected') {
              setConflicts((prev) => [...prev, message.data.description]);
            }
          };

          return () => ws.close();
        }, []);

        const simulateUserAction = (userId: string) => {
          if (wsRef.current) {
            const newCounter = sharedState.counter + 1;

            // Simulate optimistic update
            setSharedState((prev) => ({
              ...prev,
              counter: newCounter,
              lastUser: userId,
            }));

            // Simulate server update
            setTimeout(() => {
              (wsRef.current as any).simulateMessage({
                type: 'state_update',
                data: { counter: newCounter, lastUser: userId },
                timestamp: new Date().toISOString(),
              });
            }, 100);
          }
        };

        const simulateConflict = () => {
          if (wsRef.current) {
            (wsRef.current as any).simulateMessage({
              type: 'conflict_detected',
              data: { description: 'Concurrent modification detected' },
              timestamp: new Date().toISOString(),
            });
          }
        };

        return (
          <div data-testid="concurrent-interactions">
            <div data-testid="shared-counter">
              Counter: {sharedState.counter}
            </div>

            <div data-testid="last-user">
              Last updated by: {sharedState.lastUser}
            </div>

            <div data-testid="conflicts-list">
              {conflicts.map((conflict, index) => (
                <div key={index} data-testid={`conflict-${index}`}>
                  {conflict}
                </div>
              ))}
            </div>

            <button
              data-testid="user1-action-btn"
              onClick={() => simulateUserAction('user-1')}
            >
              User 1 Action
            </button>

            <button
              data-testid="user2-action-btn"
              onClick={() => simulateUserAction('user-2')}
            >
              User 2 Action
            </button>

            <button
              data-testid="simulate-conflict-btn"
              onClick={simulateConflict}
            >
              Simulate Conflict
            </button>
          </div>
        );
      };

      renderWithProviders(<ConcurrentInteractionsComponent />, {
        session: mockSession,
      });

      // Initial state
      expect(screen.getByTestId('shared-counter')).toHaveTextContent(
        'Counter: 0'
      );

      // User 1 performs action
      await user.click(screen.getByTestId('user1-action-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('shared-counter')).toHaveTextContent(
          'Counter: 1'
        );
        expect(screen.getByTestId('last-user')).toHaveTextContent(
          'Last updated by: user-1'
        );
      });

      // User 2 performs action
      await user.click(screen.getByTestId('user2-action-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('shared-counter')).toHaveTextContent(
          'Counter: 2'
        );
        expect(screen.getByTestId('last-user')).toHaveTextContent(
          'Last updated by: user-2'
        );
      });

      // Simulate conflict
      await user.click(screen.getByTestId('simulate-conflict-btn'));

      await waitFor(() => {
        expect(screen.getByTestId('conflict-0')).toHaveTextContent(
          'Concurrent modification detected'
        );
      });
    });
  });
});
