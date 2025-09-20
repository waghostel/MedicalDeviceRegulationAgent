/**
 * Mock Validation System - Complete Export
 *
 * Provides comprehensive mock validation and debugging capabilities
 * Implements requirements 2.4 and 5.4 from the design document
 */

// Core classes
export { MockValidator, mockValidator } from './MockValidator';
export { MockDebugger, mockDebugger } from './MockDebugger';

// Type definitions
export type {
  ValidationResult,
  ValidationError,
  ValidationWarning,
  MockReport,
  MockCoverage,
  FixSuggestion,
  ValidationFailure,
} from './MockValidator';

export type {
  DiagnosisReport,
  MockDiagnosis,
  DiagnosisRecommendation,
  CodeExample,
  RelatedIssue,
  MockDiff,
  MockStructure,
  PropertyInfo,
  MethodInfo,
  ParameterInfo,
  StructureMetadata,
  MockDifference,
  DiffSummary,
} from './MockDebugger';

// Utility functions for common use cases
export const mockValidationUtils = {
  /**
   * Quick validation of a hook mock
   */
  validateHook: (hookName: string, mock: any) => mockValidator.validateHookMock(hookName, mock),

  /**
   * Quick validation of a component mock
   */
  validateComponent: (componentName: string, mock: any) => mockValidator.validateComponentMock(componentName, mock),

  /**
   * Quick diagnosis of a mock-related error
   */
  diagnoseError: (mockName: string, error: Error) => MockDebugger.diagnoseHookFailure(mockName, error),

  /**
   * Generate diff between expected and actual mocks
   */
  generateDiff: (expected: any, actual: any, mockName?: string) => MockDebugger.generateMockDiff(expected, actual, mockName),

  /**
   * Get comprehensive health report for all registered mocks
   */
  getHealthReport: () => mockValidator.generateMockReport(),

  /**
   * Register a mock for validation tracking
   */
  registerMock: (
    type: 'hook' | 'component' | 'provider' | 'utility',
    name: string,
    mock: any
  ) => {
    mockValidator.registerMock(type, name, mock);
  },

  /**
   * Clear all validation history and metrics
   */
  clearHistory: () => {
    mockValidator.clearHistory();
    mockDebugger.clearHistory();
  },

  /**
   * Generate debug report for a specific mock
   */
  generateDebugReport: (mockName: string, error?: Error) => mockDebugger.generateDebugReport(mockName, error),
};

// Integration helpers for test setup
export const setupMockValidation = () => {
  // Register global error handler for automatic diagnosis
  const originalConsoleError = console.error;

  console.error = (...args) => {
    const message = args[0];

    // Check if this looks like a mock-related error
    if (
      typeof message === 'string' &&
      (message.includes('is not a function') ||
        message.includes('Cannot read properties') ||
        message.includes('TypeError') ||
        message.includes('ReferenceError'))
    ) {
      // Try to extract mock name from error
      const mockNameMatch = message.match(/(use\w+|Mock\w+|\w+Mock)/i);
      if (mockNameMatch) {
        const mockName = mockNameMatch[1];
        const error = new Error(message);

        // Generate diagnosis
        const diagnosis = MockDebugger.diagnoseHookFailure(mockName, error);

        // Add to debugger history
        mockDebugger.addDiagnosis(diagnosis);

        // Log helpful information in development
        if (
          process.env.NODE_ENV === 'development' ||
          process.env.JEST_VERBOSE
        ) {
          console.warn(`\n🔍 Mock Diagnosis for ${mockName}:`);
          console.warn(`   Category: ${diagnosis.diagnosis.category}`);
          console.warn(`   Severity: ${diagnosis.diagnosis.severity}`);
          console.warn(`   Root Cause: ${diagnosis.diagnosis.rootCause}`);
          if (diagnosis.diagnosis.quickFix) {
            console.warn(`   Quick Fix: ${diagnosis.diagnosis.quickFix}`);
          }
          console.warn(`   Confidence: ${diagnosis.confidence}%\n`);
        }
      }
    }

    // Call original console.error
    originalConsoleError.apply(console, args);
  };

  // Return cleanup function
  return () => {
    console.error = originalConsoleError;
  };
};

// Test utilities for Jest integration
export const jestMockValidation = {
  /**
   * Jest matcher to validate mock structure
   */
  toBeValidMock: (
    received: any,
    mockName: string,
    mockType: 'hook' | 'component' = 'hook'
  ) => {
    const result =
      mockType === 'hook'
        ? mockValidator.validateHookMock(mockName, received)
        : mockValidator.validateComponentMock(mockName, received);

    const pass = result.isValid;

    if (pass) {
      return {
        message: () =>
          `Expected ${mockName} mock to be invalid, but it passed validation with score ${result.score}`,
        pass: true,
      };
    } 
      const errorMessages = result.errors
        .map((e) => `  - ${e.message}`)
        .join('\n');
      return {
        message: () =>
          `Expected ${mockName} mock to be valid, but validation failed:\n${errorMessages}`,
        pass: false,
      };
    
  },

  /**
   * Jest matcher to check mock completeness
   */
  toHaveCompleteCoverage: (
    received: any,
    mockName: string,
    threshold: number = 90
  ) => {
    mockValidator.registerMock('hook', mockName, received);
    const reports = mockValidator.generateMockReport();
    const report = reports.find((r) => r.mockName === mockName);

    if (!report) {
      return {
        message: () => `Could not find mock report for ${mockName}`,
        pass: false,
      };
    }

    const pass = report.coverage.coveragePercentage >= threshold;

    if (pass) {
      return {
        message: () =>
          `Expected ${mockName} mock coverage to be below ${threshold}%, but it was ${report.coverage.coveragePercentage}%`,
        pass: true,
      };
    } 
      return {
        message: () =>
          `Expected ${mockName} mock coverage to be at least ${threshold}%, but it was ${report.coverage.coveragePercentage}%. Missing: ${report.coverage.missingItems.join(', ')}`,
        pass: false,
      };
    
  },
};

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidMock(mockName: string, mockType?: 'hook' | 'component'): R;
      toHaveCompleteCoverage(mockName: string, threshold?: number): R;
    }
  }
}

// Auto-setup for Jest environment
if (typeof expect !== 'undefined' && expect.extend) {
  expect.extend(jestMockValidation);
}

export default {
  MockValidator,
  MockDebugger,
  mockValidator,
  mockDebugger,
  mockValidationUtils,
  setupMockValidation,
  jestMockValidation,
};
