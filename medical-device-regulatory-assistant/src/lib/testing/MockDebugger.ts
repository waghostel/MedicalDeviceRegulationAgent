/**
 * MockDebugger - Advanced Mock Debugging and Analysis System
 * 
 * Implements mock debugging system from design requirements 2.4 and 5.4
 * Provides detailed mock failure diagnosis and diff generation
 * Helps developers quickly identify and fix mock-related issues
 */

import { jest } from '@jest/globals';
import { ValidationError, ValidationResult } from './MockValidator';

// ============================================================================
// Core Interfaces
// ============================================================================

export interface DiagnosisReport {
  mockName: string;
  error: Error;
  diagnosis: MockDiagnosis;
  recommendations: DiagnosisRecommendation[];
  codeExamples: CodeExample[];
  relatedIssues: RelatedIssue[];
  confidence: number; // 0-100 confidence in diagnosis
  timestamp: number;
}

export interface MockDiagnosis {
  category: 'STRUCTURE' | 'TYPE' | 'BEHAVIOR' | 'DEPENDENCY' | 'CONFIGURATION';
  severity: 'critical' | 'high' | 'medium' | 'low';
  rootCause: string;
  description: string;
  affectedFeatures: string[];
  quickFix?: string;
}

export interface DiagnosisRecommendation {
  priority: 'immediate' | 'high' | 'medium' | 'low';
  action: string;
  description: string;
  codeExample?: string;
  estimatedEffort: 'minutes' | 'hours' | 'days';
  dependencies?: string[];
}

export interface CodeExample {
  title: string;
  description: string;
  before?: string;
  after: string;
  language: 'typescript' | 'javascript' | 'jsx';
  category: 'fix' | 'improvement' | 'alternative';
}

export interface RelatedIssue {
  type: 'similar_error' | 'dependency' | 'configuration' | 'test_failure';
  description: string;
  mockName?: string;
  testFile?: string;
  suggestion?: string;
}

export interface MockDiff {
  mockName: string;
  expected: MockStructure;
  actual: MockStructure;
  differences: MockDifference[];
  summary: DiffSummary;
  fixSuggestions: string[];
  generatedCode: string;
}

export interface MockStructure {
  type: 'hook' | 'component' | 'function' | 'object';
  properties: Record<string, PropertyInfo>;
  methods: Record<string, MethodInfo>;
  metadata: StructureMetadata;
}

export interface PropertyInfo {
  type: string;
  value?: any;
  required: boolean;
  description?: string;
}

export interface MethodInfo {
  type: 'function';
  parameters: ParameterInfo[];
  returnType: string;
  required: boolean;
  isMocked: boolean;
  description?: string;
}

export interface ParameterInfo {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: any;
}

export interface StructureMetadata {
  source: 'actual' | 'expected' | 'inferred';
  confidence: number;
  lastUpdated: Date;
  version?: string;
}

export interface MockDifference {
  type: 'MISSING' | 'EXTRA' | 'TYPE_MISMATCH' | 'VALUE_MISMATCH' | 'STRUCTURE_MISMATCH';
  path: string;
  expected?: any;
  actual?: any;
  severity: 'critical' | 'high' | 'medium' | 'low';
  impact: string;
  suggestion: string;
}

export interface DiffSummary {
  totalDifferences: number;
  criticalIssues: number;
  missingItems: number;
  extraItems: number;
  typeMismatches: number;
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  compatibilityScore: number; // 0-100
}

// ============================================================================
// Error Pattern Database
// ============================================================================

interface ErrorPattern {
  pattern: RegExp;
  category: MockDiagnosis['category'];
  severity: MockDiagnosis['severity'];
  rootCause: string;
  description: string;
  quickFix?: string;
  codeExample?: string;
}

