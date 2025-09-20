/**
 * Provider Stack Management System
 * Implements dynamic provider composition, dependency resolution, and cleanup mechanisms
 * Requirements: 7.1, 7.2
 * Task: B3.2 Create provider stack management
 */

import React, { ReactNode, ComponentType } from 'react';
import { Session } from 'next-auth';
import {
  MockToastProvider,
  MockFormProvider,
  MockThemeProvider,
  MockSessionProvider,
  providerMockUtils,
  type ProviderMockOptions,
} from './provider-mock-system';

// ============================================================================
// Provider Stack Configuration Types
// ============================================================================

export interface ProviderConfig {
  name: string;
  component: ComponentType<any>;
  props?: Record<string, any>;
  dependencies?: string[];
  priority?: number; // Lower numbers = higher priority (loaded first)
  enabled?: boolean;
  cleanup?: () => void;
}

export interface ProviderStackConfig {
  providers: ProviderConfig[];
  globalCleanup?: () => void;
  onError?: (error: Error, providerName: string) => void;
}

export interface ProviderDependencyGraph {
  [providerName: string]: {
    dependencies: string[];
    dependents: string[];
    resolved: boolean;
    component: ComponentType<any>;
    props?: Record<string, any>;
  };
}

// ============================================================================
// Provider Stack Manager Class
// ============================================================================

export class ProviderStackManager {
  private static instance: ProviderStackManager;
  private providerRegistry: Map<string, ProviderConfig> = new Map();
  private activeStacks: Map<string, ReactNode> = new Map();
  private cleanupFunctions: Map<string, (() => void)[]> = new Map();
  private dependencyGraph: ProviderDependencyGraph = {};

  private constructor() {
    this.initializeDefaultProviders();
  }

  public static getInstance(): ProviderStackManager {
    if (!ProviderStackManager.instance) {
      ProviderStackManager.instance = new ProviderStackManager();
    }
    return ProviderStackManager.instance;
  }

  /**
   * Initialize default providers with proper dependencies
   */
  private initializeDefaultProviders(): void {
    // Session provider (no dependencies, highest priority)
    this.registerProvider({
      name: 'session',
      component: MockSessionProvider,
      dependencies: [],
      priority: 1,
      enabled: true,
      cleanup: () => {
        providerMockUtils.clearSessionState();
      },
    });

    // Theme provider (depends on session for user preferences)
    this.registerProvider({
      name: 'theme',
      component: MockThemeProvider,
      dependencies: ['session'],
      priority: 2,
      enabled: true,
      cleanup: () => {
        providerMockUtils.clearThemeState();
      },
    });

    // Form provider (depends on theme for styling)
    this.registerProvider({
      name: 'form',
      component: MockFormProvider,
      dependencies: ['theme'],
      priority: 3,
      enabled: true,
      cleanup: () => {
        providerMockUtils.clearFormState();
      },
    });

    // Toast provider (depends on theme for styling, form for notifications)
    this.registerProvider({
      name: 'toast',
      component: MockToastProvider,
      dependencies: ['theme', 'form'],
      priority: 4,
      enabled: true,
      cleanup: () => {
        providerMockUtils.clearToastState();
      },
    });
  }

  /**
   * Register a new provider in the system
   */
  public registerProvider(config: ProviderConfig): void {
    this.providerRegistry.set(config.name, config);
    this.updateDependencyGraph();
  }

  /**
   * Unregister a provider from the system
   */
  public unregisterProvider(name: string): void {
    const config = this.providerRegistry.get(name);
    if (config && config.cleanup) {
      config.cleanup();
    }
    this.providerRegistry.delete(name);
    delete this.dependencyGraph[name];
    this.updateDependencyGraph();
  }

  /**
   * Update the dependency graph when providers change
   */
  private updateDependencyGraph(): void {
    this.dependencyGraph = {};

    // Build dependency graph
    for (const [name, config] of this.providerRegistry) {
      this.dependencyGraph[name] = {
        dependencies: config.dependencies || [],
        dependents: [],
        resolved: false,
        component: config.component,
        props: config.props,
      };
    }

    // Calculate dependents (reverse dependencies)
    for (const [name, node] of Object.entries(this.dependencyGraph)) {
      for (const dependency of node.dependencies) {
        if (this.dependencyGraph[dependency]) {
          this.dependencyGraph[dependency].dependents.push(name);
        }
      }
    }
  }

