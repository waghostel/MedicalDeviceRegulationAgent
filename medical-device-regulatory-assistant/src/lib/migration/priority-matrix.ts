/**
 * Migration Priority Matrix Generator
 * Creates detailed priority matrix for component migration based on impact and complexity
 */

import {
  MigrationStrategyAnalyzer,
  MigrationPriority,
  ComponentMockUsage,
} from './migration-strategy';

export interface PriorityMatrixConfig {
  weightings: {
    userImpact: number;
    technicalComplexity: number;
    testCoverage: number;
    dependencies: number;
    riskLevel: number;
  };
  thresholds: {
    highPriority: number;
    mediumPriority: number;
  };
}

export interface PriorityMatrixReport {
  matrix: PriorityMatrix;
  summary: PrioritySummary;
  recommendations: PriorityRecommendation[];
  timeline: PriorityTimeline;
  riskAnalysis: PriorityRiskAnalysis;
}

export interface PriorityMatrix {
  components: ComponentPriorityEntry[];
  phases: PriorityPhase[];
  dependencies: DependencyGraph;
  criticalPath: string[];
}

export interface ComponentPriorityEntry {
  componentPath: string;
  componentName: string;
  priorityScore: number;
  priority: 'high' | 'medium' | 'low';
  userImpact: 'critical' | 'high' | 'medium' | 'low';
  technicalComplexity: 'simple' | 'moderate' | 'complex' | 'very-complex';
  estimatedEffort: number; // hours
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  dependencies: string[];
  blockers: string[];
  readinessScore: number; // 0-1
  testCoverage: number; // percentage
  mockDataComplexity: MockDataComplexity;
  migrationApproach: MigrationApproach;
}

export interface MockDataComplexity {
  mockDataSources: number;
  mockDataUsagePoints: number;
  dataFlowComplexity: 'simple' | 'moderate' | 'complex';
  stateManagementImpact: 'none' | 'low' | 'medium' | 'high';
}

export interface MigrationApproach {
  strategy:
    | 'direct-replacement'
    | 'gradual-migration'
    | 'parallel-implementation'
    | 'feature-flag';
  phases: string[];
  rollbackComplexity: 'simple' | 'moderate' | 'complex';
  testingRequirements: TestingRequirement[];
}

export interface TestingRequirement {
  type: 'unit' | 'integration' | 'e2e' | 'performance' | 'accessibility';
  priority: 'required' | 'recommended' | 'optional';
  estimatedEffort: number; // hours
  description: string;
}

export interface PriorityPhase {
  name: string;
  order: number;
  components: string[];
  estimatedDuration: number; // days
  parallelizable: boolean;
  dependencies: string[];
  riskLevel: 'low' | 'medium' | 'high';
  successCriteria: string[];
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
  cycles: string[][];
  criticalPath: string[];
}

export interface DependencyNode {
  id: string;
  componentPath: string;
  type: 'component' | 'hook' | 'context' | 'utility';
  hasMockData: boolean;
  migrationPriority: number;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: 'imports' | 'uses' | 'extends' | 'provides-data';
  strength: 'weak' | 'medium' | 'strong';
}

export interface PrioritySummary {
  totalComponents: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  totalEstimatedEffort: number; // hours
  averageReadinessScore: number;
  criticalBlockers: string[];
  quickWins: string[]; // Low effort, high impact components
}

export interface PriorityRecommendation {
  type:
    | 'phase-ordering'
    | 'resource-allocation'
    | 'risk-mitigation'
    | 'quick-win';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actions: string[];
  impact: string;
  effort: 'low' | 'medium' | 'high';
}

export interface PriorityTimeline {
  phases: TimelinePhase[];
  milestones: TimelineMilestone[];
  criticalDates: CriticalDate[];
  bufferTime: number; // days
  totalDuration: number; // days
}

