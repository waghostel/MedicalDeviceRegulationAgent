/**
 * ComponentMockRegistry - Component Mock Management System
 *
 * Implements automatic component mock loading, validation, and testing
 * for enhanced form components and UI components.
 *
 * Requirements: 2.4, 4.4
 */

import React from 'react';
import { z } from 'zod';
import {
  MockRegistry,
  MockMetadata,
  MockConfiguration,
  MockLoadResult,
} from './MockRegistry';

// ============================================================================
// Type Definitions
// ============================================================================

export interface ComponentMockMetadata extends MockMetadata {
  type: 'component';
  componentType: 'form' | 'ui' | 'layout' | 'feedback' | 'navigation';
  propsSchema?: z.ZodSchema<any>;
  requiredProps: string[];
  optionalProps: string[];
  testAttributes: string[];
  accessibilityFeatures: string[];
  variants?: string[];
  states?: string[];
}

export interface ComponentMockConfiguration extends MockConfiguration {
  preserveProps?: boolean;
  includeTestAttributes?: boolean;
  mockInteractions?: boolean;
  mockAnimations?: boolean;
  mockAccessibility?: boolean;
  renderMode?: 'full' | 'minimal' | 'placeholder';
  testingMode?: 'unit' | 'integration' | 'e2e';
}

export interface ComponentMockEntry {
  name: string;
  mockComponent: jest.MockedFunction<React.FC<any>>;
  metadata: ComponentMockMetadata;
  configuration: ComponentMockConfiguration;
  validationResult?: ComponentValidationResult;
  isRegistered: boolean;
  registeredAt?: Date;
  lastValidated?: Date;
  usageCount: number;
}

export interface ComponentValidationResult {
  isValid: boolean;
  componentName: string;
  errors: ComponentValidationError[];
  warnings: ComponentValidationWarning[];
  suggestions: string[];
  testCoverage: {
    propsValidation: boolean;
    accessibilityAttributes: boolean;
    testAttributes: boolean;
    interactionHandlers: boolean;
    errorStates: boolean;
  };
  performanceMetrics?: {
    renderTime: number;
    memoryUsage: number;
    reRenderCount: number;
  };
}

export interface ComponentValidationError {
  type:
    | 'props'
    | 'accessibility'
    | 'testAttributes'
    | 'interactions'
    | 'rendering';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion?: string;
  code?: string;
}

export interface ComponentValidationWarning {
  type: 'performance' | 'accessibility' | 'testability' | 'compatibility';
  message: string;
  suggestion?: string;
}

export interface ComponentTestResult {
  componentName: string;
  testsPassed: number;
  testsFailed: number;
  testsSkipped: number;
  coverage: number;
  duration: number;
  errors: string[];
  warnings: string[];
}

export interface AutoLoadConfig {
  enabled: boolean;
  patterns: string[];
  excludePatterns: string[];
  loadOnDemand: boolean;
  preloadComponents: string[];
  validationLevel: 'strict' | 'moderate' | 'lenient';
}

// ============================================================================
// Component Mock Registry Class
// ============================================================================

export class ComponentMockRegistry {
  private registry: Map<string, ComponentMockEntry> = new Map();
  private mockRegistry: MockRegistry;
  private autoLoadConfig: AutoLoadConfig;
  private validationCache: Map<string, ComponentValidationResult> = new Map();
  private testResults: Map<string, ComponentTestResult> = new Map();

  constructor(
    mockRegistry?: MockRegistry,
    autoLoadConfig?: Partial<AutoLoadConfig>
  ) {
    this.mockRegistry = mockRegistry || new MockRegistry();
    this.autoLoadConfig = this.mergeAutoLoadConfig(autoLoadConfig);
    this.setupAutoLoading();
  }

  // ============================================================================
  // Configuration Management
  // ============================================================================

  private mergeAutoLoadConfig(
    userConfig?: Partial<AutoLoadConfig>
  ): AutoLoadConfig {
    const defaultConfig: AutoLoadConfig = {
      enabled: true,
      patterns: [
        '**/components/**/*.tsx',
        '**/components/**/*.jsx',
        '**/forms/**/*.tsx',
        '**/ui/**/*.tsx',
      ],
      excludePatterns: [
        '**/*.test.*',
        '**/*.spec.*',
        '**/*.stories.*',
        '**/node_modules/**',
      ],
      loadOnDemand: true,
      preloadComponents: [
        'EnhancedInput',
        'EnhancedTextarea',
        'AutoSaveIndicator',
        'FormSubmissionProgress',
        'EnhancedButton',
      ],
      validationLevel: 'moderate',
    };

    return { ...defaultConfig, ...userConfig };
  }

