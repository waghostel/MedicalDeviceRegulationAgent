/**
 * Data Integrity Validation System
 * Validates data consistency between mock data and database schema
 */

import { DatabaseConnection } from './seeder';
import { DatabaseSeed } from '../mock-data/generators';
import { 
  Project, 
  DeviceClassification, 
  PredicateDevice, 
  AgentInteraction,
  ProjectDocument 
} from '@/types/project';

export interface IntegrityValidationResult {
  valid: boolean;
  summary: ValidationSummary;
  violations: IntegrityViolation[];
  recommendations: IntegrityRecommendation[];
  timestamp: string;
}

export interface ValidationSummary {
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  criticalIssues: number;
  score: number; // 0-100
}

export interface IntegrityViolation {
  id: string;
  type: ViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  table: string;
  column?: string;
  recordId?: string | number;
  description: string;
  expectedValue?: any;
  actualValue?: any;
  constraint: string;
  impact: string;
}

export enum ViolationType {
  FOREIGN_KEY_VIOLATION = 'foreign_key_violation',
  NULL_CONSTRAINT_VIOLATION = 'null_constraint_violation',
  UNIQUE_CONSTRAINT_VIOLATION = 'unique_constraint_violation',
  CHECK_CONSTRAINT_VIOLATION = 'check_constraint_violation',
  DATA_TYPE_MISMATCH = 'data_type_mismatch',
  RANGE_VIOLATION = 'range_violation',
  FORMAT_VIOLATION = 'format_violation',
  BUSINESS_RULE_VIOLATION = 'business_rule_violation',
  ORPHANED_RECORD = 'orphaned_record',
  MISSING_REQUIRED_DATA = 'missing_required_data'
}

export interface IntegrityRecommendation {
  type: 'fix' | 'warning' | 'optimization';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  actions: string[];
  sqlFix?: string;
  impact: string;
}

export interface ValidationRule {
  id: string;
  name: string;
  description: string;
  type: ViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  table: string;
  column?: string;
  constraint: string;
  validationSql: string;
  fixSql?: string;
  enabled: boolean;
}

export interface SchemaValidation {
  table: string;
  expectedSchema: TableSchema;
  actualSchema?: TableSchema;
  issues: SchemaIssue[];
}

export interface TableSchema {
  name: string;
  columns: ColumnDefinition[];
  constraints: ConstraintDefinition[];
  indexes: IndexDefinition[];
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: string;
  primaryKey: boolean;
  foreignKey?: ForeignKeyDefinition;
}

export interface ConstraintDefinition {
  name: string;
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK' | 'NOT NULL';
  columns: string[];
  definition: string;
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface ForeignKeyDefinition {
  referencedTable: string;
  referencedColumn: string;
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT';
}

export interface SchemaIssue {
  type: 'missing_table' | 'missing_column' | 'type_mismatch' | 'missing_constraint' | 'missing_index';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  expected?: string;
  actual?: string;
}

/**
 * Data Integrity Validator
 * Validates data integrity and consistency
 */
export class DataIntegrityValidator {
  private connection: DatabaseConnection;
  private rules: Map<string, ValidationRule> = new Map();

  constructor(connection: DatabaseConnection) {
    this.connection = connection;
    this.initializeValidationRules();
  }

