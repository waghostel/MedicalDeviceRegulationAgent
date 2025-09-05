/**
 * Testing utilities index
 * Exports all testing utilities for easy import
 */

// Test utilities
export * from './test-utils';
export { default as testUtils } from './test-utils';

// MSW utilities
export * from './msw-utils';
export { default as mswUtils } from './msw-utils';

// Database utilities
export * from './database-utils';
export { default as databaseUtils } from './database-utils';

// Mock data auditor
export * from './MockDataAuditor';

// Re-export commonly used testing libraries
export { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
export { axe, toHaveNoViolations } from 'jest-axe';

// Re-export mock data generators
export * from '@/lib/mock-data';

// Test configuration types
export interface TestConfig {
  enableMSW: boolean;
  enableDatabase: boolean;
  enableAccessibilityTests: boolean;
  enablePerformanceTests: boolean;
  mockDelay: number;
  databaseConfig: {
    inMemory: boolean;
    verbose: boolean;
  };
}

// Default test configuration
export const defaultTestConfig: TestConfig = {
  enableMSW: true,
  enableDatabase: false,
  enableAccessibilityTests: true,
  enablePerformanceTests: false,
  mockDelay: 100,
  databaseConfig: {
    inMemory: true,
    verbose: false,
  },
};

// Test setup helper
export const setupTestSuite = async (config: Partial<TestConfig> = {}) => {
  const finalConfig = { ...defaultTestConfig, ...config };
  
  if (finalConfig.enableMSW) {
    const { setupMockAPI } = await import('./msw-utils');
    setupMockAPI();
  }
  
  if (finalConfig.enableDatabase) {
    const { setupTestDatabase } = await import('./database-utils');
    await setupTestDatabase(finalConfig.databaseConfig);
  }
  
  return finalConfig;
};

// Test cleanup helper
export const cleanupTestSuite = async (config: TestConfig) => {
  if (config.enableMSW) {
    const { teardownMockAPI } = await import('./msw-utils');
    teardownMockAPI();
  }
  
  if (config.enableDatabase) {
    const { closeTestDatabase } = await import('./database-utils');
    await closeTestDatabase();
  }
};