const ERROR_PATTERNS: ErrorPattern[] = [
  {
    pattern: /useToast is not a function/i,
    category: 'STRUCTURE',
    severity: 'critical',
    rootCause: 'useToast hook is not properly mocked as a function',
    description: 'The useToast hook mock is missing or not configured correctly. Components expect useToast to be a function that returns an object with toast methods.',
    quickFix: 'Ensure useToast is mocked as: jest.fn(() => ({ toast: jest.fn(), ... }))',
    codeExample: `
// Correct useToast mock
const mockUseToast = jest.fn(() => ({
  toast: jest.fn(),
  contextualToast: { success: jest.fn(), error: jest.fn() },
  dismiss: jest.fn(),
  dismissAll: jest.fn()
}));
`,
  },
  {
    pattern: /Cannot read propert(y|ies) of undefined \(reading '(\w+)'\)/i,
    category: 'STRUCTURE',
    severity: 'high',
    rootCause: 'Mock object is missing expected properties',
    description: 'A component is trying to access a property that doesn\'t exist on the mock object. This usually indicates incomplete mock structure.',
    quickFix: 'Add the missing property to the mock object',
  },
  {
    pattern: /TypeError: (\w+) is not a function/i,
    category: 'TYPE',
    severity: 'high',
    rootCause: 'Expected function is not mocked as a function',
    description: 'A method that should be a function is either missing or has the wrong type in the mock.',
    quickFix: 'Replace the property with jest.fn()',
  },
  {
    pattern: /AggregateError/i,
    category: 'CONFIGURATION',
    severity: 'critical',
    rootCause: 'React 19 compatibility issue with error handling',
    description: 'React 19 introduces AggregateError for batched errors. The test infrastructure may not be handling these correctly.',
    quickFix: 'Update error boundary and test setup for React 19 compatibility',
  },
  {
    pattern: /Warning: React\.createElement: type is invalid/i,
    category: 'STRUCTURE',
    severity: 'medium',
    rootCause: 'Component mock is not returning valid React element',
    description: 'The mocked component is not returning a valid React element structure.',
    quickFix: 'Ensure component mock returns valid JSX or React.createElement result',
  },
  {
    pattern: /Cannot find module.*__mocks__/i,
    category: 'CONFIGURATION',
    severity: 'medium',
    rootCause: 'Mock file location or naming issue',
    description: 'Jest cannot find the mock file. Check file location and naming conventions.',
    quickFix: 'Verify mock file is in correct __mocks__ directory with proper naming',
  },
  {
    pattern: /ReferenceError: (\w+) is not defined/i,
    category: 'DEPENDENCY',
    severity: 'high',
    rootCause: 'Missing mock dependency or import',
    description: 'A dependency required by the mock is not available in the test environment.',
    quickFix: 'Import or mock the missing dependency',
  },
];

// ============================================================================
// MockDebugger Class Implementation
// ============================================================================

export class MockDebugger {
  private diagnosisHistory: Map<string, DiagnosisReport[]> = new Map();
  private knownIssues: Map<string, RelatedIssue[]> = new Map();
  private performanceMetrics: Map<string, number[]> = new Map();

  constructor() {
    this.initializeKnownIssues();
  }

  private initializeKnownIssues(): void {
    // Initialize database of known issues and their solutions
    this.knownIssues.set('useToast', [
      {
        type: 'similar_error',
        description: 'useToast hook commonly fails when not mocked as function',
        suggestion: 'Use mockUseToast from use-toast-mock.ts',
      },
      {
        type: 'dependency',
        description: 'useToast depends on ToastProvider context',
        suggestion: 'Ensure ToastProvider is included in test wrapper',
      },
    ]);

    this.knownIssues.set('useEnhancedForm', [
      {
        type: 'dependency',
        description: 'useEnhancedForm depends on react-hook-form and zod',
        suggestion: 'Mock react-hook-form methods and zod schema validation',
      },
      {
        type: 'configuration',
        description: 'Enhanced form requires proper schema and options',
        suggestion: 'Provide valid schema and options in mock configuration',
      },
    ]);
  }

