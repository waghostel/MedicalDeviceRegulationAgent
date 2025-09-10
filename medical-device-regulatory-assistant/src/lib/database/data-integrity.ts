/**
 * Data Integrity Validation System
 * Validates data consistency between mock data and database schema
 */

export interface DataIntegrityRule {
  id: string;
  name: string;
  description: string;
  type: 'schema' | 'constraint' | 'relationship' | 'business' | 'format';
  severity: 'error' | 'warning' | 'info';
  table: string;
  column?: string;
  validationQuery: string;
  expectedResult: any;
  errorMessage: string;
  fixSuggestion: string;
}

export interface DataIntegrityResult {
  ruleId: string;
  passed: boolean;
  actualResult: any;
  expectedResult: any;
  errorMessage?: string;
  affectedRecords: number;
  executionTime: number;
  details: ValidationDetail[];
}

export interface ValidationDetail {
  recordId: any;
  field: string;
  currentValue: any;
  expectedValue?: any;
  issue: string;
}

export interface IntegrityReport {
  timestamp: string;
  databaseInstance: string;
  totalRules: number;
  passedRules: number;
  failedRules: number;
  warningRules: number;
  overallScore: number;
  results: DataIntegrityResult[];
  summary: IntegritySummary;
  recommendations: string[];
}

export interface IntegritySummary {
  schemaIssues: number;
  constraintViolations: number;
  relationshipIssues: number;
  businessRuleViolations: number;
  formatIssues: number;
  criticalIssues: number;
  totalAffectedRecords: number;
}

/**
 * Data Integrity Validator
 * Validates data integrity between mock data and database
 */
export class DataIntegrityValidator {
  private rules: DataIntegrityRule[] = [];

  constructor() {
    this.initializeRules();
  }

  /**
   * Initialize validation rules
   */
  private initializeRules(): void {
    this.rules = [
      // Schema validation rules
      ...this.createSchemaValidationRules(),
      // Constraint validation rules
      ...this.createConstraintValidationRules(),
      // Relationship validation rules
      ...this.createRelationshipValidationRules(),
      // Business rule validation rules
      ...this.createBusinessRuleValidationRules(),
      // Format validation rules
      ...this.createFormatValidationRules()
    ];
  }  /**

   * Create schema validation rules
   */
  private createSchemaValidationRules(): DataIntegrityRule[] {
    return [
      {
        id: 'schema-users-required-fields',
        name: 'Users Required Fields',
        description: 'Validate that all required fields in users table are populated',
        type: 'schema',
        severity: 'error',
        table: 'users',
        validationQuery: 'SELECT COUNT(*) FROM users WHERE email IS NULL OR email = \'\' OR name IS NULL OR name = \'\' OR google_id IS NULL OR google_id = \'\'',
        expectedResult: 0,
        errorMessage: 'Found users with missing required fields',
        fixSuggestion: 'Ensure all users have email, name, and google_id populated'
      },
      {
        id: 'schema-projects-required-fields',
        name: 'Projects Required Fields',
        description: 'Validate that all required fields in projects table are populated',
        type: 'schema',
        severity: 'error',
        table: 'projects',
        validationQuery: 'SELECT COUNT(*) FROM projects WHERE name IS NULL OR name = \'\' OR user_id IS NULL OR status IS NULL',
        expectedResult: 0,
        errorMessage: 'Found projects with missing required fields',
        fixSuggestion: 'Ensure all projects have name, user_id, and status populated'
      },
      {
        id: 'schema-predicate-devices-k-number',
        name: 'Predicate Devices K-Number Format',
        description: 'Validate that all predicate devices have properly formatted K-numbers',
        type: 'schema',
        severity: 'error',
        table: 'predicate_devices',
        validationQuery: 'SELECT COUNT(*) FROM predicate_devices WHERE k_number IS NULL OR k_number = \'\' OR LENGTH(k_number) < 7',
        expectedResult: 0,
        errorMessage: 'Found predicate devices with invalid K-numbers',
        fixSuggestion: 'Ensure all predicate devices have valid K-numbers (format: K######)'
      }
    ];
  }

