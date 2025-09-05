/**
 * Database Migration Scripts for Test Data Management
 * Handles database schema migrations and test data lifecycle
 */

export interface DatabaseMigration {
  id: string;
  name: string;
  description: string;
  version: string;
  upScript: string;
  downScript: string;
  dependencies: string[];
  checksum: string;
  executedAt?: string;
}

export interface MigrationExecutionResult {
  migrationId: string;
  success: boolean;
  executionTime: number;
  error?: string;
  rollbackAvailable: boolean;
}

export interface DatabaseSchema {
  tables: TableDefinition[];
  indexes: IndexDefinition[];
  constraints: ConstraintDefinition[];
  triggers: TriggerDefinition[];
}

export interface TableDefinition {
  name: string;
  columns: ColumnDefinition[];
  primaryKey: string[];
  foreignKeys: ForeignKeyDefinition[];
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  unique?: boolean;
  index?: boolean;
}

export interface IndexDefinition {
  name: string;
  table: string;
  columns: string[];
  unique: boolean;
  type: 'btree' | 'hash' | 'gin' | 'gist';
}

export interface ConstraintDefinition {
  name: string;
  table: string;
  type: 'check' | 'unique' | 'foreign_key';
  definition: string;
}

export interface ForeignKeyDefinition {
  name: string;
  columns: string[];
  referencedTable: string;
  referencedColumns: string[];
  onDelete: 'cascade' | 'restrict' | 'set_null' | 'set_default';
  onUpdate: 'cascade' | 'restrict' | 'set_null' | 'set_default';
}

export interface TriggerDefinition {
  name: string;
  table: string;
  event: 'insert' | 'update' | 'delete';
  timing: 'before' | 'after';
  function: string;
}

/**
 * Database Migration Manager
 * Manages database schema migrations for testing
 */
export class DatabaseMigrationManager {
  private migrations: DatabaseMigration[] = [];
  private executionHistory: MigrationExecutionResult[] = [];

  constructor() {
    this.initializeMigrations();
  }

  /**
   * Initialize all migration scripts
   */
  private initializeMigrations(): void {
    this.migrations = [
      this.createInitialSchemaMigration(),
      this.createTestDataIndexesMigration(),
      this.createAuditTriggersMigration(),
      this.createPerformanceOptimizationMigration()
    ];
  }

  /**
   * Create initial schema migration
   */
  private createInitialSchemaMigration(): DatabaseMigration {
    return {
      id: 'initial-schema',
      name: 'Initial Database Schema',
      description: 'Create initial database schema for medical device regulatory assistant',
      version: '1.0.0',
      dependencies: [],
      checksum: this.calculateChecksum('initial-schema'),
      upScript: `
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    device_type VARCHAR(255),
    intended_use TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create device_classifications table
CREATE TABLE IF NOT EXISTS device_classifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    device_class VARCHAR(10),
    product_code VARCHAR(10),
    regulatory_pathway VARCHAR(50),
    cfr_sections JSON,
    confidence_score REAL,
    reasoning TEXT,
    sources JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create predicate_devices table
CREATE TABLE IF NOT EXISTS predicate_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    k_number VARCHAR(20) NOT NULL,
    device_name VARCHAR(500),
    intended_use TEXT,
    product_code VARCHAR(10),
    clearance_date DATE,
    confidence_score REAL,
    comparison_data JSON,
    is_selected BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Create agent_interactions table
CREATE TABLE IF NOT EXISTS agent_interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    agent_action VARCHAR(255) NOT NULL,
    input_data JSON,
    output_data JSON,
    confidence_score REAL,
    sources JSON,
    reasoning TEXT,
    execution_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
`,
      downScript: `
-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS agent_interactions;
DROP TABLE IF EXISTS predicate_devices;
DROP TABLE IF EXISTS device_classifications;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;
`
    };
  }