  /**
   * Diagnose hook failure and provide detailed analysis
   */
  public static diagnoseHookFailure(hookName: string, error: Error): DiagnosisReport {
    const startTime = Date.now();
    
    // Analyze error message against known patterns
    const matchedPattern = ERROR_PATTERNS.find(pattern => 
      pattern.pattern.test(error.message)
    );

    let diagnosis: MockDiagnosis;
    let confidence = 50; // Default confidence

    if (matchedPattern) {
      diagnosis = {
        category: matchedPattern.category,
        severity: matchedPattern.severity,
        rootCause: matchedPattern.rootCause,
        description: matchedPattern.description,
        affectedFeatures: MockDebugger.extractAffectedFeatures(error, hookName),
        quickFix: matchedPattern.quickFix,
      };
      confidence = 85; // High confidence for known patterns
    } else {
      // Generic diagnosis for unknown patterns
      diagnosis = {
        category: 'STRUCTURE',
        severity: 'medium',
        rootCause: 'Unknown mock configuration issue',
        description: `Hook '${hookName}' failed with error: ${error.message}`,
        affectedFeatures: [hookName],
      };
      confidence = 30; // Low confidence for unknown patterns
    }

    const recommendations = MockDebugger.generateRecommendations(hookName, error, diagnosis);
    const codeExamples = MockDebugger.generateCodeExamples(hookName, error, diagnosis);
    const relatedIssues = MockDebugger.findRelatedIssues(hookName, error);

    return {
      mockName: hookName,
      error,
      diagnosis,
      recommendations,
      codeExamples,
      relatedIssues,
      confidence,
      timestamp: Date.now() - startTime,
    };
  }

  /**
   * Generate detailed diff between expected and actual mock structures
   */
  public static generateMockDiff(expected: any, actual: any, mockName: string = 'unknown'): MockDiff {
    const expectedStructure = MockDebugger.analyzeStructure(expected, 'expected');
    const actualStructure = MockDebugger.analyzeStructure(actual, 'actual');
    
    const differences = MockDebugger.compareStructures(expectedStructure, actualStructure);
    const summary = MockDebugger.generateDiffSummary(differences);
    const fixSuggestions = MockDebugger.generateFixSuggestions(differences);
    const generatedCode = MockDebugger.generateFixCode(mockName, differences, expectedStructure);

    return {
      mockName,
      expected: expectedStructure,
      actual: actualStructure,
      differences,
      summary,
      fixSuggestions,
      generatedCode,
    };
  }

  /**
   * Analyze and compare mock structures
   */
  private static analyzeStructure(obj: any, source: 'expected' | 'actual' | 'inferred'): MockStructure {
    const properties: Record<string, PropertyInfo> = {};
    const methods: Record<string, MethodInfo> = {};

    if (obj && typeof obj === 'object') {
      // If it's a function (like a hook), analyze its return value
      if (typeof obj === 'function') {
        try {
          const returnValue = obj();
          return MockDebugger.analyzeStructure(returnValue, source);
        } catch (error) {
          // Function failed to execute, analyze the function itself
          methods['[function]'] = {
            type: 'function',
            parameters: [],
            returnType: 'unknown',
            required: true,
            isMocked: jest.isMockFunction(obj),
            description: 'Main function',
          };
        }
      } else {
        // Analyze object properties and methods
        Object.entries(obj).forEach(([key, value]) => {
          if (typeof value === 'function') {
            methods[key] = {
              type: 'function',
              parameters: MockDebugger.extractParameters(value),
              returnType: MockDebugger.inferReturnType(value),
              required: true, // Assume required for now
              isMocked: jest.isMockFunction(value),
              description: `Method ${key}`,
            };
          } else {
            properties[key] = {
              type: Array.isArray(value) ? 'array' : typeof value,
              value: value,
              required: true, // Assume required for now
              description: `Property ${key}`,
            };
          }
        });
      }
    }

    return {
      type: typeof obj === 'function' ? 'function' : 'object',
      properties,
      methods,
      metadata: {
        source,
        confidence: 80,
        lastUpdated: new Date(),
      },
    };
  }

