/**
 * MockConfigurationLoader - Dynamic Mock Loading and Configuration
 *
 * Provides dynamic loading capabilities for mock configurations from various sources
 * including JSON files, environment variables, and runtime configurations.
 *
 * Requirements: 2.4, 6.1
 */

import { z } from 'zod';
import {
  MockRegistry,
  MockRegistryConfig,
  MockMetadata,
  MockConfiguration,
  MockLoadResult,
  getDefaultRegistry,
} from './MockRegistry';

// ============================================================================
// Configuration Source Types
// ============================================================================

export interface ConfigurationSource {
  type: 'file' | 'environment' | 'runtime' | 'remote';
  path?: string;
  url?: string;
  data?: any;
  priority: number;
  enabled: boolean;
}

export interface MockConfigurationFile {
  version: string;
  metadata: {
    name: string;
    description: string;
    author?: string;
    createdAt: string;
    updatedAt: string;
  };
  registry: MockRegistryConfig;
  mocks: Record<
    string,
    {
      metadata: Omit<MockMetadata, 'createdAt' | 'updatedAt'>;
      configuration: MockConfiguration;
      implementation?: string; // Path to implementation file
    }
  >;
  presets?: Record<
    string,
    {
      description: string;
      mocks: string[];
      configuration: Partial<MockRegistryConfig>;
    }
  >;
}

export interface LoaderOptions {
  sources: ConfigurationSource[];
  autoLoad: boolean;
  validateOnLoad: boolean;
  mergeStrategy: 'override' | 'merge' | 'append';
  errorHandling: 'strict' | 'lenient' | 'silent';
}

export interface LoaderResult {
  success: boolean;
  loadedSources: number;
  totalSources: number;
  mockResults: MockLoadResult[];
  errors: string[];
  warnings: string[];
  loadTime: number;
}

// ============================================================================
// Schema Validation
// ============================================================================

const ConfigurationSourceSchema = z.object({
  type: z.enum(['file', 'environment', 'runtime', 'remote']),
  path: z.string().optional(),
  url: z.string().url().optional(),
  data: z.any().optional(),
  priority: z.number().min(0).max(100),
  enabled: z.boolean(),
});

