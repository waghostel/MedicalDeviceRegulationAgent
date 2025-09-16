/**
 * MockRegistry - Centralized Mock Management System
 * 
 * Implements centralized mock management with dynamic loading, configuration,
 * and compatibility checking for the test infrastructure.
 * 
 * Requirements: 2.4, 6.1
 */

import { z } from 'zod';

// ============================================================================
// Type Definitions
// ============================================================================

export interface MockMetadata {
  name: string;
  version: string;
  type: 'hook' | 'component' | 'provider' | 'utility';
  dependencies: string[];
  compatibleVersions: string[];
  description: string;
  author?: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export interface MockConfiguration {
  enabled: boolean;
  version?: string;
  options?: Record<string, any>;
  overrides?: Record<string, any>;
  dependencies?: string[];
}

export interface MockRegistryEntry {
  metadata: MockMetadata;
  configuration: MockConfiguration;
  mockImplementation: any;
  isLoaded: boolean;
  loadedAt?: Date;
  lastUsed?: Date;
  usageCount: number;
}

export interface MockRegistryConfig {
  version: string;
  react: {
    version: string;
    compatibility: 'strict' | 'loose';
    errorHandling: 'aggregate' | 'individual';
  };
  mocks: Record<string, MockConfiguration>;
  globalOptions: {
    autoCleanup: boolean;
    performanceTracking: boolean;
    debugMode: boolean;
    strictMode: boolean;
  };
}

export interface MockLoadResult {
  success: boolean;
  mockName: string;
  version: string;
  errors: string[];
  warnings: string[];
  loadTime: number;
}

export interface MockCompatibilityResult {
  compatible: boolean;
  mockName: string;
  requiredVersion: string;
  availableVersion: string;
  issues: string[];
  suggestions: string[];
}

export interface MockRegistryStats {
  totalMocks: number;
  loadedMocks: number;
  enabledMocks: number;
  totalUsage: number;
  averageLoadTime: number;
  memoryUsage: number;
  lastCleanup: Date | null;
}

// ============================================================================
// Configuration Schema Validation
// ============================================================================

const MockMetadataSchema = z.object({
  name: z.string().min(1),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  type: z.enum(['hook', 'component', 'provider', 'utility']),
  dependencies: z.array(z.string()),
  compatibleVersions: z.array(z.string()),
  description: z.string().min(1),
  author: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  tags: z.array(z.string()),
});

const MockConfigurationSchema = z.object({
  enabled: z.boolean(),
  version: z.string().optional(),
  options: z.record(z.any()).optional(),
  overrides: z.record(z.any()).optional(),
  dependencies: z.array(z.string()).optional(),
});

const MockRegistryConfigSchema = z.object({
  version: z.string(),
  react: z.object({
    version: z.string(),
    compatibility: z.enum(['strict', 'loose']),
    errorHandling: z.enum(['aggregate', 'individual']),
  }),
  mocks: z.record(MockConfigurationSchema),
  globalOptions: z.object({
    autoCleanup: z.boolean(),
    performanceTracking: z.boolean(),
    debugMode: z.boolean(),
    strictMode: z.boolean(),
  }),
});

// ============================================================================
// MockRegistry Class
// ============================================================================

export class MockRegistry {
  private registry: Map<string, MockRegistryEntry> = new Map();
  private config: MockRegistryConfig;
  private stats: MockRegistryStats;
  private loadOrder: string[] = [];
  private dependencyGraph: Map<string, Set<string>> = new Map();

  constructor(config?: Partial<MockRegistryConfig>) {
    this.config = this.mergeConfig(config);
    this.stats = this.initializeStats();
    this.setupGlobalCleanup();
  }

  // ============================================================================
  // Configuration Management
  // ============================================================================

  private mergeConfig(userConfig?: Partial<MockRegistryConfig>): MockRegistryConfig {
    const defaultConfig: MockRegistryConfig = {
      version: '1.0.0',
      react: {
        version: '19.1.0',
        compatibility: 'strict',
        errorHandling: 'aggregate',
      },
      mocks: {},
      globalOptions: {
        autoCleanup: true,
        performanceTracking: true,
        debugMode: process.env.NODE_ENV === 'development',
        strictMode: true,
      },
    };

    return {
      ...defaultConfig,
      ...userConfig,
      react: { ...defaultConfig.react, ...userConfig?.react },
      globalOptions: { ...defaultConfig.globalOptions, ...userConfig?.globalOptions },
      mocks: { ...defaultConfig.mocks, ...userConfig?.mocks },
    };
  }