export interface TimelinePhase {
  name: string;
  startDate: string;
  endDate: string;
  components: string[];
  dependencies: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export interface TimelineMilestone {
  name: string;
  date: string;
  deliverables: string[];
  successCriteria: string[];
  riskFactors: string[];
}

export interface CriticalDate {
  date: string;
  event: string;
  impact: string;
  contingencyPlan: string;
}

export interface PriorityRiskAnalysis {
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  mitigationStrategies: RiskMitigation[];
  contingencyPlans: ContingencyPlan[];
}

export interface RiskFactor {
  component: string;
  type: 'technical' | 'schedule' | 'resource' | 'dependency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  probability: number; // 0-1
  description: string;
  impact: string;
}

export interface RiskMitigation {
  riskType: string;
  strategy: string;
  actions: string[];
  effectiveness: number; // 0-1
  cost: 'low' | 'medium' | 'high';
  timeline: string;
}

export interface ContingencyPlan {
  trigger: string;
  scenario: string;
  actions: string[];
  impact: 'schedule' | 'scope' | 'quality' | 'resources';
  probability: number; // 0-1
}

/**
 * Priority Matrix Generator
 * Generates comprehensive priority matrix for migration planning
 */
export class PriorityMatrixGenerator {
  private config: PriorityMatrixConfig;

  private analyzer: MigrationStrategyAnalyzer;

  constructor(config?: Partial<PriorityMatrixConfig>) {
    this.config = {
      weightings: {
        userImpact: 0.3,
        technicalComplexity: 0.25,
        testCoverage: 0.15,
        dependencies: 0.15,
        riskLevel: 0.15,
      },
      thresholds: {
        highPriority: 0.7,
        mediumPriority: 0.4,
      },
      ...config,
    };

    this.analyzer = new MigrationStrategyAnalyzer();
  }

  /**
   * Generate complete priority matrix report
   */
  generatePriorityMatrix(): PriorityMatrixReport {
    const components = this.analyzeAllComponents();
    const matrix = this.createPriorityMatrix(components);
    const summary = this.generateSummary(matrix);
    const recommendations = this.generateRecommendations(matrix, summary);
    const timeline = this.generateTimeline(matrix);
    const riskAnalysis = this.analyzeRisks(matrix);

    return {
      matrix,
      summary,
      recommendations,
      timeline,
      riskAnalysis,
    };
  }

  /**
   * Analyze all components in the application
   */
  private analyzeAllComponents(): ComponentPriorityEntry[] {
    const componentPaths = this.getKnownComponents();

    return componentPaths.map((componentPath) => {
      const analysis = this.analyzer.analyzeComponent(componentPath);
      return this.createPriorityEntry(analysis);
    });
  }

  /**
   * Get list of known components to analyze
   */
  private getKnownComponents(): string[] {
    return [
      // Dashboard components (Critical - Core FDA functionality)
      'src/components/dashboard/classification-widget.tsx',
      'src/components/dashboard/predicate-widget.tsx',
      'src/components/dashboard/progress-widget.tsx',
      'src/components/dashboard/regulatory-dashboard.tsx',

      // Project components (High - Project management)
      'src/components/projects/project-card.tsx',
      'src/components/projects/project-list.tsx',
      'src/components/projects/project-form.tsx',

      // Agent components (Critical - AI interaction)
      'src/components/agent/agent-workflow-page.tsx',
      'src/components/agent/agent-execution-status.tsx',

      // Citation components (High - Regulatory compliance)
      'src/components/citations/citation-panel.tsx',
      'src/components/citations/citation-card.tsx',
      'src/components/citations/citation-search.tsx',

      // Layout components (Medium - Navigation and structure)
      'src/components/layout/app-layout.tsx',
      'src/components/layout/header.tsx',
      'src/components/layout/sidebar.tsx',

      // Audit components (High - Compliance tracking)
      'src/components/audit/audit-log-page.tsx',
      'src/components/audit/agent-interaction-card.tsx',
      'src/components/audit/compliance-dashboard.tsx',

      // Editor components (Medium - Document editing)
      'src/components/editor/document-editor.tsx',
      'src/components/editor/markdown-editor.tsx',

      // Form components (Low - Data input)
      'src/components/forms/form-validation.tsx',

      // Loading components (Low - UI feedback)
      'src/components/loading/loading-skeleton.tsx',
      'src/components/loading/progress-indicator.tsx',
    ];
  }

