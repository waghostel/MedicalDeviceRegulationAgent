/**
 * Component Mock Registry Setup
 *
 * Integrates ComponentMockRegistry with existing enhanced form component mocks
 * and provides automatic loading and validation capabilities.
 *
 * Requirements: 2.4, 4.4
 */

import {
  ComponentMockRegistry,
  getDefaultComponentRegistry,
} from './ComponentMockRegistry';
import {
  componentMocks,
  registerEnhancedFormComponentMocks,
  setupEnhancedFormComponentMocks,
  cleanupEnhancedFormComponentMocks,
} from './enhanced-form-component-mocks';
import { MockRegistry, getDefaultRegistry } from './MockRegistry';

// ============================================================================
// Registry Setup and Integration
// ============================================================================

/**
 * Setup the ComponentMockRegistry with enhanced form components
 */
export function setupComponentMockRegistry(): ComponentMockRegistry {
  const mockRegistry = getDefaultRegistry();
  const componentRegistry = new ComponentMockRegistry(mockRegistry, {
    enabled: true,
    loadOnDemand: true,
    preloadComponents: [
      'EnhancedInput',
      'EnhancedTextarea',
      'AutoSaveIndicator',
      'FormSubmissionProgress',
      'EnhancedButton',
    ],
    validationLevel: 'moderate',
  });

  // Register all enhanced form components
  registerEnhancedFormComponentsWithRegistry(componentRegistry);

  return componentRegistry;
}

/**
 * Register enhanced form components with the ComponentMockRegistry
 */