  /**
   * Initialize built-in validation rules
   */
  private initializeValidationRules(): void {
    // Foreign key validation rules
    this.addRule({
      id: 'fk_projects_user_id',
      name: 'Projects User ID Foreign Key',
      description: 'Validate that all projects reference valid users',
      type: ViolationType.FOREIGN_KEY_VIOLATION,
      severity: 'critical',
      table: 'projects',
      column: 'user_id',
      constraint: 'FOREIGN KEY (user_id) REFERENCES users(id)',
      validationSql: `
        SELECT p.id, p.user_id 
        FROM projects p 
        LEFT JOIN users u ON p.user_id = u.id 
        WHERE u.id IS NULL
      `,
      fixSql: `DELETE FROM projects WHERE user_id NOT IN (SELECT id FROM users)`,
      enabled: true
    });

    this.addRule({
      id: 'fk_classifications_project_id',
      name: 'Classifications Project ID Foreign Key',
      description: 'Validate that all classifications reference valid projects',
      type: ViolationType.FOREIGN_KEY_VIOLATION,
      severity: 'critical',
      table: 'device_classifications',
      column: 'project_id',
      constraint: 'FOREIGN KEY (project_id) REFERENCES projects(id)',
      validationSql: `
        SELECT dc.id, dc.project_id 
        FROM device_classifications dc 
        LEFT JOIN projects p ON dc.project_id = p.id 
        WHERE p.id IS NULL
      `,
      fixSql: `DELETE FROM device_classifications WHERE project_id NOT IN (SELECT id FROM projects)`,
      enabled: true
    });

    // Data type and range validation rules
    this.addRule({
      id: 'confidence_score_range',
      name: 'Confidence Score Range',
      description: 'Validate that confidence scores are between 0 and 1',
      type: ViolationType.RANGE_VIOLATION,
      severity: 'high',
      table: 'device_classifications',
      column: 'confidence_score',
      constraint: 'CHECK (confidence_score >= 0 AND confidence_score <= 1)',
      validationSql: `
        SELECT id, confidence_score 
        FROM device_classifications 
        WHERE confidence_score < 0 OR confidence_score > 1
      `,
      fixSql: `
        UPDATE device_classifications 
        SET confidence_score = CASE 
          WHEN confidence_score < 0 THEN 0 
          WHEN confidence_score > 1 THEN 1 
          ELSE confidence_score 
        END
      `,
      enabled: true
    });

    this.addRule({
      id: 'predicate_confidence_range',
      name: 'Predicate Confidence Score Range',
      description: 'Validate that predicate confidence scores are between 0 and 1',
      type: ViolationType.RANGE_VIOLATION,
      severity: 'high',
      table: 'predicate_devices',
      column: 'confidence_score',
      constraint: 'CHECK (confidence_score >= 0 AND confidence_score <= 1)',
      validationSql: `
        SELECT id, confidence_score 
        FROM predicate_devices 
        WHERE confidence_score < 0 OR confidence_score > 1
      `,
      enabled: true
    });

    // Business rule validation
    this.addRule({
      id: 'valid_device_class',
      name: 'Valid Device Class',
      description: 'Validate that device class is I, II, or III',
      type: ViolationType.CHECK_CONSTRAINT_VIOLATION,
      severity: 'high',
      table: 'device_classifications',
      column: 'device_class',
      constraint: 'CHECK (device_class IN ("I", "II", "III"))',
      validationSql: `
        SELECT id, device_class 
        FROM device_classifications 
        WHERE device_class NOT IN ('I', 'II', 'III')
      `,
      enabled: true
    });

    this.addRule({
      id: 'valid_project_status',
      name: 'Valid Project Status',
      description: 'Validate that project status is valid',
      type: ViolationType.CHECK_CONSTRAINT_VIOLATION,
      severity: 'medium',
      table: 'projects',
      column: 'status',
      constraint: 'CHECK (status IN ("draft", "in_progress", "completed"))',
      validationSql: `
        SELECT id, status 
        FROM projects 
        WHERE status NOT IN ('draft', 'in_progress', 'completed')
      `,
      enabled: true
    });

    // Required data validation
    this.addRule({
      id: 'required_project_name',
      name: 'Required Project Name',
      description: 'Validate that all projects have names',
      type: ViolationType.NULL_CONSTRAINT_VIOLATION,
      severity: 'critical',
      table: 'projects',
      column: 'name',
      constraint: 'NOT NULL',
      validationSql: `
        SELECT id FROM projects WHERE name IS NULL OR name = ''
      `,
      enabled: true
    });

    this.addRule({
      id: 'required_user_email',
      name: 'Required User Email',
      description: 'Validate that all users have email addresses',
      type: ViolationType.NULL_CONSTRAINT_VIOLATION,
      severity: 'critical',
      table: 'users',
      column: 'email',
      constraint: 'NOT NULL',
      validationSql: `
        SELECT id FROM users WHERE email IS NULL OR email = ''
      `,
      enabled: true
    });

    // Format validation
    this.addRule({
      id: 'email_format',
      name: 'Email Format',
      description: 'Validate email format',
      type: ViolationType.FORMAT_VIOLATION,
      severity: 'medium',
      table: 'users',
      column: 'email',
      constraint: 'Valid email format',
      validationSql: `
        SELECT id, email 
        FROM users 
        WHERE email NOT LIKE '%@%.%'
      `,
      enabled: true
    });

    this.addRule({
      id: 'k_number_format',
      name: 'K-Number Format',
      description: 'Validate K-number format (K followed by 6 digits)',
      type: ViolationType.FORMAT_VIOLATION,
      severity: 'medium',
      table: 'predicate_devices',
      column: 'k_number',
      constraint: 'K-number format: K######',
      validationSql: `
        SELECT id, k_number 
        FROM predicate_devices 
        WHERE k_number NOT GLOB 'K[0-9][0-9][0-9][0-9][0-9][0-9]'
      `,
      enabled: true
    });

    // Orphaned records
    this.addRule({
      id: 'orphaned_classifications',
      name: 'Orphaned Classifications',
      description: 'Find classifications without projects',
      type: ViolationType.ORPHANED_RECORD,
      severity: 'high',
      table: 'device_classifications',
      constraint: 'Must reference existing project',
      validationSql: `
        SELECT dc.id, dc.project_id 
        FROM device_classifications dc 
        LEFT JOIN projects p ON dc.project_id = p.id 
        WHERE p.id IS NULL
      `,
      enabled: true
    });
  }

