/**
 * MockValidator - Comprehensive Mock Validation System
 *
 * Implements mock validation system from design requirements 2.4 and 5.4
 * Provides automated mock structure comparison and validation
 * Ensures mock accuracy against actual implementations
 */

import { jest } from '@jest/globals';

// ============================================================================
// Core Interfaces
// ============================================================================

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
  score: number; // 0-100 validation score
  timestamp: number;
}

export interface ValidationError {
  type:
    | 'MISSING_METHOD'
    | 'MISSING_PROPERTY'
    | 'TYPE_MISMATCH'
    | 'STRUCTURE_MISMATCH'
    | 'MOCK_FUNCTION_MISSING';
  severity: 'critical' | 'high' | 'medium' | 'low';
  path: string;
  expected: any;
  actual: any;
  message: string;
  suggestion?: string;
}

export interface ValidationWarning {
  type:
    | 'DEPRECATED_METHOD'
    | 'OPTIONAL_PROPERTY'
    | 'PERFORMANCE_CONCERN'
    | 'COMPATIBILITY_ISSUE';
  path: string;
  message: string;
  suggestion?: string;
}

export interface MockReport {
  mockName: string;
  mockType: 'hook' | 'component' | 'provider' | 'utility';
  validationResult: ValidationResult;
  coverage: MockCoverage;
  recommendations: string[];
  healthScore: number; // 0-100 overall health score
  lastValidated: Date;
}

export interface MockCoverage {
  totalMethods: number;
  mockedMethods: number;
  totalProperties: number;
  mockedProperties: number;
  coveragePercentage: number;
  missingItems: string[];
}

export interface FixSuggestion {
  type: 'ADD_METHOD' | 'ADD_PROPERTY' | 'FIX_TYPE' | 'UPDATE_STRUCTURE';
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  codeExample?: string;
  affectedTests?: string[];
}

export interface ValidationFailure {
  mockName: string;
  errors: ValidationError[];
  impact: 'breaking' | 'degraded' | 'minor';
}

// ============================================================================
// Hook Validation Schemas
// ============================================================================

interface HookValidationSchema {
  name: string;
  expectedStructure: {
    returnType: 'object' | 'function' | 'array' | 'primitive';
    properties?: Record<
      string,
      {
        type: string;
        required: boolean;
        mockType?: 'jest.fn' | 'value' | 'object';
      }
    >;
    methods?: Record<
      string,
      {
        type: 'function';
        required: boolean;
        parameters?: any[];
        returnType?: string;
      }
    >;
  };
}

