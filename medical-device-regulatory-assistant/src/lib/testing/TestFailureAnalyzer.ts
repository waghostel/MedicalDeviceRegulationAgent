/**
 * Test Failure Analysis Tools
 * 
 * Provides comprehensive analysis of test failures with detailed reports,
 * error categorization, and actionable debugging suggestions.
 * 
 * Requirements: 5.4, 6.2
 */

import { ReactWrapper } from 'enzyme';
import { RenderResult } from '@testing-library/react';

export interface TestFailureReport {
  testName: string;
  failureType: FailureType;
  errorMessage: string;
  stackTrace: string;
  componentStack?: string;
  analysis: FailureAnalysis;
  suggestions: string[];
  debuggingSteps: DebuggingStep[];
  relatedFiles: string[];
  confidence: number;
  timestamp: number;
}

export interface FailureAnalysis {
  category: FailureCategory;
  rootCause: string;
  affectedComponents: string[];
  mockIssues: MockIssue[];
  renderingIssues: RenderingIssue[];
  hookIssues: HookIssue[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  isRecoverable: boolean;
}

export interface DebuggingStep {
  step: number;
  description: string;
  command?: string;
  expectedResult: string;
  troubleshootingTips: string[];
}

export interface MockIssue {
  mockName: string;
  issue: string;
  expectedStructure: any;
  actualStructure: any;
  fixSuggestion: string;
}

export interface RenderingIssue {
  component: string;
  issue: string;
  props?: any;
  context?: any;
  fixSuggestion: string;
}

export interface HookIssue {
  hookName: string;
  issue: string;
  executionTrace: HookExecutionStep[];
  fixSuggestion: string;
}

export interface HookExecutionStep {
  step: number;
  hookName: string;
  operation: string;
  input: any;
  output: any;
  error?: string;
  timestamp: number;
}

export type FailureType = 
  | 'RENDER_ERROR'
  | 'HOOK_ERROR' 
  | 'MOCK_ERROR'
  | 'ASSERTION_ERROR'
  | 'TIMEOUT_ERROR'
  | 'AGGREGATE_ERROR'
  | 'UNKNOWN_ERROR';

export type FailureCategory = 
  | 'REACT_19_COMPATIBILITY'
  | 'HOOK_MOCK_CONFIGURATION'
  | 'COMPONENT_RENDERING'
  | 'PROVIDER_SETUP'
  | 'TEST_ENVIRONMENT'
  | 'ASSERTION_MISMATCH'
  | 'PERFORMANCE_ISSUE';

export class TestFailureAnalyzer {
  private static instance: TestFailureAnalyzer;
  private failureHistory: TestFailureReport[] = [];
  private errorPatterns: Map<string, FailurePattern> = new Map();

  constructor() {
    this.initializeErrorPatterns();
  }

  static getInstance(): TestFailureAnalyzer {
    if (!TestFailureAnalyzer.instance) {
      TestFailureAnalyzer.instance = new TestFailureAnalyzer();
    }
    return TestFailureAnalyzer.instance;
  }

  /**
   * Analyze a test failure and generate comprehensive report
   */
  analyzeFailure(
    testName: string,
    error: Error | AggregateError,
    context?: TestFailureContext
  ): TestFailureReport {
    const startTime = performance.now();

    const failureType = this.determineFailureType(error);
    const analysis = this.performFailureAnalysis(error, context);
    const suggestions = this.generateSuggestions(analysis, error);
    const debuggingSteps = this.generateDebuggingSteps(analysis, failureType);
    const relatedFiles = this.identifyRelatedFiles(analysis, context);

    const report: TestFailureReport = {
      testName,
      failureType,
      errorMessage: error.message,
      stackTrace: error.stack || '',
      componentStack: context?.componentStack,
      analysis,
      suggestions,
      debuggingSteps,
      relatedFiles,
      confidence: this.calculateConfidence(analysis, error),
      timestamp: Date.now()
    };

    // Store in history (limit to last 50 failures)
    this.failureHistory.push(report);
    if (this.failureHistory.length > 50) {
      this.failureHistory.shift();
    }

    console.log(`Test failure analysis completed in ${performance.now() - startTime}ms`);
    return report;
  }

