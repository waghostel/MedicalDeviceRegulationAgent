/**
 * React 19 Compatible next-auth Mock
 * Fixes "s._removeUnmounted is not a function" error by avoiding deprecated React internals
 */

import React from 'react';

// Create a stable context to avoid React 19 internal API issues
const SessionContext = React.createContext({
  data: null,
  status: 'unauthenticated',
  update: async () => null,
});

// Mock SessionProvider that's fully compatible with React 19
const SessionProvider = ({ children, session = null }) => {
  // Use React 19 compatible state management
  const [currentSession, setCurrentSession] = React.useState(session);

  // Create stable session value to prevent unnecessary re-renders
  const sessionValue = React.useMemo(
    () => ({
      data: currentSession,
      status: currentSession ? 'authenticated' : 'unauthenticated',
      update: async (newSession) => {
        setCurrentSession(newSession);
        return newSession;
      },
    }),
    [currentSession]
  );

  // Use React 19 compatible provider pattern
  return React.createElement(
    SessionContext.Provider,
    { value: sessionValue },
    children
  );
};

// Mock useSession hook with React 19 compatibility
const useSession = jest.fn(() => {
  const context = React.useContext(SessionContext);
  return (
    context || {
      data: null,
      status: 'unauthenticated',
      update: async () => null,
    }
  );
});

// Mock other next-auth functions with improved React 19 compatibility
const getSession = jest.fn().mockResolvedValue(null);
const signIn = jest.fn().mockResolvedValue({ ok: true, error: null });
const signOut = jest.fn().mockResolvedValue({ url: '/' });
const getCsrfToken = jest.fn().mockResolvedValue('mock-csrf-token');
const getProviders = jest.fn().mockResolvedValue({
  google: {
    id: 'google',
    name: 'Google',
    type: 'oauth',
    signinUrl: '/api/auth/signin/google',
    callbackUrl: '/api/auth/callback/google',
  },
});

// Export both CommonJS and ES modules for compatibility
export {
  SessionProvider,
  useSession,
  getSession,
  signIn,
  signOut,
  getCsrfToken,
  getProviders,
};

// CommonJS fallback for older test environments
module.exports = {
  SessionProvider,
  useSession,
  getSession,
  signIn,
  signOut,
  getCsrfToken,
  getProviders,
};
