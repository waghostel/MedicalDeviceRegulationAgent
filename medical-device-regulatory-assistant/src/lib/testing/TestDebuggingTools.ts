/**
 * Test Debugging Tools Integration
 *
 * Provides a unified interface for all test debugging capabilities,
 * combining test failure analysis, component rendering debugging,
 * and hook execution tracing.
 *
 * Requirements: 5.4, 6.2
 */

import {
  testFailureAnalyzer,
  TestFailureReport,
  TestFailureContext,
} from './TestFailureAnalyzer';
import {
  componentRenderingDebugger,
  ComponentRenderingReport,
  RenderingDebugOptions,
} from './ComponentRenderingDebugger';
import {
  hookExecutionTracer,
  HookExecutionTrace,
  TracingOptions,
} from './HookExecutionTracer';
import React from 'react';
import { RenderResult } from '@testing-library/react';

export interface ComprehensiveDebugReport {
  testName: string;
  componentName: string;
  debuggingSession: DebuggingSession;
  failureAnalysis?: TestFailureReport;
  renderingAnalysis?: ComponentRenderingReport;
  hookTraces: HookExecutionTrace[];
  overallAssessment: OverallAssessment;
  actionableRecommendations: ActionableRecommendation[];
  troubleshootingGuide: string;
  timestamp: number;
}

export interface DebuggingSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  phases: DebuggingPhase[];
  toolsUsed: string[];
  issuesFound: number;
  issuesResolved: number;
}

export interface DebuggingPhase {
  phase: DebugPhaseType;
  startTime: number;
  duration: number;
  success: boolean;
  findings: string[];
  recommendations: string[];
}

export interface OverallAssessment {
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  primaryIssue: string;
  rootCause: string;
  isFixable: boolean;
  estimatedFixTime: string;
  complexity: 'simple' | 'moderate' | 'complex' | 'expert-required';
}

export interface ActionableRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: RecommendationCategory;
  title: string;
  description: string;
  steps: string[];
  codeExample?: string;
  relatedFiles: string[];
  estimatedTime: string;
}

export type DebugPhaseType =
  | 'FAILURE_ANALYSIS'
  | 'COMPONENT_DEBUGGING'
  | 'HOOK_TRACING'
  | 'INTEGRATION_ANALYSIS'
  | 'SOLUTION_GENERATION';

export type RecommendationCategory =
  | 'MOCK_CONFIGURATION'
  | 'COMPONENT_PROPS'
  | 'HOOK_USAGE'
  | 'PROVIDER_SETUP'
  | 'TEST_ENVIRONMENT'
  | 'PERFORMANCE'
  | 'ACCESSIBILITY';

export class TestDebuggingTools {
  private static instance: TestDebuggingTools;
  private debuggingSessions: Map<string, DebuggingSession> = new Map();
  private debugHistory: ComprehensiveDebugReport[] = [];

  constructor() {
    console.log('🔧 Test Debugging Tools initialized');
  }

  static getInstance(): TestDebuggingTools {
    if (!TestDebuggingTools.instance) {
      TestDebuggingTools.instance = new TestDebuggingTools();
    }
    return TestDebuggingTools.instance;
  }