  /**
   * Create constraint validation rules
   */
  private createConstraintValidationRules(): DataIntegrityRule[] {
    return [
      {
        id: 'constraint-confidence-scores-range',
        name: 'Confidence Scores Range',
        description: 'Validate that confidence scores are within valid range (0-1)',
        type: 'constraint',
        severity: 'error',
        table: 'device_classifications',
        validationQuery: 'SELECT COUNT(*) FROM device_classifications WHERE confidence_score IS NOT NULL AND (confidence_score < 0 OR confidence_score > 1)',
        expectedResult: 0,
        errorMessage: 'Found confidence scores outside valid range (0-1)',
        fixSuggestion: 'Ensure all confidence scores are between 0 and 1'
      },
      {
        id: 'constraint-predicate-confidence-range',
        name: 'Predicate Confidence Scores Range',
        description: 'Validate that predicate confidence scores are within valid range (0-1)',
        type: 'constraint',
        severity: 'error',
        table: 'predicate_devices',
        validationQuery: 'SELECT COUNT(*) FROM predicate_devices WHERE confidence_score IS NOT NULL AND (confidence_score < 0 OR confidence_score > 1)',
        expectedResult: 0,
        errorMessage: 'Found predicate confidence scores outside valid range (0-1)',
        fixSuggestion: 'Ensure all predicate confidence scores are between 0 and 1'
      },
      {
        id: 'constraint-project-status-values',
        name: 'Project Status Values',
        description: 'Validate that project status values are from allowed set',
        type: 'constraint',
        severity: 'error',
        table: 'projects',
        validationQuery: 'SELECT COUNT(*) FROM projects WHERE status NOT IN (\'draft\', \'in_progress\', \'completed\')',
        expectedResult: 0,
        errorMessage: 'Found projects with invalid status values',
        fixSuggestion: 'Ensure project status is one of: draft, in_progress, completed'
      },
      {
        id: 'constraint-device-class-values',
        name: 'Device Class Values',
        description: 'Validate that device class values are from allowed set',
        type: 'constraint',
        severity: 'error',
        table: 'device_classifications',
        validationQuery: 'SELECT COUNT(*) FROM device_classifications WHERE device_class IS NOT NULL AND device_class NOT IN (\'I\', \'II\', \'III\')',
        expectedResult: 0,
        errorMessage: 'Found device classifications with invalid class values',
        fixSuggestion: 'Ensure device class is one of: I, II, III'
      }
    ];
  }

