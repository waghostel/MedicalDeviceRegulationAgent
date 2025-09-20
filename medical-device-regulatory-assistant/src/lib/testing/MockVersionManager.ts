/**
 * MockVersionManager - Mock Versioning and Compatibility System
 *
 * Provides comprehensive versioning and compatibility checking for mock implementations
 * to ensure proper mock behavior across different React and library versions.
 *
 * Requirements: 2.4, 6.1
 */

import { z } from 'zod';

// ============================================================================
// Version and Compatibility Types
// ============================================================================

export interface SemanticVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease?: string;
  build?: string;
}

export interface VersionRange {
  min?: SemanticVersion;
  max?: SemanticVersion;
  exact?: SemanticVersion;
  exclude?: SemanticVersion[];
}

export interface MockVersion {
  version: SemanticVersion;
  releaseDate: Date;
  changelog: string[];
  breakingChanges: string[];
  deprecations: string[];
  compatibilityMatrix: CompatibilityMatrix;
  migrationGuide?: string;
}

export interface CompatibilityMatrix {
  react: VersionRange;
  reactTestingLibrary: VersionRange;
  jest: VersionRange;
  typescript: VersionRange;
  dependencies: Record<string, VersionRange>;
}

export interface VersionCompatibilityResult {
  compatible: boolean;
  mockName: string;
  mockVersion: string;
  targetVersion: string;
  issues: CompatibilityIssue[];
  recommendations: string[];
  migrationRequired: boolean;
  migrationPath?: MigrationPath;
}

export interface CompatibilityIssue {
  type: 'error' | 'warning' | 'info';
  category:
    | 'breaking-change'
    | 'deprecation'
    | 'version-mismatch'
    | 'dependency-conflict';
  message: string;
  affectedFeatures: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  resolution?: string;
}

export interface MigrationPath {
  fromVersion: SemanticVersion;
  toVersion: SemanticVersion;
  steps: MigrationStep[];
  estimatedEffort: 'low' | 'medium' | 'high';
  automatable: boolean;
}

export interface MigrationStep {
  order: number;
  description: string;
  type: 'code-change' | 'config-change' | 'dependency-update' | 'manual-action';
  automated: boolean;
  codeExample?: string;
  validation?: string;
}

export interface VersionManagerConfig {
  strictMode: boolean;
  allowPrerelease: boolean;
  autoMigration: boolean;
  warningThreshold: 'low' | 'medium' | 'high';
  cacheVersionData: boolean;
  updateCheckInterval: number; // in milliseconds
}

// ============================================================================
// Schema Validation
// ============================================================================

const SemanticVersionSchema = z.object({
  major: z.number().min(0),
  minor: z.number().min(0),
  patch: z.number().min(0),
  prerelease: z.string().optional(),
  build: z.string().optional(),
});

const VersionRangeSchema = z.object({
  min: SemanticVersionSchema.optional(),
  max: SemanticVersionSchema.optional(),
  exact: SemanticVersionSchema.optional(),
  exclude: z.array(SemanticVersionSchema).optional(),
});

const CompatibilityMatrixSchema = z.object({
  react: VersionRangeSchema,
  reactTestingLibrary: VersionRangeSchema,
  jest: VersionRangeSchema,
  typescript: VersionRangeSchema,
  dependencies: z.record(z.string(), VersionRangeSchema),
});

// ============================================================================
// MockVersionManager Class
// ============================================================================

export class MockVersionManager {
  private versions: Map<string, Map<string, MockVersion>> = new Map(); // mockName -> version -> MockVersion
  private config: VersionManagerConfig;
  private compatibilityCache: Map<string, VersionCompatibilityResult> =
    new Map();
  private migrationCache: Map<string, MigrationPath> = new Map();

  constructor(config?: Partial<VersionManagerConfig>) {
    this.config = this.mergeConfig(config);
    this.initializeBuiltInVersions();
  }

  // ============================================================================
  // Configuration Management
  // ============================================================================

