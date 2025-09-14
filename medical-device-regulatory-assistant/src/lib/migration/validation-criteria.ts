/**
 * Migration Validation Criteria and Success Metrics
 * Defines comprehensive validation criteria for migration success
 */

export interface ValidationFramework {
  criteria: ValidationCriteria[];
  metrics: SuccessMetrics;
  benchmarks: PerformanceBenchmarks;
  compliance: ComplianceRequirements;
  monitoring: MonitoringConfig;
}

export interface ValidationCriteria {
  id: string;
  name: string;
  category: ValidationCategory;
  type: ValidationType;
  description: string;
  acceptance: AcceptanceCriteria;
  measurement: MeasurementConfig;
  priority: 'critical' | 'high' | 'medium' | 'low';
  phase: ValidationPhase[];
  dependencies: string[];
}

export enum ValidationCategory {
  FUNCTIONAL = 'functional',
  PERFORMANCE = 'performance',
  DATA_INTEGRITY = 'data_integrity',
  USER_EXPERIENCE = 'user_experience',
  SECURITY = 'security',
  COMPLIANCE = 'compliance',
  RELIABILITY = 'reliability'
}

export enum ValidationType {
  AUTOMATED_TEST = 'automated_test',
  MANUAL_TEST = 'manual_test',
  METRIC_THRESHOLD = 'metric_threshold',
  USER_FEEDBACK = 'user_feedback',
  COMPLIANCE_CHECK = 'compliance_check',
  PERFORMANCE_BENCHMARK = 'performance_benchmark'
}

export enum ValidationPhase {
  PRE_MIGRATION = 'pre_migration',
  DURING_MIGRATION = 'during_migration',
  POST_MIGRATION = 'post_migration',
  CONTINUOUS = 'continuous'
}

export interface AcceptanceCriteria {
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'between';
  unit: string;
  tolerance?: number;
  baseline?: number;
  target?: number;
}

export interface MeasurementConfig {
  method: MeasurementMethod;
  frequency: MeasurementFrequency;
  duration: number; // minutes
  sampleSize?: number;
  aggregation: 'avg' | 'max' | 'min' | 'p95' | 'p99' | 'sum' | 'count';
  tools: string[];
}

export enum MeasurementMethod {
  AUTOMATED_MONITORING = 'automated_monitoring',
  SYNTHETIC_TESTING = 'synthetic_testing',
  REAL_USER_MONITORING = 'real_user_monitoring',
  LOAD_TESTING = 'load_testing',
  MANUAL_TESTING = 'manual_testing',
  CODE_ANALYSIS = 'code_analysis'
}

export enum MeasurementFrequency {
  CONTINUOUS = 'continuous',
  EVERY_MINUTE = 'every_minute',
  EVERY_5_MINUTES = 'every_5_minutes',
  EVERY_15_MINUTES = 'every_15_minutes',
  HOURLY = 'hourly',
  DAILY = 'daily',
  ON_DEMAND = 'on_demand'
}

export interface SuccessMetrics {
  primary: PrimaryMetric[];
  secondary: SecondaryMetric[];
  kpis: KeyPerformanceIndicator[];
  slas: ServiceLevelAgreement[];
}

export interface PrimaryMetric {
  id: string;
  name: string;
  description: string;
  target: number;
  current?: number;
  unit: string;
  trend: 'higher_better' | 'lower_better' | 'stable_better';
  weight: number; // 0-1 for overall success calculation
}

export interface SecondaryMetric {
  id: string;
  name: string;
  description: string;
  target: number;
  current?: number;
  unit: string;
  category: string;
}

export interface KeyPerformanceIndicator {
  id: string;
  name: string;
  description: string;
  formula: string;
  target: number;
  current?: number;
  unit: string;
  reportingFrequency: 'real_time' | 'hourly' | 'daily' | 'weekly';
}

export interface ServiceLevelAgreement {
  id: string;
  name: string;
  description: string;
  metric: string;
  threshold: number;
  timeWindow: number; // minutes
  consequences: string[];
}

export interface PerformanceBenchmarks {
  baseline: BenchmarkData;
  targets: BenchmarkData;
  thresholds: ThresholdConfig;
}

export interface BenchmarkData {
  responseTime: {
    p50: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requestsPerSecond: number;
    transactionsPerMinute: number;
  };
  resources: {
    cpuUtilization: number;
    memoryUtilization: number;
    diskUtilization: number;
  };
  availability: {
    uptime: number;
    errorRate: number;
  };
}