  /**
   * Perform comprehensive debugging analysis for a test failure
   */
  async debugTestFailure(
    testName: string,
    error: Error | AggregateError,
    options: ComprehensiveDebugOptions = {}
  ): Promise<ComprehensiveDebugReport> {
    const sessionId = `debug-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();

    console.log(
      `🔍 Starting comprehensive test debugging for: ${testName} (Session: ${sessionId})`
    );

    const session: DebuggingSession = {
      sessionId,
      startTime,
      phases: [],
      toolsUsed: [],
      issuesFound: 0,
      issuesResolved: 0,
    };

    this.debuggingSessions.set(sessionId, session);

    try {
      // Phase 1: Failure Analysis
      const failurePhase = await this.executeDebugPhase(
        'FAILURE_ANALYSIS',
        async () => {
          session.toolsUsed.push('TestFailureAnalyzer');
          return testFailureAnalyzer.analyzeFailure(
            testName,
            error,
            options.context
          );
        }
      );
      session.phases.push(failurePhase);
      const failureAnalysis = failurePhase.success
        ? (failurePhase.findings[0] as any)
        : undefined;

      // Phase 2: Component Debugging (if component provided)
      let renderingAnalysis: ComponentRenderingReport | undefined;
      if (options.component) {
        const renderingPhase = await this.executeDebugPhase(
          'COMPONENT_DEBUGGING',
          async () => {
            session.toolsUsed.push('ComponentRenderingDebugger');
            return componentRenderingDebugger.debugComponentRendering(
              options.component!,
              options.props || {},
              options.renderingOptions || {}
            );
          }
        );
        session.phases.push(renderingPhase);
        renderingAnalysis = renderingPhase.success
          ? (renderingPhase.findings[0] as any)
          : undefined;
      }

      // Phase 3: Hook Tracing (if hooks are involved)
      const hookTraces: HookExecutionTrace[] = [];
      if (options.enableHookTracing && options.component) {
        const hookPhase = await this.executeDebugPhase(
          'HOOK_TRACING',
          async () => {
            session.toolsUsed.push('HookExecutionTracer');
            const componentName =
              options.component!.displayName ||
              options.component!.name ||
              'UnknownComponent';
            const tracingId = hookExecutionTracer.startTracing(
              componentName,
              options.tracingOptions
            );

            // Simulate hook execution (in real scenario, this would be integrated with actual rendering)
            setTimeout(() => {
              const trace = hookExecutionTracer.stopTracing(tracingId);
              if (trace) {
                hookTraces.push(trace);
              }
            }, 100);

            return hookTraces;
          }
        );
        session.phases.push(hookPhase);
      }

      // Phase 4: Integration Analysis
      const integrationPhase = await this.executeDebugPhase(
        'INTEGRATION_ANALYSIS',
        async () => {
          return this.analyzeIntegrationIssues(
            failureAnalysis,
            renderingAnalysis,
            hookTraces
          );
        }
      );
      session.phases.push(integrationPhase);

      // Phase 5: Solution Generation
      const solutionPhase = await this.executeDebugPhase(
        'SOLUTION_GENERATION',
        async () => {
          return this.generateSolutions(
            failureAnalysis,
            renderingAnalysis,
            hookTraces,
            error
          );
        }
      );
      session.phases.push(solutionPhase);

      // Finalize session
      session.endTime = performance.now();
      session.duration = session.endTime - session.startTime;
      session.issuesFound = this.countIssuesFound(
        failureAnalysis,
        renderingAnalysis,
        hookTraces
      );

      // Generate comprehensive report
      const report = this.generateComprehensiveReport(
        testName,
        options.component?.displayName ||
          options.component?.name ||
          'UnknownComponent',
        session,
        failureAnalysis,
        renderingAnalysis,
        hookTraces,
        error
      );

      // Store in history
      this.debugHistory.push(report);
      if (this.debugHistory.length > 50) {
        this.debugHistory.shift();
      }

      console.log(
        `✅ Comprehensive debugging completed in ${session.duration?.toFixed(2)}ms`
      );
      return report;
    } catch (debugError) {
      console.error(`❌ Debugging failed:`, debugError);

      // Return error report
      session.endTime = performance.now();
      session.duration = session.endTime - session.startTime;

      return this.generateErrorReport(
        testName,
        sessionId,
        session,
        error,
        debugError as Error
      );
    } finally {
      this.debuggingSessions.delete(sessionId);
    }
  }

  /**
   * Generate interactive debugging guide
   */
  generateInteractiveDebuggingGuide(report: ComprehensiveDebugReport): string {
    return `
# Interactive Test Debugging Guide

## Test: ${report.testName}
**Component**: ${report.componentName}
**Session**: ${report.debuggingSession.sessionId}
**Duration**: ${report.debuggingSession.duration?.toFixed(2)}ms

## 🎯 Quick Assessment
**Severity**: ${report.overallAssessment.severity.toUpperCase()}
**Confidence**: ${Math.round(report.overallAssessment.confidence * 100)}%
**Primary Issue**: ${report.overallAssessment.primaryIssue}
**Root Cause**: ${report.overallAssessment.rootCause}
**Fixable**: ${report.overallAssessment.isFixable ? '✅ Yes' : '❌ No'}
**Estimated Fix Time**: ${report.overallAssessment.estimatedFixTime}
**Complexity**: ${report.overallAssessment.complexity}

## 🔧 Actionable Recommendations

${report.actionableRecommendations
  .sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  })
  .map(
    (rec, index) => `
### ${index + 1}. ${rec.title} (${rec.priority.toUpperCase()} PRIORITY)
**Category**: ${rec.category}
**Estimated Time**: ${rec.estimatedTime}

${rec.description}

**Steps**:
${rec.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

${
  rec.codeExample
    ? `
**Code Example**:
\`\`\`typescript
${rec.codeExample}
\`\`\`
`
    : ''
}

**Related Files**:
${rec.relatedFiles.map((file) => `- ${file}`).join('\n')}
`
  )
  .join('\n')}

## 📊 Debugging Session Analysis

### Tools Used
${report.debuggingSession.toolsUsed.map((tool) => `- ${tool}`).join('\n')}

### Phases Executed
${report.debuggingSession.phases
  .map(
    (phase) => `
#### ${phase.phase}
**Duration**: ${phase.duration.toFixed(2)}ms
**Status**: ${phase.success ? '✅ Success' : '❌ Failed'}
**Findings**: ${phase.findings.length}
**Recommendations**: ${phase.recommendations.length}
`
  )
  .join('\n')}

## 🔍 Detailed Analysis

${
  report.failureAnalysis
    ? `
### Failure Analysis
${testFailureAnalyzer.generateTroubleshootingGuide(report.failureAnalysis)}
`
    : ''
}

${
  report.renderingAnalysis
    ? `
### Component Rendering Analysis
${componentRenderingDebugger.generateRenderingTroubleshootingGuide(report.renderingAnalysis)}
`
    : ''
}

${
  report.hookTraces.length > 0
    ? `
### Hook Execution Traces
${report.hookTraces
  .map(
    (trace) => `
#### ${trace.hookName}
${hookExecutionTracer.generateHookExecutionReport(trace)}
`
  )
  .join('\n')}
`
    : ''
}

## 🎯 Next Steps

1. **Immediate Actions**: Focus on HIGH priority recommendations first
2. **Validation**: Test each fix incrementally to ensure it resolves the issue
3. **Prevention**: Implement suggested patterns to prevent similar issues
4. **Documentation**: Update test documentation with lessons learned

## 📋 Checklist

${report.actionableRecommendations
  .map(
    (rec) => `
- [ ] ${rec.title}
  - [ ] ${rec.steps.join('\n  - [ ] ')}
`
  )
  .join('\n')}

---
*Generated by TestDebuggingTools at ${new Date(report.timestamp).toISOString()}*
`;
  }

  /**
   * Get debugging statistics and insights
   */
  getDebuggingStatistics(): DebuggingStatistics {
    const totalSessions = this.debugHistory.length;
    const successfulSessions = this.debugHistory.filter(
      (r) => r.overallAssessment.isFixable
    ).length;

    const severityCount = new Map<string, number>();
    const categoryCount = new Map<RecommendationCategory, number>();
    let totalDuration = 0;

    this.debugHistory.forEach((report) => {
      // Count severity
      const severity = report.overallAssessment.severity;
      severityCount.set(severity, (severityCount.get(severity) || 0) + 1);

      // Count categories
      report.actionableRecommendations.forEach((rec) => {
        categoryCount.set(
          rec.category,
          (categoryCount.get(rec.category) || 0) + 1
        );
      });

      // Sum duration
      if (report.debuggingSession.duration) {
        totalDuration += report.debuggingSession.duration;
      }
    });

    return {
      totalSessions,
      successfulSessions,
      successRate:
        totalSessions > 0 ? (successfulSessions / totalSessions) * 100 : 0,
      averageSessionDuration:
        totalSessions > 0 ? totalDuration / totalSessions : 0,
      severityBreakdown: Object.fromEntries(severityCount),
      categoryBreakdown: Object.fromEntries(categoryCount),
      recentSessions: this.debugHistory.slice(-10),
    };
  }

  private async executeDebugPhase(
    phase: DebugPhaseType,
    operation: () => Promise<any> | any
  ): Promise<DebuggingPhase> {
    const startTime = performance.now();
    let success = true;
    let findings: string[] = [];
    let recommendations: string[] = [];

    try {
      const result = await operation();

      // Extract findings and recommendations based on result type
      if (result) {
        if (Array.isArray(result)) {
          findings = result.map((item) => JSON.stringify(item));
        } else if (typeof result === 'object') {
          findings = [result];
          if (result.suggestions) {
            recommendations = result.suggestions;
          }
        } else {
          findings = [result.toString()];
        }
      }
    } catch (error) {
      success = false;
      findings = [
        `Error in ${phase}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      ];
    }

    return {
      phase,
      startTime,
      duration: performance.now() - startTime,
      success,
      findings,
      recommendations,
    };
  }

  private analyzeIntegrationIssues(
    failureAnalysis?: TestFailureReport,
    renderingAnalysis?: ComponentRenderingReport,
    hookTraces?: HookExecutionTrace[]
  ): string[] {
    const issues: string[] = [];

    // Cross-reference issues between different analyses
    if (failureAnalysis && renderingAnalysis) {
      if (
        failureAnalysis.analysis.category === 'HOOK_MOCK_CONFIGURATION' &&
        renderingAnalysis.issues.some((issue) => issue.type === 'MISSING_PROPS')
      ) {
        issues.push(
          'Hook mock configuration issues may be causing prop-related rendering failures'
        );
      }
    }

    if (hookTraces && hookTraces.length > 0) {
      const hookErrors = hookTraces.flatMap((trace) => trace.errors);
      if (hookErrors.length > 0 && failureAnalysis) {
        issues.push(
          'Hook execution errors correlate with test failure patterns'
        );
      }
    }

    return issues;
  }

  private generateSolutions(
    failureAnalysis?: TestFailureReport,
    renderingAnalysis?: ComponentRenderingReport,
    hookTraces?: HookExecutionTrace[],
    originalError?: Error | AggregateError
  ): ActionableRecommendation[] {
    const recommendations: ActionableRecommendation[] = [];

    // Generate recommendations based on failure analysis
    if (failureAnalysis) {
      switch (failureAnalysis.analysis.category) {
        case 'HOOK_MOCK_CONFIGURATION':
          recommendations.push({
            priority: 'high',
            category: 'MOCK_CONFIGURATION',
            title: 'Fix Hook Mock Configuration',
            description:
              'Update hook mocks to match actual implementation structure',
            steps: [
              'Review actual hook implementation',
              'Update mock structure to include all required methods',
              'Ensure proper jest.fn() wrapping',
              'Test mock structure validation',
            ],
            codeExample: `
// Correct useToast mock structure
export const useToast = jest.fn(() => ({
  toast: jest.fn(),
  dismiss: jest.fn(),
  dismissAll: jest.fn(),
  contextualToast: {
    success: jest.fn(),
    error: jest.fn(),
    // ... other methods
  }
}));`,
            relatedFiles: failureAnalysis.relatedFiles,
            estimatedTime: '15-30 minutes',
          });
          break;

        case 'REACT_19_COMPATIBILITY':
          recommendations.push({
            priority: 'high',
            category: 'TEST_ENVIRONMENT',
            title: 'Fix React 19 Compatibility',
            description:
              'Update test infrastructure for React 19 compatibility',
            steps: [
              'Wrap components in React19ErrorBoundary',
              'Update @testing-library/react version',
              'Configure proper error handling',
              'Test with React 19 features',
            ],
            relatedFiles: [
              'src/lib/testing/React19ErrorBoundary.tsx',
              'jest.setup.js',
            ],
            estimatedTime: '30-45 minutes',
          });
          break;
      }
    }

    // Generate recommendations based on rendering analysis
    if (renderingAnalysis) {
      renderingAnalysis.issues.forEach((issue) => {
        if (issue.type === 'MISSING_PROPS') {
          recommendations.push({
            priority: 'medium',
            category: 'COMPONENT_PROPS',
            title: 'Provide Missing Props',
            description: issue.description,
            steps: [
              'Identify required props from component definition',
              'Add missing props to test setup',
              'Verify prop types match expectations',
              'Test component rendering',
            ],
            relatedFiles: ['component test file'],
            estimatedTime: '10-15 minutes',
          });
        }
      });
    }

    return recommendations;
  }

  private generateComprehensiveReport(
    testName: string,
    componentName: string,
    session: DebuggingSession,
    failureAnalysis?: TestFailureReport,
    renderingAnalysis?: ComponentRenderingReport,
    hookTraces?: HookExecutionTrace[],
    originalError?: Error | AggregateError
  ): ComprehensiveDebugReport {
    const overallAssessment = this.assessOverallSituation(
      failureAnalysis,
      renderingAnalysis,
      hookTraces,
      originalError
    );
    const recommendations = this.generateSolutions(
      failureAnalysis,
      renderingAnalysis,
      hookTraces,
      originalError
    );

    return {
      testName,
      componentName,
      debuggingSession: session,
      failureAnalysis,
      renderingAnalysis,
      hookTraces: hookTraces || [],
      overallAssessment,
      actionableRecommendations: recommendations,
      troubleshootingGuide: this.generateTroubleshootingGuide(
        overallAssessment,
        recommendations
      ),
      timestamp: Date.now(),
    };
  }

  private assessOverallSituation(
    failureAnalysis?: TestFailureReport,
    renderingAnalysis?: ComponentRenderingReport,
    hookTraces?: HookExecutionTrace[],
    originalError?: Error | AggregateError
  ): OverallAssessment {
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
    let confidence = 0.5;
    let primaryIssue = 'Unknown test failure';
    let rootCause = 'Unable to determine root cause';
    let isFixable = true;
    let estimatedFixTime = '30-60 minutes';
    let complexity: 'simple' | 'moderate' | 'complex' | 'expert-required' =
      'moderate';

    // Analyze failure analysis results
    if (failureAnalysis) {
      severity = failureAnalysis.analysis.severity;
      confidence = Math.max(confidence, failureAnalysis.confidence);
      primaryIssue = failureAnalysis.analysis.rootCause;
      rootCause = failureAnalysis.analysis.rootCause;
      isFixable = failureAnalysis.analysis.isRecoverable;
    }

    // Analyze rendering issues
    if (renderingAnalysis) {
      const criticalRenderingIssues = renderingAnalysis.issues.filter(
        (issue) => issue.severity === 'critical'
      );
      if (criticalRenderingIssues.length > 0) {
        severity = 'critical';
      }
    }

    // Analyze hook traces
    if (hookTraces && hookTraces.length > 0) {
      const hookErrors = hookTraces.flatMap((trace) => trace.errors);
      if (hookErrors.some((error) => !error.recoverable)) {
        isFixable = false;
        complexity = 'expert-required';
      }
    }

    // Determine complexity and time estimates
    if (originalError instanceof AggregateError) {
      complexity = 'complex';
      estimatedFixTime = '1-2 hours';
    } else if (severity === 'critical') {
      complexity = 'complex';
      estimatedFixTime = '45-90 minutes';
    } else if (severity === 'low') {
      complexity = 'simple';
      estimatedFixTime = '15-30 minutes';
    }

    return {
      severity,
      confidence,
      primaryIssue,
      rootCause,
      isFixable,
      estimatedFixTime,
      complexity,
    };
  }

  private generateTroubleshootingGuide(
    assessment: OverallAssessment,
    recommendations: ActionableRecommendation[]
  ): string {
    return `
# Quick Troubleshooting Guide

## Severity: ${assessment.severity.toUpperCase()}
${assessment.isFixable ? '✅ This issue can be fixed' : '❌ This issue may require expert assistance'}

## Root Cause
${assessment.rootCause}

## Recommended Actions
${recommendations
  .slice(0, 3)
  .map((rec, i) => `${i + 1}. ${rec.title} (${rec.estimatedTime})`)
  .join('\n')}

## Complexity: ${assessment.complexity}
**Estimated Fix Time**: ${assessment.estimatedFixTime}
`;
  }

  private generateErrorReport(
    testName: string,
    sessionId: string,
    session: DebuggingSession,
    originalError: Error | AggregateError,
    debugError: Error
  ): ComprehensiveDebugReport {
    return {
      testName,
      componentName: 'Unknown',
      debuggingSession: session,
      hookTraces: [],
      overallAssessment: {
        severity: 'critical',
        confidence: 0.1,
        primaryIssue: 'Debugging tools failed to analyze the issue',
        rootCause: `Debugging failed: ${debugError.message}`,
        isFixable: false,
        estimatedFixTime: 'Unknown',
        complexity: 'expert-required',
      },
      actionableRecommendations: [
        {
          priority: 'high',
          category: 'TEST_ENVIRONMENT',
          title: 'Manual Investigation Required',
          description: 'Automated debugging tools failed to analyze this issue',
          steps: [
            'Review the original error message carefully',
            'Check test setup and configuration',
            'Consult with senior developers or testing experts',
            'Consider simplifying the test case to isolate the issue',
          ],
          relatedFiles: [],
          estimatedTime: 'Unknown',
        },
      ],
      troubleshootingGuide: `Manual investigation required. Original error: ${originalError.message}`,
      timestamp: Date.now(),
    };
  }

  private countIssuesFound(
    failureAnalysis?: TestFailureReport,
    renderingAnalysis?: ComponentRenderingReport,
    hookTraces?: HookExecutionTrace[]
  ): number {
    let count = 0;

    if (failureAnalysis) {
      count += failureAnalysis.analysis.mockIssues.length;
      count += failureAnalysis.analysis.renderingIssues.length;
      count += failureAnalysis.analysis.hookIssues.length;
    }

    if (renderingAnalysis) {
      count += renderingAnalysis.issues.length;
    }

    if (hookTraces) {
      count += hookTraces.reduce((sum, trace) => sum + trace.errors.length, 0);
    }

    return count;
  }
}

// Supporting interfaces
export interface ComprehensiveDebugOptions {
  context?: TestFailureContext;
  component?: React.ComponentType<any>;
  props?: any;
  renderingOptions?: RenderingDebugOptions;
  enableHookTracing?: boolean;
  tracingOptions?: TracingOptions;
  includePerformanceAnalysis?: boolean;
  generateInteractiveGuide?: boolean;
}

export interface DebuggingStatistics {
  totalSessions: number;
  successfulSessions: number;
  successRate: number;
  averageSessionDuration: number;
  severityBreakdown: Record<string, number>;
  categoryBreakdown: Record<string, number>;
  recentSessions: ComprehensiveDebugReport[];
}

// Export singleton instance and utility functions
export const testDebuggingTools = TestDebuggingTools.getInstance();

/**
 * Quick debug function for immediate use in tests
 */
export async function debugTest(
  testName: string,
  error: Error | AggregateError,
  options: ComprehensiveDebugOptions = {}
): Promise<ComprehensiveDebugReport> {
  return testDebuggingTools.debugTestFailure(testName, error, options);
}

/**
 * Generate quick debugging guide
 */
export function quickDebugGuide(report: ComprehensiveDebugReport): string {
  return testDebuggingTools.generateInteractiveDebuggingGuide(report);
}
