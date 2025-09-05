/**
 * Migration Strategy and Planning Tools - Main Export
 * Comprehensive migration framework for frontend testing migration
 */

// Core migration strategy exports
export {
  MigrationPriorityMatrix,
  MigrationPhasePlanner,
  MigrationTimelineGenerator,
  RiskAssessmentCalculator,
  ResourceRequirementsCalculator,
  MigrationStrategyGenerator,
  type ComponentMockUsage,
  type MockDataImport,
  type MockDataUsage,
  type ComponentDependency,
  type HookUsage,
  type ContextUsage,
  type CodeLocation,
  type CoverageMetrics,
  type MigrationReadiness,
  type MigrationPhase,
  type ComponentMigrationItem,
  type MigrationStep,
  type MigrationPlan,
  type RiskAssessment,
  type ResourceRequirements,
  type MigrationTimeline,
  type SuccessMetrics,
  MigrationPriority,
  RiskLevel,
  MigrationAction
} from './migration-strategy';

// Rollback strategy exports
export {
  RollbackStrategyManager,
  RollbackDocumentationGenerator,
  type RollbackConfiguration,
  type AutomaticTrigger,
  type ManualTrigger,
  type RollbackStep,
  type DataBackupStrategy,
  type ValidationCheck,
  type NotificationSettings,
  type RollbackExecution,
  type RollbackStepExecution,
  type ValidationResult,
  type RollbackLog
} from './rollback-strategy';

// Validation criteria exports
export {
  MigrationValidationSuiteGenerator,
  ValidationExecutor,
  type ValidationSuite,
  type ValidationCategory,
  type ValidationCriterion,
  type TestCase,
  type AcceptanceCriterion,
  type AutomatedTest,
  type ManualTest,
  type ValidationMetric,
  type ValidationExecution,
  type ValidationResult as ValidationCriterionResult,
  type ValidationSummary,
  type Issue
} from './validation-criteria';

// Timeline and resource allocation exports
export {
  MigrationTimelineGenerator,
  ResourceOptimizationCalculator,
  TimelineProgressTracker,
  type ResourceAllocation,
  type TaskAssignment,
  type TimelinePhase,
  type TimelineTask,
  type ProjectTimeline,
  type ContingencyPlan,
  type ReportingSchedule,
  type TimelineProgressReport
} from './timeline-generator';

/**
 * Migration Strategy Factory
 * Main entry point for creating comprehensive migration strategies
 */
export class MigrationStrategyFactory {
  /**
   * Create a complete migration strategy with all components
   */
  static createComprehensiveStrategy(options?: MigrationStrategyOptions): ComprehensiveMigrationStrategy {
    const strategy = MigrationStrategyGenerator.generateComprehensiveStrategy();
    const validationSuite = MigrationValidationSuiteGenerator.generateComprehensiveValidationSuite();
    const timeline = MigrationTimelineGenerator.generateComprehensiveTimeline(
      options?.startDate,
      options?.teamSize,
      options?.workingHoursPerDay
    );
    const rollbackConfig = RollbackStrategyManager.getDefaultConfiguration();

    return {
      strategy,
      validationSuite,
      timeline,
      rollbackConfig,
      documentation: {
        strategyDocument: this.generateStrategyDocument(strategy),
        rollbackProcedure: RollbackDocumentationGenerator.generateRollbackProcedure(),
        rollbackChecklist: RollbackDocumentationGenerator.generateRollbackChecklist(),
        validationPlan: this.generateValidationPlan(validationSuite),
        timelineSummary: this.generateTimelineSummary(timeline)
      }
    };
  }

