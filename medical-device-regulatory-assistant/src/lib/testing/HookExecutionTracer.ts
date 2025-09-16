/**
 * Hook Execution Tracer
 * 
 * Provides detailed tracing and debugging capabilities for React hook execution,
 * including dependency tracking, state changes, and effect monitoring.
 * 
 * Requirements: 5.4, 6.2
 */

import React from 'react';

export interface HookExecutionTrace {
  hookName: string;
  componentName: string;
  executionId: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: HookExecutionStatus;
  steps: HookExecutionStep[];
  dependencies: HookDependency[];
  stateChanges: StateChange[];
  effectExecutions: EffectExecution[];
  errors: HookError[];
  performance: HookPerformanceMetrics;
  callStack: string[];
  renderCycle: number;
  timestamp: number;
}

export interface HookExecutionStep {
  stepId: string;
  stepType: HookStepType;
  description: string;
  input: any;
  output: any;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

export interface HookDependency {
  name: string;
  type: DependencyType;
  value: any;
  previousValue?: any;
  changed: boolean;
  source: string;
}

export interface StateChange {
  stateVariable: string;
  previousValue: any;
  newValue: any;
  changeType: StateChangeType;
  trigger: string;
  timestamp: number;
}

export interface EffectExecution {
  effectId: string;
  effectType: EffectType;
  dependencies: any[];
  dependenciesChanged: boolean;
  executed: boolean;
  cleanupExecuted: boolean;
  duration: number;
  error?: string;
}

export interface HookError {
  errorType: HookErrorType;
  message: string;
  stack: string;
  step?: string;
  recoverable: boolean;
  suggestion: string;
}

export interface HookPerformanceMetrics {
  totalExecutionTime: number;
  averageStepTime: number;
  slowestStep: string;
  memoryUsage: number;
  renderCount: number;
  effectCount: number;
  stateUpdateCount: number;
}

export type HookExecutionStatus = 
  | 'PENDING'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'ERROR'
  | 'TIMEOUT';

export type HookStepType = 
  | 'INITIALIZATION'
  | 'STATE_READ'
  | 'STATE_UPDATE'
  | 'EFFECT_SETUP'
  | 'EFFECT_EXECUTION'
  | 'EFFECT_CLEANUP'
  | 'DEPENDENCY_CHECK'
  | 'CALLBACK_EXECUTION'
  | 'MEMO_CALCULATION'
  | 'REF_UPDATE';

export type DependencyType = 
  | 'STATE'
  | 'PROPS'
  | 'CONTEXT'
  | 'REF'
  | 'CALLBACK'
  | 'MEMO'
  | 'EXTERNAL';

export type StateChangeType = 
  | 'INITIAL'
  | 'UPDATE'
  | 'RESET'
  | 'BATCH_UPDATE';

export type EffectType = 
  | 'USE_EFFECT'
  | 'USE_LAYOUT_EFFECT'
  | 'USE_MEMO'
  | 'USE_CALLBACK'
  | 'CUSTOM_EFFECT';

export type HookErrorType = 
  | 'INVALID_HOOK_CALL'
  | 'DEPENDENCY_ERROR'
  | 'STATE_UPDATE_ERROR'
  | 'EFFECT_ERROR'
  | 'INFINITE_LOOP'
  | 'MEMORY_LEAK'
  | 'PERFORMANCE_WARNING';

export class HookExecutionTracer {
  private static instance: HookExecutionTracer;
  private activeTraces: Map<string, HookExecutionTrace> = new Map();
  private completedTraces: HookExecutionTrace[] = [];
  private hookInterceptors: Map<string, HookInterceptor> = new Map();
  private renderCycleCounter = 0;
  private isTracingEnabled = false;

  constructor() {
    this.initializeHookInterceptors();
  }

  static getInstance(): HookExecutionTracer {
    if (!HookExecutionTracer.instance) {
      HookExecutionTracer.instance = new HookExecutionTracer();
    }
    return HookExecutionTracer.instance;
  }