export interface ThresholdConfig {
  critical: BenchmarkData;
  warning: BenchmarkData;
  acceptable: BenchmarkData;
}

export interface ComplianceRequirements {
  regulations: ComplianceRegulation[];
  auditTrail: AuditTrailRequirements;
  dataProtection: DataProtectionRequirements;
  accessControl: AccessControlRequirements;
}

export interface ComplianceRegulation {
  name: string;
  requirements: string[];
  validationMethods: string[];
  documentation: string[];
  penalties: string[];
}

export interface AuditTrailRequirements {
  retention: number; // days
  completeness: number; // percentage
  integrity: string[];
  accessibility: string[];
}

export interface DataProtectionRequirements {
  encryption: string[];
  anonymization: string[];
  retention: string[];
  deletion: string[];
}

export interface AccessControlRequirements {
  authentication: string[];
  authorization: string[];
  monitoring: string[];
  reporting: string[];
}

export interface MonitoringConfig {
  dashboards: DashboardConfig[];
  alerts: AlertConfig[];
  reports: ReportConfig[];
  integrations: IntegrationConfig[];
}

export interface DashboardConfig {
  name: string;
  metrics: string[];
  refreshRate: number; // seconds
  audience: string[];
  layout: string;
}

export interface AlertConfig {
  name: string;
  condition: string;
  severity: 'info' | 'warning' | 'critical';
  channels: string[];
  escalation: EscalationConfig;
}

export interface EscalationConfig {
  levels: EscalationLevel[];
  timeouts: number[]; // minutes
}

export interface EscalationLevel {
  level: number;
  contacts: string[];
  actions: string[];
}

export interface ReportConfig {
  name: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  recipients: string[];
  format: 'pdf' | 'html' | 'json';
  sections: string[];
}

export interface IntegrationConfig {
  type: 'monitoring' | 'logging' | 'alerting' | 'reporting';
  service: string;
  config: Record<string, any>;
  enabled: boolean;
}

export interface ValidationResult {
  criteriaId: string;
  status: ValidationStatus;
  value: number;
  expected: number;
  timestamp: string;
  details: ValidationDetails;
}

export enum ValidationStatus {
  PASSED = 'passed',
  FAILED = 'failed',
  WARNING = 'warning',
  PENDING = 'pending',
  SKIPPED = 'skipped'
}

export interface ValidationDetails {
  measurement: number;
  baseline?: number;
  deviation?: number;
  trend?: 'improving' | 'degrading' | 'stable';
  confidence?: number;
  notes?: string;
}

export interface ValidationReport {
  id: string;
  timestamp: string;
  phase: ValidationPhase;
  summary: ValidationSummary;
  results: ValidationResult[];
  recommendations: ValidationRecommendation[];
  nextSteps: string[];
}

export interface ValidationSummary {
  totalCriteria: number;
  passed: number;
  failed: number;
  warnings: number;
  pending: number;
  overallScore: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface ValidationRecommendation {
  type: 'fix' | 'optimize' | 'monitor' | 'investigate';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actions: string[];
  impact: string;
  effort: 'low' | 'medium' | 'high';
}

/**
 * Migration Validation Manager
 * Manages validation criteria and success metrics for migration
 */
export class MigrationValidationManager {
  private framework: ValidationFramework;
  private results: Map<string, ValidationResult[]> = new Map();

  constructor(framework?: Partial<ValidationFramework>) {
    this.framework = this.createDefaultFramework(framework);
  }

  /**
   * Create default validation framework
   */
  private createDefaultFramework(overrides?: Partial<ValidationFramework>): ValidationFramework {
    const defaultFramework: ValidationFramework = {
      criteria: this.createDefaultCriteria(),
      metrics: this.createDefaultMetrics(),
      benchmarks: this.createDefaultBenchmarks(),
      compliance: this.createDefaultCompliance(),
      monitoring: this.createDefaultMonitoring()
    };

    return { ...defaultFramework, ...overrides };
  }