  /**
   * Compare two mock structures and identify differences
   */
  private static compareStructures(expected: MockStructure, actual: MockStructure): MockDifference[] {
    const differences: MockDifference[] = [];

    // Compare properties
    Object.entries(expected.properties).forEach(([key, expectedProp]) => {
      const actualProp = actual.properties[key];
      
      if (!actualProp) {
        differences.push({
          type: 'MISSING',
          path: `properties.${key}`,
          expected: expectedProp,
          actual: undefined,
          severity: expectedProp.required ? 'critical' : 'medium',
          impact: `Property '${key}' is missing from mock`,
          suggestion: `Add ${key}: ${MockDebugger.generateDefaultValue(expectedProp.type)} to mock`,
        });
      } else if (expectedProp.type !== actualProp.type) {
        differences.push({
          type: 'TYPE_MISMATCH',
          path: `properties.${key}`,
          expected: expectedProp.type,
          actual: actualProp.type,
          severity: 'high',
          impact: `Property '${key}' has wrong type`,
          suggestion: `Change ${key} from ${actualProp.type} to ${expectedProp.type}`,
        });
      }
    });

    // Check for extra properties in actual
    Object.entries(actual.properties).forEach(([key, actualProp]) => {
      if (!expected.properties[key]) {
        differences.push({
          type: 'EXTRA',
          path: `properties.${key}`,
          expected: undefined,
          actual: actualProp,
          severity: 'low',
          impact: `Extra property '${key}' in mock`,
          suggestion: `Consider removing ${key} or adding it to expected structure`,
        });
      }
    });

    // Compare methods
    Object.entries(expected.methods).forEach(([key, expectedMethod]) => {
      const actualMethod = actual.methods[key];
      
      if (!actualMethod) {
        differences.push({
          type: 'MISSING',
          path: `methods.${key}`,
          expected: expectedMethod,
          actual: undefined,
          severity: expectedMethod.required ? 'critical' : 'medium',
          impact: `Method '${key}' is missing from mock`,
          suggestion: `Add ${key}: jest.fn() to mock`,
        });
      } else if (!actualMethod.isMocked && expectedMethod.required) {
        differences.push({
          type: 'TYPE_MISMATCH',
          path: `methods.${key}`,
          expected: 'jest.MockedFunction',
          actual: 'function',
          severity: 'medium',
          impact: `Method '${key}' is not a jest mock`,
          suggestion: `Replace ${key} with jest.fn()`,
        });
      }
    });

    // Check for extra methods in actual
    Object.entries(actual.methods).forEach(([key, actualMethod]) => {
      if (!expected.methods[key]) {
        differences.push({
          type: 'EXTRA',
          path: `methods.${key}`,
          expected: undefined,
          actual: actualMethod,
          severity: 'low',
          impact: `Extra method '${key}' in mock`,
          suggestion: `Consider removing ${key} or adding it to expected structure`,
        });
      }
    });

    return differences;
  }

  /**
   * Generate summary of differences
   */
  private static generateDiffSummary(differences: MockDifference[]): DiffSummary {
    const totalDifferences = differences.length;
    const criticalIssues = differences.filter(d => d.severity === 'critical').length;
    const missingItems = differences.filter(d => d.type === 'MISSING').length;
    const extraItems = differences.filter(d => d.type === 'EXTRA').length;
    const typeMismatches = differences.filter(d => d.type === 'TYPE_MISMATCH').length;

    let overallHealth: DiffSummary['overallHealth'];
    let compatibilityScore: number;

    if (criticalIssues > 0) {
      overallHealth = 'critical';
      compatibilityScore = Math.max(0, 30 - (criticalIssues * 10));
    } else if (totalDifferences > 10) {
      overallHealth = 'poor';
      compatibilityScore = Math.max(20, 60 - (totalDifferences * 2));
    } else if (totalDifferences > 5) {
      overallHealth = 'fair';
      compatibilityScore = Math.max(40, 80 - (totalDifferences * 3));
    } else if (totalDifferences > 0) {
      overallHealth = 'good';
      compatibilityScore = Math.max(70, 95 - (totalDifferences * 5));
    } else {
      overallHealth = 'excellent';
      compatibilityScore = 100;
    }

    return {
      totalDifferences,
      criticalIssues,
      missingItems,
      extraItems,
      typeMismatches,
      overallHealth,
      compatibilityScore,
    };
  }

  /**
   * Generate fix suggestions based on differences
   */
  private static generateFixSuggestions(differences: MockDifference[]): string[] {
    const suggestions: string[] = [];
    
    // Group suggestions by type
    const criticalIssues = differences.filter(d => d.severity === 'critical');
    const missingMethods = differences.filter(d => d.type === 'MISSING' && d.path.startsWith('methods.'));
    const missingProperties = differences.filter(d => d.type === 'MISSING' && d.path.startsWith('properties.'));
    const typeMismatches = differences.filter(d => d.type === 'TYPE_MISMATCH');

    if (criticalIssues.length > 0) {
      suggestions.push(`🚨 Fix ${criticalIssues.length} critical issue(s) immediately to prevent test failures`);
    }

    if (missingMethods.length > 0) {
      suggestions.push(`➕ Add ${missingMethods.length} missing method(s): ${missingMethods.map(d => d.path.split('.')[1]).join(', ')}`);
    }

    if (missingProperties.length > 0) {
      suggestions.push(`📝 Add ${missingProperties.length} missing propert(y/ies): ${missingProperties.map(d => d.path.split('.')[1]).join(', ')}`);
    }

    if (typeMismatches.length > 0) {
      suggestions.push(`🔧 Fix ${typeMismatches.length} type mismatch(es) for better compatibility`);
    }

    // Add specific suggestions
    differences.forEach(diff => {
      if (diff.severity === 'critical' || diff.severity === 'high') {
        suggestions.push(`• ${diff.suggestion}`);
      }
    });

    return suggestions;
  }