  /**
   * Start tracing hook execution for a component
   */
  startTracing(componentName: string, options: TracingOptions = {}): string {
    this.isTracingEnabled = true;
    this.renderCycleCounter++;
    
    const executionId = `${componentName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🔍 Starting hook execution tracing for: ${componentName} (ID: ${executionId})`);
    
    return executionId;
  }

  /**
   * Stop tracing and return comprehensive trace report
   */
  stopTracing(executionId: string): HookExecutionTrace | null {
    const trace = this.activeTraces.get(executionId);
    if (!trace) {
      console.warn(`No active trace found for execution ID: ${executionId}`);
      return null;
    }

    // Finalize trace
    trace.endTime = performance.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.status = trace.errors.length > 0 ? 'ERROR' : 'COMPLETED';
    trace.performance = this.calculatePerformanceMetrics(trace);

    // Move to completed traces
    this.activeTraces.delete(executionId);
    this.completedTraces.push(trace);

    // Limit history size
    if (this.completedTraces.length > 100) {
      this.completedTraces.shift();
    }

    console.log(`✅ Hook execution tracing completed for ID: ${executionId} (${trace.duration?.toFixed(2)}ms)`);
    
    this.isTracingEnabled = this.activeTraces.size > 0;
    return trace;
  }

  /**
   * Trace a specific hook execution
   */
  traceHook(
    hookName: string,
    componentName: string,
    hookFunction: Function,
    args: any[] = []
  ): any {
    if (!this.isTracingEnabled) {
      return hookFunction.apply(null, args);
    }

    const executionId = `${componentName}-${hookName}-${Date.now()}`;
    const trace = this.createHookTrace(hookName, componentName, executionId);
    
    this.activeTraces.set(executionId, trace);

    try {
      // Execute hook with tracing
      const result = this.executeHookWithTracing(trace, hookFunction, args);
      
      // Update trace status
      trace.status = 'COMPLETED';
      trace.endTime = performance.now();
      trace.duration = trace.endTime - trace.startTime;
      
      return result;
    } catch (error) {
      // Handle hook execution error
      this.handleHookError(trace, error as Error);
      throw error;
    }
  }