const HOOK_SCHEMAS: Record<string, HookValidationSchema> = {
  useToast: {
    name: 'useToast',
    expectedStructure: {
      returnType: 'object',
      properties: {
        toasts: { type: 'array', required: true, mockType: 'value' },
        queue: { type: 'array', required: true, mockType: 'value' },
        contextualToast: { type: 'object', required: true, mockType: 'object' },
        rateLimitCount: { type: 'number', required: false, mockType: 'value' },
        lastResetTime: { type: 'number', required: false, mockType: 'value' },
      },
      methods: {
        toast: { type: 'function', required: true, returnType: 'object' },
        dismiss: { type: 'function', required: true, returnType: 'void' },
        dismissAll: { type: 'function', required: true, returnType: 'void' },
        clearQueue: { type: 'function', required: true, returnType: 'void' },
        getToastsByCategory: {
          type: 'function',
          required: true,
          returnType: 'array',
        },
        getToastsByPriority: {
          type: 'function',
          required: false,
          returnType: 'array',
        },
      },
    },
  },
  useEnhancedForm: {
    name: 'useEnhancedForm',
    expectedStructure: {
      returnType: 'object',
      properties: {
        formState: { type: 'object', required: true, mockType: 'value' },
        control: { type: 'object', required: true, mockType: 'value' },
        isSaving: { type: 'boolean', required: true, mockType: 'value' },
        lastSaved: { type: 'object', required: false, mockType: 'value' },
      },
      methods: {
        register: { type: 'function', required: true, returnType: 'object' },
        handleSubmit: {
          type: 'function',
          required: true,
          returnType: 'function',
        },
        watch: { type: 'function', required: true, returnType: 'any' },
        getValues: { type: 'function', required: true, returnType: 'any' },
        setValue: { type: 'function', required: true, returnType: 'void' },
        validateField: {
          type: 'function',
          required: true,
          returnType: 'Promise',
        },
        getFieldValidation: {
          type: 'function',
          required: true,
          returnType: 'object',
        },
        saveNow: { type: 'function', required: true, returnType: 'Promise' },
        submitWithFeedback: {
          type: 'function',
          required: true,
          returnType: 'Promise',
        },
        focusFirstError: {
          type: 'function',
          required: true,
          returnType: 'void',
        },
        announceFormState: {
          type: 'function',
          required: true,
          returnType: 'void',
        },
      },
    },
  },
  useAutoSave: {
    name: 'useAutoSave',
    expectedStructure: {
      returnType: 'object',
      properties: {
        isSaving: { type: 'boolean', required: true, mockType: 'value' },
      },
      methods: {
        saveNow: { type: 'function', required: true, returnType: 'Promise' },
      },
    },
  },
  useRealTimeValidation: {
    name: 'useRealTimeValidation',
    expectedStructure: {
      returnType: 'object',
      properties: {
        validationState: { type: 'object', required: true, mockType: 'value' },
      },
      methods: {
        validateField: {
          type: 'function',
          required: true,
          returnType: 'Promise',
        },
        getFieldValidation: {
          type: 'function',
          required: true,
          returnType: 'object',
        },
        validateAllFields: {
          type: 'function',
          required: true,
          returnType: 'Promise',
        },
        clearValidation: {
          type: 'function',
          required: true,
          returnType: 'void',
        },
      },
    },
  },
  useFormToast: {
    name: 'useFormToast',
    expectedStructure: {
      returnType: 'object',
      methods: {
        showValidationError: {
          type: 'function',
          required: true,
          returnType: 'void',
        },
        showSubmissionSuccess: {
          type: 'function',
          required: true,
          returnType: 'void',
        },
        showSubmissionError: {
          type: 'function',
          required: true,
          returnType: 'void',
        },
        showSaveProgress: {
          type: 'function',
          required: true,
          returnType: 'object',
        },
        showAutoSaveSuccess: {
          type: 'function',
          required: true,
          returnType: 'void',
        },
        showNetworkError: {
          type: 'function',
          required: true,
          returnType: 'void',
        },
        showAuthError: { type: 'function', required: true, returnType: 'void' },
        clearFormToasts: {
          type: 'function',
          required: true,
          returnType: 'void',
        },
      },
    },
  },
};

// ============================================================================
// Component Validation Schemas
// ============================================================================

interface ComponentValidationSchema {
  name: string;
  expectedProps: Record<
    string,
    {
      type: string;
      required: boolean;
      defaultValue?: any;
    }
  >;
  expectedBehavior: {
    rendersWithoutError: boolean;
    acceptsChildren: boolean;
    forwardsRef: boolean;
    hasTestId: boolean;
  };
}