  /**
   * Generate code to fix identified issues
   */
  private static generateFixCode(mockName: string, differences: MockDifference[], expectedStructure: MockStructure): string {
    const lines: string[] = [];
    
    lines.push(`// Generated fix for ${mockName} mock`);
    lines.push(`// Apply these changes to resolve ${differences.length} identified issue(s)`);
    lines.push('');

    // Generate mock structure
    lines.push(`const mock${mockName} = jest.fn(() => ({`);

    // Add properties
    Object.entries(expectedStructure.properties).forEach(([key, prop]) => {
      const defaultValue = MockDebugger.generateDefaultValue(prop.type);
      lines.push(`  ${key}: ${JSON.stringify(defaultValue)}, // ${prop.type}`);
    });

    // Add methods
    Object.entries(expectedStructure.methods).forEach(([key, method]) => {
      if (method.returnType === 'Promise') {
        lines.push(`  ${key}: jest.fn().mockResolvedValue({}), // async ${method.returnType}`);
      } else {
        lines.push(`  ${key}: jest.fn(), // ${method.returnType}`);
      }
    });

    lines.push('}));');
    lines.push('');

    // Add specific fixes for critical issues
    const criticalIssues = differences.filter(d => d.severity === 'critical');
    if (criticalIssues.length > 0) {
      lines.push('// Critical fixes:');
      criticalIssues.forEach(issue => {
        lines.push(`// ${issue.suggestion}`);
      });
    }

    return lines.join('\n');
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private static extractAffectedFeatures(error: Error, hookName: string): string[] {
    const features = [hookName];
    
    // Extract additional features from error stack trace
    if (error.stack) {
      const stackLines = error.stack.split('\n');
      stackLines.forEach(line => {
        // Look for component names in stack trace
        const componentMatch = line.match(/at (\w+Component|\w+Form|\w+Page)/);
        if (componentMatch) {
          features.push(componentMatch[1]);
        }
        
        // Also look for file names that might indicate components
        const fileMatch = line.match(/at.*\/(\w+)\.(tsx?|jsx?):/);
        if (fileMatch && fileMatch[1] !== 'index') {
          features.push(fileMatch[1]);
        }
      });
    }

    return [...new Set(features)]; // Remove duplicates
  }

  private static generateRecommendations(hookName: string, error: Error, diagnosis: MockDiagnosis): DiagnosisRecommendation[] {
    const recommendations: DiagnosisRecommendation[] = [];

    // Add immediate fix if available
    if (diagnosis.quickFix) {
      recommendations.push({
        priority: 'immediate',
        action: 'Apply Quick Fix',
        description: diagnosis.quickFix,
        estimatedEffort: 'minutes',
      });
    }

    // Add category-specific recommendations
    switch (diagnosis.category) {
      case 'STRUCTURE':
        recommendations.push({
          priority: 'high',
          action: 'Fix Mock Structure',
          description: `Update ${hookName} mock to match expected interface`,
          codeExample: MockDebugger.generateStructureExample(hookName),
          estimatedEffort: 'minutes',
        });
        break;

      case 'TYPE':
        recommendations.push({
          priority: 'high',
          action: 'Fix Type Mismatch',
          description: 'Ensure all mock methods are jest.fn() and properties have correct types',
          estimatedEffort: 'minutes',
        });
        break;

      case 'DEPENDENCY':
        recommendations.push({
          priority: 'medium',
          action: 'Check Dependencies',
          description: 'Verify all required dependencies are mocked or available',
          estimatedEffort: 'hours',
          dependencies: ['Check imports', 'Verify mock setup order'],
        });
        break;

      case 'CONFIGURATION':
        recommendations.push({
          priority: 'high',
          action: 'Update Configuration',
          description: 'Review Jest configuration and test setup files',
          estimatedEffort: 'hours',
          dependencies: ['jest.config.js', 'jest.setup.js'],
        });
        break;
    }

    // Add validation recommendation
    recommendations.push({
      priority: 'medium',
      action: 'Validate Mock',
      description: 'Use MockValidator to ensure mock completeness',
      codeExample: `import { mockValidator } from '@/lib/testing/MockValidator';\nmockValidator.validateHookMock('${hookName}', mock);`,
      estimatedEffort: 'minutes',
    });

    return recommendations;
  }

  private static generateCodeExamples(hookName: string, error: Error, diagnosis: MockDiagnosis): CodeExample[] {
    const examples: CodeExample[] = [];

    // Generate hook-specific examples
    if (hookName === 'useToast') {
      examples.push({
        title: 'Complete useToast Mock',
        description: 'Comprehensive mock that matches the actual useToast implementation',
        after: `
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
`,
        language: 'typescript',
        category: 'fix',
      });
    }

    if (hookName === 'useEnhancedForm') {
      examples.push({
        title: 'Enhanced Form Mock Setup',
        description: 'Mock that includes all react-hook-form methods plus enhanced features',
        after: `
const mockUseEnhancedForm = jest.fn(() => ({
  // Standard react-hook-form methods
  register: jest.fn(),
  handleSubmit: jest.fn(fn => jest.fn()),
  watch: jest.fn(),
  getValues: jest.fn(),
  setValue: jest.fn(),
  formState: { errors: {}, isValid: true, isDirty: false },
  
  // Enhanced methods
  validateField: jest.fn().mockResolvedValue({}),
  getFieldValidation: jest.fn(() => ({ isValid: true, errors: [] })),
  saveNow: jest.fn().mockResolvedValue({}),
  isSaving: false,
  submitWithFeedback: jest.fn().mockResolvedValue({}),
  focusFirstError: jest.fn(),
  announceFormState: jest.fn(),
}));
`,
        language: 'typescript',
        category: 'fix',
      });
    }

    // Add generic example for unknown hooks
    if (examples.length === 0) {
      examples.push({
        title: `Generic ${hookName} Mock`,
        description: 'Basic mock structure - customize based on actual hook interface',
        after: `
const mock${hookName} = jest.fn(() => ({
  // Add properties and methods based on actual ${hookName} interface
  // Use jest.fn() for methods, appropriate types for properties
}));
`,
        language: 'typescript',
        category: 'fix',
      });
    }

    return examples;
  }

  private static findRelatedIssues(hookName: string, error: Error): RelatedIssue[] {
    const issues: RelatedIssue[] = [];

    // Check for common related issues
    if (error.message.includes('is not a function')) {
      issues.push({
        type: 'similar_error',
        description: 'Similar "not a function" errors often indicate incomplete mocks',
        suggestion: 'Check all methods in the mock are jest.fn()',
      });
    }

    if (error.message.includes('Cannot read properties')) {
      issues.push({
        type: 'dependency',
        description: 'Property access errors suggest missing mock structure',
        suggestion: 'Ensure all expected properties are defined in the mock',
      });
    }

    if (hookName.includes('Form')) {
      issues.push({
        type: 'configuration',
        description: 'Form hooks often require react-hook-form setup',
        suggestion: 'Verify react-hook-form is properly mocked',
      });
    }

    return issues;
  }

  private static generateStructureExample(hookName: string): string {
    return `
// Example structure for ${hookName}
const mock = jest.fn(() => ({
  // Add all expected properties and methods
  // Use appropriate types and jest.fn() for functions
}));
`;
  }

  private static extractParameters(func: Function): ParameterInfo[] {
    // Basic parameter extraction - could be enhanced with AST parsing
    const funcStr = func.toString();
    const paramMatch = funcStr.match(/\(([^)]*)\)/);
    
    if (!paramMatch || !paramMatch[1].trim()) {
      return [];
    }

    return paramMatch[1].split(',').map((param, index) => ({
      name: param.trim() || `param${index}`,
      type: 'any',
      optional: param.includes('?') || param.includes('='),
    }));
  }