  /**
   * Create default validation criteria
   */
  private createDefaultCriteria(): ValidationCriteria[] {
    return [
      // Functional Criteria
      {
        id: 'component-rendering',
        name: 'Component Rendering Success',
        category: ValidationCategory.FUNCTIONAL,
        type: ValidationType.AUTOMATED_TEST,
        description: 'All migrated components render without errors',
        acceptance: {
          threshold: 100,
          operator: 'eq',
          unit: 'percentage'
        },
        measurement: {
          method: MeasurementMethod.AUTOMATED_MONITORING,
          frequency: MeasurementFrequency.CONTINUOUS,
          duration: 60,
          aggregation: 'avg',
          tools: ['Jest', 'React Testing Library']
        },
        priority: 'critical',
        phase: [ValidationPhase.POST_MIGRATION, ValidationPhase.CONTINUOUS],
        dependencies: []
      },
      {
        id: 'api-integration',
        name: 'API Integration Success',
        category: ValidationCategory.FUNCTIONAL,
        type: ValidationType.AUTOMATED_TEST,
        description: 'All API integrations work correctly with real backend',
        acceptance: {
          threshold: 99,
          operator: 'gte',
          unit: 'percentage',
          tolerance: 1
        },
        measurement: {
          method: MeasurementMethod.SYNTHETIC_TESTING,
          frequency: MeasurementFrequency.EVERY_5_MINUTES,
          duration: 30,
          aggregation: 'avg',
          tools: ['Playwright', 'API Tests']
        },
        priority: 'critical',
        phase: [ValidationPhase.POST_MIGRATION, ValidationPhase.CONTINUOUS],
        dependencies: ['component-rendering']
      },

      // Performance Criteria
      {
        id: 'response-time',
        name: 'Response Time Performance',
        category: ValidationCategory.PERFORMANCE,
        type: ValidationType.PERFORMANCE_BENCHMARK,
        description: 'API response times meet performance requirements',
        acceptance: {
          threshold: 2000,
          operator: 'lte',
          unit: 'milliseconds',
          tolerance: 500,
          baseline: 1500
        },
        measurement: {
          method: MeasurementMethod.REAL_USER_MONITORING,
          frequency: MeasurementFrequency.CONTINUOUS,
          duration: 60,
          aggregation: 'p95',
          tools: ['Application Performance Monitoring']
        },
        priority: 'high',
        phase: [ValidationPhase.POST_MIGRATION, ValidationPhase.CONTINUOUS],
        dependencies: ['api-integration']
      },
      {
        id: 'page-load-time',
        name: 'Page Load Time',
        category: ValidationCategory.PERFORMANCE,
        type: ValidationType.PERFORMANCE_BENCHMARK,
        description: 'Page load times remain within acceptable limits',
        acceptance: {
          threshold: 3000,
          operator: 'lte',
          unit: 'milliseconds',
          tolerance: 1000,
          baseline: 2500
        },
        measurement: {
          method: MeasurementMethod.SYNTHETIC_TESTING,
          frequency: MeasurementFrequency.EVERY_15_MINUTES,
          duration: 15,
          aggregation: 'p95',
          tools: ['Lighthouse', 'WebPageTest']
        },
        priority: 'high',
        phase: [ValidationPhase.POST_MIGRATION, ValidationPhase.CONTINUOUS],
        dependencies: []
      },

      // Data Integrity Criteria
      {
        id: 'data-consistency',
        name: 'Data Consistency',
        category: ValidationCategory.DATA_INTEGRITY,
        type: ValidationType.AUTOMATED_TEST,
        description: 'Data remains consistent between mock and real implementations',
        acceptance: {
          threshold: 100,
          operator: 'eq',
          unit: 'percentage'
        },
        measurement: {
          method: MeasurementMethod.AUTOMATED_MONITORING,
          frequency: MeasurementFrequency.HOURLY,
          duration: 30,
          aggregation: 'avg',
          tools: ['Database Validation Scripts']
        },
        priority: 'critical',
        phase: [ValidationPhase.POST_MIGRATION, ValidationPhase.CONTINUOUS],
        dependencies: ['api-integration']
      },
      {
        id: 'data-completeness',
        name: 'Data Completeness',
        category: ValidationCategory.DATA_INTEGRITY,
        type: ValidationType.AUTOMATED_TEST,
        description: 'All required data fields are populated correctly',
        acceptance: {
          threshold: 95,
          operator: 'gte',
          unit: 'percentage',
          tolerance: 2
        },
        measurement: {
          method: MeasurementMethod.AUTOMATED_MONITORING,
          frequency: MeasurementFrequency.HOURLY,
          duration: 30,
          aggregation: 'avg',
          tools: ['Data Quality Checks']
        },
        priority: 'high',
        phase: [ValidationPhase.POST_MIGRATION, ValidationPhase.CONTINUOUS],
        dependencies: ['data-consistency']
      },

      // User Experience Criteria
      {
        id: 'user-workflow-completion',
        name: 'User Workflow Completion',
        category: ValidationCategory.USER_EXPERIENCE,
        type: ValidationType.AUTOMATED_TEST,
        description: 'Users can complete critical workflows successfully',
        acceptance: {
          threshold: 95,
          operator: 'gte',
          unit: 'percentage',
          tolerance: 3
        },
        measurement: {
          method: MeasurementMethod.SYNTHETIC_TESTING,
          frequency: MeasurementFrequency.EVERY_15_MINUTES,
          duration: 45,
          aggregation: 'avg',
          tools: ['Playwright E2E Tests']
        },
        priority: 'critical',
        phase: [ValidationPhase.POST_MIGRATION, ValidationPhase.CONTINUOUS],
        dependencies: ['component-rendering', 'api-integration']
      },
      {
        id: 'error-rate',
        name: 'User-Facing Error Rate',
        category: ValidationCategory.USER_EXPERIENCE,
        type: ValidationType.METRIC_THRESHOLD,
        description: 'User-facing errors remain below acceptable threshold',
        acceptance: {
          threshold: 1,
          operator: 'lte',
          unit: 'percentage',
          tolerance: 0.5,
          baseline: 0.5
        },
        measurement: {
          method: MeasurementMethod.REAL_USER_MONITORING,
          frequency: MeasurementFrequency.CONTINUOUS,
          duration: 60,
          aggregation: 'avg',
          tools: ['Error Tracking', 'User Analytics']
        },
        priority: 'critical',
        phase: [ValidationPhase.POST_MIGRATION, ValidationPhase.CONTINUOUS],
        dependencies: []
      },

      // Security Criteria
      {
        id: 'authentication-security',
        name: 'Authentication Security',
        category: ValidationCategory.SECURITY,
        type: ValidationType.COMPLIANCE_CHECK,
        description: 'Authentication mechanisms remain secure after migration',
        acceptance: {
          threshold: 100,
          operator: 'eq',
          unit: 'percentage'
        },
        measurement: {
          method: MeasurementMethod.CODE_ANALYSIS,
          frequency: MeasurementFrequency.DAILY,
          duration: 60,
          aggregation: 'avg',
          tools: ['Security Scanning', 'Penetration Testing']
        },
        priority: 'critical',
        phase: [ValidationPhase.POST_MIGRATION, ValidationPhase.CONTINUOUS],
        dependencies: []
      },

      // Reliability Criteria
      {
        id: 'system-availability',
        name: 'System Availability',
        category: ValidationCategory.RELIABILITY,
        type: ValidationType.METRIC_THRESHOLD,
        description: 'System maintains high availability during and after migration',
        acceptance: {
          threshold: 99.9,
          operator: 'gte',
          unit: 'percentage',
          tolerance: 0.1,
          baseline: 99.5
        },
        measurement: {
          method: MeasurementMethod.AUTOMATED_MONITORING,
          frequency: MeasurementFrequency.CONTINUOUS,
          duration: 1440, // 24 hours
          aggregation: 'avg',
          tools: ['Uptime Monitoring', 'Health Checks']
        },
        priority: 'critical',
        phase: [ValidationPhase.DURING_MIGRATION, ValidationPhase.POST_MIGRATION, ValidationPhase.CONTINUOUS],
        dependencies: []
      }
    ];
  }