  /**
   * Create priority entry for a component
   */
  private createPriorityEntry(
    analysis: ComponentMockUsage
  ): ComponentPriorityEntry {
    const priorityScore = this.calculatePriorityScore(analysis);
    const priority = this.determinePriority(priorityScore);
    const userImpact = this.assessUserImpact(analysis);
    const technicalComplexity = this.assessTechnicalComplexity(analysis);
    const mockDataComplexity = this.assessMockDataComplexity(analysis);
    const migrationApproach = this.determineMigrationApproach(analysis);

    return {
      componentPath: analysis.componentPath,
      componentName: analysis.componentName,
      priorityScore,
      priority,
      userImpact,
      technicalComplexity,
      estimatedEffort: analysis.migrationReadiness.estimatedEffort,
      riskLevel: analysis.migrationReadiness.riskLevel,
      dependencies: analysis.dependencies.map((d) => d.path),
      blockers: analysis.migrationReadiness.blockers,
      readinessScore: analysis.migrationReadiness.score,
      testCoverage: analysis.coverageMetrics.statements,
      mockDataComplexity,
      migrationApproach,
    };
  }

  /**
   * Calculate priority score based on weighted factors
   */
  private calculatePriorityScore(analysis: ComponentMockUsage): number {
    const userImpactScore = this.getUserImpactScore(analysis);
    const complexityScore = this.getComplexityScore(analysis);
    const testCoverageScore = analysis.coverageMetrics.statements / 100;
    const dependencyScore = Math.max(0, 1 - analysis.dependencies.length / 10);
    const riskScore = this.getRiskScore(analysis.migrationReadiness.riskLevel);

    return (
      userImpactScore * this.config.weightings.userImpact +
      (1 - complexityScore) * this.config.weightings.technicalComplexity + // Invert complexity (lower is better)
      testCoverageScore * this.config.weightings.testCoverage +
      dependencyScore * this.config.weightings.dependencies +
      (1 - riskScore) * this.config.weightings.riskLevel // Invert risk (lower is better)
    );
  }

  private getUserImpactScore(analysis: ComponentMockUsage): number {
    const componentName = analysis.componentName.toLowerCase();

    // Critical components (FDA core functionality)
    if (
      componentName.includes('classification') ||
      componentName.includes('predicate')
    ) {
      return 1.0;
    }

    // High impact components
    if (
      componentName.includes('dashboard') ||
      componentName.includes('project') ||
      componentName.includes('agent') ||
      componentName.includes('audit')
    ) {
      return 0.8;
    }

    // Medium impact components
    if (
      componentName.includes('citation') ||
      componentName.includes('layout') ||
      componentName.includes('editor')
    ) {
      return 0.6;
    }

    // Low impact components
    return 0.4;
  }

  private getComplexityScore(analysis: ComponentMockUsage): number {
    const mockDataUsage = analysis.mockDataUsage.length;
    const dependencies = analysis.dependencies.length;
    const hooks = analysis.hooks.length;

    // Normalize complexity score (0-1, where 1 is most complex)
    const complexityFactor =
      (mockDataUsage * 2 + dependencies + hooks * 1.5) / 20;
    return Math.min(1, complexityFactor);
  }

  private getRiskScore(riskLevel: 'low' | 'medium' | 'high'): number {
    switch (riskLevel) {
      case 'low':
        return 0.2;
      case 'medium':
        return 0.5;
      case 'high':
        return 0.8;
      default:
        return 0.5;
    }
  }

  private determinePriority(score: number): 'high' | 'medium' | 'low' {
    if (score >= this.config.thresholds.highPriority) return 'high';
    if (score >= this.config.thresholds.mediumPriority) return 'medium';
    return 'low';
  }