  public updateConfig(updates: Partial<MockRegistryConfig>): void {
    const newConfig = this.mergeConfig(updates);
    
    // Validate configuration
    try {
      MockRegistryConfigSchema.parse(newConfig);
      this.config = newConfig;
      this.logDebug('Configuration updated successfully');
    } catch (error) {
      throw new Error(`Invalid configuration: ${error}`);
    }
  }

  public getConfig(): MockRegistryConfig {
    return { ...this.config };
  }

  // ============================================================================
  // Mock Registration and Loading
  // ============================================================================

  public register(
    name: string,
    mockImplementation: any,
    metadata: Partial<MockMetadata>,
    configuration?: Partial<MockConfiguration>
  ): MockLoadResult {
    const startTime = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Validate mock name
      if (this.registry.has(name)) {
        if (this.config.globalOptions.strictMode) {
          errors.push(`Mock '${name}' is already registered`);
        } else {
          warnings.push(`Mock '${name}' is being overridden`);
        }
      }

      // Create metadata with defaults
      const fullMetadata: MockMetadata = {
        name,
        version: metadata.version || '1.0.0',
        type: metadata.type || 'utility',
        dependencies: metadata.dependencies || [],
        compatibleVersions: metadata.compatibleVersions || [this.config.react.version],
        description: metadata.description || `Mock for ${name}`,
        author: metadata.author,
        createdAt: metadata.createdAt || new Date(),
        updatedAt: new Date(),
        tags: metadata.tags || [],
      };

      // Validate metadata
      MockMetadataSchema.parse(fullMetadata);

      // Create configuration with defaults
      const fullConfiguration: MockConfiguration = {
        enabled: true,
        ...configuration,
        ...this.config.mocks[name], // Apply global config overrides
      };

      // Validate configuration
      MockConfigurationSchema.parse(fullConfiguration);

      // Check compatibility
      const compatibilityResult = this.checkCompatibility(name, fullMetadata);
      if (!compatibilityResult.compatible && this.config.globalOptions.strictMode) {
        errors.push(...compatibilityResult.issues);
      } else if (!compatibilityResult.compatible) {
        warnings.push(...compatibilityResult.issues);
      }

      // Register the mock
      const entry: MockRegistryEntry = {
        metadata: fullMetadata,
        configuration: fullConfiguration,
        mockImplementation,
        isLoaded: true,
        loadedAt: new Date(),
        usageCount: 0,
      };

      this.registry.set(name, entry);
      this.loadOrder.push(name);
      this.updateDependencyGraph(name, fullMetadata.dependencies);
      this.updateStats();

      const loadTime = performance.now() - startTime;
      this.logDebug(`Mock '${name}' registered successfully in ${loadTime.toFixed(2)}ms`);

      return {
        success: errors.length === 0,
        mockName: name,
        version: fullMetadata.version,
        errors,
        warnings,
        loadTime,
      };

    } catch (error) {
      errors.push(`Failed to register mock '${name}': ${error}`);
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

  public async load(name: string, options?: Record<string, any>): Promise<MockLoadResult> {
    const startTime = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const entry = this.registry.get(name);
      if (!entry) {
        errors.push(`Mock '${name}' is not registered`);
        return {
          success: false,
          mockName: name,
          version: 'unknown',
          errors,
          warnings,
          loadTime: performance.now() - startTime,
        };
      }

      // Check if already loaded
      if (entry.isLoaded) {
        warnings.push(`Mock '${name}' is already loaded`);
      }

      // Check if enabled
      if (!entry.configuration.enabled) {
        errors.push(`Mock '${name}' is disabled`);
        return {
          success: false,
          mockName: name,
          version: entry.metadata.version,
          errors,
          warnings,
          loadTime: performance.now() - startTime,
        };
      }

      // Load dependencies first
      for (const dependency of entry.metadata.dependencies) {
        const depResult = await this.load(dependency);
        if (!depResult.success) {
          errors.push(`Failed to load dependency '${dependency}' for mock '${name}'`);
        }
      }

      // Apply options and overrides
      if (options) {
        entry.configuration.options = { ...entry.configuration.options, ...options };
      }

      // Mark as loaded
      entry.isLoaded = true;
      entry.loadedAt = new Date();
      entry.usageCount++;

      // Update global mock registry if available
      if (global.__GLOBAL_MOCK_REGISTRY) {
        global.__GLOBAL_MOCK_REGISTRY.register(
          entry.metadata.type,
          name,
          entry.mockImplementation
        );
      }

      this.updateStats();
      const loadTime = performance.now() - startTime;
      this.logDebug(`Mock '${name}' loaded successfully in ${loadTime.toFixed(2)}ms`);

      return {
        success: errors.length === 0,
        mockName: name,
        version: entry.metadata.version,
        errors,
        warnings,
        loadTime,
      };

    } catch (error) {
      errors.push(`Failed to load mock '${name}': ${error}`);
      return {
        success: false,
        mockName: name,
        version: 'unknown',
        errors,
        warnings,
        loadTime: performance.now() - startTime,
      };
    }
  }

