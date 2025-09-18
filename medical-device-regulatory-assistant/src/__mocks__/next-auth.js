/**
 * React 19 Compatible next-auth Mock
 * Fixes "s._removeUnmounted is not a function" error
 */

const React = require('react');

// Mock SessionProvider that's compatible with React 19
const SessionProvider = ({ children, session = null }) => {
  // Create a simple context provider without using deprecated React internals
  const SessionContext = React.createContext({
    data: session,
    status: session ? 'authenticated' : 'unauthenticated',
    update: async () => session,
  });

  return React.createElement(
    SessionContext.Provider,
    {
      value: {
        data: session,
        status: session ? 'authenticated' : 'unauthenticated',
        update: async () => session,
      }
    },
    children
  );
};

// Mock useSession hook
const useSession = () => ({
  data: null,
  status: 'unauthenticated',
  update: async () => null,
});

// Mock other next-auth functions
const getSession = jest.fn().mockResolvedValue(null);
const signIn = jest.fn().mockResolvedValue({ ok: true, error: null });
const signOut = jest.fn().mockResolvedValue({ url: '/' });
const getCsrfToken = jest.fn().mockResolvedValue('mock-csrf-token');
const getProviders = jest.fn().mockResolvedValue({});

module.exports = {
  SessionProvider,
  useSession,
  getSession,
  signIn,
  signOut,
  getCsrfToken,
  getProviders,
};