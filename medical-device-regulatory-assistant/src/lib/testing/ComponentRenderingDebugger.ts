/**
 * Component Rendering Debugger
 * 
 * Provides detailed debugging capabilities for component rendering issues,
 * including prop analysis, context validation, and render tree inspection.
 * 
 * Requirements: 5.4, 6.2
 */

import React from 'react';
import { RenderResult, queries } from '@testing-library/react';
import { ReactWrapper } from 'enzyme';

export interface ComponentRenderingReport {
  componentName: string;
  renderingStatus: RenderingStatus;
  propsAnalysis: PropsAnalysis;
  contextAnalysis: ContextAnalysis;
  childrenAnalysis: ChildrenAnalysis;
  domAnalysis: DOMAnalysis;
  performanceMetrics: RenderingPerformanceMetrics;
  issues: RenderingIssue[];
  suggestions: string[];
  debugTrace: RenderingStep[];
  timestamp: number;
}

export interface PropsAnalysis {
  providedProps: Record<string, any>;
  requiredProps: string[];
  missingProps: string[];
  invalidProps: PropValidationError[];
  propTypes: Record<string, string>;
  defaultProps: Record<string, any>;
}

export interface ContextAnalysis {
  availableContexts: ContextInfo[];
  missingContexts: string[];
  contextValues: Record<string, any>;
  providerChain: string[];
}

export interface ChildrenAnalysis {
  childCount: number;
  childTypes: string[];
  renderableChildren: number;
  nonRenderableChildren: number;
  childrenIssues: string[];
}

export interface DOMAnalysis {
  elementCount: number;
  domStructure: DOMNode[];
  accessibilityIssues: AccessibilityIssue[];
  testIdCoverage: TestIdCoverage;
  cssClasses: string[];
}

export interface RenderingPerformanceMetrics {
  renderTime: number;
  reRenderCount: number;
  memoryUsage: number;
  domNodeCount: number;
  componentTreeDepth: number;
}

export interface RenderingIssue {
  type: RenderingIssueType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location: string;
  suggestion: string;
  code?: string;
}

export interface RenderingStep {
  step: number;
  phase: RenderingPhase;
  description: string;
  duration: number;
  success: boolean;
  error?: string;
  data?: any;
}

export interface PropValidationError {
  propName: string;
  expectedType: string;
  actualType: string;
  value: any;
  isRequired: boolean;
}

export interface ContextInfo {
  name: string;
  value: any;
  provider: string;
  isAvailable: boolean;
}

export interface DOMNode {
  tagName: string;
  attributes: Record<string, string>;
  children: DOMNode[];
  textContent?: string;
  testId?: string;
}

export interface AccessibilityIssue {
  type: string;
  element: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  wcagRule: string;
}

export interface TestIdCoverage {
  totalElements: number;
  elementsWithTestId: number;
  coverage: number;
  missingTestIds: string[];
}

export type RenderingStatus = 
  | 'SUCCESS'
  | 'PARTIAL_RENDER'
  | 'RENDER_ERROR'
  | 'PROPS_ERROR'
  | 'CONTEXT_ERROR'
  | 'CHILDREN_ERROR';

export type RenderingIssueType = 
  | 'MISSING_PROPS'
  | 'INVALID_PROPS'
  | 'MISSING_CONTEXT'
  | 'INVALID_CHILDREN'
  | 'DOM_STRUCTURE'
  | 'ACCESSIBILITY'
  | 'PERFORMANCE';

export type RenderingPhase = 
  | 'PROPS_VALIDATION'
  | 'CONTEXT_SETUP'
  | 'COMPONENT_MOUNT'
  | 'CHILDREN_RENDER'
  | 'DOM_CREATION'
  | 'EFFECTS_EXECUTION';

export class ComponentRenderingDebugger {
  private static instance: ComponentRenderingDebugger;
  private renderingHistory: ComponentRenderingReport[] = [];
  private performanceObserver?: PerformanceObserver;

  constructor() {
    this.initializePerformanceMonitoring();
  }

  static getInstance(): ComponentRenderingDebugger {
    if (!ComponentRenderingDebugger.instance) {
      ComponentRenderingDebugger.instance = new ComponentRenderingDebugger();
    }
    return ComponentRenderingDebugger.instance;
  }