const COMPONENT_SCHEMAS: Record<string, ComponentValidationSchema> = {
  EnhancedInput: {
    name: 'EnhancedInput',
    expectedProps: {
      name: { type: 'string', required: true },
      value: { type: 'string', required: false },
      onChange: { type: 'function', required: false },
      onBlur: { type: 'function', required: false },
      placeholder: { type: 'string', required: false },
      disabled: { type: 'boolean', required: false },
      error: { type: 'string', required: false },
      'data-testid': { type: 'string', required: false },
    },
    expectedBehavior: {
      rendersWithoutError: true,
      acceptsChildren: false,
      forwardsRef: true,
      hasTestId: true,
    },
  },
  EnhancedTextarea: {
    name: 'EnhancedTextarea',
    expectedProps: {
      name: { type: 'string', required: true },
      value: { type: 'string', required: false },
      onChange: { type: 'function', required: false },
      onBlur: { type: 'function', required: false },
      placeholder: { type: 'string', required: false },
      disabled: { type: 'boolean', required: false },
      rows: { type: 'number', required: false },
      error: { type: 'string', required: false },
      'data-testid': { type: 'string', required: false },
    },
    expectedBehavior: {
      rendersWithoutError: true,
      acceptsChildren: false,
      forwardsRef: true,
      hasTestId: true,
    },
  },
  AutoSaveIndicator: {
    name: 'AutoSaveIndicator',
    expectedProps: {
      isSaving: { type: 'boolean', required: true },
      lastSaved: { type: 'object', required: false },
      'data-testid': { type: 'string', required: false },
    },
    expectedBehavior: {
      rendersWithoutError: true,
      acceptsChildren: false,
      forwardsRef: false,
      hasTestId: true,
    },
  },
  FormSubmissionProgress: {
    name: 'FormSubmissionProgress',
    expectedProps: {
      progress: { type: 'number', required: true },
      currentStep: { type: 'string', required: false },
      totalSteps: { type: 'number', required: false },
      'data-testid': { type: 'string', required: false },
    },
    expectedBehavior: {
      rendersWithoutError: true,
      acceptsChildren: false,
      forwardsRef: false,
      hasTestId: true,
    },
  },
  EnhancedButton: {
    name: 'EnhancedButton',
    expectedProps: {
      children: { type: 'node', required: false },
      onClick: { type: 'function', required: false },
      disabled: { type: 'boolean', required: false },
      variant: { type: 'string', required: false },
      size: { type: 'string', required: false },
      'data-testid': { type: 'string', required: false },
    },
    expectedBehavior: {
      rendersWithoutError: true,
      acceptsChildren: true,
      forwardsRef: true,
      hasTestId: true,
    },
  },
};

// ============================================================================
// MockValidator Class Implementation
// ============================================================================

export class MockValidator {
  private validationHistory: Map<string, ValidationResult[]> = new Map();
  private mockRegistry: Map<string, any> = new Map();

  constructor() {
    this.initializeRegistry();
  }

  private initializeRegistry(): void {
    // Register known mocks from global registry if available
    if (typeof global !== 'undefined' && global.__GLOBAL_MOCK_REGISTRY) {
      const registry = global.__GLOBAL_MOCK_REGISTRY;

      // Register hooks
      registry.hooks.forEach((mock, name) => {
        this.mockRegistry.set(`hook:${name}`, mock);
      });

      // Register components
      registry.components.forEach((mock, name) => {
        this.mockRegistry.set(`component:${name}`, mock);
      });

      // Register providers
      registry.providers.forEach((mock, name) => {
        this.mockRegistry.set(`provider:${name}`, mock);
      });
    }
  }

  /**
   * Validate a hook mock against its expected structure
   */
  public validateHookMock(hookName: string, mock: any): ValidationResult {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    // Get schema for this hook
    const schema = HOOK_SCHEMAS[hookName];
    if (!schema) {
      errors.push({
        type: 'STRUCTURE_MISMATCH',
        severity: 'high',
        path: hookName,
        expected: 'Known hook schema',
        actual: 'Unknown hook',
        message: `No validation schema found for hook '${hookName}'`,
        suggestion: 'Add validation schema or check hook name spelling',
      });

      return this.createValidationResult(
        false,
        errors,
        warnings,
        suggestions,
        0,
        startTime
      );
    }

    // Validate that mock is a function (hooks should be functions)
    if (!jest.isMockFunction(mock) && typeof mock !== 'function') {
      errors.push({
        type: 'TYPE_MISMATCH',
        severity: 'critical',
        path: `${hookName}`,
        expected: 'jest.MockedFunction or function',
        actual: typeof mock,
        message: `Hook mock '${hookName}' should be a jest mock function`,
        suggestion: `Use jest.fn(() => ({ ... })) to create the mock`,
      });
    }

    // If mock is a function, validate its return value
    if (typeof mock === 'function') {
      let mockReturnValue: any;

      try {
        // Call the mock to get its return value
        mockReturnValue = mock();
      } catch (error) {
        errors.push({
          type: 'MOCK_FUNCTION_MISSING',
          severity: 'critical',
          path: `${hookName}()`,
          expected: 'Callable mock function',
          actual: 'Function throws error',
          message: `Hook mock '${hookName}' throws error when called: ${error}`,
          suggestion: 'Ensure mock function returns a valid object',
        });

        return this.createValidationResult(
          false,
          errors,
          warnings,
          suggestions,
          0,
          startTime
        );
      }

      // Validate return value structure
      this.validateObjectStructure(
        hookName,
        mockReturnValue,
        schema.expectedStructure,
        errors,
        warnings,
        suggestions
      );
    }

    // Calculate validation score
    const score = this.calculateValidationScore(errors, warnings);
    const isValid =
      errors.filter((e) => e.severity === 'critical' || e.severity === 'high')
        .length === 0;

    const result = this.createValidationResult(
      isValid,
      errors,
      warnings,
      suggestions,
      score,
      startTime
    );

    // Store in history
    this.addToHistory(hookName, result);

    return result;
  }