  private assessUserImpact(
    analysis: ComponentMockUsage
  ): 'critical' | 'high' | 'medium' | 'low' {
    const componentName = analysis.componentName.toLowerCase();

    if (
      componentName.includes('classification') ||
      componentName.includes('predicate')
    ) {
      return 'critical';
    }

    if (
      componentName.includes('dashboard') ||
      componentName.includes('project') ||
      componentName.includes('agent') ||
      componentName.includes('audit')
    ) {
      return 'high';
    }

    if (
      componentName.includes('citation') ||
      componentName.includes('layout')
    ) {
      return 'medium';
    }

    return 'low';
  }

  private assessTechnicalComplexity(
    analysis: ComponentMockUsage
  ): 'simple' | 'moderate' | 'complex' | 'very-complex' {
    const mockDataUsage = analysis.mockDataUsage.length;
    const dependencies = analysis.dependencies.length;
    const hooks = analysis.hooks.length;

    const complexityScore = mockDataUsage * 2 + dependencies + hooks * 1.5;

    if (complexityScore > 15) return 'very-complex';
    if (complexityScore > 10) return 'complex';
    if (complexityScore > 5) return 'moderate';
    return 'simple';
  }

  private assessMockDataComplexity(
    analysis: ComponentMockUsage
  ): MockDataComplexity {
    const mockDataSources = new Set(
      analysis.mockDataImports.map((imp) => imp.importPath)
    ).size;
    const mockDataUsagePoints = analysis.mockDataUsage.reduce(
      (sum, usage) => sum + usage.frequency,
      0
    );

    let dataFlowComplexity: 'simple' | 'moderate' | 'complex' = 'simple';
    if (mockDataUsagePoints > 10) dataFlowComplexity = 'complex';
    else if (mockDataUsagePoints > 5) dataFlowComplexity = 'moderate';

    let stateManagementImpact: 'none' | 'low' | 'medium' | 'high' = 'none';
    if (analysis.contextUsage.length > 2) stateManagementImpact = 'high';
    else if (analysis.contextUsage.length > 1) stateManagementImpact = 'medium';
    else if (analysis.contextUsage.length > 0) stateManagementImpact = 'low';

    return {
      mockDataSources,
      mockDataUsagePoints,
      dataFlowComplexity,
      stateManagementImpact,
    };
  }

  private determineMigrationApproach(
    analysis: ComponentMockUsage
  ): MigrationApproach {
    const complexity = this.assessTechnicalComplexity(analysis);
    const userImpact = this.assessUserImpact(analysis);

    let strategy:
      | 'direct-replacement'
      | 'gradual-migration'
      | 'parallel-implementation'
      | 'feature-flag';
    let rollbackComplexity: 'simple' | 'moderate' | 'complex';

    if (userImpact === 'critical' && complexity === 'very-complex') {
      strategy = 'parallel-implementation';
      rollbackComplexity = 'complex';
    } else if (userImpact === 'critical' || complexity === 'complex') {
      strategy = 'feature-flag';
      rollbackComplexity = 'moderate';
    } else if (complexity === 'moderate') {
      strategy = 'gradual-migration';
      rollbackComplexity = 'moderate';
    } else {
      strategy = 'direct-replacement';
      rollbackComplexity = 'simple';
    }

    const testingRequirements: TestingRequirement[] = [
      {
        type: 'unit',
        priority: 'required',
        estimatedEffort: 2,
        description: 'Unit tests for component functionality',
      },
      {
        type: 'integration',
        priority: userImpact === 'critical' ? 'required' : 'recommended',
        estimatedEffort: 4,
        description: 'Integration tests with real API',
      },
    ];

    if (userImpact === 'critical') {
      testingRequirements.push({
        type: 'e2e',
        priority: 'required',
        estimatedEffort: 6,
        description: 'End-to-end user workflow tests',
      });
    }

    return {
      strategy,
      phases: this.getStrategyPhases(strategy),
      rollbackComplexity,
      testingRequirements,
    };
  }

