/**
 * Test suite for MockValidator
 * Validates mock validation system functionality
 */

import { MockValidator, ValidationResult, ValidationError } from '../MockValidator';
import { jest } from '@jest/globals';

describe('MockValidator', () => {
  let validator: MockValidator;

  beforeEach(() => {
    validator = new MockValidator();
    jest.clearAllMocks();
  });

  describe('validateHookMock', () => {
    it('should validate a correct useToast mock', () => {
      const mockUseToast = jest.fn(() => ({
        toast: jest.fn(),
        contextualToast: {
          success: jest.fn(),
          error: jest.fn(),
          warning: jest.fn(),
          info: jest.fn(),
        },
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        clearQueue: jest.fn(),
        getToastsByCategory: jest.fn(() => []),
        toasts: [],
        queue: [],
      }));

      const result = validator.validateHookMock('useToast', mockUseToast);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.score).toBeGreaterThan(80);
    });

    it('should detect missing methods in useToast mock', () => {
      const incompleteMock = jest.fn(() => ({
        toast: jest.fn(),
        // Missing other required methods
        toasts: [],
        queue: [],
      }));

      const result = validator.validateHookMock('useToast', incompleteMock);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      const missingMethods = result.errors.filter(e => e.type === 'MISSING_METHOD');
      expect(missingMethods.length).toBeGreaterThan(0);
      expect(missingMethods.some(e => e.path.includes('dismiss'))).toBe(true);
    });

    it('should detect type mismatches in hook mock', () => {
      const wrongTypeMock = jest.fn(() => ({
        toast: 'not-a-function', // Should be jest.fn()
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        clearQueue: jest.fn(),
        getToastsByCategory: jest.fn(() => []),
        contextualToast: {},
        toasts: [],
        queue: [],
      }));

      const result = validator.validateHookMock('useToast', wrongTypeMock);

      expect(result.isValid).toBe(false);
      const typeMismatches = result.errors.filter(e => e.type === 'TYPE_MISMATCH');
      expect(typeMismatches.length).toBeGreaterThan(0);
    });

    it('should handle non-function mock', () => {
      const nonFunctionMock = {
        toast: jest.fn(),
      };

      const result = validator.validateHookMock('useToast', nonFunctionMock);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'TYPE_MISMATCH')).toBe(true);
    });

    it('should handle unknown hook gracefully', () => {
      const unknownMock = jest.fn(() => ({}));

      const result = validator.validateHookMock('unknownHook', unknownMock);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'STRUCTURE_MISMATCH')).toBe(true);
    });

    it('should validate useEnhancedForm mock correctly', () => {
      const mockUseEnhancedForm = jest.fn(() => ({
        // Standard react-hook-form methods
        register: jest.fn(),
        handleSubmit: jest.fn(),
        watch: jest.fn(),
        getValues: jest.fn(),
        setValue: jest.fn(),
        getFieldState: jest.fn(),
        trigger: jest.fn(),
        reset: jest.fn(),
        control: {},
        formState: {},
        
        // Enhanced methods
        validateField: jest.fn(),
        getFieldValidation: jest.fn(),
        saveNow: jest.fn(),
        isSaving: false,
        lastSaved: undefined,
        submitWithFeedback: jest.fn(),
        focusFirstError: jest.fn(),
        announceFormState: jest.fn(),
      }));

      const result = validator.validateHookMock('useEnhancedForm', mockUseEnhancedForm);

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(70);
    });
  });

  describe('validateComponentMock', () => {
    it('should validate a correct component mock', () => {
      const mockEnhancedInput = jest.fn((props) => ({
        type: 'input',
        props: {
          'data-testid': 'enhanced-input',
          ...props,
        },
      }));

      const result = validator.validateComponentMock('EnhancedInput', mockEnhancedInput);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect non-function component mock', () => {
      const nonFunctionMock = {
        type: 'div',
      };

      const result = validator.validateComponentMock('EnhancedInput', nonFunctionMock);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'TYPE_MISMATCH')).toBe(true);
    });

    it('should warn about missing test ID', () => {
      const mockWithoutTestId = jest.fn((props) => ({
        type: 'input',
        props: props,
      }));

      const result = validator.validateComponentMock('EnhancedInput', mockWithoutTestId);

      // Should still be valid but have warnings
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.message.includes('data-testid'))).toBe(true);
    });

    it('should handle component that throws error', () => {
      const throwingMock = jest.fn(() => {
        throw new Error('Mock component error');
      });

      const result = validator.validateComponentMock('EnhancedInput', throwingMock);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'MOCK_FUNCTION_MISSING')).toBe(true);
    });

    it('should validate AutoSaveIndicator mock', () => {
      const mockAutoSaveIndicator = jest.fn((props) => ({
        type: 'div',
        props: {
          'data-testid': 'auto-save-indicator',
          'data-saving': props.isSaving,
          children: props.isSaving ? 'Saving...' : `Last saved: ${props.lastSaved}`,
        },
      }));

      const result = validator.validateComponentMock('AutoSaveIndicator', mockAutoSaveIndicator);

      expect(result.isValid).toBe(true);
    });
  });

  describe('generateMockReport', () => {
    it('should generate comprehensive report for registered mocks', () => {
      // Register some test mocks
      validator.registerMock('hook', 'useToast', jest.fn(() => ({
        toast: jest.fn(),
        dismiss: jest.fn(),
        toasts: [],
        queue: [],
      })));

      validator.registerMock('component', 'TestComponent', jest.fn(() => ({
        type: 'div',
        props: { 'data-testid': 'test-component' },
      })));

      const reports = validator.generateMockReport();

      expect(reports).toHaveLength(2);
      expect(reports[0].mockName).toBe('useToast');
      expect(reports[0].mockType).toBe('hook');
      expect(reports[1].mockName).toBe('TestComponent');
      expect(reports[1].mockType).toBe('component');

      // Each report should have all required fields
      reports.forEach(report => {
        expect(report).toHaveProperty('validationResult');
        expect(report).toHaveProperty('coverage');
        expect(report).toHaveProperty('recommendations');
        expect(report).toHaveProperty('healthScore');
        expect(report).toHaveProperty('lastValidated');
      });
    });

    it('should calculate coverage correctly', () => {
      const incompleteMock = jest.fn(() => ({
        toast: jest.fn(),
        // Missing several required methods
        toasts: [],
        queue: [],
      }));

      validator.registerMock('hook', 'useToast', incompleteMock);
      const reports = validator.generateMockReport();
      const report = reports.find(r => r.mockName === 'useToast');

      expect(report).toBeDefined();
      expect(report!.coverage.coveragePercentage).toBeLessThan(100);
      expect(report!.coverage.missingItems.length).toBeGreaterThan(0);
    });
  });

  describe('suggestFixes', () => {
    it('should generate appropriate fix suggestions', () => {
      const failures = [
        {
          mockName: 'useToast',
          errors: [
            {
              type: 'MISSING_METHOD' as const,
              severity: 'critical' as const,
              path: 'useToast.dismiss',
              expected: 'function',
              actual: 'undefined',
              message: 'Missing dismiss method',
            },
            {
              type: 'TYPE_MISMATCH' as const,
              severity: 'high' as const,
              path: 'useToast.toast',
              expected: 'function',
              actual: 'string',
              message: 'Wrong type for toast',
            },
          ],
          impact: 'breaking' as const,
        },
      ];

      const suggestions = validator.suggestFixes(failures);

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some(s => s.type === 'ADD_METHOD')).toBe(true);
      expect(suggestions.some(s => s.type === 'FIX_TYPE')).toBe(true);
      
      // Should be sorted by priority
      expect(suggestions[0].priority).toBe('critical');
    });

    it('should provide code examples in suggestions', () => {
      const failures = [
        {
          mockName: 'useToast',
          errors: [
            {
              type: 'MISSING_METHOD' as const,
              severity: 'critical' as const,
              path: 'useToast.dismiss',
              expected: 'function',
              actual: 'undefined',
              message: 'Missing dismiss method',
            },
          ],
          impact: 'breaking' as const,
        },
      ];

      const suggestions = validator.suggestFixes(failures);
      const methodSuggestion = suggestions.find(s => s.type === 'ADD_METHOD');

      expect(methodSuggestion).toBeDefined();
      expect(methodSuggestion!.codeExample).toBeDefined();
      expect(methodSuggestion!.codeExample).toContain('jest.fn()');
    });
  });

  describe('validation history', () => {
    it('should track validation history', () => {
      const mock = jest.fn(() => ({ toast: jest.fn() }));
      
      // Run validation multiple times
      validator.validateHookMock('useToast', mock);
      validator.validateHookMock('useToast', mock);
      
      const history = validator.getValidationHistory('useToast');
      expect(history).toHaveLength(2);
      expect(history[0]).toHaveProperty('timestamp');
      expect(history[1]).toHaveProperty('timestamp');
    });

    it('should limit history size', () => {
      const mock = jest.fn(() => ({ toast: jest.fn() }));
      
      // Run validation 15 times (more than the 10 limit)
      for (let i = 0; i < 15; i++) {
        validator.validateHookMock('useToast', mock);
      }
      
      const history = validator.getValidationHistory('useToast');
      expect(history).toHaveLength(10); // Should be limited to 10
    });

    it('should clear history when requested', () => {
      const mock = jest.fn(() => ({ toast: jest.fn() }));
      validator.validateHookMock('useToast', mock);
      
      expect(validator.getValidationHistory('useToast')).toHaveLength(1);
      
      validator.clearHistory();
      expect(validator.getValidationHistory('useToast')).toHaveLength(0);
    });
  });

  describe('mock registry', () => {
    it('should register and retrieve mocks', () => {
      const testMock = jest.fn();
      validator.registerMock('hook', 'testHook', testMock);
      
      const registered = validator.getRegisteredMocks();
      expect(registered.has('hook:testHook')).toBe(true);
      expect(registered.get('hook:testHook')).toBe(testMock);
    });

    it('should handle different mock types', () => {
      validator.registerMock('hook', 'testHook', jest.fn());
      validator.registerMock('component', 'TestComponent', jest.fn());
      validator.registerMock('provider', 'TestProvider', jest.fn());
      validator.registerMock('utility', 'testUtil', jest.fn());
      
      const registered = validator.getRegisteredMocks();
      expect(registered.size).toBe(4);
      expect(registered.has('hook:testHook')).toBe(true);
      expect(registered.has('component:TestComponent')).toBe(true);
      expect(registered.has('provider:TestProvider')).toBe(true);
      expect(registered.has('utility:testUtil')).toBe(true);
    });
  });

  describe('validation scoring', () => {
    it('should give high scores to complete mocks', () => {
      const completeMock = jest.fn(() => ({
        toast: jest.fn(),
        contextualToast: {
          success: jest.fn(),
          error: jest.fn(),
        },
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        clearQueue: jest.fn(),
        getToastsByCategory: jest.fn(() => []),
        toasts: [],
        queue: [],
      }));

      const result = validator.validateHookMock('useToast', completeMock);
      expect(result.score).toBeGreaterThan(90);
    });

    it('should give low scores to incomplete mocks', () => {
      const incompleteMock = jest.fn(() => ({
        // Only has toast method, missing everything else
        toast: jest.fn(),
      }));

      const result = validator.validateHookMock('useToast', incompleteMock);
      expect(result.score).toBeLessThan(50);
    });

    it('should penalize critical errors more than warnings', () => {
      const mockWithCriticalError = null; // This will cause critical errors
      const mockWithWarnings = jest.fn(() => ({
        toast: jest.fn(),
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        clearQueue: jest.fn(),
        getToastsByCategory: jest.fn(() => []),
        contextualToast: {}, // Missing methods but structure exists
        toasts: [],
        queue: [],
      }));

      const criticalResult = validator.validateHookMock('useToast', mockWithCriticalError);
      const warningResult = validator.validateHookMock('useToast', mockWithWarnings);

      expect(criticalResult.score).toBeLessThan(warningResult.score);
    });
  });
});