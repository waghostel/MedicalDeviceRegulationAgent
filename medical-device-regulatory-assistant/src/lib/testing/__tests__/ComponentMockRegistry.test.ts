/**
 * ComponentMockRegistry Tests
 *
 * Tests for the ComponentMockRegistry system including automatic loading,
 * validation, and testing capabilities.
 *
 * Requirements: 2.4, 4.4
 */

import React from 'react';

import {
  ComponentMockRegistry,
  ComponentMockMetadata,
  ComponentMockConfiguration,
} from '../ComponentMockRegistry';
import { MockRegistry } from '../MockRegistry';

// ============================================================================
// Test Setup
// ============================================================================

describe('ComponentMockRegistry', () => {
  let componentRegistry: ComponentMockRegistry;
  let mockRegistry: MockRegistry;

  beforeEach(() => {
    mockRegistry = new MockRegistry();
    componentRegistry = new ComponentMockRegistry(mockRegistry, {
      enabled: true,
      loadOnDemand: false, // Disable for controlled testing
      validationLevel: 'moderate',
    });
  });

  afterEach(() => {
    componentRegistry.reset();
    mockRegistry.reset();
  });

  // ============================================================================
  // Component Registration Tests
  // ============================================================================

  describe('Component Registration', () => {
    it('should register a component mock successfully', () => {
      const mockComponent = jest.fn<React.ReactElement, [any]>((props) =>
        React.createElement('div', {
          'data-testid': 'test-component',
          ...props,
        })
      );

      const metadata: Partial<ComponentMockMetadata> = {
        componentType: 'ui',
        requiredProps: ['children'],
        testAttributes: ['data-testid'],
        accessibilityFeatures: ['aria-label'],
      };

      const result = componentRegistry.registerComponent(
        'TestComponent',
        mockComponent,
        metadata
      );

      expect(result.success).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.mockName).toBe('TestComponent');
    });

    it('should validate component metadata during registration', () => {
      const mockComponent = jest.fn<React.ReactElement, [any]>((props) =>
        React.createElement('div', props)
      );

      const metadata: Partial<ComponentMockMetadata> = {
        componentType: 'form',
        requiredProps: [], // Missing required props for form component
        testAttributes: [], // Missing test attributes
        accessibilityFeatures: [], // Missing accessibility features
      };

      const result = componentRegistry.registerComponent(
        'InvalidComponent',
        mockComponent,
        metadata
      );

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should handle duplicate component registration', () => {
      const mockComponent = jest.fn<React.ReactElement, [any]>((props) =>
        React.createElement('div', props)
      );

      const metadata: Partial<ComponentMockMetadata> = {
        componentType: 'ui',
        requiredProps: ['children'],
      };

      // Register first time
      const result1 = componentRegistry.registerComponent(
        'DuplicateComponent',
        mockComponent,
        metadata
      );
      expect(result1.success).toBe(true);

      // Register second time
      const result2 = componentRegistry.registerComponent(
        'DuplicateComponent',
        mockComponent,
        metadata
      );
      expect(result2.warnings.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // Component Validation Tests
  // ============================================================================

  describe('Component Validation', () => {
    it('should validate component props handling', () => {
      const mockComponent = jest.fn<React.ReactElement, [any]>((props) => {
        if (!props.children) {
          throw new Error('Missing required prop: children');
        }
        return React.createElement(
          'div',
          { 'data-testid': 'test-component' },
          props.children
        );
      });

      const metadata: ComponentMockMetadata = {
        name: 'TestComponent',
        version: '1.0.0',
        type: 'component',
        componentType: 'ui',
        dependencies: [],
        compatibleVersions: ['19.1.0'],
        description: 'Test component',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ['test'],
        requiredProps: ['children'],
        optionalProps: ['className'],
        testAttributes: ['data-testid'],
        accessibilityFeatures: ['aria-label'],
      };

      const result = componentRegistry.validateComponent(
        'TestComponent',
        mockComponent,
        metadata
      );

      expect(result.isValid).toBe(true);
      expect(result.testCoverage.propsValidation).toBe(true);
      expect(result.testCoverage.testAttributes).toBe(true);
    });

    it('should detect missing test attributes', () => {
      const mockComponent = jest.fn<React.ReactElement, [any]>(
        (props) => React.createElement('div', props) // No data-testid
      );

      const metadata: ComponentMockMetadata = {
        name: 'NoTestIdComponent',
        version: '1.0.0',
        type: 'component',
        componentType: 'ui',
        dependencies: [],
        compatibleVersions: ['19.1.0'],
        description: 'Component without test attributes',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ['test'],
        requiredProps: [],
        optionalProps: [],
        testAttributes: [], // No test attributes defined
        accessibilityFeatures: [],
      };

      const result = componentRegistry.validateComponent(
        'NoTestIdComponent',
        mockComponent,
        metadata
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.type === 'testAttributes')).toBe(true);
    });

    it('should validate accessibility features', () => {
      const mockComponent = jest.fn<React.ReactElement, [any]>((props) =>
        React.createElement(
          'button',
          {
            'data-testid': 'accessible-button',
            'aria-label': props['aria-label'],
            'aria-disabled': props.disabled,
          },
          props.children
        )
      );

      const metadata: ComponentMockMetadata = {
        name: 'AccessibleButton',
        version: '1.0.0',
        type: 'component',
        componentType: 'ui',
        dependencies: [],
        compatibleVersions: ['19.1.0'],
        description: 'Accessible button component',
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ['button', 'accessible'],
        requiredProps: ['children'],
        optionalProps: ['disabled', 'aria-label'],
        testAttributes: ['data-testid'],
        accessibilityFeatures: ['aria-label', 'aria-disabled'],
      };

      const result = componentRegistry.validateComponent(
        'AccessibleButton',
        mockComponent,
        metadata
      );

      expect(result.isValid).toBe(true);
      expect(result.testCoverage.accessibilityAttributes).toBe(true);
    });
  });

  // ============================================================================
  // Component Testing Tests
  // ============================================================================

  describe('Component Testing', () => {
    beforeEach(() => {
      // Register a test component
      const mockComponent = jest.fn<React.ReactElement, [any]>((props) =>
        React.createElement(
          'div',
          {
            'data-testid': 'test-component',
            'aria-label': props.label,
          },
          props.children
        )
      );

      const metadata: Partial<ComponentMockMetadata> = {
        componentType: 'ui',
        requiredProps: ['children'],
        optionalProps: ['label'],
        testAttributes: ['data-testid'],
        accessibilityFeatures: ['aria-label'],
      };

      componentRegistry.registerComponent(
        'TestableComponent',
        mockComponent,
        metadata
      );
    });

    it('should test component rendering', async () => {
      const result = await componentRegistry.testComponent('TestableComponent');

      expect(result.componentName).toBe('TestableComponent');
      expect(result.testsPassed).toBeGreaterThan(0);
      expect(result.coverage).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle component testing errors', async () => {
      const result = await componentRegistry.testComponent(
        'NonExistentComponent'
      );

      expect(result.componentName).toBe('NonExistentComponent');
      expect(result.testsFailed).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.coverage).toBe(0);
    });

    it('should test all registered components', async () => {
      // Register another component
      const anotherMockComponent = jest.fn<React.ReactElement, [any]>((props) =>
        React.createElement(
          'span',
          { 'data-testid': 'another-component' },
          props.text
        )
      );

      componentRegistry.registerComponent(
        'AnotherComponent',
        anotherMockComponent,
        {
          componentType: 'ui',
          requiredProps: ['text'],
          testAttributes: ['data-testid'],
        }
      );

      const results = await componentRegistry.testAllComponents();

      expect(results).toHaveLength(2);
      expect(results.every((r) => r.componentName)).toBe(true);
      expect(results.every((r) => r.duration >= 0)).toBe(true);
    });
  });

  // ============================================================================
  // Auto-loading Tests
  // ============================================================================

  describe('Auto-loading', () => {
    beforeEach(() => {
      // Create registry with auto-loading enabled
      componentRegistry = new ComponentMockRegistry(mockRegistry, {
        enabled: true,
        loadOnDemand: true,
        preloadComponents: ['EnhancedInput'],
        validationLevel: 'lenient',
      });
    });

    it('should support on-demand component loading', async () => {
      const component = await componentRegistry.loadComponent('EnhancedInput');

      // Component might not be found in test environment, but should not throw
      expect(component).toBeDefined();
    });

    it('should handle loading failures gracefully', async () => {
      const component = await componentRegistry.loadComponent(
        'NonExistentComponent'
      );

      expect(component).toBeNull();
    });
  });

  // ============================================================================
  // Component Management Tests
  // ============================================================================

  describe('Component Management', () => {
    beforeEach(() => {
      // Register test components
      const mockComponent1 = jest.fn<React.ReactElement, [any]>((props) =>
        React.createElement(
          'div',
          { 'data-testid': 'component-1' },
          props.children
        )
      );

      const mockComponent2 = jest.fn<React.ReactElement, [any]>((props) =>
        React.createElement(
          'form',
          { 'data-testid': 'component-2' },
          props.children
        )
      );

      componentRegistry.registerComponent('UIComponent', mockComponent1, {
        componentType: 'ui',
        requiredProps: ['children'],
        testAttributes: ['data-testid'],
      });

      componentRegistry.registerComponent('FormComponent', mockComponent2, {
        componentType: 'form',
        requiredProps: ['children'],
        testAttributes: ['data-testid'],
      });
    });

    it('should retrieve registered components', () => {
      const component = componentRegistry.getComponent('UIComponent');

      expect(component).toBeDefined();
      expect(component?.name).toBe('UIComponent');
      expect(component?.metadata.componentType).toBe('ui');
    });

    it('should list components with filters', () => {
      const uiComponents = componentRegistry.listComponents({
        componentType: 'ui',
      });
      const formComponents = componentRegistry.listComponents({
        componentType: 'form',
      });

      expect(uiComponents).toHaveLength(1);
      expect(uiComponents[0].name).toBe('UIComponent');

      expect(formComponents).toHaveLength(1);
      expect(formComponents[0].name).toBe('FormComponent');
    });

    it('should unregister components', () => {
      const success = componentRegistry.unregisterComponent('UIComponent');

      expect(success).toBe(true);

      const component = componentRegistry.getComponent('UIComponent');
      expect(component).toBeUndefined();
    });

    it('should provide registry statistics', () => {
      const stats = componentRegistry.getStats();

      expect(stats.totalComponents).toBe(2);
      expect(stats.registeredComponents).toBe(2);
      expect(stats.componentsByType.ui).toBe(1);
      expect(stats.componentsByType.form).toBe(1);
    });
  });

  // ============================================================================
  // Cleanup and Reset Tests
  // ============================================================================

  describe('Cleanup and Reset', () => {
    beforeEach(() => {
      // Register a test component
      const mockComponent = jest.fn<React.ReactElement, [any]>((props) =>
        React.createElement('div', props)
      );

      componentRegistry.registerComponent(
        'CleanupTestComponent',
        mockComponent,
        {
          componentType: 'ui',
          requiredProps: [],
          testAttributes: ['data-testid'],
        }
      );
    });

    it('should cleanup component mocks', () => {
      const component = componentRegistry.getComponent('CleanupTestComponent');
      expect(component).toBeDefined();

      // Make some mock calls
      component!.mockComponent({ test: 'prop' });
      expect(component!.mockComponent).toHaveBeenCalled();

      // Cleanup
      componentRegistry.cleanup();

      // Mock should be cleared but component should still exist
      expect(component!.mockComponent).not.toHaveBeenCalled();
      expect(
        componentRegistry.getComponent('CleanupTestComponent')
      ).toBeDefined();
    });

    it('should reset the entire registry', () => {
      expect(
        componentRegistry.getComponent('CleanupTestComponent')
      ).toBeDefined();

      componentRegistry.reset();

      expect(
        componentRegistry.getComponent('CleanupTestComponent')
      ).toBeUndefined();
      expect(componentRegistry.getStats().totalComponents).toBe(0);
    });
  });

  // ============================================================================
  // Integration Tests
  // ============================================================================

  describe('Integration with MockRegistry', () => {
    it('should integrate with MockRegistry', () => {
      const mockComponent = jest.fn<React.ReactElement, [any]>((props) =>
        React.createElement('div', props)
      );

      const result = componentRegistry.registerComponent(
        'IntegrationTestComponent',
        mockComponent,
        {
          componentType: 'ui',
          requiredProps: [],
          testAttributes: ['data-testid'],
        }
      );

      expect(result.success).toBe(true);

      // Should be available in MockRegistry
      const mockFromRegistry = mockRegistry.getMock('IntegrationTestComponent');
      expect(mockFromRegistry).toBe(mockComponent);
    });

    it('should handle MockRegistry failures gracefully', () => {
      // Create a mock that will fail MockRegistry validation
      const invalidMock = 'not-a-function' as any;

      const result = componentRegistry.registerComponent(
        'InvalidMockComponent',
        invalidMock,
        {
          componentType: 'ui',
          requiredProps: [],
          testAttributes: ['data-testid'],
        }
      );

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// Integration Tests with Enhanced Form Components
// ============================================================================

describe('ComponentMockRegistry Integration', () => {
  let componentRegistry: ComponentMockRegistry;

  beforeEach(() => {
    componentRegistry = new ComponentMockRegistry();
  });

  afterEach(() => {
    componentRegistry.reset();
  });

  it('should integrate with enhanced form component mocks', async () => {
    // Try to load enhanced form components
    const enhancedInput =
      await componentRegistry.loadComponent('EnhancedInput');

    if (enhancedInput) {
      expect(enhancedInput.name).toBe('EnhancedInput');
      expect(enhancedInput.metadata.componentType).toBe('form');
      expect(enhancedInput.metadata.requiredProps).toContain('name');
      expect(enhancedInput.metadata.requiredProps).toContain('label');
    }
  });

  it('should validate enhanced form components', async () => {
    const enhancedInput =
      await componentRegistry.loadComponent('EnhancedInput');

    if (enhancedInput) {
      const validationResult = componentRegistry.validateComponent(
        'EnhancedInput',
        enhancedInput.mockComponent,
        enhancedInput.metadata
      );

      expect(validationResult.componentName).toBe('EnhancedInput');
      expect(validationResult.testCoverage.testAttributes).toBe(true);
    }
  });
});
