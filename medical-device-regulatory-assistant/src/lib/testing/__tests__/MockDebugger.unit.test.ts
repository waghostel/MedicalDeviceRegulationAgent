/**
 * Test suite for MockDebugger
 * Validates mock debugging and analysis functionality
 */

import { jest } from '@jest/globals';

import { MockDebugger, DiagnosisReport, MockDiff } from '../MockDebugger';

describe('MockDebugger', () => {
  let mockDebugger: MockDebugger;

  beforeEach(() => {
    mockDebugger = new MockDebugger();
    jest.clearAllMocks();
  });

  describe('diagnoseHookFailure', () => {
    it('should diagnose useToast function error correctly', () => {
      const error = new Error('useToast is not a function');
      const report = MockDebugger.diagnoseHookFailure('useToast', error);

      expect(report.mockName).toBe('useToast');
      expect(report.error).toBe(error);
      expect(report.diagnosis.category).toBe('STRUCTURE');
      expect(report.diagnosis.severity).toBe('critical');
      expect(report.confidence).toBeGreaterThan(80); // High confidence for known pattern
      expect(report.diagnosis.quickFix).toBeDefined();
    });

    it('should diagnose property access errors', () => {
      const error = new Error(
        "Cannot read properties of undefined (reading 'toast')"
      );
      const report = MockDebugger.diagnoseHookFailure('useToast', error);

      expect(report.diagnosis.category).toBe('STRUCTURE');
      expect(report.diagnosis.severity).toBe('high');
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should diagnose type errors', () => {
      const error = new Error('TypeError: dismiss is not a function');
      const report = MockDebugger.diagnoseHookFailure('useToast', error);

      expect(report.diagnosis.category).toBe('TYPE');
      expect(report.diagnosis.severity).toBe('high');
      expect(
        report.recommendations.some((r) => r.action.includes('Type'))
      ).toBe(true);
    });

    it('should diagnose AggregateError issues', () => {
      const error = new Error('AggregateError: Multiple errors occurred');
      const report = MockDebugger.diagnoseHookFailure('useEnhancedForm', error);

      expect(report.diagnosis.category).toBe('CONFIGURATION');
      expect(report.diagnosis.severity).toBe('critical');
      expect(report.diagnosis.description).toContain('React 19');
    });

    it('should handle unknown error patterns', () => {
      const error = new Error('Some unknown error message');
      const report = MockDebugger.diagnoseHookFailure('unknownHook', error);

      expect(report.diagnosis.category).toBe('STRUCTURE');
      expect(report.confidence).toBeLessThan(50); // Low confidence for unknown patterns
      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should extract affected features from error stack', () => {
      const error = new Error('Test error');
      error.stack = `Error: Test error
    at ProjectFormComponent (/path/to/ProjectForm.tsx:45:12)
    at EnhancedFormComponent (/path/to/EnhancedForm.tsx:23:8)
    at TestPage (/path/to/TestPage.tsx:10:5)`;

      const report = MockDebugger.diagnoseHookFailure('useToast', error);

      expect(report.diagnosis.affectedFeatures).toContain('useToast');
      expect(report.diagnosis.affectedFeatures.length).toBeGreaterThan(1);
    });

    it('should generate appropriate recommendations', () => {
      const error = new Error('useToast is not a function');
      const report = MockDebugger.diagnoseHookFailure('useToast', error);

      expect(report.recommendations.length).toBeGreaterThan(0);

      // Should have immediate fix
      const immediateFix = report.recommendations.find(
        (r) => r.priority === 'immediate'
      );
      expect(immediateFix).toBeDefined();

      // Should have validation recommendation
      const validationRec = report.recommendations.find((r) =>
        r.description.includes('MockValidator')
      );
      expect(validationRec).toBeDefined();
    });

    it('should generate code examples for known hooks', () => {
      const error = new Error('useToast is not a function');
      const report = MockDebugger.diagnoseHookFailure('useToast', error);

      expect(report.codeExamples.length).toBeGreaterThan(0);

      const toastExample = report.codeExamples.find((e) =>
        e.title.includes('useToast')
      );
      expect(toastExample).toBeDefined();
      expect(toastExample!.after).toContain('jest.fn()');
      expect(toastExample!.language).toBe('typescript');
    });

    it('should generate enhanced form code examples', () => {
      const error = new Error('useEnhancedForm is not a function');
      const report = MockDebugger.diagnoseHookFailure('useEnhancedForm', error);

      const formExample = report.codeExamples.find((e) =>
        e.title.includes('Enhanced Form')
      );
      expect(formExample).toBeDefined();
      expect(formExample!.after).toContain('validateField');
      expect(formExample!.after).toContain('saveNow');
    });
  });

  describe('generateMockDiff', () => {
    it('should generate diff for missing methods', () => {
      const expected = {
        toast: jest.fn(),
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
      };

      const actual = {
        toast: jest.fn(),
        // Missing dismiss and dismissAll
      };

      const diff = MockDebugger.generateMockDiff(expected, actual, 'useToast');

      expect(diff.mockName).toBe('useToast');
      expect(diff.differences.length).toBeGreaterThan(0);

      const missingMethods = diff.differences.filter(
        (d) => d.type === 'MISSING'
      );
      expect(missingMethods.length).toBe(2); // dismiss and dismissAll
      expect(missingMethods.some((d) => d.path.includes('dismiss'))).toBe(true);
    });

    it('should generate diff for type mismatches', () => {
      const expected = {
        toast: jest.fn(),
        count: 0,
      };

      const actual = {
        toast: 'not-a-function',
        count: 'not-a-number',
      };

      const diff = MockDebugger.generateMockDiff(expected, actual, 'testMock');

      const typeMismatches = diff.differences.filter(
        (d) => d.type === 'TYPE_MISMATCH'
      );
      expect(typeMismatches.length).toBeGreaterThan(0);
    });

    it('should detect extra properties', () => {
      const expected = {
        toast: jest.fn(),
      };

      const actual = {
        toast: jest.fn(),
        extraMethod: jest.fn(),
        extraProperty: 'value',
      };

      const diff = MockDebugger.generateMockDiff(expected, actual, 'testMock');

      const extraItems = diff.differences.filter((d) => d.type === 'EXTRA');
      expect(extraItems.length).toBe(2); // extraMethod and extraProperty
    });

    it('should calculate compatibility score correctly', () => {
      const perfect = { toast: jest.fn() };
      const perfectDiff = MockDebugger.generateMockDiff(
        perfect,
        perfect,
        'perfect'
      );
      expect(perfectDiff.summary.compatibilityScore).toBe(100);
      expect(perfectDiff.summary.overallHealth).toBe('excellent');

      const broken = {};
      const brokenDiff = MockDebugger.generateMockDiff(
        perfect,
        broken,
        'broken'
      );
      expect(brokenDiff.summary.compatibilityScore).toBeLessThan(50);
      expect(brokenDiff.summary.overallHealth).toBe('critical');
    });

    it('should generate fix suggestions', () => {
      const expected = {
        toast: jest.fn(),
        dismiss: jest.fn(),
      };

      const actual = {
        toast: 'wrong-type',
        // Missing dismiss
      };

      const diff = MockDebugger.generateMockDiff(expected, actual, 'useToast');

      expect(diff.fixSuggestions.length).toBeGreaterThan(0);
      expect(diff.fixSuggestions.some((s) => s.includes('missing'))).toBe(true);
      expect(diff.fixSuggestions.some((s) => s.includes('type'))).toBe(true);
    });

    it('should generate fix code', () => {
      const expected = {
        toast: jest.fn(),
        dismiss: jest.fn(),
        count: 0,
      };

      const actual = {};

      const diff = MockDebugger.generateMockDiff(expected, actual, 'useToast');

      expect(diff.generatedCode).toBeDefined();
      expect(diff.generatedCode).toContain('mockuseToast');
      expect(diff.generatedCode).toContain('jest.fn()');
      expect(diff.generatedCode).toContain('toast:');
      expect(diff.generatedCode).toContain('dismiss:');
    });

    it('should handle function mocks correctly', () => {
      const expectedHook = jest.fn(() => ({
        toast: jest.fn(),
        dismiss: jest.fn(),
      }));

      const actualHook = jest.fn(() => ({
        toast: jest.fn(),
        // Missing dismiss
      }));

      // Call the functions to get their return values for comparison
      const diff = MockDebugger.generateMockDiff(
        expectedHook(),
        actualHook(),
        'useToast'
      );

      expect(diff.differences.length).toBeGreaterThan(0);
      const missingMethods = diff.differences.filter(
        (d) => d.type === 'MISSING'
      );
      expect(missingMethods.some((d) => d.path.includes('dismiss'))).toBe(true);
    });
  });

  describe('diagnosis history', () => {
    it('should track diagnosis history', () => {
      const error1 = new Error('First error');
      const error2 = new Error('Second error');

      const report1 = MockDebugger.diagnoseHookFailure('useToast', error1);
      const report2 = MockDebugger.diagnoseHookFailure('useToast', error2);

      mockDebugger.addDiagnosis(report1);
      mockDebugger.addDiagnosis(report2);

      const history = mockDebugger.getDiagnosisHistory('useToast');
      expect(history).toHaveLength(2);
      expect(history[0].error.message).toBe('First error');
      expect(history[1].error.message).toBe('Second error');
    });

    it('should limit history size', () => {
      // Add more than the 20 limit
      for (let i = 0; i < 25; i++) {
        const error = new Error(`Error ${i}`);
        const report = MockDebugger.diagnoseHookFailure('useToast', error);
        mockDebugger.addDiagnosis(report);
      }

      const history = mockDebugger.getDiagnosisHistory('useToast');
      expect(history).toHaveLength(20); // Should be limited to 20

      // Should keep the most recent ones
      expect(history[19].error.message).toBe('Error 24');
    });

    it('should clear history when requested', () => {
      const error = new Error('Test error');
      const report = MockDebugger.diagnoseHookFailure('useToast', error);
      mockDebugger.addDiagnosis(report);

      expect(mockDebugger.getDiagnosisHistory('useToast')).toHaveLength(1);

      mockDebugger.clearHistory();
      expect(mockDebugger.getDiagnosisHistory('useToast')).toHaveLength(0);
    });
  });

  describe('performance metrics', () => {
    it('should record and retrieve performance metrics', () => {
      mockDebugger.recordPerformance('useToast', 100);
      mockDebugger.recordPerformance('useToast', 150);
      mockDebugger.recordPerformance('useToast', 120);

      const metrics = mockDebugger.getPerformanceMetrics('useToast');
      expect(metrics).toEqual([100, 150, 120]);
    });

    it('should limit metrics history', () => {
      // Add more than the 100 limit
      for (let i = 0; i < 105; i++) {
        mockDebugger.recordPerformance('useToast', i);
      }

      const metrics = mockDebugger.getPerformanceMetrics('useToast');
      expect(metrics).toHaveLength(100); // Should be limited to 100

      // Should keep the most recent ones
      expect(metrics[99]).toBe(104);
    });

    it('should handle multiple mock names separately', () => {
      mockDebugger.recordPerformance('useToast', 100);
      mockDebugger.recordPerformance('useEnhancedForm', 200);

      expect(mockDebugger.getPerformanceMetrics('useToast')).toEqual([100]);
      expect(mockDebugger.getPerformanceMetrics('useEnhancedForm')).toEqual([
        200,
      ]);
      expect(mockDebugger.getPerformanceMetrics('unknownMock')).toEqual([]);
    });
  });

  describe('generateDebugReport', () => {
    it('should generate comprehensive debug report with error', () => {
      const error = new Error('useToast is not a function');
      const report = mockDebugger.generateDebugReport('useToast', error);

      expect(report).toContain('# Mock Debug Report: useToast');
      expect(report).toContain('## Error Analysis');
      expect(report).toContain('**Category:** STRUCTURE');
      expect(report).toContain('**Severity:** critical');
      expect(report).toContain('## Quick Fix');
      expect(report).toContain('## Recommendations');
    });

    it('should generate report without error', () => {
      const report = mockDebugger.generateDebugReport('useToast');

      expect(report).toContain('# Mock Debug Report: useToast');
      expect(report).toContain('Generated:');
      // Should not contain error analysis sections
      expect(report).not.toContain('## Error Analysis');
    });

    it('should include history in report', () => {
      // Add some history
      const error = new Error('Test error');
      const diagnosis = MockDebugger.diagnoseHookFailure('useToast', error);
      mockDebugger.addDiagnosis(diagnosis);

      const report = mockDebugger.generateDebugReport('useToast');

      expect(report).toContain('## Recent Issues');
    });

    it('should include performance metrics in report', () => {
      mockDebugger.recordPerformance('useToast', 100);
      mockDebugger.recordPerformance('useToast', 150);

      const report = mockDebugger.generateDebugReport('useToast');

      expect(report).toContain('## Performance Metrics');
      expect(report).toContain('Average diagnosis time:');
      expect(report).toContain('Total diagnoses: 2');
    });

    it('should handle empty history and metrics gracefully', () => {
      const report = mockDebugger.generateDebugReport('newMock');

      expect(report).toContain('# Mock Debug Report: newMock');
      expect(report).not.toContain('## Recent Issues');
      expect(report).not.toContain('## Performance Metrics');
    });
  });

  describe('error pattern matching', () => {
    it('should match useToast function error pattern', () => {
      const error = new Error('useToast is not a function');
      const report = MockDebugger.diagnoseHookFailure('useToast', error);

      expect(report.confidence).toBeGreaterThan(80);
      expect(report.diagnosis.quickFix).toContain('jest.fn');
    });

    it('should match property access error pattern', () => {
      const error = new Error(
        "Cannot read properties of undefined (reading 'dismiss')"
      );
      const report = MockDebugger.diagnoseHookFailure('useToast', error);

      expect(report.diagnosis.category).toBe('STRUCTURE');
      expect(report.diagnosis.rootCause).toContain(
        'missing expected properties'
      );
    });

    it('should match React createElement error pattern', () => {
      const error = new Error('Warning: React.createElement: type is invalid');
      const report = MockDebugger.diagnoseHookFailure('TestComponent', error);

      expect(report.diagnosis.category).toBe('STRUCTURE');
      expect(report.diagnosis.severity).toBe('medium');
    });

    it('should provide generic diagnosis for unmatched patterns', () => {
      const error = new Error('Completely unknown error pattern xyz123');
      const report = MockDebugger.diagnoseHookFailure('unknownMock', error);

      expect(report.confidence).toBeLessThan(50);
      expect(report.diagnosis.category).toBe('STRUCTURE');
      expect(report.diagnosis.rootCause).toContain(
        'Unknown mock configuration'
      );
    });
  });

  describe('related issues detection', () => {
    it('should detect function-related issues', () => {
      const error = new Error('dismiss is not a function');
      const report = MockDebugger.diagnoseHookFailure('useToast', error);

      const functionIssue = report.relatedIssues.find((i) =>
        i.description.includes('not a function')
      );
      expect(functionIssue).toBeDefined();
      expect(functionIssue!.suggestion).toContain('jest.fn()');
    });

    it('should detect property access issues', () => {
      const error = new Error('Cannot read properties of undefined');
      const report = MockDebugger.diagnoseHookFailure('useToast', error);

      const propertyIssue = report.relatedIssues.find((i) =>
        i.description.includes('Property access')
      );
      expect(propertyIssue).toBeDefined();
    });

    it('should detect form-related configuration issues', () => {
      const error = new Error('Some form error');
      const report = MockDebugger.diagnoseHookFailure('useEnhancedForm', error);

      const formIssue = report.relatedIssues.find((i) =>
        i.description.includes('react-hook-form')
      );
      expect(formIssue).toBeDefined();
    });
  });
});
