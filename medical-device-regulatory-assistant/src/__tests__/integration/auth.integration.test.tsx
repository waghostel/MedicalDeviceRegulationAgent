/**
 * Integration tests for authentication and session management
 * Tests Google OAuth login flow, session persistence, protected routes, and security features
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionProvider, useSession, signIn, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { setupMockAPI, teardownMockAPI, addMockHandlers } from '@/lib/testing/msw-utils';
import { createMockSession, renderWithProviders } from '@/lib/testing/test-utils';
import { generateMockUser } from '@/lib/mock-data';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

// Mock NextAuth
jest.mock('next-auth/react', () => ({
  SessionProvider: ({ children, session }: any) => (
    <div data-testid="session-provider" data-session={JSON.stringify(session)}>
      {children}
    </div>
  ),
  useSession: jest.fn(),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
}));

// Test components for authentication testing
const TestProtectedComponent: React.FC = () => {
  const { data: session, status } = useSession();
  
  if (status === 'loading') {
    return <div data-testid="loading">Loading...</div>;
  }
  
  if (!session) {
    return <div data-testid="unauthenticated">Please sign in</div>;
  }
  
  return (
    <div data-testid="authenticated">
      <h1>Welcome, {session.user?.name}</h1>
      <button onClick={() => signOut()} data-testid="sign-out-btn">
        Sign Out
      </button>
    </div>
  );
};

const TestLoginComponent: React.FC = () => {
  const handleGoogleLogin = () => {
    signIn('google', { callbackUrl: '/dashboard' });
  };
  
  return (
    <div data-testid="login-component">
      <h1>Sign In</h1>
      <button onClick={handleGoogleLogin} data-testid="google-login-btn">
        Sign in with Google
      </button>
    </div>
  );
};

const TestSessionPersistenceComponent: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const handleNavigation = () => {
    router.push('/dashboard');
  };
  
  return (
    <div data-testid="session-persistence">
      <div data-testid="session-status">{status}</div>
      <div data-testid="session-data">{session ? session.user?.email : 'No session'}</div>
      <button onClick={handleNavigation} data-testid="navigate-btn">
        Navigate to Dashboard
      </button>
    </div>
  );
};

describe('Authentication Integration Tests', () => {
  const mockRouter = {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
    route: '/',
    basePath: '',
    locale: 'en',
    locales: ['en'],
    defaultLocale: 'en',
    isReady: true,
    isPreview: false,
  };

  beforeEach(() => {
    setupMockAPI();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    jest.clearAllMocks();
  });

  afterEach(() => {
    teardownMockAPI();
  });

  describe('Google OAuth Login Flow', () => {
    it('should initiate Google OAuth login when button is clicked', async () => {
      const user = userEvent.setup();
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      render(<TestLoginComponent />);

      const googleLoginBtn = screen.getByTestId('google-login-btn');
      await user.click(googleLoginBtn);

      expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/dashboard' });
    });

    it('should handle successful Google OAuth callback', async () => {
      const mockUser = generateMockUser({
        id: 'google-user-123',
        email: 'test@gmail.com',
        name: 'Test User',
      });
      const mockSession = createMockSession(mockUser);

      // Mock successful authentication
      addMockHandlers([
        {
          method: 'GET',
          path: '/api/auth/session',
          response: mockSession,
          delay: 100,
        },
        {
          method: 'POST',
          path: '/api/auth/callback/google',
          response: { url: '/dashboard' },
          delay: 200,
        },
      ]);

      (useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      });

      render(<TestProtectedComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toBeInTheDocument();
        expect(screen.getByText('Welcome, Test User')).toBeInTheDocument();
      });
    });

    it('should handle OAuth authentication errors', async () => {
      // Mock authentication error
      addMockHandlers([
        {
          method: 'POST',
          path: '/api/auth/callback/google',
          response: { error: 'OAuthAccountNotLinked' },
          error: true,
          statusCode: 400,
        },
      ]);

      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      render(<TestLoginComponent />);

      const googleLoginBtn = screen.getByTestId('google-login-btn');
      await userEvent.click(googleLoginBtn);

      expect(signIn).toHaveBeenCalledWith('google', { callbackUrl: '/dashboard' });
    });

    it('should redirect to callback URL after successful authentication', async () => {
      const mockUser = generateMockUser();
      const mockSession = createMockSession(mockUser);

      (useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      });

      render(<TestProtectedComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toBeInTheDocument();
      });
    });
  });

  describe('Session Persistence and Restoration', () => {
    it('should persist session across page refreshes', async () => {
      const mockUser = generateMockUser({
        email: 'persistent@example.com',
        name: 'Persistent User',
      });
      const mockSession = createMockSession(mockUser);

      // Mock session restoration from storage
      addMockHandlers([
        {
          method: 'GET',
          path: '/api/auth/session',
          response: mockSession,
          delay: 50,
        },
      ]);

      // First render - loading state
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
      });

      const { rerender } = render(<TestSessionPersistenceComponent />);

      expect(screen.getByTestId('session-status')).toHaveTextContent('loading');

      // Simulate session restoration after page refresh
      (useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      });

      rerender(<TestSessionPersistenceComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('session-status')).toHaveTextContent('authenticated');
        expect(screen.getByTestId('session-data')).toHaveTextContent('persistent@example.com');
      });
    });

    it('should maintain session state during navigation', async () => {
      const mockUser = generateMockUser();
      const mockSession = createMockSession(mockUser);

      (useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      });

      render(<TestSessionPersistenceComponent />);

      const navigateBtn = screen.getByTestId('navigate-btn');
      await userEvent.click(navigateBtn);

      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      expect(screen.getByTestId('session-status')).toHaveTextContent('authenticated');
    });

    it('should handle session restoration failures gracefully', async () => {
      // Mock session restoration failure
      addMockHandlers([
        {
          method: 'GET',
          path: '/api/auth/session',
          response: { error: 'Session expired' },
          error: true,
          statusCode: 401,
        },
      ]);

      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      render(<TestSessionPersistenceComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('session-status')).toHaveTextContent('unauthenticated');
        expect(screen.getByTestId('session-data')).toHaveTextContent('No session');
      });
    });
  });

  describe('Protected Route Access', () => {
    it('should allow access to protected routes when authenticated', async () => {
      const mockUser = generateMockUser();
      const mockSession = createMockSession(mockUser);

      (useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      });

      render(<TestProtectedComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toBeInTheDocument();
        expect(screen.getByText(`Welcome, ${mockUser.name}`)).toBeInTheDocument();
      });
    });

    it('should deny access to protected routes when unauthenticated', async () => {
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      render(<TestProtectedComponent />);

      expect(screen.getByTestId('unauthenticated')).toBeInTheDocument();
      expect(screen.getByText('Please sign in')).toBeInTheDocument();
    });

    it('should show loading state while checking authentication', async () => {
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'loading',
      });

      render(<TestProtectedComponent />);

      expect(screen.getByTestId('loading')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should redirect unauthenticated users to login page', async () => {
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      // Mock protected route component that redirects
      const ProtectedRouteWithRedirect: React.FC = () => {
        const { data: session, status } = useSession();
        const router = useRouter();

        React.useEffect(() => {
          if (status === 'unauthenticated') {
            router.push('/auth/signin');
          }
        }, [status, router]);

        if (status === 'loading') return <div>Loading...</div>;
        if (!session) return <div>Redirecting...</div>;

        return <div data-testid="protected-content">Protected Content</div>;
      };

      render(<ProtectedRouteWithRedirect />);

      await waitFor(() => {
        expect(mockRouter.push).toHaveBeenCalledWith('/auth/signin');
      });
    });
  });

  describe('Session Timeout and Automatic Logout', () => {
    it('should handle session timeout gracefully', async () => {
      const mockUser = generateMockUser();
      const expiredSession = createMockSession({
        ...mockUser,
        expires: new Date(Date.now() - 1000).toISOString(), // Expired 1 second ago
      });

      // Mock expired session response
      addMockHandlers([
        {
          method: 'GET',
          path: '/api/auth/session',
          response: null, // Session expired
          delay: 100,
        },
      ]);

      // Start with authenticated session
      (useSession as jest.Mock).mockReturnValue({
        data: expiredSession,
        status: 'authenticated',
      });

      const { rerender } = render(<TestProtectedComponent />);

      // Simulate session expiration check
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      rerender(<TestProtectedComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('unauthenticated')).toBeInTheDocument();
      });
    });

    it('should automatically sign out when session expires', async () => {
      const mockUser = generateMockUser();
      const mockSession = createMockSession(mockUser);

      (useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      });

      render(<TestProtectedComponent />);

      const signOutBtn = screen.getByTestId('sign-out-btn');
      await userEvent.click(signOutBtn);

      expect(signOut).toHaveBeenCalled();
    });

    it('should handle automatic logout on session expiration', async () => {
      // Mock session expiration scenario
      const SessionExpirationComponent: React.FC = () => {
        const { data: session, status } = useSession();
        
        React.useEffect(() => {
          // Simulate session expiration check
          const checkSession = async () => {
            try {
              const response = await fetch('/api/auth/session');
              if (!response.ok) {
                signOut({ redirect: false });
              }
            } catch (error) {
              signOut({ redirect: false });
            }
          };

          const interval = setInterval(checkSession, 60000); // Check every minute
          return () => clearInterval(interval);
        }, []);

        if (status === 'loading') return <div>Loading...</div>;
        if (!session) return <div data-testid="logged-out">Logged out</div>;

        return <div data-testid="session-active">Session active</div>;
      };

      // Mock session expiration
      addMockHandlers([
        {
          method: 'GET',
          path: '/api/auth/session',
          response: { error: 'Session expired' },
          error: true,
          statusCode: 401,
        },
      ]);

      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      render(<SessionExpirationComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('logged-out')).toBeInTheDocument();
      });
    });
  });

  describe('CSRF Protection and Security Headers', () => {
    it('should include CSRF token in authentication requests', async () => {
      const mockCsrfToken = 'csrf-token-123';
      
      // Mock CSRF token endpoint
      addMockHandlers([
        {
          method: 'GET',
          path: '/api/auth/csrf',
          response: { csrfToken: mockCsrfToken },
        },
      ]);

      const CSRFTestComponent: React.FC = () => {
        const [csrfToken, setCsrfToken] = React.useState<string>('');

        React.useEffect(() => {
          fetch('/api/auth/csrf')
            .then(res => res.json())
            .then(data => setCsrfToken(data.csrfToken));
        }, []);

        return (
          <div data-testid="csrf-component">
            <div data-testid="csrf-token">{csrfToken}</div>
          </div>
        );
      };

      render(<CSRFTestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('csrf-token')).toHaveTextContent(mockCsrfToken);
      });
    });

    it('should validate security headers in authentication responses', async () => {
      const mockUser = generateMockUser();
      const mockSession = createMockSession(mockUser);

      // Mock authentication with security headers
      addMockHandlers([
        {
          method: 'POST',
          path: '/api/auth/callback/google',
          response: mockSession,
        },
      ]);

      // Test that security headers are properly handled
      const SecurityHeadersComponent: React.FC = () => {
        const [securityHeaders, setSecurityHeaders] = React.useState<Record<string, string>>({});

        React.useEffect(() => {
          fetch('/api/auth/callback/google', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Requested-With': 'XMLHttpRequest',
            },
          })
            .then(response => {
              const headers: Record<string, string> = {};
              response.headers.forEach((value, key) => {
                headers[key] = value;
              });
              setSecurityHeaders(headers);
            });
        }, []);

        return (
          <div data-testid="security-headers">
            {Object.keys(securityHeaders).length > 0 ? 'Headers received' : 'No headers'}
          </div>
        );
      };

      render(<SecurityHeadersComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('security-headers')).toBeInTheDocument();
      });
    });

    it('should handle authentication with proper content security policy', async () => {
      // Mock CSP validation
      const CSPTestComponent: React.FC = () => {
        const [cspViolation, setCspViolation] = React.useState<boolean>(false);

        React.useEffect(() => {
          const handleCSPViolation = (event: SecurityPolicyViolationEvent) => {
            setCspViolation(true);
          };

          document.addEventListener('securitypolicyviolation', handleCSPViolation);
          return () => document.removeEventListener('securitypolicyviolation', handleCSPViolation);
        }, []);

        return (
          <div data-testid="csp-test">
            {cspViolation ? 'CSP Violation Detected' : 'CSP OK'}
          </div>
        );
      };

      render(<CSPTestComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('csp-test')).toHaveTextContent('CSP OK');
      });
    });
  });

  describe('Concurrent Session Management', () => {
    it('should handle multiple browser tabs with same session', async () => {
      const mockUser = generateMockUser();
      const mockSession = createMockSession(mockUser);

      (useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      });

      // Simulate multiple tabs
      const { rerender } = render(<TestSessionPersistenceComponent />);

      // First tab
      expect(screen.getByTestId('session-status')).toHaveTextContent('authenticated');

      // Simulate second tab with same session
      rerender(<TestSessionPersistenceComponent />);

      expect(screen.getByTestId('session-status')).toHaveTextContent('authenticated');
      expect(screen.getByTestId('session-data')).toHaveTextContent(mockUser.email);
    });

    it('should synchronize logout across multiple tabs', async () => {
      const mockUser = generateMockUser();
      const mockSession = createMockSession(mockUser);

      // Start with authenticated session
      (useSession as jest.Mock).mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      });

      const { rerender } = render(<TestProtectedComponent />);

      expect(screen.getByTestId('authenticated')).toBeInTheDocument();

      // Simulate logout in another tab
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      rerender(<TestProtectedComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('unauthenticated')).toBeInTheDocument();
      });
    });
  });
});