  /**
   * Validate a component mock against its expected structure
   */
  public validateComponentMock(
    componentName: string,
    mock: any
  ): ValidationResult {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    // Get schema for this component
    const schema = COMPONENT_SCHEMAS[componentName];
    if (!schema) {
      errors.push({
        type: 'STRUCTURE_MISMATCH',
        severity: 'high',
        path: componentName,
        expected: 'Known component schema',
        actual: 'Unknown component',
        message: `No validation schema found for component '${componentName}'`,
        suggestion: 'Add validation schema or check component name spelling',
      });

      return this.createValidationResult(
        false,
        errors,
        warnings,
        suggestions,
        0,
        startTime
      );
    }

    // Validate that mock is a function (React components should be functions)
    if (!jest.isMockFunction(mock) && typeof mock !== 'function') {
      errors.push({
        type: 'TYPE_MISMATCH',
        severity: 'critical',
        path: componentName,
        expected: 'jest.MockedFunction or React.FC',
        actual: typeof mock,
        message: `Component mock '${componentName}' should be a jest mock function`,
        suggestion: `Use jest.fn((props) => <div data-testid="..." {...props} />) to create the mock`,
      });
    }

    // Test component rendering behavior
    if (typeof mock === 'function') {
      try {
        // Test basic rendering with minimal props
        const testProps = this.generateTestProps(schema);
        const result = mock(testProps);

        // Also test without test ID to check if mock adds it
        const propsWithoutTestId = { ...testProps };
        delete propsWithoutTestId['data-testid'];
        const resultWithoutTestId = mock(propsWithoutTestId);

        // Validate that component returns valid JSX-like structure
        if (result && typeof result === 'object' && result.type) {
          // Check for test ID
          if (schema.expectedBehavior.hasTestId) {
            const hasTestIdWithProps =
              result.props && result.props['data-testid'];
            const hasTestIdWithoutProps =
              resultWithoutTestId.props &&
              resultWithoutTestId.props['data-testid'];

            // Warn if mock doesn't add test ID when not provided in props
            if (!hasTestIdWithoutProps) {
              warnings.push({
                type: 'OPTIONAL_PROPERTY',
                path: `${componentName}.props['data-testid']`,
                message: `Component '${componentName}' should include data-testid for testing`,
                suggestion: 'Add data-testid prop to component mock',
              });
            }
          }
        } else {
          errors.push({
            type: 'STRUCTURE_MISMATCH',
            severity: 'high',
            path: `${componentName}()`,
            expected: 'Valid React element',
            actual: typeof result,
            message: `Component mock '${componentName}' should return a valid React element`,
            suggestion: 'Ensure mock returns JSX or React.createElement result',
          });
        }
      } catch (error) {
        errors.push({
          type: 'MOCK_FUNCTION_MISSING',
          severity: 'critical',
          path: `${componentName}()`,
          expected: 'Renderable component',
          actual: 'Function throws error',
          message: `Component mock '${componentName}' throws error when rendered: ${error}`,
          suggestion: 'Ensure mock component can be rendered with test props',
        });
      }
    }

    // Calculate validation score
    const score = this.calculateValidationScore(errors, warnings);
    const isValid =
      errors.filter((e) => e.severity === 'critical' || e.severity === 'high')
        .length === 0;

    const result = this.createValidationResult(
      isValid,
      errors,
      warnings,
      suggestions,
      score,
      startTime
    );

    // Store in history
    this.addToHistory(componentName, result);

    return result;
  }

