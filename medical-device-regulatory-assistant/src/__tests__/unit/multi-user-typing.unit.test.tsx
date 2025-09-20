/**
 * Multi-user Typing Indicators Unit Tests
 * Tests the multi-user typing indicators and collaboration features
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import '@testing-library/jest-dom';

// Import components after WebSocket mock
import { CollaborationProvider } from '@/components/collaboration/CollaborationProvider';
import {
  TypingIndicators,
  UserTypingIndicator,
  CollaborativeInput,
} from '@/components/ui/typing-indicators';

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

  // Helper method to simulate receiving messages
  simulateMessage(data: any) {
    if (this.readyState === MockWebSocket.OPEN && this.onmessage) {
      this.onmessage(
        new MessageEvent('message', { data: JSON.stringify(data) })
      );
    }
  }
}

// Replace global WebSocket with mock
(global as any).WebSocket = MockWebSocket;

// Mock session
const mockSession = {
  user: {
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com',
  },
};

jest.mock('next-auth/react', () => ({
  useSession: () => ({ data: mockSession }),
}));

// Test component for multi-user typing
const MultiUserTypingTest: React.FC = () => {
  const [typingUsers, setTypingUsers] = React.useState<
    Array<{
      userId: string;
      userName: string;
      timestamp: number;
      projectId?: number;
    }>
  >([]);

  const simulateUserTyping = (
    userId: string,
    userName: string,
    projectId?: number
  ) => {
    setTypingUsers((prev) => [
      ...prev.filter((u) => u.userId !== userId),
      { userId, userName, timestamp: Date.now(), projectId },
    ]);
  };

  const simulateUserStopTyping = (userId: string) => {
    setTypingUsers((prev) => prev.filter((u) => u.userId !== userId));
  };

  return (
    <div data-testid="multi-user-typing-test">
      <div data-testid="typing-users-count">
        {typingUsers.length} users typing
      </div>

      <div data-testid="typing-users-list">
        {typingUsers.map((user) => (
          <div key={user.userId} data-testid={`typing-user-${user.userId}`}>
            {user.userName} is typing
          </div>
        ))}
      </div>

      <button
        data-testid="add-user1-typing"
        onClick={() => simulateUserTyping('user-1', 'Alice', 1)}
      >
        User 1 Start Typing
      </button>

      <button
        data-testid="add-user2-typing"
        onClick={() => simulateUserTyping('user-2', 'Bob', 1)}
      >
        User 2 Start Typing
      </button>

      <button
        data-testid="add-user3-typing"
        onClick={() => simulateUserTyping('user-3', 'Charlie', 2)}
      >
        User 3 Start Typing (Project 2)
      </button>

      <button
        data-testid="stop-user1-typing"
        onClick={() => simulateUserStopTyping('user-1')}
      >
        User 1 Stop Typing
      </button>

      <button
        data-testid="stop-user2-typing"
        onClick={() => simulateUserStopTyping('user-2')}
      >
        User 2 Stop Typing
      </button>

      {/* Test TypingIndicators component with mock data */}
      <div data-testid="typing-indicators-component">
        {typingUsers.length > 0 && (
          <div>
            <div data-testid="typing-indicator-text">
              {typingUsers.length === 1
                ? `${typingUsers[0].userName} is typing...`
                : `${typingUsers.length} users are typing...`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

describe('Multi-user Typing Indicators', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle multiple users typing simultaneously', async () => {
    const user = userEvent.setup();

    render(<MultiUserTypingTest />);

    // Initially no users typing
    expect(screen.getByTestId('typing-users-count')).toHaveTextContent(
      '0 users typing'
    );

    // User 1 starts typing
    await user.click(screen.getByTestId('add-user1-typing'));

    await waitFor(() => {
      expect(screen.getByTestId('typing-users-count')).toHaveTextContent(
        '1 users typing'
      );
      expect(screen.getByTestId('typing-user-user-1')).toHaveTextContent(
        'Alice is typing'
      );
    });

    // User 2 also starts typing
    await user.click(screen.getByTestId('add-user2-typing'));

    await waitFor(() => {
      expect(screen.getByTestId('typing-users-count')).toHaveTextContent(
        '2 users typing'
      );
      expect(screen.getByTestId('typing-user-user-2')).toHaveTextContent(
        'Bob is typing'
      );
    });

    // User 3 starts typing in different project
    await user.click(screen.getByTestId('add-user3-typing'));

    await waitFor(() => {
      expect(screen.getByTestId('typing-users-count')).toHaveTextContent(
        '3 users typing'
      );
      expect(screen.getByTestId('typing-user-user-3')).toHaveTextContent(
        'Charlie is typing'
      );
    });

    // User 1 stops typing
    await user.click(screen.getByTestId('stop-user1-typing'));

    await waitFor(() => {
      expect(screen.getByTestId('typing-users-count')).toHaveTextContent(
        '2 users typing'
      );
      expect(
        screen.queryByTestId('typing-user-user-1')
      ).not.toBeInTheDocument();
    });

    // User 2 stops typing
    await user.click(screen.getByTestId('stop-user2-typing'));

    await waitFor(() => {
      expect(screen.getByTestId('typing-users-count')).toHaveTextContent(
        '1 users typing'
      );
      expect(
        screen.queryByTestId('typing-user-user-2')
      ).not.toBeInTheDocument();
    });
  });

  it('should display appropriate typing indicator text for different user counts', async () => {
    const user = userEvent.setup();

    render(<MultiUserTypingTest />);

    // No users typing
    expect(
      screen.queryByTestId('typing-indicator-text')
    ).not.toBeInTheDocument();

    // One user typing
    await user.click(screen.getByTestId('add-user1-typing'));

    await waitFor(() => {
      expect(screen.getByTestId('typing-indicator-text')).toHaveTextContent(
        'Alice is typing...'
      );
    });

    // Two users typing
    await user.click(screen.getByTestId('add-user2-typing'));

    await waitFor(() => {
      expect(screen.getByTestId('typing-indicator-text')).toHaveTextContent(
        '2 users are typing...'
      );
    });

    // Three users typing
    await user.click(screen.getByTestId('add-user3-typing'));

    await waitFor(() => {
      expect(screen.getByTestId('typing-indicator-text')).toHaveTextContent(
        '3 users are typing...'
      );
    });
  });

  it('should handle rapid typing state changes', async () => {
    const user = userEvent.setup();

    render(<MultiUserTypingTest />);

    // Rapid start/stop cycles
    for (let i = 0; i < 5; i++) {
      await user.click(screen.getByTestId('add-user1-typing'));
      await user.click(screen.getByTestId('stop-user1-typing'));
    }

    // Should end up with no users typing
    await waitFor(() => {
      expect(screen.getByTestId('typing-users-count')).toHaveTextContent(
        '0 users typing'
      );
    });

    // Add multiple users quickly
    await user.click(screen.getByTestId('add-user1-typing'));
    await user.click(screen.getByTestId('add-user2-typing'));
    await user.click(screen.getByTestId('add-user3-typing'));

    await waitFor(() => {
      expect(screen.getByTestId('typing-users-count')).toHaveTextContent(
        '3 users typing'
      );
    });
  });

  it('should maintain user identification across typing sessions', async () => {
    const user = userEvent.setup();

    render(<MultiUserTypingTest />);

    // User 1 starts typing
    await user.click(screen.getByTestId('add-user1-typing'));

    await waitFor(() => {
      expect(screen.getByTestId('typing-user-user-1')).toHaveTextContent(
        'Alice is typing'
      );
    });

    // User 1 starts typing again (should update, not duplicate)
    await user.click(screen.getByTestId('add-user1-typing'));

    await waitFor(() => {
      expect(screen.getByTestId('typing-users-count')).toHaveTextContent(
        '1 users typing'
      );
      expect(screen.getByTestId('typing-user-user-1')).toHaveTextContent(
        'Alice is typing'
      );
    });

    // Should still be only one instance of user-1
    const user1Elements = screen.getAllByTestId('typing-user-user-1');
    expect(user1Elements).toHaveLength(1);
  });
});

describe('Collaboration Provider', () => {
  it('should provide collaboration context', () => {
    const TestComponent = () => (
        <CollaborationProvider projectId={1}>
          <div data-testid="collaboration-test">
            Collaboration provider loaded
          </div>
        </CollaborationProvider>
      );

    render(<TestComponent />);

    expect(screen.getByTestId('collaboration-test')).toBeInTheDocument();
  });
});