  private getStrategyPhases(strategy: string): string[] {
    switch (strategy) {
      case 'parallel-implementation':
        return [
          'Create new implementation',
          'A/B test',
          'Gradual rollout',
          'Full migration',
        ];
      case 'feature-flag':
        return [
          'Implement with feature flag',
          'Internal testing',
          'Gradual rollout',
          'Remove flag',
        ];
      case 'gradual-migration':
        return [
          'Prepare infrastructure',
          'Migrate data layer',
          'Update UI',
          'Cleanup',
        ];
      case 'direct-replacement':
        return ['Update implementation', 'Test', 'Deploy'];
      default:
        return ['Plan', 'Implement', 'Test', 'Deploy'];
    }
  }

  /**
   * Create priority matrix from component entries
   */
  private createPriorityMatrix(
    components: ComponentPriorityEntry[]
  ): PriorityMatrix {
    const phases = this.createPriorityPhases(components);
    const dependencies = this.analyzeDependencies(components);
    const criticalPath = this.calculateCriticalPath(dependencies);

    return {
      components,
      phases,
      dependencies,
      criticalPath,
    };
  }

  private createPriorityPhases(
    components: ComponentPriorityEntry[]
  ): PriorityPhase[] {
    const highPriority = components.filter((c) => c.priority === 'high');
    const mediumPriority = components.filter((c) => c.priority === 'medium');
    const lowPriority = components.filter((c) => c.priority === 'low');

    return [
      {
        name: 'Phase 1: Critical Components',
        order: 1,
        components: highPriority.map((c) => c.componentPath),
        estimatedDuration: Math.ceil(
          highPriority.reduce((sum, c) => sum + c.estimatedEffort, 0) / 8
        ),
        parallelizable: false, // Critical components need careful sequencing
        dependencies: this.getPhaseDependencies(highPriority),
        riskLevel: 'high',
        successCriteria: [
          'All critical components migrated successfully',
          'No regression in core functionality',
          'Performance maintained or improved',
        ],
      },
      {
        name: 'Phase 2: High Impact Components',
        order: 2,
        components: mediumPriority.map((c) => c.componentPath),
        estimatedDuration: Math.ceil(
          mediumPriority.reduce((sum, c) => sum + c.estimatedEffort, 0) / 8
        ),
        parallelizable: true, // Medium priority can be done in parallel
        dependencies: this.getPhaseDependencies(mediumPriority),
        riskLevel: 'medium',
        successCriteria: [
          'All high impact components migrated',
          'User experience maintained',
          'Test coverage maintained',
        ],
      },
      {
        name: 'Phase 3: Remaining Components',
        order: 3,
        components: lowPriority.map((c) => c.componentPath),
        estimatedDuration: Math.ceil(
          lowPriority.reduce((sum, c) => sum + c.estimatedEffort, 0) / 8
        ),
        parallelizable: true,
        dependencies: this.getPhaseDependencies(lowPriority),
        riskLevel: 'low',
        successCriteria: [
          'All components migrated',
          'Mock data completely removed',
          'Documentation updated',
        ],
      },
    ];
  }

  private getPhaseDependencies(components: ComponentPriorityEntry[]): string[] {
    const allDependencies = components.flatMap((c) => c.dependencies);
    return [...new Set(allDependencies)];
  }

  private analyzeDependencies(
    components: ComponentPriorityEntry[]
  ): DependencyGraph {
    const nodes: DependencyNode[] = components.map((component) => ({
      id: component.componentPath,
      componentPath: component.componentPath,
      type: 'component',
      hasMockData: component.mockDataComplexity.mockDataSources > 0,
      migrationPriority: component.priorityScore,
    }));

    const edges: DependencyEdge[] = [];

    // Create edges based on component dependencies
    for (const component of components) {
      for (const dependency of component.dependencies) {
        edges.push({
          from: component.componentPath,
          to: dependency,
          type: 'imports',
          strength: 'medium',
        });
      }
    }

    return {
      nodes,
      edges,
      cycles: this.detectCycles(nodes, edges),
      criticalPath: this.calculateCriticalPath({
        nodes,
        edges,
        cycles: [],
        criticalPath: [],
      }),
    };
  }

