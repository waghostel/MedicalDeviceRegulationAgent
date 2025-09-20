/**
 * MockRegistryIntegration - Unified Mock Registry System
 *
 * Integrates MockRegistry, MockConfigurationLoader, and MockVersionManager
 * to provide a comprehensive mock management system for the test infrastructure.
 *
 * Requirements: 2.4, 6.1
 */

import {
  MockRegistry,
  MockRegistryConfig,
  MockMetadata,
  MockConfiguration,
  MockLoadResult,
  MockRegistryStats,
  getDefaultRegistry,
} from './MockRegistry';

import {
  MockConfigurationLoader,
  ConfigurationSource,
  LoaderResult,
  getDefaultLoader,
} from './MockConfigurationLoader';

import {
  MockVersionManager,
  VersionCompatibilityResult,
  MockVersion,
  getDefaultVersionManager,
} from './MockVersionManager';

// Import existing mock implementations
import { useToastMock, toastMockUtils } from './use-toast-mock';
import {
  enhancedFormMocks,
  enhancedFormMockUtils,
} from './enhanced-form-hook-mocks';

// ============================================================================
// Unified Integration Types
// ============================================================================

export interface MockRegistrySystem {
  registry: MockRegistry;
  loader: MockConfigurationLoader;
  versionManager: MockVersionManager;
}

export interface SystemInitializationOptions {
  registryConfig?: Partial<MockRegistryConfig>;
  configurationSources?: ConfigurationSource[];
  autoLoadPresets?: string[];
  enableVersionChecking?: boolean;
  strictCompatibility?: boolean;
}

export interface SystemStatus {
  initialized: boolean;
  registryStats: MockRegistryStats;
  loadedConfigurations: number;
  compatibilityIssues: VersionCompatibilityResult[];
  lastUpdate: Date;
}

export interface MockRegistrationOptions {
  version?: string;
  autoLoad?: boolean;
  checkCompatibility?: boolean;
  overrideExisting?: boolean;
}

// ============================================================================
// MockRegistryIntegration Class
// ============================================================================

export class MockRegistryIntegration {
  private registry: MockRegistry;
  private loader: MockConfigurationLoader;
  private versionManager: MockVersionManager;
  private initialized: boolean = false;
  private initializationTime: Date | null = null;

  constructor(options?: SystemInitializationOptions) {
    this.registry = getDefaultRegistry();
    this.loader = getDefaultLoader();
    this.versionManager = getDefaultVersionManager();

    if (options) {
      this.initialize(options);
    }
  }

  // ============================================================================
  // System Initialization
  // ============================================================================

  public async initialize(
    options: SystemInitializationOptions = {}
  ): Promise<LoaderResult> {
    const startTime = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const mockResults: MockLoadResult[] = [];

    try {
      // Update registry configuration
      if (options.registryConfig) {
        this.registry.updateConfig(options.registryConfig);
      }

      // Register built-in mocks
      const builtInResults = this.registerBuiltInMocks();
      mockResults.push(...builtInResults);

      // Load configurations from sources
      if (
        options.configurationSources &&
        options.configurationSources.length > 0
      ) {
        const loaderResult = await this.loader.loadConfiguration(
          options.configurationSources
        );
        mockResults.push(...loaderResult.mockResults);
        errors.push(...loaderResult.errors);
        warnings.push(...loaderResult.warnings);
      }

      // Load presets
      if (options.autoLoadPresets && options.autoLoadPresets.length > 0) {
        for (const presetName of options.autoLoadPresets) {
          try {
            const presetResult = await this.loader.loadPreset(presetName);
            mockResults.push(...presetResult.mockResults);
            errors.push(...presetResult.errors);
            warnings.push(...presetResult.warnings);
          } catch (error) {
            errors.push(`Failed to load preset '${presetName}': ${error}`);
          }
        }
      }

      // Perform compatibility checks if enabled
      if (options.enableVersionChecking) {
        const compatibilityResults = this.performCompatibilityChecks(
          options.strictCompatibility
        );

        for (const result of compatibilityResults) {
          if (!result.compatible) {
            if (options.strictCompatibility) {
              errors.push(
                `Compatibility check failed for ${result.mockName}@${result.mockVersion}`
              );
            } else {
              warnings.push(
                `Compatibility issues detected for ${result.mockName}@${result.mockVersion}`
              );
            }
          }
        }
      }

      this.initialized = true;
      this.initializationTime = new Date();

      const loadTime = performance.now() - startTime;
      this.logDebug(
        `Mock registry system initialized in ${loadTime.toFixed(2)}ms`
      );

      return {
        success: errors.length === 0,
        loadedSources: options.configurationSources?.length || 0,
        totalSources: options.configurationSources?.length || 0,
        mockResults,
        errors,
        warnings,
        loadTime,
      };
    } catch (error) {
      errors.push(`System initialization failed: ${error}`);
      return {
        success: false,
        loadedSources: 0,
        totalSources: options.configurationSources?.length || 0,
        mockResults,
        errors,
        warnings,
        loadTime: performance.now() - startTime,
      };
    }
  }