  public unload(name: string): boolean {
    try {
      const entry = this.registry.get(name);
      if (!entry) {
        this.logDebug(`Mock '${name}' is not registered`);
        return false;
      }

      // Check for dependents
      const dependents = this.getDependents(name);
      if (dependents.length > 0 && this.config.globalOptions.strictMode) {
        throw new Error(`Cannot unload mock '${name}' - it has dependents: ${dependents.join(', ')}`);
      }

      // Unload from global registry
      if (global.__GLOBAL_MOCK_REGISTRY) {
        const registryMap = global.__GLOBAL_MOCK_REGISTRY[entry.metadata.type + 's'] as Map<string, any>;
        if (registryMap && registryMap.delete) {
          registryMap.delete(name);
        }
      }

      // Mark as unloaded
      entry.isLoaded = false;
      entry.loadedAt = undefined;

      this.updateStats();
      this.logDebug(`Mock '${name}' unloaded successfully`);
      return true;

    } catch (error) {
      this.logDebug(`Failed to unload mock '${name}': ${error}`);
      return false;
    }
  }

  // ============================================================================
  // Mock Retrieval and Management
  // ============================================================================

  public get(name: string): MockRegistryEntry | undefined {
    const entry = this.registry.get(name);
    if (entry) {
      entry.lastUsed = new Date();
      entry.usageCount++;
      this.updateStats();
    }
    return entry;
  }

  public getMock(name: string): any {
    const entry = this.get(name);
    return entry?.mockImplementation;
  }

  public isLoaded(name: string): boolean {
    const entry = this.registry.get(name);
    return entry?.isLoaded || false;
  }

  public isEnabled(name: string): boolean {
    const entry = this.registry.get(name);
    return entry?.configuration.enabled || false;
  }

  public list(filter?: {
    type?: MockMetadata['type'];
    enabled?: boolean;
    loaded?: boolean;
    tags?: string[];
  }): MockRegistryEntry[] {
    let entries = Array.from(this.registry.values());

    if (filter) {
      if (filter.type) {
        entries = entries.filter(entry => entry.metadata.type === filter.type);
      }
      if (filter.enabled !== undefined) {
        entries = entries.filter(entry => entry.configuration.enabled === filter.enabled);
      }
      if (filter.loaded !== undefined) {
        entries = entries.filter(entry => entry.isLoaded === filter.loaded);
      }
      if (filter.tags && filter.tags.length > 0) {
        entries = entries.filter(entry => 
          filter.tags!.some(tag => entry.metadata.tags.includes(tag))
        );
      }
    }

    return entries;
  }

  // ============================================================================
  // Compatibility and Versioning
  // ============================================================================