  /**
   * Resolve provider dependencies using topological sort
   */
  private resolveDependencies(enabledProviders: string[]): string[] {
    const resolved: string[] = [];
    const visiting: Set<string> = new Set();
    const visited: Set<string> = new Set();

    const visit = (providerName: string): void => {
      if (visited.has(providerName)) return;
      if (visiting.has(providerName)) {
        throw new Error(
          `Circular dependency detected involving provider: ${providerName}`
        );
      }

      visiting.add(providerName);

      const node = this.dependencyGraph[providerName];
      if (node) {
        // Visit dependencies first
        for (const dependency of node.dependencies) {
          if (enabledProviders.includes(dependency)) {
            visit(dependency);
          }
        }
      }

      visiting.delete(providerName);
      visited.add(providerName);
      resolved.push(providerName);
    };

    // Visit all enabled providers
    for (const providerName of enabledProviders) {
      if (!visited.has(providerName)) {
        visit(providerName);
      }
    }

    return resolved;
  }

  /**
   * Create a provider stack with dynamic composition
   */
  public createProviderStack(
    stackId: string,
    options: {
      enabledProviders?: string[];
      providerProps?: Record<string, any>;
      onError?: (error: Error, providerName: string) => void;
    } = {}
  ): ComponentType<{ children: ReactNode }> {
    const {
      enabledProviders = ['session', 'theme', 'form', 'toast'],
      providerProps = {},
      onError,
    } = options;

    // Filter enabled providers
    const availableProviders = enabledProviders.filter(
      (name) =>
        this.providerRegistry.has(name) &&
        this.providerRegistry.get(name)?.enabled
    );

    // Resolve dependencies
    let resolvedOrder: string[];
    try {
      resolvedOrder = this.resolveDependencies(availableProviders);
    } catch (error) {
      console.error('Provider dependency resolution failed:', error);
      onError?.(error as Error, 'dependency-resolution');
      // Fallback to priority-based ordering
      resolvedOrder = availableProviders.sort((a, b) => {
        const priorityA = this.providerRegistry.get(a)?.priority || 999;
        const priorityB = this.providerRegistry.get(b)?.priority || 999;
        return priorityA - priorityB;
      });
    }

    // Create the composed provider stack
    const ProviderStack: ComponentType<{ children: ReactNode }> = ({
      children,
    }) => {
      let wrappedChildren = children;

      // Wrap children with providers in reverse order (outermost first)
      for (let i = resolvedOrder.length - 1; i >= 0; i--) {
        const providerName = resolvedOrder[i];
        const config = this.providerRegistry.get(providerName);

        if (config) {
          try {
            const props = {
              ...config.props,
              ...providerProps[providerName],
            };

            wrappedChildren = React.createElement(
              config.component,
              props,
              wrappedChildren
            );
          } catch (error) {
            console.error(`Error creating provider ${providerName}:`, error);
            onError?.(error as Error, providerName);
          }
        }
      }

      return wrappedChildren as React.ReactElement;
    };

    // Store the stack for cleanup
    this.activeStacks.set(stackId, ProviderStack);

    // Register cleanup functions
    const cleanupFunctions = resolvedOrder
      .map((name) => this.providerRegistry.get(name)?.cleanup)
      .filter(Boolean) as (() => void)[];

    this.cleanupFunctions.set(stackId, cleanupFunctions);

    return ProviderStack;
  }