  /**
   * Add validation rule
   */
  addRule(rule: ValidationRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Get validation rule
   */
  getRule(id: string): ValidationRule | undefined {
    return this.rules.get(id);
  }

  /**
   * Get all validation rules
   */
  getRules(): ValidationRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.enabled);
  }

  /**
   * Validate database integrity
   */
  async validateIntegrity(): Promise<IntegrityValidationResult> {
    const startTime = Date.now();
    const violations: IntegrityViolation[] = [];
    const rules = this.getRules();

    // Run all validation rules
    for (const rule of rules) {
      try {
        const ruleViolations = await this.validateRule(rule);
        violations.push(...ruleViolations);
      } catch (error) {
        console.error(`Failed to validate rule ${rule.id}:`, error);
        violations.push({
          id: `rule_error_${rule.id}`,
          type: ViolationType.BUSINESS_RULE_VIOLATION,
          severity: 'critical',
          table: rule.table,
          column: rule.column,
          description: `Validation rule failed: ${error}`,
          constraint: rule.constraint,
          impact: 'Unable to validate data integrity for this rule'
        });
      }
    }

    // Generate summary
    const summary = this.generateSummary(violations, rules.length);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(violations);

    return {
      valid: violations.length === 0,
      summary,
      violations,
      recommendations,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate specific rule
   */
  private async validateRule(rule: ValidationRule): Promise<IntegrityViolation[]> {
    const violations: IntegrityViolation[] = [];
    
    try {
      const results = await this.connection.execute(rule.validationSql);
      
      for (const result of results || []) {
        violations.push({
          id: `${rule.id}_${result.id || Date.now()}`,
          type: rule.type,
          severity: rule.severity,
          table: rule.table,
          column: rule.column,
          recordId: result.id,
          description: `${rule.description}: ${this.formatViolationDetails(rule, result)}`,
          constraint: rule.constraint,
          impact: this.getViolationImpact(rule.type, rule.severity),
          actualValue: rule.column ? result[rule.column] : undefined
        });
      }
    } catch (error) {
      throw new Error(`Rule validation failed: ${error}`);
    }

    return violations;
  }

  /**
   * Format violation details
   */
  private formatViolationDetails(rule: ValidationRule, result: any): string {
    switch (rule.type) {
      case ViolationType.FOREIGN_KEY_VIOLATION:
        return `Record ${result.id} references non-existent ${rule.column}: ${result[rule.column!]}`;
      case ViolationType.RANGE_VIOLATION:
        return `Value ${result[rule.column!]} is outside valid range`;
      case ViolationType.FORMAT_VIOLATION:
        return `Value "${result[rule.column!]}" does not match expected format`;
      case ViolationType.NULL_CONSTRAINT_VIOLATION:
        return `Required field ${rule.column} is null or empty`;
      case ViolationType.CHECK_CONSTRAINT_VIOLATION:
        return `Value "${result[rule.column!]}" violates check constraint`;
      default:
        return `Constraint violation detected`;
    }
  }

  /**
   * Get violation impact description
   */
  private getViolationImpact(type: ViolationType, severity: string): string {
    const impacts = {
      [ViolationType.FOREIGN_KEY_VIOLATION]: {
        critical: 'Data corruption, application crashes, broken relationships',
        high: 'Data inconsistency, potential application errors',
        medium: 'Minor data inconsistency',
        low: 'Minimal impact on functionality'
      },
      [ViolationType.RANGE_VIOLATION]: {
        critical: 'Invalid calculations, system failures',
        high: 'Incorrect business logic, data corruption',
        medium: 'Display issues, minor calculation errors',
        low: 'Cosmetic issues only'
      },
      [ViolationType.FORMAT_VIOLATION]: {
        critical: 'System integration failures',
        high: 'Data processing errors',
        medium: 'Display formatting issues',
        low: 'Minor presentation problems'
      }
    };

    return impacts[type]?.[severity as keyof typeof impacts[ViolationType.FOREIGN_KEY_VIOLATION]] || 
           'Unknown impact';
  }

  /**
   * Generate validation summary
   */
  private generateSummary(violations: IntegrityViolation[], totalChecks: number): ValidationSummary {
    const failed = violations.length;
    const passed = totalChecks - failed;
    const criticalIssues = violations.filter(v => v.severity === 'critical').length;
    const warnings = violations.filter(v => v.severity === 'low' || v.severity === 'medium').length;
    
    // Calculate score (0-100)
    const score = totalChecks > 0 ? Math.round((passed / totalChecks) * 100) : 100;

    return {
      totalChecks,
      passed,
      failed,
      warnings,
      criticalIssues,
      score
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(violations: IntegrityViolation[]): IntegrityRecommendation[] {
    const recommendations: IntegrityRecommendation[] = [];
    
    // Group violations by type
    const violationsByType = new Map<ViolationType, IntegrityViolation[]>();
    for (const violation of violations) {
      if (!violationsByType.has(violation.type)) {
        violationsByType.set(violation.type, []);
      }
      violationsByType.get(violation.type)!.push(violation);
    }

    // Generate recommendations for each type
    for (const [type, typeViolations] of violationsByType) {
      const recommendation = this.generateTypeRecommendation(type, typeViolations);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    // Add general recommendations
    if (violations.length > 0) {
      recommendations.push({
        type: 'warning',
        priority: 'medium',
        title: 'Regular Integrity Monitoring',
        description: 'Set up regular data integrity validation to catch issues early',
        actions: [
          'Schedule automated integrity checks',
          'Set up alerts for critical violations',
          'Create data quality dashboard',
          'Implement data validation in application code'
        ],
        impact: 'Prevents data corruption and maintains system reliability'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * Generate recommendation for specific violation type
   */
  private generateTypeRecommendation(
    type: ViolationType, 
    violations: IntegrityViolation[]
  ): IntegrityRecommendation | null {
    const count = violations.length;
    const maxSeverity = violations.reduce((max, v) => 
      v.severity === 'critical' ? 'critical' : 
      v.severity === 'high' && max !== 'critical' ? 'high' : max, 'low');

    switch (type) {
      case ViolationType.FOREIGN_KEY_VIOLATION:
        return {
          type: 'fix',
          priority: maxSeverity as any,
          title: `Fix Foreign Key Violations (${count} found)`,
          description: 'Foreign key violations can cause data corruption and application errors',
          actions: [
            'Review and fix orphaned records',
            'Ensure proper cascade delete rules',
            'Add foreign key constraints if missing',
            'Validate data before insertion'
          ],
          sqlFix: violations[0] ? this.getRule(violations[0].id.split('_')[0])?.fixSql : undefined,
          impact: 'Critical for data integrity and application stability'
        };

      case ViolationType.RANGE_VIOLATION:
        return {
          type: 'fix',
          priority: maxSeverity as any,
          title: `Fix Range Violations (${count} found)`,
          description: 'Values outside expected ranges can cause calculation errors',
          actions: [
            'Update out-of-range values',
            'Add check constraints to prevent future violations',
            'Implement input validation in application',
            'Review business rules for valid ranges'
          ],
          impact: 'Ensures accurate calculations and business logic'
        };

      case ViolationType.FORMAT_VIOLATION:
        return {
          type: 'fix',
          priority: maxSeverity as any,
          title: `Fix Format Violations (${count} found)`,
          description: 'Invalid formats can cause integration and display issues',
          actions: [
            'Standardize data formats',
            'Implement format validation',
            'Clean up existing invalid data',
            'Add format constraints to database'
          ],
          impact: 'Improves data quality and system integration'
        };

      default:
        return null;
    }
  }

  /**
   * Validate mock data against database schema
   */
  async validateMockDataCompatibility(mockData: DatabaseSeed): Promise<IntegrityValidationResult> {
    const violations: IntegrityViolation[] = [];

    // Validate projects
    for (const project of mockData.projects) {
      const projectViolations = await this.validateProjectData(project);
      violations.push(...projectViolations);
    }

    // Validate classifications
    for (const classification of mockData.classifications) {
      const classificationViolations = await this.validateClassificationData(classification);
      violations.push(...classificationViolations);
    }

    // Validate predicate devices
    for (const predicate of mockData.predicateDevices) {
      const predicateViolations = await this.validatePredicateData(predicate);
      violations.push(...predicateViolations);
    }

    const summary = this.generateSummary(violations, mockData.projects.length + 
      mockData.classifications.length + mockData.predicateDevices.length);
    const recommendations = this.generateRecommendations(violations);

    return {
      valid: violations.length === 0,
      summary,
      violations,
      recommendations,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate project data
   */
  private async validateProjectData(project: Project): Promise<IntegrityViolation[]> {
    const violations: IntegrityViolation[] = [];

    // Required fields
    if (!project.name || project.name.trim() === '') {
      violations.push({
        id: `project_${project.id}_name`,
        type: ViolationType.NULL_CONSTRAINT_VIOLATION,
        severity: 'critical',
        table: 'projects',
        column: 'name',
        recordId: project.id,
        description: 'Project name is required',
        constraint: 'NOT NULL',
        impact: 'Project cannot be displayed or managed properly'
      });
    }

    // Status validation
    const validStatuses = ['draft', 'in_progress', 'completed'];
    if (!validStatuses.includes(project.status)) {
      violations.push({
        id: `project_${project.id}_status`,
        type: ViolationType.CHECK_CONSTRAINT_VIOLATION,
        severity: 'high',
        table: 'projects',
        column: 'status',
        recordId: project.id,
        description: `Invalid project status: ${project.status}`,
        actualValue: project.status,
        constraint: 'CHECK (status IN ("draft", "in_progress", "completed"))',
        impact: 'Project status filtering and workflow will not work correctly'
      });
    }

    return violations;
  }

  /**
   * Validate classification data
   */
  private async validateClassificationData(classification: DeviceClassification): Promise<IntegrityViolation[]> {
    const violations: IntegrityViolation[] = [];

    // Device class validation
    const validClasses = ['I', 'II', 'III'];
    if (classification.device_class && !validClasses.includes(classification.device_class)) {
      violations.push({
        id: `classification_${classification.id}_device_class`,
        type: ViolationType.CHECK_CONSTRAINT_VIOLATION,
        severity: 'high',
        table: 'device_classifications',
        column: 'device_class',
        recordId: classification.id,
        description: `Invalid device class: ${classification.device_class}`,
        actualValue: classification.device_class,
        constraint: 'CHECK (device_class IN ("I", "II", "III"))',
        impact: 'Classification logic and regulatory pathway determination will fail'
      });
    }

    // Confidence score validation
    if (classification.confidence_score !== undefined && 
        (classification.confidence_score < 0 || classification.confidence_score > 1)) {
      violations.push({
        id: `classification_${classification.id}_confidence`,
        type: ViolationType.RANGE_VIOLATION,
        severity: 'high',
        table: 'device_classifications',
        column: 'confidence_score',
        recordId: classification.id,
        description: `Confidence score out of range: ${classification.confidence_score}`,
        actualValue: classification.confidence_score,
        constraint: 'CHECK (confidence_score >= 0 AND confidence_score <= 1)',
        impact: 'Confidence calculations and UI display will be incorrect'
      });
    }

    return violations;
  }

  /**
   * Validate predicate device data
   */
  private async validatePredicateData(predicate: PredicateDevice): Promise<IntegrityViolation[]> {
    const violations: IntegrityViolation[] = [];

    // K-number format validation
    const kNumberPattern = /^K\d{6}$/;
    if (!kNumberPattern.test(predicate.k_number)) {
      violations.push({
        id: `predicate_${predicate.id}_k_number`,
        type: ViolationType.FORMAT_VIOLATION,
        severity: 'medium',
        table: 'predicate_devices',
        column: 'k_number',
        recordId: predicate.id,
        description: `Invalid K-number format: ${predicate.k_number}`,
        actualValue: predicate.k_number,
        constraint: 'K-number format: K######',
        impact: 'FDA database lookups and regulatory references will fail'
      });
    }

    // Confidence score validation
    if (predicate.confidence_score !== undefined && 
        (predicate.confidence_score < 0 || predicate.confidence_score > 1)) {
      violations.push({
        id: `predicate_${predicate.id}_confidence`,
        type: ViolationType.RANGE_VIOLATION,
        severity: 'high',
        table: 'predicate_devices',
        column: 'confidence_score',
        recordId: predicate.id,
        description: `Confidence score out of range: ${predicate.confidence_score}`,
        actualValue: predicate.confidence_score,
        constraint: 'CHECK (confidence_score >= 0 AND confidence_score <= 1)',
        impact: 'Predicate ranking and selection logic will be incorrect'
      });
    }

    return violations;
  }

  /**
   * Fix violations automatically where possible
   */
  async fixViolations(violationIds: string[]): Promise<{ fixed: string[]; failed: string[] }> {
    const fixed: string[] = [];
    const failed: string[] = [];

    for (const violationId of violationIds) {
      try {
        // Extract rule ID from violation ID
        const ruleId = violationId.split('_')[0];
        const rule = this.getRule(ruleId);
        
        if (rule?.fixSql) {
          await this.connection.execute(rule.fixSql);
          fixed.push(violationId);
        } else {
          failed.push(violationId);
        }
      } catch (error) {
        console.error(`Failed to fix violation ${violationId}:`, error);
        failed.push(violationId);
      }
    }

    return { fixed, failed };
  }
}

/**
 * Export utility functions for data integrity validation
 */
export async function validateDatabaseIntegrity(connection: DatabaseConnection): Promise<IntegrityValidationResult> {
  const validator = new DataIntegrityValidator(connection);
  return await validator.validateIntegrity();
}

export async function validateMockDataIntegrity(
  connection: DatabaseConnection, 
  mockData: DatabaseSeed
): Promise<IntegrityValidationResult> {
  const validator = new DataIntegrityValidator(connection);
  return await validator.validateMockDataCompatibility(mockData);
}

export function createCustomValidationRule(
  id: string,
  name: string,
  description: string,
  table: string,
  validationSql: string,
  options?: Partial<ValidationRule>
): ValidationRule {
  return {
    id,
    name,
    description,
    type: ViolationType.BUSINESS_RULE_VIOLATION,
    severity: 'medium',
    table,
    constraint: 'Custom validation rule',
    validationSql,
    enabled: true,
    ...options
  };
}