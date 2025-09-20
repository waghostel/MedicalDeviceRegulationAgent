/**
 * Context Mock Validation System
 * Implements context provider validation, context value verification, and debugging tools
 * Requirements: 2.4, 5.4
 * Task: B3.3 Add context mock validation
 */

import { render } from '@testing-library/react';
import React, { Context, ReactNode, ComponentType } from 'react';

// ============================================================================
// Context Validation Types
// ============================================================================

export interface ContextValidationResult {
  isValid: boolean;
  contextName: string;
  errors: ContextValidationError[];
  warnings: ContextValidationWarning[];
  suggestions: string[];
  validationTime: number;
}

export interface ContextValidationError {
  type:
    | 'missing_context'
    | 'invalid_value'
    | 'type_mismatch'
    | 'missing_method'
    | 'provider_not_found';
  message: string;
  expected?: any;
  actual?: any;
  path?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface ContextValidationWarning {
  type:
    | 'deprecated_method'
    | 'performance_concern'
    | 'missing_optional'
    | 'version_mismatch';
  message: string;
  suggestion?: string;
  impact: 'low' | 'medium' | 'high';
}

export interface ContextMockDebugInfo {
  contextName: string;
  providerFound: boolean;
  valueStructure: Record<string, any>;
  missingMethods: string[];
  extraMethods: string[];
  typeValidation: Record<string, boolean>;
  renderTest: {
    success: boolean;
    error?: string;
  };
}

export interface ContextValidationConfig {
  strictMode: boolean;
  validateTypes: boolean;
  checkOptionalMethods: boolean;
  performanceChecks: boolean;
  debugMode: boolean;
}

// ============================================================================
// Context Value Interfaces
// ============================================================================

export interface ToastContextValue {
  toast: jest.MockedFunction<(options: any) => void>;
  getToastsByCategory: jest.MockedFunction<(category: string) => any[]>;
  contextualToast: {
    success: jest.MockedFunction<(message: string) => void>;
    validationError: jest.MockedFunction<(message: string) => void>;
    authExpired: jest.MockedFunction<() => void>;
    networkError: jest.MockedFunction<(message: string) => void>;
    projectSaveFailed: jest.MockedFunction<(message: string) => void>;
  };
  dismiss: jest.MockedFunction<(id: string) => void>;
  dismissAll: jest.MockedFunction<() => void>;
  clearQueue: jest.MockedFunction<() => void>;
  toasts: any[];
  queue: any[];
}

export interface FormContextValue {
  formState: {
    isSubmitting: boolean;
    isValid: boolean;
    isDirty: boolean;
    errors: Record<string, any>;
  };
  register: jest.MockedFunction<(name: string, options?: any) => any>;
  handleSubmit: jest.MockedFunction<(onSubmit: any) => any>;
  setValue: jest.MockedFunction<(name: string, value: any) => void>;
  getValues: jest.MockedFunction<() => Record<string, any>>;
  reset: jest.MockedFunction<(values?: any) => void>;
  trigger: jest.MockedFunction<(name?: string) => Promise<boolean>>;
}

export interface ThemeContextValue {
  theme: 'light' | 'dark' | 'system';
  setTheme: jest.MockedFunction<(theme: 'light' | 'dark' | 'system') => void>;
  resolvedTheme: 'light' | 'dark';
  systemTheme: 'light' | 'dark';
}

export interface SessionContextValue {
  data: {
    user?: {
      id: string;
      name?: string;
      email?: string;
      image?: string;
    };
    expires: string;
  } | null;
  status: 'loading' | 'authenticated' | 'unauthenticated';
  update: jest.MockedFunction<(data?: any) => Promise<any>>;
}

// ============================================================================
// Context Mock Validator Class
// ============================================================================

export class ContextMockValidator {
  private config: ContextValidationConfig;

  private validationCache: Map<string, ContextValidationResult>;

  constructor(config: Partial<ContextValidationConfig> = {}) {
    this.config = {
      strictMode: false,
      validateTypes: true,
      checkOptionalMethods: true,
      performanceChecks: false,
      debugMode: false,
      ...config,
    };
    this.validationCache = new Map();
  }

