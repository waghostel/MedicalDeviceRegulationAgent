/**
 * Test database utilities for setup, seeding, and cleanup
 * Provides in-memory SQLite database for testing
 */

import { Database } from 'sqlite3';
import {
  DatabaseSeed,
  generateDatabaseSeed,
  TestScenario,
  generateTestScenario,
} from '@/lib/mock-data';

// Test database interface
export interface TestDatabase {
  db: Database;
  connectionString: string;
  isConnected: boolean;
}

// Database configuration for testing
export interface TestDatabaseConfig {
  inMemory: boolean;
  verbose: boolean;
  filename?: string;
  timeout?: number;
}

// Global test database instance
let testDatabase: TestDatabase | null = null;

/**
 * Setup test database with schema
 */
export const setupTestDatabase = async (
  config: TestDatabaseConfig = { inMemory: true, verbose: false }
): Promise<TestDatabase> => {
  const connectionString = config.inMemory
    ? ':memory:'
    : config.filename || 'test.db';

  return new Promise((resolve, reject) => {
    const db = new Database(connectionString, (err) => {
      if (err) {
        reject(new Error(`Failed to create test database: ${err.message}`));
        return;
      }

      // Enable foreign keys
      db.run('PRAGMA foreign_keys = ON');

      // Create schema
      createTestSchema(db)
        .then(() => {
          testDatabase = {
            db,
            connectionString,
            isConnected: true,
          };
          resolve(testDatabase);
        })
        .catch(reject);
    });

    if (config.verbose) {
      db.on('trace', (sql) => {
        console.log('SQL:', sql);
      });
    }
  });
};

/**
 * Create test database schema
 */
const createTestSchema = async (db: Database): Promise<void> => {
  const schema = `
    -- Users table
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      image TEXT,
      role TEXT DEFAULT 'user',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- Projects table
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      device_type TEXT,
      intended_use TEXT,
      status TEXT DEFAULT 'draft',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Device classifications table
    CREATE TABLE IF NOT EXISTS device_classifications (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      device_class TEXT,
      product_code TEXT,
      regulatory_pathway TEXT,
      cfr_sections TEXT, -- JSON array
      confidence_score REAL,
      reasoning TEXT,
      sources TEXT, -- JSON array
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    -- Predicate devices table
    CREATE TABLE IF NOT EXISTS predicate_devices (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      k_number TEXT NOT NULL,
      device_name TEXT,
      intended_use TEXT,
      product_code TEXT,
      clearance_date TEXT,
      confidence_score REAL,
      comparison_data TEXT, -- JSON
      is_selected BOOLEAN DEFAULT FALSE,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    -- Sessions table
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires TEXT NOT NULL,
      session_token TEXT UNIQUE NOT NULL,
      access_token TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Audit logs table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      project_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      changes TEXT, -- JSON
      metadata TEXT, -- JSON
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (project_id) REFERENCES projects(id)
    );

    -- Agent interactions table
    CREATE TABLE IF NOT EXISTS agent_interactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      agent_action TEXT NOT NULL,
      input_data TEXT, -- JSON
      output_data TEXT, -- JSON
      confidence_score REAL,
      sources TEXT, -- JSON
      reasoning TEXT,
      execution_time_ms INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    -- Indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
    CREATE INDEX IF NOT EXISTS idx_classifications_project_id ON device_classifications(project_id);
    CREATE INDEX IF NOT EXISTS idx_predicates_project_id ON predicate_devices(project_id);
    CREATE INDEX IF NOT EXISTS idx_predicates_k_number ON predicate_devices(k_number);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_project_id ON audit_logs(project_id);
    CREATE INDEX IF NOT EXISTS idx_interactions_project_id ON agent_interactions(project_id);
  `;

  return new Promise((resolve, reject) => {
    db.exec(schema, (err) => {
      if (err) {
        reject(new Error(`Failed to create schema: ${err.message}`));
      } else {
        resolve();
      }
    });
  });
}; /*
 *
 * Seed test database with mock data
 */