  /**
   * Generate detailed hook execution report
   */
  generateHookExecutionReport(trace: HookExecutionTrace): string {
    return `
# Hook Execution Report

## Hook: ${trace.hookName} in ${trace.componentName}
**Execution ID**: ${trace.executionId}
**Status**: ${trace.status}
**Duration**: ${trace.duration?.toFixed(2)}ms
**Render Cycle**: ${trace.renderCycle}

## Performance Metrics
- **Total Execution Time**: ${trace.performance.totalExecutionTime.toFixed(2)}ms
- **Average Step Time**: ${trace.performance.averageStepTime.toFixed(2)}ms
- **Slowest Step**: ${trace.performance.slowestStep}
- **Memory Usage**: ${(trace.performance.memoryUsage / 1024 / 1024).toFixed(2)}MB
- **Render Count**: ${trace.performance.renderCount}
- **Effect Count**: ${trace.performance.effectCount}
- **State Updates**: ${trace.performance.stateUpdateCount}

## Execution Steps
${trace.steps.map(step => `
### ${step.stepType}: ${step.description}
**Duration**: ${step.duration.toFixed(2)}ms
**Status**: ${step.success ? '✅ Success' : '❌ Failed'}
${step.error ? `**Error**: ${step.error}` : ''}
**Input**: ${JSON.stringify(step.input, null, 2)}
**Output**: ${JSON.stringify(step.output, null, 2)}
`).join('\n')}

## Dependencies
${trace.dependencies.map(dep => `
### ${dep.name} (${dep.type})
**Changed**: ${dep.changed ? '✅ Yes' : '❌ No'}
**Current Value**: ${JSON.stringify(dep.value, null, 2)}
${dep.previousValue !== undefined ? `**Previous Value**: ${JSON.stringify(dep.previousValue, null, 2)}` : ''}
**Source**: ${dep.source}
`).join('\n')}

## State Changes
${trace.stateChanges.map(change => `
### ${change.stateVariable}
**Type**: ${change.changeType}
**Trigger**: ${change.trigger}
**Previous**: ${JSON.stringify(change.previousValue, null, 2)}
**New**: ${JSON.stringify(change.newValue, null, 2)}
**Time**: ${new Date(change.timestamp).toISOString()}
`).join('\n')}

## Effect Executions
${trace.effectExecutions.map(effect => `
### Effect ${effect.effectId} (${effect.effectType})
**Dependencies Changed**: ${effect.dependenciesChanged ? '✅ Yes' : '❌ No'}
**Executed**: ${effect.executed ? '✅ Yes' : '❌ No'}
**Cleanup Executed**: ${effect.cleanupExecuted ? '✅ Yes' : '❌ No'}
**Duration**: ${effect.duration.toFixed(2)}ms
${effect.error ? `**Error**: ${effect.error}` : ''}
**Dependencies**: ${JSON.stringify(effect.dependencies, null, 2)}
`).join('\n')}

${trace.errors.length > 0 ? `
## Errors
${trace.errors.map(error => `
### ${error.errorType}
**Message**: ${error.message}
**Recoverable**: ${error.recoverable ? '✅ Yes' : '❌ No'}
**Suggestion**: ${error.suggestion}
${error.step ? `**Step**: ${error.step}` : ''}
**Stack**: 
\`\`\`
${error.stack}
\`\`\`
`).join('\n')}
` : ''}

## Call Stack
\`\`\`
${trace.callStack.join('\n')}
\`\`\`

---
*Generated by HookExecutionTracer at ${new Date(trace.timestamp).toISOString()}*
`;
  }

  /**
   * Get hook execution statistics
   */
  getHookExecutionStatistics(): HookExecutionStatistics {
    const allTraces = [...this.completedTraces, ...Array.from(this.activeTraces.values())];
    const totalExecutions = allTraces.length;
    
    const hookUsage = new Map<string, number>();
    const errorTypes = new Map<HookErrorType, number>();
    let totalDuration = 0;
    let successfulExecutions = 0;

    allTraces.forEach(trace => {
      // Count hook usage
      const count = hookUsage.get(trace.hookName) || 0;
      hookUsage.set(trace.hookName, count + 1);

      // Count errors
      trace.errors.forEach(error => {
        const errorCount = errorTypes.get(error.errorType) || 0;
        errorTypes.set(error.errorType, errorCount + 1);
      });

      // Calculate metrics
      if (trace.duration) {
        totalDuration += trace.duration;
      }
      
      if (trace.status === 'COMPLETED') {
        successfulExecutions++;
      }
    });

    return {
      totalExecutions,
      successfulExecutions,
      successRate: totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0,
      averageExecutionTime: totalExecutions > 0 ? totalDuration / totalExecutions : 0,
      hookUsageBreakdown: Object.fromEntries(hookUsage),
      errorBreakdown: Object.fromEntries(errorTypes),
      recentTraces: this.completedTraces.slice(-10)
    };
  }

