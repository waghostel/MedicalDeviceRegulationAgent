/**
 * Unit tests for next-auth React 19 compatibility
 * Verifies that next-auth works correctly with React 19 without internal API errors
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { SessionProvider, useSession } from 'next-auth/react';
import { createMockSession } from '@/lib/testing/test-utils';
import { generateMockUser } from '@/lib/mock-data';

// Test component that uses next-auth hooks
const TestAuthComponent: React.FC = () => {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return <div data-testid="loading">Loading...</div>;
  }

  if (status === 'authenticated' && session) {
    return (
      <div data-testid="authenticated">
        <h1>Welcome, {session.user?.name}</h1>
        <p>Email: {session.user?.email}</p>
        <p>Status: {status}</p>
      </div>
    );
  }

  return (
    <div data-testid="unauthenticated">
      <p>Not authenticated</p>
      <p>Status: {status}</p>
    </div>
  );
};

describe('NextAuth React 19 Compatibility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render SessionProvider without React 19 internal API errors', () => {
    const mockUser = generateMockUser({
      name: 'Test User',
      email: 'test@example.com',
    });
    const mockSession = createMockSession(mockUser);

    // This should not throw "s._removeUnmounted is not a function" error
    expect(() => {
      render(
        <SessionProvider session={mockSession}>
          <TestAuthComponent />
        </SessionProvider>
      );
    }).not.toThrow();

    expect(screen.getByTestId('authenticated')).toBeInTheDocument();
    expect(screen.getByText('Welcome, Test User')).toBeInTheDocument();
    expect(screen.getByText('Email: test@example.com')).toBeInTheDocument();
  });

  it('should handle unauthenticated state without React 19 errors', () => {
    expect(() => {
      render(
        <SessionProvider session={null}>
          <TestAuthComponent />
        </SessionProvider>
      );
    }).not.toThrow();

    expect(screen.getByTestId('unauthenticated')).toBeInTheDocument();
    expect(screen.getByText('Not authenticated')).toBeInTheDocument();
    expect(screen.getByText('Status: unauthenticated')).toBeInTheDocument();
  });

  it('should handle session updates without React 19 internal API errors', async () => {
    const mockUser = generateMockUser({
      name: 'Initial User',
      email: 'initial@example.com',
    });
    const initialSession = createMockSession(mockUser);

    const { rerender } = render(
      <SessionProvider session={initialSession}>
        <TestAuthComponent />
      </SessionProvider>
    );

    expect(screen.getByText('Welcome, Initial User')).toBeInTheDocument();

    // Update session
    const updatedUser = generateMockUser({
      name: 'Updated User',
      email: 'updated@example.com',
    });
    const updatedSession = createMockSession(updatedUser);

    // This should not cause React 19 internal API errors
    expect(() => {
      rerender(
        <SessionProvider session={updatedSession}>
          <TestAuthComponent />
        </SessionProvider>
      );
    }).not.toThrow();

    await waitFor(() => {
      expect(screen.getByText('Welcome, Updated User')).toBeInTheDocument();
      expect(
        screen.getByText('Email: updated@example.com')
      ).toBeInTheDocument();
    });
  });

  it('should handle multiple SessionProvider instances without conflicts', () => {
    const mockUser1 = generateMockUser({
      name: 'User One',
      email: 'user1@example.com',
    });
    const mockUser2 = generateMockUser({
      name: 'User Two',
      email: 'user2@example.com',
    });
    const session1 = createMockSession(mockUser1);
    const session2 = createMockSession(mockUser2);

    // Render multiple providers (simulating different parts of the app)
    expect(() => {
      render(
        <div>
          <SessionProvider session={session1}>
            <div data-testid="provider-1">
              <TestAuthComponent />
            </div>
          </SessionProvider>
          <SessionProvider session={session2}>
            <div data-testid="provider-2">
              <TestAuthComponent />
            </div>
          </SessionProvider>
        </div>
      );
    }).not.toThrow();

    // Both providers should work independently
    expect(screen.getByTestId('provider-1')).toBeInTheDocument();
    expect(screen.getByTestId('provider-2')).toBeInTheDocument();
  });

  it('should handle rapid session state changes without memory leaks', async () => {
    const mockUser = generateMockUser();
    const session = createMockSession(mockUser);

    const { rerender } = render(
      <SessionProvider session={session}>
        <TestAuthComponent />
      </SessionProvider>
    );

    // Rapidly change session state multiple times
    for (let i = 0; i < 10; i++) {
      const newSession = i % 2 === 0 ? null : createMockSession(mockUser);

      expect(() => {
        rerender(
          <SessionProvider session={newSession}>
            <TestAuthComponent />
          </SessionProvider>
        );
      }).not.toThrow();

      await waitFor(() => {
        if (newSession) {
          expect(screen.getByTestId('authenticated')).toBeInTheDocument();
        } else {
          expect(screen.getByTestId('unauthenticated')).toBeInTheDocument();
        }
      });
    }
  });

  it('should work with React 19 concurrent features', async () => {
    const mockUser = generateMockUser({
      name: 'Concurrent User',
      email: 'concurrent@example.com',
    });
    const mockSession = createMockSession(mockUser);

    // Test with React 19 concurrent rendering
    expect(() => {
      render(
        <React.StrictMode>
          <SessionProvider session={mockSession}>
            <React.Suspense fallback={<div>Loading...</div>}>
              <TestAuthComponent />
            </React.Suspense>
          </SessionProvider>
        </React.StrictMode>
      );
    }).not.toThrow();

    await waitFor(() => {
      expect(screen.getByTestId('authenticated')).toBeInTheDocument();
      expect(screen.getByText('Welcome, Concurrent User')).toBeInTheDocument();
    });
  });
});
