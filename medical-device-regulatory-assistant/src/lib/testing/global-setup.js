/**
 * Global Jest setup
 * Runs once before all test suites
 */

module.exports = async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
  process.env.NEXTAUTH_SECRET = 'test-secret-key';
  
  // Disable console warnings in tests unless explicitly enabled
  if (!process.env.JEST_VERBOSE) {
    const originalWarn = console.warn;
    console.warn = (...args) => {
      // Only show warnings that are not from React or Next.js internals
      const message = args[0];
      if (
        typeof message === 'string' &&
        !message.includes('React') &&
        !message.includes('Next.js') &&
        !message.includes('Warning:')
      ) {
        originalWarn(...args);
      }
    };
  }
  
  // Note: jest.setTimeout is not available in global setup
  // Individual test timeouts are configured in jest.config.js
  
  console.log('🧪 Global test setup completed');
};