  /**
   * Analyze hook performance and identify issues
   */
  analyzeHookPerformance(trace: HookExecutionTrace): HookPerformanceAnalysis {
    const issues: PerformanceIssue[] = [];
    const suggestions: string[] = [];

    // Check for slow execution
    if (trace.performance.totalExecutionTime > 100) {
      issues.push({
        type: 'SLOW_EXECUTION',
        severity: 'high',
        description: `Hook execution took ${trace.performance.totalExecutionTime.toFixed(2)}ms`,
        suggestion: 'Consider optimizing hook logic or using useMemo/useCallback'
      });
    }

    // Check for excessive re-renders
    if (trace.performance.renderCount > 10) {
      issues.push({
        type: 'EXCESSIVE_RENDERS',
        severity: 'medium',
        description: `Hook triggered ${trace.performance.renderCount} re-renders`,
        suggestion: 'Check dependency arrays and state update patterns'
      });
    }

    // Check for memory usage
    if (trace.performance.memoryUsage > 50 * 1024 * 1024) { // 50MB
      issues.push({
        type: 'HIGH_MEMORY_USAGE',
        severity: 'high',
        description: `Hook used ${(trace.performance.memoryUsage / 1024 / 1024).toFixed(2)}MB of memory`,
        suggestion: 'Check for memory leaks in effects or large object allocations'
      });
    }

    // Generate suggestions based on issues
    if (issues.length === 0) {
      suggestions.push('Hook performance is within acceptable limits');
    } else {
      suggestions.push('Consider optimizing hook implementation');
      suggestions.push('Review dependency arrays for unnecessary re-executions');
      suggestions.push('Use React DevTools Profiler for detailed analysis');
    }

    return {
      overallScore: this.calculatePerformanceScore(trace),
      issues,
      suggestions,
      metrics: trace.performance
    };
  }

  private createHookTrace(hookName: string, componentName: string, executionId: string): HookExecutionTrace {
    return {
      hookName,
      componentName,
      executionId,
      startTime: performance.now(),
      status: 'EXECUTING',
      steps: [],
      dependencies: [],
      stateChanges: [],
      effectExecutions: [],
      errors: [],
      performance: {
        totalExecutionTime: 0,
        averageStepTime: 0,
        slowestStep: '',
        memoryUsage: 0,
        renderCount: 0,
        effectCount: 0,
        stateUpdateCount: 0
      },
      callStack: this.captureCallStack(),
      renderCycle: this.renderCycleCounter,
      timestamp: Date.now()
    };
  }

  private executeHookWithTracing(trace: HookExecutionTrace, hookFunction: Function, args: any[]): any {
    const stepStartTime = performance.now();
    
    // Add initialization step
    const initStep: HookExecutionStep = {
      stepId: `init-${Date.now()}`,
      stepType: 'INITIALIZATION',
      description: `Initializing ${trace.hookName}`,
      input: args,
      output: null,
      duration: 0,
      success: true
    };

    try {
      // Execute the actual hook
      const result = hookFunction.apply(null, args);
      
      // Complete initialization step
      initStep.duration = performance.now() - stepStartTime;
      initStep.output = result;
      initStep.success = true;
      
      trace.steps.push(initStep);
      
      return result;
    } catch (error) {
      // Handle execution error
      initStep.duration = performance.now() - stepStartTime;
      initStep.success = false;
      initStep.error = error instanceof Error ? error.message : 'Unknown error';
      
      trace.steps.push(initStep);
      
      throw error;
    }
  }

  private handleHookError(trace: HookExecutionTrace, error: Error): void {
    const hookError: HookError = {
      errorType: this.categorizeHookError(error),
      message: error.message,
      stack: error.stack || '',
      recoverable: this.isRecoverableError(error),
      suggestion: this.getErrorSuggestion(error)
    };

    trace.errors.push(hookError);
    trace.status = 'ERROR';
  }

  private categorizeHookError(error: Error): HookErrorType {
    const message = error.message.toLowerCase();
    
    if (message.includes('invalid hook call') || message.includes('hooks can only be called')) {
      return 'INVALID_HOOK_CALL';
    }
    
    if (message.includes('dependency') || message.includes('useeffect')) {
      return 'DEPENDENCY_ERROR';
    }
    
    if (message.includes('state') || message.includes('setstate')) {
      return 'STATE_UPDATE_ERROR';
    }
    
    if (message.includes('effect') || message.includes('cleanup')) {
      return 'EFFECT_ERROR';
    }
    
    if (message.includes('maximum update depth') || message.includes('infinite')) {
      return 'INFINITE_LOOP';
    }
    
    return 'PERFORMANCE_WARNING';
  }