  private mergeConfig(
    userConfig?: Partial<VersionManagerConfig>
  ): VersionManagerConfig {
    const defaultConfig: VersionManagerConfig = {
      strictMode: true,
      allowPrerelease: false,
      autoMigration: false,
      warningThreshold: 'medium',
      cacheVersionData: true,
      updateCheckInterval: 24 * 60 * 60 * 1000, // 24 hours
    };

    return { ...defaultConfig, ...userConfig };
  }

  public updateConfig(updates: Partial<VersionManagerConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  // ============================================================================
  // Version Management
  // ============================================================================

  public registerVersion(mockName: string, version: MockVersion): void {
    if (!this.versions.has(mockName)) {
      this.versions.set(mockName, new Map());
    }

    const mockVersions = this.versions.get(mockName)!;
    const versionString = this.versionToString(version.version);

    // Validate version data
    try {
      SemanticVersionSchema.parse(version.version);
      CompatibilityMatrixSchema.parse(version.compatibilityMatrix);
    } catch (error) {
      throw new Error(
        `Invalid version data for ${mockName}@${versionString}: ${error}`
      );
    }

    mockVersions.set(versionString, version);

    // Clear related caches
    this.clearCacheForMock(mockName);

    this.logDebug(`Registered version ${versionString} for mock '${mockName}'`);
  }

  public getVersion(
    mockName: string,
    versionString: string
  ): MockVersion | undefined {
    const mockVersions = this.versions.get(mockName);
    return mockVersions?.get(versionString);
  }

  public getLatestVersion(
    mockName: string,
    includePrerelease = false
  ): MockVersion | undefined {
    const mockVersions = this.versions.get(mockName);
    if (!mockVersions) return undefined;

    let latestVersion: MockVersion | undefined;
    let latestSemVer: SemanticVersion | undefined;

    for (const version of mockVersions.values()) {
      if (!includePrerelease && version.version.prerelease) {
        continue;
      }

      if (
        !latestSemVer ||
        this.compareVersions(version.version, latestSemVer) > 0
      ) {
        latestVersion = version;
        latestSemVer = version.version;
      }
    }

    return latestVersion;
  }

  public listVersions(mockName: string): MockVersion[] {
    const mockVersions = this.versions.get(mockName);
    if (!mockVersions) return [];

    return Array.from(mockVersions.values()).sort(
      (a, b) => this.compareVersions(b.version, a.version) // Newest first
    );
  }

  public getAllMocks(): string[] {
    return Array.from(this.versions.keys());
  }

  // ============================================================================
  // Compatibility Checking
  // ============================================================================

  public checkCompatibility(
    mockName: string,
    mockVersion: string,
    targetEnvironment: {
      react?: string;
      reactTestingLibrary?: string;
      jest?: string;
      typescript?: string;
      dependencies?: Record<string, string>;
    }
  ): VersionCompatibilityResult {
    const cacheKey = `${mockName}@${mockVersion}:${JSON.stringify(targetEnvironment)}`;

    if (this.config.cacheVersionData && this.compatibilityCache.has(cacheKey)) {
      return this.compatibilityCache.get(cacheKey)!;
    }

    const version = this.getVersion(mockName, mockVersion);
    if (!version) {
      const result: VersionCompatibilityResult = {
        compatible: false,
        mockName,
        mockVersion,
        targetVersion: 'unknown',
        issues: [
          {
            type: 'error',
            category: 'version-mismatch',
            message: `Version ${mockVersion} not found for mock '${mockName}'`,
            affectedFeatures: ['all'],
            severity: 'critical',
          },
        ],
        recommendations: [
          `Register version ${mockVersion} for mock '${mockName}'`,
        ],
        migrationRequired: false,
      };

      if (this.config.cacheVersionData) {
        this.compatibilityCache.set(cacheKey, result);
      }

      return result;
    }

    const issues: CompatibilityIssue[] = [];
    const recommendations: string[] = [];
    let compatible = true;

    // Check React compatibility
    if (targetEnvironment.react) {
      const reactCompatibility = this.checkVersionRange(
        this.parseVersion(targetEnvironment.react),
        version.compatibilityMatrix.react
      );

      if (!reactCompatibility.compatible) {
        compatible = false;
        issues.push({
          type: 'error',
          category: 'version-mismatch',
          message: `React version ${targetEnvironment.react} is not compatible with mock ${mockName}@${mockVersion}`,
          affectedFeatures: ['rendering', 'hooks'],
          severity: 'critical',
          resolution: `Use React version ${this.formatVersionRange(version.compatibilityMatrix.react)}`,
        });
      }
    }

    // Check React Testing Library compatibility
    if (targetEnvironment.reactTestingLibrary) {
      const rtlCompatibility = this.checkVersionRange(
        this.parseVersion(targetEnvironment.reactTestingLibrary),
        version.compatibilityMatrix.reactTestingLibrary
      );

      if (!rtlCompatibility.compatible) {
        issues.push({
          type: rtlCompatibility.severity === 'critical' ? 'error' : 'warning',
          category: 'version-mismatch',
          message: `React Testing Library version ${targetEnvironment.reactTestingLibrary} may have compatibility issues`,
          affectedFeatures: ['testing', 'queries'],
          severity: rtlCompatibility.severity,
          resolution: `Use React Testing Library version ${this.formatVersionRange(version.compatibilityMatrix.reactTestingLibrary)}`,
        });

        if (rtlCompatibility.severity === 'critical') {
          compatible = false;
        }
      }
    }

    // Check Jest compatibility
    if (targetEnvironment.jest) {
      const jestCompatibility = this.checkVersionRange(
        this.parseVersion(targetEnvironment.jest),
        version.compatibilityMatrix.jest
      );

      if (!jestCompatibility.compatible) {
        issues.push({
          type: jestCompatibility.severity === 'critical' ? 'error' : 'warning',
          category: 'version-mismatch',
          message: `Jest version ${targetEnvironment.jest} may have compatibility issues`,
          affectedFeatures: ['mocking', 'testing'],
          severity: jestCompatibility.severity,
          resolution: `Use Jest version ${this.formatVersionRange(version.compatibilityMatrix.jest)}`,
        });

        if (jestCompatibility.severity === 'critical') {
          compatible = false;
        }
      }
    }

    // Check TypeScript compatibility
    if (targetEnvironment.typescript) {
      const tsCompatibility = this.checkVersionRange(
        this.parseVersion(targetEnvironment.typescript),
        version.compatibilityMatrix.typescript
      );

      if (!tsCompatibility.compatible) {
        issues.push({
          type: 'warning',
          category: 'version-mismatch',
          message: `TypeScript version ${targetEnvironment.typescript} may have type compatibility issues`,
          affectedFeatures: ['types', 'intellisense'],
          severity: 'medium',
          resolution: `Use TypeScript version ${this.formatVersionRange(version.compatibilityMatrix.typescript)}`,
        });
      }
    }

    // Check dependency compatibility
    if (targetEnvironment.dependencies) {
      for (const [depName, depVersion] of Object.entries(
        targetEnvironment.dependencies
      )) {
        const depRange = version.compatibilityMatrix.dependencies[depName];
        if (depRange) {
          const depCompatibility = this.checkVersionRange(
            this.parseVersion(depVersion),
            depRange
          );

          if (!depCompatibility.compatible) {
            issues.push({
              type:
                depCompatibility.severity === 'critical' ? 'error' : 'warning',
              category: 'dependency-conflict',
              message: `Dependency ${depName}@${depVersion} may cause compatibility issues`,
              affectedFeatures: ['integration'],
              severity: depCompatibility.severity,
              resolution: `Use ${depName} version ${this.formatVersionRange(depRange)}`,
            });

            if (depCompatibility.severity === 'critical') {
              compatible = false;
            }
          }
        }
      }
    }

    // Check for breaking changes and deprecations
    this.checkBreakingChanges(version, issues, recommendations);
    this.checkDeprecations(version, issues, recommendations);

    // Generate migration path if needed
    let migrationPath: MigrationPath | undefined;
    const migrationRequired = issues.some(
      (issue) =>
        issue.category === 'breaking-change' ||
        (issue.category === 'version-mismatch' && issue.severity === 'critical')
    );

    if (migrationRequired) {
      migrationPath = this.generateMigrationPath(
        mockName,
        mockVersion,
        targetEnvironment
      );
    }

    const result: VersionCompatibilityResult = {
      compatible,
      mockName,
      mockVersion,
      targetVersion: targetEnvironment.react || 'unknown',
      issues,
      recommendations,
      migrationRequired,
      migrationPath,
    };

    if (this.config.cacheVersionData) {
      this.compatibilityCache.set(cacheKey, result);
    }

    return result;
  }

  private checkVersionRange(
    version: SemanticVersion,
    range: VersionRange
  ): { compatible: boolean; severity: 'low' | 'medium' | 'high' | 'critical' } {
    // Check exact version match
    if (range.exact) {
      const compatible = this.compareVersions(version, range.exact) === 0;
      return { compatible, severity: compatible ? 'low' : 'critical' };
    }

    // Check exclusions
    if (range.exclude) {
      for (const excluded of range.exclude) {
        if (this.compareVersions(version, excluded) === 0) {
          return { compatible: false, severity: 'high' };
        }
      }
    }

    // Check min/max range
    let compatible = true;
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'low';

    if (range.min && this.compareVersions(version, range.min) < 0) {
      compatible = false;
      severity = 'critical';
    }

    if (range.max && this.compareVersions(version, range.max) > 0) {
      compatible = false;
      severity = 'high';
    }

    return { compatible, severity };
  }

  private checkBreakingChanges(
    version: MockVersion,
    issues: CompatibilityIssue[],
    recommendations: string[]
  ): void {
    if (version.breakingChanges.length > 0) {
      issues.push({
        type: 'error',
        category: 'breaking-change',
        message: `Version ${this.versionToString(version.version)} contains breaking changes`,
        affectedFeatures: version.breakingChanges,
        severity: 'critical',
        resolution: 'Review breaking changes and update code accordingly',
      });

      recommendations.push('Review the migration guide for breaking changes');

      if (version.migrationGuide) {
        recommendations.push(
          `Follow migration guide: ${version.migrationGuide}`
        );
      }
    }
  }

  private checkDeprecations(
    version: MockVersion,
    issues: CompatibilityIssue[],
    recommendations: string[]
  ): void {
    if (version.deprecations.length > 0) {
      issues.push({
        type: 'warning',
        category: 'deprecation',
        message: `Version ${this.versionToString(version.version)} contains deprecations`,
        affectedFeatures: version.deprecations,
        severity: 'medium',
        resolution: 'Update code to use non-deprecated APIs',
      });

      recommendations.push(
        'Update deprecated API usage before next major version'
      );
    }
  }

  // ============================================================================
  // Migration Management
  // ============================================================================

  public generateMigrationPath(
    mockName: string,
    fromVersion: string,
    targetEnvironment: any
  ): MigrationPath | undefined {
    const cacheKey = `${mockName}:${fromVersion}->target`;

    if (this.config.cacheVersionData && this.migrationCache.has(cacheKey)) {
      return this.migrationCache.get(cacheKey);
    }

    const currentVersion = this.getVersion(mockName, fromVersion);
    const latestVersion = this.getLatestVersion(mockName);

    if (!currentVersion || !latestVersion) {
      return undefined;
    }

    const steps: MigrationStep[] = [];
    let estimatedEffort: 'low' | 'medium' | 'high' = 'low';
    let automatable = true;

    // Generate migration steps based on version differences
    if (currentVersion.breakingChanges.length > 0) {
      steps.push({
        order: 1,
        description: 'Address breaking changes',
        type: 'code-change',
        automated: false,
        codeExample: '// Review breaking changes in changelog',
        validation: 'Run tests to ensure compatibility',
      });
      estimatedEffort = 'high';
      automatable = false;
    }

    if (currentVersion.deprecations.length > 0) {
      steps.push({
        order: 2,
        description: 'Update deprecated API usage',
        type: 'code-change',
        automated: false,
        codeExample: '// Replace deprecated methods with new alternatives',
        validation: 'Check for deprecation warnings',
      });
      if (estimatedEffort === 'low') estimatedEffort = 'medium';
    }

    // Add dependency update steps
    steps.push({
      order: 3,
      description: 'Update mock version',
      type: 'dependency-update',
      automated: true,
      codeExample: `// Update to version ${this.versionToString(latestVersion.version)}`,
      validation: 'Verify mock functionality',
    });

    const migrationPath: MigrationPath = {
      fromVersion: currentVersion.version,
      toVersion: latestVersion.version,
      steps,
      estimatedEffort,
      automatable,
    };

    if (this.config.cacheVersionData) {
      this.migrationCache.set(cacheKey, migrationPath);
    }

    return migrationPath;
  }

  // ============================================================================
  // Version Utilities
  // ============================================================================

  public parseVersion(versionString: string): SemanticVersion {
    const regex =
      /^(\d+)\.(\d+)\.(\d+)(?:-([a-zA-Z0-9.-]+))?(?:\+([a-zA-Z0-9.-]+))?$/;
    const match = versionString.match(regex);

    if (!match) {
      throw new Error(`Invalid version string: ${versionString}`);
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4],
      build: match[5],
    };
  }

