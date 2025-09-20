/**
 * Database Migration Scripts for Test Data Management
 * Manages database schema changes and data migrations for testing
 */

export interface Migration {
  id: string;
  name: string;
  version: string;
  description: string;
  up: MigrationScript;
  down: MigrationScript;
  dependencies: string[];
  tags: string[];
}

export interface MigrationScript {
  sql: string[];
  dataTransforms?: DataTransform[];
  validations?: ValidationRule[];
}

export interface DataTransform {
  table: string;
  operation: 'insert' | 'update' | 'delete' | 'transform';
  condition?: string;
  data?: Record<string, any>;
  transform?: (row: any) => any;
}

export interface ValidationRule {
  name: string;
  sql: string;
  expectedResult: any;
  errorMessage: string;
}

export interface MigrationResult {
  success: boolean;
  migrationsApplied: string[];
  errors: MigrationError[];
  duration: number;
  timestamp: string;
}

export interface MigrationError {
  migrationId: string;
  step: string;
  error: string;
  timestamp: string;
}

export interface MigrationStatus {
  id: string;
  name: string;
  version: string;
  applied: boolean;
  appliedAt?: string;
  checksum: string;
}

/**
 * Database Migration Manager
 * Handles database schema changes and data migrations
 */
export class DatabaseMigrationManager {
  private connection: any; // Database connection

  private migrations: Map<string, Migration> = new Map();

  constructor(connection: any) {
    this.connection = connection;
    this.initializeMigrations();
  }

