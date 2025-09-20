/**
 * Manual validation for ComponentMockRegistry implementation
 * This file validates that the ComponentMockRegistry system works correctly
 */

import React from 'react';

import { ComponentMockRegistry } from './ComponentMockRegistry';
import { MockRegistry } from './MockRegistry';

// ============================================================================
// Manual Validation Functions
// ============================================================================

export function validateComponentMockRegistry(): {
  success: boolean;
  results: string[];
  errors: string[];
} {
  const results: string[] = [];
  const errors: string[] = [];

  try {
    // Test 1: Create ComponentMockRegistry instance
    results.push('Creating ComponentMockRegistry instance...');
    const mockRegistry = new MockRegistry();
    const componentRegistry = new ComponentMockRegistry(mockRegistry);
    results.push('✓ ComponentMockRegistry instance created successfully');

    // Test 2: Register a simple component mock
    results.push('Registering test component mock...');
    const testMockComponent = jest.fn<React.ReactElement, [any]>((props) =>
      React.createElement('div', {
        'data-testid': 'test-component',
        ...props,
      })
    );

    const registrationResult = componentRegistry.registerComponent(
      'TestComponent',
      testMockComponent,
      {
        componentType: 'ui',
        requiredProps: ['children'],
        testAttributes: ['data-testid'],
        accessibilityFeatures: ['aria-label'],
      }
    );

    if (registrationResult.success) {
      results.push('✓ Component mock registered successfully');
    } else {
      errors.push(
        `✗ Component registration failed: ${registrationResult.errors.join(', ')}`
      );
    }

    // Test 3: Validate component
    results.push('Validating registered component...');
    const component = componentRegistry.getComponent('TestComponent');
    if (component) {
      results.push('✓ Component retrieved successfully');

      if (component.validationResult) {
        if (component.validationResult.isValid) {
          results.push('✓ Component validation passed');
        } else {
          results.push(
            `⚠ Component validation issues: ${component.validationResult.errors.length} errors`
          );
        }
      }
    } else {
      errors.push('✗ Failed to retrieve registered component');
    }

    // Test 4: Test component functionality
    results.push('Testing component mock functionality...');
    if (component) {
      try {
        const mockResult = component.mockComponent({
          children: 'Test Content',
        });
        if (mockResult) {
          results.push('✓ Component mock renders successfully');
        } else {
          errors.push('✗ Component mock failed to render');
        }
      } catch (error) {
        errors.push(`✗ Component mock render error: ${error}`);
      }
    }

    // Test 5: Get registry statistics
    results.push('Getting registry statistics...');
    const stats = componentRegistry.getStats();
    results.push(
      `✓ Registry stats: ${stats.totalComponents} components, ${stats.registeredComponents} registered`
    );

    // Test 6: List components
    results.push('Listing registered components...');
    const components = componentRegistry.listComponents();
    results.push(`✓ Found ${components.length} registered components`);

    // Test 7: Cleanup
    results.push('Testing cleanup functionality...');
    componentRegistry.cleanup();
    results.push('✓ Cleanup completed successfully');

    return {
      success: errors.length === 0,
      results,
      errors,
    };
  } catch (error) {
    errors.push(`✗ Validation failed with error: ${error}`);
    return {
      success: false,
      results,
      errors,
    };
  }
}

// ============================================================================
// Integration Validation
// ============================================================================

export function validateComponentRegistryIntegration(): {
  success: boolean;
  results: string[];
  errors: string[];
} {
  const results: string[] = [];
  const errors: string[] = [];

  try {
    results.push('Testing ComponentMockRegistry integration...');

    // Test integration with setup functions
    const {
      initializeComponentMockSystem,
    } = require('./setup-component-mock-registry');

    results.push('Initializing component mock system...');
    const { componentRegistry, mockRegistry } = initializeComponentMockSystem();

    if (componentRegistry && mockRegistry) {
      results.push('✓ Component mock system initialized successfully');

      // Test if enhanced form components are available
      const enhancedInput = componentRegistry.getComponent('EnhancedInput');
      if (enhancedInput) {
        results.push('✓ EnhancedInput component found in registry');
      } else {
        results.push(
          '⚠ EnhancedInput component not found (may be expected in test environment)'
        );
      }

      // Test registry stats
      const stats = componentRegistry.getStats();
      results.push(
        `✓ Component registry contains ${stats.totalComponents} components`
      );
    } else {
      errors.push('✗ Failed to initialize component mock system');
    }

    return {
      success: errors.length === 0,
      results,
      errors,
    };
  } catch (error) {
    errors.push(`✗ Integration validation failed: ${error}`);
    return {
      success: false,
      results,
      errors,
    };
  }
}

// ============================================================================
// Run Validation
// ============================================================================

export function runComponentMockRegistryValidation(): void {
  console.log('='.repeat(60));
  console.log('ComponentMockRegistry Validation');
  console.log('='.repeat(60));

  // Run basic validation
  console.log('\n1. Basic ComponentMockRegistry Validation:');
  const basicValidation = validateComponentMockRegistry();

  basicValidation.results.forEach((result) => console.log(`   ${result}`));
  if (basicValidation.errors.length > 0) {
    console.log('\n   Errors:');
    basicValidation.errors.forEach((error) => console.log(`   ${error}`));
  }

  // Run integration validation
  console.log('\n2. Integration Validation:');
  const integrationValidation = validateComponentRegistryIntegration();

  integrationValidation.results.forEach((result) =>
    console.log(`   ${result}`)
  );
  if (integrationValidation.errors.length > 0) {
    console.log('\n   Errors:');
    integrationValidation.errors.forEach((error) => console.log(`   ${error}`));
  }

  // Summary
  console.log(`\n${  '='.repeat(60)}`);
  console.log('Validation Summary:');
  console.log(
    `Basic Validation: ${basicValidation.success ? '✅ PASSED' : '❌ FAILED'}`
  );
  console.log(
    `Integration Validation: ${integrationValidation.success ? '✅ PASSED' : '❌ FAILED'}`
  );

  const overallSuccess =
    basicValidation.success && integrationValidation.success;
  console.log(
    `Overall Result: ${overallSuccess ? '✅ SUCCESS' : '❌ FAILURE'}`
  );
  console.log('='.repeat(60));
}

// Auto-run validation if this file is executed directly
if (require.main === module) {
  runComponentMockRegistryValidation();
}
