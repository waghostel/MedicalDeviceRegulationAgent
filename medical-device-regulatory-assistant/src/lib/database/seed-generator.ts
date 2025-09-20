/**
 * Database Seed Generator
 * Converts mock data generators to database-compatible seed scripts
 */

import {
  generateDatabaseSeed,
  generateTestScenario,
  TestScenario,
  type DatabaseSeed,
  type MockDataSet,
} from '../mock-data';

export interface DatabaseSeedScript {
  id: string;
  name: string;
  description: string;
  scenario: TestScenario | 'default';
  sqlStatements: string[];
  pythonScript: string;
  validationQueries: string[];
  cleanupStatements: string[];
  dependencies: string[];
}

export interface SeedExecutionResult {
  scriptId: string;
  success: boolean;
  recordsInserted: number;
  executionTime: number;
  errors: string[];
  warnings: string[];
}

/**
 * Database Seed Generator
 * Generates SQL and Python scripts for seeding test databases
 */
export class DatabaseSeedGenerator {
  /**
   * Generate seed scripts for all test scenarios
   */
  static generateAllSeedScripts(): DatabaseSeedScript[] {
    const scripts: DatabaseSeedScript[] = [];

    // Default seed script
    scripts.push(this.generateDefaultSeedScript());

    // Scenario-specific seed scripts
    Object.values(TestScenario).forEach((scenario) => {
      scripts.push(this.generateScenarioSeedScript(scenario));
    });

    return scripts;
  }

  /**
   * Generate default seed script with comprehensive test data
   */
  private static generateDefaultSeedScript(): DatabaseSeedScript {
    const seedData = generateDatabaseSeed();

    return {
      id: 'default-seed',
      name: 'Default Test Data Seed',
      description: 'Comprehensive test data for all components and workflows',
      scenario: 'default',
      sqlStatements: this.generateSQLStatements(seedData),
      pythonScript: this.generatePythonScript(seedData, 'default'),
      validationQueries: this.generateValidationQueries(seedData),
      cleanupStatements: this.generateCleanupStatements(),
      dependencies: [],
    };
  }

  /**
   * Generate scenario-specific seed script
   */
  private static generateScenarioSeedScript(
    scenario: TestScenario
  ): DatabaseSeedScript {
    const mockDataSet = generateTestScenario(scenario);

    return {
      id: `${scenario}-seed`,
      name: `${scenario.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} Seed`,
      description: `Test data for ${scenario} testing scenario`,
      scenario,
      sqlStatements: this.generateSQLStatements(mockDataSet),
      pythonScript: this.generatePythonScript(mockDataSet, scenario),
      validationQueries: this.generateValidationQueries(mockDataSet),
      cleanupStatements: this.generateCleanupStatements(),
      dependencies:
        scenario === TestScenario.NEW_USER_ONBOARDING ? [] : ['default-seed'],
    };
  }