  /**
   * Initialize built-in migrations
   */
  private initializeMigrations(): void {
    // Initial schema migration
    this.addMigration({
      id: '001_initial_schema',
      name: 'Initial Database Schema',
      version: '1.0.0',
      description:
        'Create initial database schema for medical device regulatory assistant',
      up: {
        sql: [
          `CREATE TABLE IF NOT EXISTS migration_history (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            version TEXT NOT NULL,
            applied_at TEXT NOT NULL,
            checksum TEXT NOT NULL
          )`,
          `CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            role TEXT,
            created_at TEXT NOT NULL,
            last_login TEXT
          )`,
          `CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            device_type TEXT,
            intended_use TEXT,
            status TEXT DEFAULT 'draft',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
          )`,
          `CREATE TABLE IF NOT EXISTS device_classifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            device_class TEXT,
            product_code TEXT,
            regulatory_pathway TEXT,
            cfr_sections TEXT,
            confidence_score REAL,
            reasoning TEXT,
            sources TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
          )`,
          `CREATE TABLE IF NOT EXISTS predicate_devices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            k_number TEXT NOT NULL,
            device_name TEXT,
            intended_use TEXT,
            product_code TEXT,
            clearance_date TEXT,
            confidence_score REAL,
            comparison_data TEXT,
            is_selected INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
          )`,
          `CREATE TABLE IF NOT EXISTS project_documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            file_path TEXT NOT NULL,
            document_type TEXT,
            content_markdown TEXT,
            metadata TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
          )`,
          `CREATE TABLE IF NOT EXISTS agent_interactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_id INTEGER NOT NULL,
            user_id TEXT NOT NULL,
            agent_action TEXT NOT NULL,
            input_data TEXT NOT NULL,
            output_data TEXT NOT NULL,
            confidence_score REAL,
            sources TEXT,
            reasoning TEXT,
            execution_time_ms INTEGER,
            created_at TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id)
          )`,
        ],
        validations: [
          {
            name: 'Check users table exists',
            sql: 'SELECT name FROM sqlite_master WHERE type="table" AND name="users"',
            expectedResult: [{ name: 'users' }],
            errorMessage: 'Users table was not created',
          },
        ],
      },
      down: {
        sql: [
          'DROP TABLE IF EXISTS agent_interactions',
          'DROP TABLE IF EXISTS project_documents',
          'DROP TABLE IF EXISTS predicate_devices',
          'DROP TABLE IF EXISTS device_classifications',
          'DROP TABLE IF EXISTS projects',
          'DROP TABLE IF EXISTS users',
          'DROP TABLE IF EXISTS migration_history',
        ],
      },
      dependencies: [],
      tags: ['schema', 'initial'],
    });

    // Add indexes migration
    this.addMigration({
      id: '002_add_indexes',
      name: 'Add Database Indexes',
      version: '1.1.0',
      description: 'Add indexes for better query performance',
      up: {
        sql: [
          'CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)',
          'CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)',
          'CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at)',
          'CREATE INDEX IF NOT EXISTS idx_classifications_project_id ON device_classifications(project_id)',
          'CREATE INDEX IF NOT EXISTS idx_predicates_project_id ON predicate_devices(project_id)',
          'CREATE INDEX IF NOT EXISTS idx_predicates_k_number ON predicate_devices(k_number)',
          'CREATE INDEX IF NOT EXISTS idx_predicates_selected ON predicate_devices(is_selected)',
          'CREATE INDEX IF NOT EXISTS idx_documents_project_id ON project_documents(project_id)',
          'CREATE INDEX IF NOT EXISTS idx_interactions_project_id ON agent_interactions(project_id)',
          'CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON agent_interactions(user_id)',
          'CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON agent_interactions(created_at)',
          'CREATE INDEX IF NOT EXISTS idx_interactions_action ON agent_interactions(agent_action)',
        ],
        validations: [
          {
            name: 'Check project user_id index exists',
            sql: 'SELECT name FROM sqlite_master WHERE type="index" AND name="idx_projects_user_id"',
            expectedResult: [{ name: 'idx_projects_user_id' }],
            errorMessage: 'Project user_id index was not created',
          },
        ],
      },
      down: {
        sql: [
          'DROP INDEX IF EXISTS idx_projects_user_id',
          'DROP INDEX IF EXISTS idx_projects_status',
          'DROP INDEX IF EXISTS idx_projects_created_at',
          'DROP INDEX IF EXISTS idx_classifications_project_id',
          'DROP INDEX IF EXISTS idx_predicates_project_id',
          'DROP INDEX IF EXISTS idx_predicates_k_number',
          'DROP INDEX IF EXISTS idx_predicates_selected',
          'DROP INDEX IF EXISTS idx_documents_project_id',
          'DROP INDEX IF EXISTS idx_interactions_project_id',
          'DROP INDEX IF EXISTS idx_interactions_user_id',
          'DROP INDEX IF EXISTS idx_interactions_created_at',
          'DROP INDEX IF EXISTS idx_interactions_action',
        ],
      },
      dependencies: ['001_initial_schema'],
      tags: ['performance', 'indexes'],
    });

    // Add test data migration
    this.addMigration({
      id: '003_test_data_setup',
      name: 'Test Data Setup',
      version: '1.2.0',
      description: 'Set up test data and validation constraints',
      up: {
        sql: [
          `CREATE TABLE IF NOT EXISTS test_scenarios (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT,
            data_seed TEXT,
            created_at TEXT NOT NULL
          )`,
          `CREATE TABLE IF NOT EXISTS test_runs (
            id TEXT PRIMARY KEY,
            scenario_id TEXT,
            status TEXT NOT NULL,
            started_at TEXT NOT NULL,
            completed_at TEXT,
            results TEXT,
            FOREIGN KEY (scenario_id) REFERENCES test_scenarios(id)
          )`,
        ],
        dataTransforms: [
          {
            table: 'test_scenarios',
            operation: 'insert',
            data: {
              id: 'new_user_onboarding',
              name: 'New User Onboarding',
              description:
                'Test scenario for new user registration and first project creation',
              data_seed: JSON.stringify({ userCount: 1, projectCount: 0 }),
              created_at: new Date().toISOString(),
            },
          },
          {
            table: 'test_scenarios',
            operation: 'insert',
            data: {
              id: 'existing_project_workflow',
              name: 'Existing Project Workflow',
              description: 'Test scenario with existing projects and data',
              data_seed: JSON.stringify({ userCount: 1, projectCount: 3 }),
              created_at: new Date().toISOString(),
            },
          },
        ],
      },
      down: {
        sql: [
          'DROP TABLE IF EXISTS test_runs',
          'DROP TABLE IF EXISTS test_scenarios',
        ],
      },
      dependencies: ['002_add_indexes'],
      tags: ['testing', 'data'],
    });

    // Add data validation constraints
    this.addMigration({
      id: '004_data_validation',
      name: 'Data Validation Constraints',
      version: '1.3.0',
      description: 'Add data validation and integrity constraints',
      up: {
        sql: [
          // Add check constraints for valid status values
          `CREATE TRIGGER IF NOT EXISTS validate_project_status
           BEFORE INSERT ON projects
           WHEN NEW.status NOT IN ('draft', 'in_progress', 'completed')
           BEGIN
             SELECT RAISE(ABORT, 'Invalid project status');
           END`,

          `CREATE TRIGGER IF NOT EXISTS validate_device_class
           BEFORE INSERT ON device_classifications
           WHEN NEW.device_class NOT IN ('I', 'II', 'III')
           BEGIN
             SELECT RAISE(ABORT, 'Invalid device class');
           END`,

          `CREATE TRIGGER IF NOT EXISTS validate_confidence_score
           BEFORE INSERT ON device_classifications
           WHEN NEW.confidence_score < 0 OR NEW.confidence_score > 1
           BEGIN
             SELECT RAISE(ABORT, 'Confidence score must be between 0 and 1');
           END`,

          // Add updated_at trigger for projects
          `CREATE TRIGGER IF NOT EXISTS update_project_timestamp
           AFTER UPDATE ON projects
           BEGIN
             UPDATE projects SET updated_at = datetime('now') WHERE id = NEW.id;
           END`,
        ],
        validations: [
          {
            name: 'Check project status trigger exists',
            sql: 'SELECT name FROM sqlite_master WHERE type="trigger" AND name="validate_project_status"',
            expectedResult: [{ name: 'validate_project_status' }],
            errorMessage: 'Project status validation trigger was not created',
          },
        ],
      },
      down: {
        sql: [
          'DROP TRIGGER IF EXISTS validate_project_status',
          'DROP TRIGGER IF EXISTS validate_device_class',
          'DROP TRIGGER IF EXISTS validate_confidence_score',
          'DROP TRIGGER IF EXISTS update_project_timestamp',
        ],
      },
      dependencies: ['003_test_data_setup'],
      tags: ['validation', 'constraints'],
    });

    // Add performance optimization migration
    this.addMigration({
      id: '005_performance_optimization',
      name: 'Performance Optimization',
      version: '1.4.0',
      description: 'Add performance optimizations and materialized views',
      up: {
        sql: [
          // Create view for project dashboard data
          `CREATE VIEW IF NOT EXISTS project_dashboard_view AS
           SELECT 
             p.id,
             p.name,
             p.description,
             p.device_type,
             p.status,
             p.created_at,
             p.updated_at,
             COUNT(DISTINCT dc.id) as classification_count,
             COUNT(DISTINCT pd.id) as predicate_count,
             COUNT(DISTINCT pd.id) FILTER (WHERE pd.is_selected = 1) as selected_predicate_count,
             COUNT(DISTINCT doc.id) as document_count,
             COUNT(DISTINCT ai.id) as interaction_count,
             MAX(ai.created_at) as last_interaction_at
           FROM projects p
           LEFT JOIN device_classifications dc ON p.id = dc.project_id
           LEFT JOIN predicate_devices pd ON p.id = pd.project_id
           LEFT JOIN project_documents doc ON p.id = doc.project_id
           LEFT JOIN agent_interactions ai ON p.id = ai.project_id
           GROUP BY p.id`,

          // Create view for user activity summary
          `CREATE VIEW IF NOT EXISTS user_activity_view AS
           SELECT 
             u.id,
             u.name,
             u.email,
             COUNT(DISTINCT p.id) as project_count,
             COUNT(DISTINCT ai.id) as interaction_count,
             MAX(ai.created_at) as last_activity_at,
             COUNT(DISTINCT p.id) FILTER (WHERE p.status = 'completed') as completed_projects
           FROM users u
           LEFT JOIN projects p ON u.id = p.user_id
           LEFT JOIN agent_interactions ai ON u.id = ai.user_id
           GROUP BY u.id`,

          // Add composite indexes for common queries
          'CREATE INDEX IF NOT EXISTS idx_projects_user_status ON projects(user_id, status)',
          'CREATE INDEX IF NOT EXISTS idx_predicates_project_selected ON predicate_devices(project_id, is_selected)',
          'CREATE INDEX IF NOT EXISTS idx_interactions_project_action ON agent_interactions(project_id, agent_action)',
        ],
        validations: [
          {
            name: 'Check project dashboard view exists',
            sql: 'SELECT name FROM sqlite_master WHERE type="view" AND name="project_dashboard_view"',
            expectedResult: [{ name: 'project_dashboard_view' }],
            errorMessage: 'Project dashboard view was not created',
          },
        ],
      },
      down: {
        sql: [
          'DROP VIEW IF EXISTS project_dashboard_view',
          'DROP VIEW IF EXISTS user_activity_view',
          'DROP INDEX IF EXISTS idx_projects_user_status',
          'DROP INDEX IF EXISTS idx_predicates_project_selected',
          'DROP INDEX IF EXISTS idx_interactions_project_action',
        ],
      },
      dependencies: ['004_data_validation'],
      tags: ['performance', 'views'],
    });
  }

