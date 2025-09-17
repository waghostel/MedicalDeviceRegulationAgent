/**
 * Context Mock Validator Tests
 * Tests for the context mock validation system
 * Task: B3.3 Add context mock validation
 */

import React from 'react';
import { render } from '@testing-library/react';
import {
  ContextMockValidator,
  createContextMockValidator,
  validateContextMock,
  debugContextMock,
  contextMockValidator,
  ToastContextValue,
  FormContextValue,
  ThemeContextValue,
  SessionContextValue,
} from '../ContextMockValidator';

// Mock React context for testing
const TestContext = React.createContext<any>(null);

describe('ContextMockValidator', () => {
  let validator: ContextMockValidator;

  beforeEach(() => {
    validator = createContextMockValidator({
      strictMode: false,
      validateTypes: true,
      checkOptionalMethods: true,
      debugMode: true,
    });
  });

  afterEach(() => {
    validator.clearCache();
    jest.clearAllMocks();
  });

  describe('Basic Validation', () => {
    it('should validate a simple context mock successfully', () => {
      const mockValue = {
        test: jest.fn(),
        value: 'test-value',
      };

      const result = validator.validateContext('TestContext', TestContext, mockValue);

      expect(result.isValid).toBe(true);
      expect(result.contextName).toBe('TestContext');
      expect(result.errors).toHaveLength(0);
      expect(result.validationTime).toBeGreaterThan(0);
    });

    it('should detect missing context value', () => {
      const result = validator.validateContext('TestContext', TestContext, null);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('missing_context');
      expect(result.errors[0].severity).toBe('critical');
    });

    it('should detect invalid context value type', () => {
      const result = validator.validateContext('TestContext', TestContext, 'invalid-string');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('type_mismatch');
      expect(result.errors[0].expected).toBe('object');
      expect(result.errors[0].actual).toBe('string');
    });
  });

  describe('Toast Context Validation', () => {
    it('should validate complete toast context mock', () => {
      const mockToastContext: ToastContextValue = {
        toast: jest.fn(),
        getToastsByCategory: jest.fn(() => []),
        contextualToast: {
          success: jest.fn(),
          validationError: jest.fn(),
          authExpired: jest.fn(),
          networkError: jest.fn(),
          projectSaveFailed: jest.fn(),
        },
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        clearQueue: jest.fn(),
        toasts: [],
        queue: [],
      };

      const result = validator.validateToastContext(mockToastContext);

      expect(result.isValid).toBe(true);
      expect(result.contextName).toBe('ToastContext');
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required toast methods', () => {
      const incompleteToastContext = {
        toast: jest.fn(),
        // Missing dismiss, dismissAll, etc.
      } as any;

      const result = validator.validateToastContext(incompleteToastContext);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'missing_method')).toBe(true);
      expect(result.suggestions).toContain('Add missing methods to ToastContext mock implementation');
    });

    it('should detect non-function toast methods', () => {
      const invalidToastContext = {
        toast: 'not-a-function', // Should be a function
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
      } as any;

      const result = validator.validateToastContext(invalidToastContext);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'type_mismatch' && e.path === 'toast')).toBe(true);
    });
  });

  describe('Form Context Validation', () => {
    it('should validate complete form context mock', () => {
      const mockFormContext: FormContextValue = {
        formState: {
          isSubmitting: false,
          isValid: true,
          isDirty: false,
          errors: {},
        },
        register: jest.fn(() => ({ name: 'test', onChange: jest.fn(), onBlur: jest.fn() })),
        handleSubmit: jest.fn((fn) => fn),
        setValue: jest.fn(),
        getValues: jest.fn(() => ({})),
        reset: jest.fn(),
        trigger: jest.fn(() => Promise.resolve(true)),
      };

      const result = validator.validateFormContext(mockFormContext);

      expect(result.isValid).toBe(true);
      expect(result.contextName).toBe('FormContext');
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required form methods', () => {
      const incompleteFormContext = {
        formState: { isSubmitting: false, isValid: true, isDirty: false, errors: {} },
        register: jest.fn(),
        // Missing handleSubmit, setValue, getValues
      } as any;

      const result = validator.validateFormContext(incompleteFormContext);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'missing_method' && e.path === 'handleSubmit')).toBe(true);
      expect(result.errors.some(e => e.type === 'missing_method' && e.path === 'setValue')).toBe(true);
      expect(result.errors.some(e => e.type === 'missing_method' && e.path === 'getValues')).toBe(true);
    });
  });

  describe('Theme Context Validation', () => {
    it('should validate complete theme context mock', () => {
      const mockThemeContext: ThemeContextValue = {
        theme: 'light',
        setTheme: jest.fn(),
        resolvedTheme: 'light',
        systemTheme: 'light',
      };

      const result = validator.validateThemeContext(mockThemeContext);

      expect(result.isValid).toBe(true);
      expect(result.contextName).toBe('ThemeContext');
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing setTheme method', () => {
      const incompleteThemeContext = {
        theme: 'light',
        resolvedTheme: 'light',
        systemTheme: 'light',
        // Missing setTheme
      } as any;

      const result = validator.validateThemeContext(incompleteThemeContext);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'missing_method' && e.path === 'setTheme')).toBe(true);
    });
  });

  describe('Session Context Validation', () => {
    it('should validate complete session context mock', () => {
      const mockSessionContext: SessionContextValue = {
        data: {
          user: {
            id: 'test-user-id',
            name: 'Test User',
            email: 'test@example.com',
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        status: 'authenticated',
        update: jest.fn(() => Promise.resolve({})),
      };

      const result = validator.validateSessionContext(mockSessionContext);

      expect(result.isValid).toBe(true);
      expect(result.contextName).toBe('SessionContext');
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing update method', () => {
      const incompleteSessionContext = {
        data: { user: { id: 'test' }, expires: '2024-01-01' },
        status: 'authenticated',
        // Missing update method
      } as any;

      const result = validator.validateSessionContext(incompleteSessionContext);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.type === 'missing_method' && e.path === 'update')).toBe(true);
    });
  });

  describe('Debug Information Generation', () => {
    it('should generate comprehensive debug information', () => {
      const mockValue = {
        method1: jest.fn(),
        method2: 'not-a-function',
        property1: 'value',
        property2: null,
      };

      const TestProvider: React.FC<{ children: React.ReactNode; value?: any }> = ({ children, value }) =>
        React.createElement(TestContext.Provider, { value }, children);

      const debugInfo = validator.generateDebugInfo('TestContext', mockValue, TestProvider);

      expect(debugInfo.contextName).toBe('TestContext');
      expect(debugInfo.providerFound).toBe(true);
      expect(debugInfo.valueStructure).toHaveProperty('method1');
      expect(debugInfo.valueStructure.method1.isFunction).toBe(true);
      expect(debugInfo.valueStructure.method1.isMocked).toBe(true);
      expect(debugInfo.valueStructure.method2.isFunction).toBe(false);
      expect(debugInfo.renderTest.success).toBe(true);
    });

    it('should handle render test failures', () => {
      const mockValue = { test: 'value' };
      
      // Provider that throws an error
      const FailingProvider: React.FC<{ children: React.ReactNode; value?: any }> = () => {
        throw new Error('Provider render failed');
      };

      const debugInfo = validator.generateDebugInfo('TestContext', mockValue, FailingProvider);

      expect(debugInfo.renderTest.success).toBe(false);
      expect(debugInfo.renderTest.error).toContain('Provider render failed');
    });
  });

  describe('Validation All Contexts', () => {
    it('should validate all standard contexts', () => {
      const results = validator.validateAllContexts();

      expect(results).toHaveProperty('ToastContext');
      expect(results).toHaveProperty('FormContext');
      expect(results).toHaveProperty('ThemeContext');
      expect(results).toHaveProperty('SessionContext');

      // All should be valid with default mock implementations
      Object.values(results).forEach(result => {
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('Caching and Performance', () => {
    it('should cache validation results', () => {
      const mockValue = { test: jest.fn() };

      // First validation
      const result1 = validator.validateContext('TestContext', TestContext, mockValue);
      
      // Second validation should use cache
      const result2 = validator.validateContext('TestContext', TestContext, mockValue);

      expect(result1).toEqual(result2);
      
      const stats = validator.getValidationStats();
      expect(stats.totalValidations).toBeGreaterThan(0);
      expect(stats.cacheHits).toBeGreaterThan(0);
    });

    it('should clear cache when requested', () => {
      const mockValue = { test: jest.fn() };
      
      validator.validateContext('TestContext', TestContext, mockValue);
      expect(validator.getValidationStats().totalValidations).toBeGreaterThan(0);
      
      validator.clearCache();
      expect(validator.getValidationStats().totalValidations).toBe(0);
    });
  });

  describe('Utility Functions', () => {
    it('should create validator with default config', () => {
      const defaultValidator = createContextMockValidator();
      expect(defaultValidator).toBeInstanceOf(ContextMockValidator);
    });

    it('should validate context mock with utility function', () => {
      const mockValue = { test: jest.fn() };
      const result = validateContextMock('TestContext', mockValue);
      
      expect(result.isValid).toBe(true);
      expect(result.contextName).toBe('TestContext');
    });

    it('should debug context mock with utility function', () => {
      const mockValue = { test: jest.fn() };
      const debugInfo = debugContextMock('TestContext', mockValue);
      
      expect(debugInfo.contextName).toBe('TestContext');
      expect(debugInfo.valueStructure).toHaveProperty('test');
    });
  });

  describe('Default Export', () => {
    it('should provide default context mock validator instance', () => {
      expect(contextMockValidator).toBeInstanceOf(ContextMockValidator);
      
      const mockValue = { test: jest.fn() };
      const result = contextMockValidator.validateContext('TestContext', TestContext, mockValue);
      
      expect(result.isValid).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle validation errors gracefully', () => {
      // Test with circular reference that might cause JSON.stringify to fail
      const circularValue: any = { test: jest.fn() };
      circularValue.circular = circularValue;

      const result = validator.validateContext('TestContext', TestContext, circularValue);
      
      // Should still validate successfully despite circular reference
      expect(result.isValid).toBe(true);
      expect(result.contextName).toBe('TestContext');
    });

    it('should handle provider validation errors', () => {
      const mockValue = { test: jest.fn() };
      
      // Invalid provider (not a function)
      const invalidProvider = 'not-a-provider' as any;
      
      const result = validator.validateContext('TestContext', TestContext, mockValue, invalidProvider);
      
      expect(result.errors.some(e => e.type === 'provider_not_found')).toBe(true);
    });
  });
});