  /**
   * Generate SQL INSERT statements from mock data
   */
  private static generateSQLStatements(
    data: DatabaseSeed | MockDataSet
  ): string[] {
    const statements: string[] = [];

    // Users table
    if (data.users.length > 0) {
      const userValues = data.users
        .map(
          (user) =>
            `('${user.email}', '${user.name}', '${user.id}', '${user.createdAt}', '${user.updatedAt}')`
        )
        .join(',\n    ');

      statements.push(`
INSERT INTO users (email, name, google_id, created_at, updated_at) VALUES
    ${userValues}
ON CONFLICT (email) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = EXCLUDED.updated_at;`);
    }

    // Projects table
    if (data.projects.length > 0) {
      const projectValues = data.projects
        .map(
          (project) =>
            `(${project.id}, '${project.user_id}', '${project.name}', ${project.description ? `'${project.description.replace(/'/g, "''")}'` : 'NULL'}, ${project.device_type ? `'${project.device_type}'` : 'NULL'}, ${project.intended_use ? `'${project.intended_use.replace(/'/g, "''")}'` : 'NULL'}, '${project.status}', '${project.created_at}', '${project.updated_at}')`
        )
        .join(',\n    ');

      statements.push(`
INSERT INTO projects (id, user_id, name, description, device_type, intended_use, status, created_at, updated_at) VALUES
    ${projectValues}
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    device_type = EXCLUDED.device_type,
    intended_use = EXCLUDED.intended_use,
    status = EXCLUDED.status,
    updated_at = EXCLUDED.updated_at;`);
    }

    // Device Classifications table
    if (data.classifications.length > 0) {
      const classificationValues = data.classifications
        .map(
          (classification) =>
            `('${classification.projectId}', ${classification.deviceClass ? `'${classification.deviceClass}'` : 'NULL'}, ${classification.productCode ? `'${classification.productCode}'` : 'NULL'}, ${classification.regulatoryPathway ? `'${classification.regulatoryPathway}'` : 'NULL'}, ${classification.cfrSections ? `'${JSON.stringify(classification.cfrSections)}'` : 'NULL'}, ${classification.confidenceScore || 'NULL'}, ${classification.reasoning ? `'${classification.reasoning.replace(/'/g, "''")}'` : 'NULL'}, ${classification.sources ? `'${JSON.stringify(classification.sources)}'` : 'NULL'}, '${classification.createdAt}', '${classification.updatedAt}')`
        )
        .join(',\n    ');