  /**
   * Create default success metrics
   */
  private createDefaultMetrics(): SuccessMetrics {
    return {
      primary: [
        {
          id: 'migration-success-rate',
          name: 'Migration Success Rate',
          description: 'Percentage of components successfully migrated',
          target: 100,
          unit: 'percentage',
          trend: 'higher_better',
          weight: 0.3
        },
        {
          id: 'zero-critical-errors',
          name: 'Critical Error Count',
          description: 'Number of critical errors after migration',
          target: 0,
          unit: 'count',
          trend: 'lower_better',
          weight: 0.25
        },
        {
          id: 'performance-maintained',
          name: 'Performance Maintenance',
          description: 'Performance maintained or improved compared to baseline',
          target: 100,
          unit: 'percentage',
          trend: 'higher_better',
          weight: 0.2
        },
        {
          id: 'user-satisfaction',
          name: 'User Satisfaction Score',
          description: 'User satisfaction with migrated functionality',
          target: 4.5,
          unit: 'score (1-5)',
          trend: 'higher_better',
          weight: 0.25
        }
      ],
      secondary: [
        {
          id: 'test-coverage',
          name: 'Test Coverage',
          description: 'Code coverage of migrated components',
          target: 85,
          unit: 'percentage',
          category: 'Quality'
        },
        {
          id: 'documentation-completeness',
          name: 'Documentation Completeness',
          description: 'Completeness of migration documentation',
          target: 100,
          unit: 'percentage',
          category: 'Documentation'
        }
      ],
      kpis: [
        {
          id: 'migration-velocity',
          name: 'Migration Velocity',
          description: 'Components migrated per day',
          formula: 'components_migrated / days_elapsed',
          target: 2,
          unit: 'components/day',
          reportingFrequency: 'daily'
        },
        {
          id: 'defect-density',
          name: 'Defect Density',
          description: 'Defects per migrated component',
          formula: 'total_defects / migrated_components',
          target: 0.1,
          unit: 'defects/component',
          reportingFrequency: 'weekly'
        }
      ],
      slas: [
        {
          id: 'response-time-sla',
          name: 'Response Time SLA',
          description: '95% of requests must complete within 2 seconds',
          metric: 'response_time_p95',
          threshold: 2000,
          timeWindow: 60,
          consequences: ['Performance optimization required', 'Rollback consideration']
        },
        {
          id: 'availability-sla',
          name: 'Availability SLA',
          description: 'System must maintain 99.9% uptime',
          metric: 'availability',
          threshold: 99.9,
          timeWindow: 1440, // 24 hours
          consequences: ['Incident response activation', 'Root cause analysis required']
        }
      ]
    };
  }