  public checkCompatibility(name: string, metadata: MockMetadata): MockCompatibilityResult {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check React version compatibility
    const reactVersion = this.config.react.version;
    const isReactCompatible = metadata.compatibleVersions.some(version => 
      this.isVersionCompatible(reactVersion, version)
    );

    if (!isReactCompatible) {
      issues.push(`Mock '${name}' is not compatible with React ${reactVersion}`);
      suggestions.push(`Update mock to support React ${reactVersion} or use compatibility mode`);
    }

    // Check dependency compatibility
    for (const dependency of metadata.dependencies) {
      const depEntry = this.registry.get(dependency);
      if (!depEntry) {
        issues.push(`Missing dependency '${dependency}' for mock '${name}'`);
        suggestions.push(`Register dependency '${dependency}' before loading '${name}'`);
      } else if (!depEntry.configuration.enabled) {
        issues.push(`Dependency '${dependency}' is disabled for mock '${name}'`);
        suggestions.push(`Enable dependency '${dependency}' or remove it from '${name}'`);
      }
    }

    // Check for circular dependencies
    if (this.hasCircularDependency(name, metadata.dependencies)) {
      issues.push(`Circular dependency detected for mock '${name}'`);
      suggestions.push(`Review and restructure dependencies for '${name}'`);
    }

    return {
      compatible: issues.length === 0,
      mockName: name,
      requiredVersion: metadata.version,
      availableVersion: this.config.version,
      issues,
      suggestions,
    };
  }

  private isVersionCompatible(version1: string, version2: string): boolean {
    // Simple semantic version compatibility check
    const [major1, minor1] = version1.split('.').map(Number);
    const [major2, minor2] = version2.split('.').map(Number);

    if (this.config.react.compatibility === 'strict') {
      return major1 === major2 && minor1 === minor2;
    } else {
      return major1 === major2; // Loose compatibility - same major version
    }
  }

  private hasCircularDependency(name: string, dependencies: string[], visited: Set<string> = new Set()): boolean {
    if (visited.has(name)) {
      return true;
    }

    visited.add(name);

    for (const dependency of dependencies) {
      const depEntry = this.registry.get(dependency);
      if (depEntry && this.hasCircularDependency(dependency, depEntry.metadata.dependencies, visited)) {
        return true;
      }
    }

    visited.delete(name);
    return false;
  }

  // ============================================================================
  // Dependency Management
  // ============================================================================

  private updateDependencyGraph(name: string, dependencies: string[]): void {
    this.dependencyGraph.set(name, new Set(dependencies));
  }

  private getDependents(name: string): string[] {
    const dependents: string[] = [];
    
    for (const [mockName, dependencies] of this.dependencyGraph.entries()) {
      if (dependencies.has(name)) {
        dependents.push(mockName);
      }
    }

    return dependents;
  }

  public getDependencyTree(name: string): string[] {
    const tree: string[] = [];
    const visited = new Set<string>();

    const traverse = (mockName: string) => {
      if (visited.has(mockName)) return;
      visited.add(mockName);

      const entry = this.registry.get(mockName);
      if (entry) {
        tree.push(mockName);
        for (const dependency of entry.metadata.dependencies) {
          traverse(dependency);
        }
      }
    };

    traverse(name);
    return tree;
  }

  // ============================================================================
  // Cleanup and Maintenance
  // ============================================================================

  public cleanup(options?: {
    unloadUnused?: boolean;
    maxAge?: number; // in milliseconds
    force?: boolean;
  }): void {
    const { unloadUnused = true, maxAge = 30 * 60 * 1000, force = false } = options || {};
    const now = new Date();

    for (const [name, entry] of this.registry.entries()) {
      let shouldUnload = false;

      if (force) {
        shouldUnload = true;
      } else if (unloadUnused && entry.lastUsed) {
        const age = now.getTime() - entry.lastUsed.getTime();
        if (age > maxAge) {
          shouldUnload = true;
        }
      }

      if (shouldUnload && entry.isLoaded) {
        this.unload(name);
      }
    }

    this.stats.lastCleanup = now;
    this.logDebug('Registry cleanup completed');
  }

  public reset(): void {
    // Unload all mocks
    for (const name of this.registry.keys()) {
      this.unload(name);
    }

    // Clear registry
    this.registry.clear();
    this.loadOrder = [];
    this.dependencyGraph.clear();

    // Reset stats
    this.stats = this.initializeStats();

    // Clear global registry
    if (global.__GLOBAL_MOCK_REGISTRY) {
      global.__GLOBAL_MOCK_REGISTRY.clearAll();
    }

    this.logDebug('Registry reset completed');
  }

  // ============================================================================
  // Statistics and Monitoring
  // ============================================================================

  private initializeStats(): MockRegistryStats {
    return {
      totalMocks: 0,
      loadedMocks: 0,
      enabledMocks: 0,
      totalUsage: 0,
      averageLoadTime: 0,
      memoryUsage: 0,
      lastCleanup: null,
    };
  }