  /**
   * Generate strategy documentation
   */
  private static generateStrategyDocument(strategy: MigrationPlan): string {
    return `
# Frontend Migration Strategy Document

## Executive Summary
This document outlines the comprehensive strategy for migrating the Medical Device Regulatory Assistant frontend from mock data to real backend connections.

## Migration Overview
- **Total Components**: ${strategy.totalComponents}
- **Estimated Duration**: ${strategy.totalEstimatedDuration} hours (${Math.ceil(strategy.totalEstimatedDuration / 40)} weeks)
- **Risk Level**: ${strategy.riskAssessment.overallRisk}
- **Success Criteria**: ${strategy.successMetrics.functionalityPreserved}% functionality preserved

## Migration Phases
${strategy.phases.map((phase, index) => `
### Phase ${index + 1}: ${phase.name}
- **Duration**: ${phase.estimatedDuration} hours
- **Risk Level**: ${phase.riskLevel}
- **Components**: ${phase.components.length}
- **Dependencies**: ${phase.dependencies.join(', ') || 'None'}

**Deliverables:**
${phase.deliverables.map(d => `- ${d}`).join('\n')}
`).join('\n')}

## Risk Assessment
**Overall Risk**: ${strategy.riskAssessment.overallRisk}

**Key Risk Factors:**
${strategy.riskAssessment.riskFactors.map(rf => `
- **${rf.category}**: ${rf.description}
  - Impact: ${rf.impact}/10
  - Probability: ${Math.round(rf.probability * 100)}%
  - Mitigation: ${rf.mitigation}
`).join('')}

## Resource Requirements
- **Developers**: ${strategy.resourceRequirements.developers}
- **Testers**: ${strategy.resourceRequirements.testers}
- **DevOps Engineers**: ${strategy.resourceRequirements.devOpsEngineers}
- **Total Hours**: ${strategy.resourceRequirements.totalHours}

## Success Metrics
- **Functionality Preserved**: ${strategy.successMetrics.functionalityPreserved}%
- **Performance Improvement**: ${strategy.successMetrics.performanceImprovement}%
- **Test Coverage Target**: ${strategy.successMetrics.testCoverageTarget}%
- **Error Rate Threshold**: ${strategy.successMetrics.errorRateThreshold}%
- **User Satisfaction Target**: ${strategy.successMetrics.userSatisfactionTarget}/5

## Timeline
**Start Date**: ${strategy.timeline.startDate}
**End Date**: ${strategy.timeline.endDate}

**Key Milestones:**
${strategy.timeline.milestones.map(m => `
- **${m.name}**: ${m.targetDate}
  - ${m.description}
`).join('')}

---
*Generated on: ${new Date().toISOString()}*
*Version: 1.0*
`;
  }

  /**
   * Generate validation plan documentation
   */
  private static generateValidationPlan(validationSuite: ValidationSuite): string {
    return `
# Migration Validation Plan

## Overview
This validation plan ensures the migration maintains functionality, performance, and user experience standards.

## Validation Categories
${validationSuite.categories.map(category => `
### ${category.name} (Weight: ${Math.round(category.weight * 100)}%)
${category.description}

**Pass Threshold**: ${category.passThreshold}%

**Criteria:**
${category.criteria.map(criterion => `
- **${criterion.name}** (${criterion.priority} priority)
  - Type: ${criterion.type}
  - Automated Tests: ${criterion.automatedTests.length}
  - Manual Tests: ${criterion.manualTests.length}
  - Acceptance Criteria: ${criterion.acceptanceCriteria.length}
`).join('')}
`).join('')}

## Execution Order
${validationSuite.executionOrder.map((categoryId, index) => `${index + 1}. ${categoryId}`).join('\n')}

## Reporting
- **Formats**: ${validationSuite.reportingConfig.formats.join(', ')}
- **Recipients**: ${validationSuite.reportingConfig.recipients.join(', ')}
- **Schedule**: ${validationSuite.reportingConfig.schedule}

---
*Generated on: ${new Date().toISOString()}*
`;
  }

  /**
   * Generate timeline summary
   */
  private static generateTimelineSummary(timeline: ProjectTimeline): string {
    return `
# Migration Timeline Summary

## Project Overview
- **Name**: ${timeline.name}
- **Duration**: ${timeline.totalDuration} hours
- **Start Date**: ${new Date(timeline.startDate).toLocaleDateString()}
- **End Date**: ${new Date(timeline.endDate).toLocaleDateString()}
- **Buffer Time**: ${timeline.bufferTime} hours

## Phases Overview
${timeline.phases.map((phase, index) => `
### Phase ${index + 1}: ${phase.name}
- **Duration**: ${phase.duration} hours
- **Start**: ${new Date(phase.startDate).toLocaleDateString()}
- **End**: ${new Date(phase.endDate).toLocaleDateString()}
- **Tasks**: ${phase.tasks.length}
- **Status**: ${phase.status}
`).join('')}

## Resource Allocation
${timeline.resources.map(resource => `
### ${resource.name}
- **Type**: ${resource.type}
- **Availability**: ${Math.round(resource.availability * 100)}%
- **Skills**: ${resource.skills.join(', ')}
- **Assignments**: ${resource.assignments.length}
`).join('')}

## Critical Path
${timeline.criticalPath.map(phaseId => `- ${phaseId}`).join('\n')}

## Reporting Schedule
- **Frequency**: ${timeline.reportingSchedule.frequency}
- **Format**: ${timeline.reportingSchedule.format}
- **Recipients**: ${timeline.reportingSchedule.recipients.join(', ')}

---
*Generated on: ${new Date().toISOString()}*
`;
  }
}

export interface MigrationStrategyOptions {
  startDate?: Date;
  teamSize?: number;
  workingHoursPerDay?: number;
}

export interface ComprehensiveMigrationStrategy {
  strategy: MigrationPlan;
  validationSuite: ValidationSuite;
  timeline: ProjectTimeline;
  rollbackConfig: RollbackConfiguration;
  documentation: {
    strategyDocument: string;
    rollbackProcedure: string;
    rollbackChecklist: string;
    validationPlan: string;
    timelineSummary: string;
  };
}