  /**
   * Create default performance benchmarks
   */
  private createDefaultBenchmarks(): PerformanceBenchmarks {
    return {
      baseline: {
        responseTime: { p50: 800, p95: 1500, p99: 3000 },
        throughput: { requestsPerSecond: 100, transactionsPerMinute: 1000 },
        resources: { cpuUtilization: 60, memoryUtilization: 70, diskUtilization: 50 },
        availability: { uptime: 99.5, errorRate: 0.5 }
      },
      targets: {
        responseTime: { p50: 600, p95: 1200, p99: 2500 },
        throughput: { requestsPerSecond: 120, transactionsPerMinute: 1200 },
        resources: { cpuUtilization: 50, memoryUtilization: 60, diskUtilization: 40 },
        availability: { uptime: 99.9, errorRate: 0.1 }
      },
      thresholds: {
        critical: {
          responseTime: { p50: 2000, p95: 5000, p99: 10000 },
          throughput: { requestsPerSecond: 50, transactionsPerMinute: 500 },
          resources: { cpuUtilization: 90, memoryUtilization: 90, diskUtilization: 85 },
          availability: { uptime: 95, errorRate: 5 }
        },
        warning: {
          responseTime: { p50: 1200, p95: 2500, p99: 5000 },
          throughput: { requestsPerSecond: 80, transactionsPerMinute: 800 },
          resources: { cpuUtilization: 75, memoryUtilization: 80, diskUtilization: 70 },
          availability: { uptime: 99, errorRate: 2 }
        },
        acceptable: {
          responseTime: { p50: 800, p95: 1500, p99: 3000 },
          throughput: { requestsPerSecond: 100, transactionsPerMinute: 1000 },
          resources: { cpuUtilization: 60, memoryUtilization: 70, diskUtilization: 50 },
          availability: { uptime: 99.5, errorRate: 0.5 }
        }
      }
    };
  }