  /**
   * Create test data indexes migration
   */
  private createTestDataIndexesMigration(): DatabaseMigration {
    return {
      id: 'test-data-indexes',
      name: 'Test Data Performance Indexes',
      description: 'Add indexes for improved test data query performance',
      version: '1.1.0',
      dependencies: ['initial-schema'],
      checksum: this.calculateChecksum('test-data-indexes'),
      upScript: `
-- User indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Project indexes
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_device_type ON projects(device_type);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

-- Device classification indexes
CREATE INDEX IF NOT EXISTS idx_device_classifications_project_id ON device_classifications(project_id);
CREATE INDEX IF NOT EXISTS idx_device_classifications_device_class ON device_classifications(device_class);
CREATE INDEX IF NOT EXISTS idx_device_classifications_product_code ON device_classifications(product_code);
CREATE INDEX IF NOT EXISTS idx_device_classifications_confidence ON device_classifications(confidence_score);

-- Predicate device indexes
CREATE INDEX IF NOT EXISTS idx_predicate_devices_project_id ON predicate_devices(project_id);
CREATE INDEX IF NOT EXISTS idx_predicate_devices_k_number ON predicate_devices(k_number);
CREATE INDEX IF NOT EXISTS idx_predicate_devices_product_code ON predicate_devices(product_code);
CREATE INDEX IF NOT EXISTS idx_predicate_devices_confidence ON predicate_devices(confidence_score);
CREATE INDEX IF NOT EXISTS idx_predicate_devices_selected ON predicate_devices(is_selected);

-- Agent interaction indexes
CREATE INDEX IF NOT EXISTS idx_agent_interactions_project_id ON agent_interactions(project_id);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_user_id ON agent_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_action ON agent_interactions(agent_action);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_created_at ON agent_interactions(created_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_projects_user_status ON projects(user_id, status);
CREATE INDEX IF NOT EXISTS idx_predicate_devices_project_selected ON predicate_devices(project_id, is_selected);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_project_action ON agent_interactions(project_id, agent_action);
`,
      downScript: `
-- Drop composite indexes
DROP INDEX IF EXISTS idx_agent_interactions_project_action;
DROP INDEX IF EXISTS idx_predicate_devices_project_selected;
DROP INDEX IF EXISTS idx_projects_user_status;

-- Drop agent interaction indexes
DROP INDEX IF EXISTS idx_agent_interactions_created_at;
DROP INDEX IF EXISTS idx_agent_interactions_action;
DROP INDEX IF EXISTS idx_agent_interactions_user_id;
DROP INDEX IF EXISTS idx_agent_interactions_project_id;

-- Drop predicate device indexes
DROP INDEX IF EXISTS idx_predicate_devices_selected;
DROP INDEX IF EXISTS idx_predicate_devices_confidence;
DROP INDEX IF EXISTS idx_predicate_devices_product_code;
DROP INDEX IF EXISTS idx_predicate_devices_k_number;
DROP INDEX IF EXISTS idx_predicate_devices_project_id;

-- Drop device classification indexes
DROP INDEX IF EXISTS idx_device_classifications_confidence;
DROP INDEX IF EXISTS idx_device_classifications_product_code;
DROP INDEX IF EXISTS idx_device_classifications_device_class;
DROP INDEX IF EXISTS idx_device_classifications_project_id;

-- Drop project indexes
DROP INDEX IF EXISTS idx_projects_created_at;
DROP INDEX IF EXISTS idx_projects_device_type;
DROP INDEX IF EXISTS idx_projects_status;
DROP INDEX IF EXISTS idx_projects_user_id;

-- Drop user indexes
DROP INDEX IF EXISTS idx_users_google_id;
DROP INDEX IF EXISTS idx_users_email;
`
    };
  }