  private static inferReturnType(func: Function): string {
    if (jest.isMockFunction(func)) {
      // Check if mock has a return value configured
      const mock = func as jest.MockedFunction<any>;
      if (mock.getMockImplementation()) {
        return 'any'; // Could be enhanced to analyze implementation
      }
    }
    
    return 'unknown';
  }

  private static generateDefaultValue(type: string): any {
    switch (type) {
      case 'string':
        return 'test-value';
      case 'number':
        return 0;
      case 'boolean':
        return false;
      case 'array':
        return [];
      case 'object':
        return {};
      case 'function':
        return 'jest.fn()';
      default:
        return null;
    }
  }

  /**
   * Get diagnosis history for a specific mock
   */
  public getDiagnosisHistory(mockName: string): DiagnosisReport[] {
    return this.diagnosisHistory.get(mockName) || [];
  }

  /**
   * Add diagnosis to history
   */
  public addDiagnosis(report: DiagnosisReport): void {
    if (!this.diagnosisHistory.has(report.mockName)) {
      this.diagnosisHistory.set(report.mockName, []);
    }
    
    const history = this.diagnosisHistory.get(report.mockName)!;
    history.push(report);
    
    // Keep only last 20 diagnoses
    if (history.length > 20) {
      history.shift();
    }
  }