  /**
   * Generate detailed troubleshooting guide for a failure
   */
  generateTroubleshootingGuide(report: TestFailureReport): string {
    const guide = `
# Test Failure Troubleshooting Guide

## Test: ${report.testName}
**Failure Type**: ${report.failureType}
**Severity**: ${report.analysis.severity}
**Confidence**: ${Math.round(report.confidence * 100)}%

## Error Summary
\`\`\`
${report.errorMessage}
\`\`\`

## Root Cause Analysis
**Category**: ${report.analysis.category}
**Root Cause**: ${report.analysis.rootCause}
**Affected Components**: ${report.analysis.affectedComponents.join(', ')}

## Debugging Steps
${report.debuggingSteps.map(step => `
### Step ${step.step}: ${step.description}
${step.command ? `**Command**: \`${step.command}\`` : ''}
**Expected Result**: ${step.expectedResult}

**Troubleshooting Tips**:
${step.troubleshootingTips.map(tip => `- ${tip}`).join('\n')}
`).join('\n')}

## Suggested Fixes
${report.suggestions.map(suggestion => `- ${suggestion}`).join('\n')}

## Related Files to Check
${report.relatedFiles.map(file => `- ${file}`).join('\n')}

${this.generateMockIssuesSection(report.analysis.mockIssues)}
${this.generateRenderingIssuesSection(report.analysis.renderingIssues)}
${this.generateHookIssuesSection(report.analysis.hookIssues)}

---
*Generated by TestFailureAnalyzer at ${new Date(report.timestamp).toISOString()}*
`;

    return guide;
  }

  /**
   * Get failure statistics and patterns
   */
  getFailureStatistics(): FailureStatistics {
    const totalFailures = this.failureHistory.length;
    const categoryCount = new Map<FailureCategory, number>();
    const typeCount = new Map<FailureType, number>();
    const severityCount = new Map<string, number>();

    this.failureHistory.forEach(failure => {
      // Count by category
      const currentCategoryCount = categoryCount.get(failure.analysis.category) || 0;
      categoryCount.set(failure.analysis.category, currentCategoryCount + 1);

      // Count by type
      const currentTypeCount = typeCount.get(failure.failureType) || 0;
      typeCount.set(failure.failureType, currentTypeCount + 1);

      // Count by severity
      const currentSeverityCount = severityCount.get(failure.analysis.severity) || 0;
      severityCount.set(failure.analysis.severity, currentSeverityCount + 1);
    });

    return {
      totalFailures,
      categoryBreakdown: Object.fromEntries(categoryCount),
      typeBreakdown: Object.fromEntries(typeCount),
      severityBreakdown: Object.fromEntries(severityCount),
      averageConfidence: this.failureHistory.reduce((sum, f) => sum + f.confidence, 0) / totalFailures,
      mostCommonCategory: this.getMostCommon(categoryCount),
      mostCommonType: this.getMostCommon(typeCount),
      recentFailures: this.failureHistory.slice(-10)
    };
  }

  private determineFailureType(error: Error | AggregateError): FailureType {
    if (error instanceof AggregateError) {
      return 'AGGREGATE_ERROR';
    }

    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('timeout') || message.includes('timed out')) {
      return 'TIMEOUT_ERROR';
    }

    if (message.includes('hook') || stack.includes('usehook') || stack.includes('useeffect')) {
      return 'HOOK_ERROR';
    }

    if (message.includes('render') || message.includes('component') || stack.includes('render')) {
      return 'RENDER_ERROR';
    }

    if (message.includes('mock') || message.includes('jest.fn') || message.includes('not a function')) {
      return 'MOCK_ERROR';
    }

    if (message.includes('expect') || message.includes('assertion') || message.includes('received')) {
      return 'ASSERTION_ERROR';
    }

    return 'UNKNOWN_ERROR';
  }

  private performFailureAnalysis(error: Error | AggregateError, context?: TestFailureContext): FailureAnalysis {
    const category = this.determineFailureCategory(error, context);
    const rootCause = this.identifyRootCause(error, category);
    const affectedComponents = this.extractAffectedComponents(error, context);
    const mockIssues = this.analyzeMockIssues(error, context);
    const renderingIssues = this.analyzeRenderingIssues(error, context);
    const hookIssues = this.analyzeHookIssues(error, context);
    const severity = this.determineSeverity(error, category);
    const isRecoverable = this.isRecoverable(error, category);

    return {
      category,
      rootCause,
      affectedComponents,
      mockIssues,
      renderingIssues,
      hookIssues,
      severity,
      isRecoverable
    };
  }

