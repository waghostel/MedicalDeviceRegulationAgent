/**
 * Database Test Utilities
 * Utilities for database cleanup, reset, and test isolation
 */

export interface DatabaseTestConfig {
  databaseUrl: string;
  testDatabasePrefix: string;
  isolationLevel: 'none' | 'test' | 'suite' | 'file';
  cleanupStrategy: 'truncate' | 'delete' | 'recreate';
  seedData: boolean;
  enableForeignKeys: boolean;
  enableTriggers: boolean;
}

export interface TestDatabaseInstance {
  id: string;
  name: string;
  url: string;
  createdAt: string;
  lastUsed: string;
  status: 'active' | 'idle' | 'cleanup' | 'error';
  testSuite?: string;
  testFile?: string;
}

export interface CleanupResult {
  success: boolean;
  tablesCleared: string[];
  recordsDeleted: number;
  executionTime: number;
  errors: string[];
}

export interface DatabaseSnapshot {
  id: string;
  name: string;
  createdAt: string;
  tables: TableSnapshot[];
  size: number;
  checksum: string;
}

export interface TableSnapshot {
  name: string;
  recordCount: number;
  schema: string;
  data?: any[];
}

/**
 * Database Test Manager
 * Manages test database lifecycle and isolation
 */
export class DatabaseTestManager {
  private config: DatabaseTestConfig;
  private activeInstances: Map<string, TestDatabaseInstance> = new Map();
  private snapshots: Map<string, DatabaseSnapshot> = new Map();

  constructor(config: DatabaseTestConfig) {
    this.config = config;
  }

  /**
   * Get default test configuration
   */
  static getDefaultConfig(): DatabaseTestConfig {
    return {
      databaseUrl: 'sqlite+aiosqlite:///./test.db',
      testDatabasePrefix: 'test_',
      isolationLevel: 'test',
      cleanupStrategy: 'truncate',
      seedData: true,
      enableForeignKeys: true,
      enableTriggers: false // Disable triggers for faster test execution
    };
  }

  /**
   * Setup test database for a test suite
   */
  async setupTestDatabase(testSuite: string, testFile?: string): Promise<TestDatabaseInstance> {
    const instanceId = this.generateInstanceId(testSuite, testFile);
    
    let instance = this.activeInstances.get(instanceId);
    if (instance && instance.status === 'active') {
      instance.lastUsed = new Date().toISOString();
      return instance;
    }

    instance = {
      id: instanceId,
      name: `${this.config.testDatabasePrefix}${instanceId}`,
      url: this.generateDatabaseUrl(instanceId),
      createdAt: new Date().toISOString(),
      lastUsed: new Date().toISOString(),
      status: 'active',
      testSuite,
      testFile
    };

    try {
      await this.createTestDatabase(instance);
      await this.configureTestDatabase(instance);
      
      if (this.config.seedData) {
        await this.seedTestDatabase(instance);
      }

      this.activeInstances.set(instanceId, instance);
      return instance;

    } catch (error) {
      instance.status = 'error';
      throw new Error(`Failed to setup test database: ${error}`);
    }
  }

  /**
   * Cleanup test database
   */
  async cleanupTestDatabase(instanceId: string): Promise<CleanupResult> {
    const instance = this.activeInstances.get(instanceId);
    if (!instance) {
      throw new Error(`Test database instance ${instanceId} not found`);
    }

    const startTime = Date.now();
    const result: CleanupResult = {
      success: false,
      tablesCleared: [],
      recordsDeleted: 0,
      executionTime: 0,
      errors: []
    };

    try {
      instance.status = 'cleanup';

      switch (this.config.cleanupStrategy) {
        case 'truncate':
          await this.truncateAllTables(instance, result);
          break;
        case 'delete':
          await this.deleteAllRecords(instance, result);
          break;
        case 'recreate':
          await this.recreateDatabase(instance, result);
          break;
      }

      result.success = true;
      result.executionTime = Date.now() - startTime;
      
      // Remove instance if successful
      this.activeInstances.delete(instanceId);

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : String(error));
      result.executionTime = Date.now() - startTime;
      instance.status = 'error';
    }