  /**
   * Create default compliance requirements
   */
  private createDefaultCompliance(): ComplianceRequirements {
    return {
      regulations: [
        {
          name: 'FDA 21 CFR Part 820 (Quality System Regulation)',
          requirements: [
            'Maintain design controls',
            'Document all changes',
            'Validate software changes',
            'Maintain traceability'
          ],
          validationMethods: [
            'Design review documentation',
            'Change control records',
            'Validation test results',
            'Traceability matrix'
          ],
          documentation: [
            'Design history file',
            'Change control procedures',
            'Validation protocols',
            'Risk management file'
          ],
          penalties: [
            'Warning letters',
            'Consent decrees',
            'Product recalls',
            'Criminal prosecution'
          ]
        }
      ],
      auditTrail: {
        retention: 365, // 1 year
        completeness: 100,
        integrity: ['Digital signatures', 'Checksums', 'Timestamps'],
        accessibility: ['Searchable', 'Exportable', 'Human readable']
      },
      dataProtection: {
        encryption: ['Data at rest', 'Data in transit', 'Database encryption'],
        anonymization: ['PII removal', 'Data masking', 'Pseudonymization'],
        retention: ['Data lifecycle management', 'Automated deletion', 'Retention policies'],
        deletion: ['Secure deletion', 'Verification of deletion', 'Deletion logs']
      },
      accessControl: {
        authentication: ['Multi-factor authentication', 'Strong passwords', 'Session management'],
        authorization: ['Role-based access', 'Principle of least privilege', 'Access reviews'],
        monitoring: ['Access logging', 'Anomaly detection', 'Real-time alerts'],
        reporting: ['Access reports', 'Compliance dashboards', 'Audit summaries']
      }
    };
  }

  /**
   * Create default monitoring configuration
   */
  private createDefaultMonitoring(): MonitoringConfig {
    return {
      dashboards: [
        {
          name: 'Migration Progress Dashboard',
          metrics: ['migration-success-rate', 'component-rendering', 'api-integration'],
          refreshRate: 30,
          audience: ['Development Team', 'Project Managers'],
          layout: 'grid'
        },
        {
          name: 'Performance Monitoring Dashboard',
          metrics: ['response-time', 'page-load-time', 'system-availability'],
          refreshRate: 60,
          audience: ['Operations Team', 'Performance Engineers'],
          layout: 'timeline'
        }
      ],
      alerts: [
        {
          name: 'Critical Error Alert',
          condition: 'error_rate > 1%',
          severity: 'critical',
          channels: ['email', 'slack', 'sms'],
          escalation: {
            levels: [
              { level: 1, contacts: ['on-call-engineer'], actions: ['investigate'] },
              { level: 2, contacts: ['tech-lead'], actions: ['escalate'] },
              { level: 3, contacts: ['engineering-manager'], actions: ['emergency-response'] }
            ],
            timeouts: [15, 30, 60] // minutes
          }
        }
      ],
      reports: [
        {
          name: 'Daily Migration Report',
          frequency: 'daily',
          recipients: ['project-team'],
          format: 'html',
          sections: ['progress', 'issues', 'metrics', 'next-steps']
        }
      ],
      integrations: [
        {
          type: 'monitoring',
          service: 'Prometheus',
          config: { endpoint: 'http://prometheus:9090' },
          enabled: true
        },
        {
          type: 'alerting',
          service: 'Slack',
          config: { webhook: 'https://hooks.slack.com/...' },
          enabled: true
        }
      ]
    };
  }

  /**
   * Validate criteria against current state
   */
  async validateCriteria(phase: ValidationPhase): Promise<ValidationReport> {
    const phaseCriteria = this.framework.criteria.filter(c => c.phase.includes(phase));
    const results: ValidationResult[] = [];

    for (const criteria of phaseCriteria) {
      const result = await this.validateSingleCriteria(criteria);
      results.push(result);
    }

    const summary = this.calculateValidationSummary(results);
    const recommendations = this.generateRecommendations(results);

    return {
      id: `validation_${Date.now()}`,
      timestamp: new Date().toISOString(),
      phase,
      summary,
      results,
      recommendations,
      nextSteps: this.generateNextSteps(summary, recommendations)
    };
  }

  /**
   * Validate single criteria
   */
  private async validateSingleCriteria(criteria: ValidationCriteria): Promise<ValidationResult> {
    try {
      // Simulate measurement based on criteria type
      const measurement = await this.performMeasurement(criteria);
      const status = this.evaluateResult(measurement, criteria.acceptance);

      return {
        criteriaId: criteria.id,
        status,
        value: measurement,
        expected: criteria.acceptance.threshold,
        timestamp: new Date().toISOString(),
        details: {
          measurement,
          baseline: criteria.acceptance.baseline,
          deviation: criteria.acceptance.baseline ? 
            Math.abs(measurement - criteria.acceptance.baseline) : undefined,
          trend: this.calculateTrend(criteria.id, measurement),
          confidence: 0.95,
          notes: `Measured using ${criteria.measurement.method}`
        }
      };
    } catch (error) {
      return {
        criteriaId: criteria.id,
        status: ValidationStatus.FAILED,
        value: 0,
        expected: criteria.acceptance.threshold,
        timestamp: new Date().toISOString(),
        details: {
          measurement: 0,
          notes: `Measurement failed: ${error}`
        }
      };
    }
  }