  /**
   * Create audit triggers migration
   */
  private createAuditTriggersMigration(): DatabaseMigration {
    return {
      id: 'audit-triggers',
      name: 'Audit Trail Triggers',
      description: 'Add triggers for automatic audit trail and updated_at timestamps',
      version: '1.2.0',
      dependencies: ['test-data-indexes'],
      checksum: this.calculateChecksum('audit-triggers'),
      upScript: `
-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name VARCHAR(255) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_values JSON,
    new_values JSON,
    user_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create updated_at trigger for users
CREATE TRIGGER IF NOT EXISTS trigger_users_updated_at
    AFTER UPDATE ON users
    FOR EACH ROW
BEGIN
    UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Create updated_at trigger for projects
CREATE TRIGGER IF NOT EXISTS trigger_projects_updated_at
    AFTER UPDATE ON projects
    FOR EACH ROW
BEGIN
    UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Create updated_at trigger for device_classifications
CREATE TRIGGER IF NOT EXISTS trigger_device_classifications_updated_at
    AFTER UPDATE ON device_classifications
    FOR EACH ROW
BEGIN
    UPDATE device_classifications SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Create updated_at trigger for predicate_devices
CREATE TRIGGER IF NOT EXISTS trigger_predicate_devices_updated_at
    AFTER UPDATE ON predicate_devices
    FOR EACH ROW
BEGIN
    UPDATE predicate_devices SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Create updated_at trigger for agent_interactions
CREATE TRIGGER IF NOT EXISTS trigger_agent_interactions_updated_at
    AFTER UPDATE ON agent_interactions
    FOR EACH ROW
BEGIN
    UPDATE agent_interactions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Create audit trigger for projects
CREATE TRIGGER IF NOT EXISTS trigger_projects_audit
    AFTER UPDATE ON projects
    FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (table_name, record_id, action, old_values, new_values, user_id)
    VALUES (
        'projects',
        NEW.id,
        'UPDATE',
        json_object(
            'name', OLD.name,
            'description', OLD.description,
            'device_type', OLD.device_type,
            'intended_use', OLD.intended_use,
            'status', OLD.status
        ),
        json_object(
            'name', NEW.name,
            'description', NEW.description,
            'device_type', NEW.device_type,
            'intended_use', NEW.intended_use,
            'status', NEW.status
        ),
        NEW.user_id
    );
END;

-- Index for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_record ON audit_logs(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
`,
      downScript: `
-- Drop audit triggers
DROP TRIGGER IF EXISTS trigger_projects_audit;
DROP TRIGGER IF EXISTS trigger_agent_interactions_updated_at;
DROP TRIGGER IF EXISTS trigger_predicate_devices_updated_at;
DROP TRIGGER IF EXISTS trigger_device_classifications_updated_at;
DROP TRIGGER IF EXISTS trigger_projects_updated_at;
DROP TRIGGER IF EXISTS trigger_users_updated_at;

-- Drop audit log indexes
DROP INDEX IF EXISTS idx_audit_logs_created_at;
DROP INDEX IF EXISTS idx_audit_logs_table_record;

-- Drop audit log table
DROP TABLE IF EXISTS audit_logs;
`
    };
  }

  /**
   * Create performance optimization migration
   */
  private createPerformanceOptimizationMigration(): DatabaseMigration {
    return {
      id: 'performance-optimization',
      name: 'Performance Optimization',
      description: 'Add performance optimizations for large test datasets',
      version: '1.3.0',
      dependencies: ['audit-triggers'],
      checksum: this.calculateChecksum('performance-optimization'),
      upScript: `
-- Create materialized view for project statistics (simulated with regular view in SQLite)
CREATE VIEW IF NOT EXISTS project_statistics AS
SELECT 
    p.id,
    p.name,
    p.status,
    COUNT(DISTINCT dc.id) as classification_count,
    COUNT(DISTINCT pd.id) as predicate_count,
    COUNT(DISTINCT ai.id) as interaction_count,
    MAX(ai.created_at) as last_interaction,
    AVG(dc.confidence_score) as avg_classification_confidence,
    AVG(pd.confidence_score) as avg_predicate_confidence
FROM projects p
LEFT JOIN device_classifications dc ON p.id = dc.project_id
LEFT JOIN predicate_devices pd ON p.id = pd.project_id
LEFT JOIN agent_interactions ai ON p.id = ai.project_id
GROUP BY p.id, p.name, p.status;

-- Create view for user activity summary
CREATE VIEW IF NOT EXISTS user_activity_summary AS
SELECT 
    u.id,
    u.name,
    u.email,
    COUNT(DISTINCT p.id) as project_count,
    COUNT(DISTINCT ai.id) as interaction_count,
    MAX(ai.created_at) as last_activity,
    COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_projects
FROM users u
LEFT JOIN projects p ON u.id = p.user_id
LEFT JOIN agent_interactions ai ON u.id = ai.user_id
GROUP BY u.id, u.name, u.email;

-- Create partial indexes for better performance on filtered queries
CREATE INDEX IF NOT EXISTS idx_projects_active ON projects(id, user_id) WHERE status != 'completed';
CREATE INDEX IF NOT EXISTS idx_predicate_devices_high_confidence ON predicate_devices(project_id, confidence_score) WHERE confidence_score > 0.8;
CREATE INDEX IF NOT EXISTS idx_agent_interactions_recent ON agent_interactions(project_id, created_at) WHERE created_at > datetime('now', '-30 days');

-- Add check constraints for data integrity
ALTER TABLE device_classifications ADD CONSTRAINT chk_confidence_score 
    CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1));

ALTER TABLE predicate_devices ADD CONSTRAINT chk_predicate_confidence_score 
    CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1));

ALTER TABLE agent_interactions ADD CONSTRAINT chk_agent_confidence_score 
    CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1));
`,
      downScript: `
-- Drop check constraints (SQLite doesn't support dropping constraints directly)
-- Would need to recreate tables without constraints in a real implementation

-- Drop partial indexes
DROP INDEX IF EXISTS idx_agent_interactions_recent;
DROP INDEX IF EXISTS idx_predicate_devices_high_confidence;
DROP INDEX IF EXISTS idx_projects_active;

-- Drop views
DROP VIEW IF EXISTS user_activity_summary;
DROP VIEW IF EXISTS project_statistics;
`
    };
  }