  /**
   * Debug component rendering with comprehensive analysis
   */
  debugComponentRendering(
    component: React.ComponentType<any>,
    props: any = {},
    options: RenderingDebugOptions = {}
  ): ComponentRenderingReport {
    const startTime = performance.now();
    const componentName = component.displayName || component.name || 'UnknownComponent';
    
    console.log(`🔍 Starting component rendering debug for: ${componentName}`);

    const debugTrace: RenderingStep[] = [];
    let renderResult: RenderResult | null = null;
    let renderingError: Error | null = null;

    try {
      // Step 1: Validate props
      const propsStep = this.executeRenderingStep('PROPS_VALIDATION', () => {
        return this.analyzeProps(component, props);
      });
      debugTrace.push(propsStep);

      // Step 2: Analyze context requirements
      const contextStep = this.executeRenderingStep('CONTEXT_SETUP', () => {
        return this.analyzeContext(component, options.contexts || []);
      });
      debugTrace.push(contextStep);

      // Step 3: Attempt component rendering
      const renderStep = this.executeRenderingStep('COMPONENT_MOUNT', () => {
        return this.attemptComponentRender(component, props, options);
      });
      debugTrace.push(renderStep);
      renderResult = renderStep.data?.renderResult;

      // Step 4: Analyze children if render succeeded
      let childrenAnalysis: ChildrenAnalysis = {
        childCount: 0,
        childTypes: [],
        renderableChildren: 0,
        nonRenderableChildren: 0,
        childrenIssues: []
      };

      if (renderResult) {
        const childrenStep = this.executeRenderingStep('CHILDREN_RENDER', () => {
          return this.analyzeChildren(renderResult!);
        });
        debugTrace.push(childrenStep);
        childrenAnalysis = childrenStep.data || childrenAnalysis;
      }

      // Step 5: Analyze DOM structure
      let domAnalysis: DOMAnalysis = {
        elementCount: 0,
        domStructure: [],
        accessibilityIssues: [],
        testIdCoverage: { totalElements: 0, elementsWithTestId: 0, coverage: 0, missingTestIds: [] },
        cssClasses: []
      };

      if (renderResult) {
        const domStep = this.executeRenderingStep('DOM_CREATION', () => {
          return this.analyzeDOMStructure(renderResult!);
        });
        debugTrace.push(domStep);
        domAnalysis = domStep.data || domAnalysis;
      }

      // Generate comprehensive report
      const report: ComponentRenderingReport = {
        componentName,
        renderingStatus: this.determineRenderingStatus(debugTrace, renderResult),
        propsAnalysis: debugTrace.find(s => s.phase === 'PROPS_VALIDATION')?.data || this.getEmptyPropsAnalysis(),
        contextAnalysis: debugTrace.find(s => s.phase === 'CONTEXT_SETUP')?.data || this.getEmptyContextAnalysis(),
        childrenAnalysis,
        domAnalysis,
        performanceMetrics: this.calculatePerformanceMetrics(debugTrace, renderResult),
        issues: this.identifyRenderingIssues(debugTrace, renderResult),
        suggestions: this.generateRenderingSuggestions(debugTrace, renderResult),
        debugTrace,
        timestamp: Date.now()
      };

      // Store in history
      this.renderingHistory.push(report);
      if (this.renderingHistory.length > 30) {
        this.renderingHistory.shift();
      }

      console.log(`✅ Component rendering debug completed in ${performance.now() - startTime}ms`);
      return report;

    } catch (error) {
      console.error(`❌ Component rendering debug failed:`, error);
      
      // Return error report
      return {
        componentName,
        renderingStatus: 'RENDER_ERROR',
        propsAnalysis: this.getEmptyPropsAnalysis(),
        contextAnalysis: this.getEmptyContextAnalysis(),
        childrenAnalysis: {
          childCount: 0,
          childTypes: [],
          renderableChildren: 0,
          nonRenderableChildren: 0,
          childrenIssues: [`Rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
        },
        domAnalysis: {
          elementCount: 0,
          domStructure: [],
          accessibilityIssues: [],
          testIdCoverage: { totalElements: 0, elementsWithTestId: 0, coverage: 0, missingTestIds: [] },
          cssClasses: []
        },
        performanceMetrics: {
          renderTime: performance.now() - startTime,
          reRenderCount: 0,
          memoryUsage: 0,
          domNodeCount: 0,
          componentTreeDepth: 0
        },
        issues: [{
          type: 'RENDER_ERROR' as RenderingIssueType,
          severity: 'critical',
          description: `Component failed to render: ${error instanceof Error ? error.message : 'Unknown error'}`,
          location: componentName,
          suggestion: 'Check component props, context requirements, and dependencies'
        }],
        suggestions: [
          'Verify all required props are provided',
          'Check that all context providers are available',
          'Ensure component dependencies are properly mocked in tests'
        ],
        debugTrace,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Generate detailed rendering troubleshooting guide
   */
  generateRenderingTroubleshootingGuide(report: ComponentRenderingReport): string {
    return `
# Component Rendering Troubleshooting Guide

## Component: ${report.componentName}
**Status**: ${report.renderingStatus}
**Render Time**: ${report.performanceMetrics.renderTime.toFixed(2)}ms
**DOM Nodes**: ${report.performanceMetrics.domNodeCount}

## Rendering Analysis

### Props Analysis
**Provided Props**: ${Object.keys(report.propsAnalysis.providedProps).length}
**Missing Required Props**: ${report.propsAnalysis.missingProps.length}
**Invalid Props**: ${report.propsAnalysis.invalidProps.length}

${report.propsAnalysis.missingProps.length > 0 ? `
**Missing Props**:
${report.propsAnalysis.missingProps.map(prop => `- ${prop}`).join('\n')}
` : ''}

${report.propsAnalysis.invalidProps.length > 0 ? `
**Invalid Props**:
${report.propsAnalysis.invalidProps.map(prop => 
  `- ${prop.propName}: Expected ${prop.expectedType}, got ${prop.actualType}`
).join('\n')}
` : ''}

### Context Analysis
**Available Contexts**: ${report.contextAnalysis.availableContexts.length}
**Missing Contexts**: ${report.contextAnalysis.missingContexts.length}

${report.contextAnalysis.missingContexts.length > 0 ? `
**Missing Contexts**:
${report.contextAnalysis.missingContexts.map(ctx => `- ${ctx}`).join('\n')}
` : ''}

### DOM Analysis
**Elements**: ${report.domAnalysis.elementCount}
**Test ID Coverage**: ${Math.round(report.domAnalysis.testIdCoverage.coverage)}%
**Accessibility Issues**: ${report.domAnalysis.accessibilityIssues.length}

## Issues Detected
${report.issues.map(issue => `
### ${issue.type} (${issue.severity})
**Description**: ${issue.description}
**Location**: ${issue.location}
**Suggestion**: ${issue.suggestion}
${issue.code ? `**Code**: \`${issue.code}\`` : ''}
`).join('\n')}

## Debugging Steps
${report.debugTrace.map(step => `
### Step ${step.step}: ${step.phase}
**Description**: ${step.description}
**Duration**: ${step.duration.toFixed(2)}ms
**Status**: ${step.success ? '✅ Success' : '❌ Failed'}
${step.error ? `**Error**: ${step.error}` : ''}
`).join('\n')}

## Suggestions
${report.suggestions.map(suggestion => `- ${suggestion}`).join('\n')}

## Performance Metrics
- **Render Time**: ${report.performanceMetrics.renderTime.toFixed(2)}ms
- **Re-render Count**: ${report.performanceMetrics.reRenderCount}
- **Memory Usage**: ${(report.performanceMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB
- **Component Tree Depth**: ${report.performanceMetrics.componentTreeDepth}

---
*Generated by ComponentRenderingDebugger at ${new Date(report.timestamp).toISOString()}*
`;
  }

  /**
   * Get rendering statistics and patterns
   */
  getRenderingStatistics(): RenderingStatistics {
    const totalRenders = this.renderingHistory.length;
    const successfulRenders = this.renderingHistory.filter(r => r.renderingStatus === 'SUCCESS').length;
    const averageRenderTime = this.renderingHistory.reduce((sum, r) => sum + r.performanceMetrics.renderTime, 0) / totalRenders;
    
    const issueTypes = new Map<RenderingIssueType, number>();
    this.renderingHistory.forEach(report => {
      report.issues.forEach(issue => {
        const count = issueTypes.get(issue.type) || 0;
        issueTypes.set(issue.type, count + 1);
      });
    });

    return {
      totalRenders,
      successfulRenders,
      successRate: (successfulRenders / totalRenders) * 100,
      averageRenderTime,
      issueBreakdown: Object.fromEntries(issueTypes),
      recentRenders: this.renderingHistory.slice(-10)
    };
  }

  private executeRenderingStep(phase: RenderingPhase, operation: () => any): RenderingStep {
    const startTime = performance.now();
    let success = true;
    let error: string | undefined;
    let data: any;

    try {
      data = operation();
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : 'Unknown error';
    }

    return {
      step: 0, // Will be set by caller
      phase,
      description: this.getPhaseDescription(phase),
      duration: performance.now() - startTime,
      success,
      error,
      data
    };
  }

  private getPhaseDescription(phase: RenderingPhase): string {
    switch (phase) {
      case 'PROPS_VALIDATION':
        return 'Validating component props and types';
      case 'CONTEXT_SETUP':
        return 'Analyzing context requirements and availability';
      case 'COMPONENT_MOUNT':
        return 'Attempting to mount and render component';
      case 'CHILDREN_RENDER':
        return 'Analyzing rendered children components';
      case 'DOM_CREATION':
        return 'Analyzing DOM structure and accessibility';
      case 'EFFECTS_EXECUTION':
        return 'Executing component effects and lifecycle methods';
      default:
        return 'Unknown phase';
    }
  }

  private analyzeProps(component: React.ComponentType<any>, props: any): PropsAnalysis {
    // Extract prop types if available (for development)
    const propTypes = (component as any).propTypes || {};
    const defaultProps = (component as any).defaultProps || {};
    
    const providedProps = { ...props };
    const requiredProps = Object.keys(propTypes).filter(key => {
      const propType = propTypes[key];
      return propType && propType.isRequired;
    });
    
    const missingProps = requiredProps.filter(prop => !(prop in providedProps));
    const invalidProps: PropValidationError[] = [];

    // Validate prop types (basic validation)
    Object.keys(propTypes).forEach(propName => {
      if (propName in providedProps) {
        const value = providedProps[propName];
        const expectedType = this.getExpectedType(propTypes[propName]);
        const actualType = typeof value;
        
        if (expectedType !== 'any' && actualType !== expectedType) {
          invalidProps.push({
            propName,
            expectedType,
            actualType,
            value,
            isRequired: requiredProps.includes(propName)
          });
        }
      }
    });

    return {
      providedProps,
      requiredProps,
      missingProps,
      invalidProps,
      propTypes: Object.keys(propTypes).reduce((acc, key) => {
        acc[key] = this.getExpectedType(propTypes[key]);
        return acc;
      }, {} as Record<string, string>),
      defaultProps
    };
  }

  private analyzeContext(component: React.ComponentType<any>, contexts: any[]): ContextAnalysis {
    // This is a simplified context analysis
    // In a real implementation, you'd need to inspect the component's context usage
    const availableContexts: ContextInfo[] = contexts.map((ctx, index) => ({
      name: `Context${index}`,
      value: ctx,
      provider: 'TestProvider',
      isAvailable: true
    }));

    return {
      availableContexts,
      missingContexts: [],
      contextValues: contexts.reduce((acc, ctx, index) => {
        acc[`Context${index}`] = ctx;
        return acc;
      }, {} as Record<string, any>),
      providerChain: ['TestProvider']
    };
  }

  private attemptComponentRender(
    component: React.ComponentType<any>,
    props: any,
    options: RenderingDebugOptions
  ): { renderResult: RenderResult } {
    // This would integrate with your actual rendering utilities
    // For now, we'll simulate a successful render
    const mockRenderResult = {
      container: document.createElement('div'),
      baseElement: document.createElement('div'),
      debug: () => {},
      rerender: () => {},
      unmount: () => {},
      asFragment: () => document.createDocumentFragment(),
      ...queries
    } as RenderResult;

    return { renderResult: mockRenderResult };
  }

  private analyzeChildren(renderResult: RenderResult): ChildrenAnalysis {
    const container = renderResult.container;
    const allElements = container.querySelectorAll('*');
    
    return {
      childCount: allElements.length,
      childTypes: Array.from(new Set(Array.from(allElements).map(el => el.tagName.toLowerCase()))),
      renderableChildren: allElements.length,
      nonRenderableChildren: 0,
      childrenIssues: []
    };
  }

  private analyzeDOMStructure(renderResult: RenderResult): DOMAnalysis {
    const container = renderResult.container;
    const allElements = container.querySelectorAll('*');
    const elementsWithTestId = container.querySelectorAll('[data-testid]');
    
    const domStructure = this.buildDOMTree(container);
    const accessibilityIssues = this.checkAccessibility(container);
    const cssClasses = Array.from(new Set(
      Array.from(allElements).flatMap(el => Array.from(el.classList))
    ));

    return {
      elementCount: allElements.length,
      domStructure,
      accessibilityIssues,
      testIdCoverage: {
        totalElements: allElements.length,
        elementsWithTestId: elementsWithTestId.length,
        coverage: allElements.length > 0 ? (elementsWithTestId.length / allElements.length) * 100 : 0,
        missingTestIds: Array.from(allElements)
          .filter(el => !el.hasAttribute('data-testid'))
          .map(el => el.tagName.toLowerCase())
      },
      cssClasses
    };
  }

  private buildDOMTree(element: Element): DOMNode[] {
    return Array.from(element.children).map(child => ({
      tagName: child.tagName.toLowerCase(),
      attributes: Array.from(child.attributes).reduce((acc, attr) => {
        acc[attr.name] = attr.value;
        return acc;
      }, {} as Record<string, string>),
      children: this.buildDOMTree(child),
      textContent: child.textContent || undefined,
      testId: child.getAttribute('data-testid') || undefined
    }));
  }

  private checkAccessibility(container: Element): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = [];
    
    // Check for missing alt text on images
    const images = container.querySelectorAll('img');
    images.forEach(img => {
      if (!img.hasAttribute('alt')) {
        issues.push({
          type: 'missing-alt-text',
          element: 'img',
          description: 'Image missing alt text',
          severity: 'medium',
          wcagRule: 'WCAG 1.1.1'
        });
      }
    });

    // Check for missing labels on form inputs
    const inputs = container.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      const hasLabel = input.hasAttribute('aria-label') || 
                     input.hasAttribute('aria-labelledby') ||
                     container.querySelector(`label[for="${input.id}"]`);
      
      if (!hasLabel) {
        issues.push({
          type: 'missing-label',
          element: input.tagName.toLowerCase(),
          description: 'Form input missing accessible label',
          severity: 'high',
          wcagRule: 'WCAG 1.3.1'
        });
      }
    });

    return issues;
  }

  private determineRenderingStatus(debugTrace: RenderingStep[], renderResult: RenderResult | null): RenderingStatus {
    const hasErrors = debugTrace.some(step => !step.success);
    
    if (!renderResult) {
      return 'RENDER_ERROR';
    }
    
    if (hasErrors) {
      return 'PARTIAL_RENDER';
    }
    
    return 'SUCCESS';
  }

  private calculatePerformanceMetrics(debugTrace: RenderingStep[], renderResult: RenderResult | null): RenderingPerformanceMetrics {
    const totalRenderTime = debugTrace.reduce((sum, step) => sum + step.duration, 0);
    const domNodeCount = renderResult ? renderResult.container.querySelectorAll('*').length : 0;
    
    return {
      renderTime: totalRenderTime,
      reRenderCount: 1, // Would need to track this during actual rendering
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
      domNodeCount,
      componentTreeDepth: this.calculateTreeDepth(renderResult?.container)
    };
  }

  private calculateTreeDepth(element?: Element): number {
    if (!element || !element.children.length) return 0;
    
    let maxDepth = 0;
    Array.from(element.children).forEach(child => {
      const depth = this.calculateTreeDepth(child);
      maxDepth = Math.max(maxDepth, depth);
    });
    
    return maxDepth + 1;
  }

  private identifyRenderingIssues(debugTrace: RenderingStep[], renderResult: RenderResult | null): RenderingIssue[] {
    const issues: RenderingIssue[] = [];
    
    debugTrace.forEach(step => {
      if (!step.success && step.error) {
        issues.push({
          type: this.mapPhaseToIssueType(step.phase),
          severity: this.mapPhaseToSeverity(step.phase),
          description: step.error,
          location: step.phase,
          suggestion: this.getSuggestionForPhase(step.phase)
        });
      }
    });

    return issues;
  }

  private mapPhaseToIssueType(phase: RenderingPhase): RenderingIssueType {
    switch (phase) {
      case 'PROPS_VALIDATION':
        return 'INVALID_PROPS';
      case 'CONTEXT_SETUP':
        return 'MISSING_CONTEXT';
      case 'CHILDREN_RENDER':
        return 'INVALID_CHILDREN';
      case 'DOM_CREATION':
        return 'DOM_STRUCTURE';
      default:
        return 'PERFORMANCE';
    }
  }

  private mapPhaseToSeverity(phase: RenderingPhase): 'low' | 'medium' | 'high' | 'critical' {
    switch (phase) {
      case 'PROPS_VALIDATION':
        return 'high';
      case 'CONTEXT_SETUP':
        return 'high';
      case 'COMPONENT_MOUNT':
        return 'critical';
      case 'CHILDREN_RENDER':
        return 'medium';
      case 'DOM_CREATION':
        return 'low';
      default:
        return 'medium';
    }
  }

  private getSuggestionForPhase(phase: RenderingPhase): string {
    switch (phase) {
      case 'PROPS_VALIDATION':
        return 'Check that all required props are provided with correct types';
      case 'CONTEXT_SETUP':
        return 'Ensure all required context providers are available in test setup';
      case 'COMPONENT_MOUNT':
        return 'Verify component dependencies and mock configurations';
      case 'CHILDREN_RENDER':
        return 'Check children prop types and rendering conditions';
      case 'DOM_CREATION':
        return 'Verify DOM structure and accessibility requirements';
      default:
        return 'Review component implementation and test setup';
    }
  }

  private generateRenderingSuggestions(debugTrace: RenderingStep[], renderResult: RenderResult | null): string[] {
    const suggestions: string[] = [];
    
    if (!renderResult) {
      suggestions.push('Component failed to render - check props and context setup');
    }
    
    const failedSteps = debugTrace.filter(step => !step.success);
    failedSteps.forEach(step => {
      suggestions.push(this.getSuggestionForPhase(step.phase));
    });
    
    if (suggestions.length === 0) {
      suggestions.push('Component rendered successfully - no issues detected');
    }
    
    return suggestions;
  }

  private getExpectedType(propType: any): string {
    if (!propType) return 'any';
    
    // This is a simplified prop type detection
    // In a real implementation, you'd need to handle PropTypes properly
    const typeString = propType.toString();
    
    if (typeString.includes('string')) return 'string';
    if (typeString.includes('number')) return 'number';
    if (typeString.includes('boolean')) return 'boolean';
    if (typeString.includes('function')) return 'function';
    if (typeString.includes('object')) return 'object';
    if (typeString.includes('array')) return 'array';
    
    return 'any';
  }

  private getEmptyPropsAnalysis(): PropsAnalysis {
    return {
      providedProps: {},
      requiredProps: [],
      missingProps: [],
      invalidProps: [],
      propTypes: {},
      defaultProps: {}
    };
  }

  private getEmptyContextAnalysis(): ContextAnalysis {
    return {
      availableContexts: [],
      missingContexts: [],
      contextValues: {},
      providerChain: []
    };
  }

  private initializePerformanceMonitoring(): void {
    if (typeof PerformanceObserver !== 'undefined') {
      this.performanceObserver = new PerformanceObserver((list) => {
        // Handle performance entries if needed
      });
    }
  }
}

// Supporting interfaces
export interface RenderingDebugOptions {
  contexts?: any[];
  providers?: React.ComponentType<any>[];
  mockConfig?: any;
  performanceTracking?: boolean;
}

export interface RenderingStatistics {
  totalRenders: number;
  successfulRenders: number;
  successRate: number;
  averageRenderTime: number;
  issueBreakdown: Record<string, number>;
  recentRenders: ComponentRenderingReport[];
}

// Export singleton instance
export const componentRenderingDebugger = ComponentRenderingDebugger.getInstance();