  public versionToString(version: SemanticVersion): string {
    let versionString = `${version.major}.${version.minor}.${version.patch}`;

    if (version.prerelease) {
      versionString += `-${version.prerelease}`;
    }

    if (version.build) {
      versionString += `+${version.build}`;
    }

    return versionString;
  }

  public compareVersions(a: SemanticVersion, b: SemanticVersion): number {
    // Compare major.minor.patch
    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    if (a.patch !== b.patch) return a.patch - b.patch;

    // Handle prerelease versions
    if (a.prerelease && !b.prerelease) return -1;
    if (!a.prerelease && b.prerelease) return 1;
    if (a.prerelease && b.prerelease) {
      return a.prerelease.localeCompare(b.prerelease);
    }

    return 0;
  }

  private formatVersionRange(range: VersionRange): string {
    if (range.exact) {
      return this.versionToString(range.exact);
    }

    const parts: string[] = [];

    if (range.min) {
      parts.push(`>=${this.versionToString(range.min)}`);
    }

    if (range.max) {
      parts.push(`<=${this.versionToString(range.max)}`);
    }

    return parts.join(' ');
  }

  // ============================================================================
  // Built-in Version Data
  // ============================================================================

  private initializeBuiltInVersions(): void {
    // Register built-in versions for common mocks
    this.registerBuiltInUseToastVersions();
    this.registerBuiltInUseEnhancedFormVersions();
    this.registerBuiltInUtilityVersions();
  }