  /**
   * Execute migration
   */
  async executeMigration(migrationId: string, direction: 'up' | 'down' = 'up'): Promise<MigrationExecutionResult> {
    const migration = this.migrations.find(m => m.id === migrationId);
    if (!migration) {
      throw new Error(`Migration ${migrationId} not found`);
    }

    const startTime = Date.now();
    const result: MigrationExecutionResult = {
      migrationId,
      success: false,
      executionTime: 0,
      rollbackAvailable: direction === 'up'
    };

    try {
      // Validate dependencies for up migrations
      if (direction === 'up') {
        await this.validateMigrationDependencies(migration);
      }

      // Execute migration script
      const script = direction === 'up' ? migration.upScript : migration.downScript;
      await this.executeMigrationScript(script);

      // Record migration execution
      if (direction === 'up') {
        await this.recordMigrationExecution(migration);
      } else {
        await this.removeMigrationRecord(migration);
      }

      result.success = true;
      result.executionTime = Date.now() - startTime;

    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : String(error);
      result.executionTime = Date.now() - startTime;
    }

    this.executionHistory.push(result);
    return result;
  }

  /**
   * Execute all pending migrations
   */
  async executeAllMigrations(): Promise<MigrationExecutionResult[]> {
    const results: MigrationExecutionResult[] = [];
    const executedMigrations = await this.getExecutedMigrations();

    for (const migration of this.migrations) {
      if (!executedMigrations.includes(migration.id)) {
        const result = await this.executeMigration(migration.id, 'up');
        results.push(result);

        if (!result.success) {
          console.error(`Migration ${migration.id} failed:`, result.error);
          break; // Stop on first failure
        }
      }
    }

    return results;
  }

  /**
   * Rollback migration
   */
  async rollbackMigration(migrationId: string): Promise<MigrationExecutionResult> {
    return this.executeMigration(migrationId, 'down');
  }