const MockConfigurationFileSchema = z.object({
  version: z.string(),
  metadata: z.object({
    name: z.string(),
    description: z.string(),
    author: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  registry: z.any(), // Will be validated by MockRegistry
  mocks: z.record(
    z.object({
      metadata: z.any(), // Will be validated by MockRegistry
      configuration: z.any(), // Will be validated by MockRegistry
      implementation: z.string().optional(),
    })
  ),
  presets: z
    .record(
      z.object({
        description: z.string(),
        mocks: z.array(z.string()),
        configuration: z.any(),
      })
    )
    .optional(),
});

// ============================================================================
// MockConfigurationLoader Class
// ============================================================================

export class MockConfigurationLoader {
  private registry: MockRegistry;
  private options: LoaderOptions;
  private loadedConfigurations: Map<string, MockConfigurationFile> = new Map();
  private implementationCache: Map<string, any> = new Map();

  constructor(registry?: MockRegistry, options?: Partial<LoaderOptions>) {
    this.registry = registry || getDefaultRegistry();
    this.options = this.mergeOptions(options);
  }

  // ============================================================================
  // Configuration Loading
  // ============================================================================

  public async loadConfiguration(
    sources?: ConfigurationSource[]
  ): Promise<LoaderResult> {
    const startTime = performance.now();
    const sourcesToLoad = sources || this.options.sources;
    const errors: string[] = [];
    const warnings: string[] = [];
    const mockResults: MockLoadResult[] = [];
    let loadedSources = 0;

    try {
      // Sort sources by priority (higher priority first)
      const sortedSources = [...sourcesToLoad]
        .filter((source) => source.enabled)
        .sort((a, b) => b.priority - a.priority);

      // Load configurations from each source
      for (const source of sortedSources) {
        try {
          const config = await this.loadFromSource(source);
          if (config) {
            this.loadedConfigurations.set(
              source.path || source.url || `runtime-${Date.now()}`,
              config
            );

            // Apply registry configuration
            if (config.registry) {
              this.registry.updateConfig(config.registry);
            }

            // Load mocks from configuration
            const results = await this.loadMocksFromConfig(config);
            mockResults.push(...results);

            loadedSources++;
            this.logDebug(`Loaded configuration from ${source.type} source`);
          }
        } catch (error) {
          const errorMessage = `Failed to load from ${source.type} source: ${error}`;
          if (this.options.errorHandling === 'strict') {
            errors.push(errorMessage);
          } else if (this.options.errorHandling === 'lenient') {
            warnings.push(errorMessage);
          }
          // Silent mode ignores errors
        }
      }

      // Auto-load if enabled
      if (this.options.autoLoad) {
        await this.autoLoadMocks();
      }

      const loadTime = performance.now() - startTime;
      this.logDebug(
        `Configuration loading completed in ${loadTime.toFixed(2)}ms`
      );

      return {
        success: errors.length === 0,
        loadedSources,
        totalSources: sourcesToLoad.length,
        mockResults,
        errors,
        warnings,
        loadTime,
      };
    } catch (error) {
      errors.push(`Configuration loading failed: ${error}`);
      return {
        success: false,
        loadedSources,
        totalSources: sourcesToLoad.length,
        mockResults,
        errors,
        warnings,
        loadTime: performance.now() - startTime,
      };
    }
  }

  private async loadFromSource(
    source: ConfigurationSource
  ): Promise<MockConfigurationFile | null> {
    switch (source.type) {
      case 'file':
        return this.loadFromFile(source.path!);
      case 'environment':
        return this.loadFromEnvironment();
      case 'runtime':
        return this.loadFromRuntime(source.data);
      case 'remote':
        return this.loadFromRemote(source.url!);
      default:
        throw new Error(`Unsupported source type: ${source.type}`);
    }
  }

  private async loadFromFile(
    path: string
  ): Promise<MockConfigurationFile | null> {
    try {
      // In a real implementation, this would use fs.readFile or similar
      // For testing environment, we'll simulate file loading
      const mockFileContent = this.getMockFileContent(path);

      if (!mockFileContent) {
        throw new Error(`Configuration file not found: ${path}`);
      }

      const config = JSON.parse(mockFileContent);

      if (this.options.validateOnLoad) {
        MockConfigurationFileSchema.parse(config);
      }

      return config;
    } catch (error) {
      throw new Error(`Failed to load configuration file '${path}': ${error}`);
    }
  }

  private async loadFromEnvironment(): Promise<MockConfigurationFile | null> {
    try {
      const envConfig = process.env.MOCK_REGISTRY_CONFIG;
      if (!envConfig) {
        return null;
      }

      const config = JSON.parse(envConfig);

      if (this.options.validateOnLoad) {
        MockConfigurationFileSchema.parse(config);
      }

      return config;
    } catch (error) {
      throw new Error(
        `Failed to load configuration from environment: ${error}`
      );
    }
  }

  private async loadFromRuntime(
    data: any
  ): Promise<MockConfigurationFile | null> {
    try {
      if (!data) {
        return null;
      }

      if (this.options.validateOnLoad) {
        MockConfigurationFileSchema.parse(data);
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to load runtime configuration: ${error}`);
    }
  }

  private async loadFromRemote(
    url: string
  ): Promise<MockConfigurationFile | null> {
    try {
      // In a real implementation, this would use fetch or similar
      // For testing environment, we'll simulate remote loading
      throw new Error(
        'Remote configuration loading not implemented in test environment'
      );
    } catch (error) {
      throw new Error(`Failed to load configuration from '${url}': ${error}`);
    }
  }

  // ============================================================================
  // Mock Loading from Configuration
  // ============================================================================

  private async loadMocksFromConfig(
    config: MockConfigurationFile
  ): Promise<MockLoadResult[]> {
    const results: MockLoadResult[] = [];

    for (const [mockName, mockConfig] of Object.entries(config.mocks)) {
      try {
        // Load mock implementation
        let mockImplementation: any;

        if (mockConfig.implementation) {
          mockImplementation = await this.loadImplementation(
            mockConfig.implementation
          );
        } else {
          // Use built-in mock implementations
          mockImplementation = this.getBuiltInMock(mockName);
        }

        if (!mockImplementation) {
          results.push({
            success: false,
            mockName,
            version: mockConfig.metadata.version,
            errors: [`No implementation found for mock '${mockName}'`],
            warnings: [],
            loadTime: 0,
          });
          continue;
        }

        // Create full metadata
        const fullMetadata: MockMetadata = {
          ...mockConfig.metadata,
          createdAt: new Date(mockConfig.metadata.createdAt || Date.now()),
          updatedAt: new Date(mockConfig.metadata.updatedAt || Date.now()),
        };

        // Register the mock
        const result = this.registry.register(
          mockName,
          mockImplementation,
          fullMetadata,
          mockConfig.configuration
        );

        results.push(result);

        // Auto-load if enabled and configuration allows
        if (this.options.autoLoad && mockConfig.configuration.enabled) {
          const loadResult = await this.registry.load(mockName);
          if (!loadResult.success) {
            results.push(loadResult);
          }
        }
      } catch (error) {
        results.push({
          success: false,
          mockName,
          version: mockConfig.metadata?.version || 'unknown',
          errors: [`Failed to load mock '${mockName}': ${error}`],
          warnings: [],
          loadTime: 0,
        });
      }
    }

    return results;
  }

  private async loadImplementation(implementationPath: string): Promise<any> {
    // Check cache first
    if (this.implementationCache.has(implementationPath)) {
      return this.implementationCache.get(implementationPath);
    }

    try {
      // In a real implementation, this would dynamically import the module
      // For testing environment, we'll use built-in implementations
      const implementation = this.getBuiltInMock(implementationPath);

      if (implementation) {
        this.implementationCache.set(implementationPath, implementation);
        return implementation;
      }

      throw new Error(`Implementation not found: ${implementationPath}`);
    } catch (error) {
      throw new Error(
        `Failed to load implementation '${implementationPath}': ${error}`
      );
    }
  }

  // ============================================================================
  // Built-in Mock Implementations
  // ============================================================================

  private getBuiltInMock(name: string): any {
    const builtInMocks: Record<string, any> = {
      useToast: this.createUseToastMock(),
      useEnhancedForm: this.createUseEnhancedFormMock(),
      useAutoSave: this.createUseAutoSaveMock(),
      useRealTimeValidation: this.createUseRealTimeValidationMock(),
      localStorage: this.createLocalStorageMock(),
      timers: this.createTimersMock(),
      fetch: this.createFetchMock(),
      WebSocket: this.createWebSocketMock(),
    };

    return builtInMocks[name];
  }

  private createUseToastMock(): any {
    return jest.fn(() => ({
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
      toasts: [],
      queue: [],
    }));
  }

  private createUseEnhancedFormMock(): any {
    return jest.fn(() => ({
      register: jest.fn(),
      handleSubmit: jest.fn(),
      watch: jest.fn(),
      getValues: jest.fn(),
      setValue: jest.fn(),
      formState: {
        isDirty: false,
        isValid: false,
        isSubmitting: false,
        errors: {},
      },
      validateField: jest.fn(),
      saveNow: jest.fn(),
      isSaving: false,
    }));
  }

  private createUseAutoSaveMock(): any {
    return jest.fn(() => ({
      saveNow: jest.fn(),
      isSaving: false,
    }));
  }

  private createUseRealTimeValidationMock(): any {
    return jest.fn(() => ({
      validateField: jest.fn(),
      getFieldValidation: jest.fn(),
      validationState: {},
    }));
  }

  private createLocalStorageMock(): any {
    return {
      getItem: jest.fn(),
      setItem: jest.fn(),
      removeItem: jest.fn(),
      clear: jest.fn(),
    };
  }

  private createTimersMock(): any {
    return {
      setTimeout: jest.fn(),
      clearTimeout: jest.fn(),
      setInterval: jest.fn(),
      clearInterval: jest.fn(),
    };
  }

  private createFetchMock(): any {
    return jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({}),
      text: jest.fn().mockResolvedValue(''),
    });
  }

  private createWebSocketMock(): any {
    return jest.fn().mockImplementation(() => ({
      send: jest.fn(),
      close: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      readyState: 1, // OPEN
    }));
  }

  // ============================================================================
  // Preset Management
  // ============================================================================

  public async loadPreset(
    presetName: string,
    configName?: string
  ): Promise<LoaderResult> {
    const startTime = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const mockResults: MockLoadResult[] = [];

    try {
      // Find the configuration containing the preset
      let targetConfig: MockConfigurationFile | null = null;

      if (configName) {
        targetConfig = this.loadedConfigurations.get(configName) || null;
      } else {
        // Search all loaded configurations
        for (const config of this.loadedConfigurations.values()) {
          if (config.presets && config.presets[presetName]) {
            targetConfig = config;
            break;
          }
        }
      }

      if (
        !targetConfig ||
        !targetConfig.presets ||
        !targetConfig.presets[presetName]
      ) {
        errors.push(`Preset '${presetName}' not found`);
        return {
          success: false,
          loadedSources: 0,
          totalSources: 1,
          mockResults,
          errors,
          warnings,
          loadTime: performance.now() - startTime,
        };
      }

      const preset = targetConfig.presets[presetName];

      // Apply preset configuration to registry
      if (preset.configuration) {
        this.registry.updateConfig(preset.configuration);
      }

      // Load preset mocks
      for (const mockName of preset.mocks) {
        const loadResult = await this.registry.load(mockName);
        mockResults.push(loadResult);
      }

      const loadTime = performance.now() - startTime;
      this.logDebug(
        `Preset '${presetName}' loaded in ${loadTime.toFixed(2)}ms`
      );

      return {
        success: errors.length === 0,
        loadedSources: 1,
        totalSources: 1,
        mockResults,
        errors,
        warnings,
        loadTime,
      };
    } catch (error) {
      errors.push(`Failed to load preset '${presetName}': ${error}`);
      return {
        success: false,
        loadedSources: 0,
        totalSources: 1,
        mockResults,
        errors,
        warnings,
        loadTime: performance.now() - startTime,
      };
    }
  }

  public listPresets(): Array<{
    name: string;
    description: string;
    mocks: string[];
  }> {
    const presets: Array<{
      name: string;
      description: string;
      mocks: string[];
    }> = [];

    for (const config of this.loadedConfigurations.values()) {
      if (config.presets) {
        for (const [name, preset] of Object.entries(config.presets)) {
          presets.push({
            name,
            description: preset.description,
            mocks: preset.mocks,
          });
        }
      }
    }

    return presets;
  }

  // ============================================================================
  // Auto-loading
  // ============================================================================

  private async autoLoadMocks(): Promise<void> {
    const enabledMocks = this.registry.list({ enabled: true, loaded: false });

    for (const entry of enabledMocks) {
      try {
        await this.registry.load(entry.metadata.name);
      } catch (error) {
        this.logDebug(
          `Failed to auto-load mock '${entry.metadata.name}': ${error}`
        );
      }
    }
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private mergeOptions(userOptions?: Partial<LoaderOptions>): LoaderOptions {
    const defaultOptions: LoaderOptions = {
      sources: [],
      autoLoad: true,
      validateOnLoad: true,
      mergeStrategy: 'merge',
      errorHandling: 'lenient',
    };

    return { ...defaultOptions, ...userOptions };
  }

  private getMockFileContent(path: string): string | null {
    // Simulate file content for common configuration files
    const mockFiles: Record<string, string> = {
      'mock-config.json': JSON.stringify(
        {
          version: '1.0.0',
          metadata: {
            name: 'Test Mock Configuration',
            description: 'Configuration for test infrastructure mocks',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          registry: {
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
              debugMode: true,
              strictMode: false,
            },
          },
          mocks: {
            useToast: {
              metadata: {
                name: 'useToast',
                version: '1.0.0',
                type: 'hook',
                dependencies: [],
                compatibleVersions: ['19.1.0'],
                description: 'Mock for useToast hook',
                tags: ['hook', 'toast', 'ui'],
              },
              configuration: {
                enabled: true,
              },
            },
            useEnhancedForm: {
              metadata: {
                name: 'useEnhancedForm',
                version: '1.0.0',
                type: 'hook',
                dependencies: ['useToast'],
                compatibleVersions: ['19.1.0'],
                description: 'Mock for useEnhancedForm hook',
                tags: ['hook', 'form', 'validation'],
              },
              configuration: {
                enabled: true,
              },
            },
          },
          presets: {
            'enhanced-forms': {
              description: 'Complete enhanced form testing setup',
              mocks: ['useToast', 'useEnhancedForm', 'localStorage', 'timers'],
              configuration: {
                globalOptions: {
                  debugMode: true,
                  strictMode: false,
                },
              },
            },
          },
        },
        null,
        2
      ),
    };

    return mockFiles[path] || null;
  }

  private logDebug(message: string): void {
    if (this.options.errorHandling !== 'silent') {
      console.debug(`[MockConfigurationLoader] ${message}`);
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  public getLoadedConfigurations(): Map<string, MockConfigurationFile> {
    return new Map(this.loadedConfigurations);
  }

  public clearCache(): void {
    this.implementationCache.clear();
    this.loadedConfigurations.clear();
  }

  public getRegistry(): MockRegistry {
    return this.registry;
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

let defaultLoader: MockConfigurationLoader | null = null;

export function getDefaultLoader(): MockConfigurationLoader {
  if (!defaultLoader) {
    defaultLoader = new MockConfigurationLoader();
  }
  return defaultLoader;
}

export function loadMockConfiguration(
  sources?: ConfigurationSource[]
): Promise<LoaderResult> {
  return getDefaultLoader().loadConfiguration(sources);
}

export function loadMockPreset(
  presetName: string,
  configName?: string
): Promise<LoaderResult> {
  return getDefaultLoader().loadPreset(presetName, configName);
}

export function listMockPresets(): Array<{
  name: string;
  description: string;
  mocks: string[];
}> {
  return getDefaultLoader().listPresets();
}

// Export types
export type {
  ConfigurationSource,
  MockConfigurationFile,
  LoaderOptions,
  LoaderResult,
};
