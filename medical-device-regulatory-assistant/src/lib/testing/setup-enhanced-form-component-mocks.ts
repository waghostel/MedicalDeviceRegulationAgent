/**
 * Setup Enhanced Form Component Mocks
 *
 * Integration setup for enhanced form component mocks with the existing test infrastructure.
 * This file provides the integration layer between component mocks and the test environment.
 *
 * Requirements: 2.4, 3.1
 */

import {
  setupEnhancedFormComponentMocks,
  cleanupEnhancedFormComponentMocks,
  componentMocks,
  EnhancedInputMock,
  EnhancedTextareaMock,
  AutoSaveIndicatorMock,
  FormSubmissionProgressMock,
  EnhancedButtonMock,
} from './enhanced-form-component-mocks';

// ============================================================================
// Integration with Existing Mock System
// ============================================================================

/**
 * Initialize enhanced form component mocks in the test environment
 * This function integrates with the existing mock infrastructure
 */
export function initializeEnhancedFormComponentMocks(): void {
  try {
    // Setup the component mocks
    setupEnhancedFormComponentMocks();

    // Integrate with existing enhanced form hook mocks
    if (typeof require !== 'undefined') {
      try {
        const {
          setupEnhancedFormMocks,
        } = require('./setup-enhanced-form-mocks');
        if (typeof setupEnhancedFormMocks === 'function') {
          setupEnhancedFormMocks();
        }
      } catch (error) {
        console.warn(
          '[Enhanced Form Component Mocks] Could not integrate with hook mocks:',
          error
        );
      }
    }

    // Add component mocks to Jest module mocks
    setupJestModuleMocks();

    console.log(
      '[Enhanced Form Component Mocks] Initialization completed successfully'
    );
  } catch (error) {
    console.error(
      '[Enhanced Form Component Mocks] Initialization failed:',
      error
    );
    throw error;
  }
}

/**
 * Setup Jest module mocks for component imports
 */
function setupJestModuleMocks(): void {
  if (typeof jest === 'undefined') {
    return;
  }

  // Only mock the EnhancedFormField components that we know exist
  try {
    jest.doMock('@/components/forms/EnhancedFormField', () => ({
      EnhancedInput: EnhancedInputMock,
      EnhancedTextarea: EnhancedTextareaMock,
      AutoSaveIndicator: AutoSaveIndicatorMock,
    }));
    console.log(
      '[Enhanced Form Component Mocks] EnhancedFormField mocked successfully'
    );
  } catch (error) {
    console.warn(
      '[Enhanced Form Component Mocks] Could not mock EnhancedFormField:',
      error
    );
  }

  console.log('[Enhanced Form Component Mocks] Jest module mocks configured');
}

/**
 * Cleanup function for enhanced form component mocks
 * Should be called in test teardown
 */
export function teardownEnhancedFormComponentMocks(): void {
  try {
    cleanupEnhancedFormComponentMocks();

    // Clear Jest module mocks if needed
    if (typeof jest !== 'undefined') {
      // Note: We don't clear doMock here as it's typically done globally
      // Individual test files can use jest.clearAllMocks() if needed
    }

    console.log(
      '[Enhanced Form Component Mocks] Teardown completed successfully'
    );
  } catch (error) {
    console.error('[Enhanced Form Component Mocks] Teardown failed:', error);
  }
}

// ============================================================================
// Component Mock Validation
// ============================================================================

/**
 * Validate that all component mocks are properly configured
 */