  /**
   * Get database schema definition
   */
  getDatabaseSchema(): DatabaseSchema {
    return {
      tables: [
        {
          name: 'users',
          columns: [
            { name: 'id', type: 'INTEGER', nullable: false },
            { name: 'email', type: 'VARCHAR(255)', nullable: false, unique: true },
            { name: 'name', type: 'VARCHAR(255)', nullable: false },
            { name: 'google_id', type: 'VARCHAR(255)', nullable: false, unique: true },
            { name: 'created_at', type: 'TIMESTAMP', nullable: false },
            { name: 'updated_at', type: 'TIMESTAMP', nullable: false }
          ],
          primaryKey: ['id'],
          foreignKeys: []
        },
        {
          name: 'projects',
          columns: [
            { name: 'id', type: 'INTEGER', nullable: false },
            { name: 'user_id', type: 'INTEGER', nullable: false },
            { name: 'name', type: 'VARCHAR(255)', nullable: false },
            { name: 'description', type: 'TEXT', nullable: true },
            { name: 'device_type', type: 'VARCHAR(255)', nullable: true },
            { name: 'intended_use', type: 'TEXT', nullable: true },
            { name: 'status', type: 'VARCHAR(50)', nullable: false, defaultValue: 'draft' },
            { name: 'created_at', type: 'TIMESTAMP', nullable: false },
            { name: 'updated_at', type: 'TIMESTAMP', nullable: false }
          ],
          primaryKey: ['id'],
          foreignKeys: [
            {
              name: 'fk_projects_user_id',
              columns: ['user_id'],
              referencedTable: 'users',
              referencedColumns: ['id'],
              onDelete: 'cascade',
              onUpdate: 'cascade'
            }
          ]
        },
        {
          name: 'device_classifications',
          columns: [
            { name: 'id', type: 'INTEGER', nullable: false },
            { name: 'project_id', type: 'INTEGER', nullable: false },
            { name: 'device_class', type: 'VARCHAR(10)', nullable: true },
            { name: 'product_code', type: 'VARCHAR(10)', nullable: true },
            { name: 'regulatory_pathway', type: 'VARCHAR(50)', nullable: true },
            { name: 'cfr_sections', type: 'JSON', nullable: true },
            { name: 'confidence_score', type: 'REAL', nullable: true },
            { name: 'reasoning', type: 'TEXT', nullable: true },
            { name: 'sources', type: 'JSON', nullable: true },
            { name: 'created_at', type: 'TIMESTAMP', nullable: false },
            { name: 'updated_at', type: 'TIMESTAMP', nullable: false }
          ],
          primaryKey: ['id'],
          foreignKeys: [
            {
              name: 'fk_device_classifications_project_id',
              columns: ['project_id'],
              referencedTable: 'projects',
              referencedColumns: ['id'],
              onDelete: 'cascade',
              onUpdate: 'cascade'
            }
          ]
        },
        {
          name: 'predicate_devices',
          columns: [
            { name: 'id', type: 'INTEGER', nullable: false },
            { name: 'project_id', type: 'INTEGER', nullable: false },
            { name: 'k_number', type: 'VARCHAR(20)', nullable: false },
            { name: 'device_name', type: 'VARCHAR(500)', nullable: true },
            { name: 'intended_use', type: 'TEXT', nullable: true },
            { name: 'product_code', type: 'VARCHAR(10)', nullable: true },
            { name: 'clearance_date', type: 'DATE', nullable: true },
            { name: 'confidence_score', type: 'REAL', nullable: true },
            { name: 'comparison_data', type: 'JSON', nullable: true },
            { name: 'is_selected', type: 'BOOLEAN', nullable: false, defaultValue: 'FALSE' },
            { name: 'created_at', type: 'TIMESTAMP', nullable: false },
            { name: 'updated_at', type: 'TIMESTAMP', nullable: false }
          ],
          primaryKey: ['id'],
          foreignKeys: [
            {
              name: 'fk_predicate_devices_project_id',
              columns: ['project_id'],
              referencedTable: 'projects',
              referencedColumns: ['id'],
              onDelete: 'cascade',
              onUpdate: 'cascade'
            }
          ]
        },
        {
          name: 'agent_interactions',
          columns: [
            { name: 'id', type: 'INTEGER', nullable: false },
            { name: 'project_id', type: 'INTEGER', nullable: false },
            { name: 'user_id', type: 'INTEGER', nullable: false },
            { name: 'agent_action', type: 'VARCHAR(255)', nullable: false },
            { name: 'input_data', type: 'JSON', nullable: true },
            { name: 'output_data', type: 'JSON', nullable: true },
            { name: 'confidence_score', type: 'REAL', nullable: true },
            { name: 'sources', type: 'JSON', nullable: true },
            { name: 'reasoning', type: 'TEXT', nullable: true },
            { name: 'execution_time_ms', type: 'INTEGER', nullable: true },
            { name: 'created_at', type: 'TIMESTAMP', nullable: false },
            { name: 'updated_at', type: 'TIMESTAMP', nullable: false }
          ],
          primaryKey: ['id'],
          foreignKeys: [
            {
              name: 'fk_agent_interactions_project_id',
              columns: ['project_id'],
              referencedTable: 'projects',
              referencedColumns: ['id'],
              onDelete: 'cascade',
              onUpdate: 'cascade'
            },
            {
              name: 'fk_agent_interactions_user_id',
              columns: ['user_id'],
              referencedTable: 'users',
              referencedColumns: ['id'],
              onDelete: 'cascade',
              onUpdate: 'cascade'
            }
          ]
        }
      ],
      indexes: [
        { name: 'idx_users_email', table: 'users', columns: ['email'], unique: true, type: 'btree' },
        { name: 'idx_users_google_id', table: 'users', columns: ['google_id'], unique: true, type: 'btree' },
        { name: 'idx_projects_user_id', table: 'projects', columns: ['user_id'], unique: false, type: 'btree' },
        { name: 'idx_projects_status', table: 'projects', columns: ['status'], unique: false, type: 'btree' },
        { name: 'idx_device_classifications_project_id', table: 'device_classifications', columns: ['project_id'], unique: false, type: 'btree' },
        { name: 'idx_predicate_devices_project_id', table: 'predicate_devices', columns: ['project_id'], unique: false, type: 'btree' },
        { name: 'idx_predicate_devices_k_number', table: 'predicate_devices', columns: ['k_number'], unique: false, type: 'btree' },
        { name: 'idx_agent_interactions_project_id', table: 'agent_interactions', columns: ['project_id'], unique: false, type: 'btree' },
        { name: 'idx_agent_interactions_user_id', table: 'agent_interactions', columns: ['user_id'], unique: false, type: 'btree' }
      ],
      constraints: [
        {
          name: 'chk_confidence_score',
          table: 'device_classifications',
          type: 'check',
          definition: 'confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)'
        },
        {
          name: 'chk_predicate_confidence_score',
          table: 'predicate_devices',
          type: 'check',
          definition: 'confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)'
        },
        {
          name: 'chk_agent_confidence_score',
          table: 'agent_interactions',
          type: 'check',
          definition: 'confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 1)'
        }
      ],
      triggers: [
        {
          name: 'trigger_users_updated_at',
          table: 'users',
          event: 'update',
          timing: 'after',
          function: 'UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id'
        },
        {
          name: 'trigger_projects_updated_at',
          table: 'projects',
          event: 'update',
          timing: 'after',
          function: 'UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id'
        }
      ]
    };
  }

