/**
 * Database Test Utilities
 * Provides utilities for database cleanup, reset, and test isolation
 */

import { DatabaseConnection, DatabaseSeeder, SeedingResult } from './seeder';
import { DatabaseMigrationManager, MigrationResult } from './migrations';
import { DatabaseSeed, TestScenario, MockDataGenerator } from '../mock-data/generators';

export interface TestDatabaseConfig {
  path?: string;
  inMemory?: boolean;
  isolationLevel: 'test' | 'suite' | 'file';
  autoCleanup?: boolean;
  seedScenario?: TestScenario;
  customSeed?: DatabaseSeed;
}

export interface TestDatabaseInstance {
  connection: DatabaseConnection;
  seeder: DatabaseSeeder;
  migrationManager: DatabaseMigrationManager;
  cleanup: () => Promise<void>;
  reset: () => Promise<void>;
  seed: (scenario?: TestScenario) => Promise<SeedingResult>;
  validate: () => Promise<{ valid: boolean; issues: string[] }>;
}

export interface DatabaseSnapshot {
  id: string;
  timestamp: string;
  data: DatabaseSeed;
  schema: SchemaSnapshot;
  metadata: SnapshotMetadata;
}

export interface SchemaSnapshot {
  tables: TableSchema[];
  indexes: IndexSchema[];
  triggers: TriggerSchema[];
  views: ViewSchema[];
}

export interface TableSchema {
  name: string;
  columns: ColumnSchema[];
  constraints: ConstraintSchema[];
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  primaryKey: boolean;
}

export interface ConstraintSchema {
  name: string;
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK';
  definition: string;
}

export interface IndexSchema {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
}

export interface TriggerSchema {
  name: string;
  table: string;
  event: string;
  definition: string;
}

export interface ViewSchema {
  name: string;
  definition: string;
}

export interface SnapshotMetadata {
  testSuite?: string;
  testCase?: string;
  description?: string;
  tags: string[];
}

export interface TestIsolationManager {
  beforeEach: () => Promise<void>;
  afterEach: () => Promise<void>;
  beforeAll: () => Promise<void>;
  afterAll: () => Promise<void>;
}

/**
 * Database Test Manager
 * Manages database instances for testing with isolation and cleanup
 */
export class DatabaseTestManager {
  private instances: Map<string, TestDatabaseInstance> = new Map();
  private snapshots: Map<string, DatabaseSnapshot> = new Map();
  private config: TestDatabaseConfig;

  constructor(config: TestDatabaseConfig = { isolationLevel: 'test' }) {
    this.config = config;
  }

  /**
   * Create a new test database instance
   */
  async createTestDatabase(instanceId: string = 'default'): Promise<TestDatabaseInstance> {
    const dbPath = this.config.inMemory !== false ? ':memory:' : 
                   this.config.path || `./test_${instanceId}_${Date.now()}.db`;

    // Create connection (mock implementation)
    const connection = new MockDatabaseConnection(dbPath);
    
    // Initialize components
    const seeder = new DatabaseSeeder(connection);
    const migrationManager = new DatabaseMigrationManager(connection);

    // Run initial migrations
    await migrationManager.migrate();

    // Seed with initial data if specified
    if (this.config.seedScenario || this.config.customSeed) {
      const seedOptions = {
        environment: 'testing' as const,
        clearExisting: false,
        scenario: this.config.seedScenario,
        customSeed: this.config.customSeed
      };
      await seeder.seedDatabase(seedOptions);
    }

    const instance: TestDatabaseInstance = {
      connection,
      seeder,
      migrationManager,
      cleanup: () => this.cleanupInstance(instanceId),
      reset: () => this.resetInstance(instanceId),
      seed: (scenario) => this.seedInstance(instanceId, scenario),
      validate: () => this.validateInstance(instanceId)
    };

    this.instances.set(instanceId, instance);
    return instance;
  }