  /**
   * Clear diagnosis history
   */
  public clearHistory(): void {
    this.diagnosisHistory.clear();
  }

  /**
   * Get performance metrics for mock operations
   */
  public getPerformanceMetrics(mockName: string): number[] {
    return this.performanceMetrics.get(mockName) || [];
  }

  /**
   * Record performance metric
   */
  public recordPerformance(mockName: string, duration: number): void {
    if (!this.performanceMetrics.has(mockName)) {
      this.performanceMetrics.set(mockName, []);
    }
    
    const metrics = this.performanceMetrics.get(mockName)!;
    metrics.push(duration);
    
    // Keep only last 100 measurements
    if (metrics.length > 100) {
      metrics.shift();
    }
  }

  /**
   * Generate comprehensive debugging report
   */
  public generateDebugReport(mockName: string, error?: Error): string {
    const lines: string[] = [];
    
    lines.push(`# Mock Debug Report: ${mockName}`);
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push('');

    // Add error analysis if provided
    if (error) {
      const diagnosis = MockDebugger.diagnoseHookFailure(mockName, error);
      lines.push('## Error Analysis');
      lines.push(`**Category:** ${diagnosis.diagnosis.category}`);
      lines.push(`**Severity:** ${diagnosis.diagnosis.severity}`);
      lines.push(`**Root Cause:** ${diagnosis.diagnosis.rootCause}`);
      lines.push(`**Confidence:** ${diagnosis.confidence}%`);
      lines.push('');
      lines.push(`**Description:** ${diagnosis.diagnosis.description}`);
      lines.push('');

      if (diagnosis.diagnosis.quickFix) {
        lines.push('## Quick Fix');
        lines.push(diagnosis.diagnosis.quickFix);
        lines.push('');
      }

      lines.push('## Recommendations');
      diagnosis.recommendations.forEach((rec, index) => {
        lines.push(`${index + 1}. **${rec.action}** (${rec.priority} priority)`);
        lines.push(`   ${rec.description}`);
        if (rec.codeExample) {
          lines.push('   ```typescript');
          lines.push(rec.codeExample);
          lines.push('   ```');
        }
        lines.push('');
      });
    }

    // Add history if available
    const history = this.getDiagnosisHistory(mockName);
    if (history.length > 0) {
      lines.push('## Recent Issues');
      history.slice(-5).forEach((report, index) => {
        lines.push(`${index + 1}. ${report.diagnosis.rootCause} (${report.diagnosis.severity})`);
      });
      lines.push('');
    }

    // Add performance metrics if available
    const metrics = this.getPerformanceMetrics(mockName);
    if (metrics.length > 0) {
      const avgTime = metrics.reduce((a, b) => a + b, 0) / metrics.length;
      lines.push('## Performance Metrics');
      lines.push(`Average diagnosis time: ${avgTime.toFixed(2)}ms`);
      lines.push(`Total diagnoses: ${metrics.length}`);
      lines.push('');
    }

    return lines.join('\n');
  }
}

// Export singleton instance
export const mockDebugger = new MockDebugger();
export default mockDebugger;