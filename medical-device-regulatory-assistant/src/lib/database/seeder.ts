/**
 * Database Seeder
 * Converts mock data to database seed scripts and manages test data
 */

import {
  Project,
  DeviceClassification,
  PredicateDevice,
  AgentInteraction,
  ProjectDocument,
} from '@/types/project';

import {
  DatabaseSeed,
  MockDataGenerator,
  TestScenario,
} from '../mock-data/generators';

export interface SeedingOptions {
  environment: 'development' | 'testing' | 'staging';
  clearExisting: boolean;
  scenario?: TestScenario;
  customSeed?: DatabaseSeed;
  batchSize?: number;
}

export interface SeedingResult {
  success: boolean;
  recordsCreated: SeedingStats;
  errors: SeedingError[];
  duration: number; // milliseconds
  timestamp: string;
}

export interface SeedingStats {
  users: number;
  projects: number;
  classifications: number;
  predicateDevices: number;
  documents: number;
  interactions: number;
  citations: number;
  total: number;
}

export interface SeedingError {
  table: string;
  record: any;
  error: string;
  timestamp: string;
}

export interface DatabaseConnection {
  execute(sql: string, params?: any[]): Promise<any>;
  transaction<T>(callback: (tx: DatabaseTransaction) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

export interface DatabaseTransaction {
  execute(sql: string, params?: any[]): Promise<any>;
}

/**
 * Database Seeder
 * Manages seeding of test and development data
 */
export class DatabaseSeeder {
  private connection: DatabaseConnection;

  private generator: MockDataGenerator;

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
    this.generator = new MockDataGenerator();
  }

  /**
   * Seed database with mock data
   */
  async seedDatabase(options: SeedingOptions): Promise<SeedingResult> {
    const startTime = Date.now();
    const errors: SeedingError[] = [];
    const stats: SeedingStats = {
      users: 0,
      projects: 0,
      classifications: 0,
      predicateDevices: 0,
      documents: 0,
      interactions: 0,
      citations: 0,
      total: 0,
    };

    try {
      // Generate or use provided seed data
      const seedData =
        options.customSeed ||
        (options.scenario
          ? this.generator.generateTestScenario(options.scenario)
          : this.generator.generateDatabaseSeed());

      // Clear existing data if requested
      if (options.clearExisting) {
        await this.clearDatabase();
      }

      // Seed data in transaction
      await this.connection.transaction(async (tx) => {
        // Seed users first (referenced by other tables)
        if (seedData.users.length > 0) {
          stats.users = await this.seedUsers(tx, seedData.users, errors);
        }

        // Seed projects (referenced by other tables)
        if (seedData.projects.length > 0) {
          stats.projects = await this.seedProjects(
            tx,
            seedData.projects,
            errors
          );
        }

        // Seed classifications
        if (seedData.classifications.length > 0) {
          stats.classifications = await this.seedClassifications(
            tx,
            seedData.classifications,
            errors
          );
        }

        // Seed predicate devices
        if (seedData.predicateDevices.length > 0) {
          stats.predicateDevices = await this.seedPredicateDevices(
            tx,
            seedData.predicateDevices,
            errors
          );
        }

        // Seed documents
        if (seedData.documents.length > 0) {
          stats.documents = await this.seedDocuments(
            tx,
            seedData.documents,
            errors
          );
        }

        // Seed interactions
        if (seedData.interactions.length > 0) {
          stats.interactions = await this.seedInteractions(
            tx,
            seedData.interactions,
            errors
          );
        }

        // Citations are embedded in interactions, so we count them separately
        stats.citations = seedData.citations.length;
      });

      stats.total =
        stats.users +
        stats.projects +
        stats.classifications +
        stats.predicateDevices +
        stats.documents +
        stats.interactions;

      const duration = Date.now() - startTime;

      return {
        success: errors.length === 0,
        recordsCreated: stats,
        errors,
        duration,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        success: false,
        recordsCreated: stats,
        errors: [
          {
            table: 'general',
            record: null,
            error: String(error),
            timestamp: new Date().toISOString(),
          },
        ],
        duration,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Clear all data from database
   */
  async clearDatabase(): Promise<void> {
    const tables = [
      'agent_interactions',
      'project_documents',
      'predicate_devices',
      'device_classifications',
      'projects',
      'users',
    ];

    await this.connection.transaction(async (tx) => {
      // Disable foreign key constraints temporarily
      await tx.execute('PRAGMA foreign_keys = OFF');

      // Clear tables in reverse dependency order
      for (const table of tables) {
        await tx.execute(`DELETE FROM ${table}`);
      }

      // Re-enable foreign key constraints
      await tx.execute('PRAGMA foreign_keys = ON');
    });
  }

  /**
   * Seed users table
   */
  private async seedUsers(
    tx: DatabaseTransaction,
    users: any[],
    errors: SeedingError[]
  ): Promise<number> {
    let count = 0;

    const sql = `
      INSERT INTO users (id, email, name, role, created_at, last_login)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    for (const user of users) {
      try {
        await tx.execute(sql, [
          user.id,
          user.email,
          user.name,
          user.role,
          user.created_at,
          user.last_login,
        ]);
        count++;
      } catch (error) {
        errors.push({
          table: 'users',
          record: user,
          error: String(error),
          timestamp: new Date().toISOString(),
        });
      }
    }

    return count;
  }

  /**
   * Seed projects table
   */
  private async seedProjects(
    tx: DatabaseTransaction,
    projects: Project[],
    errors: SeedingError[]
  ): Promise<number> {
    let count = 0;

    const sql = `
      INSERT INTO projects (id, user_id, name, description, device_type, intended_use, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const project of projects) {
      try {
        await tx.execute(sql, [
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
        count++;
      } catch (error) {
        errors.push({
          table: 'projects',
          record: project,
          error: String(error),
          timestamp: new Date().toISOString(),
        });
      }
    }

    return count;
  }

  /**
   * Seed device classifications table
   */
  private async seedClassifications(
    tx: DatabaseTransaction,
    classifications: DeviceClassification[],
    errors: SeedingError[]
  ): Promise<number> {
    let count = 0;

    const sql = `
      INSERT INTO device_classifications (
        id, project_id, device_class, product_code, regulatory_pathway,
        cfr_sections, confidence_score, reasoning, sources, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const classification of classifications) {
      try {
        await tx.execute(sql, [
          classification.id,
          classification.project_id,
          classification.device_class,
          classification.product_code,
          classification.regulatory_pathway,
          JSON.stringify(classification.cfr_sections),
          classification.confidence_score,
          classification.reasoning,
          JSON.stringify(classification.sources),
          classification.created_at,
        ]);
        count++;
      } catch (error) {
        errors.push({
          table: 'device_classifications',
          record: classification,
          error: String(error),
          timestamp: new Date().toISOString(),
        });
      }
    }

    return count;
  }

  /**
   * Seed predicate devices table
   */
  private async seedPredicateDevices(
    tx: DatabaseTransaction,
    predicateDevices: PredicateDevice[],
    errors: SeedingError[]
  ): Promise<number> {
    let count = 0;

    const sql = `
      INSERT INTO predicate_devices (
        id, project_id, k_number, device_name, intended_use, product_code,
        clearance_date, confidence_score, comparison_data, is_selected, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const predicate of predicateDevices) {
      try {
        await tx.execute(sql, [
          predicate.id,
          predicate.project_id,
          predicate.k_number,
          predicate.device_name,
          predicate.intended_use,
          predicate.product_code,
          predicate.clearance_date,
          predicate.confidence_score,
          JSON.stringify(predicate.comparison_data),
          predicate.is_selected ? 1 : 0,
          predicate.created_at,
        ]);
        count++;
      } catch (error) {
        errors.push({
          table: 'predicate_devices',
          record: predicate,
          error: String(error),
          timestamp: new Date().toISOString(),
        });
      }
    }

    return count;
  }

  /**
   * Seed project documents table
   */
  private async seedDocuments(
    tx: DatabaseTransaction,
    documents: ProjectDocument[],
    errors: SeedingError[]
  ): Promise<number> {
    let count = 0;

    const sql = `
      INSERT INTO project_documents (
        id, project_id, filename, file_path, document_type,
        content_markdown, metadata, created_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const document of documents) {
      try {
        await tx.execute(sql, [
          document.id,
          document.project_id,
          document.filename,
          document.file_path,
          document.document_type,
          document.content_markdown,
          JSON.stringify(document.metadata),
          document.created_at,
          document.updated_at,
        ]);
        count++;
      } catch (error) {
        errors.push({
          table: 'project_documents',
          record: document,
          error: String(error),
          timestamp: new Date().toISOString(),
        });
      }
    }

    return count;
  }

  /**
   * Seed agent interactions table
   */
  private async seedInteractions(
    tx: DatabaseTransaction,
    interactions: AgentInteraction[],
    errors: SeedingError[]
  ): Promise<number> {
    let count = 0;

    const sql = `
      INSERT INTO agent_interactions (
        id, project_id, user_id, agent_action, input_data, output_data,
        confidence_score, sources, reasoning, execution_time_ms, created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const interaction of interactions) {
      try {
        await tx.execute(sql, [
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
        count++;
      } catch (error) {
        errors.push({
          table: 'agent_interactions',
          record: interaction,
          error: String(error),
          timestamp: new Date().toISOString(),
        });
      }
    }

    return count;
  }

  /**
   * Create database schema if it doesn't exist
   */
  async createSchema(): Promise<void> {
    const schemaSql = `
      -- Users table
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        role TEXT,
        created_at TEXT NOT NULL,
        last_login TEXT
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
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- Device classifications table
      CREATE TABLE IF NOT EXISTS device_classifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        device_class TEXT,
        product_code TEXT,
        regulatory_pathway TEXT,
        cfr_sections TEXT, -- JSON array
        confidence_score REAL,
        reasoning TEXT,
        sources TEXT, -- JSON array
        created_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      -- Predicate devices table
      CREATE TABLE IF NOT EXISTS predicate_devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        k_number TEXT NOT NULL,
        device_name TEXT,
        intended_use TEXT,
        product_code TEXT,
        clearance_date TEXT,
        confidence_score REAL,
        comparison_data TEXT, -- JSON object
        is_selected INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      -- Project documents table
      CREATE TABLE IF NOT EXISTS project_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        filename TEXT NOT NULL,
        file_path TEXT NOT NULL,
        document_type TEXT,
        content_markdown TEXT,
        metadata TEXT, -- JSON object
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      -- Agent interactions table
      CREATE TABLE IF NOT EXISTS agent_interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        agent_action TEXT NOT NULL,
        input_data TEXT NOT NULL, -- JSON object
        output_data TEXT NOT NULL, -- JSON object
        confidence_score REAL,
        sources TEXT, -- JSON array
        reasoning TEXT,
        execution_time_ms INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

      -- Indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
      CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
      CREATE INDEX IF NOT EXISTS idx_classifications_project_id ON device_classifications(project_id);
      CREATE INDEX IF NOT EXISTS idx_predicates_project_id ON predicate_devices(project_id);
      CREATE INDEX IF NOT EXISTS idx_predicates_k_number ON predicate_devices(k_number);
      CREATE INDEX IF NOT EXISTS idx_documents_project_id ON project_documents(project_id);
      CREATE INDEX IF NOT EXISTS idx_interactions_project_id ON agent_interactions(project_id);
      CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON agent_interactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_interactions_created_at ON agent_interactions(created_at);
    `;

    // Execute schema creation
    const statements = schemaSql.split(';').filter((stmt) => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        await this.connection.execute(statement.trim());
      }
    }
  }

  /**
   * Validate database schema matches expected structure
   */
  async validateSchema(): Promise<{ valid: boolean; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check if all required tables exist
      const requiredTables = [
        'users',
        'projects',
        'device_classifications',
        'predicate_devices',
        'project_documents',
        'agent_interactions',
      ];

      for (const table of requiredTables) {
        try {
          await this.connection.execute(`SELECT 1 FROM ${table} LIMIT 1`);
        } catch (error) {
          issues.push(`Table '${table}' does not exist or is not accessible`);
        }
      }

      // Check foreign key constraints are enabled
      const fkResult = await this.connection.execute('PRAGMA foreign_keys');
      if (!fkResult || fkResult[0]?.foreign_keys !== 1) {
        issues.push('Foreign key constraints are not enabled');
      }

      return {
        valid: issues.length === 0,
        issues,
      };
    } catch (error) {
      return {
        valid: false,
        issues: [`Schema validation failed: ${error}`],
      };
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<SeedingStats> {
    const stats: SeedingStats = {
      users: 0,
      projects: 0,
      classifications: 0,
      predicateDevices: 0,
      documents: 0,
      interactions: 0,
      citations: 0,
      total: 0,
    };

    try {
      const tables = [
        { name: 'users', key: 'users' },
        { name: 'projects', key: 'projects' },
        { name: 'device_classifications', key: 'classifications' },
        { name: 'predicate_devices', key: 'predicateDevices' },
        { name: 'project_documents', key: 'documents' },
        { name: 'agent_interactions', key: 'interactions' },
      ];

      for (const table of tables) {
        try {
          const result = await this.connection.execute(
            `SELECT COUNT(*) as count FROM ${table.name}`
          );
          const count = result[0]?.count || 0;
          (stats as any)[table.key] = count;
          stats.total += count;
        } catch (error) {
          console.warn(`Failed to get count for table ${table.name}:`, error);
        }
      }

      // Count citations from interactions
      try {
        const result = await this.connection.execute(`
          SELECT SUM(json_array_length(sources)) as citation_count 
          FROM agent_interactions 
          WHERE sources IS NOT NULL AND sources != 'null'
        `);
        stats.citations = result[0]?.citation_count || 0;
      } catch (error) {
        console.warn('Failed to count citations:', error);
      }
    } catch (error) {
      console.error('Failed to get database stats:', error);
    }

    return stats;
  }

  /**
   * Export database data as seed file
   */
  async exportSeedData(): Promise<DatabaseSeed> {
    const seed: DatabaseSeed = {
      users: [],
      projects: [],
      classifications: [],
      predicateDevices: [],
      documents: [],
      interactions: [],
      citations: [],
    };

    try {
      // Export users
      const users = await this.connection.execute(
        'SELECT * FROM users ORDER BY created_at'
      );
      seed.users = users || [];

      // Export projects
      const projects = await this.connection.execute(
        'SELECT * FROM projects ORDER BY created_at'
      );
      seed.projects = projects || [];

      // Export classifications
      const classifications = await this.connection.execute(
        'SELECT * FROM device_classifications ORDER BY created_at'
      );
      seed.classifications = (classifications || []).map((c: any) => ({
        ...c,
        cfr_sections: c.cfr_sections ? JSON.parse(c.cfr_sections) : [],
        sources: c.sources ? JSON.parse(c.sources) : [],
      }));

      // Export predicate devices
      const predicates = await this.connection.execute(
        'SELECT * FROM predicate_devices ORDER BY created_at'
      );
      seed.predicateDevices = (predicates || []).map((p: any) => ({
        ...p,
        comparison_data: p.comparison_data
          ? JSON.parse(p.comparison_data)
          : null,
        is_selected: Boolean(p.is_selected),
      }));

      // Export documents
      const documents = await this.connection.execute(
        'SELECT * FROM project_documents ORDER BY created_at'
      );
      seed.documents = (documents || []).map((d: any) => ({
        ...d,
        metadata: d.metadata ? JSON.parse(d.metadata) : {},
      }));

      // Export interactions
      const interactions = await this.connection.execute(
        'SELECT * FROM agent_interactions ORDER BY created_at'
      );
      seed.interactions = (interactions || []).map((i: any) => ({
        ...i,
        input_data: i.input_data ? JSON.parse(i.input_data) : {},
        output_data: i.output_data ? JSON.parse(i.output_data) : {},
        sources: i.sources ? JSON.parse(i.sources) : [],
      }));

      // Extract citations from interactions
      seed.citations = seed.interactions.flatMap((i) => i.sources || []);
    } catch (error) {
      console.error('Failed to export seed data:', error);
      throw error;
    }

    return seed;
  }
}

/**
 * SQLite Database Connection Implementation
 */
export class SQLiteConnection implements DatabaseConnection {
  private db: any; // Would be actual SQLite connection in real implementation

  constructor(dbPath: string) {
    // In real implementation, this would initialize SQLite connection
    console.log(`Initializing SQLite connection to: ${dbPath}`);
  }

  async execute(sql: string, params?: any[]): Promise<any> {
    // Simulate database execution
    console.log(
      `Executing SQL: ${sql}`,
      params ? `with params: ${JSON.stringify(params)}` : ''
    );

    // Return mock results for different query types
    if (sql.includes('SELECT COUNT(*)')) {
      return [{ count: Math.floor(Math.random() * 100) }];
    }

    if (sql.includes('SELECT') && sql.includes('FROM')) {
      return []; // Return empty array for SELECT queries
    }

    return { changes: 1, lastInsertRowid: Math.floor(Math.random() * 1000) };
  }

  async transaction<T>(
    callback: (tx: DatabaseTransaction) => Promise<T>
  ): Promise<T> {
    // Simulate transaction
    const tx: DatabaseTransaction = {
      execute: this.execute.bind(this),
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
    console.log('Database connection closed');
  }
}

/**
 * Export utility functions for database seeding
 */
export async function seedTestDatabase(
  connection: DatabaseConnection,
  scenario?: TestScenario,
  options?: Partial<SeedingOptions>
): Promise<SeedingResult> {
  const seeder = new DatabaseSeeder(connection);

  return await seeder.seedDatabase({
    environment: 'testing',
    clearExisting: true,
    scenario,
    ...options,
  });
}

export async function createTestDatabase(
  dbPath: string = ':memory:'
): Promise<DatabaseConnection> {
  const connection = new SQLiteConnection(dbPath);
  const seeder = new DatabaseSeeder(connection);

  // Create schema
  await seeder.createSchema();

  // Validate schema
  const validation = await seeder.validateSchema();
  if (!validation.valid) {
    throw new Error(
      `Schema validation failed: ${validation.issues.join(', ')}`
    );
  }

  return connection;
}

export async function setupTestDatabaseWithSeed(
  scenario: TestScenario = TestScenario.EXISTING_PROJECT_WORKFLOW,
  dbPath: string = ':memory:'
): Promise<{ connection: DatabaseConnection; seedResult: SeedingResult }> {
  const connection = await createTestDatabase(dbPath);
  const seedResult = await seedTestDatabase(connection, scenario);

  return { connection, seedResult };
}