  private registerBuiltInUseToastVersions(): void {
    this.registerVersion('useToast', {
      version: { major: 1, minor: 0, patch: 0 },
      releaseDate: new Date('2024-01-01'),
      changelog: [
        'Initial release',
        'Basic toast functionality',
        'Contextual toast methods',
      ],
      breakingChanges: [],
      deprecations: [],
      compatibilityMatrix: {
        react: { min: { major: 18, minor: 0, patch: 0 } },
        reactTestingLibrary: { min: { major: 13, minor: 0, patch: 0 } },
        jest: { min: { major: 27, minor: 0, patch: 0 } },
        typescript: { min: { major: 4, minor: 5, patch: 0 } },
        dependencies: {},
      },
    });

    this.registerVersion('useToast', {
      version: { major: 1, minor: 1, patch: 0 },
      releaseDate: new Date('2024-02-01'),
      changelog: [
        'Added progress toast support',
        'Enhanced error handling',
        'Improved accessibility',
      ],
      breakingChanges: [],
      deprecations: [],
      compatibilityMatrix: {
        react: { min: { major: 18, minor: 0, patch: 0 } },
        reactTestingLibrary: { min: { major: 13, minor: 0, patch: 0 } },
        jest: { min: { major: 27, minor: 0, patch: 0 } },
        typescript: { min: { major: 4, minor: 5, patch: 0 } },
        dependencies: {},
      },
    });
  }

