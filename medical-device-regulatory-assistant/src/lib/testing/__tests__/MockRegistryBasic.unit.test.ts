/**
 * MockRegistry Basic Unit Test Suite
 *
 * Basic tests for the centralized mock management system
 */

import { MockRegistry, MockMetadata, MockConfiguration } from '../MockRegistry';

describe('MockRegistry Basic Functionality', () => {
  let registry: MockRegistry;

  beforeEach(() => {
    registry = new MockRegistry({
      globalOptions: {
        strictMode: false, // Disable strict mode for testing
        debugMode: false,
        autoCleanup: false,
        performanceTracking: false,
      },
    });
  });

  afterEach(() => {
    registry.reset();
    jest.clearAllMocks();
  });

  describe('Core Registration and Loading', () => {
    it('should register a mock successfully', () => {
      const mockImplementation = jest.fn(() => ({ test: 'value' }));
      const metadata: Partial<MockMetadata> = {
        name: 'testMock',
        version: '1.0.0',
        type: 'hook',
        description: 'Test mock for unit testing',
        dependencies: [],
        compatibleVersions: ['19.1.0'],
        tags: ['test'],
      };

      const result = registry.register(
        'testMock',
        mockImplementation,
        metadata
      );

      expect(result.success).toBe(true);
      expect(result.mockName).toBe('testMock');
      expect(result.version).toBe('1.0.0');
      expect(result.errors).toHaveLength(0);
    });

    it('should load a registered mock', async () => {
      const mockImplementation = jest.fn(() => ({ test: 'value' }));
      const metadata: Partial<MockMetadata> = {
        name: 'testMock',
        version: '1.0.0',
        type: 'hook',
        description: 'Test mock',
        dependencies: [],
        compatibleVersions: ['19.1.0'],
        tags: ['test'],
      };

      registry.register('testMock', mockImplementation, metadata);
      const result = await registry.load('testMock');

      expect(result.success).toBe(true);
      expect(result.mockName).toBe('testMock');
      expect(registry.isLoaded('testMock')).toBe(true);
    });

    it('should retrieve a loaded mock', () => {
      const mockImplementation = jest.fn(() => ({ test: 'value' }));
      const metadata: Partial<MockMetadata> = {
        name: 'testMock',
        version: '1.0.0',
        type: 'hook',
        description: 'Test mock',
        dependencies: [],
        compatibleVersions: ['19.1.0'],
        tags: ['test'],
      };

      registry.register('testMock', mockImplementation, metadata);
      const retrievedMock = registry.getMock('testMock');

      expect(retrievedMock).toBe(mockImplementation);
    });

    it('should list mocks with filters', () => {
      const hookMock = jest.fn();
      const componentMock = jest.fn();

      registry.register('hookMock', hookMock, {
        name: 'hookMock',
        version: '1.0.0',
        type: 'hook',
        description: 'Hook mock',
        dependencies: [],
        compatibleVersions: ['19.1.0'],
        tags: ['hook'],
      });

      registry.register('componentMock', componentMock, {
        name: 'componentMock',
        version: '1.0.0',
        type: 'component',
        description: 'Component mock',
        dependencies: [],
        compatibleVersions: ['19.1.0'],
        tags: ['component'],
      });

      const hookMocks = registry.list({ type: 'hook' });
      const componentMocks = registry.list({ type: 'component' });

      expect(hookMocks).toHaveLength(1);
      expect(hookMocks[0].metadata.name).toBe('hookMock');
      expect(componentMocks).toHaveLength(1);
      expect(componentMocks[0].metadata.name).toBe('componentMock');
    });

    it('should handle mock dependencies', async () => {
      const dependencyMock = jest.fn(() => ({ dependency: true }));
      const mainMock = jest.fn(() => ({ main: true }));

      // Register dependency first
      registry.register('dependency', dependencyMock, {
        name: 'dependency',
        version: '1.0.0',
        type: 'utility',
        description: 'Dependency mock',
        dependencies: [],
        compatibleVersions: ['19.1.0'],
        tags: ['dependency'],
      });

      // Register main mock with dependency
      registry.register('mainMock', mainMock, {
        name: 'mainMock',
        version: '1.0.0',
        type: 'hook',
        description: 'Main mock with dependency',
        dependencies: ['dependency'],
        compatibleVersions: ['19.1.0'],
        tags: ['main'],
      });

      const result = await registry.load('mainMock');

      expect(result.success).toBe(true);
      expect(registry.isLoaded('dependency')).toBe(true);
      expect(registry.isLoaded('mainMock')).toBe(true);
    });

    it('should unload mocks correctly', () => {
      const mockImplementation = jest.fn();

      registry.register('testMock', mockImplementation, {
        name: 'testMock',
        version: '1.0.0',
        type: 'hook',
        description: 'Test mock',
        dependencies: [],
        compatibleVersions: ['19.1.0'],
        tags: ['test'],
      });

      registry.load('testMock');
      expect(registry.isLoaded('testMock')).toBe(true);

      const unloaded = registry.unload('testMock');
      expect(unloaded).toBe(true);
      expect(registry.isLoaded('testMock')).toBe(false);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      const newConfig = {
        globalOptions: {
          debugMode: true,
          strictMode: true,
          autoCleanup: true,
          performanceTracking: true,
        },
      };

      expect(() => registry.updateConfig(newConfig)).not.toThrow();

      const config = registry.getConfig();
      expect(config.globalOptions.debugMode).toBe(true);
      expect(config.globalOptions.strictMode).toBe(true);
    });

    it('should provide registry statistics', () => {
      const mockImplementation = jest.fn();

      registry.register('testMock', mockImplementation, {
        name: 'testMock',
        version: '1.0.0',
        type: 'hook',
        description: 'Test mock',
        dependencies: [],
        compatibleVersions: ['19.1.0'],
        tags: ['test'],
      });

      const stats = registry.getStats();

      expect(stats.totalMocks).toBe(1);
      expect(stats.enabledMocks).toBe(1);
      // Note: Mock is automatically marked as loaded during registration
      expect(stats.loadedMocks).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle registration errors gracefully', () => {
      // Try to register with invalid metadata
      const result = registry.register('', null, {});

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle loading non-existent mocks', async () => {
      const result = await registry.load('nonExistentMock');

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        "Mock 'nonExistentMock' is not registered"
      );
    });

    it('should handle duplicate registration in non-strict mode', () => {
      const mockImplementation1 = jest.fn(() => ({ version: 1 }));
      const mockImplementation2 = jest.fn(() => ({ version: 2 }));

      const metadata = {
        name: 'duplicateMock',
        version: '1.0.0',
        type: 'hook' as const,
        description: 'Duplicate mock test',
        dependencies: [],
        compatibleVersions: ['19.1.0'],
        tags: ['test'],
      };

      // First registration should succeed
      const result1 = registry.register(
        'duplicateMock',
        mockImplementation1,
        metadata
      );
      expect(result1.success).toBe(true);

      // Second registration should succeed with warning (non-strict mode)
      const result2 = registry.register(
        'duplicateMock',
        mockImplementation2,
        metadata
      );
      expect(result2.success).toBe(true);
      expect(result2.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Cleanup and Reset', () => {
    it('should cleanup unused mocks', () => {
      const mockImplementation = jest.fn();

      registry.register('testMock', mockImplementation, {
        name: 'testMock',
        version: '1.0.0',
        type: 'hook',
        description: 'Test mock',
        dependencies: [],
        compatibleVersions: ['19.1.0'],
        tags: ['test'],
      });

      registry.load('testMock');
      expect(registry.isLoaded('testMock')).toBe(true);

      registry.cleanup({ force: true });
      expect(registry.isLoaded('testMock')).toBe(false);
    });

    it('should reset registry completely', () => {
      const mockImplementation = jest.fn();

      registry.register('testMock', mockImplementation, {
        name: 'testMock',
        version: '1.0.0',
        type: 'hook',
        description: 'Test mock',
        dependencies: [],
        compatibleVersions: ['19.1.0'],
        tags: ['test'],
      });

      const statsBefore = registry.getStats();
      expect(statsBefore.totalMocks).toBe(1);

      registry.reset();

      const statsAfter = registry.getStats();
      expect(statsAfter.totalMocks).toBe(0);
    });
  });
});