  private updateStats(): void {
    const entries = Array.from(this.registry.values());
    
    this.stats.totalMocks = entries.length;
    this.stats.loadedMocks = entries.filter(e => e.isLoaded).length;
    this.stats.enabledMocks = entries.filter(e => e.configuration.enabled).length;
    this.stats.totalUsage = entries.reduce((sum, e) => sum + e.usageCount, 0);
    
    // Estimate memory usage (rough calculation)
    this.stats.memoryUsage = entries.reduce((sum, entry) => {
      const size = JSON.stringify(entry).length * 2; // Rough byte estimate
      return sum + size;
    }, 0);
  }

  public getStats(): MockRegistryStats {
    this.updateStats();
    return { ...this.stats };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private setupGlobalCleanup(): void {
    if (this.config.globalOptions.autoCleanup) {
      // Setup cleanup on process exit
      if (typeof process !== 'undefined') {
        process.on('exit', () => this.cleanup({ force: true }));
        process.on('SIGINT', () => this.cleanup({ force: true }));
        process.on('SIGTERM', () => this.cleanup({ force: true }));
      }

      // Setup cleanup on window unload (browser environment)
      if (typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => this.cleanup({ force: true }));
      }
    }
  }

  private logDebug(message: string): void {
    if (this.config.globalOptions.debugMode) {
      console.debug(`[MockRegistry] ${message}`);
    }
  }

  // ============================================================================
  // Export and Import
  // ============================================================================

  public export(): {
    config: MockRegistryConfig;
    metadata: MockMetadata[];
    stats: MockRegistryStats;
  } {
    return {
      config: this.getConfig(),
      metadata: Array.from(this.registry.values()).map(entry => entry.metadata),
      stats: this.getStats(),
    };
  }

  public import(data: {
    config?: Partial<MockRegistryConfig>;
    mocks?: Array<{
      name: string;
      mockImplementation: any;
      metadata: Partial<MockMetadata>;
      configuration?: Partial<MockConfiguration>;
    }>;
  }): MockLoadResult[] {
    const results: MockLoadResult[] = [];

    // Update configuration
    if (data.config) {
      this.updateConfig(data.config);
    }

    // Register mocks
    if (data.mocks) {
      for (const mock of data.mocks) {
        const result = this.register(
          mock.name,
          mock.mockImplementation,
          mock.metadata,
          mock.configuration
        );
        results.push(result);
      }
    }

    return results;
  }
}

// ============================================================================
// Default Registry Instance
// ============================================================================

let defaultRegistry: MockRegistry | null = null;

export function getDefaultRegistry(): MockRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new MockRegistry();
  }
  return defaultRegistry;
}

export function setDefaultRegistry(registry: MockRegistry): void {
  defaultRegistry = registry;
}

// ============================================================================
// Convenience Functions
// ============================================================================

export function registerMock(
  name: string,
  mockImplementation: any,
  metadata: Partial<MockMetadata>,
  configuration?: Partial<MockConfiguration>
): MockLoadResult {
  return getDefaultRegistry().register(name, mockImplementation, metadata, configuration);
}

export function loadMock(name: string, options?: Record<string, any>): Promise<MockLoadResult> {
  return getDefaultRegistry().load(name, options);
}

export function getMock(name: string): any {
  return getDefaultRegistry().getMock(name);
}

export function unloadMock(name: string): boolean {
  return getDefaultRegistry().unload(name);
}

export function listMocks(filter?: Parameters<MockRegistry['list']>[0]): MockRegistryEntry[] {
  return getDefaultRegistry().list(filter);
}

export function checkMockCompatibility(name: string, metadata: MockMetadata): MockCompatibilityResult {
  return getDefaultRegistry().checkCompatibility(name, metadata);
}

export function cleanupMocks(options?: Parameters<MockRegistry['cleanup']>[0]): void {
  return getDefaultRegistry().cleanup(options);
}

export function resetMocks(): void {
  return getDefaultRegistry().reset();
}

export function getMockStats(): MockRegistryStats {
  return getDefaultRegistry().getStats();
}

// Export types for external use
export type {
  MockMetadata,
  MockConfiguration,
  MockRegistryEntry,
  MockRegistryConfig,
  MockLoadResult,
  MockCompatibilityResult,
  MockRegistryStats,
};