  /**
   * Get existing test database instance
   */
  getTestDatabase(instanceId: string = 'default'): TestDatabaseInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * Cleanup specific database instance
   */
  async cleanupInstance(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) return;

    try {
      // Clear all data
      await instance.seeder.clearDatabase();
      
      // Close connection
      await instance.connection.close();
      
      // Remove from instances
      this.instances.delete(instanceId);
      
      console.log(`Database instance ${instanceId} cleaned up`);
    } catch (error) {
      console.error(`Failed to cleanup database instance ${instanceId}:`, error);
    }
  }

  /**
   * Reset database instance to clean state
   */
  async resetInstance(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) throw new Error(`Database instance ${instanceId} not found`);

    // Reset to clean state
    await instance.migrationManager.resetDatabase();
    
    // Re-run migrations
    await instance.migrationManager.migrate();
    
    // Re-seed if configured
    if (this.config.seedScenario || this.config.customSeed) {
      const seedOptions = {
        environment: 'testing' as const,
        clearExisting: false,
        scenario: this.config.seedScenario,
        customSeed: this.config.customSeed
      };
      await instance.seeder.seedDatabase(seedOptions);
    }
  }

  /**
   * Seed database instance with scenario
   */
  async seedInstance(instanceId: string, scenario?: TestScenario): Promise<SeedingResult> {
    const instance = this.instances.get(instanceId);
    if (!instance) throw new Error(`Database instance ${instanceId} not found`);

    const seedOptions = {
      environment: 'testing' as const,
      clearExisting: true,
      scenario: scenario || this.config.seedScenario
    };

    return await instance.seeder.seedDatabase(seedOptions);
  }

  /**
   * Validate database instance
   */
  async validateInstance(instanceId: string): Promise<{ valid: boolean; issues: string[] }> {
    const instance = this.instances.get(instanceId);
    if (!instance) throw new Error(`Database instance ${instanceId} not found`);

    return await instance.migrationManager.validateDatabase();
  }

  /**
   * Create database snapshot
   */
  async createSnapshot(
    instanceId: string, 
    snapshotId: string,
    metadata?: Partial<SnapshotMetadata>
  ): Promise<DatabaseSnapshot> {
    const instance = this.instances.get(instanceId);
    if (!instance) throw new Error(`Database instance ${instanceId} not found`);

    // Export current data
    const data = await instance.seeder.exportSeedData();
    
    // Capture schema
    const schema = await this.captureSchema(instance.connection);

    const snapshot: DatabaseSnapshot = {
      id: snapshotId,
      timestamp: new Date().toISOString(),
      data,
      schema,
      metadata: {
        testSuite: metadata?.testSuite,
        testCase: metadata?.testCase,
        description: metadata?.description,
        tags: metadata?.tags || []
      }
    };

    this.snapshots.set(snapshotId, snapshot);
    return snapshot;
  }

  /**
   * Restore database from snapshot
   */
  async restoreSnapshot(instanceId: string, snapshotId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    const snapshot = this.snapshots.get(snapshotId);
    
    if (!instance) throw new Error(`Database instance ${instanceId} not found`);
    if (!snapshot) throw new Error(`Snapshot ${snapshotId} not found`);

    // Clear current data
    await instance.seeder.clearDatabase();

    // Restore schema (migrations should handle this)
    await instance.migrationManager.resetDatabase();
    await instance.migrationManager.migrate();

    // Restore data
    const seedOptions = {
      environment: 'testing' as const,
      clearExisting: false,
      customSeed: snapshot.data
    };
    await instance.seeder.seedDatabase(seedOptions);
  }

  /**
   * Capture database schema
   */
  private async captureSchema(connection: DatabaseConnection): Promise<SchemaSnapshot> {
    // Get tables
    const tablesResult = await connection.execute(`
      SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'
    `);
    
    const tables: TableSchema[] = [];
    for (const table of tablesResult || []) {
      const tableInfo = await connection.execute(`PRAGMA table_info(${table.name})`);
      const foreignKeys = await connection.execute(`PRAGMA foreign_key_list(${table.name})`);
      
      const columns: ColumnSchema[] = (tableInfo || []).map((col: any) => ({
        name: col.name,
        type: col.type,
        nullable: !col.notnull,
        defaultValue: col.dflt_value,
        primaryKey: Boolean(col.pk)
      }));

      const constraints: ConstraintSchema[] = (foreignKeys || []).map((fk: any) => ({
        name: `fk_${table.name}_${fk.from}`,
        type: 'FOREIGN KEY' as const,
        definition: `FOREIGN KEY (${fk.from}) REFERENCES ${fk.table}(${fk.to})`
      }));

      tables.push({
        name: table.name,
        columns,
        constraints
      });
    }

    // Get indexes
    const indexesResult = await connection.execute(`
      SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'
    `);
    
    const indexes: IndexSchema[] = (indexesResult || []).map((idx: any) => ({
      name: idx.name,
      table: idx.tbl_name,
      columns: [], // Would parse from SQL in real implementation
      unique: idx.sql?.includes('UNIQUE') || false
    }));

    // Get triggers
    const triggersResult = await connection.execute(`
      SELECT name, tbl_name, sql FROM sqlite_master WHERE type='trigger'
    `);
    
    const triggers: TriggerSchema[] = (triggersResult || []).map((trigger: any) => ({
      name: trigger.name,
      table: trigger.tbl_name,
      event: 'UNKNOWN', // Would parse from SQL in real implementation
      definition: trigger.sql
    }));

    // Get views
    const viewsResult = await connection.execute(`
      SELECT name, sql FROM sqlite_master WHERE type='view'
    `);
    
    const views: ViewSchema[] = (viewsResult || []).map((view: any) => ({
      name: view.name,
      definition: view.sql
    }));

    return {
      tables,
      indexes,
      triggers,
      views
    };
  }

  /**
   * Cleanup all instances
   */
  async cleanupAll(): Promise<void> {
    const instanceIds = Array.from(this.instances.keys());
    
    for (const instanceId of instanceIds) {
      await this.cleanupInstance(instanceId);
    }
    
    // Clear snapshots
    this.snapshots.clear();
  }

  /**
   * Get test isolation manager for specific test framework
   */
  getIsolationManager(instanceId: string = 'default'): TestIsolationManager {
    return {
      beforeEach: async () => {
        if (this.config.isolationLevel === 'test') {
          await this.resetInstance(instanceId);
        }
      },
      
      afterEach: async () => {
        if (this.config.autoCleanup && this.config.isolationLevel === 'test') {
          // Optionally cleanup after each test
        }
      },
      
      beforeAll: async () => {
        if (!this.instances.has(instanceId)) {
          await this.createTestDatabase(instanceId);
        }
        
        if (this.config.isolationLevel === 'suite') {
          await this.resetInstance(instanceId);
        }
      },
      
      afterAll: async () => {
        if (this.config.autoCleanup) {
          await this.cleanupInstance(instanceId);
        }
      }
    };
  }
}