  private determineFailureCategory(error: Error | AggregateError, context?: TestFailureContext): FailureCategory {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (error instanceof AggregateError || message.includes('aggregateerror')) {
      return 'REACT_19_COMPATIBILITY';
    }

    if (message.includes('usetoast') || message.includes('useenhancedform') || message.includes('not a function')) {
      return 'HOOK_MOCK_CONFIGURATION';
    }

    if (message.includes('render') || message.includes('component') || stack.includes('render')) {
      return 'COMPONENT_RENDERING';
    }

    if (message.includes('provider') || message.includes('context')) {
      return 'PROVIDER_SETUP';
    }

    if (message.includes('timeout') || message.includes('performance')) {
      return 'PERFORMANCE_ISSUE';
    }

    if (message.includes('expect') || message.includes('assertion')) {
      return 'ASSERTION_MISMATCH';
    }

    return 'TEST_ENVIRONMENT';
  }

  private identifyRootCause(error: Error | AggregateError, category: FailureCategory): string {
    const message = error.message;

    switch (category) {
      case 'REACT_19_COMPATIBILITY':
        return 'React 19 AggregateError not properly handled by test infrastructure';
      case 'HOOK_MOCK_CONFIGURATION':
        return 'Hook mock structure does not match actual implementation';
      case 'COMPONENT_RENDERING':
        return 'Component failed to render due to missing props or context';
      case 'PROVIDER_SETUP':
        return 'Required providers not properly configured in test wrapper';
      case 'PERFORMANCE_ISSUE':
        return 'Test execution exceeded performance thresholds';
      case 'ASSERTION_MISMATCH':
        return 'Test assertion expectations do not match actual behavior';
      default:
        return `Unknown issue: ${message}`;
    }
  }

  private extractAffectedComponents(error: Error | AggregateError, context?: TestFailureContext): string[] {
    const components: string[] = [];
    const stack = error.stack || '';
    const componentStack = context?.componentStack || '';

    // Extract component names from stack traces
    const componentMatches = stack.match(/at\s+(\w+)\s+/g) || [];
    componentMatches.forEach(match => {
      const componentName = match.replace(/at\s+/, '').trim();
      if (componentName && !components.includes(componentName)) {
        components.push(componentName);
      }
    });

    // Extract from component stack if available
    if (componentStack) {
      const componentStackMatches = componentStack.match(/\w+/g) || [];
      componentStackMatches.forEach(component => {
        if (!components.includes(component)) {
          components.push(component);
        }
      });
    }

    return components.slice(0, 5); // Limit to top 5 components
  }

  private analyzeMockIssues(error: Error | AggregateError, context?: TestFailureContext): MockIssue[] {
    const issues: MockIssue[] = [];
    const message = error.message.toLowerCase();

    if (message.includes('usetoast') && message.includes('not a function')) {
      issues.push({
        mockName: 'useToast',
        issue: 'Hook mock not properly exported as function',
        expectedStructure: { useToast: 'function' },
        actualStructure: { useToast: 'undefined or not function' },
        fixSuggestion: 'Ensure useToast is exported as jest.fn(() => ({ toast: jest.fn(), ... }))'
      });
    }

    if (message.includes('useenhancedform')) {
      issues.push({
        mockName: 'useEnhancedForm',
        issue: 'Enhanced form hook mock missing required methods',
        expectedStructure: { register: 'function', handleSubmit: 'function', formState: 'object' },
        actualStructure: { incomplete: 'mock structure' },
        fixSuggestion: 'Include all react-hook-form methods plus enhanced form methods'
      });
    }

    return issues;
  }

  private analyzeRenderingIssues(error: Error | AggregateError, context?: TestFailureContext): RenderingIssue[] {
    const issues: RenderingIssue[] = [];
    const message = error.message.toLowerCase();

    if (message.includes('render') && message.includes('provider')) {
      issues.push({
        component: 'Provider wrapper',
        issue: 'Missing required providers in test setup',
        fixSuggestion: 'Add all required providers to renderWithProviders wrapper'
      });
    }

    if (message.includes('props') || message.includes('required')) {
      issues.push({
        component: 'Component under test',
        issue: 'Missing required props for component rendering',
        props: context?.props,
        fixSuggestion: 'Provide all required props or use default props in test'
      });
    }

    return issues;
  }

  private analyzeHookIssues(error: Error | AggregateError, context?: TestFailureContext): HookIssue[] {
    const issues: HookIssue[] = [];
    const message = error.message.toLowerCase();

    if (message.includes('hook') && message.includes('render')) {
      issues.push({
        hookName: 'Unknown hook',
        issue: 'Hook called outside of component render',
        executionTrace: [],
        fixSuggestion: 'Ensure hooks are only called within React components or custom hooks'
      });
    }

    return issues;
  }

