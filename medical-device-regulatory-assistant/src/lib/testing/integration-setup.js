/**
 * Integration test setup
 * Configures MSW and database for integration tests
 */

import { setupMockAPI } from './msw-utils';
import { setupTestDatabase } from './database-utils';

// Setup MSW for integration tests
beforeAll(async () => {
  // Setup mock API server
  setupMockAPI();
  
  // Setup test database
  await setupTestDatabase({ inMemory: true, verbose: false });
});

// Reset between tests
beforeEach(async () => {
  // Reset MSW handlers
  const { resetMockAPI } = await import('./msw-utils');
  resetMockAPI();
  
  // Clean database
  const { cleanupTestDatabase } = await import('./database-utils');
  await cleanupTestDatabase();
});

// Cleanup after all tests
afterAll(async () => {
  // Teardown MSW
  const { teardownMockAPI } = await import('./msw-utils');
  teardownMockAPI();
  
  // Close database
  const { closeTestDatabase } = await import('./database-utils');
  await closeTestDatabase();
});