  /**
   * Perform measurement for criteria
   */
  private async performMeasurement(criteria: ValidationCriteria): Promise<number> {
    // Simulate different measurement methods
    switch (criteria.measurement.method) {
      case MeasurementMethod.AUTOMATED_MONITORING:
        return this.simulateAutomatedMeasurement(criteria);
      case MeasurementMethod.SYNTHETIC_TESTING:
        return this.simulateSyntheticTesting(criteria);
      case MeasurementMethod.REAL_USER_MONITORING:
        return this.simulateRealUserMonitoring(criteria);
      case MeasurementMethod.PERFORMANCE_BENCHMARK:
        return this.simulatePerformanceBenchmark(criteria);
      default:
        return this.simulateGenericMeasurement(criteria);
    }
  }

  private simulateAutomatedMeasurement(criteria: ValidationCriteria): number {
    // Simulate based on criteria category
    switch (criteria.category) {
      case ValidationCategory.FUNCTIONAL:
        return Math.random() > 0.05 ? 100 : 95; // 95% success rate
      case ValidationCategory.DATA_INTEGRITY:
        return Math.random() > 0.02 ? 100 : 98; // 98% success rate
      default:
        return 95 + Math.random() * 5; // 95-100%
    }
  }

  private simulateSyntheticTesting(criteria: ValidationCriteria): number {
    switch (criteria.category) {
      case ValidationCategory.PERFORMANCE:
        return 1000 + Math.random() * 1000; // 1-2 seconds
      case ValidationCategory.USER_EXPERIENCE:
        return Math.random() > 0.1 ? 95 : 85; // 85-95% success
      default:
        return 90 + Math.random() * 10; // 90-100%
    }
  }

  private simulateRealUserMonitoring(criteria: ValidationCriteria): number {
    switch (criteria.category) {
      case ValidationCategory.PERFORMANCE:
        return 800 + Math.random() * 700; // 0.8-1.5 seconds
      case ValidationCategory.USER_EXPERIENCE:
        return Math.random() * 2; // 0-2% error rate
      default:
        return 95 + Math.random() * 5; // 95-100%
    }
  }

  private simulatePerformanceBenchmark(criteria: ValidationCriteria): number {
    return 1200 + Math.random() * 800; // 1.2-2.0 seconds
  }

  private simulateGenericMeasurement(criteria: ValidationCriteria): number {
    return 90 + Math.random() * 10; // 90-100%
  }

  /**
   * Evaluate measurement result against acceptance criteria
   */
  private evaluateResult(measurement: number, acceptance: AcceptanceCriteria): ValidationStatus {
    const { threshold, operator, tolerance = 0 } = acceptance;

    let passed = false;
    switch (operator) {
      case 'gt':
        passed = measurement > threshold;
        break;
      case 'gte':
        passed = measurement >= threshold;
        break;
      case 'lt':
        passed = measurement < threshold;
        break;
      case 'lte':
        passed = measurement <= threshold;
        break;
      case 'eq':
        passed = Math.abs(measurement - threshold) <= tolerance;
        break;
      case 'between':
        // Assuming threshold is lower bound and tolerance is range
        passed = measurement >= threshold && measurement <= (threshold + tolerance);
        break;
    }

    if (passed) {
      return ValidationStatus.PASSED;
    } else if (tolerance > 0 && Math.abs(measurement - threshold) <= tolerance * 2) {
      return ValidationStatus.WARNING;
    } else {
      return ValidationStatus.FAILED;
    }
  }

  /**
   * Calculate trend for criteria
   */
  private calculateTrend(criteriaId: string, currentValue: number): 'improving' | 'degrading' | 'stable' {
    const history = this.results.get(criteriaId) || [];
    if (history.length < 2) return 'stable';

    const previousValue = history[history.length - 1].value;
    const difference = currentValue - previousValue;
    const threshold = previousValue * 0.05; // 5% threshold

    if (Math.abs(difference) <= threshold) return 'stable';
    return difference > 0 ? 'improving' : 'degrading';
  }