  private determineSeverity(error: Error | AggregateError, category: FailureCategory): 'low' | 'medium' | 'high' | 'critical' {
    if (error instanceof AggregateError) {
      return 'critical';
    }

    switch (category) {
      case 'REACT_19_COMPATIBILITY':
        return 'critical';
      case 'HOOK_MOCK_CONFIGURATION':
        return 'high';
      case 'COMPONENT_RENDERING':
        return 'high';
      case 'PROVIDER_SETUP':
        return 'medium';
      case 'ASSERTION_MISMATCH':
        return 'low';
      default:
        return 'medium';
    }
  }

  private isRecoverable(error: Error | AggregateError, category: FailureCategory): boolean {
    if (error instanceof AggregateError) {
      return true; // Can be fixed with proper error boundary
    }

    switch (category) {
      case 'REACT_19_COMPATIBILITY':
        return true;
      case 'HOOK_MOCK_CONFIGURATION':
        return true;
      case 'COMPONENT_RENDERING':
        return true;
      case 'PROVIDER_SETUP':
        return true;
      case 'ASSERTION_MISMATCH':
        return true;
      case 'PERFORMANCE_ISSUE':
        return false; // May require architectural changes
      default:
        return true;
    }
  }

  private generateSuggestions(analysis: FailureAnalysis, error: Error | AggregateError): string[] {
    const suggestions: string[] = [];

    switch (analysis.category) {
      case 'REACT_19_COMPATIBILITY':
        suggestions.push('Wrap component in React19ErrorBoundary');
        suggestions.push('Update @testing-library/react to React 19 compatible version');
        suggestions.push('Check renderWithProviders configuration');
        break;
      case 'HOOK_MOCK_CONFIGURATION':
        suggestions.push('Verify hook mock structure matches actual implementation');
        suggestions.push('Check mock export format (should be jest.fn())');
        suggestions.push('Ensure all hook dependencies are properly mocked');
        break;
      case 'COMPONENT_RENDERING':
        suggestions.push('Provide all required props to component');
        suggestions.push('Check provider setup in test wrapper');
        suggestions.push('Verify component dependencies are available');
        break;
      case 'PROVIDER_SETUP':
        suggestions.push('Add missing providers to renderWithProviders');
        suggestions.push('Check provider order and nesting');
        suggestions.push('Verify provider props and initial values');
        break;
    }

    return suggestions;
  }

  private generateDebuggingSteps(analysis: FailureAnalysis, failureType: FailureType): DebuggingStep[] {
    const steps: DebuggingStep[] = [];

    steps.push({
      step: 1,
      description: 'Examine the error message and stack trace',
      expectedResult: 'Identify the specific line and component causing the failure',
      troubleshootingTips: [
        'Look for the first occurrence in your code (not node_modules)',
        'Check if error mentions specific hooks or components',
        'Note any React error boundaries in the stack'
      ]
    });

    if (analysis.category === 'HOOK_MOCK_CONFIGURATION') {
      steps.push({
        step: 2,
        description: 'Validate hook mock structure',
        command: 'console.log(JSON.stringify(mockHook, null, 2))',
        expectedResult: 'Mock structure matches actual hook implementation',
        troubleshootingTips: [
          'Compare mock methods with actual hook methods',
          'Ensure all required properties are present',
          'Check that functions are properly mocked with jest.fn()'
        ]
      });
    }

    if (analysis.category === 'COMPONENT_RENDERING') {
      steps.push({
        step: steps.length + 1,
        description: 'Check component props and context',
        command: 'console.log("Props:", props, "Context:", context)',
        expectedResult: 'All required props and context values are provided',
        troubleshootingTips: [
          'Verify required props are not undefined',
          'Check if component expects specific context providers',
          'Ensure prop types match expected types'
        ]
      });
    }

    steps.push({
      step: steps.length + 1,
      description: 'Run test in isolation',
      command: 'npm test -- --testNamePattern="specific test name"',
      expectedResult: 'Test runs without interference from other tests',
      troubleshootingTips: [
        'Check if failure is consistent in isolation',
        'Look for test setup/teardown issues',
        'Verify mock cleanup between tests'
      ]
    });

    return steps;
  }