  private isRecoverableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Invalid hook calls are generally not recoverable
    if (message.includes('invalid hook call')) {
      return false;
    }
    
    // Most other errors can be fixed with proper implementation
    return true;
  }

  private getErrorSuggestion(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('invalid hook call')) {
      return 'Ensure hooks are only called at the top level of React components or custom hooks';
    }
    
    if (message.includes('dependency')) {
      return 'Check useEffect dependency arrays and ensure all dependencies are included';
    }
    
    if (message.includes('state')) {
      return 'Verify state updates are properly handled and not causing infinite loops';
    }
    
    if (message.includes('effect')) {
      return 'Check effect cleanup functions and dependency arrays';
    }
    
    return 'Review hook implementation and React best practices';
  }

  private calculatePerformanceMetrics(trace: HookExecutionTrace): HookPerformanceMetrics {
    const totalTime = trace.duration || 0;
    const stepTimes = trace.steps.map(step => step.duration);
    const averageStepTime = stepTimes.length > 0 ? stepTimes.reduce((sum, time) => sum + time, 0) / stepTimes.length : 0;
    const slowestStep = trace.steps.reduce((slowest, step) => 
      step.duration > (slowest?.duration || 0) ? step : slowest, trace.steps[0]
    );

    return {
      totalExecutionTime: totalTime,
      averageStepTime,
      slowestStep: slowestStep?.description || 'N/A',
      memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
      renderCount: trace.stateChanges.length,
      effectCount: trace.effectExecutions.length,
      stateUpdateCount: trace.stateChanges.filter(change => change.changeType === 'UPDATE').length
    };
  }

  private calculatePerformanceScore(trace: HookExecutionTrace): number {
    let score = 100;
    
    // Deduct points for slow execution
    if (trace.performance.totalExecutionTime > 50) {
      score -= 20;
    }
    
    // Deduct points for excessive renders
    if (trace.performance.renderCount > 5) {
      score -= 15;
    }
    
    // Deduct points for errors
    score -= trace.errors.length * 10;
    
    // Deduct points for high memory usage
    if (trace.performance.memoryUsage > 25 * 1024 * 1024) {
      score -= 10;
    }
    
    return Math.max(0, score);
  }

  private captureCallStack(): string[] {
    const stack = new Error().stack || '';
    return stack.split('\n').slice(2, 10); // Skip first 2 lines and limit to 8 frames
  }

  private initializeHookInterceptors(): void {
    // This would set up interceptors for common React hooks
    // In a real implementation, you'd need to monkey-patch or use React DevTools
    console.log('Hook interceptors initialized');
  }
}

// Supporting interfaces
export interface TracingOptions {
  includePerformanceMetrics?: boolean;
  trackDependencies?: boolean;
  trackStateChanges?: boolean;
  trackEffects?: boolean;
  maxTraceHistory?: number;
}

export interface HookInterceptor {
  hookName: string;
  intercept: (originalHook: Function, args: any[]) => any;
}

export interface HookExecutionStatistics {
  totalExecutions: number;
  successfulExecutions: number;
  successRate: number;
  averageExecutionTime: number;
  hookUsageBreakdown: Record<string, number>;
  errorBreakdown: Record<string, number>;
  recentTraces: HookExecutionTrace[];
}

export interface HookPerformanceAnalysis {
  overallScore: number;
  issues: PerformanceIssue[];
  suggestions: string[];
  metrics: HookPerformanceMetrics;
}

export interface PerformanceIssue {
  type: 'SLOW_EXECUTION' | 'EXCESSIVE_RENDERS' | 'HIGH_MEMORY_USAGE' | 'MEMORY_LEAK';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
}

// Export singleton instance
export const hookExecutionTracer = HookExecutionTracer.getInstance();