export function registerEnhancedFormComponentsWithRegistry(
  componentRegistry: ComponentMockRegistry
): void {
  // Register EnhancedInput
  componentRegistry.registerComponent(
    'EnhancedInput',
    componentMocks.EnhancedInput,
    {
      name: 'EnhancedInput',
      version: '1.0.0',
      type: 'component',
      componentType: 'form',
      dependencies: [],
      compatibleVersions: ['19.1.0'],
      description:
        'Enhanced input component with validation, accessibility, and real-time feedback',
      tags: ['form', 'input', 'enhanced', 'validation', 'accessibility'],
      requiredProps: ['name', 'label'],
      optionalProps: [
        'type',
        'placeholder',
        'description',
        'required',
        'error',
        'value',
        'onChange',
        'onBlur',
        'onFocus',
        'disabled',
        'className',
        'maxLength',
        'showCharacterCount',
        'validation',
        'autoComplete',
        'autoFocus',
      ],
      testAttributes: [
        'data-testid',
        'data-error',
        'data-valid',
        'data-validating',
        'data-touched',
      ],
      accessibilityFeatures: [
        'aria-invalid',
        'aria-required',
        'aria-describedby',
        'role',
        'htmlFor',
      ],
      variants: ['text', 'email', 'password', 'tel', 'url', 'search'],
      states: ['valid', 'invalid', 'validating', 'touched', 'disabled'],
    },
    {
      enabled: true,
      preserveProps: true,
      includeTestAttributes: true,
      mockInteractions: true,
      mockAnimations: false,
      mockAccessibility: true,
      renderMode: 'full',
      testingMode: 'unit',
    }
  );

  // Register EnhancedTextarea
  componentRegistry.registerComponent(
    'EnhancedTextarea',
    componentMocks.EnhancedTextarea,
    {
      name: 'EnhancedTextarea',
      version: '1.0.0',
      type: 'component',
      componentType: 'form',
      dependencies: [],
      compatibleVersions: ['19.1.0'],
      description:
        'Enhanced textarea component with validation, accessibility, and character counting',
      tags: ['form', 'textarea', 'enhanced', 'validation', 'accessibility'],
      requiredProps: ['name', 'label'],
      optionalProps: [
        'placeholder',
        'description',
        'required',
        'error',
        'value',
        'onChange',
        'onBlur',
        'onFocus',
        'disabled',
        'className',
        'rows',
        'maxLength',
        'showCharacterCount',
        'validation',
        'resize',
        'autoFocus',
      ],
      testAttributes: [
        'data-testid',
        'data-error',
        'data-valid',
        'data-validating',
        'data-touched',
        'data-resize',
      ],
      accessibilityFeatures: [
        'aria-invalid',
        'aria-required',
        'aria-describedby',
        'role',
        'htmlFor',
      ],
      states: [
        'valid',
        'invalid',
        'validating',
        'touched',
        'disabled',
        'resizable',
      ],
    },
    {
      enabled: true,
      preserveProps: true,
      includeTestAttributes: true,
      mockInteractions: true,
      mockAnimations: false,
      mockAccessibility: true,
      renderMode: 'full',
      testingMode: 'unit',
    }
  );

  // Register AutoSaveIndicator
  componentRegistry.registerComponent(
    'AutoSaveIndicator',
    componentMocks.AutoSaveIndicator,
    {
      name: 'AutoSaveIndicator',
      version: '1.0.0',
      type: 'component',
      componentType: 'feedback',
      dependencies: [],
      compatibleVersions: ['19.1.0'],
      description:
        'Auto-save status indicator with saving state and last saved time display',
      tags: ['form', 'autosave', 'indicator', 'status', 'feedback'],
      requiredProps: ['isSaving'],
      optionalProps: ['lastSaved', 'className', 'data-testid'],
      testAttributes: [
        'data-testid',
        'data-saving',
        'data-status',
        'data-last-saved',
      ],
      accessibilityFeatures: ['role', 'aria-live', 'aria-hidden'],
      states: ['saving', 'saved', 'idle'],
    },
    {
      enabled: true,
      preserveProps: true,
      includeTestAttributes: true,
      mockInteractions: false,
      mockAnimations: false,
      mockAccessibility: true,
      renderMode: 'full',
      testingMode: 'unit',
    }
  );

  // Register FormSubmissionProgress
  componentRegistry.registerComponent(
    'FormSubmissionProgress',
    componentMocks.FormSubmissionProgress,
    {
      name: 'FormSubmissionProgress',
      version: '1.0.0',
      type: 'component',
      componentType: 'feedback',
      dependencies: [],
      compatibleVersions: ['19.1.0'],
      description:
        'Form submission progress indicator with progress bar and step information',
      tags: ['form', 'progress', 'submission', 'status', 'feedback'],
      requiredProps: ['progress', 'currentStep'],
      optionalProps: ['totalSteps', 'className', 'data-testid'],
      testAttributes: [
        'data-testid',
        'data-progress',
        'data-current-step',
        'data-total-steps',
      ],
      accessibilityFeatures: [
        'role',
        'aria-valuenow',
        'aria-valuemin',
        'aria-valuemax',
        'aria-label',
      ],
      states: ['in-progress', 'completed', 'error'],
    },
    {
      enabled: true,
      preserveProps: true,
      includeTestAttributes: true,
      mockInteractions: false,
      mockAnimations: false, // Disable progress animations in tests
      mockAccessibility: true,
      renderMode: 'full',
      testingMode: 'unit',
    }
  );

  // Register EnhancedButton
  componentRegistry.registerComponent(
    'EnhancedButton',
    componentMocks.EnhancedButton,
    {
      name: 'EnhancedButton',
      version: '1.0.0',
      type: 'component',
      componentType: 'ui',
      dependencies: [],
      compatibleVersions: ['19.1.0'],
      description:
        'Enhanced button component with variants, loading states, and accessibility features',
      tags: ['button', 'enhanced', 'loading', 'variants', 'ui'],
      requiredProps: ['children'],
      optionalProps: [
        'type',
        'variant',
        'size',
        'disabled',
        'loading',
        'onClick',
        'className',
        'data-testid',
      ],
      testAttributes: [
        'data-testid',
        'data-variant',
        'data-size',
        'data-loading',
        'data-disabled',
      ],
      accessibilityFeatures: ['aria-disabled', 'aria-busy', 'aria-hidden'],
      variants: [
        'default',
        'destructive',
        'outline',
        'secondary',
        'ghost',
        'link',
      ],
      states: ['default', 'disabled', 'loading', 'pressed'],
    },
    {
      enabled: true,
      preserveProps: true,
      includeTestAttributes: true,
      mockInteractions: true,
      mockAnimations: false,
      mockAccessibility: true,
      renderMode: 'full',
      testingMode: 'unit',
    }
  );

  console.log(
    '[ComponentMockRegistry] All enhanced form components registered successfully'
  );
}

/**
 * Initialize the complete component mock system
 */
export function initializeComponentMockSystem(): {
  componentRegistry: ComponentMockRegistry;
  mockRegistry: MockRegistry;
} {
  // Setup enhanced form component mocks (legacy system)
  setupEnhancedFormComponentMocks();

  // Setup new ComponentMockRegistry
  const componentRegistry = setupComponentMockRegistry();

  // Get the underlying MockRegistry
  const mockRegistry = getDefaultRegistry();

  // Validate all registered components
  const validationResults = componentRegistry.validateAllComponents();
  const invalidComponents = validationResults.filter(
    (result) => !result.isValid
  );

  if (invalidComponents.length > 0) {
    console.warn(
      '[ComponentMockRegistry] Some components failed validation:',
      invalidComponents.map((r) => r.componentName)
    );
  } else {
    console.log(
      '[ComponentMockRegistry] All components validated successfully'
    );
  }

  return {
    componentRegistry,
    mockRegistry,
  };
}

/**
 * Test all registered components
 */