  private registerBuiltInMocks(): MockLoadResult[] {
    const results: MockLoadResult[] = [];

    // Register useToast mock
    results.push(
      this.registry.register(
        'useToast',
        useToastMock,
        {
          name: 'useToast',
          version: '1.1.0',
          type: 'hook',
          dependencies: [],
          compatibleVersions: ['18.0.0', '19.1.0'],
          description: 'Enhanced useToast hook mock with contextual methods',
          tags: ['hook', 'toast', 'ui', 'notifications'],
        },
        {
          enabled: true,
          options: {
            utils: toastMockUtils,
          },
        }
      )
    );

    // Register enhanced form mocks
    results.push(
      this.registry.register(
        'useEnhancedForm',
        enhancedFormMocks.useEnhancedForm,
        {
          name: 'useEnhancedForm',
          version: '1.0.0',
          type: 'hook',
          dependencies: ['useToast'],
          compatibleVersions: ['18.0.0', '19.1.0'],
          description: 'Enhanced form hook mock with validation and auto-save',
          tags: ['hook', 'form', 'validation', 'auto-save'],
        },
        {
          enabled: true,
          options: {
            utils: enhancedFormMockUtils,
          },
        }
      )
    );

    results.push(
      this.registry.register(
        'useAutoSave',
        enhancedFormMocks.useAutoSave,
        {
          name: 'useAutoSave',
          version: '1.0.0',
          type: 'hook',
          dependencies: [],
          compatibleVersions: ['18.0.0', '19.1.0'],
          description: 'Auto-save hook mock for form persistence',
          tags: ['hook', 'auto-save', 'persistence'],
        },
        {
          enabled: true,
        }
      )
    );

    results.push(
      this.registry.register(
        'useRealTimeValidation',
        enhancedFormMocks.useRealTimeValidation,
        {
          name: 'useRealTimeValidation',
          version: '1.0.0',
          type: 'hook',
          dependencies: [],
          compatibleVersions: ['18.0.0', '19.1.0'],
          description: 'Real-time validation hook mock',
          tags: ['hook', 'validation', 'real-time'],
        },
        {
          enabled: true,
        }
      )
    );

    // Register utility mocks
    results.push(
      this.registry.register(
        'localStorage',
        this.createLocalStorageMock(),
        {
          name: 'localStorage',
          version: '1.0.0',
          type: 'utility',
          dependencies: [],
          compatibleVersions: ['18.0.0', '19.1.0'],
          description: 'localStorage mock for testing',
          tags: ['utility', 'storage', 'persistence'],
        },
        {
          enabled: true,
        }
      )
    );

    results.push(
      this.registry.register(
        'timers',
        this.createTimersMock(),
        {
          name: 'timers',
          version: '1.0.0',
          type: 'utility',
          dependencies: [],
          compatibleVersions: ['18.0.0', '19.1.0'],
          description: 'Timer mocks for testing debounced functionality',
          tags: ['utility', 'timers', 'debounce'],
        },
        {
          enabled: true,
        }
      )
    );

    return results;
  }

  // ============================================================================
  // Mock Management API
  // ============================================================================