export const seedTestDatabase = async (data?: DatabaseSeed): Promise<void> => {
  if (!testDatabase) {
    throw new Error(
      'Test database not initialized. Call setupTestDatabase first.'
    );
  }

  const seedData = data || generateDatabaseSeed();
  const { db } = testDatabase;

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Begin transaction
      db.run('BEGIN TRANSACTION');

      try {
        // Insert users
        const userStmt = db.prepare(`
          INSERT INTO users (id, email, name, image, role, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        seedData.users.forEach((user) => {
          userStmt.run([
            user.id,
            user.email,
            user.name,
            user.image,
            user.role,
            user.createdAt,
            user.updatedAt,
          ]);
        });
        userStmt.finalize();

        // Insert projects
        const projectStmt = db.prepare(`
          INSERT INTO projects (id, user_id, name, description, device_type, intended_use, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        seedData.projects.forEach((project) => {
          projectStmt.run([
            project.id,
            project.user_id,
            project.name,
            project.description,
            project.device_type,
            project.intended_use,
            project.status,
            project.created_at,
            project.updated_at,
          ]);
        });
        projectStmt.finalize();

        // Insert classifications
        const classificationStmt = db.prepare(`
          INSERT INTO device_classifications (id, project_id, device_class, product_code, regulatory_pathway, cfr_sections, confidence_score, reasoning, sources, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        seedData.classifications.forEach((classification) => {
          classificationStmt.run([
            classification.id,
            classification.projectId,
            classification.deviceClass,
            classification.productCode,
            classification.regulatoryPathway,
            JSON.stringify(classification.cfrSections),
            classification.confidenceScore,
            classification.reasoning,
            JSON.stringify(classification.sources),
            classification.createdAt,
            classification.updatedAt,
          ]);
        });
        classificationStmt.finalize();

        // Insert predicate devices
        const predicateStmt = db.prepare(`
          INSERT INTO predicate_devices (id, project_id, k_number, device_name, intended_use, product_code, clearance_date, confidence_score, comparison_data, is_selected, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        seedData.predicateDevices.forEach((predicate) => {
          predicateStmt.run([
            predicate.id,
            predicate.projectId,
            predicate.kNumber,
            predicate.deviceName,
            predicate.intendedUse,
            predicate.productCode,
            predicate.clearanceDate,
            predicate.confidenceScore,
            JSON.stringify(predicate.comparisonData),
            predicate.isSelected ? 1 : 0,
            predicate.createdAt,
            predicate.updatedAt,
          ]);
        });
        predicateStmt.finalize();

        // Insert sessions
        const sessionStmt = db.prepare(`
          INSERT INTO sessions (id, user_id, expires, session_token, access_token, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        seedData.sessions.forEach((session) => {
          sessionStmt.run([
            session.id,
            session.userId,
            session.expires,
            session.sessionToken,
            session.accessToken,
            session.createdAt,
            session.updatedAt,
          ]);
        });
        sessionStmt.finalize();

        // Insert audit logs
        const auditStmt = db.prepare(`
          INSERT INTO audit_logs (id, user_id, project_id, action, entity_type, entity_id, changes, metadata, ip_address, user_agent, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        seedData.auditLogs.forEach((log) => {
          auditStmt.run([
            log.id,
            log.userId,
            log.projectId,
            log.action,
            log.entityType,
            log.entityId,
            JSON.stringify(log.changes),
            JSON.stringify(log.metadata),
            log.ipAddress,
            log.userAgent,
            log.createdAt,
          ]);
        });
        auditStmt.finalize();

        // Insert agent interactions
        const interactionStmt = db.prepare(`
          INSERT INTO agent_interactions (id, project_id, user_id, agent_action, input_data, output_data, confidence_score, sources, reasoning, execution_time_ms, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        seedData.agentInteractions.forEach((interaction) => {
          interactionStmt.run([
            interaction.id,
            interaction.project_id,
            interaction.user_id,
            interaction.agent_action,
            JSON.stringify(interaction.input_data),
            JSON.stringify(interaction.output_data),
            interaction.confidence_score,
            JSON.stringify(interaction.sources),
            interaction.reasoning,
            interaction.execution_time_ms,
            interaction.created_at,
          ]);
        });
        interactionStmt.finalize();

        // Commit transaction
        db.run('COMMIT', (err) => {
          if (err) {
            reject(new Error(`Failed to seed database: ${err.message}`));
          } else {
            resolve();
          }
        });
      } catch (error) {
        // Rollback on error
        db.run('ROLLBACK');
        reject(error);
      }
    });
  });
};

/**
 * Seed database with scenario-specific data
 */
export const seedScenarioDatabase = async (
  scenario: TestScenario
): Promise<void> => {
  const scenarioData = generateTestScenario(scenario);
  await seedTestDatabase(scenarioData);
};

/**
 * Clean up test database
 */
export const cleanupTestDatabase = async (): Promise<void> => {
  if (!testDatabase) {
    return;
  }

  const { db } = testDatabase;

  return new Promise((resolve, reject) => {
    // Clear all tables
    const tables = [
      'agent_interactions',
      'audit_logs',
      'sessions',
      'predicate_devices',
      'device_classifications',
      'projects',
      'users',
    ];

    db.serialize(() => {
      db.run('BEGIN TRANSACTION');

      try {
        tables.forEach((table) => {
          db.run(`DELETE FROM ${table}`);
        });

        db.run('COMMIT', (err) => {
          if (err) {
            reject(new Error(`Failed to cleanup database: ${err.message}`));
          } else {
            resolve();
          }
        });
      } catch (error) {
        db.run('ROLLBACK');
        reject(error);
      }
    });
  });
};

/**
 * Close test database connection
 */
export const closeTestDatabase = async (): Promise<void> => {
  if (!testDatabase) {
    return;
  }

  return new Promise((resolve, reject) => {
    testDatabase!.db.close((err) => {
      if (err) {
        reject(new Error(`Failed to close database: ${err.message}`));
      } else {
        testDatabase = null;
        resolve();
      }
    });
  });
};

/**
 * Get current test database instance
 */
export const getTestDatabase = (): TestDatabase | null => {
  return testDatabase;
};

/**
 * Execute raw SQL query on test database
 */
export const executeQuery = async (
  sql: string,
  params: any[] = []
): Promise<any[]> => {
  if (!testDatabase) {
    throw new Error('Test database not initialized');
  }

  return new Promise((resolve, reject) => {
    testDatabase!.db.all(sql, params, (err, rows) => {
      if (err) {
        reject(new Error(`Query failed: ${err.message}`));
      } else {
        resolve(rows);
      }
    });
  });
};

/**
 * Validate data integrity in test database
 */
export const validateDataIntegrity = async (): Promise<{
  valid: boolean;
  errors: string[];
}> => {
  if (!testDatabase) {
    return { valid: false, errors: ['Database not initialized'] };
  }

  const errors: string[] = [];

  try {
    // Check foreign key constraints
    const fkViolations = await executeQuery('PRAGMA foreign_key_check');
    if (fkViolations.length > 0) {
      errors.push(`Foreign key violations: ${fkViolations.length}`);
    }

    // Check for orphaned records
    const orphanedProjects = await executeQuery(`
      SELECT COUNT(*) as count FROM projects 
      WHERE user_id NOT IN (SELECT id FROM users)
    `);
    if (orphanedProjects[0]?.count > 0) {
      errors.push(`Orphaned projects: ${orphanedProjects[0].count}`);
    }

    // Check for invalid JSON data
    const invalidJson = await executeQuery(`
      SELECT COUNT(*) as count FROM device_classifications 
      WHERE cfr_sections IS NOT NULL AND json_valid(cfr_sections) = 0
    `);
    if (invalidJson[0]?.count > 0) {
      errors.push(`Invalid JSON in classifications: ${invalidJson[0].count}`);
    }
  } catch (error) {
    errors.push(`Integrity check failed: ${error}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

// Export database utilities
export const databaseUtils = {
  setupTestDatabase,
  seedTestDatabase,
  seedScenarioDatabase,
  cleanupTestDatabase,
  closeTestDatabase,
  getTestDatabase,
  executeQuery,
  validateDataIntegrity,
};

export default databaseUtils;