  /**
   * Create relationship validation rules
   */
  private createRelationshipValidationRules(): DataIntegrityRule[] {
    return [
      {
        id: 'relationship-projects-users',
        name: 'Projects-Users Relationship',
        description: 'Validate that all projects reference existing users',
        type: 'relationship',
        severity: 'error',
        table: 'projects',
        validationQuery: 'SELECT COUNT(*) FROM projects p LEFT JOIN users u ON p.user_id = u.id WHERE u.id IS NULL',
        expectedResult: 0,
        errorMessage: 'Found projects referencing non-existent users',
        fixSuggestion: 'Ensure all projects reference valid user IDs'
      },
      {
        id: 'relationship-classifications-projects',
        name: 'Classifications-Projects Relationship',
        description: 'Validate that all device classifications reference existing projects',
        type: 'relationship',
        severity: 'error',
        table: 'device_classifications',
        validationQuery: 'SELECT COUNT(*) FROM device_classifications dc LEFT JOIN projects p ON dc.project_id = p.id WHERE p.id IS NULL',
        expectedResult: 0,
        errorMessage: 'Found device classifications referencing non-existent projects',
        fixSuggestion: 'Ensure all device classifications reference valid project IDs'
      },
      {
        id: 'relationship-predicates-projects',
        name: 'Predicates-Projects Relationship',
        description: 'Validate that all predicate devices reference existing projects',
        type: 'relationship',
        severity: 'error',
        table: 'predicate_devices',
        validationQuery: 'SELECT COUNT(*) FROM predicate_devices pd LEFT JOIN projects p ON pd.project_id = p.id WHERE p.id IS NULL',
        expectedResult: 0,
        errorMessage: 'Found predicate devices referencing non-existent projects',
        fixSuggestion: 'Ensure all predicate devices reference valid project IDs'
      },
      {
        id: 'relationship-interactions-projects',
        name: 'Interactions-Projects Relationship',
        description: 'Validate that all agent interactions reference existing projects',
        type: 'relationship',
        severity: 'error',
        table: 'agent_interactions',
        validationQuery: 'SELECT COUNT(*) FROM agent_interactions ai LEFT JOIN projects p ON ai.project_id = p.id WHERE p.id IS NULL',
        expectedResult: 0,
        errorMessage: 'Found agent interactions referencing non-existent projects',
        fixSuggestion: 'Ensure all agent interactions reference valid project IDs'
      },
      {
        id: 'relationship-interactions-users',
        name: 'Interactions-Users Relationship',
        description: 'Validate that all agent interactions reference existing users',
        type: 'relationship',
        severity: 'error',
        table: 'agent_interactions',
        validationQuery: 'SELECT COUNT(*) FROM agent_interactions ai LEFT JOIN users u ON ai.user_id = u.id WHERE u.id IS NULL',
        expectedResult: 0,
        errorMessage: 'Found agent interactions referencing non-existent users',
        fixSuggestion: 'Ensure all agent interactions reference valid user IDs'
      }
    ];
  }  /
**
   * Create business rule validation rules
   */
  private createBusinessRuleValidationRules(): DataIntegrityRule[] {
    return [
      {
        id: 'business-project-has-classification',
        name: 'Projects Should Have Classifications',
        description: 'Validate that active projects have device classifications',
        type: 'business',
        severity: 'warning',
        table: 'projects',
        validationQuery: 'SELECT COUNT(*) FROM projects p LEFT JOIN device_classifications dc ON p.id = dc.project_id WHERE p.status = \'in_progress\' AND dc.id IS NULL',
        expectedResult: 0,
        errorMessage: 'Found in-progress projects without device classifications',
        fixSuggestion: 'Consider adding device classifications for in-progress projects'
      },
      {
        id: 'business-classification-has-confidence',
        name: 'Classifications Should Have Confidence Scores',
        description: 'Validate that device classifications have confidence scores',
        type: 'business',
        severity: 'warning',
        table: 'device_classifications',
        validationQuery: 'SELECT COUNT(*) FROM device_classifications WHERE confidence_score IS NULL',
        expectedResult: 0,
        errorMessage: 'Found device classifications without confidence scores',
        fixSuggestion: 'Add confidence scores to device classifications'
      },
      {
        id: 'business-predicate-selection-limit',
        name: 'Predicate Selection Limit',
        description: 'Validate that projects don\'t have too many selected predicates',
        type: 'business',
        severity: 'warning',
        table: 'predicate_devices',
        validationQuery: 'SELECT COUNT(*) FROM (SELECT project_id FROM predicate_devices WHERE is_selected = true GROUP BY project_id HAVING COUNT(*) > 5)',
        expectedResult: 0,
        errorMessage: 'Found projects with more than 5 selected predicates',
        fixSuggestion: 'Consider limiting predicate selection to 3-5 devices per project'
      },
      {
        id: 'business-recent-activity',
        name: 'Recent User Activity',
        description: 'Validate that users have recent activity',
        type: 'business',
        severity: 'info',
        table: 'users',
        validationQuery: 'SELECT COUNT(*) FROM users u LEFT JOIN agent_interactions ai ON u.id = ai.user_id WHERE ai.created_at < datetime(\'now\', \'-30 days\') OR ai.id IS NULL',
        expectedResult: 0,
        errorMessage: 'Found users without recent activity',
        fixSuggestion: 'Consider user engagement strategies for inactive users'
      }
    ];
  }

  /**
   * Create format validation rules
   */
  private createFormatValidationRules(): DataIntegrityRule[] {
    return [
      {
        id: 'format-email-validation',
        name: 'Email Format Validation',
        description: 'Validate that user emails are properly formatted',
        type: 'format',
        severity: 'error',
        table: 'users',
        validationQuery: 'SELECT COUNT(*) FROM users WHERE email NOT LIKE \'%@%.%\'',
        expectedResult: 0,
        errorMessage: 'Found users with invalid email formats',
        fixSuggestion: 'Ensure all user emails follow proper email format'
      },
      {
        id: 'format-k-number-pattern',
        name: 'K-Number Pattern Validation',
        description: 'Validate that K-numbers follow FDA format (K followed by 6 digits)',
        type: 'format',
        severity: 'error',
        table: 'predicate_devices',
        validationQuery: 'SELECT COUNT(*) FROM predicate_devices WHERE k_number NOT GLOB \'K[0-9][0-9][0-9][0-9][0-9][0-9]\'',
        expectedResult: 0,
        errorMessage: 'Found K-numbers that don\'t follow FDA format',
        fixSuggestion: 'Ensure K-numbers follow format: K followed by 6 digits'
      },
      {
        id: 'format-product-code-pattern',
        name: 'Product Code Pattern Validation',
        description: 'Validate that product codes are 3-letter uppercase codes',
        type: 'format',
        severity: 'warning',
        table: 'device_classifications',
        validationQuery: 'SELECT COUNT(*) FROM device_classifications WHERE product_code IS NOT NULL AND (LENGTH(product_code) != 3 OR product_code != UPPER(product_code))',
        expectedResult: 0,
        errorMessage: 'Found product codes that don\'t follow FDA format',
        fixSuggestion: 'Ensure product codes are 3-letter uppercase codes'
      },
      {
        id: 'format-json-validity',
        name: 'JSON Field Validity',
        description: 'Validate that JSON fields contain valid JSON',
        type: 'format',
        severity: 'error',
        table: 'device_classifications',
        validationQuery: 'SELECT COUNT(*) FROM device_classifications WHERE cfr_sections IS NOT NULL AND json_valid(cfr_sections) = 0',
        expectedResult: 0,
        errorMessage: 'Found invalid JSON in cfr_sections field',
        fixSuggestion: 'Ensure all JSON fields contain valid JSON data'
      }
    ];
  }  /**

   * Validate data integrity
   */
  async validateDataIntegrity(databaseInstance: string): Promise<IntegrityReport> {
    const startTime = Date.now();
    const results: DataIntegrityResult[] = [];
    
    console.log(`Starting data integrity validation for ${databaseInstance}`);

    // Execute all validation rules
    for (const rule of this.rules) {
      const result = await this.executeValidationRule(rule);
      results.push(result);
    }

    // Generate report
    const report = this.generateIntegrityReport(databaseInstance, results, Date.now() - startTime);
    
    console.log(`Data integrity validation completed in ${report.summary.totalAffectedRecords}ms`);
    return report;
  }