  /**
   * Create a provider stack from legacy ProviderMockOptions
   */
  public createProviderStackFromOptions(
    stackId: string,
    options: ProviderMockOptions = {}
  ): ComponentType<{ children: ReactNode }> {
    const enabledProviders: string[] = [];
    const providerProps: Record<string, any> = {};

    // Convert legacy options to new format
    if (options.session?.enabled !== false) {
      enabledProviders.push('session');
      if (options.session?.session) {
        providerProps.session = { session: options.session.session };
      }
    }

    if (options.theme?.enabled !== false) {
      enabledProviders.push('theme');
      if (options.theme?.defaultTheme) {
        providerProps.theme = { defaultTheme: options.theme.defaultTheme };
      }
    }

    if (options.form?.enabled !== false) {
      enabledProviders.push('form');
      if (options.form?.formId || options.form?.initialValues) {
        providerProps.form = {
          formId: options.form.formId,
          initialValues: options.form.initialValues,
        };
      }
    }

    if (options.toast?.enabled !== false) {
      enabledProviders.push('toast');
      if (options.toast?.initialToasts) {
        // Initialize toasts after provider creation
        setTimeout(() => {
          options.toast?.initialToasts?.forEach((toast) => {
            providerMockUtils.addMockToast(toast);
          });
        }, 0);
      }
    }

    return this.createProviderStack(stackId, {
      enabledProviders,
      providerProps,
    });
  }

  /**
   * Get information about the current provider stack
   */
  public getStackInfo(stackId: string): {
    exists: boolean;
    providers: string[];
    dependencies: Record<string, string[]>;
  } {
    const exists = this.activeStacks.has(stackId);
    const providers = Array.from(this.providerRegistry.keys());
    const dependencies: Record<string, string[]> = {};

    for (const [name, node] of Object.entries(this.dependencyGraph)) {
      dependencies[name] = node.dependencies;
    }

    return { exists, providers, dependencies };
  }

  /**
   * Cleanup a specific provider stack
   */
  public cleanupStack(stackId: string): void {
    const cleanupFunctions = this.cleanupFunctions.get(stackId);
    if (cleanupFunctions) {
      // Run cleanup functions in reverse order
      for (let i = cleanupFunctions.length - 1; i >= 0; i--) {
        try {
          cleanupFunctions[i]();
        } catch (error) {
          console.error(
            `Error during provider cleanup for stack ${stackId}:`,
            error
          );
        }
      }
    }

    this.activeStacks.delete(stackId);
    this.cleanupFunctions.delete(stackId);
  }

  /**
   * Reset a specific provider stack (cleanup and recreate)
   */
  public resetStack(
    stackId: string,
    options?: {
      enabledProviders?: string[];
      providerProps?: Record<string, any>;
    }
  ): ComponentType<{ children: ReactNode }> | null {
    this.cleanupStack(stackId);

    if (options) {
      return this.createProviderStack(stackId, options);
    }

    return null;
  }

  /**
   * Cleanup all active provider stacks
   */
  public cleanupAllStacks(): void {
    const stackIds = Array.from(this.activeStacks.keys());
    for (const stackId of stackIds) {
      this.cleanupStack(stackId);
    }
  }

  /**
   * Reset all provider states to defaults
   */
  public resetAllProviderStates(): void {
    providerMockUtils.clearAllProviderStates();
  }

  /**
   * Get the current state of all providers
   */
  public getAllProviderStates(): {
    toast: any;
    form: any;
    theme: any;
    session: any;
  } {
    return {
      toast: providerMockUtils.getToastState(),
      form: providerMockUtils.getFormState(),
      theme: providerMockUtils.getThemeState(),
      session: providerMockUtils.getSessionState(),
    };
  }