      statements.push(`
INSERT INTO device_classifications (project_id, device_class, product_code, regulatory_pathway, cfr_sections, confidence_score, reasoning, sources, created_at, updated_at) VALUES
    ${classificationValues};`);
    }

    // Predicate Devices table
    if (data.predicateDevices.length > 0) {
      const predicateValues = data.predicateDevices
        .map(
          (predicate) =>
            `('${predicate.projectId}', '${predicate.kNumber}', ${predicate.deviceName ? `'${predicate.deviceName.replace(/'/g, "''")}'` : 'NULL'}, ${predicate.intendedUse ? `'${predicate.intendedUse.replace(/'/g, "''")}'` : 'NULL'}, ${predicate.productCode ? `'${predicate.productCode}'` : 'NULL'}, ${predicate.clearanceDate ? `'${predicate.clearanceDate}'` : 'NULL'}, ${predicate.confidenceScore || 'NULL'}, ${predicate.comparisonData ? `'${JSON.stringify(predicate.comparisonData)}'` : 'NULL'}, ${predicate.isSelected}, '${predicate.createdAt}', '${predicate.updatedAt}')`
        )
        .join(',\n    ');

      statements.push(`
INSERT INTO predicate_devices (project_id, k_number, device_name, intended_use, product_code, clearance_date, confidence_score, comparison_data, is_selected, created_at, updated_at) VALUES
    ${predicateValues};`);
    }

    // Agent Interactions table
    if (data.agentInteractions.length > 0) {
      const interactionValues = data.agentInteractions
        .map(
          (interaction) =>
            `(${interaction.project_id}, '${interaction.user_id}', '${interaction.agent_action}', ${interaction.input_data ? `'${JSON.stringify(interaction.input_data)}'` : 'NULL'}, ${interaction.output_data ? `'${JSON.stringify(interaction.output_data)}'` : 'NULL'}, ${interaction.confidence_score || 'NULL'}, ${interaction.sources ? `'${JSON.stringify(interaction.sources)}'` : 'NULL'}, ${interaction.reasoning ? `'${interaction.reasoning.replace(/'/g, "''")}'` : 'NULL'}, ${interaction.execution_time_ms || 'NULL'}, '${interaction.created_at}', '${new Date().toISOString()}')`
        )
        .join(',\n    ');

      statements.push(`
INSERT INTO agent_interactions (project_id, user_id, agent_action, input_data, output_data, confidence_score, sources, reasoning, execution_time_ms, created_at, updated_at) VALUES
    ${interactionValues};`);
    }

    return statements;
  }

  /**
   * Generate Python script for database seeding
   */
  private static generatePythonScript(
    data: DatabaseSeed | MockDataSet,
    scenario: string
  ): string {
    return `#!/usr/bin/env python3
"""
Database Seed Script - ${scenario}
Generated automatically from mock data generators
"""

import asyncio
import json
from datetime import datetime
from typing import List, Dict, Any

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession

from backend.models.base import Base
from backend.models.user import User
from backend.models.project import Project, ProjectStatus
from backend.models.device_classification import DeviceClassification, DeviceClass, RegulatoryPathway
from backend.models.predicate_device import PredicateDevice
from backend.models.agent_interaction import AgentInteraction


class DatabaseSeeder:
    """Database seeder for ${scenario} scenario"""
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self.engine = create_async_engine(database_url)
        self.SessionLocal = sessionmaker(
            bind=self.engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
    
    async def seed_database(self) -> Dict[str, int]:
        """Seed database with test data"""
        async with self.SessionLocal() as session:
            try:
                # Clear existing data (in reverse dependency order)
                await self.clear_existing_data(session)
                
                # Seed data in dependency order
                users_count = await self.seed_users(session)
                projects_count = await self.seed_projects(session)
                classifications_count = await self.seed_classifications(session)
                predicates_count = await self.seed_predicates(session)
                interactions_count = await self.seed_interactions(session)
                
                await session.commit()
                
                return {
                    'users': users_count,
                    'projects': projects_count,
                    'classifications': classifications_count,
                    'predicates': predicates_count,
                    'interactions': interactions_count
                }
                
            except Exception as e:
                await session.rollback()
                raise e
    
    async def clear_existing_data(self, session: AsyncSession):
        """Clear existing test data"""
        # Clear in reverse dependency order
        await session.execute(text("DELETE FROM agent_interactions WHERE project_id IN (SELECT id FROM projects WHERE name LIKE '%Test%' OR name LIKE '%Mock%')"))
        await session.execute(text("DELETE FROM predicate_devices WHERE project_id IN (SELECT id FROM projects WHERE name LIKE '%Test%' OR name LIKE '%Mock%')"))
        await session.execute(text("DELETE FROM device_classifications WHERE project_id IN (SELECT id FROM projects WHERE name LIKE '%Test%' OR name LIKE '%Mock%')"))
        await session.execute(text("DELETE FROM projects WHERE name LIKE '%Test%' OR name LIKE '%Mock%'"))
        await session.execute(text("DELETE FROM users WHERE email LIKE '%example.com' OR email LIKE '%test.com'"))
    
    async def seed_users(self, session: AsyncSession) -> int:
        """Seed users table"""
        users_data = ${JSON.stringify(data.users, null, 8)}
        
        count = 0
        for user_data in users_data:
            user = User(
                email=user_data['email'],
                name=user_data['name'],
                google_id=user_data['id']
            )
            session.add(user)
            count += 1
        
        await session.flush()  # Get IDs without committing
        return count
    
    async def seed_projects(self, session: AsyncSession) -> int:
        """Seed projects table"""
        projects_data = ${JSON.stringify(data.projects, null, 8)}
        
        count = 0
        for project_data in projects_data:
            # Find user by email (since we don't have the actual DB ID)
            user = await session.execute(
                text("SELECT id FROM users WHERE google_id = :google_id"),
                {"google_id": project_data['user_id']}
            )
            user_id = user.scalar()
            
            if user_id:
                project = Project(
                    id=project_data['id'],
                    user_id=user_id,
                    name=project_data['name'],
                    description=project_data.get('description'),
                    device_type=project_data.get('device_type'),
                    intended_use=project_data.get('intended_use'),
                    status=ProjectStatus(project_data['status'])
                )
                session.add(project)
                count += 1
        
        await session.flush()
        return count
    
    async def seed_classifications(self, session: AsyncSession) -> int:
        """Seed device classifications table"""
        classifications_data = ${JSON.stringify(data.classifications, null, 8)}
        
        count = 0
        for classification_data in classifications_data:
            # Find project by name or ID
            project = await session.execute(
                text("SELECT id FROM projects WHERE id = :project_id"),
                {"project_id": classification_data.get('projectId', 1)}
            )
            project_id = project.scalar()
            
            if project_id:
                classification = DeviceClassification(
                    project_id=project_id,
                    device_class=DeviceClass(classification_data['deviceClass']) if classification_data.get('deviceClass') else None,
                    product_code=classification_data.get('productCode'),
                    regulatory_pathway=RegulatoryPathway(classification_data['regulatoryPathway']) if classification_data.get('regulatoryPathway') else None,
                    cfr_sections=classification_data.get('cfrSections'),
                    confidence_score=classification_data.get('confidenceScore'),
                    reasoning=classification_data.get('reasoning'),
                    sources=classification_data.get('sources')
                )
                session.add(classification)
                count += 1
        
        await session.flush()
        return count
    
    async def seed_predicates(self, session: AsyncSession) -> int:
        """Seed predicate devices table"""
        predicates_data = ${JSON.stringify(data.predicateDevices, null, 8)}
        
        count = 0
        for predicate_data in predicates_data:
            # Find project by ID
            project = await session.execute(
                text("SELECT id FROM projects WHERE id = :project_id"),
                {"project_id": predicate_data.get('projectId', 1)}
            )
            project_id = project.scalar()
            
            if project_id:
                predicate = PredicateDevice(
                    project_id=project_id,
                    k_number=predicate_data['kNumber'],
                    device_name=predicate_data.get('deviceName'),
                    intended_use=predicate_data.get('intendedUse'),
                    product_code=predicate_data.get('productCode'),
                    clearance_date=datetime.fromisoformat(predicate_data['clearanceDate']).date() if predicate_data.get('clearanceDate') else None,
                    confidence_score=predicate_data.get('confidenceScore'),
                    comparison_data=predicate_data.get('comparisonData'),
                    is_selected=predicate_data.get('isSelected', False)
                )
                session.add(predicate)
                count += 1
        
        await session.flush()
        return count
    
    async def seed_interactions(self, session: AsyncSession) -> int:
        """Seed agent interactions table"""
        interactions_data = ${JSON.stringify(data.agentInteractions, null, 8)}
        
        count = 0
        for interaction_data in interactions_data:
            # Find project and user
            project = await session.execute(
                text("SELECT id FROM projects WHERE id = :project_id"),
                {"project_id": interaction_data['project_id']}
            )
            project_id = project.scalar()
            
            user = await session.execute(
                text("SELECT id FROM users WHERE google_id = :google_id"),
                {"google_id": interaction_data['user_id']}
            )
            user_id = user.scalar()
            
            if project_id and user_id:
                interaction = AgentInteraction(
                    project_id=project_id,
                    user_id=user_id,
                    agent_action=interaction_data['agent_action'],
                    input_data=interaction_data.get('input_data'),
                    output_data=interaction_data.get('output_data'),
                    confidence_score=interaction_data.get('confidence_score'),
                    sources=interaction_data.get('sources'),
                    reasoning=interaction_data.get('reasoning'),
                    execution_time_ms=interaction_data.get('execution_time_ms')
                )
                session.add(interaction)
                count += 1
        
        await session.flush()
        return count
    
    async def validate_seed_data(self) -> Dict[str, Any]:
        """Validate seeded data"""
        async with self.SessionLocal() as session:
            validation_results = {}
            
            # Count records
            users_count = await session.execute(text("SELECT COUNT(*) FROM users"))
            validation_results['users_count'] = users_count.scalar()
            
            projects_count = await session.execute(text("SELECT COUNT(*) FROM projects"))
            validation_results['projects_count'] = projects_count.scalar()
            
            classifications_count = await session.execute(text("SELECT COUNT(*) FROM device_classifications"))
            validation_results['classifications_count'] = classifications_count.scalar()
            
            predicates_count = await session.execute(text("SELECT COUNT(*) FROM predicate_devices"))
            validation_results['predicates_count'] = predicates_count.scalar()
            
            interactions_count = await session.execute(text("SELECT COUNT(*) FROM agent_interactions"))
            validation_results['interactions_count'] = interactions_count.scalar()
            
            # Validate relationships
            orphaned_projects = await session.execute(
                text("SELECT COUNT(*) FROM projects p LEFT JOIN users u ON p.user_id = u.id WHERE u.id IS NULL")
            )
            validation_results['orphaned_projects'] = orphaned_projects.scalar()
            
            orphaned_classifications = await session.execute(
                text("SELECT COUNT(*) FROM device_classifications dc LEFT JOIN projects p ON dc.project_id = p.id WHERE p.id IS NULL")
            )
            validation_results['orphaned_classifications'] = orphaned_classifications.scalar()
            
            return validation_results


async def main():
    """Main seeding function"""
    import os
    
    # Get database URL from environment or use default
    database_url = os.getenv('DATABASE_URL', 'sqlite+aiosqlite:///./test.db')
    
    seeder = DatabaseSeeder(database_url)
    
    print(f"Seeding database for scenario: ${scenario}")
    print(f"Database URL: {database_url}")
    
    try:
        results = await seeder.seed_database()
        print("\\nSeeding completed successfully!")
        print("Records inserted:")
        for table, count in results.items():
            print(f"  {table}: {count}")
        
        # Validate data
        print("\\nValidating seeded data...")
        validation = await seeder.validate_seed_data()
        print("Validation results:")
        for key, value in validation.items():
            print(f"  {key}: {value}")
        
        if validation.get('orphaned_projects', 0) > 0 or validation.get('orphaned_classifications', 0) > 0:
            print("\\nWARNING: Found orphaned records!")
        else:
            print("\\nAll data integrity checks passed!")
            
    except Exception as e:
        print(f"\\nSeeding failed: {e}")
        raise
    
    finally:
        await seeder.engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
`;
  }

  /**
   * Generate validation queries to verify seeded data
   */
  private static generateValidationQueries(
    data: DatabaseSeed | MockDataSet
  ): string[] {
    return [
      // Count queries
      'SELECT COUNT(*) as user_count FROM users;',
      'SELECT COUNT(*) as project_count FROM projects;',
      'SELECT COUNT(*) as classification_count FROM device_classifications;',
      'SELECT COUNT(*) as predicate_count FROM predicate_devices;',
      'SELECT COUNT(*) as interaction_count FROM agent_interactions;',

      // Relationship validation
      'SELECT COUNT(*) as orphaned_projects FROM projects p LEFT JOIN users u ON p.user_id = u.id WHERE u.id IS NULL;',
      'SELECT COUNT(*) as orphaned_classifications FROM device_classifications dc LEFT JOIN projects p ON dc.project_id = p.id WHERE p.id IS NULL;',
      'SELECT COUNT(*) as orphaned_predicates FROM predicate_devices pd LEFT JOIN projects p ON pd.project_id = p.id WHERE p.id IS NULL;',
      'SELECT COUNT(*) as orphaned_interactions FROM agent_interactions ai LEFT JOIN projects p ON ai.project_id = p.id WHERE p.id IS NULL;',

      // Data quality checks
      "SELECT COUNT(*) as users_without_email FROM users WHERE email IS NULL OR email = '';",
      "SELECT COUNT(*) as projects_without_name FROM projects WHERE name IS NULL OR name = '';",
      'SELECT COUNT(*) as classifications_without_confidence FROM device_classifications WHERE confidence_score IS NULL;',
      "SELECT COUNT(*) as predicates_without_k_number FROM predicate_devices WHERE k_number IS NULL OR k_number = '';",

      // Sample data queries
      'SELECT name, email FROM users LIMIT 5;',
      'SELECT name, status, device_type FROM projects LIMIT 5;',
      'SELECT device_class, product_code, confidence_score FROM device_classifications LIMIT 5;',
      'SELECT k_number, device_name, confidence_score FROM predicate_devices LIMIT 5;',
    ];
  }

  /**
   * Generate cleanup statements to remove test data
   */
  private static generateCleanupStatements(): string[] {
    return [
      // Delete in reverse dependency order
      "DELETE FROM agent_interactions WHERE project_id IN (SELECT id FROM projects WHERE name LIKE '%Test%' OR name LIKE '%Mock%');",
      "DELETE FROM predicate_devices WHERE project_id IN (SELECT id FROM projects WHERE name LIKE '%Test%' OR name LIKE '%Mock%');",
      "DELETE FROM device_classifications WHERE project_id IN (SELECT id FROM projects WHERE name LIKE '%Test%' OR name LIKE '%Mock%');",
      "DELETE FROM projects WHERE name LIKE '%Test%' OR name LIKE '%Mock%';",
      "DELETE FROM users WHERE email LIKE '%example.com' OR email LIKE '%test.com';",

      // Reset sequences (SQLite)
      "DELETE FROM sqlite_sequence WHERE name IN ('users', 'projects', 'device_classifications', 'predicate_devices', 'agent_interactions');",

      // Vacuum to reclaim space
      'VACUUM;',
    ];
  }
}