export async function testAllRegisteredComponents(): Promise<{
  results: Array<{
    componentName: string;
    testsPassed: number;
    testsFailed: number;
    testsSkipped: number;
    coverage: number;
    duration: number;
    errors: string[];
    warnings: string[];
  }>;
  summary: {
    totalComponents: number;
    totalTests: number;
    totalPassed: number;
    totalFailed: number;
    totalSkipped: number;
    averageCoverage: number;
    totalDuration: number;
  };
}> {
  const componentRegistry = getDefaultComponentRegistry();
  const results = await componentRegistry.testAllComponents();

  const summary = {
    totalComponents: results.length,
    totalTests: results.reduce(
      (sum, r) => sum + r.testsPassed + r.testsFailed + r.testsSkipped,
      0
    ),
    totalPassed: results.reduce((sum, r) => sum + r.testsPassed, 0),
    totalFailed: results.reduce((sum, r) => sum + r.testsFailed, 0),
    totalSkipped: results.reduce((sum, r) => sum + r.testsSkipped, 0),
    averageCoverage:
      results.length > 0
        ? results.reduce((sum, r) => sum + r.coverage, 0) / results.length
        : 0,
    totalDuration: results.reduce((sum, r) => sum + r.duration, 0),
  };

  return { results, summary };
}

/**
 * Generate component mock registry report
 */
export function generateComponentMockReport(): {
  stats: ReturnType<ComponentMockRegistry['getStats']>;
  validationSummary: {
    totalValidated: number;
    validComponents: number;
    invalidComponents: number;
    commonIssues: string[];
  };
  recommendations: string[];
} {
  const componentRegistry = getDefaultComponentRegistry();
  const stats = componentRegistry.getStats();

  // Get validation results
  const validationResults = componentRegistry.validateAllComponents();
  const validComponents = validationResults.filter((r) => r.isValid);
  const invalidComponents = validationResults.filter((r) => !r.isValid);

  // Analyze common issues
  const allErrors = invalidComponents.flatMap((r) => r.errors);
  const errorCounts = allErrors.reduce(
    (acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const commonIssues = Object.entries(errorCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([type, count]) => `${type} (${count} occurrences)`);

  // Generate recommendations
  const recommendations: string[] = [];

  if (stats.averageCoverage < 80) {
    recommendations.push(
      `Improve test coverage for component mocks (current: ${ 
        stats.averageCoverage.toFixed(1) 
        }%)`
    );
  }

  if (invalidComponents.length > 0) {
    recommendations.push(
      `Fix validation issues in ${invalidComponents.length} components`
    );
  }

  if (
    stats.componentsByType.form &&
    stats.componentsByType.form > stats.componentsByType.ui
  ) {
    recommendations.push(
      'Consider adding more UI component mocks for better coverage'
    );
  }

  if (commonIssues.includes('testAttributes')) {
    recommendations.push(
      'Add missing test attributes (data-testid) to components'
    );
  }

  if (commonIssues.includes('accessibility')) {
    recommendations.push('Improve accessibility features in component mocks');
  }

  return {
    stats,
    validationSummary: {
      totalValidated: validationResults.length,
      validComponents: validComponents.length,
      invalidComponents: invalidComponents.length,
      commonIssues,
    },
    recommendations,
  };
}

/**
 * Cleanup the component mock system
 */
export function cleanupComponentMockSystem(): void {
  // Cleanup ComponentMockRegistry
  const componentRegistry = getDefaultComponentRegistry();
  componentRegistry.cleanup();

  // Cleanup legacy enhanced form component mocks
  cleanupEnhancedFormComponentMocks();

  console.log(
    '[ComponentMockRegistry] Component mock system cleanup completed'
  );
}

/**
 * Reset the component mock system
 */
export function resetComponentMockSystem(): void {
  // Reset ComponentMockRegistry
  const componentRegistry = getDefaultComponentRegistry();
  componentRegistry.reset();

  // Reset MockRegistry
  const mockRegistry = getDefaultRegistry();
  mockRegistry.reset();

  console.log('[ComponentMockRegistry] Component mock system reset completed');
}

// ============================================================================
// Auto-setup for Jest environment
// ============================================================================

/**
 * Auto-setup function that runs when this module is imported
 * Only runs in Jest test environment
 */
function autoSetup(): void {
  if (typeof jest !== 'undefined' && process.env.NODE_ENV === 'test') {
    try {
      initializeComponentMockSystem();
      console.log(
        '[ComponentMockRegistry] Auto-setup completed for Jest environment'
      );
    } catch (error) {
      console.warn('[ComponentMockRegistry] Auto-setup failed:', error);
    }
  }
}

// Run auto-setup
autoSetup();

// ============================================================================
// Exports
// ============================================================================

export {
  setupComponentMockRegistry,
  registerEnhancedFormComponentsWithRegistry,
  initializeComponentMockSystem,
  testAllRegisteredComponents,
  generateComponentMockReport,
  cleanupComponentMockSystem,
  resetComponentMockSystem,
};

export default {
  setup: setupComponentMockRegistry,
  initialize: initializeComponentMockSystem,
  test: testAllRegisteredComponents,
  report: generateComponentMockReport,
  cleanup: cleanupComponentMockSystem,
  reset: resetComponentMockSystem,
};