/**
 * Mock Database Connection for Testing
 */
class MockDatabaseConnection implements DatabaseConnection {
  private path: string;
  private closed: boolean = false;

  constructor(path: string) {
    this.path = path;
    console.log(`Mock database connection created: ${path}`);
  }

  async execute(sql: string, params?: any[]): Promise<any> {
    if (this.closed) {
      throw new Error('Database connection is closed');
    }

    console.log(`Executing SQL: ${sql}`, params ? `with params: ${JSON.stringify(params)}` : '');
    
    // Mock different query types
    if (sql.includes('SELECT COUNT(*)')) {
      return [{ count: Math.floor(Math.random() * 100) }];
    }
    
    if (sql.includes('SELECT') && sql.includes('sqlite_master')) {
      // Mock schema queries
      if (sql.includes('type="table"')) {
        return [
          { name: 'users' },
          { name: 'projects' },
          { name: 'device_classifications' }
        ];
      }
      if (sql.includes('type="index"')) {
        return [
          { name: 'idx_projects_user_id', tbl_name: 'projects', sql: 'CREATE INDEX idx_projects_user_id ON projects(user_id)' }
        ];
      }
    }
    
    if (sql.includes('PRAGMA table_info')) {
      return [
        { name: 'id', type: 'INTEGER', notnull: 1, dflt_value: null, pk: 1 },
        { name: 'name', type: 'TEXT', notnull: 1, dflt_value: null, pk: 0 }
      ];
    }
    
    if (sql.includes('SELECT') && !sql.includes('COUNT')) {
      return []; // Return empty array for SELECT queries
    }
    
    return { changes: 1, lastInsertRowid: Math.floor(Math.random() * 1000) };
  }