  private registerBuiltInUseEnhancedFormVersions(): void {
    this.registerVersion('useEnhancedForm', {
      version: { major: 1, minor: 0, patch: 0 },
      releaseDate: new Date('2024-01-15'),
      changelog: [
        'Initial release',
        'React Hook Form integration',
        'Auto-save functionality',
        'Real-time validation',
      ],
      breakingChanges: [],
      deprecations: [],
      compatibilityMatrix: {
        react: { min: { major: 18, minor: 0, patch: 0 } },
        reactTestingLibrary: { min: { major: 13, minor: 0, patch: 0 } },
        jest: { min: { major: 27, minor: 0, patch: 0 } },
        typescript: { min: { major: 4, minor: 5, patch: 0 } },
        dependencies: {
          'react-hook-form': { min: { major: 7, minor: 0, patch: 0 } },
          zod: { min: { major: 3, minor: 0, patch: 0 } },
        },
      },
    });
  }

  private registerBuiltInUtilityVersions(): void {
    this.registerVersion('localStorage', {
      version: { major: 1, minor: 0, patch: 0 },
      releaseDate: new Date('2024-01-01'),
      changelog: ['localStorage mock implementation'],
      breakingChanges: [],
      deprecations: [],
      compatibilityMatrix: {
        react: { min: { major: 16, minor: 0, patch: 0 } },
        reactTestingLibrary: { min: { major: 12, minor: 0, patch: 0 } },
        jest: { min: { major: 26, minor: 0, patch: 0 } },
        typescript: { min: { major: 4, minor: 0, patch: 0 } },
        dependencies: {},
      },
    });
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  private clearCacheForMock(mockName: string): void {
    const keysToDelete: string[] = [];

    for (const key of this.compatibilityCache.keys()) {
      if (key.startsWith(`${mockName}@`)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.compatibilityCache.delete(key);
    }

    for (const key of this.migrationCache.keys()) {
      if (key.startsWith(`${mockName}:`)) {
        this.migrationCache.delete(key);
      }
    }
  }

  private logDebug(message: string): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[MockVersionManager] ${message}`);
    }
  }

  public clearCache(): void {
    this.compatibilityCache.clear();
    this.migrationCache.clear();
  }

  public getStats(): {
    totalMocks: number;
    totalVersions: number;
    cacheSize: number;
    migrationCacheSize: number;
  } {
    let totalVersions = 0;
    for (const mockVersions of this.versions.values()) {
      totalVersions += mockVersions.size;
    }

    return {
      totalMocks: this.versions.size,
      totalVersions,
      cacheSize: this.compatibilityCache.size,
      migrationCacheSize: this.migrationCache.size,
    };
  }
}

// ============================================================================
// Default Instance and Convenience Functions
// ============================================================================

let defaultVersionManager: MockVersionManager | null = null;

export function getDefaultVersionManager(): MockVersionManager {
  if (!defaultVersionManager) {
    defaultVersionManager = new MockVersionManager();
  }
  return defaultVersionManager;
}

export function checkMockCompatibility(
  mockName: string,
  mockVersion: string,
  targetEnvironment: Parameters<MockVersionManager['checkCompatibility']>[2]
): VersionCompatibilityResult {
  return getDefaultVersionManager().checkCompatibility(
    mockName,
    mockVersion,
    targetEnvironment
  );
}

export function getMockVersion(
  mockName: string,
  versionString: string
): MockVersion | undefined {
  return getDefaultVersionManager().getVersion(mockName, versionString);
}

export function getLatestMockVersion(
  mockName: string,
  includePrerelease = false
): MockVersion | undefined {
  return getDefaultVersionManager().getLatestVersion(
    mockName,
    includePrerelease
  );
}

export function listMockVersions(mockName: string): MockVersion[] {
  return getDefaultVersionManager().listVersions(mockName);
}

export function generateMockMigrationPath(
  mockName: string,
  fromVersion: string,
  targetEnvironment: any
): MigrationPath | undefined {
  return getDefaultVersionManager().generateMigrationPath(
    mockName,
    fromVersion,
    targetEnvironment
  );
}

// Export types
export type {
  SemanticVersion,
  VersionRange,
  MockVersion,
  CompatibilityMatrix,
  VersionCompatibilityResult,
  CompatibilityIssue,
  MigrationPath,
  MigrationStep,
  VersionManagerConfig,
};
