/**
 * Integration tests for MockValidator and MockDebugger
 * Tests how the two systems work together to provide comprehensive mock analysis
 */

import { MockValidator } from '../MockValidator';
import { MockDebugger } from '../MockDebugger';
import { jest } from '@jest/globals';

describe('MockValidator + MockDebugger Integration', () => {
  let validator: MockValidator;
  let mockDebugger: MockDebugger;

  beforeEach(() => {
    validator = new MockValidator();
    mockDebugger = new MockDebugger();
    jest.clearAllMocks();
  });

  describe('Complete mock analysis workflow', () => {
    it('should validate mock, detect issues, and provide debugging guidance', () => {
      // Step 1: Create a problematic mock
      const problematicMock = jest.fn(() => ({
        toast: 'not-a-function', // Wrong type
        // Missing required methods: dismiss, dismissAll, clearQueue, getToastsByCategory
        toasts: [],
        queue: 'not-an-array', // Wrong type
      }));

      // Step 2: Validate the mock
      const validationResult = validator.validateHookMock('useToast', problematicMock);

      // Step 3: Verify validation detected issues
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
      expect(validationResult.score).toBeLessThan(50);

      // Step 4: Simulate an error that would occur from this bad mock
      const runtimeError = new Error('toast is not a function');
      
      // Step 5: Use debugger to diagnose the error
      const diagnosis = MockDebugger.diagnoseHookFailure('useToast', runtimeError);

      // Step 6: Verify diagnosis provides actionable insights
      expect(diagnosis.diagnosis.category).toBe('STRUCTURE');
      expect(diagnosis.confidence).toBeGreaterThan(70);
      expect(diagnosis.recommendations.length).toBeGreaterThan(0);
      expect(diagnosis.codeExamples.length).toBeGreaterThan(0);

      // Step 7: Generate fix suggestions from validation failures
      const failures = [{
        mockName: 'useToast',
        errors: validationResult.errors,
        impact: 'breaking' as const,
      }];
      
      const fixSuggestions = validator.suggestFixes(failures);
      expect(fixSuggestions.length).toBeGreaterThan(0);
      expect(fixSuggestions.some(s => s.type === 'ADD_METHOD')).toBe(true);
      expect(fixSuggestions.some(s => s.type === 'FIX_TYPE')).toBe(true);

      // Step 8: Generate comprehensive diff
      const expectedMock = jest.fn(() => ({
        toast: jest.fn(),
        contextualToast: { success: jest.fn(), error: jest.fn() },
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        clearQueue: jest.fn(),
        getToastsByCategory: jest.fn(() => []),
        toasts: [],
        queue: [],
      }));

      const diff = MockDebugger.generateMockDiff(expectedMock(), problematicMock(), 'useToast');
      expect(diff.differences.length).toBeGreaterThan(0);
      expect(diff.summary.overallHealth).toBe('critical');
      expect(diff.generatedCode).toContain('jest.fn()');
    });

    it('should provide consistent recommendations across validation and debugging', () => {
      // Create mock with missing methods
      const incompleteMock = jest.fn(() => ({
        toast: jest.fn(),
        toasts: [],
        queue: [],
        // Missing: dismiss, dismissAll, clearQueue, getToastsByCategory, contextualToast
      }));

      // Validate the mock
      const validationResult = validator.validateHookMock('useToast', incompleteMock);
      const validationFailures = [{
        mockName: 'useToast',
        errors: validationResult.errors,
        impact: 'breaking' as const,
      }];
      const validationSuggestions = validator.suggestFixes(validationFailures);

      // Simulate runtime error and diagnose
      const error = new Error('Cannot read properties of undefined (reading \'dismiss\')');
      const diagnosis = MockDebugger.diagnoseHookFailure('useToast', error);

      // Both should identify missing methods as the core issue
      const validationMentionsMissingMethods = validationSuggestions.some(s => 
        s.description.includes('missing') || s.type === 'ADD_METHOD'
      );
      const diagnosisMentionsMissingMethods = diagnosis.recommendations.some(r => 
        r.description.includes('missing') || r.action.includes('Fix Mock Structure')
      );

      expect(validationMentionsMissingMethods).toBe(true);
      expect(diagnosisMentionsMissingMethods).toBe(true);

      // Both should provide code examples
      const validationHasCode = validationSuggestions.some(s => s.codeExample);
      const diagnosisHasCode = diagnosis.codeExamples.length > 0;

      expect(validationHasCode).toBe(true);
      expect(diagnosisHasCode).toBe(true);
    });
  });

  describe('Mock health monitoring workflow', () => {
    it('should track mock health over time and provide trend analysis', () => {
      // Simulate improving a mock over multiple iterations
      const iterations = [
        // Iteration 1: Broken mock
        jest.fn(() => ({})),
        
        // Iteration 2: Partially fixed
        jest.fn(() => ({
          toast: jest.fn(),
          toasts: [],
        })),
        
        // Iteration 3: More complete
        jest.fn(() => ({
          toast: jest.fn(),
          dismiss: jest.fn(),
          toasts: [],
          queue: [],
        })),
        
        // Iteration 4: Complete mock
        jest.fn(() => ({
          toast: jest.fn(),
          contextualToast: { success: jest.fn(), error: jest.fn() },
          dismiss: jest.fn(),
          dismissAll: jest.fn(),
          clearQueue: jest.fn(),
          getToastsByCategory: jest.fn(() => []),
          toasts: [],
          queue: [],
        })),
      ];

      const scores: number[] = [];
      const coveragePercentages: number[] = [];

      // Validate each iteration
      iterations.forEach((mock, index) => {
        const result = validator.validateHookMock('useToast', mock);
        scores.push(result.score);

        // Generate report to get coverage
        validator.registerMock('hook', 'useToast', mock);
        const reports = validator.generateMockReport();
        const report = reports.find(r => r.mockName === 'useToast');
        if (report) {
          coveragePercentages.push(report.coverage.coveragePercentage);
        }
      });

      // Verify improvement trend
      expect(scores[0]).toBeLessThan(scores[1]); // Iteration 1 < 2
      expect(scores[1]).toBeLessThan(scores[2]); // Iteration 2 < 3
      expect(scores[2]).toBeLessThan(scores[3]); // Iteration 3 < 4
      expect(scores[3]).toBeGreaterThan(90); // Final iteration should be excellent

      expect(coveragePercentages[0]).toBeLessThan(coveragePercentages[3]);
      expect(coveragePercentages[3]).toBeGreaterThan(90);
    });

    it('should identify regression in mock quality', () => {
      // Start with a good mock
      const goodMock = jest.fn(() => ({
        toast: jest.fn(),
        contextualToast: { success: jest.fn(), error: jest.fn() },
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        clearQueue: jest.fn(),
        getToastsByCategory: jest.fn(() => []),
        toasts: [],
        queue: [],
      }));

      const goodResult = validator.validateHookMock('useToast', goodMock);
      expect(goodResult.score).toBeGreaterThan(90);

      // Simulate regression - someone breaks the mock
      const regressedMock = jest.fn(() => ({
        toast: 'broken', // Changed from function to string
        dismiss: jest.fn(),
        toasts: [],
        queue: [],
        // Missing several methods
      }));

      const regressedResult = validator.validateHookMock('useToast', regressedMock);
      expect(regressedResult.score).toBeLessThan(goodResult.score);
      expect(regressedResult.isValid).toBe(false);

      // Debugger should identify the regression
      const error = new Error('toast is not a function');
      const diagnosis = MockDebugger.diagnoseHookFailure('useToast', error);
      
      expect(diagnosis.diagnosis.severity).toBe('critical');
      expect(diagnosis.recommendations.some(r => r.priority === 'immediate')).toBe(true);
    });
  });

  describe('Cross-system data consistency', () => {
    it('should maintain consistent mock structure analysis', () => {
      const testMock = jest.fn(() => ({
        toast: jest.fn(),
        dismiss: jest.fn(),
        toasts: [],
        // Missing some methods for testing
      }));

      // Analyze with validator
      const validationResult = validator.validateHookMock('useToast', testMock);
      const missingFromValidation = validationResult.errors
        .filter(e => e.type === 'MISSING_METHOD')
        .map(e => e.path.split('.').pop());

      // Analyze with debugger diff
      const expectedComplete = jest.fn(() => ({
        toast: jest.fn(),
        contextualToast: { success: jest.fn() },
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        clearQueue: jest.fn(),
        getToastsByCategory: jest.fn(() => []),
        toasts: [],
        queue: [],
      }));

      const diff = MockDebugger.generateMockDiff(expectedComplete(), testMock(), 'useToast');
      const missingFromDiff = diff.differences
        .filter(d => d.type === 'MISSING' && d.path.startsWith('methods.'))
        .map(d => d.path.split('.').pop());

      // Both should identify the same missing methods
      const commonMissing = missingFromValidation.filter(method => 
        missingFromDiff.includes(method)
      );
      
      expect(commonMissing.length).toBeGreaterThan(0);
    });

    it('should provide complementary insights', () => {
      const problematicMock = jest.fn(() => ({
        toast: jest.fn(),
        dismiss: 'wrong-type', // Type error
        toasts: [],
        // Missing methods
      }));

      // Validator focuses on completeness and correctness
      const validationResult = validator.validateHookMock('useToast', problematicMock);
      const hasTypeError = validationResult.errors.some(e => e.type === 'TYPE_MISMATCH');
      const hasMissingMethod = validationResult.errors.some(e => e.type === 'MISSING_METHOD');

      expect(hasTypeError).toBe(true);
      expect(hasMissingMethod).toBe(true);

      // Debugger focuses on runtime error diagnosis
      const error = new Error('dismiss is not a function');
      const diagnosis = MockDebugger.diagnoseHookFailure('useToast', error);
      
      expect(diagnosis.diagnosis.category).toBe('TYPE');
      expect(diagnosis.recommendations.some(r => r.action.includes('Type'))).toBe(true);

      // Both should provide actionable solutions
      const validationSuggestions = validator.suggestFixes([{
        mockName: 'useToast',
        errors: validationResult.errors,
        impact: 'breaking',
      }]);

      expect(validationSuggestions.length).toBeGreaterThan(0);
      expect(diagnosis.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and efficiency', () => {
    it('should handle large numbers of validations efficiently', () => {
      const testMock = jest.fn(() => ({
        toast: jest.fn(),
        dismiss: jest.fn(),
        toasts: [],
        queue: [],
      }));

      const startTime = Date.now();
      
      // Run many validations
      for (let i = 0; i < 100; i++) {
        validator.validateHookMock('useToast', testMock);
      }
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should complete 100 validations in reasonable time (< 1 second)
      expect(totalTime).toBeLessThan(1000);
      
      // History should be properly managed (limited to 10 entries)
      const history = validator.getValidationHistory('useToast');
      expect(history.length).toBe(10);
    });

    it('should handle complex mock structures without performance degradation', () => {
      // Create a complex mock with nested structures
      const complexMock = jest.fn(() => ({
        toast: jest.fn(),
        contextualToast: {
          success: jest.fn(),
          error: jest.fn(),
          warning: jest.fn(),
          info: jest.fn(),
          progress: jest.fn(),
          fdaApiError: jest.fn(),
          predicateSearchFailed: jest.fn(),
          classificationError: jest.fn(),
          projectSaveFailed: jest.fn(),
          exportFailed: jest.fn(),
          validationError: jest.fn(),
          authExpired: jest.fn(),
          networkError: jest.fn(),
        },
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        clearQueue: jest.fn(),
        getToastsByCategory: jest.fn(() => []),
        getToastsByPriority: jest.fn(() => []),
        toasts: [],
        queue: [],
        rateLimitCount: 0,
        lastResetTime: Date.now(),
      }));

      const startTime = Date.now();
      const result = validator.validateHookMock('useToast', complexMock);
      const endTime = Date.now();

      // Should complete validation quickly even for complex structures
      expect(endTime - startTime).toBeLessThan(100);
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(90);
    });
  });

  describe('Error recovery and resilience', () => {
    it('should handle mocks that throw errors gracefully', () => {
      const throwingMock = jest.fn(() => {
        throw new Error('Mock implementation error');
      });

      // Validator should handle the error gracefully
      const validationResult = validator.validateHookMock('useToast', throwingMock);
      expect(validationResult.isValid).toBe(false);
      expect(validationResult.errors.some(e => e.type === 'MOCK_FUNCTION_MISSING')).toBe(true);

      // Debugger should also handle it gracefully
      const runtimeError = new Error('useToast implementation failed');
      const diagnosis = MockDebugger.diagnoseHookFailure('useToast', runtimeError);
      
      expect(diagnosis.confidence).toBeGreaterThan(0);
      expect(diagnosis.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide helpful guidance for null/undefined mocks', () => {
      // Test null mock
      const nullResult = validator.validateHookMock('useToast', null);
      expect(nullResult.isValid).toBe(false);
      expect(nullResult.errors.some(e => e.severity === 'critical')).toBe(true);

      // Test undefined mock
      const undefinedResult = validator.validateHookMock('useToast', undefined);
      expect(undefinedResult.isValid).toBe(false);
      expect(undefinedResult.errors.some(e => e.severity === 'critical')).toBe(true);

      // Debugger should provide helpful diagnosis
      const error = new Error('Cannot read properties of null');
      const diagnosis = MockDebugger.diagnoseHookFailure('useToast', error);
      
      expect(diagnosis.diagnosis.category).toBe('STRUCTURE');
      expect(diagnosis.recommendations.some(r => 
        r.description.includes('mock') || r.description.includes('structure')
      )).toBe(true);
    });
  });
});