  private detectCycles(
    nodes: DependencyNode[],
    edges: DependencyEdge[]
  ): string[][] {
    // Simplified cycle detection - would implement proper algorithm in production
    return [];
  }

  private calculateCriticalPath(dependencies: DependencyGraph): string[] {
    // Simplified critical path calculation - would implement proper algorithm in production
    return dependencies.nodes
      .filter((node) => node.hasMockData)
      .sort((a, b) => b.migrationPriority - a.migrationPriority)
      .map((node) => node.componentPath)
      .slice(0, 5);
  }

  /**
   * Generate summary of priority matrix
   */
  private generateSummary(matrix: PriorityMatrix): PrioritySummary {
    const {components} = matrix;
    const highPriority = components.filter((c) => c.priority === 'high').length;
    const mediumPriority = components.filter(
      (c) => c.priority === 'medium'
    ).length;
    const lowPriority = components.filter((c) => c.priority === 'low').length;

    const totalEstimatedEffort = components.reduce(
      (sum, c) => sum + c.estimatedEffort,
      0
    );
    const averageReadinessScore =
      components.reduce((sum, c) => sum + c.readinessScore, 0) /
      components.length;

    const criticalBlockers = components
      .flatMap((c) => c.blockers)
      .filter((blocker, index, array) => array.indexOf(blocker) === index);

    const quickWins = components
      .filter((c) => c.estimatedEffort <= 4 && c.priority !== 'low')
      .map((c) => c.componentPath);

    return {
      totalComponents: components.length,
      highPriority,
      mediumPriority,
      lowPriority,
      totalEstimatedEffort,
      averageReadinessScore,
      criticalBlockers,
      quickWins,
    };
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    matrix: PriorityMatrix,
    summary: PrioritySummary
  ): PriorityRecommendation[] {
    const recommendations: PriorityRecommendation[] = [];

    // Quick wins recommendation
    if (summary.quickWins.length > 0) {
      recommendations.push({
        type: 'quick-win',
        priority: 'high',
        title: 'Start with Quick Wins',
        description: `${summary.quickWins.length} components can be migrated quickly with high impact`,
        actions: [
          'Prioritize components with low effort and high impact',
          'Use these as proof of concept for migration process',
          'Build team confidence with early successes',
        ],
        impact: 'Build momentum and validate migration approach',
        effort: 'low',
      });
    }

    // Critical blockers recommendation
    if (summary.criticalBlockers.length > 0) {
      recommendations.push({
        type: 'risk-mitigation',
        priority: 'high',
        title: 'Address Critical Blockers',
        description: `${summary.criticalBlockers.length} critical blockers must be resolved before migration`,
        actions: summary.criticalBlockers.map(
          (blocker) => `Resolve: ${blocker}`
        ),
        impact: 'Unblock migration progress and reduce risk',
        effort: 'high',
      });
    }

    // Phase ordering recommendation
    recommendations.push({
      type: 'phase-ordering',
      priority: 'medium',
      title: 'Follow Recommended Phase Order',
      description:
        'Migrate components in order of user impact and technical readiness',
      actions: [
        'Start with Phase 1: Critical Components',
        'Ensure each phase is complete before proceeding',
        'Monitor success criteria at each phase',
      ],
      impact: 'Minimize risk and ensure smooth migration',
      effort: 'medium',
    });

    return recommendations;
  }

  /**
   * Generate migration timeline
   */
  private generateTimeline(matrix: PriorityMatrix): PriorityTimeline {
    const phases: TimelinePhase[] = [];
    const milestones: TimelineMilestone[] = [];
    const criticalDates: CriticalDate[] = [];

    let currentDate = new Date();

    for (const phase of matrix.phases) {
      const startDate = new Date(currentDate);
      const endDate = new Date(
        currentDate.getTime() + phase.estimatedDuration * 24 * 60 * 60 * 1000
      );

      phases.push({
        name: phase.name,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        components: phase.components,
        dependencies: phase.dependencies,
        riskLevel: phase.riskLevel,
      });

      milestones.push({
        name: `${phase.name} Complete`,
        date: endDate.toISOString(),
        deliverables: [`All components in ${phase.name} migrated`],
        successCriteria: phase.successCriteria,
        riskFactors:
          phase.riskLevel === 'high' ? ['High complexity components'] : [],
      });

      currentDate = endDate;
    }

    const totalDuration = phases.reduce((sum, phase) => {
      const start = new Date(phase.startDate);
      const end = new Date(phase.endDate);
      return (
        sum +
        Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
      );
    }, 0);

    return {
      phases,
      milestones,
      criticalDates,
      bufferTime: Math.ceil(totalDuration * 0.2), // 20% buffer
      totalDuration,
    };
  }

