/**
 * Database Integration and Seeding Infrastructure - Main Export
 * Comprehensive database utilities for test data management and migration
 */

// Seed generator exports
export {
  DatabaseSeedGenerator,
  DatabaseSeedExecutor,
  type DatabaseSeedScript,
  type SeedExecutionResult,
} from './seed-generator';

// Migration scripts exports
export {
  DatabaseMigrationManager,
  type DatabaseMigration,
  type MigrationExecutionResult,
  type DatabaseSchema,
  type TableDefinition,
  type ColumnDefinition,
  type IndexDefinition,
  type ConstraintDefinition,
  type ForeignKeyDefinition,
  type TriggerDefinition,
} from './migration-scripts';

// Test utilities exports
export {
  DatabaseTestManager,
  type DatabaseTestConfig,
  type TestDatabaseInstance,
  type CleanupResult,
  type DatabaseSnapshot,
  type TableSnapshot,
  type DatabaseStatistics,
  type TableStatistics,
  type IntegrityCheckResult,
  type IntegrityCheck,
} from './test-utilities';

// Data integrity exports
export {
  DataIntegrityValidator,
  type DataIntegrityRule,
  type DataIntegrityResult,
  type ValidationDetail,
  type IntegrityReport,
  type IntegritySummary,
} from './data-integrity';

/**
 * Database Integration Manager
 * Main orchestrator for database operations during migration
 */
export class DatabaseIntegrationManager {
  private seedGenerator: DatabaseSeedGenerator;
  private seedExecutor: DatabaseSeedExecutor;
  private migrationManager: DatabaseMigrationManager;
  private testManager: DatabaseTestManager;
  private integrityValidator: DataIntegrityValidator;

  constructor(databaseUrl: string, config?: Partial<DatabaseTestConfig>) {
    const testConfig = { ...DatabaseTestManager.getDefaultConfig(), ...config };

    this.seedGenerator = new DatabaseSeedGenerator();
    this.seedExecutor = new DatabaseSeedExecutor(databaseUrl);
    this.migrationManager = new DatabaseMigrationManager();
    this.testManager = new DatabaseTestManager(testConfig);
    this.integrityValidator = new DataIntegrityValidator();
  }