  /**
   * Validate specific rule category
   */
  async validateRuleCategory(category: string, databaseInstance: string): Promise<IntegrityReport> {
    const categoryRules = this.rules.filter(rule => rule.type === category);
    const results: DataIntegrityResult[] = [];

    for (const rule of categoryRules) {
      const result = await this.executeValidationRule(rule);
      results.push(result);
    }

    return this.generateIntegrityReport(databaseInstance, results, 0);
  }

  /**
   * Execute validation rule
   */
  private async executeValidationRule(rule: DataIntegrityRule): Promise<DataIntegrityResult> {
    const startTime = Date.now();
    
    try {
      console.log(`Executing validation rule: ${rule.name}`);
      
      // In real implementation, would execute SQL query
      // const queryResult = await this.executeSQL(rule.validationQuery);
      // const actualResult = queryResult.rows[0][0];
      
      // Simulate query execution
      const actualResult = this.simulateQueryResult(rule);
      
      const passed = this.compareResults(actualResult, rule.expectedResult);
      
      const result: DataIntegrityResult = {
        ruleId: rule.id,
        passed,
        actualResult,
        expectedResult: rule.expectedResult,
        affectedRecords: passed ? 0 : (actualResult as number),
        executionTime: Date.now() - startTime,
        details: []
      };

      if (!passed) {
        result.errorMessage = rule.errorMessage;
        result.details = await this.getValidationDetails(rule, actualResult);
      }

      return result;

    } catch (error) {
      return {
        ruleId: rule.id,
        passed: false,
        actualResult: null,
        expectedResult: rule.expectedResult,
        errorMessage: `Validation rule execution failed: ${error}`,
        affectedRecords: 0,
        executionTime: Date.now() - startTime,
        details: []
      };
    }
  }

  /**
   * Simulate query result for testing
   */
  private simulateQueryResult(rule: DataIntegrityRule): any {
    // Simulate different scenarios based on rule type
    switch (rule.type) {
      case 'schema':
        return Math.random() > 0.9 ? 1 : 0; // 10% chance of schema issues
      case 'constraint':
        return Math.random() > 0.95 ? 2 : 0; // 5% chance of constraint violations
      case 'relationship':
        return Math.random() > 0.98 ? 1 : 0; // 2% chance of relationship issues
      case 'business':
        return Math.random() > 0.8 ? 3 : 0; // 20% chance of business rule violations
      case 'format':
        return Math.random() > 0.92 ? 1 : 0; // 8% chance of format issues
      default:
        return 0;
    }
  }

  /**
   * Compare actual and expected results
   */
  private compareResults(actual: any, expected: any): boolean {
    if (typeof expected === 'number') {
      return actual === expected;
    }
    if (typeof expected === 'string') {
      return actual === expected;
    }
    if (Array.isArray(expected)) {
      return JSON.stringify(actual) === JSON.stringify(expected);
    }
    return actual === expected;
  }