  /**
   * Validate a context provider and its value structure
   */
  validateContext<T = any>(
    contextName: string,
    ContextComponent: Context<T>,
    expectedValue: T,
    Provider?: ComponentType<{ children: ReactNode; value?: T }>
  ): ContextValidationResult {
    const startTime = performance.now();
    const cacheKey = `${contextName}-${JSON.stringify(expectedValue)}`;

    // Check cache first
    if (this.validationCache.has(cacheKey) && !this.config.debugMode) {
      return this.validationCache.get(cacheKey)!;
    }

    const errors: ContextValidationError[] = [];
    const warnings: ContextValidationWarning[] = [];
    const suggestions: string[] = [];

    try {
      // 1. Validate provider exists
      if (Provider && !this.validateProviderExists(Provider)) {
        errors.push({
          type: 'provider_not_found',
          message: `Provider component for ${contextName} not found or not properly mocked`,
          severity: 'critical',
        });
      }

      // 2. Validate context value structure
      const valueValidation = this.validateContextValue(
        contextName,
        expectedValue
      );
      errors.push(...valueValidation.errors);
      warnings.push(...valueValidation.warnings);

      // 3. Validate context methods
      const methodValidation = this.validateContextMethods(
        contextName,
        expectedValue
      );
      errors.push(...methodValidation.errors);
      warnings.push(...methodValidation.warnings);

      // 4. Perform render test
      if (Provider) {
        const renderValidation = this.validateContextRender(
          contextName,
          Provider,
          expectedValue
        );
        errors.push(...renderValidation.errors);
        warnings.push(...renderValidation.warnings);
      }

      // 5. Generate suggestions
      suggestions.push(
        ...this.generateValidationSuggestions(contextName, errors, warnings)
      );
    } catch (error) {
      errors.push({
        type: 'invalid_value',
        message: `Validation failed for ${contextName}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'critical',
      });
    }

    const result: ContextValidationResult = {
      isValid:
        errors.filter((e) => e.severity === 'critical' || e.severity === 'high')
          .length === 0,
      contextName,
      errors,
      warnings,
      suggestions,
      validationTime: performance.now() - startTime,
    };

    // Cache result
    this.validationCache.set(cacheKey, result);

    return result;
  }

  /**
   * Validate Toast context specifically
   */
  validateToastContext(mockValue: ToastContextValue): ContextValidationResult {
    return this.validateContext(
      'ToastContext',
      {} as Context<ToastContextValue>,
      mockValue
    );
  }

  /**
   * Validate Form context specifically
   */
  validateFormContext(mockValue: FormContextValue): ContextValidationResult {
    return this.validateContext(
      'FormContext',
      {} as Context<FormContextValue>,
      mockValue
    );
  }

  /**
   * Validate Theme context specifically
   */
  validateThemeContext(mockValue: ThemeContextValue): ContextValidationResult {
    return this.validateContext(
      'ThemeContext',
      {} as Context<ThemeContextValue>,
      mockValue
    );
  }

  /**
   * Validate Session context specifically
   */
  validateSessionContext(
    mockValue: SessionContextValue
  ): ContextValidationResult {
    return this.validateContext(
      'SessionContext',
      {} as Context<SessionContextValue>,
      mockValue
    );
  }

  /**
   * Generate debug information for a context
   */
  generateDebugInfo<T>(
    contextName: string,
    contextValue: T,
    Provider?: ComponentType<{ children: ReactNode; value?: T }>
  ): ContextMockDebugInfo {
    const debugInfo: ContextMockDebugInfo = {
      contextName,
      providerFound: Provider ? this.validateProviderExists(Provider) : false,
      valueStructure: this.analyzeValueStructure(contextValue),
      missingMethods: [],
      extraMethods: [],
      typeValidation: {},
      renderTest: { success: false },
    };

    // Analyze methods
    const methodAnalysis = this.analyzeContextMethods(
      contextName,
      contextValue
    );
    debugInfo.missingMethods = methodAnalysis.missing;
    debugInfo.extraMethods = methodAnalysis.extra;

    // Type validation
    debugInfo.typeValidation = this.performTypeValidation(contextValue);

    // Render test
    if (Provider) {
      try {
        const TestComponent = () =>
          React.createElement('div', { 'data-testid': 'test' }, 'Test');
        const WrappedComponent = () =>
          React.createElement(
            Provider,
            { value: contextValue },
            React.createElement(TestComponent)
          );

        const result = render(React.createElement(WrappedComponent));
        debugInfo.renderTest.success = !!result.getByTestId('test');
      } catch (error) {
        debugInfo.renderTest.success = false;
        debugInfo.renderTest.error =
          error instanceof Error ? error.message : 'Unknown render error';
      }
    }

    return debugInfo;
  }

  /**
   * Validate all registered context mocks
   */
  validateAllContexts(): Record<string, ContextValidationResult> {
    const results: Record<string, ContextValidationResult> = {};

    // Define standard context validations
    const contextValidations = [
      {
        name: 'ToastContext',
        validator: () =>
          this.validateToastContext(this.createMockToastContext()),
      },
      {
        name: 'FormContext',
        validator: () => this.validateFormContext(this.createMockFormContext()),
      },
      {
        name: 'ThemeContext',
        validator: () =>
          this.validateThemeContext(this.createMockThemeContext()),
      },
      {
        name: 'SessionContext',
        validator: () =>
          this.validateSessionContext(this.createMockSessionContext()),
      },
    ];

    contextValidations.forEach(({ name, validator }) => {
      try {
        results[name] = validator();
      } catch (error) {
        results[name] = {
          isValid: false,
          contextName: name,
          errors: [
            {
              type: 'invalid_value',
              message: `Failed to validate ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              severity: 'critical',
            },
          ],
          warnings: [],
          suggestions: [`Check ${name} mock implementation`],
          validationTime: 0,
        };
      }
    });

    return results;
  }

  /**
   * Clear validation cache
   */
  clearCache(): void {
    this.validationCache.clear();
  }

  /**
   * Get validation statistics
   */
  getValidationStats(): {
    totalValidations: number;
    cacheHits: number;
    averageValidationTime: number;
  } {
    const results = Array.from(this.validationCache.values());
    return {
      totalValidations: results.length,
      cacheHits: this.validationCache.size,
      averageValidationTime:
        results.reduce((sum, r) => sum + r.validationTime, 0) /
          results.length || 0,
    };
  }

  // ============================================================================
  // Private Validation Methods
  // ============================================================================

  private validateProviderExists(Provider: ComponentType<any>): boolean {
    return typeof Provider === 'function' && Provider.name !== '';
  }

  private validateContextValue(
    contextName: string,
    value: any
  ): {
    errors: ContextValidationError[];
    warnings: ContextValidationWarning[];
  } {
    const errors: ContextValidationError[] = [];
    const warnings: ContextValidationWarning[] = [];

    if (value === null || value === undefined) {
      errors.push({
        type: 'missing_context',
        message: `${contextName} value is null or undefined`,
        severity: 'critical',
      });
      return { errors, warnings };
    }

    if (typeof value !== 'object') {
      errors.push({
        type: 'type_mismatch',
        message: `${contextName} value should be an object, got ${typeof value}`,
        expected: 'object',
        actual: typeof value,
        severity: 'high',
      });
    }

    return { errors, warnings };
  }

  private validateContextMethods(
    contextName: string,
    value: any
  ): {
    errors: ContextValidationError[];
    warnings: ContextValidationWarning[];
  } {
    const errors: ContextValidationError[] = [];
    const warnings: ContextValidationWarning[] = [];

    if (!value || typeof value !== 'object') {
      return { errors, warnings };
    }

    // Get expected methods based on context type
    const expectedMethods = this.getExpectedMethods(contextName);

    expectedMethods.required.forEach((method) => {
      if (!(method in value)) {
        errors.push({
          type: 'missing_method',
          message: `Required method '${method}' missing from ${contextName}`,
          path: method,
          severity: 'high',
        });
      } else if (typeof value[method] !== 'function') {
        errors.push({
          type: 'type_mismatch',
          message: `Method '${method}' in ${contextName} should be a function`,
          expected: 'function',
          actual: typeof value[method],
          path: method,
          severity: 'high',
        });
      }
    });

    expectedMethods.optional.forEach((method) => {
      if (method in value && typeof value[method] !== 'function') {
        warnings.push({
          type: 'missing_optional',
          message: `Optional method '${method}' in ${contextName} should be a function if provided`,
          suggestion: `Ensure ${method} is properly mocked as a function`,
          impact: 'medium',
        });
      }
    });

    return { errors, warnings };
  }

  private validateContextRender(
    contextName: string,
    Provider: ComponentType<any>,
    value: any
  ): {
    errors: ContextValidationError[];
    warnings: ContextValidationWarning[];
  } {
    const errors: ContextValidationError[] = [];
    const warnings: ContextValidationWarning[] = [];

    try {
      const TestComponent = () =>
        React.createElement('div', { 'data-testid': 'context-test' }, 'Test');
      const WrappedComponent = () =>
        React.createElement(
          Provider,
          { value },
          React.createElement(TestComponent)
        );

      const result = render(React.createElement(WrappedComponent));

      if (!result.getByTestId('context-test')) {
        errors.push({
          type: 'invalid_value',
          message: `${contextName} provider failed to render test component`,
          severity: 'high',
        });
      }
    } catch (error) {
      errors.push({
        type: 'invalid_value',
        message: `${contextName} provider render test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'high',
      });
    }

    return { errors, warnings };
  }

  private generateValidationSuggestions(
    contextName: string,
    errors: ContextValidationError[],
    warnings: ContextValidationWarning[]
  ): string[] {
    const suggestions: string[] = [];

    if (errors.some((e) => e.type === 'missing_context')) {
      suggestions.push(
        `Ensure ${contextName} is properly initialized in test setup`
      );
    }

    if (errors.some((e) => e.type === 'missing_method')) {
      suggestions.push(
        `Add missing methods to ${contextName} mock implementation`
      );
    }

    if (errors.some((e) => e.type === 'type_mismatch')) {
      suggestions.push(`Check type definitions for ${contextName} mock`);
    }

    if (errors.some((e) => e.type === 'provider_not_found')) {
      suggestions.push(
        `Verify ${contextName} provider is properly imported and mocked`
      );
    }

    if (warnings.some((w) => w.type === 'performance_concern')) {
      suggestions.push(
        `Consider optimizing ${contextName} mock for better test performance`
      );
    }

    return suggestions;
  }

  private getExpectedMethods(contextName: string): {
    required: string[];
    optional: string[];
  } {
    const methodMap: Record<
      string,
      { required: string[]; optional: string[] }
    > = {
      ToastContext: {
        required: ['toast', 'dismiss', 'dismissAll'],
        optional: ['getToastsByCategory', 'clearQueue'],
      },
      FormContext: {
        required: ['register', 'handleSubmit', 'setValue', 'getValues'],
        optional: ['reset', 'trigger', 'watch'],
      },
      ThemeContext: {
        required: ['setTheme'],
        optional: [],
      },
      SessionContext: {
        required: ['update'],
        optional: [],
      },
    };

    return methodMap[contextName] || { required: [], optional: [] };
  }

  private analyzeValueStructure(value: any): Record<string, any> {
    if (value === null || value === undefined) {
      return { type: typeof value, value };
    }

    if (typeof value !== 'object') {
      return { type: typeof value, value };
    }

    const structure: Record<string, any> = {};

    Object.keys(value).forEach((key) => {
      const val = value[key];
      structure[key] = {
        type: typeof val,
        isFunction: typeof val === 'function',
        isMocked: typeof val === 'function' && jest.isMockFunction(val),
        hasValue: val !== null && val !== undefined,
      };
    });

    return structure;
  }

  private analyzeContextMethods(
    contextName: string,
    value: any
  ): {
    missing: string[];
    extra: string[];
  } {
    const expected = this.getExpectedMethods(contextName);
    const allExpected = [...expected.required, ...expected.optional];
    const actual = value && typeof value === 'object' ? Object.keys(value) : [];

    return {
      missing: allExpected.filter((method) => !actual.includes(method)),
      extra: actual.filter((method) => !allExpected.includes(method)),
    };
  }

  private performTypeValidation(value: any): Record<string, boolean> {
    if (!value || typeof value !== 'object') {
      return {};
    }

    const validation: Record<string, boolean> = {};

    Object.keys(value).forEach((key) => {
      const val = value[key];
      validation[key] = val !== null && val !== undefined;
    });

    return validation;
  }

  // ============================================================================
  // Mock Context Creators
  // ============================================================================

  private createMockToastContext(): ToastContextValue {
    return {
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
  }

  private createMockFormContext(): FormContextValue {
    return {
      formState: {
        isSubmitting: false,
        isValid: true,
        isDirty: false,
        errors: {},
      },
      register: jest.fn(() => ({
        name: 'test',
        onChange: jest.fn(),
        onBlur: jest.fn(),
      })),
      handleSubmit: jest.fn((fn) => fn),
      setValue: jest.fn(),
      getValues: jest.fn(() => ({})),
      reset: jest.fn(),
      trigger: jest.fn(() => Promise.resolve(true)),
    };
  }

  private createMockThemeContext(): ThemeContextValue {
    return {
      theme: 'light',
      setTheme: jest.fn(),
      resolvedTheme: 'light',
      systemTheme: 'light',
    };
  }

  private createMockSessionContext(): SessionContextValue {
    return {
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
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a context mock validator with default configuration
 */
export function createContextMockValidator(
  config?: Partial<ContextValidationConfig>
): ContextMockValidator {
  return new ContextMockValidator(config);
}

/**
 * Quick validation function for testing
 */
export function validateContextMock<T>(
  contextName: string,
  mockValue: T,
  config?: Partial<ContextValidationConfig>
): ContextValidationResult {
  const validator = createContextMockValidator(config);
  return validator.validateContext(contextName, {} as Context<T>, mockValue);
}

/**
 * Debug context mock issues
 */
export function debugContextMock<T>(
  contextName: string,
  mockValue: T,
  Provider?: ComponentType<{ children: ReactNode; value?: T }>
): ContextMockDebugInfo {
  const validator = createContextMockValidator({ debugMode: true });
  return validator.generateDebugInfo(contextName, mockValue, Provider);
}

// ============================================================================
// Export Default Instance
// ============================================================================

export const contextMockValidator = createContextMockValidator({
  strictMode: false,
  validateTypes: true,
  checkOptionalMethods: true,
  performanceChecks: false,
  debugMode: process.env.NODE_ENV === 'test',
});

export default contextMockValidator;