  /**
   * Calculate checksum for migration
   */
  private calculateChecksum(content: string): string {
    // Simple checksum calculation (in real implementation, would use proper hashing)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Validate migration dependencies
   */
  private async validateMigrationDependencies(migration: DatabaseMigration): Promise<void> {
    const executedMigrations = await this.getExecutedMigrations();
    
    for (const dependency of migration.dependencies) {
      if (!executedMigrations.includes(dependency)) {
        throw new Error(`Migration dependency ${dependency} not satisfied for ${migration.id}`);
      }
    }
  }

  /**
   * Execute migration script (simulated)
   */
  private async executeMigrationScript(script: string): Promise<void> {
    console.log('Executing migration script...');
    // In real implementation, would execute SQL script against database
    // const statements = script.split(';').filter(s => s.trim());
    // for (const statement of statements) {
    //   await this.executeSQL(statement);
    // }
  }

  /**
   * Record migration execution (simulated)
   */
  private async recordMigrationExecution(migration: DatabaseMigration): Promise<void> {
    console.log(`Recording migration execution: ${migration.id}`);
    // In real implementation, would insert into migrations table
    migration.executedAt = new Date().toISOString();
  }

  /**
   * Remove migration record (simulated)
   */
  private async removeMigrationRecord(migration: DatabaseMigration): Promise<void> {
    console.log(`Removing migration record: ${migration.id}`);
    // In real implementation, would delete from migrations table
    migration.executedAt = undefined;
  }

  /**
   * Get executed migrations (simulated)
   */
  private async getExecutedMigrations(): Promise<string[]> {
    // In real implementation, would query migrations table
    return this.migrations
      .filter(m => m.executedAt)
      .map(m => m.id);
  }

  /**
   * Get all migrations
   */
  getAllMigrations(): DatabaseMigration[] {
    return [...this.migrations];
  }

  /**
   * Get migration execution history
   */
  getExecutionHistory(): MigrationExecutionResult[] {
    return [...this.executionHistory];
  }
}

export default DatabaseMigrationManager;