export function validateEnhancedFormComponentMocks(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check that all mocks are Jest functions
  Object.entries(componentMocks).forEach(([name, mock]) => {
    if (typeof mock !== 'function') {
      errors.push(`${name} mock is not a function`);
    } else if (!jest.isMockFunction(mock)) {
      warnings.push(`${name} mock is not a Jest mock function`);
    }
  });

  // Check that mocks have proper test attributes
  try {
    const testProps = {
      label: 'Test Label',
      name: 'test-field',
      value: 'test value',
      onChange: jest.fn(),
    };

    // Test EnhancedInput mock
    try {
      const inputElement = EnhancedInputMock(testProps);
      if (
        !inputElement ||
        !inputElement.props ||
        !inputElement.props['data-testid']
      ) {
        warnings.push('EnhancedInput mock missing data-testid');
      }
    } catch (error) {
      warnings.push(`EnhancedInput mock validation failed: ${error}`);
    }

    // Test EnhancedTextarea mock
    try {
      const textareaElement = EnhancedTextareaMock(testProps);
      if (
        !textareaElement ||
        !textareaElement.props ||
        !textareaElement.props['data-testid']
      ) {
        warnings.push('EnhancedTextarea mock missing data-testid');
      }
    } catch (error) {
      warnings.push(`EnhancedTextarea mock validation failed: ${error}`);
    }

    // Test AutoSaveIndicator mock
    try {
      const indicatorElement = AutoSaveIndicatorMock({ isSaving: false });
      if (
        !indicatorElement ||
        !indicatorElement.props ||
        !indicatorElement.props['data-testid']
      ) {
        warnings.push('AutoSaveIndicator mock missing data-testid');
      }
    } catch (error) {
      warnings.push(`AutoSaveIndicator mock validation failed: ${error}`);
    }

    // Test FormSubmissionProgress mock
    try {
      const progressElement = FormSubmissionProgressMock({
        progress: 50,
        currentStep: 'Test Step',
      });
      if (
        !progressElement ||
        !progressElement.props ||
        !progressElement.props['data-testid']
      ) {
        warnings.push('FormSubmissionProgress mock missing data-testid');
      }
    } catch (error) {
      warnings.push(`FormSubmissionProgress mock validation failed: ${error}`);
    }

    // Test EnhancedButton mock
    try {
      const buttonElement = EnhancedButtonMock({ children: 'Test Button' });
      if (
        !buttonElement ||
        !buttonElement.props ||
        !buttonElement.props['data-testid']
      ) {
        warnings.push('EnhancedButton mock missing data-testid');
      }
    } catch (error) {
      warnings.push(`EnhancedButton mock validation failed: ${error}`);
    }
  } catch (error) {
    errors.push(`Mock validation failed: ${error}`);
  }

  // Check global registry integration
  if ((global as any).__GLOBAL_MOCK_REGISTRY) {
    const componentMap = (global as any).__GLOBAL_MOCK_REGISTRY.components;
    if (!componentMap || componentMap.size === 0) {
      warnings.push('Component mocks not registered in global registry');
    }
  } else {
    warnings.push('Global mock registry not available');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Get mock call history for a specific component
 */
export function getComponentMockCalls(
  componentName: keyof typeof componentMocks
): any[] {
  const mock = componentMocks[componentName];
  return mock.mock.calls || [];
}

/**
 * Reset all component mock call history
 */
export function resetComponentMockCalls(): void {
  Object.values(componentMocks).forEach((mock) => {
    mock.mockClear();
  });
}

/**
 * Get component mock statistics
 */
export function getComponentMockStats(): {
  totalMocks: number;
  totalCalls: number;
  mockCallCounts: Record<string, number>;
} {
  const mockCallCounts: Record<string, number> = {};
  let totalCalls = 0;

  Object.entries(componentMocks).forEach(([name, mock]) => {
    const callCount = mock.mock.calls?.length || 0;
    mockCallCounts[name] = callCount;
    totalCalls += callCount;
  });

  return {
    totalMocks: Object.keys(componentMocks).length,
    totalCalls,
    mockCallCounts,
  };
}

// ============================================================================
// Integration with Test Utils
// ============================================================================

/**
 * Enhanced render function that includes component mocks
 * This extends the existing renderWithProviders functionality
 */
export function renderWithEnhancedFormMocks(
  ui: React.ReactElement,
  options?: {
    mockConfig?: {
      enableComponentMocks?: boolean;
      componentOverrides?: Partial<typeof componentMocks>;
    };
    [key: string]: any;
  }
): any {
  // Initialize component mocks if not already done
  if (options?.mockConfig?.enableComponentMocks !== false) {
    initializeEnhancedFormComponentMocks();
  }

  // Apply component overrides if provided
  if (options?.mockConfig?.componentOverrides) {
    Object.entries(options.mockConfig.componentOverrides).forEach(
      ([name, override]) => {
        if (name in componentMocks && override) {
          // Temporarily override the mock
          const originalMock =
            componentMocks[name as keyof typeof componentMocks];
          componentMocks[name as keyof typeof componentMocks] = override as any;

          // Restore after test (this would need to be handled by test cleanup)
          if (typeof afterEach !== 'undefined') {
            afterEach(() => {
              componentMocks[name as keyof typeof componentMocks] =
                originalMock;
            });
          }
        }
      }
    );
  }

  // Try to use existing renderWithProviders if available
  try {
    const { renderWithProviders } = require('./test-utils');
    return renderWithProviders(ui, options);
  } catch (error) {
    // Fallback to basic render if renderWithProviders not available
    console.warn(
      '[Enhanced Form Component Mocks] Using fallback render method'
    );

    if (typeof require !== 'undefined') {
      try {
        const { render } = require('@testing-library/react');
        return render(ui);
      } catch (renderError) {
        console.error(
          '[Enhanced Form Component Mocks] Render fallback failed:',
          renderError
        );
        throw renderError;
      }
    }

    throw new Error('No render method available');
  }
}

// ============================================================================
// Export all utilities
// ============================================================================

export {
  componentMocks,
  EnhancedInputMock,
  EnhancedTextareaMock,
  AutoSaveIndicatorMock,
  FormSubmissionProgressMock,
  EnhancedButtonMock,
};

export default {
  initialize: initializeEnhancedFormComponentMocks,
  teardown: teardownEnhancedFormComponentMocks,
  validate: validateEnhancedFormComponentMocks,
  render: renderWithEnhancedFormMocks,
  mocks: componentMocks,
  utils: {
    getCalls: getComponentMockCalls,
    resetCalls: resetComponentMockCalls,
    getStats: getComponentMockStats,
  },
};