  public async registerMock(
    name: string,
    mockImplementation: any,
    metadata: Partial<MockMetadata>,
    configuration?: Partial<MockConfiguration>,
    options?: MockRegistrationOptions
  ): Promise<MockLoadResult> {
    const {
      version = '1.0.0',
      autoLoad = true,
      checkCompatibility = true,
      overrideExisting = false,
    } = options || {};

    // Check if mock already exists
    if (this.registry.get(name) && !overrideExisting) {
      return {
        success: false,
        mockName: name,
        version,
        errors: [
          `Mock '${name}' already exists. Use overrideExisting option to replace.`,
        ],
        warnings: [],
        loadTime: 0,
      };
    }

    // Perform compatibility check if enabled
    if (checkCompatibility) {
      const compatibilityResult = this.checkMockCompatibility(name, version);
      if (!compatibilityResult.compatible) {
        return {
          success: false,
          mockName: name,
          version,
          errors: [
            `Compatibility check failed: ${compatibilityResult.issues.map((i) => i.message).join(', ')}`,
          ],
          warnings: [],
          loadTime: 0,
        };
      }
    }

    // Register the mock
    const registrationResult = this.registry.register(
      name,
      mockImplementation,
      { ...metadata, version },
      configuration
    );

    // Auto-load if requested and registration was successful
    if (autoLoad && registrationResult.success) {
      const loadResult = await this.registry.load(name);
      if (!loadResult.success) {
        registrationResult.errors.push(...loadResult.errors);
        registrationResult.warnings.push(...loadResult.warnings);
        registrationResult.success = false;
      }
    }

    return registrationResult;
  }

  public async loadMock(
    name: string,
    options?: Record<string, any>
  ): Promise<MockLoadResult> {
    return this.registry.load(name, options);
  }

  public getMock(name: string): any {
    return this.registry.getMock(name);
  }

  public unloadMock(name: string): boolean {
    return this.registry.unload(name);
  }

  public listMocks(filter?: Parameters<MockRegistry['list']>[0]) {
    return this.registry.list(filter);
  }

  // ============================================================================
  // Configuration Management
  // ============================================================================

  public async loadConfiguration(
    sources: ConfigurationSource[]
  ): Promise<LoaderResult> {
    return this.loader.loadConfiguration(sources);
  }

  public async loadPreset(
    presetName: string,
    configName?: string
  ): Promise<LoaderResult> {
    return this.loader.loadPreset(presetName, configName);
  }

  public listPresets() {
    return this.loader.listPresets();
  }

  // ============================================================================
  // Version and Compatibility Management
  // ============================================================================

  public checkMockCompatibility(
    mockName: string,
    mockVersion: string,
    targetEnvironment?: Parameters<MockVersionManager['checkCompatibility']>[2]
  ): VersionCompatibilityResult {
    const environment = targetEnvironment || this.getCurrentEnvironment();
    return this.versionManager.checkCompatibility(
      mockName,
      mockVersion,
      environment
    );
  }

  public getMockVersion(
    mockName: string,
    versionString: string
  ): MockVersion | undefined {
    return this.versionManager.getVersion(mockName, versionString);
  }

  public getLatestMockVersion(
    mockName: string,
    includePrerelease = false
  ): MockVersion | undefined {
    return this.versionManager.getLatestVersion(mockName, includePrerelease);
  }

  private performCompatibilityChecks(
    strict = false
  ): VersionCompatibilityResult[] {
    const results: VersionCompatibilityResult[] = [];
    const environment = this.getCurrentEnvironment();
    const mocks = this.registry.list({ enabled: true });

    for (const mock of mocks) {
      const result = this.versionManager.checkCompatibility(
        mock.metadata.name,
        mock.metadata.version,
        environment
      );

      if (!result.compatible || (strict && result.issues.length > 0)) {
        results.push(result);
      }
    }

    return results;
  }

  private getCurrentEnvironment() {
    return {
      react: '19.1.0',
      reactTestingLibrary: '14.0.0',
      jest: '29.0.0',
      typescript: '5.0.0',
      dependencies: {
        'react-hook-form': '7.45.0',
        zod: '3.21.0',
      },
    };
  }

  // ============================================================================
  // System Status and Monitoring
  // ============================================================================

  public getSystemStatus(): SystemStatus {
    const compatibilityIssues = this.performCompatibilityChecks();

    return {
      initialized: this.initialized,
      registryStats: this.registry.getStats(),
      loadedConfigurations: this.loader.getLoadedConfigurations().size,
      compatibilityIssues,
      lastUpdate: this.initializationTime || new Date(),
    };
  }

