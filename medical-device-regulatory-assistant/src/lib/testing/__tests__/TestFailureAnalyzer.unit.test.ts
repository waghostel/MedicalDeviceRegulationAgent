/**
 * Unit tests for TestFailureAnalyzer
 *
 * Tests comprehensive test failure analysis capabilities including
 * error categorization, debugging suggestions, and troubleshooting guides.
 */

import {
  TestFailureAnalyzer,
  testFailureAnalyzer,
} from '../TestFailureAnalyzer';

describe('TestFailureAnalyzer', () => {
  beforeEach(() => {
    // Clear any existing failure history
    testFailureAnalyzer['failureHistory'] = [];
  });

  describe('analyzeFailure', () => {
    it('should analyze React 19 AggregateError correctly', () => {
      const aggregateError = new AggregateError(
        [
          new Error('Component render failed'),
          new Error('Hook execution failed'),
        ],
        'Multiple errors occurred'
      );

      const report = testFailureAnalyzer.analyzeFailure(
        'ProjectForm test',
        aggregateError
      );

      expect(report.testName).toBe('ProjectForm test');
      expect(report.failureType).toBe('AGGREGATE_ERROR');
      expect(report.analysis.category).toBe('REACT_19_COMPATIBILITY');
      expect(report.analysis.severity).toBe('critical');
      expect(report.analysis.isRecoverable).toBe(true);
      expect(report.confidence).toBeGreaterThan(0.8);
      expect(report.suggestions).toContain(
        'Wrap component in React19ErrorBoundary'
      );
    });

    it('should analyze hook mock configuration errors', () => {
      const hookError = new Error('useToast is not a function');

      const report = testFailureAnalyzer.analyzeFailure(
        'useToast hook test',
        hookError
      );

      expect(report.failureType).toBe('MOCK_ERROR');
      expect(report.analysis.category).toBe('HOOK_MOCK_CONFIGURATION');
      expect(report.analysis.severity).toBe('high');
      expect(report.analysis.mockIssues).toHaveLength(1);
      expect(report.analysis.mockIssues[0].mockName).toBe('useToast');
      expect(report.suggestions).toContain(
        'Verify hook mock structure matches actual implementation'
      );
    });

    it('should analyze component rendering errors', () => {
      const renderError = new Error(
        'Cannot render component: missing required props'
      );

      const report = testFailureAnalyzer.analyzeFailure(
        'Component render test',
        renderError
      );

      expect(report.failureType).toBe('RENDER_ERROR');
      expect(report.analysis.category).toBe('COMPONENT_RENDERING');
      expect(report.analysis.renderingIssues).toHaveLength(1);
      expect(report.suggestions).toContain(
        'Provide all required props to component'
      );
    });

    it('should analyze timeout errors', () => {
      const timeoutError = new Error('Test timed out after 5000ms');

      const report = testFailureAnalyzer.analyzeFailure(
        'Async test',
        timeoutError
      );

      expect(report.failureType).toBe('TIMEOUT_ERROR');
      expect(report.analysis.category).toBe('PERFORMANCE_ISSUE');
      expect(report.analysis.severity).toBe('medium');
    });

    it('should analyze assertion errors', () => {
      const assertionError = new Error('Expected "Hello" but received "Hi"');

      const report = testFailureAnalyzer.analyzeFailure(
        'Assertion test',
        assertionError
      );

      expect(report.failureType).toBe('ASSERTION_ERROR');
      expect(report.analysis.category).toBe('ASSERTION_MISMATCH');
      expect(report.analysis.severity).toBe('low');
    });

    it('should generate debugging steps for different failure types', () => {
      const mockError = new Error('useEnhancedForm is not defined');

      const report = testFailureAnalyzer.analyzeFailure(
        'Enhanced form test',
        mockError
      );

      expect(report.debuggingSteps).toHaveLength(3);
      expect(report.debuggingSteps[0].description).toContain(
        'Examine the error message'
      );
      expect(report.debuggingSteps[1].description).toContain(
        'Validate hook mock structure'
      );
      expect(report.debuggingSteps[2].description).toContain(
        'Run test in isolation'
      );
    });

    it('should identify related files based on failure category', () => {
      const hookError = new Error('useToast mock configuration error');

      const report = testFailureAnalyzer.analyzeFailure('Hook test', hookError);

      expect(report.relatedFiles).toContain(
        'src/lib/testing/enhanced-form-hook-mocks.ts'
      );
      expect(report.relatedFiles).toContain(
        'src/lib/testing/use-toast-mock.ts'
      );
      expect(report.relatedFiles).toContain('jest.setup.js');
    });

    it('should calculate confidence scores appropriately', () => {
      const knownError = new Error('useToast is not a function');
      const unknownError = new Error('Mysterious error occurred');

      const knownReport = testFailureAnalyzer.analyzeFailure(
        'Known error test',
        knownError
      );
      const unknownReport = testFailureAnalyzer.analyzeFailure(
        'Unknown error test',
        unknownError
      );

      expect(knownReport.confidence).toBeGreaterThan(unknownReport.confidence);
      expect(knownReport.confidence).toBeGreaterThan(0.7);
      expect(unknownReport.confidence).toBeLessThan(0.7);
    });
  });

  describe('generateTroubleshootingGuide', () => {
    it('should generate comprehensive troubleshooting guide', () => {
      const error = new Error('useToast is not a function');
      const report = testFailureAnalyzer.analyzeFailure('Test case', error);

      const guide = testFailureAnalyzer.generateTroubleshootingGuide(report);

      expect(guide).toContain('# Test Failure Troubleshooting Guide');
      expect(guide).toContain('## Test: Test case');
      expect(guide).toContain('**Failure Type**: MOCK_ERROR');
      expect(guide).toContain('**Root Cause**:');
      expect(guide).toContain('## Debugging Steps');
      expect(guide).toContain('## Suggested Fixes');
      expect(guide).toContain('## Related Files to Check');
    });

    it('should include mock issues section when present', () => {
      const mockError = new Error('useToast is not a function');
      const report = testFailureAnalyzer.analyzeFailure('Mock test', mockError);

      const guide = testFailureAnalyzer.generateTroubleshootingGuide(report);

      expect(guide).toContain('## Mock Issues Detected');
      expect(guide).toContain('### useToast');
      expect(guide).toContain('**Expected Structure**:');
      expect(guide).toContain('**Actual Structure**:');
    });

    it('should include rendering issues section when present', () => {
      const renderError = new Error('Cannot render component: missing props');
      const report = testFailureAnalyzer.analyzeFailure(
        'Render test',
        renderError
      );

      const guide = testFailureAnalyzer.generateTroubleshootingGuide(report);

      expect(guide).toContain('## Rendering Issues Detected');
    });
  });

  describe('getFailureStatistics', () => {
    it('should return empty statistics when no failures recorded', () => {
      const stats = testFailureAnalyzer.getFailureStatistics();

      expect(stats.totalFailures).toBe(0);
      expect(stats.averageConfidence).toBeNaN();
      expect(stats.categoryBreakdown).toEqual({});
      expect(stats.typeBreakdown).toEqual({});
    });

    it('should calculate statistics correctly with multiple failures', () => {
      // Add some test failures
      testFailureAnalyzer.analyzeFailure('Test 1', new Error('useToast error'));
      testFailureAnalyzer.analyzeFailure(
        'Test 2',
        new AggregateError([], 'Aggregate error')
      );
      testFailureAnalyzer.analyzeFailure('Test 3', new Error('Render error'));

      const stats = testFailureAnalyzer.getFailureStatistics();

      expect(stats.totalFailures).toBe(3);
      expect(stats.categoryBreakdown).toHaveProperty('HOOK_MOCK_CONFIGURATION');
      expect(stats.categoryBreakdown).toHaveProperty('REACT_19_COMPATIBILITY');
      expect(stats.typeBreakdown).toHaveProperty('MOCK_ERROR');
      expect(stats.typeBreakdown).toHaveProperty('AGGREGATE_ERROR');
      expect(stats.averageConfidence).toBeGreaterThan(0);
    });

    it('should limit recent failures to last 10', () => {
      // Add more than 10 failures
      for (let i = 0; i < 15; i++) {
        testFailureAnalyzer.analyzeFailure(
          `Test ${i}`,
          new Error(`Error ${i}`)
        );
      }

      const stats = testFailureAnalyzer.getFailureStatistics();

      expect(stats.totalFailures).toBe(15);
      expect(stats.recentFailures).toHaveLength(10);
    });
  });

  describe('error pattern recognition', () => {
    it('should recognize common error patterns', () => {
      const patterns = [
        {
          error: 'useToast is not a function',
          expectedCategory: 'HOOK_MOCK_CONFIGURATION',
        },
        {
          error: 'Cannot read property of undefined',
          expectedCategory: 'COMPONENT_RENDERING',
        },
        {
          error: 'AggregateError: Multiple errors',
          expectedCategory: 'REACT_19_COMPATIBILITY',
        },
        {
          error: 'Provider not found in context',
          expectedCategory: 'PROVIDER_SETUP',
        },
        {
          error: 'Test timeout exceeded',
          expectedCategory: 'PERFORMANCE_ISSUE',
        },
      ];

      patterns.forEach(({ error, expectedCategory }) => {
        const report = testFailureAnalyzer.analyzeFailure(
          'Pattern test',
          new Error(error)
        );
        expect(report.analysis.category).toBe(expectedCategory);
      });
    });
  });

  describe('failure history management', () => {
    it('should maintain failure history with size limit', () => {
      // Add failures up to the limit (50)
      for (let i = 0; i < 55; i++) {
        testFailureAnalyzer.analyzeFailure(
          `Test ${i}`,
          new Error(`Error ${i}`)
        );
      }

      const history = testFailureAnalyzer['failureHistory'];
      expect(history).toHaveLength(50);

      // Should contain the most recent failures
      expect(history[history.length - 1].testName).toBe('Test 54');
      expect(history[0].testName).toBe('Test 5'); // First 5 should be removed
    });
  });

  describe('performance metrics', () => {
    it('should complete analysis within reasonable time', () => {
      const startTime = performance.now();

      testFailureAnalyzer.analyzeFailure(
        'Performance test',
        new Error('Test error')
      );

      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(100); // Should complete in less than 100ms
    });

    it('should handle large error messages efficiently', () => {
      const largeError = new Error('A'.repeat(10000)); // 10KB error message

      const startTime = performance.now();
      const report = testFailureAnalyzer.analyzeFailure(
        'Large error test',
        largeError
      );
      const duration = performance.now() - startTime;

      expect(report).toBeDefined();
      expect(duration).toBeLessThan(200); // Should still complete quickly
    });
  });

  describe('edge cases', () => {
    it('should handle errors without stack traces', () => {
      const errorWithoutStack = new Error('Error without stack');
      errorWithoutStack.stack = undefined;

      const report = testFailureAnalyzer.analyzeFailure(
        'No stack test',
        errorWithoutStack
      );

      expect(report.stackTrace).toBe('');
      expect(report.analysis).toBeDefined();
      expect(report.suggestions).toHaveLength(0); // Should still provide basic analysis
    });

    it('should handle empty error messages', () => {
      const emptyError = new Error('');

      const report = testFailureAnalyzer.analyzeFailure(
        'Empty error test',
        emptyError
      );

      expect(report.errorMessage).toBe('');
      expect(report.failureType).toBe('UNKNOWN_ERROR');
      expect(report.analysis.category).toBe('TEST_ENVIRONMENT');
    });

    it('should handle context with component stack', () => {
      const error = new Error('Context test error');
      const context = {
        componentStack: 'at ProjectForm\n  at EnhancedForm\n  at TestWrapper',
      };

      const report = testFailureAnalyzer.analyzeFailure(
        'Context test',
        error,
        context
      );

      expect(report.componentStack).toBe(context.componentStack);
      expect(report.analysis.affectedComponents).toContain('ProjectForm');
      expect(report.analysis.affectedComponents).toContain('EnhancedForm');
    });
  });
});