  /**
   * Get validation details for failed rules
   */
  private async getValidationDetails(rule: DataIntegrityRule, actualResult: any): Promise<ValidationDetail[]> {
    // In real implementation, would query specific records that failed validation
    const details: ValidationDetail[] = [];
    
    // Simulate getting details for failed records
    for (let i = 0; i < Math.min(actualResult as number, 5); i++) {
      details.push({
        recordId: `record_${i + 1}`,
        field: rule.column || 'unknown',
        currentValue: 'invalid_value',
        expectedValue: 'valid_value',
        issue: rule.errorMessage
      });
    }
    
    return details;
  } 
 /**
   * Generate integrity report
   */
  private generateIntegrityReport(
    databaseInstance: string, 
    results: DataIntegrityResult[], 
    executionTime: number
  ): IntegrityReport {
    const passedRules = results.filter(r => r.passed).length;
    const failedRules = results.filter(r => !r.passed && this.getRuleSeverity(r.ruleId) === 'error').length;
    const warningRules = results.filter(r => !r.passed && this.getRuleSeverity(r.ruleId) === 'warning').length;
    
    const summary: IntegritySummary = {
      schemaIssues: results.filter(r => !r.passed && this.getRuleType(r.ruleId) === 'schema').length,
      constraintViolations: results.filter(r => !r.passed && this.getRuleType(r.ruleId) === 'constraint').length,
      relationshipIssues: results.filter(r => !r.passed && this.getRuleType(r.ruleId) === 'relationship').length,
      businessRuleViolations: results.filter(r => !r.passed && this.getRuleType(r.ruleId) === 'business').length,
      formatIssues: results.filter(r => !r.passed && this.getRuleType(r.ruleId) === 'format').length,
      criticalIssues: failedRules,
      totalAffectedRecords: results.reduce((sum, r) => sum + r.affectedRecords, 0)
    };

    const overallScore = Math.round((passedRules / results.length) * 100);

    const recommendations = this.generateRecommendations(results, summary);

    return {
      timestamp: new Date().toISOString(),
      databaseInstance,
      totalRules: results.length,
      passedRules,
      failedRules,
      warningRules,
      overallScore,
      results,
      summary,
      recommendations
    };
  }

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(results: DataIntegrityResult[], summary: IntegritySummary): string[] {
    const recommendations: string[] = [];

    if (summary.criticalIssues > 0) {
      recommendations.push(`Address ${summary.criticalIssues} critical data integrity issues immediately`);
    }

    if (summary.schemaIssues > 0) {
      recommendations.push('Review and fix schema validation issues - ensure all required fields are populated');
    }

    if (summary.constraintViolations > 0) {
      recommendations.push('Fix constraint violations - check data ranges and allowed values');
    }

    if (summary.relationshipIssues > 0) {
      recommendations.push('Resolve relationship integrity issues - ensure all foreign keys reference valid records');
    }

    if (summary.formatIssues > 0) {
      recommendations.push('Correct data format issues - validate email formats, K-numbers, and JSON fields');
    }

    if (summary.businessRuleViolations > 0) {
      recommendations.push('Review business rule violations - consider updating business logic or data');
    }

    if (summary.totalAffectedRecords > 100) {
      recommendations.push('Large number of affected records detected - consider bulk data correction');
    }

    if (recommendations.length === 0) {
      recommendations.push('All data integrity checks passed - database is in good condition');
    }

    return recommendations;
  }

  /**
   * Get rule severity by ID
   */
  private getRuleSeverity(ruleId: string): string {
    const rule = this.rules.find(r => r.id === ruleId);
    return rule?.severity || 'error';
  }

  /**
   * Get rule type by ID
   */
  private getRuleType(ruleId: string): string {
    const rule = this.rules.find(r => r.id === ruleId);
    return rule?.type || 'unknown';
  }

  /**
   * Get all validation rules
   */
  getAllRules(): DataIntegrityRule[] {
    return [...this.rules];
  }

  /**
   * Get rules by type
   */
  getRulesByType(type: string): DataIntegrityRule[] {
    return this.rules.filter(rule => rule.type === type);
  }

  /**
   * Get rules by severity
   */
  getRulesBySeverity(severity: string): DataIntegrityRule[] {
    return this.rules.filter(rule => rule.severity === severity);
  }

  /**
   * Add custom validation rule
   */
  addCustomRule(rule: DataIntegrityRule): void {
    this.rules.push(rule);
  }

  /**
   * Remove validation rule
   */
  removeRule(ruleId: string): boolean {
    const index = this.rules.findIndex(rule => rule.id === ruleId);
    if (index !== -1) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }
}

export default DataIntegrityValidator;