  private identifyRelatedFiles(analysis: FailureAnalysis, context?: TestFailureContext): string[] {
    const files: string[] = [];

    // Always include test setup files
    files.push('jest.setup.js', 'src/lib/testing/test-utils.tsx');

    switch (analysis.category) {
      case 'HOOK_MOCK_CONFIGURATION':
        files.push(
          'src/lib/testing/enhanced-form-hook-mocks.ts',
          'src/lib/testing/use-toast-mock.ts',
          'src/lib/testing/setup-enhanced-form-mocks.ts'
        );
        break;
      case 'COMPONENT_RENDERING':
        files.push(
          'src/lib/testing/enhanced-form-component-mocks.ts',
          'src/lib/testing/React19ErrorBoundary.tsx'
        );
        break;
      case 'PROVIDER_SETUP':
        files.push(
          'src/lib/testing/test-utils.tsx',
          'src/lib/testing/mock-toast-system.ts'
        );
        break;
    }

    return files;
  }

  private calculateConfidence(analysis: FailureAnalysis, error: Error | AggregateError): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on error pattern recognition
    const errorPattern = this.errorPatterns.get(error.message);
    if (errorPattern) {
      confidence += 0.3;
    }

    // Increase confidence based on category certainty
    if (analysis.category !== 'TEST_ENVIRONMENT') {
      confidence += 0.2;
    }

    // Increase confidence if we have specific mock or rendering issues identified
    if (analysis.mockIssues.length > 0 || analysis.renderingIssues.length > 0) {
      confidence += 0.2;
    }

    return Math.min(confidence, 1.0);
  }

  private initializeErrorPatterns(): void {
    // Common error patterns with their solutions
    this.errorPatterns.set('useToast is not a function', {
      category: 'HOOK_MOCK_CONFIGURATION',
      solution: 'Export useToast as jest.fn(() => ({ toast: jest.fn(), ... }))',
      confidence: 0.9
    });

    this.errorPatterns.set('Cannot read property of undefined', {
      category: 'COMPONENT_RENDERING',
      solution: 'Check if required props or context values are provided',
      confidence: 0.8
    });

    this.errorPatterns.set('AggregateError', {
      category: 'REACT_19_COMPATIBILITY',
      solution: 'Wrap component in React19ErrorBoundary',
      confidence: 0.95
    });
  }

  private generateMockIssuesSection(mockIssues: MockIssue[]): string {
    if (mockIssues.length === 0) return '';

    return `
## Mock Issues Detected
${mockIssues.map(issue => `
### ${issue.mockName}
**Issue**: ${issue.issue}
**Fix**: ${issue.fixSuggestion}

**Expected Structure**:
\`\`\`json
${JSON.stringify(issue.expectedStructure, null, 2)}
\`\`\`

**Actual Structure**:
\`\`\`json
${JSON.stringify(issue.actualStructure, null, 2)}
\`\`\`
`).join('\n')}`;
  }

  private generateRenderingIssuesSection(renderingIssues: RenderingIssue[]): string {
    if (renderingIssues.length === 0) return '';

    return `
## Rendering Issues Detected
${renderingIssues.map(issue => `
### ${issue.component}
**Issue**: ${issue.issue}
**Fix**: ${issue.fixSuggestion}
${issue.props ? `**Props**: ${JSON.stringify(issue.props, null, 2)}` : ''}
`).join('\n')}`;
  }

  private generateHookIssuesSection(hookIssues: HookIssue[]): string {
    if (hookIssues.length === 0) return '';

    return `
## Hook Issues Detected
${hookIssues.map(issue => `
### ${issue.hookName}
**Issue**: ${issue.issue}
**Fix**: ${issue.fixSuggestion}
`).join('\n')}`;
  }

  private getMostCommon<T>(map: Map<T, number>): T | undefined {
    let maxCount = 0;
    let mostCommon: T | undefined;

    map.forEach((count, key) => {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = key;
      }
    });

    return mostCommon;
  }
}

// Supporting interfaces and types
export interface TestFailureContext {
  componentStack?: string;
  props?: any;
  renderResult?: RenderResult;
  testFile?: string;
  testSuite?: string;
}

export interface FailurePattern {
  category: FailureCategory;
  solution: string;
  confidence: number;
}

export interface FailureStatistics {
  totalFailures: number;
  categoryBreakdown: Record<string, number>;
  typeBreakdown: Record<string, number>;
  severityBreakdown: Record<string, number>;
  averageConfidence: number;
  mostCommonCategory?: FailureCategory;
  mostCommonType?: FailureType;
  recentFailures: TestFailureReport[];
}

// Export singleton instance
export const testFailureAnalyzer = TestFailureAnalyzer.getInstance();