  public cleanup(options?: Parameters<MockRegistry['cleanup']>[0]): void {
    this.registry.cleanup(options);
    this.loader.clearCache();
    this.versionManager.clearCache();
  }

  public reset(): void {
    this.registry.reset();
    this.loader.clearCache();
    this.versionManager.clearCache();
    this.initialized = false;
    this.initializationTime = null;
  }

  // ============================================================================
  // Utility Mock Creators
  // ============================================================================

  private createLocalStorageMock() {
    const storage: Record<string, string> = {};

    return {
      getItem: jest.fn((key: string) => storage[key] || null),
      setItem: jest.fn((key: string, value: string) => {
        storage[key] = value;
      }),
      removeItem: jest.fn((key: string) => {
        delete storage[key];
      }),
      clear: jest.fn(() => {
        Object.keys(storage).forEach((key) => delete storage[key]);
      }),
      key: jest.fn((index: number) => {
        const keys = Object.keys(storage);
        return keys[index] || null;
      }),
      get length() {
        return Object.keys(storage).length;
      },
    };
  }

  private createTimersMock() {
    return {
      useFakeTimers: () => jest.useFakeTimers(),
      useRealTimers: () => jest.useRealTimers(),
      advanceTimersByTime: (ms: number) => jest.advanceTimersByTime(ms),
      runAllTimers: () => jest.runAllTimers(),
      runOnlyPendingTimers: () => jest.runOnlyPendingTimers(),
      clearAllTimers: () => jest.clearAllTimers(),
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private logDebug(message: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[MockRegistryIntegration] ${message}`);
    }
  }

  // ============================================================================
  // Getters for Individual Systems
  // ============================================================================

  public getRegistry(): MockRegistry {
    return this.registry;
  }

  public getLoader(): MockConfigurationLoader {
    return this.loader;
  }

  public getVersionManager(): MockVersionManager {
    return this.versionManager;
  }
}

// ============================================================================
// Default Instance and Convenience Functions
// ============================================================================

let defaultIntegration: MockRegistryIntegration | null = null;

export function getDefaultIntegration(): MockRegistryIntegration {
  if (!defaultIntegration) {
    defaultIntegration = new MockRegistryIntegration();
  }
  return defaultIntegration;
}

export async function initializeMockSystem(
  options?: SystemInitializationOptions
): Promise<LoaderResult> {
  return getDefaultIntegration().initialize(options);
}

export async function registerMock(
  name: string,
  mockImplementation: any,
  metadata: Partial<MockMetadata>,
  configuration?: Partial<MockConfiguration>,
  options?: MockRegistrationOptions
): Promise<MockLoadResult> {
  return getDefaultIntegration().registerMock(
    name,
    mockImplementation,
    metadata,
    configuration,
    options
  );
}

export async function loadMock(
  name: string,
  options?: Record<string, any>
): Promise<MockLoadResult> {
  return getDefaultIntegration().loadMock(name, options);
}

export function getMock(name: string): any {
  return getDefaultIntegration().getMock(name);
}

export function unloadMock(name: string): boolean {
  return getDefaultIntegration().unloadMock(name);
}

export function listMocks(filter?: Parameters<MockRegistry['list']>[0]) {
  return getDefaultIntegration().listMocks(filter);
}

export async function loadMockConfiguration(
  sources: ConfigurationSource[]
): Promise<LoaderResult> {
  return getDefaultIntegration().loadConfiguration(sources);
}

export async function loadMockPreset(
  presetName: string,
  configName?: string
): Promise<LoaderResult> {
  return getDefaultIntegration().loadPreset(presetName, configName);
}

export function getMockSystemStatus(): SystemStatus {
  return getDefaultIntegration().getSystemStatus();
}

export function cleanupMockSystem(
  options?: Parameters<MockRegistry['cleanup']>[0]
): void {
  return getDefaultIntegration().cleanup(options);
}

export function resetMockSystem(): void {
  return getDefaultIntegration().reset();
}

// Export types
export type {
  MockRegistrySystem,
  SystemInitializationOptions,
  SystemStatus,
  MockRegistrationOptions,
};