    return result;
  }

  /**
   * Reset test database to initial state
   */
  async resetTestDatabase(instanceId: string): Promise<void> {
    const instance = this.activeInstances.get(instanceId);
    if (!instance) {
      throw new Error(`Test database instance ${instanceId} not found`);
    }

    try {
      // Clear all data
      await this.cleanupTestDatabase(instanceId);
      
      // Recreate instance
      const newInstance = await this.setupTestDatabase(instance.testSuite!, instance.testFile);
      
      console.log(`Test database ${instanceId} reset successfully`);
    } catch (error) {
      throw new Error(`Failed to reset test database: ${error}`);
    }
  }

  /**
   * Create database snapshot
   */
  async createSnapshot(instanceId: string, snapshotName: string): Promise<DatabaseSnapshot> {
    const instance = this.activeInstances.get(instanceId);
    if (!instance) {
      throw new Error(`Test database instance ${instanceId} not found`);
    }

    const snapshot: DatabaseSnapshot = {
      id: `${instanceId}_${snapshotName}_${Date.now()}`,
      name: snapshotName,
      createdAt: new Date().toISOString(),
      tables: [],
      size: 0,
      checksum: ''
    };

    try {
      // Get table schemas and data
      const tables = await this.getTableList(instance);
      
      for (const tableName of tables) {
        const tableSnapshot: TableSnapshot = {
          name: tableName,
          recordCount: await this.getTableRecordCount(instance, tableName),
          schema: await this.getTableSchema(instance, tableName),
          data: await this.getTableData(instance, tableName)
        };
        
        snapshot.tables.push(tableSnapshot);
        snapshot.size += JSON.stringify(tableSnapshot.data).length;
      }

      snapshot.checksum = this.calculateSnapshotChecksum(snapshot);
      this.snapshots.set(snapshot.id, snapshot);

      return snapshot;

    } catch (error) {
      throw new Error(`Failed to create snapshot: ${error}`);
    }
  }

  /**
   * Restore from database snapshot
   */
  async restoreSnapshot(instanceId: string, snapshotId: string): Promise<void> {
    const instance = this.activeInstances.get(instanceId);
    const snapshot = this.snapshots.get(snapshotId);
    
    if (!instance) {
      throw new Error(`Test database instance ${instanceId} not found`);
    }
    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} not found`);
    }

    try {
      // Clear current data
      await this.truncateAllTables(instance, { 
        success: false, 
        tablesCleared: [], 
        recordsDeleted: 0, 
        executionTime: 0, 
        errors: [] 
      });

      // Restore data from snapshot
      for (const tableSnapshot of snapshot.tables) {
        if (tableSnapshot.data && tableSnapshot.data.length > 0) {
          await this.insertTableData(instance, tableSnapshot.name, tableSnapshot.data);
        }
      }

      console.log(`Database restored from snapshot ${snapshotId}`);

    } catch (error) {
      throw new Error(`Failed to restore snapshot: ${error}`);
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStatistics(instanceId: string): Promise<DatabaseStatistics> {
    const instance = this.activeInstances.get(instanceId);
    if (!instance) {
      throw new Error(`Test database instance ${instanceId} not found`);
    }

    const stats: DatabaseStatistics = {
      instanceId,
      tables: [],
      totalRecords: 0,
      totalSize: 0,
      lastUpdated: new Date().toISOString()
    };

    try {
      const tables = await this.getTableList(instance);
      
      for (const tableName of tables) {
        const recordCount = await this.getTableRecordCount(instance, tableName);
        const tableSize = await this.getTableSize(instance, tableName);
        
        stats.tables.push({
          name: tableName,
          recordCount,
          size: tableSize,
          indexes: await this.getTableIndexes(instance, tableName)
        });
        
        stats.totalRecords += recordCount;
        stats.totalSize += tableSize;
      }

      return stats;

    } catch (error) {
      throw new Error(`Failed to get database statistics: ${error}`);
    }
  }

  /**
   * Validate database integrity
   */
  async validateDatabaseIntegrity(instanceId: string): Promise<IntegrityCheckResult> {
    const instance = this.activeInstances.get(instanceId);
    if (!instance) {
      throw new Error(`Test database instance ${instanceId} not found`);
    }

    const result: IntegrityCheckResult = {
      valid: true,
      checks: [],
      errors: [],
      warnings: []
    };

    try {
      // Check foreign key constraints
      const foreignKeyCheck = await this.checkForeignKeyConstraints(instance);
      result.checks.push(foreignKeyCheck);
      
      if (!foreignKeyCheck.passed) {
        result.valid = false;
        result.errors.push(...foreignKeyCheck.errors);
      }

      // Check data consistency
      const consistencyCheck = await this.checkDataConsistency(instance);
      result.checks.push(consistencyCheck);
      
      if (!consistencyCheck.passed) {
        result.warnings.push(...consistencyCheck.errors);
      }

      // Check table schemas
      const schemaCheck = await this.checkTableSchemas(instance);
      result.checks.push(schemaCheck);
      
      if (!schemaCheck.passed) {
        result.valid = false;
        result.errors.push(...schemaCheck.errors);
      }

      return result;

    } catch (error) {
      result.valid = false;
      result.errors.push(`Integrity check failed: ${error}`);
      return result;
    }
  }

  /**
   * Generate instance ID
   */
  private generateInstanceId(testSuite: string, testFile?: string): string {
    const base = testFile ? `${testSuite}_${testFile}` : testSuite;
    return base.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
  }

  /**
   * Generate database URL for instance
   */
  private generateDatabaseUrl(instanceId: string): string {
    if (this.config.databaseUrl.includes('sqlite')) {
      return this.config.databaseUrl.replace('.db', `_${instanceId}.db`);
    }
    // For other databases, would append database name
    return `${this.config.databaseUrl}/${this.config.testDatabasePrefix}${instanceId}`;
  }

  /**
   * Create test database (simulated)
   */
  private async createTestDatabase(instance: TestDatabaseInstance): Promise<void> {
    console.log(`Creating test database: ${instance.name}`);
    // In real implementation, would create database and run migrations
    // await this.executeSQL(`CREATE DATABASE ${instance.name}`);
    // await this.runMigrations(instance);
  }

  /**
   * Configure test database
   */
  private async configureTestDatabase(instance: TestDatabaseInstance): Promise<void> {
    console.log(`Configuring test database: ${instance.name}`);
    
    // Configure foreign keys
    if (this.config.enableForeignKeys) {
      // await this.executeSQL('PRAGMA foreign_keys = ON', instance);
    }

    // Configure triggers
    if (!this.config.enableTriggers) {
      // Disable triggers for faster test execution
      // await this.executeSQL('PRAGMA triggers = OFF', instance);
    }

    // Set other performance optimizations for testing
    // await this.executeSQL('PRAGMA synchronous = OFF', instance);
    // await this.executeSQL('PRAGMA journal_mode = MEMORY', instance);
  }

  /**
   * Seed test database (simulated)
   */
  private async seedTestDatabase(instance: TestDatabaseInstance): Promise<void> {
    console.log(`Seeding test database: ${instance.name}`);
    // In real implementation, would run seed scripts
    // const seedExecutor = new DatabaseSeedExecutor(instance.url);
    // await seedExecutor.executeAllSeedScripts();
  }

  /**
   * Truncate all tables
   */
  private async truncateAllTables(instance: TestDatabaseInstance, result: CleanupResult): Promise<void> {
    const tables = await this.getTableList(instance);
    
    // Disable foreign key checks temporarily
    // await this.executeSQL('PRAGMA foreign_keys = OFF', instance);
    
    for (const tableName of tables) {
      try {
        console.log(`Truncating table: ${tableName}`);
        // await this.executeSQL(`DELETE FROM ${tableName}`, instance);
        result.tablesCleared.push(tableName);
        result.recordsDeleted += 10; // Mock value
      } catch (error) {
        result.errors.push(`Failed to truncate ${tableName}: ${error}`);
      }
    }
    
    // Re-enable foreign key checks
    if (this.config.enableForeignKeys) {
      // await this.executeSQL('PRAGMA foreign_keys = ON', instance);
    }
  }

  /**
   * Delete all records
   */
  private async deleteAllRecords(instance: TestDatabaseInstance, result: CleanupResult): Promise<void> {
    const tables = await this.getTableList(instance);
    
    // Delete in reverse dependency order
    const orderedTables = this.getTableDeletionOrder(tables);
    
    for (const tableName of orderedTables) {
      try {
        console.log(`Deleting records from: ${tableName}`);
        // const deleteResult = await this.executeSQL(`DELETE FROM ${tableName}`, instance);
        result.tablesCleared.push(tableName);
        result.recordsDeleted += 5; // Mock value
      } catch (error) {
        result.errors.push(`Failed to delete from ${tableName}: ${error}`);
      }
    }
  }

  /**
   * Recreate database
   */
  private async recreateDatabase(instance: TestDatabaseInstance, result: CleanupResult): Promise<void> {
    try {
      console.log(`Recreating database: ${instance.name}`);
      // await this.dropDatabase(instance);
      // await this.createTestDatabase(instance);
      // await this.configureTestDatabase(instance);
      
      if (this.config.seedData) {
        // await this.seedTestDatabase(instance);
      }
      
      result.tablesCleared = ['all_tables_recreated'];
      result.recordsDeleted = 100; // Mock value
    } catch (error) {
      result.errors.push(`Failed to recreate database: ${error}`);
    }
  }

  /**
   * Get table list (simulated)
   */
  private async getTableList(instance: TestDatabaseInstance): Promise<string[]> {
    // In real implementation, would query database schema
    return [
      'users',
      'projects', 
      'device_classifications',
      'predicate_devices',
      'agent_interactions'
    ];
  }

  /**
   * Get table deletion order based on foreign key dependencies
   */
  private getTableDeletionOrder(tables: string[]): string[] {
    // Return tables in reverse dependency order
    return [
      'agent_interactions',
      'predicate_devices',
      'device_classifications',
      'projects',
      'users'
    ].filter(table => tables.includes(table));
  }

  /**
   * Get table record count (simulated)
   */
  private async getTableRecordCount(instance: TestDatabaseInstance, tableName: string): Promise<number> {
    // In real implementation, would execute COUNT query
    return Math.floor(Math.random() * 100);
  }

  /**
   * Get table schema (simulated)
   */
  private async getTableSchema(instance: TestDatabaseInstance, tableName: string): Promise<string> {
    // In real implementation, would get CREATE TABLE statement
    return `CREATE TABLE ${tableName} (id INTEGER PRIMARY KEY, ...)`;
  }

  /**
   * Get table data (simulated)
   */
  private async getTableData(instance: TestDatabaseInstance, tableName: string): Promise<any[]> {
    // In real implementation, would SELECT all data
    return [
      { id: 1, name: 'test_record_1' },
      { id: 2, name: 'test_record_2' }
    ];
  }

  /**
   * Insert table data (simulated)
   */
  private async insertTableData(instance: TestDatabaseInstance, tableName: string, data: any[]): Promise<void> {
    console.log(`Inserting ${data.length} records into ${tableName}`);
    // In real implementation, would execute INSERT statements
  }

  /**
   * Get table size (simulated)
   */
  private async getTableSize(instance: TestDatabaseInstance, tableName: string): Promise<number> {
    // In real implementation, would calculate table size
    return Math.floor(Math.random() * 10000);
  }

  /**
   * Get table indexes (simulated)
   */
  private async getTableIndexes(instance: TestDatabaseInstance, tableName: string): Promise<string[]> {
    // In real implementation, would query index information
    return [`idx_${tableName}_id`, `idx_${tableName}_created_at`];
  }

  /**
   * Check foreign key constraints (simulated)
   */
  private async checkForeignKeyConstraints(instance: TestDatabaseInstance): Promise<IntegrityCheck> {
    // In real implementation, would run PRAGMA foreign_key_check
    return {
      name: 'Foreign Key Constraints',
      passed: true,
      errors: [],
      details: 'All foreign key constraints are valid'
    };
  }

  /**
   * Check data consistency (simulated)
   */
  private async checkDataConsistency(instance: TestDatabaseInstance): Promise<IntegrityCheck> {
    // In real implementation, would run custom consistency checks
    return {
      name: 'Data Consistency',
      passed: true,
      errors: [],
      details: 'All data consistency checks passed'
    };
  }

  /**
   * Check table schemas (simulated)
   */
  private async checkTableSchemas(instance: TestDatabaseInstance): Promise<IntegrityCheck> {
    // In real implementation, would validate table schemas
    return {
      name: 'Table Schemas',
      passed: true,
      errors: [],
      details: 'All table schemas are valid'
    };
  }

  /**
   * Calculate snapshot checksum
   */
  private calculateSnapshotChecksum(snapshot: DatabaseSnapshot): string {
    const content = JSON.stringify(snapshot.tables);
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Get all active instances
   */
  getActiveInstances(): TestDatabaseInstance[] {
    return Array.from(this.activeInstances.values());
  }

  /**
   * Get all snapshots
   */
  getSnapshots(): DatabaseSnapshot[] {
    return Array.from(this.snapshots.values());
  }

  /**
   * Cleanup all instances
   */
  async cleanupAllInstances(): Promise<CleanupResult[]> {
    const results: CleanupResult[] = [];
    
    for (const instanceId of this.activeInstances.keys()) {
      try {
        const result = await this.cleanupTestDatabase(instanceId);
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          tablesCleared: [],
          recordsDeleted: 0,
          executionTime: 0,
          errors: [error instanceof Error ? error.message : String(error)]
        });
      }
    }
    
    return results;
  }
}

export interface DatabaseStatistics {
  instanceId: string;
  tables: TableStatistics[];
  totalRecords: number;
  totalSize: number;
  lastUpdated: string;
}

export interface TableStatistics {
  name: string;
  recordCount: number;
  size: number;
  indexes: string[];
}

export interface IntegrityCheckResult {
  valid: boolean;
  checks: IntegrityCheck[];
  errors: string[];
  warnings: string[];
}

export interface IntegrityCheck {
  name: string;
  passed: boolean;
  errors: string[];
  details: string;
}

export default DatabaseTestManager;