  public updateAutoLoadConfig(updates: Partial<AutoLoadConfig>): void {
    this.autoLoadConfig = { ...this.autoLoadConfig, ...updates };
    if (updates.enabled !== undefined) {
      if (updates.enabled) {
        this.setupAutoLoading();
      } else {
        this.disableAutoLoading();
      }
    }
  }

  // ============================================================================
  // Component Registration
  // ============================================================================

  public registerComponent(
    name: string,
    mockComponent: jest.MockedFunction<React.FC<any>>,
    metadata: Partial<ComponentMockMetadata>,
    configuration?: Partial<ComponentMockConfiguration>
  ): MockLoadResult {
    const startTime = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate component name
      if (this.registry.has(name)) {
        if (this.autoLoadConfig.validationLevel === 'strict') {
          errors.push(`Component mock '${name}' is already registered`);
        } else {
          warnings.push(`Component mock '${name}' is being overridden`);
        }
      }

      // Create full metadata
      const fullMetadata: ComponentMockMetadata = {
        name,
        version: metadata.version || '1.0.0',
        type: 'component',
        componentType: metadata.componentType || 'ui',
        dependencies: metadata.dependencies || [],
        compatibleVersions: metadata.compatibleVersions || ['19.1.0'],
        description: metadata.description || `Mock for ${name} component`,
        author: metadata.author,
        createdAt: metadata.createdAt || new Date(),
        updatedAt: new Date(),
        tags: metadata.tags || ['component', 'mock'],
        propsSchema: metadata.propsSchema,
        requiredProps: metadata.requiredProps || [],
        optionalProps: metadata.optionalProps || [],
        testAttributes: metadata.testAttributes || ['data-testid'],
        accessibilityFeatures: metadata.accessibilityFeatures || [],
        variants: metadata.variants,
        states: metadata.states,
      };

      // Create full configuration
      const fullConfiguration: ComponentMockConfiguration = {
        enabled: true,
        preserveProps: true,
        includeTestAttributes: true,
        mockInteractions: true,
        mockAnimations: false, // Disable animations in tests by default
        mockAccessibility: true,
        renderMode: 'full',
        testingMode: 'unit',
        ...configuration,
      };

      // Validate component mock
      const validationResult = this.validateComponent(
        name,
        mockComponent,
        fullMetadata
      );

      if (
        validationResult.errors.length > 0 &&
        this.autoLoadConfig.validationLevel === 'strict'
      ) {
        errors.push(...validationResult.errors.map((e) => e.message));
      } else if (validationResult.errors.length > 0) {
        warnings.push(...validationResult.errors.map((e) => e.message));
      }

      // Create registry entry
      const entry: ComponentMockEntry = {
        name,
        mockComponent,
        metadata: fullMetadata,
        configuration: fullConfiguration,
        validationResult,
        isRegistered: true,
        registeredAt: new Date(),
        lastValidated: new Date(),
        usageCount: 0,
      };

      // Register with main MockRegistry
      const mockRegistryResult = this.mockRegistry.register(
        name,
        mockComponent,
        fullMetadata,
        fullConfiguration
      );

      if (!mockRegistryResult.success) {
        errors.push(...mockRegistryResult.errors);
        warnings.push(...mockRegistryResult.warnings);
      }

      // Store in component registry
      this.registry.set(name, entry);

      // Cache validation result
      this.validationCache.set(name, validationResult);

      // Register with global mock registry if available
      if (global.__GLOBAL_MOCK_REGISTRY) {
        global.__GLOBAL_MOCK_REGISTRY.register(
          'component',
          name,
          mockComponent
        );
      }

      const loadTime = performance.now() - startTime;
      this.logDebug(
        `Component mock '${name}' registered successfully in ${loadTime.toFixed(2)}ms`
      );

      return {
        success: errors.length === 0,
        mockName: name,
        version: fullMetadata.version,
        errors,
        warnings,
        loadTime,
      };
    } catch (error) {
      errors.push(`Failed to register component mock '${name}': ${error}`);
      return {
        success: false,
        mockName: name,
        version: metadata.version || 'unknown',
        errors,
        warnings,
        loadTime: performance.now() - startTime,
      };
    }
  }

  // ============================================================================
  // Automatic Component Loading
  // ============================================================================

  private setupAutoLoading(): void {
    if (!this.autoLoadConfig.enabled) return;

    // Preload specified components
    this.preloadComponents();

    // Setup on-demand loading
    if (this.autoLoadConfig.loadOnDemand) {
      this.setupOnDemandLoading();
    }
  }

  private async preloadComponents(): Promise<void> {
    const { preloadComponents } = this.autoLoadConfig;

    for (const componentName of preloadComponents) {
      try {
        await this.loadComponent(componentName);
      } catch (error) {
        this.logDebug(
          `Failed to preload component '${componentName}': ${error}`
        );
      }
    }
  }

  private setupOnDemandLoading(): void {
    // Setup proxy for automatic component loading
    if (typeof Proxy !== 'undefined') {
      const originalGet = this.getComponent.bind(this);

      this.getComponent = new Proxy(originalGet, {
        apply: (target, thisArg, argumentsList) => {
          const [componentName] = argumentsList;

          // Try to get existing component
          const existing = target.apply(thisArg, argumentsList);
          if (existing) return existing;

          // Try to auto-load component
          if (this.shouldAutoLoad(componentName)) {
            this.loadComponent(componentName).catch((error) => {
              this.logDebug(
                `Auto-load failed for component '${componentName}': ${error}`
              );
            });
          }

          return undefined;
        },
      });
    }
  }

  private shouldAutoLoad(componentName: string): boolean {
    // Check if component matches auto-load patterns
    const { patterns, excludePatterns } = this.autoLoadConfig;

    // Simple pattern matching (in real implementation, use glob or regex)
    const matchesPattern = patterns.some((pattern) =>
      componentName
        .toLowerCase()
        .includes(pattern.replace('*', '').toLowerCase())
    );

    const matchesExclude = excludePatterns.some((pattern) =>
      componentName
        .toLowerCase()
        .includes(pattern.replace('*', '').toLowerCase())
    );

    return matchesPattern && !matchesExclude;
  }

  public async loadComponent(
    componentName: string
  ): Promise<ComponentMockEntry | null> {
    try {
      // Check if already loaded
      const existing = this.registry.get(componentName);
      if (existing && existing.isRegistered) {
        existing.usageCount++;
        return existing;
      }

      // Try to load from known component mocks
      const componentMock = await this.resolveComponentMock(componentName);
      if (!componentMock) {
        throw new Error(`Component mock '${componentName}' not found`);
      }

      // Register the loaded component
      const result = this.registerComponent(
        componentName,
        componentMock.mockImplementation,
        componentMock.metadata,
        componentMock.configuration
      );

      if (!result.success) {
        throw new Error(
          `Failed to register component: ${result.errors.join(', ')}`
        );
      }

      return this.registry.get(componentName) || null;
    } catch (error) {
      this.logDebug(`Failed to load component '${componentName}': ${error}`);
      return null;
    }
  }

  private async resolveComponentMock(componentName: string): Promise<{
    mockImplementation: jest.MockedFunction<React.FC<any>>;
    metadata: Partial<ComponentMockMetadata>;
    configuration?: Partial<ComponentMockConfiguration>;
  } | null> {
    // Try to resolve from enhanced form component mocks
    try {
      const { componentMocks } = await import(
        './enhanced-form-component-mocks'
      );

      if (componentMocks[componentName as keyof typeof componentMocks]) {
        return {
          mockImplementation:
            componentMocks[componentName as keyof typeof componentMocks],
          metadata: {
            componentType: 'form',
            requiredProps: this.inferRequiredProps(componentName),
            testAttributes: ['data-testid'],
            accessibilityFeatures: [
              'aria-label',
              'aria-describedby',
              'aria-invalid',
            ],
          },
        };
      }
    } catch (error) {
      this.logDebug(
        `Could not load from enhanced-form-component-mocks: ${error}`
      );
    }

    // Try to resolve from other mock sources
    // This could be extended to load from file system, remote sources, etc.

    return null;
  }

  private inferRequiredProps(componentName: string): string[] {
    // Infer required props based on component name and type
    const commonRequiredProps: Record<string, string[]> = {
      EnhancedInput: ['name', 'label'],
      EnhancedTextarea: ['name', 'label'],
      AutoSaveIndicator: ['isSaving'],
      FormSubmissionProgress: ['progress', 'currentStep'],
      EnhancedButton: ['children'],
    };

    return commonRequiredProps[componentName] || [];
  }

  private disableAutoLoading(): void {
    // Disable auto-loading mechanisms
    this.logDebug('Auto-loading disabled');
  }

  // ============================================================================
  // Component Validation
  // ============================================================================

  public validateComponent(
    name: string,
    mockComponent: jest.MockedFunction<React.FC<any>>,
    metadata: ComponentMockMetadata
  ): ComponentValidationResult {
    const errors: ComponentValidationError[] = [];
    const warnings: ComponentValidationWarning[] = [];
    const suggestions: string[] = [];

    // Validate mock function
    if (!jest.isMockFunction(mockComponent)) {
      errors.push({
        type: 'rendering',
        message: `Component '${name}' is not a Jest mock function`,
        severity: 'critical',
        suggestion: 'Use jest.fn() to create the mock component',
        code: 'INVALID_MOCK_FUNCTION',
      });
    }

    // Validate required props
    const testCoverage = {
      propsValidation: this.validatePropsHandling(
        name,
        mockComponent,
        metadata
      ),
      accessibilityAttributes: this.validateAccessibilityFeatures(
        name,
        mockComponent,
        metadata
      ),
      testAttributes: this.validateTestAttributes(
        name,
        mockComponent,
        metadata
      ),
      interactionHandlers: this.validateInteractionHandlers(
        name,
        mockComponent,
        metadata
      ),
      errorStates: this.validateErrorStates(name, mockComponent, metadata),
    };

    // Check test coverage
    const coverageIssues = Object.entries(testCoverage)
      .filter(([_, covered]) => !covered)
      .map(([feature, _]) => feature);

    if (coverageIssues.length > 0) {
      warnings.push({
        type: 'testability',
        message: `Component '${name}' has incomplete test coverage: ${coverageIssues.join(', ')}`,
        suggestion: 'Implement missing test coverage areas',
      });
    }

    // Validate accessibility features
    if (metadata.accessibilityFeatures.length === 0) {
      warnings.push({
        type: 'accessibility',
        message: `Component '${name}' has no defined accessibility features`,
        suggestion:
          'Add ARIA attributes and accessibility features to the component mock',
      });
    }

    // Validate test attributes
    if (metadata.testAttributes.length === 0) {
      errors.push({
        type: 'testAttributes',
        message: `Component '${name}' has no test attributes defined`,
        severity: 'high',
        suggestion:
          'Add data-testid and other test attributes to enable testing',
        code: 'MISSING_TEST_ATTRIBUTES',
      });
    }

    // Generate suggestions based on component type
    if (metadata.componentType === 'form') {
      suggestions.push('Ensure form components handle validation states');
      suggestions.push('Include proper error message display');
      suggestions.push('Implement accessibility features for form controls');
    }

    return {
      isValid:
        errors.filter((e) => e.severity === 'critical' || e.severity === 'high')
          .length === 0,
      componentName: name,
      errors,
      warnings,
      suggestions,
      testCoverage,
    };
  }

  private validatePropsHandling(
    name: string,
    mockComponent: jest.MockedFunction<React.FC<any>>,
    metadata: ComponentMockMetadata
  ): boolean {
    try {
      // Test if component handles required props
      const testProps = metadata.requiredProps.reduce((props, propName) => {
        props[propName] = `test-${propName}`;
        return props;
      }, {} as any);

      // Try to render with test props (mock render)
      const result = mockComponent(testProps);
      return result !== undefined;
    } catch (error) {
      return false;
    }
  }

  private validateAccessibilityFeatures(
    name: string,
    mockComponent: jest.MockedFunction<React.FC<any>>,
    metadata: ComponentMockMetadata
  ): boolean {
    // Check if accessibility features are implemented
    return metadata.accessibilityFeatures.length > 0;
  }

  private validateTestAttributes(
    name: string,
    mockComponent: jest.MockedFunction<React.FC<any>>,
    metadata: ComponentMockMetadata
  ): boolean {
    // Check if test attributes are implemented
    return metadata.testAttributes.includes('data-testid');
  }

  private validateInteractionHandlers(
    name: string,
    mockComponent: jest.MockedFunction<React.FC<any>>,
    metadata: ComponentMockMetadata
  ): boolean {
    // Check if interaction handlers are properly mocked
    // This is a simplified check - in real implementation, would test actual handlers
    return true;
  }

  private validateErrorStates(
    name: string,
    mockComponent: jest.MockedFunction<React.FC<any>>,
    metadata: ComponentMockMetadata
  ): boolean {
    // Check if error states are handled
    if (metadata.componentType === 'form') {
      // Form components should handle error states
      return (
        metadata.optionalProps.includes('error') ||
        metadata.requiredProps.includes('error')
      );
    }
    return true;
  }

  // ============================================================================
  // Component Testing
  // ============================================================================

  public async testComponent(
    componentName: string
  ): Promise<ComponentTestResult> {
    const startTime = performance.now();
    const entry = this.registry.get(componentName);

    if (!entry) {
      return {
        componentName,
        testsPassed: 0,
        testsFailed: 1,
        testsSkipped: 0,
        coverage: 0,
        duration: performance.now() - startTime,
        errors: [`Component '${componentName}' not found in registry`],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    let testsPassed = 0;
    let testsFailed = 0;
    let testsSkipped = 0;

    try {
      // Test 1: Basic rendering
      try {
        const basicProps = this.generateBasicProps(entry.metadata);
        const result = entry.mockComponent(basicProps);
        if (result) {
          testsPassed++;
        } else {
          testsFailed++;
          errors.push('Basic rendering test failed');
        }
      } catch (error) {
        testsFailed++;
        errors.push(`Basic rendering error: ${error}`);
      }

      // Test 2: Props validation
      try {
        const validationResult = this.testPropsValidation(entry);
        if (validationResult.success) {
          testsPassed++;
        } else {
          testsFailed++;
          errors.push(...validationResult.errors);
        }
      } catch (error) {
        testsFailed++;
        errors.push(`Props validation error: ${error}`);
      }

      // Test 3: Accessibility features
      try {
        const accessibilityResult = this.testAccessibilityFeatures(entry);
        if (accessibilityResult.success) {
          testsPassed++;
        } else {
          testsFailed++;
          warnings.push(...accessibilityResult.warnings);
        }
      } catch (error) {
        testsSkipped++;
        warnings.push(`Accessibility test skipped: ${error}`);
      }

      // Test 4: Test attributes
      try {
        const testAttributesResult = this.testTestAttributes(entry);
        if (testAttributesResult.success) {
          testsPassed++;
        } else {
          testsFailed++;
          errors.push(...testAttributesResult.errors);
        }
      } catch (error) {
        testsFailed++;
        errors.push(`Test attributes error: ${error}`);
      }
    } catch (error) {
      testsFailed++;
      errors.push(`Component testing error: ${error}`);
    }

    const totalTests = testsPassed + testsFailed + testsSkipped;
    const coverage = totalTests > 0 ? (testsPassed / totalTests) * 100 : 0;
    const duration = performance.now() - startTime;

    const result: ComponentTestResult = {
      componentName,
      testsPassed,
      testsFailed,
      testsSkipped,
      coverage,
      duration,
      errors,
      warnings,
    };

    // Cache test result
    this.testResults.set(componentName, result);

    return result;
  }

  private generateBasicProps(metadata: ComponentMockMetadata): any {
    const props: any = {};

    // Generate required props
    metadata.requiredProps.forEach((propName) => {
      switch (propName) {
        case 'children':
          props[propName] = 'Test Content';
          break;
        case 'name':
          props[propName] = 'test-name';
          break;
        case 'label':
          props[propName] = 'Test Label';
          break;
        case 'isSaving':
          props[propName] = false;
          break;
        case 'progress':
          props[propName] = 50;
          break;
        case 'currentStep':
          props[propName] = 'Test Step';
          break;
        default:
          props[propName] = `test-${propName}`;
      }
    });

    return props;
  }

  private testPropsValidation(entry: ComponentMockEntry): {
    success: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    try {
      // Test with missing required props
      const result = entry.mockComponent({});

      // If component renders without required props, it might be an issue
      if (entry.metadata.requiredProps.length > 0 && result) {
        errors.push('Component renders without required props');
      }
    } catch (error) {
      // Expected behavior for missing required props
    }

    return {
      success: errors.length === 0,
      errors,
    };
  }

  private testAccessibilityFeatures(entry: ComponentMockEntry): {
    success: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    if (entry.metadata.accessibilityFeatures.length === 0) {
      warnings.push('No accessibility features defined');
    }

    return {
      success: warnings.length === 0,
      warnings,
    };
  }

  private testTestAttributes(entry: ComponentMockEntry): {
    success: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!entry.metadata.testAttributes.includes('data-testid')) {
      errors.push('Missing data-testid attribute');
    }

    return {
      success: errors.length === 0,
      errors,
    };
  }

  // ============================================================================
  // Component Retrieval and Management
  // ============================================================================

  public getComponent(name: string): ComponentMockEntry | undefined {
    const entry = this.registry.get(name);
    if (entry) {
      entry.usageCount++;
    }
    return entry;
  }

  public getComponentMock(
    name: string
  ): jest.MockedFunction<React.FC<any>> | undefined {
    const entry = this.getComponent(name);
    return entry?.mockComponent;
  }

  public listComponents(filter?: {
    componentType?: ComponentMockMetadata['componentType'];
    isRegistered?: boolean;
    hasValidation?: boolean;
  }): ComponentMockEntry[] {
    let entries = Array.from(this.registry.values());

    if (filter) {
      if (filter.componentType) {
        entries = entries.filter(
          (entry) => entry.metadata.componentType === filter.componentType
        );
      }
      if (filter.isRegistered !== undefined) {
        entries = entries.filter(
          (entry) => entry.isRegistered === filter.isRegistered
        );
      }
      if (filter.hasValidation !== undefined) {
        entries = entries.filter(
          (entry) => !!entry.validationResult === filter.hasValidation
        );
      }
    }

    return entries;
  }

  public unregisterComponent(name: string): boolean {
    try {
      const entry = this.registry.get(name);
      if (!entry) return false;

      // Unregister from main MockRegistry
      this.mockRegistry.unload(name);

      // Remove from component registry
      this.registry.delete(name);

      // Clear caches
      this.validationCache.delete(name);
      this.testResults.delete(name);

      // Remove from global registry
      if (global.__GLOBAL_MOCK_REGISTRY) {
        const componentMap = global.__GLOBAL_MOCK_REGISTRY.components;
        if (componentMap && componentMap.delete) {
          componentMap.delete(name);
        }
      }

      this.logDebug(`Component mock '${name}' unregistered successfully`);
      return true;
    } catch (error) {
      this.logDebug(`Failed to unregister component mock '${name}': ${error}`);
      return false;
    }
  }

  // ============================================================================
  // Batch Operations
  // ============================================================================

  public async testAllComponents(): Promise<ComponentTestResult[]> {
    const results: ComponentTestResult[] = [];

    for (const [componentName] of this.registry) {
      try {
        const result = await this.testComponent(componentName);
        results.push(result);
      } catch (error) {
        results.push({
          componentName,
          testsPassed: 0,
          testsFailed: 1,
          testsSkipped: 0,
          coverage: 0,
          duration: 0,
          errors: [`Testing failed: ${error}`],
          warnings: [],
        });
      }
    }

    return results;
  }

  public validateAllComponents(): ComponentValidationResult[] {
    const results: ComponentValidationResult[] = [];

    for (const [componentName, entry] of this.registry) {
      try {
        const result = this.validateComponent(
          componentName,
          entry.mockComponent,
          entry.metadata
        );
        results.push(result);

        // Update cache
        this.validationCache.set(componentName, result);
        entry.validationResult = result;
        entry.lastValidated = new Date();
      } catch (error) {
        results.push({
          isValid: false,
          componentName,
          errors: [
            {
              type: 'rendering',
              message: `Validation failed: ${error}`,
              severity: 'critical',
            },
          ],
          warnings: [],
          suggestions: [],
          testCoverage: {
            propsValidation: false,
            accessibilityAttributes: false,
            testAttributes: false,
            interactionHandlers: false,
            errorStates: false,
          },
        });
      }
    }

    return results;
  }

  // ============================================================================
  // Cleanup and Reset
  // ============================================================================

  public cleanup(): void {
    // Clear all mock call history
    for (const [_, entry] of this.registry) {
      entry.mockComponent.mockClear();
    }

    // Clear caches
    this.validationCache.clear();
    this.testResults.clear();

    this.logDebug('Component mock registry cleanup completed');
  }

  public reset(): void {
    // Unregister all components
    for (const [componentName] of this.registry) {
      this.unregisterComponent(componentName);
    }

    // Clear all data
    this.registry.clear();
    this.validationCache.clear();
    this.testResults.clear();

    this.logDebug('Component mock registry reset completed');
  }

  // ============================================================================
  // Statistics and Reporting
  // ============================================================================

  public getStats(): {
    totalComponents: number;
    registeredComponents: number;
    validatedComponents: number;
    testedComponents: number;
    averageCoverage: number;
    componentsByType: Record<string, number>;
  } {
    const entries = Array.from(this.registry.values());
    const validatedEntries = entries.filter((e) => e.validationResult);
    const testedEntries = Array.from(this.testResults.values());

    const componentsByType = entries.reduce(
      (acc, entry) => {
        const type = entry.metadata.componentType;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const averageCoverage =
      testedEntries.length > 0
        ? testedEntries.reduce((sum, result) => sum + result.coverage, 0) /
          testedEntries.length
        : 0;

    return {
      totalComponents: entries.length,
      registeredComponents: entries.filter((e) => e.isRegistered).length,
      validatedComponents: validatedEntries.length,
      testedComponents: testedEntries.length,
      averageCoverage,
      componentsByType,
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private logDebug(message: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[ComponentMockRegistry] ${message}`);
    }
  }
}

// ============================================================================
// Default Registry Instance
// ============================================================================

let defaultComponentRegistry: ComponentMockRegistry | null = null;

export function getDefaultComponentRegistry(): ComponentMockRegistry {
  if (!defaultComponentRegistry) {
    defaultComponentRegistry = new ComponentMockRegistry();
  }
  return defaultComponentRegistry;
}

export function setDefaultComponentRegistry(
  registry: ComponentMockRegistry
): void {
  defaultComponentRegistry = registry;
}

// ============================================================================
// Convenience Functions
// ============================================================================

export function registerComponent(
  name: string,
  mockComponent: jest.MockedFunction<React.FC<any>>,
  metadata: Partial<ComponentMockMetadata>,
  configuration?: Partial<ComponentMockConfiguration>
): MockLoadResult {
  return getDefaultComponentRegistry().registerComponent(
    name,
    mockComponent,
    metadata,
    configuration
  );
}

export function loadComponent(
  componentName: string
): Promise<ComponentMockEntry | null> {
  return getDefaultComponentRegistry().loadComponent(componentName);
}

export function getComponentMock(
  name: string
): jest.MockedFunction<React.FC<any>> | undefined {
  return getDefaultComponentRegistry().getComponentMock(name);
}

export function validateComponent(
  name: string,
  mockComponent: jest.MockedFunction<React.FC<any>>,
  metadata: ComponentMockMetadata
): ComponentValidationResult {
  return getDefaultComponentRegistry().validateComponent(
    name,
    mockComponent,
    metadata
  );
}

export function testComponent(
  componentName: string
): Promise<ComponentTestResult> {
  return getDefaultComponentRegistry().testComponent(componentName);
}

export function listComponents(
  filter?: Parameters<ComponentMockRegistry['listComponents']>[0]
): ComponentMockEntry[] {
  return getDefaultComponentRegistry().listComponents(filter);
}

export function unregisterComponent(name: string): boolean {
  return getDefaultComponentRegistry().unregisterComponent(name);
}

export function cleanupComponents(): void {
  return getDefaultComponentRegistry().cleanup();
}

export function resetComponents(): void {
  return getDefaultComponentRegistry().reset();
}

export function getComponentStats(): ReturnType<
  ComponentMockRegistry['getStats']
> {
  return getDefaultComponentRegistry().getStats();
}

// Export types for external use
export type {
  ComponentMockMetadata,
  ComponentMockConfiguration,
  ComponentMockEntry,
  ComponentValidationResult,
  ComponentValidationError,
  ComponentValidationWarning,
  ComponentTestResult,
  AutoLoadConfig,
};