  async transaction<T>(callback: (tx: any) => Promise<T>): Promise<T> {
    if (this.closed) {
      throw new Error('Database connection is closed');
    }

    const tx = {
      execute: this.execute.bind(this)
    };
    
    try {
      const result = await callback(tx);
      console.log('Transaction committed');
      return result;
    } catch (error) {
      console.log('Transaction rolled back');
      throw error;
    }
  }

  async close(): Promise<void> {
    this.closed = true;
    console.log(`Database connection closed: ${this.path}`);
  }
}

/**
 * Test Database Factory
 * Provides convenient methods for creating test databases
 */
export class TestDatabaseFactory {
  private static managers: Map<string, DatabaseTestManager> = new Map();

  /**
   * Create test database for Jest tests
   */
  static async createForJest(config?: Partial<TestDatabaseConfig>): Promise<TestDatabaseInstance> {
    const manager = new DatabaseTestManager({
      isolationLevel: 'test',
      inMemory: true,
      autoCleanup: true,
      ...config
    });

    return await manager.createTestDatabase('jest');
  }

  /**
   * Create test database for Playwright tests
   */
  static async createForPlaywright(config?: Partial<TestDatabaseConfig>): Promise<TestDatabaseInstance> {
    const manager = new DatabaseTestManager({
      isolationLevel: 'suite',
      inMemory: false,
      autoCleanup: true,
      ...config
    });

    return await manager.createTestDatabase('playwright');
  }

  /**
   * Create test database for integration tests
   */
  static async createForIntegration(config?: Partial<TestDatabaseConfig>): Promise<TestDatabaseInstance> {
    const manager = new DatabaseTestManager({
      isolationLevel: 'file',
      inMemory: false,
      autoCleanup: false,
      ...config
    });

    return await manager.createTestDatabase('integration');
  }

  /**
   * Get or create manager for test suite
   */
  static getManager(suiteId: string, config?: TestDatabaseConfig): DatabaseTestManager {
    if (!this.managers.has(suiteId)) {
      this.managers.set(suiteId, new DatabaseTestManager(config));
    }
    return this.managers.get(suiteId)!;
  }

  /**
   * Cleanup all managers
   */
  static async cleanupAll(): Promise<void> {
    for (const manager of this.managers.values()) {
      await manager.cleanupAll();
    }
    this.managers.clear();
  }
}

/**
 * Export utility functions for common test scenarios
 */
export async function setupTestDatabase(scenario: TestScenario = TestScenario.EXISTING_PROJECT_WORKFLOW): Promise<TestDatabaseInstance> {
  return await TestDatabaseFactory.createForJest({
    seedScenario: scenario
  });
}

export async function createCleanTestDatabase(): Promise<TestDatabaseInstance> {
  return await TestDatabaseFactory.createForJest({
    seedScenario: undefined
  });
}

export async function createTestDatabaseWithCustomSeed(seed: DatabaseSeed): Promise<TestDatabaseInstance> {
  return await TestDatabaseFactory.createForJest({
    customSeed: seed
  });
}

export function createTestIsolationHooks(instanceId?: string): TestIsolationManager {
  const manager = TestDatabaseFactory.getManager('default');
  return manager.getIsolationManager(instanceId);
}