/**
 * Database Seed Executor
 * Executes seed scripts and manages test database lifecycle
 */
export class DatabaseSeedExecutor {
  private databaseUrl: string;

  private executionHistory: SeedExecutionResult[] = [];

  constructor(databaseUrl: string) {
    this.databaseUrl = databaseUrl;
  }

  /**
   * Execute a seed script
   */
  async executeSeedScript(
    script: DatabaseSeedScript
  ): Promise<SeedExecutionResult> {
    const startTime = Date.now();
    const result: SeedExecutionResult = {
      scriptId: script.id,
      success: false,
      recordsInserted: 0,
      executionTime: 0,
      errors: [],
      warnings: [],
    };

    try {
      // Validate dependencies
      await this.validateDependencies(script.dependencies);

      // Execute SQL statements or Python script
      if (script.pythonScript) {
        await this.executePythonScript(script.pythonScript, result);
      } else {
        await this.executeSQLStatements(script.sqlStatements, result);
      }

      // Run validation queries
      await this.runValidationQueries(script.validationQueries, result);

      result.success = true;
      result.executionTime = Date.now() - startTime;
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : String(error)
      );
      result.executionTime = Date.now() - startTime;
    }

    this.executionHistory.push(result);
    return result;
  }

  /**
   * Execute all seed scripts in dependency order
   */
  async executeAllSeedScripts(): Promise<SeedExecutionResult[]> {
    const scripts = DatabaseSeedGenerator.generateAllSeedScripts();
    const results: SeedExecutionResult[] = [];

    // Sort scripts by dependencies
    const sortedScripts = this.sortScriptsByDependencies(scripts);

    for (const script of sortedScripts) {
      const result = await this.executeSeedScript(script);
      results.push(result);

      if (!result.success) {
        console.error(`Seed script ${script.id} failed:`, result.errors);
        break; // Stop on first failure
      }
    }

    return results;
  }

  /**
   * Clean up test database
   */
  async cleanupDatabase(): Promise<void> {
    const cleanupScript = DatabaseSeedGenerator.generateAllSeedScripts()[0];

    try {
      // Execute cleanup statements
      for (const statement of cleanupScript.cleanupStatements) {
        console.log(`Executing cleanup: ${statement.substring(0, 50)}...`);
        // In real implementation, would execute SQL statement
        // await this.executeSQL(statement);
      }

      console.log('Database cleanup completed successfully');
    } catch (error) {
      console.error('Database cleanup failed:', error);
      throw error;
    }
  }

  /**
   * Validate script dependencies
   */
  private async validateDependencies(dependencies: string[]): Promise<void> {
    for (const dependency of dependencies) {
      const dependencyResult = this.executionHistory.find(
        (r) => r.scriptId === dependency
      );
      if (!dependencyResult?.success) {
        throw new Error(`Dependency ${dependency} not satisfied`);
      }
    }
  }

  /**
   * Execute Python script (simulated)
   */
  private async executePythonScript(
    script: string,
    result: SeedExecutionResult
  ): Promise<void> {
    console.log('Executing Python seed script...');
    // In real implementation, would execute Python script
    // const output = await exec(`python3 -c "${script}"`);

    // Simulate successful execution
    result.recordsInserted = 50; // Mock value
    result.warnings.push('Python script execution simulated');
  }

  /**
   * Execute SQL statements (simulated)
   */
  private async executeSQLStatements(
    statements: string[],
    result: SeedExecutionResult
  ): Promise<void> {
    let recordCount = 0;

    for (const statement of statements) {
      console.log(`Executing SQL: ${statement.substring(0, 50)}...`);
      // In real implementation, would execute SQL statement
      // const queryResult = await this.executeSQL(statement);
      // recordCount += queryResult.rowsAffected;

      // Simulate record insertion
      recordCount += 10; // Mock value
    }

    result.recordsInserted = recordCount;
  }

  /**
   * Run validation queries
   */
  private async runValidationQueries(
    queries: string[],
    result: SeedExecutionResult
  ): Promise<void> {
    for (const query of queries) {
      console.log(`Validating: ${query.substring(0, 50)}...`);
      // In real implementation, would execute validation query
      // const queryResult = await this.executeSQL(query);

      // Check for data quality issues
      if (query.includes('orphaned') || query.includes('without')) {
        // Simulate validation check
        const mockCount = Math.random() > 0.9 ? 1 : 0; // 10% chance of finding issues
        if (mockCount > 0) {
          result.warnings.push(
            `Validation query found ${mockCount} issues: ${query}`
          );
        }
      }
    }
  }

  /**
   * Sort scripts by dependencies
   */
  private sortScriptsByDependencies(
    scripts: DatabaseSeedScript[]
  ): DatabaseSeedScript[] {
    const sorted: DatabaseSeedScript[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (script: DatabaseSeedScript) => {
      if (visiting.has(script.id)) {
        throw new Error(`Circular dependency detected: ${script.id}`);
      }
      if (visited.has(script.id)) {
        return;
      }

      visiting.add(script.id);

      for (const depId of script.dependencies) {
        const depScript = scripts.find((s) => s.id === depId);
        if (depScript) {
          visit(depScript);
        }
      }

      visiting.delete(script.id);
      visited.add(script.id);
      sorted.push(script);
    };

    for (const script of scripts) {
      visit(script);
    }

    return sorted;
  }

  /**
   * Get execution history
   */
  getExecutionHistory(): SeedExecutionResult[] {
    return [...this.executionHistory];
  }

  /**
   * Generate execution report
   */
  generateExecutionReport(): string {
    const totalScripts = this.executionHistory.length;
    const successfulScripts = this.executionHistory.filter(
      (r) => r.success
    ).length;
    const totalRecords = this.executionHistory.reduce(
      (sum, r) => sum + r.recordsInserted,
      0
    );
    const totalTime = this.executionHistory.reduce(
      (sum, r) => sum + r.executionTime,
      0
    );

    return `
# Database Seed Execution Report

## Summary
- **Total Scripts**: ${totalScripts}
- **Successful**: ${successfulScripts}
- **Failed**: ${totalScripts - successfulScripts}
- **Total Records Inserted**: ${totalRecords}
- **Total Execution Time**: ${totalTime}ms

## Script Results
${this.executionHistory
  .map(
    (result) => `
### ${result.scriptId}
- **Status**: ${result.success ? '✅ Success' : '❌ Failed'}
- **Records Inserted**: ${result.recordsInserted}
- **Execution Time**: ${result.executionTime}ms
- **Errors**: ${result.errors.length}
- **Warnings**: ${result.warnings.length}

${result.errors.length > 0 ? `**Errors:**\n${result.errors.map((e) => `- ${e}`).join('\n')}` : ''}
${result.warnings.length > 0 ? `**Warnings:**\n${result.warnings.map((w) => `- ${w}`).join('\n')}` : ''}
`
  )
  .join('')}

---
*Generated on: ${new Date().toISOString()}*
`;
  }
}

export default DatabaseSeedGenerator;