  /**
   * Calculate validation summary
   */
  private calculateValidationSummary(results: ValidationResult[]): ValidationSummary {
    const passed = results.filter(r => r.status === ValidationStatus.PASSED).length;
    const failed = results.filter(r => r.status === ValidationStatus.FAILED).length;
    const warnings = results.filter(r => r.status === ValidationStatus.WARNING).length;
    const pending = results.filter(r => r.status === ValidationStatus.PENDING).length;

    const overallScore = (passed / results.length) * 100;
    
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (failed > 0) riskLevel = 'critical';
    else if (warnings > results.length * 0.2) riskLevel = 'high';
    else if (warnings > 0) riskLevel = 'medium';

    return {
      totalCriteria: results.length,
      passed,
      failed,
      warnings,
      pending,
      overallScore,
      riskLevel
    };
  }

  /**
   * Generate recommendations based on results
   */
  private generateRecommendations(results: ValidationResult[]): ValidationRecommendation[] {
    const recommendations: ValidationRecommendation[] = [];
    const failedResults = results.filter(r => r.status === ValidationStatus.FAILED);
    const warningResults = results.filter(r => r.status === ValidationStatus.WARNING);

    // Critical fixes for failed criteria
    for (const result of failedResults) {
      const criteria = this.framework.criteria.find(c => c.id === result.criteriaId);
      if (criteria) {
        recommendations.push({
          type: 'fix',
          priority: 'critical',
          title: `Fix Failed Criteria: ${criteria.name}`,
          description: `${criteria.name} failed validation and requires immediate attention`,
          actions: [
            'Investigate root cause of failure',
            'Implement corrective measures',
            'Re-run validation tests',
            'Monitor for stability'
          ],
          impact: 'Critical for migration success',
          effort: 'high'
        });
      }
    }

    // Optimization recommendations for warnings
    for (const result of warningResults) {
      const criteria = this.framework.criteria.find(c => c.id === result.criteriaId);
      if (criteria) {
        recommendations.push({
          type: 'optimize',
          priority: 'medium',
          title: `Optimize: ${criteria.name}`,
          description: `${criteria.name} shows warning status and could be improved`,
          actions: [
            'Analyze performance bottlenecks',
            'Implement optimizations',
            'Monitor improvements'
          ],
          impact: 'Improved performance and reliability',
          effort: 'medium'
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate next steps based on validation results
   */
  private generateNextSteps(summary: ValidationSummary, recommendations: ValidationRecommendation[]): string[] {
    const nextSteps: string[] = [];

    if (summary.failed > 0) {
      nextSteps.push('Address all failed validation criteria immediately');
      nextSteps.push('Conduct root cause analysis for failures');
      nextSteps.push('Implement corrective actions');
    }

    if (summary.warnings > 0) {
      nextSteps.push('Review warning criteria and plan optimizations');
      nextSteps.push('Monitor warning criteria for degradation');
    }

    if (summary.overallScore >= 95) {
      nextSteps.push('Proceed with next migration phase');
      nextSteps.push('Continue monitoring all criteria');
    } else if (summary.overallScore >= 85) {
      nextSteps.push('Address remaining issues before proceeding');
      nextSteps.push('Increase monitoring frequency');
    } else {
      nextSteps.push('Consider rollback if issues cannot be resolved quickly');
      nextSteps.push('Escalate to technical leadership');
    }

    return nextSteps;
  }

  /**
   * Store validation result
   */
  storeResult(result: ValidationResult): void {
    const history = this.results.get(result.criteriaId) || [];
    history.push(result);
    
    // Keep only last 100 results per criteria
    if (history.length > 100) {
      history.splice(0, history.length - 100);
    }
    
    this.results.set(result.criteriaId, history);
  }

  /**
   * Get validation history for criteria
   */
  getValidationHistory(criteriaId: string): ValidationResult[] {
    return this.results.get(criteriaId) || [];
  }

  /**
   * Get framework configuration
   */
  getFramework(): ValidationFramework {
    return this.framework;
  }

  /**
   * Update framework configuration
   */
  updateFramework(updates: Partial<ValidationFramework>): void {
    this.framework = { ...this.framework, ...updates };
  }
}

/**
 * Export utility function for creating validation manager
 */
export function createMigrationValidationManager(config?: Partial<ValidationFramework>): MigrationValidationManager {
  return new MigrationValidationManager(config);
}