/**
 * Migration Progress Monitor
 * Monitors and reports on migration progress
 */
export class MigrationProgressMonitor {
  private strategy: ComprehensiveMigrationStrategy;

  constructor(strategy: ComprehensiveMigrationStrategy) {
    this.strategy = strategy;
  }

  /**
   * Generate current progress report
   */
  generateProgressReport(): MigrationProgressReport {
    const timelineReport = TimelineProgressTracker.generateProgressReport(this.strategy.timeline);
    
    return {
      timestamp: new Date().toISOString(),
      overallProgress: timelineReport.overallProgress,
      phaseProgress: timelineReport.phaseProgress,
      completedTasks: timelineReport.completedTasks,
      totalTasks: timelineReport.totalTasks,
      upcomingMilestones: timelineReport.upcomingMilestones,
      activeBlockers: timelineReport.blockers,
      recommendations: timelineReport.recommendations,
      riskStatus: this.assessCurrentRisks(),
      resourceUtilization: this.calculateResourceUtilization()
    };
  }

  /**
   * Assess current risk status
   */
  private assessCurrentRisks(): RiskStatus {
    const activeBlockers = this.strategy.timeline.phases
      .flatMap(phase => phase.tasks)
      .flatMap(task => task.blockers)
      .filter(blocker => !blocker.resolvedDate);

    const criticalBlockers = activeBlockers.filter(b => b.severity === 'critical').length;
    const highBlockers = activeBlockers.filter(b => b.severity === 'high').length;

    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (criticalBlockers > 0) riskLevel = 'critical';
    else if (highBlockers > 2) riskLevel = 'high';
    else if (activeBlockers.length > 5) riskLevel = 'medium';

    return {
      level: riskLevel,
      activeBlockers: activeBlockers.length,
      criticalBlockers,
      highBlockers,
      recommendations: this.generateRiskRecommendations(riskLevel, activeBlockers.length)
    };
  }

  /**
   * Calculate resource utilization
   */
  private calculateResourceUtilization(): ResourceUtilization {
    const resources = this.strategy.timeline.resources;
    const utilization = resources.map(resource => {
      const totalAssigned = resource.assignments.reduce((sum, assignment) => 
        sum + assignment.hoursAllocated, 0
      );
      const totalAvailable = this.calculateAvailableHours(resource);
      
      return {
        resourceId: resource.id,
        name: resource.name,
        utilizationPercentage: Math.round((totalAssigned / totalAvailable) * 100),
        assignedHours: totalAssigned,
        availableHours: totalAvailable,
        overAllocated: totalAssigned > totalAvailable
      };
    });

    return {
      resources: utilization,
      averageUtilization: Math.round(
        utilization.reduce((sum, r) => sum + r.utilizationPercentage, 0) / utilization.length
      ),
      overAllocatedResources: utilization.filter(r => r.overAllocated).length
    };
  }

  private calculateAvailableHours(resource: ResourceAllocation): number {
    // Simplified calculation - in real implementation would consider actual timeline
    return 40 * 8 * resource.availability; // 40 weeks * 8 hours * availability
  }

  private generateRiskRecommendations(riskLevel: string, blockerCount: number): string[] {
    const recommendations: string[] = [];

    if (riskLevel === 'critical') {
      recommendations.push('Immediate escalation required - critical blockers present');
      recommendations.push('Consider emergency resource allocation');
    } else if (riskLevel === 'high') {
      recommendations.push('Prioritize blocker resolution');
      recommendations.push('Increase monitoring frequency');
    } else if (blockerCount > 0) {
      recommendations.push('Address blockers in next sprint planning');
    }

    return recommendations;
  }
}

export interface MigrationProgressReport {
  timestamp: string;
  overallProgress: number;
  phaseProgress: PhaseProgressInfo[];
  completedTasks: number;
  totalTasks: number;
  upcomingMilestones: PhaseMilestone[];
  activeBlockers: Blocker[];
  recommendations: string[];
  riskStatus: RiskStatus;
  resourceUtilization: ResourceUtilization;
}

export interface RiskStatus {
  level: 'low' | 'medium' | 'high' | 'critical';
  activeBlockers: number;
  criticalBlockers: number;
  highBlockers: number;
  recommendations: string[];
}

export interface ResourceUtilization {
  resources: ResourceUtilizationInfo[];
  averageUtilization: number;
  overAllocatedResources: number;
}

export interface ResourceUtilizationInfo {
  resourceId: string;
  name: string;
  utilizationPercentage: number;
  assignedHours: number;
  availableHours: number;
  overAllocated: boolean;
}

// Re-export types for convenience
export type { PhaseProgressInfo, PhaseMilestone, Blocker } from './timeline-generator';