  /**
   * Validate provider configuration and dependencies
   */
  public validateConfiguration(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for circular dependencies
    try {
      const allProviders = Array.from(this.providerRegistry.keys());
      this.resolveDependencies(allProviders);
    } catch (error) {
      errors.push(`Dependency resolution failed: ${error.message}`);
    }

    // Check for missing dependencies
    for (const [name, config] of this.providerRegistry) {
      for (const dependency of config.dependencies || []) {
        if (!this.providerRegistry.has(dependency)) {
          errors.push(
            `Provider '${name}' depends on missing provider '${dependency}'`
          );
        }
      }
    }

    // Check for providers without cleanup functions
    for (const [name, config] of this.providerRegistry) {
      if (!config.cleanup) {
        warnings.push(`Provider '${name}' does not have a cleanup function`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get debug information about the provider system
   */
  public getDebugInfo(): {
    registeredProviders: string[];
    activeStacks: string[];
    dependencyGraph: ProviderDependencyGraph;
    providerStates: any;
    validation: ReturnType<typeof this.validateConfiguration>;
  } {
    return {
      registeredProviders: Array.from(this.providerRegistry.keys()),
      activeStacks: Array.from(this.activeStacks.keys()),
      dependencyGraph: this.dependencyGraph,
      providerStates: this.getAllProviderStates(),
      validation: this.validateConfiguration(),
    };
  }
}

// ============================================================================
// Singleton Instance and Utility Functions
// ============================================================================

export const providerStackManager = ProviderStackManager.getInstance();

/**
 * Create a provider stack with dynamic composition
 */
export const createProviderStack = (
  stackId: string,
  options?: {
    enabledProviders?: string[];
    providerProps?: Record<string, any>;
    onError?: (error: Error, providerName: string) => void;
  }
): ComponentType<{ children: ReactNode }> => {
  return providerStackManager.createProviderStack(stackId, options);
};

/**
 * Create a provider stack from legacy options
 */
export const createProviderStackFromOptions = (
  stackId: string,
  options: ProviderMockOptions = {}
): ComponentType<{ children: ReactNode }> => {
  return providerStackManager.createProviderStackFromOptions(stackId, options);
};

/**
 * Cleanup a provider stack
 */
export const cleanupProviderStack = (stackId: string): void => {
  providerStackManager.cleanupStack(stackId);
};

/**
 * Reset a provider stack
 */
export const resetProviderStack = (
  stackId: string,
  options?: {
    enabledProviders?: string[];
    providerProps?: Record<string, any>;
  }
): ComponentType<{ children: ReactNode }> | null => {
  return providerStackManager.resetStack(stackId, options);
};

/**
 * Cleanup all provider stacks
 */
export const cleanupAllProviderStacks = (): void => {
  providerStackManager.cleanupAllStacks();
};

/**
 * Reset all provider states
 */
export const resetAllProviderStates = (): void => {
  providerStackManager.resetAllProviderStates();
};

// ============================================================================
// Enhanced Provider Stack Component
// ============================================================================

export interface EnhancedProviderStackProps {
  children: ReactNode;
  stackId?: string;
  enabledProviders?: string[];
  providerProps?: Record<string, any>;
  onError?: (error: Error, providerName: string) => void;
  autoCleanup?: boolean;
}

export const EnhancedProviderStack: React.FC<EnhancedProviderStackProps> = ({
  children,
  stackId = 'default',
  enabledProviders,
  providerProps,
  onError,
  autoCleanup = true,
}) => {
  const ProviderStack = React.useMemo(() => {
    return providerStackManager.createProviderStack(stackId, {
      enabledProviders,
      providerProps,
      onError,
    });
  }, [stackId, enabledProviders, providerProps, onError]);

  // Cleanup on unmount if autoCleanup is enabled
  React.useEffect(() => {
    if (autoCleanup) {
      return () => {
        providerStackManager.cleanupStack(stackId);
      };
    }
  }, [stackId, autoCleanup]);

  return React.createElement(ProviderStack, {}, children);
};

// ============================================================================
// Provider Stack Utilities for Testing
// ============================================================================

export const providerStackUtils = {
  // Stack management
  create: createProviderStack,
  createFromOptions: createProviderStackFromOptions,
  cleanup: cleanupProviderStack,
  reset: resetProviderStack,
  cleanupAll: cleanupAllProviderStacks,
  resetAllStates: resetAllProviderStates,

  // Information and debugging
  getStackInfo: (stackId: string) => providerStackManager.getStackInfo(stackId),
  getDebugInfo: () => providerStackManager.getDebugInfo(),
  validate: () => providerStackManager.validateConfiguration(),

  // Provider registration
  registerProvider: (config: ProviderConfig) =>
    providerStackManager.registerProvider(config),
  unregisterProvider: (name: string) =>
    providerStackManager.unregisterProvider(name),

  // State management
  getAllStates: () => providerStackManager.getAllProviderStates(),

  // Manager instance
  manager: providerStackManager,
};

export default {
  ProviderStackManager,
  providerStackManager,
  EnhancedProviderStack,
  createProviderStack,
  createProviderStackFromOptions,
  cleanupProviderStack,
  resetProviderStack,
  cleanupAllProviderStacks,
  resetAllProviderStates,
  utils: providerStackUtils,
};