  /**
   * Initialize complete database infrastructure
   */
  async initializeDatabaseInfrastructure(): Promise<DatabaseInitializationResult> {
    const result: DatabaseInitializationResult = {
      success: false,
      steps: [],
      errors: [],
      executionTime: 0,
    };

    const startTime = Date.now();

    try {
      // Step 1: Run database migrations
      console.log('Running database migrations...');
      const migrationResults =
        await this.migrationManager.executeAllMigrations();
      result.steps.push({
        name: 'Database Migrations',
        success: migrationResults.every((r) => r.success),
        details: `${migrationResults.filter((r) => r.success).length}/${migrationResults.length} migrations successful`,
      });

      if (!migrationResults.every((r) => r.success)) {
        result.errors.push('Some database migrations failed');
      }

      // Step 2: Generate and execute seed scripts
      console.log('Generating seed scripts...');
      const seedScripts = DatabaseSeedGenerator.generateAllSeedScripts();
      result.steps.push({
        name: 'Seed Script Generation',
        success: true,
        details: `Generated ${seedScripts.length} seed scripts`,
      });

      console.log('Executing seed scripts...');
      const seedResults = await this.seedExecutor.executeAllSeedScripts();
      result.steps.push({
        name: 'Seed Script Execution',
        success: seedResults.every((r) => r.success),
        details: `${seedResults.filter((r) => r.success).length}/${seedResults.length} seed scripts successful`,
      });

      if (!seedResults.every((r) => r.success)) {
        result.errors.push('Some seed scripts failed');
      }

      // Step 3: Validate data integrity
      console.log('Validating data integrity...');
      const integrityReport =
        await this.integrityValidator.validateDataIntegrity('main');
      result.steps.push({
        name: 'Data Integrity Validation',
        success: integrityReport.overallScore >= 90,
        details: `Integrity score: ${integrityReport.overallScore}% (${integrityReport.passedRules}/${integrityReport.totalRules} rules passed)`,
      });

      if (integrityReport.overallScore < 90) {
        result.errors.push(
          `Data integrity score below threshold: ${integrityReport.overallScore}%`
        );
      }

      // Step 4: Create initial database snapshot
      console.log('Creating initial database snapshot...');
      const testInstance =
        await this.testManager.setupTestDatabase('initialization');
      const snapshot = await this.testManager.createSnapshot(
        testInstance.id,
        'initial_state'
      );
      result.steps.push({
        name: 'Initial Snapshot Creation',
        success: true,
        details: `Created snapshot: ${snapshot.id} (${snapshot.tables.length} tables)`,
      });

      result.success = result.errors.length === 0;
      result.executionTime = Date.now() - startTime;

      console.log(
        `Database infrastructure initialization ${result.success ? 'completed' : 'failed'} in ${result.executionTime}ms`
      );
    } catch (error) {
      result.success = false;
      result.errors.push(`Infrastructure initialization failed: ${error}`);
      result.executionTime = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Setup test environment for specific test suite
   */
  async setupTestEnvironment(
    testSuite: string,
    testFile?: string
  ): Promise<TestEnvironmentSetup> {
    const setup: TestEnvironmentSetup = {
      testInstance: null,
      seedResults: [],
      integrityReport: null,
      snapshot: null,
      success: false,
      errors: [],
    };

    try {
      // Create test database instance
      setup.testInstance = await this.testManager.setupTestDatabase(
        testSuite,
        testFile
      );

      // Execute relevant seed scripts
      const seedScripts = DatabaseSeedGenerator.generateAllSeedScripts().filter(
        (script) =>
          script.scenario === 'default' ||
          script.scenario.toString().includes(testSuite.toLowerCase())
      );

      for (const script of seedScripts) {
        const result = await this.seedExecutor.executeSeedScript(script);
        setup.seedResults.push(result);
      }

      // Validate test data integrity
      setup.integrityReport =
        await this.integrityValidator.validateDataIntegrity(
          setup.testInstance.id
        );

      // Create test snapshot
      setup.snapshot = await this.testManager.createSnapshot(
        setup.testInstance.id,
        `${testSuite}_baseline`
      );

      setup.success =
        setup.seedResults.every((r) => r.success) &&
        setup.integrityReport.overallScore >= 85;

      if (!setup.success) {
        setup.errors.push('Test environment setup validation failed');
      }
    } catch (error) {
      setup.success = false;
      setup.errors.push(`Test environment setup failed: ${error}`);
    }

    return setup;
  }

  /**
   * Cleanup test environment
   */
  async cleanupTestEnvironment(testInstanceId: string): Promise<CleanupResult> {
    try {
      return await this.testManager.cleanupTestDatabase(testInstanceId);
    } catch (error) {
      return {
        success: false,
        tablesCleared: [],
        recordsDeleted: 0,
        executionTime: 0,
        errors: [error instanceof Error ? error.message : String(error)],
      };
    }
  }

  /**
   * Validate mock data compatibility with database schema
   */
  async validateMockDataCompatibility(): Promise<CompatibilityReport> {
    const report: CompatibilityReport = {
      compatible: true,
      issues: [],
      recommendations: [],
      schemaValidation: null,
      dataValidation: null,
    };

    try {
      // Get database schema
      const schema = this.migrationManager.getDatabaseSchema();

      // Validate schema compatibility
      report.schemaValidation = await this.validateSchemaCompatibility(schema);

      // Validate data compatibility
      report.dataValidation =
        await this.integrityValidator.validateDataIntegrity(
          'compatibility_check'
        );

      // Check for compatibility issues
      if (report.schemaValidation.issues.length > 0) {
        report.compatible = false;
        report.issues.push(...report.schemaValidation.issues);
      }

      if (report.dataValidation.overallScore < 95) {
        report.compatible = false;
        report.issues.push(
          `Data validation score below threshold: ${report.dataValidation.overallScore}%`
        );
      }

      // Generate recommendations
      report.recommendations =
        this.generateCompatibilityRecommendations(report);
    } catch (error) {
      report.compatible = false;
      report.issues.push(`Compatibility validation failed: ${error}`);
    }

    return report;
  }

  /**
   * Generate comprehensive database report
   */
  async generateDatabaseReport(): Promise<DatabaseReport> {
    const report: DatabaseReport = {
      timestamp: new Date().toISOString(),
      schema: this.migrationManager.getDatabaseSchema(),
      migrations: this.migrationManager.getAllMigrations(),
      seedScripts: DatabaseSeedGenerator.generateAllSeedScripts(),
      testInstances: this.testManager.getActiveInstances(),
      snapshots: this.testManager.getSnapshots(),
      integrityReport: null,
      statistics: null,
      recommendations: [],
    };

    try {
      // Get integrity report
      report.integrityReport =
        await this.integrityValidator.validateDataIntegrity('main');

      // Get database statistics (if test instance exists)
      const activeInstances = this.testManager.getActiveInstances();
      if (activeInstances.length > 0) {
        report.statistics = await this.testManager.getDatabaseStatistics(
          activeInstances[0].id
        );
      }

      // Generate recommendations
      report.recommendations = this.generateDatabaseRecommendations(report);
    } catch (error) {
      report.recommendations.push(`Report generation error: ${error}`);
    }

    return report;
  }

  /**
   * Validate schema compatibility (simulated)
   */
  private async validateSchemaCompatibility(
    schema: DatabaseSchema
  ): Promise<SchemaValidationResult> {
    const result: SchemaValidationResult = {
      valid: true,
      issues: [],
      warnings: [],
    };

    // Simulate schema validation
    for (const table of schema.tables) {
      // Check for required columns
      const requiredColumns = ['id', 'created_at', 'updated_at'];
      for (const requiredCol of requiredColumns) {
        if (!table.columns.some((col) => col.name === requiredCol)) {
          result.issues.push(
            `Table ${table.name} missing required column: ${requiredCol}`
          );
          result.valid = false;
        }
      }

      // Check foreign key constraints
      for (const fk of table.foreignKeys) {
        const referencedTable = schema.tables.find(
          (t) => t.name === fk.referencedTable
        );
        if (!referencedTable) {
          result.issues.push(
            `Table ${table.name} references non-existent table: ${fk.referencedTable}`
          );
          result.valid = false;
        }
      }
    }

    return result;
  }

  /**
   * Generate compatibility recommendations
   */
  private generateCompatibilityRecommendations(
    report: CompatibilityReport
  ): string[] {
    const recommendations: string[] = [];

    if (!report.compatible) {
      recommendations.push(
        'Address compatibility issues before proceeding with migration'
      );
    }

    if (report.schemaValidation?.issues.length) {
      recommendations.push(
        'Update database schema to resolve structural issues'
      );
    }

    if (report.dataValidation && report.dataValidation.overallScore < 95) {
      recommendations.push(
        'Improve mock data quality to match database constraints'
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        'Mock data is fully compatible with database schema'
      );
    }

    return recommendations;
  }

  /**
   * Generate database recommendations
   */
  private generateDatabaseRecommendations(report: DatabaseReport): string[] {
    const recommendations: string[] = [];

    if (report.integrityReport && report.integrityReport.overallScore < 90) {
      recommendations.push(
        'Address data integrity issues to improve database quality'
      );
    }

    if (report.testInstances.length > 5) {
      recommendations.push(
        'Consider cleaning up unused test database instances'
      );
    }

    if (report.snapshots.length > 10) {
      recommendations.push(
        'Archive old database snapshots to save storage space'
      );
    }

    const failedMigrations = report.migrations.filter((m) => !m.executedAt);
    if (failedMigrations.length > 0) {
      recommendations.push(
        `Execute ${failedMigrations.length} pending database migrations`
      );
    }

    return recommendations;
  }

  /**
   * Get seed generator
   */
  getSeedGenerator(): DatabaseSeedGenerator {
    return this.seedGenerator;
  }

  /**
   * Get seed executor
   */
  getSeedExecutor(): DatabaseSeedExecutor {
    return this.seedExecutor;
  }

  /**
   * Get migration manager
   */
  getMigrationManager(): DatabaseMigrationManager {
    return this.migrationManager;
  }

  /**
   * Get test manager
   */
  getTestManager(): DatabaseTestManager {
    return this.testManager;
  }

  /**
   * Get integrity validator
   */
  getIntegrityValidator(): DataIntegrityValidator {
    return this.integrityValidator;
  }
}

// Type definitions for the integration manager
export interface DatabaseInitializationResult {
  success: boolean;
  steps: InitializationStep[];
  errors: string[];
  executionTime: number;
}

export interface InitializationStep {
  name: string;
  success: boolean;
  details: string;
}

export interface TestEnvironmentSetup {
  testInstance: TestDatabaseInstance | null;
  seedResults: SeedExecutionResult[];
  integrityReport: IntegrityReport | null;
  snapshot: DatabaseSnapshot | null;
  success: boolean;
  errors: string[];
}

export interface CompatibilityReport {
  compatible: boolean;
  issues: string[];
  recommendations: string[];
  schemaValidation: SchemaValidationResult | null;
  dataValidation: IntegrityReport | null;
}

export interface SchemaValidationResult {
  valid: boolean;
  issues: string[];
  warnings: string[];
}

export interface DatabaseReport {
  timestamp: string;
  schema: DatabaseSchema;
  migrations: DatabaseMigration[];
  seedScripts: DatabaseSeedScript[];
  testInstances: TestDatabaseInstance[];
  snapshots: DatabaseSnapshot[];
  integrityReport: IntegrityReport | null;
  statistics: DatabaseStatistics | null;
  recommendations: string[];
}

/**
 * Database Integration Factory
 * Factory for creating database integration managers
 */
export class DatabaseIntegrationFactory {
  /**
   * Create database integration manager for testing
   */
  static createForTesting(databaseUrl?: string): DatabaseIntegrationManager {
    const testDatabaseUrl = databaseUrl || 'sqlite+aiosqlite:///./test.db';
    const config: Partial<DatabaseTestConfig> = {
      isolationLevel: 'test',
      cleanupStrategy: 'truncate',
      seedData: true,
      enableForeignKeys: true,
      enableTriggers: false,
    };

    return new DatabaseIntegrationManager(testDatabaseUrl, config);
  }

  /**
   * Create database integration manager for development
   */
  static createForDevelopment(
    databaseUrl?: string
  ): DatabaseIntegrationManager {
    const devDatabaseUrl = databaseUrl || 'sqlite+aiosqlite:///./dev.db';
    const config: Partial<DatabaseTestConfig> = {
      isolationLevel: 'suite',
      cleanupStrategy: 'delete',
      seedData: true,
      enableForeignKeys: true,
      enableTriggers: true,
    };

    return new DatabaseIntegrationManager(devDatabaseUrl, config);
  }

  /**
   * Create database integration manager for production
   */
  static createForProduction(databaseUrl: string): DatabaseIntegrationManager {
    const config: Partial<DatabaseTestConfig> = {
      isolationLevel: 'none',
      cleanupStrategy: 'recreate',
      seedData: false,
      enableForeignKeys: true,
      enableTriggers: true,
    };

    return new DatabaseIntegrationManager(databaseUrl, config);
  }
}

export default DatabaseIntegrationManager;
