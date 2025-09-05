/**
 * Basic test setup verification
 * Tests that the testing infrastructure is working correctly
 */

describe('Testing Infrastructure Setup', () => {
  it('should have Jest configured correctly', () => {
    expect(true).toBe(true);
  });

  it('should have access to testing utilities', () => {
    // Test that we can import the utilities without errors
    const testUtils = require('../test-utils');
    expect(testUtils).toBeDefined();
  });

  it('should have MSW utilities available', () => {
    const mswUtils = require('../msw-utils');
    expect(mswUtils).toBeDefined();
    expect(mswUtils.setupMockAPI).toBeDefined();
    expect(mswUtils.teardownMockAPI).toBeDefined();
  });

  it('should have database utilities available', () => {
    const databaseUtils = require('../database-utils');
    expect(databaseUtils).toBeDefined();
    expect(databaseUtils.setupTestDatabase).toBeDefined();
    expect(databaseUtils.cleanupTestDatabase).toBeDefined();
  });
});