  /**
   * Generate a comprehensive mock report
   */
  public generateMockReport(): MockReport[] {
    const reports: MockReport[] = [];

    // Generate reports for all registered mocks
    this.mockRegistry.forEach((mock, key) => {
      const [type, name] = key.split(':');
      let validationResult: ValidationResult;

      if (type === 'hook') {
        validationResult = this.validateHookMock(name, mock);
      } else if (type === 'component') {
        validationResult = this.validateComponentMock(name, mock);
      } else {
        // For providers and utilities, use basic validation
        validationResult = this.validateGenericMock(name, mock);
      }

      const coverage = this.calculateMockCoverage(
        name,
        mock,
        type as 'hook' | 'component'
      );
      const recommendations = this.generateRecommendations(
        validationResult,
        coverage
      );
      const healthScore = this.calculateHealthScore(validationResult, coverage);

      reports.push({
        mockName: name,
        mockType: type as 'hook' | 'component' | 'provider' | 'utility',
        validationResult,
        coverage,
        recommendations,
        healthScore,
        lastValidated: new Date(),
      });
    });

    return reports;
  }

  /**
   * Suggest fixes for validation failures
   */
  public suggestFixes(failures: ValidationFailure[]): FixSuggestion[] {
    const suggestions: FixSuggestion[] = [];

    failures.forEach((failure) => {
      failure.errors.forEach((error) => {
        let suggestion: FixSuggestion;

        switch (error.type) {
          case 'MISSING_METHOD':
            suggestion = {
              type: 'ADD_METHOD',
              priority: error.severity as
                | 'critical'
                | 'high'
                | 'medium'
                | 'low',
              description: `Add missing method '${error.path}' to mock '${failure.mockName}'`,
              codeExample: this.generateMethodMockCode(
                error.path,
                error.expected
              ),
              affectedTests: this.findAffectedTests(
                failure.mockName,
                error.path
              ),
            };
            break;

          case 'MISSING_PROPERTY':
            suggestion = {
              type: 'ADD_PROPERTY',
              priority: error.severity as
                | 'critical'
                | 'high'
                | 'medium'
                | 'low',
              description: `Add missing property '${error.path}' to mock '${failure.mockName}'`,
              codeExample: this.generatePropertyMockCode(
                error.path,
                error.expected
              ),
              affectedTests: this.findAffectedTests(
                failure.mockName,
                error.path
              ),
            };
            break;

          case 'TYPE_MISMATCH':
            suggestion = {
              type: 'FIX_TYPE',
              priority: error.severity as
                | 'critical'
                | 'high'
                | 'medium'
                | 'low',
              description: `Fix type mismatch for '${error.path}' in mock '${failure.mockName}'`,
              codeExample: this.generateTypeFix(
                error.path,
                error.expected,
                error.actual
              ),
              affectedTests: this.findAffectedTests(
                failure.mockName,
                error.path
              ),
            };
            break;

          case 'STRUCTURE_MISMATCH':
            suggestion = {
              type: 'UPDATE_STRUCTURE',
              priority: error.severity as
                | 'critical'
                | 'high'
                | 'medium'
                | 'low',
              description: `Update structure of mock '${failure.mockName}' to match expected format`,
              codeExample: this.generateStructureFix(
                failure.mockName,
                error.expected
              ),
              affectedTests: this.findAffectedTests(failure.mockName),
            };
            break;

          default:
            suggestion = {
              type: 'UPDATE_STRUCTURE',
              priority: 'medium',
              description: `Fix validation error in mock '${failure.mockName}': ${error.message}`,
              affectedTests: this.findAffectedTests(failure.mockName),
            };
        }

        suggestions.push(suggestion);
      });
    });

    // Sort by priority
    return suggestions.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private validateObjectStructure(
    basePath: string,
    obj: any,
    expectedStructure: any,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    suggestions: string[]
  ): void {
    if (!obj || typeof obj !== 'object') {
      errors.push({
        type: 'TYPE_MISMATCH',
        severity: 'critical',
        path: basePath,
        expected: 'object',
        actual: typeof obj,
        message: `Expected object at '${basePath}', got ${typeof obj}`,
      });
      return;
    }

    // Validate properties
    if (expectedStructure.properties) {
      Object.entries(expectedStructure.properties).forEach(
        ([propName, propSchema]: [string, any]) => {
          const propPath = `${basePath}.${propName}`;
          const actualValue = obj[propName];

          if (propSchema.required && actualValue === undefined) {
            errors.push({
              type: 'MISSING_PROPERTY',
              severity: 'high',
              path: propPath,
              expected: propSchema.type,
              actual: 'undefined',
              message: `Required property '${propName}' is missing from '${basePath}'`,
              suggestion: `Add ${propName}: ${this.generateDefaultValue(propSchema.type)} to the mock`,
            });
          } else if (actualValue !== undefined) {
            // Validate type
            const expectedType = propSchema.type;
            const actualType = Array.isArray(actualValue)
              ? 'array'
              : typeof actualValue;

            if (actualType !== expectedType) {
              const severity = propSchema.required ? 'high' : 'medium';
              errors.push({
                type: 'TYPE_MISMATCH',
                severity,
                path: propPath,
                expected: expectedType,
                actual: actualType,
                message: `Property '${propName}' has wrong type. Expected ${expectedType}, got ${actualType}`,
                suggestion: `Change ${propName} to type ${expectedType}`,
              });
            }
          }
        }
      );
    }

    // Validate methods
    if (expectedStructure.methods) {
      Object.entries(expectedStructure.methods).forEach(
        ([methodName, methodSchema]: [string, any]) => {
          const methodPath = `${basePath}.${methodName}`;
          const actualMethod = obj[methodName];

          if (methodSchema.required && !actualMethod) {
            errors.push({
              type: 'MISSING_METHOD',
              severity: 'critical',
              path: methodPath,
              expected: 'function',
              actual: 'undefined',
              message: `Required method '${methodName}' is missing from '${basePath}'`,
              suggestion: `Add ${methodName}: jest.fn() to the mock`,
            });
          } else if (actualMethod) {
            // Validate that it's a function
            if (typeof actualMethod !== 'function') {
              errors.push({
                type: 'TYPE_MISMATCH',
                severity: 'high',
                path: methodPath,
                expected: 'function',
                actual: typeof actualMethod,
                message: `Method '${methodName}' should be a function, got ${typeof actualMethod}`,
                suggestion: `Change ${methodName} to jest.fn()`,
              });
            } else if (!jest.isMockFunction(actualMethod)) {
              warnings.push({
                type: 'PERFORMANCE_CONCERN',
                path: methodPath,
                message: `Method '${methodName}' is not a jest mock function`,
                suggestion: `Use jest.fn() for better test control and assertions`,
              });
            }
          }
        }
      );
    }
  }

  private validateGenericMock(name: string, mock: any): ValidationResult {
    const startTime = Date.now();
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    // Basic validation for unknown mock types
    if (mock === undefined || mock === null) {
      errors.push({
        type: 'STRUCTURE_MISMATCH',
        severity: 'critical',
        path: name,
        expected: 'defined mock',
        actual: String(mock),
        message: `Mock '${name}' is ${mock}`,
      });
    }

    const score = this.calculateValidationScore(errors, warnings);
    const isValid = errors.length === 0;

    return this.createValidationResult(
      isValid,
      errors,
      warnings,
      suggestions,
      score,
      startTime
    );
  }

  private calculateMockCoverage(
    name: string,
    mock: any,
    type: 'hook' | 'component'
  ): MockCoverage {
    let totalMethods = 0;
    let mockedMethods = 0;
    let totalProperties = 0;
    let mockedProperties = 0;
    const missingItems: string[] = [];

    const schema =
      type === 'hook' ? HOOK_SCHEMAS[name] : COMPONENT_SCHEMAS[name];

    if (schema && type === 'hook') {
      const hookSchema = schema as HookValidationSchema;

      // Count methods
      if (hookSchema.expectedStructure.methods) {
        totalMethods = Object.keys(hookSchema.expectedStructure.methods).length;

        if (typeof mock === 'function') {
          try {
            const mockReturn = mock();
            Object.keys(hookSchema.expectedStructure.methods).forEach(
              (methodName) => {
                if (
                  mockReturn &&
                  typeof mockReturn[methodName] === 'function'
                ) {
                  mockedMethods++;
                } else {
                  missingItems.push(`method:${methodName}`);
                }
              }
            );
          } catch (error) {
            // Mock function failed, all methods are missing
            missingItems.push(
              ...Object.keys(hookSchema.expectedStructure.methods).map(
                (m) => `method:${m}`
              )
            );
          }
        }
      }

      // Count properties
      if (hookSchema.expectedStructure.properties) {
        totalProperties = Object.keys(
          hookSchema.expectedStructure.properties
        ).length;

        if (typeof mock === 'function') {
          try {
            const mockReturn = mock();
            Object.keys(hookSchema.expectedStructure.properties).forEach(
              (propName) => {
                if (mockReturn && mockReturn[propName] !== undefined) {
                  mockedProperties++;
                } else {
                  missingItems.push(`property:${propName}`);
                }
              }
            );
          } catch (error) {
            // Mock function failed, all properties are missing
            missingItems.push(
              ...Object.keys(hookSchema.expectedStructure.properties).map(
                (p) => `property:${p}`
              )
            );
          }
        }
      }
    }

    const totalItems = totalMethods + totalProperties;
    const mockedItems = mockedMethods + mockedProperties;
    const coveragePercentage =
      totalItems > 0 ? Math.round((mockedItems / totalItems) * 100) : 0;

    return {
      totalMethods,
      mockedMethods,
      totalProperties,
      mockedProperties,
      coveragePercentage,
      missingItems,
    };
  }

  private generateRecommendations(
    validation: ValidationResult,
    coverage: MockCoverage
  ): string[] {
    const recommendations: string[] = [];

    // Coverage-based recommendations
    if (coverage.coveragePercentage < 80) {
      recommendations.push(
        `Improve mock coverage (currently ${coverage.coveragePercentage}%). Missing: ${coverage.missingItems.join(', ')}`
      );
    }

    if (coverage.mockedMethods < coverage.totalMethods) {
      recommendations.push(
        `Add ${coverage.totalMethods - coverage.mockedMethods} missing method mocks`
      );
    }

    if (coverage.mockedProperties < coverage.totalProperties) {
      recommendations.push(
        `Add ${coverage.totalProperties - coverage.mockedProperties} missing property mocks`
      );
    }

    // Validation-based recommendations
    const criticalErrors = validation.errors.filter(
      (e) => e.severity === 'critical'
    );
    if (criticalErrors.length > 0) {
      recommendations.push(
        `Fix ${criticalErrors.length} critical validation errors immediately`
      );
    }

    const highErrors = validation.errors.filter((e) => e.severity === 'high');
    if (highErrors.length > 0) {
      recommendations.push(
        `Address ${highErrors.length} high-priority validation issues`
      );
    }

    if (validation.warnings.length > 0) {
      recommendations.push(
        `Consider addressing ${validation.warnings.length} warnings for better test reliability`
      );
    }

    // Score-based recommendations
    if (validation.score < 70) {
      recommendations.push(
        'Mock quality is below acceptable threshold. Consider refactoring.'
      );
    } else if (validation.score < 90) {
      recommendations.push(
        'Mock quality is good but has room for improvement.'
      );
    }

    return recommendations;
  }

  private calculateHealthScore(
    validation: ValidationResult,
    coverage: MockCoverage
  ): number {
    // Health score is weighted combination of validation score and coverage
    const validationWeight = 0.7;
    const coverageWeight = 0.3;

    return Math.round(
      validation.score * validationWeight +
        coverage.coveragePercentage * coverageWeight
    );
  }

  private calculateValidationScore(
    errors: ValidationError[],
    warnings: ValidationWarning[]
  ): number {
    let score = 100;

    // Deduct points for errors based on severity
    errors.forEach((error) => {
      switch (error.severity) {
        case 'critical':
          score -= 25;
          break;
        case 'high':
          score -= 15;
          break;
        case 'medium':
          score -= 8;
          break;
        case 'low':
          score -= 3;
          break;
      }
    });

    // Deduct smaller amounts for warnings
    warnings.forEach(() => {
      score -= 2;
    });

    return Math.max(0, score);
  }

  private createValidationResult(
    isValid: boolean,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    suggestions: string[],
    score: number,
    startTime: number
  ): ValidationResult {
    return {
      isValid,
      errors,
      warnings,
      suggestions,
      score,
      timestamp: Date.now() - startTime,
    };
  }

  private addToHistory(mockName: string, result: ValidationResult): void {
    if (!this.validationHistory.has(mockName)) {
      this.validationHistory.set(mockName, []);
    }

    const history = this.validationHistory.get(mockName)!;
    history.push(result);

    // Keep only last 10 validation results
    if (history.length > 10) {
      history.shift();
    }
  }

  private generateTestProps(
    schema: ComponentValidationSchema
  ): Record<string, any> {
    const props: Record<string, any> = {};

    Object.entries(schema.expectedProps).forEach(([propName, propConfig]) => {
      if (propConfig.required) {
        props[propName] = this.generateDefaultValue(propConfig.type);
      }
    });

    // Always add test ID for validation
    props['data-testid'] = `test-${schema.name.toLowerCase()}`;

    return props;
  }

  private generateDefaultValue(type: string): any {
    switch (type) {
      case 'string':
        return 'test-value';
      case 'number':
        return 42;
      case 'boolean':
        return true;
      case 'function':
        return jest.fn();
      case 'object':
        return {};
      case 'array':
        return [];
      case 'node':
        return 'Test Content';
      default:
        return null;
    }
  }

  private generateMethodMockCode(methodPath: string, expected: any): string {
    const methodName = methodPath.split('.').pop();
    return `${methodName}: jest.fn()`;
  }

  private generatePropertyMockCode(
    propertyPath: string,
    expected: any
  ): string {
    const propertyName = propertyPath.split('.').pop();
    const defaultValue = this.generateDefaultValue(expected);
    return `${propertyName}: ${JSON.stringify(defaultValue)}`;
  }

  private generateTypeFix(
    path: string,
    expected: string,
    actual: string
  ): string {
    const propertyName = path.split('.').pop();
    const defaultValue = this.generateDefaultValue(expected);
    return `// Change from ${actual} to ${expected}\n${propertyName}: ${JSON.stringify(defaultValue)}`;
  }

  private generateStructureFix(mockName: string, expected: any): string {
    return `// Update ${mockName} mock structure\n// See validation schema for expected structure`;
  }

  private findAffectedTests(mockName: string, path?: string): string[] {
    // This would ideally scan test files to find usage
    // For now, return a placeholder
    return [`Tests using ${mockName}${path ? `.${path}` : ''}`];
  }

  /**
   * Get validation history for a specific mock
   */
  public getValidationHistory(mockName: string): ValidationResult[] {
    return this.validationHistory.get(mockName) || [];
  }

  /**
   * Clear validation history
   */
  public clearHistory(): void {
    this.validationHistory.clear();
  }

  /**
   * Register a mock for validation
   */
  public registerMock(
    type: 'hook' | 'component' | 'provider' | 'utility',
    name: string,
    mock: any
  ): void {
    this.mockRegistry.set(`${type}:${name}`, mock);
  }

  /**
   * Get all registered mocks
   */
  public getRegisteredMocks(): Map<string, any> {
    return new Map(this.mockRegistry);
  }
}

// Export singleton instance
export const mockValidator = new MockValidator();
export default mockValidator;