  /**
   * Add a migration to the manager
   */
  addMigration(migration: Migration): void {
    this.migrations.set(migration.id, migration);
  }

  /**
   * Get all migrations
   */
  getMigrations(): Migration[] {
    return Array.from(this.migrations.values());
  }

  /**
   * Get migration by ID
   */
  getMigration(id: string): Migration | undefined {
    return this.migrations.get(id);
  }

  /**
   * Get pending migrations
   */
  async getPendingMigrations(): Promise<Migration[]> {
    const appliedMigrations = await this.getAppliedMigrations();
    const appliedIds = new Set(appliedMigrations.map((m) => m.id));

    return this.getMigrations()
      .filter((migration) => !appliedIds.has(migration.id))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Get applied migrations
   */
  async getAppliedMigrations(): Promise<MigrationStatus[]> {
    try {
      const result = await this.connection.execute(`
        SELECT id, name, version, applied_at, checksum
        FROM migration_history
        ORDER BY applied_at
      `);

      return (result || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        version: row.version,
        applied: true,
        appliedAt: row.applied_at,
        checksum: row.checksum,
      }));
    } catch (error) {
      // Migration history table doesn't exist yet
      return [];
    }
  }

  /**
   * Run all pending migrations
   */
  async migrate(): Promise<MigrationResult> {
    const startTime = Date.now();
    const errors: MigrationError[] = [];
    const migrationsApplied: string[] = [];

    try {
      const pendingMigrations = await this.getPendingMigrations();

      for (const migration of pendingMigrations) {
        try {
          await this.runMigration(migration);
          migrationsApplied.push(migration.id);
        } catch (error) {
          errors.push({
            migrationId: migration.id,
            step: 'execution',
            error: String(error),
            timestamp: new Date().toISOString(),
          });
          break; // Stop on first error
        }
      }

      return {
        success: errors.length === 0,
        migrationsApplied,
        errors,
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        success: false,
        migrationsApplied,
        errors: [
          {
            migrationId: 'general',
            step: 'migration_process',
            error: String(error),
            timestamp: new Date().toISOString(),
          },
        ],
        duration: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Run a specific migration
   */
  async runMigration(migration: Migration): Promise<void> {
    console.log(`Running migration: ${migration.id} - ${migration.name}`);

    await this.connection.transaction(async (tx: any) => {
      // Execute SQL statements
      for (const sql of migration.up.sql) {
        await tx.execute(sql);
      }

      // Execute data transforms
      if (migration.up.dataTransforms) {
        for (const transform of migration.up.dataTransforms) {
          await this.executeDataTransform(tx, transform);
        }
      }

      // Run validations
      if (migration.up.validations) {
        for (const validation of migration.up.validations) {
          await this.runValidation(tx, validation);
        }
      }

      // Record migration in history
      await this.recordMigration(tx, migration);
    });

    console.log(`Migration completed: ${migration.id}`);
  }

  /**
   * Rollback a migration
   */
  async rollbackMigration(migrationId: string): Promise<void> {
    const migration = this.getMigration(migrationId);
    if (!migration) {
      throw new Error(`Migration not found: ${migrationId}`);
    }

    console.log(`Rolling back migration: ${migration.id} - ${migration.name}`);

    await this.connection.transaction(async (tx: any) => {
      // Execute rollback SQL statements
      for (const sql of migration.down.sql) {
        await tx.execute(sql);
      }

      // Remove from migration history
      await tx.execute('DELETE FROM migration_history WHERE id = ?', [
        migration.id,
      ]);
    });

    console.log(`Migration rolled back: ${migration.id}`);
  }

  /**
   * Execute data transform
   */
  private async executeDataTransform(
    tx: any,
    transform: DataTransform
  ): Promise<void> {
    switch (transform.operation) {
      case 'insert':
        if (transform.data) {
          const columns = Object.keys(transform.data);
          const values = Object.values(transform.data);
          const placeholders = columns.map(() => '?').join(', ');

          await tx.execute(
            `INSERT INTO ${transform.table} (${columns.join(', ')}) VALUES (${placeholders})`,
            values
          );
        }
        break;

      case 'update':
        if (transform.data && transform.condition) {
          const setClause = Object.keys(transform.data)
            .map((key) => `${key} = ?`)
            .join(', ');

          await tx.execute(
            `UPDATE ${transform.table} SET ${setClause} WHERE ${transform.condition}`,
            Object.values(transform.data)
          );
        }
        break;

      case 'delete':
        if (transform.condition) {
          await tx.execute(
            `DELETE FROM ${transform.table} WHERE ${transform.condition}`
          );
        }
        break;

      case 'transform':
        if (transform.transform) {
          // Get all rows
          const rows = await tx.execute(`SELECT * FROM ${transform.table}`);

          // Transform each row
          for (const row of rows || []) {
            const transformedRow = transform.transform(row);
            const setClause = Object.keys(transformedRow)
              .map((key) => `${key} = ?`)
              .join(', ');

            await tx.execute(
              `UPDATE ${transform.table} SET ${setClause} WHERE id = ?`,
              [...Object.values(transformedRow), row.id]
            );
          }
        }
        break;
    }
  }

  /**
   * Run validation
   */
  private async runValidation(
    tx: any,
    validation: ValidationRule
  ): Promise<void> {
    const result = await tx.execute(validation.sql);

    // Simple validation - check if result matches expected
    if (JSON.stringify(result) !== JSON.stringify(validation.expectedResult)) {
      throw new Error(
        `Validation failed: ${validation.name} - ${validation.errorMessage}`
      );
    }
  }

  /**
   * Record migration in history
   */
  private async recordMigration(tx: any, migration: Migration): Promise<void> {
    const checksum = this.calculateChecksum(migration);

    await tx.execute(
      `INSERT INTO migration_history (id, name, version, applied_at, checksum)
       VALUES (?, ?, ?, ?, ?)`,
      [
        migration.id,
        migration.name,
        migration.version,
        new Date().toISOString(),
        checksum,
      ]
    );
  }

  /**
   * Calculate migration checksum
   */
  private calculateChecksum(migration: Migration): string {
    const content = JSON.stringify({
      id: migration.id,
      sql: migration.up.sql,
      dataTransforms: migration.up.dataTransforms,
    });

    // Simple checksum calculation (in real implementation, use proper hash)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash &= hash; // Convert to 32-bit integer
    }

    return hash.toString(16);
  }

  /**
   * Reset database to clean state
   */
  async resetDatabase(): Promise<void> {
    console.log('Resetting database to clean state...');

    // Get all applied migrations in reverse order
    const appliedMigrations = await this.getAppliedMigrations();
    appliedMigrations.reverse();

    // Rollback all migrations
    for (const migrationStatus of appliedMigrations) {
      await this.rollbackMigration(migrationStatus.id);
    }

    console.log('Database reset completed');
  }

  /**
   * Validate database integrity
   */
  async validateDatabase(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check foreign key integrity
      const fkResult = await this.connection.execute(
        'PRAGMA foreign_key_check'
      );
      if (fkResult && fkResult.length > 0) {
        issues.push(`Foreign key violations found: ${fkResult.length}`);
      }

      // Check for orphaned records
      const orphanedProjects = await this.connection.execute(`
        SELECT COUNT(*) as count FROM projects p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE u.id IS NULL
      `);

      if (orphanedProjects[0]?.count > 0) {
        issues.push(
          `Found ${orphanedProjects[0].count} projects with invalid user references`
        );
      }

      // Check data consistency
      const invalidClassifications = await this.connection.execute(`
        SELECT COUNT(*) as count FROM device_classifications
        WHERE confidence_score < 0 OR confidence_score > 1
      `);

      if (invalidClassifications[0]?.count > 0) {
        issues.push(
          `Found ${invalidClassifications[0].count} classifications with invalid confidence scores`
        );
      }

      return {
        valid: issues.length === 0,
        issues,
      };
    } catch (error) {
      return {
        valid: false,
        issues: [`Database validation failed: ${error}`],
      };
    }
  }
}

/**
 * Export utility functions for migration management
 */
export async function runMigrations(connection: any): Promise<MigrationResult> {
  const manager = new DatabaseMigrationManager(connection);
  return await manager.migrate();
}

export async function resetTestDatabase(connection: any): Promise<void> {
  const manager = new DatabaseMigrationManager(connection);
  await manager.resetDatabase();
}

export async function validateDatabaseIntegrity(
  connection: any
): Promise<{ valid: boolean; issues: string[] }> {
  const manager = new DatabaseMigrationManager(connection);
  return await manager.validateDatabase();
}

export function createCustomMigration(
  id: string,
  name: string,
  description: string,
  upSql: string[],
  downSql: string[]
): Migration {
  return {
    id,
    name,
    version: '1.0.0',
    description,
    up: { sql: upSql },
    down: { sql: downSql },
    dependencies: [],
    tags: ['custom'],
  };
}
