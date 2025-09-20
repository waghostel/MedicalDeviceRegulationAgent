/**
 * React 19 Compatible next-auth/react Mock
 * Fixes "s._removeUnmounted is not a function" error
 */

const React = require('react');

// Create a session context
const SessionContext = React.createContext({
  data: null,
  status: 'unauthenticated',
  update: async () => null,
});

// Mock SessionProvider that's compatible with React 19
const SessionProvider = ({ children, session = null }) => {
  const contextValue = React.useMemo(
    () => ({
      data: session,
      status: session ? 'authenticated' : 'unauthenticated',
      update: async () => session,
    }),
    [session]
  );

  return React.createElement(
    SessionContext.Provider,
    { value: contextValue },
    children
  );
};

// Mock useSession hook
const useSession = () => {
  const context = React.useContext(SessionContext);
  return (
    context || {
      data: null,
      status: 'unauthenticated',
      update: async () => null,
    }
  );
};

// Mock other next-auth/react functions
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