  /**
   * Analyze risks across the migration
   */
  private analyzeRisks(matrix: PriorityMatrix): PriorityRiskAnalysis {
    const riskFactors: RiskFactor[] = [];

    // Analyze component-specific risks
    for (const component of matrix.components) {
      if (
        component.riskLevel === 'high' ||
        component.riskLevel === 'critical'
      ) {
        riskFactors.push({
          component: component.componentPath,
          type: 'technical',
          severity: component.riskLevel === 'critical' ? 'critical' : 'high',
          probability: component.readinessScore < 0.5 ? 0.7 : 0.4,
          description: `High risk migration for ${component.componentName}`,
          impact: 'Could delay migration or cause functionality issues',
        });
      }

      if (component.blockers.length > 0) {
        riskFactors.push({
          component: component.componentPath,
          type: 'dependency',
          severity: 'medium',
          probability: 0.6,
          description: `Component has ${component.blockers.length} blockers`,
          impact: 'Migration cannot proceed until blockers are resolved',
        });
      }
    }

    // Determine overall risk
    const criticalRisks = riskFactors.filter((r) => r.severity === 'critical');
    const highRisks = riskFactors.filter((r) => r.severity === 'high');

    let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (criticalRisks.length > 0) overallRisk = 'critical';
    else if (highRisks.length > 2) overallRisk = 'high';
    else if (highRisks.length > 0) overallRisk = 'medium';

    return {
      overallRisk,
      riskFactors,
      mitigationStrategies: this.createMitigationStrategies(riskFactors),
      contingencyPlans: this.createContingencyPlans(riskFactors),
    };
  }

  private createMitigationStrategies(
    riskFactors: RiskFactor[]
  ): RiskMitigation[] {
    const strategies: RiskMitigation[] = [];

    const technicalRisks = riskFactors.filter((r) => r.type === 'technical');
    if (technicalRisks.length > 0) {
      strategies.push({
        riskType: 'technical',
        strategy: 'Incremental migration with thorough testing',
        actions: [
          'Implement feature flags for safe rollback',
          'Create comprehensive test suites',
          'Conduct thorough code reviews',
          'Implement monitoring and alerting',
        ],
        effectiveness: 0.8,
        cost: 'medium',
        timeline: 'Throughout migration',
      });
    }

    return strategies;
  }

  private createContingencyPlans(riskFactors: RiskFactor[]): ContingencyPlan[] {
    return [
      {
        trigger: 'Critical component migration fails',
        scenario: 'High-priority component cannot be migrated as planned',
        actions: [
          'Activate rollback procedures',
          'Implement temporary workaround',
          'Reassess migration approach',
          'Adjust timeline and communicate to stakeholders',
        ],
        impact: 'schedule',
        probability: 0.2,
      },
      {
        trigger: 'Multiple blockers cannot be resolved',
        scenario: 'Dependencies or technical issues prevent progress',
        actions: [
          'Escalate to technical leadership',
          'Consider alternative migration approaches',
          'Adjust scope or timeline',
          'Bring in additional expertise',
        ],
        impact: 'scope',
        probability: 0.3,
      },
    ];
  }
}

/**
 * Export utility function for generating priority matrix
 */
export function generateMigrationPriorityMatrix(
  config?: Partial<PriorityMatrixConfig>
): PriorityMatrixReport {
  const generator = new PriorityMatrixGenerator(config);
  return generator.generatePriorityMatrix();
}
