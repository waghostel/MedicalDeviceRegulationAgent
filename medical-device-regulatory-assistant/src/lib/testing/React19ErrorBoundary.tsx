/**
 * React 19 Error Boundary Component
 * Specifically designed to handle React 19 AggregateError patterns in test environments
 * Provides detailed error reporting, debugging information, and fallback UI for test error states
 */

import React, { ReactNode, Component, ErrorInfo } from 'react';

// Enhanced error reporting interfaces
export interface TestErrorReport {
  type: 'AggregateError' | 'Error' | 'TypeError' | 'ReferenceError';
  totalErrors?: number;
  categories?: ErrorCategory[];
  suggestions?: string[];
  recoverable: boolean;
  timestamp: number;
  componentStack?: string;
  errorBoundary: string;
  // Enhanced Task 3.1 properties
  performanceImpact?: {
    errorHandlingTime: number;
    memoryImpact: number;
    performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    optimizationSuggestions: string[];
  };
  memoryLeakAnalysis?: {
    hasLeak: boolean;
    leakSeverity: 'none' | 'minor' | 'moderate' | 'severe';
    leakSources: string[];
    recommendations: string[];
  };
  recoveryAnalysis?: {
    canRecover: boolean;
    recoveryStrategy: string;
    estimatedRecoveryTime: number;
    fallbackOptions: string[];
  };
}

export interface ErrorCategory {
  type: string;
  message: string;
  stack?: string;
  component?: string;
  hook?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source?: 'react' | 'hook' | 'component' | 'provider' | 'unknown';
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error | AggregateError;
  errorInfo?: ErrorInfo;
  retryCount: number;
  maxRetries: number;
  errorReport?: TestErrorReport;
  debugMode: boolean;
}

export interface React19ErrorBoundaryProps {
  children: ReactNode;
  onError?: (
    error: Error | AggregateError,
    errorInfo: ErrorInfo,
    report: TestErrorReport
  ) => void;
  fallback?: React.ComponentType<{
    error: Error | AggregateError;
    errorReport: TestErrorReport;
    retry: () => void;
    canRetry: boolean;
  }>;
  resetOnPropsChange?: boolean;
  maxRetries?: number;
  debugMode?: boolean;
  testName?: string;
  componentName?: string;
}

/**
 * Enhanced React 19 Error Handler
 * Provides comprehensive error analysis, categorization, recovery mechanisms, and detailed debugging for test environments
 *
 * Task 3.1 Enhancements:
 * - Enhanced AggregateError categorization and analysis
 * - Advanced error recovery and retry mechanisms
 * - Detailed error reporting for debugging
 * - Performance impact tracking
 * - Memory leak detection
 */
export class React19ErrorHandler {
  /**
   * Handle React 19 AggregateError with detailed analysis
   */
  static handleAggregateError(
    error: AggregateError,
    errorInfo?: ErrorInfo,
    context?: { testName?: string; componentName?: string }
  ): TestErrorReport {
    const individualErrors = error.errors || [];
    const categorizedErrors = this.categorizeErrors(
      individualErrors,
      errorInfo
    );

    return {
      type: 'AggregateError',
      totalErrors: individualErrors.length,
      categories: categorizedErrors,
      suggestions: this.generateSuggestions(categorizedErrors),
      recoverable: this.isRecoverable(categorizedErrors),
      timestamp: Date.now(),
      componentStack: errorInfo?.componentStack || undefined,
      errorBoundary: context?.componentName || 'React19ErrorBoundary',
    };
  }

  /**
   * Handle standard Error with enhanced analysis
   */
  static handleStandardError(
    error: Error,
    errorInfo?: ErrorInfo,
    context?: { testName?: string; componentName?: string }
  ): TestErrorReport {
    const category = this.categorizeError(error, errorInfo);
    const errorType = this.getErrorType(error);

    return {
      type: errorType as
        | 'AggregateError'
        | 'Error'
        | 'TypeError'
        | 'ReferenceError',
      totalErrors: 1,
      categories: [category],
      suggestions: this.generateSuggestions([category]),
      recoverable: this.isRecoverable([category]),
      timestamp: Date.now(),
      componentStack: errorInfo?.componentStack || undefined,
      errorBoundary: context?.componentName || 'React19ErrorBoundary',
    };
  }

  /**
   * Categorize multiple errors from AggregateError
   */
  static categorizeErrors(
    errors: Error[],
    errorInfo?: ErrorInfo
  ): ErrorCategory[] {
    return errors.map((error) => this.categorizeError(error, errorInfo));
  }

  /**
   * Categorize a single error with enhanced analysis
   */
  static categorizeError(error: Error, errorInfo?: ErrorInfo): ErrorCategory {
    const type = this.getErrorType(error);
    const severity = this.getErrorSeverity(error);
    const source = this.getErrorSource(error, errorInfo);

    return {
      type,
      message: error.message,
      stack: error.stack,
      component: this.extractComponent(error, errorInfo),
      hook: this.extractHook(error),
      severity,
      source,
    };
  }

  /**
   * Determine error type from error object
   */
  static getErrorType(error: Error): string {
    // Check for specific React 19 patterns
    if (
      error.message.includes('useToast') ||
      error.message.includes('is not a function')
    ) {
      return 'HookMockError';
    }
    if (
      error.message.includes('Provider') ||
      error.message.includes('Context')
    ) {
      return 'ProviderError';
    }
    if (
      error.message.includes('render') ||
      error.message.includes('Cannot read properties')
    ) {
      return 'RenderError';
    }
    if (
      error.message.includes('localStorage') ||
      error.message.includes('sessionStorage')
    ) {
      return 'StorageError';
    }
    if (
      error.message.includes('timer') ||
      error.message.includes('setTimeout')
    ) {
      return 'TimerError';
    }

    // Use error constructor name if available
    if (error.constructor.name && error.constructor.name !== 'Error') {
      return error.constructor.name;
    }

    return 'UnknownError';
  }

  /**
   * Determine error severity level
   */
  static getErrorSeverity(
    error: Error
  ): 'low' | 'medium' | 'high' | 'critical' {
    const message = error.message.toLowerCase();

    // Critical errors that prevent test execution
    if (
      message.includes('cannot read properties') ||
      message.includes('is not a function')
    ) {
      return 'critical';
    }

    // High severity errors that affect core functionality
    if (
      message.includes('provider') ||
      message.includes('context') ||
      message.includes('render')
    ) {
      return 'high';
    }

    // Medium severity errors that affect specific features
    if (
      message.includes('hook') ||
      message.includes('mock') ||
      message.includes('storage')
    ) {
      return 'medium';
    }

    // Low severity errors that are warnings or minor issues
    return 'low';
  }

  /**
   * Determine error source
   */
  static getErrorSource(
    error: Error,
    errorInfo?: ErrorInfo
  ): 'react' | 'hook' | 'component' | 'provider' | 'unknown' {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';
    const componentStack = errorInfo?.componentStack?.toLowerCase() || '';

    if (message.includes('hook') || message.includes('use')) {
      return 'hook';
    }
    if (message.includes('provider') || message.includes('context')) {
      return 'provider';
    }
    if (stack.includes('react') || componentStack.includes('react')) {
      return 'react';
    }
    if (componentStack.includes('component') || stack.includes('component')) {
      return 'component';
    }

    return 'unknown';
  }

  /**
   * Extract component name from error or error info
   */
  static extractComponent(
    error: Error,
    errorInfo?: ErrorInfo
  ): string | undefined {
    // Try to extract from component stack first
    if (errorInfo?.componentStack) {
      const componentMatch = errorInfo.componentStack.match(/at (\w+)/);
      if (componentMatch) {
        return componentMatch[1];
      }
    }

    // Fall back to error stack
    const stack = error.stack || '';
    const componentMatch = stack.match(
      /at (\w+Component|\w+Form|\w+Provider|\w+Boundary)/
    );
    return componentMatch ? componentMatch[1] : undefined;
  }

  /**
   * Extract hook name from error message
   */
  static extractHook(error: Error): string | undefined {
    const message = error.message || '';
    const hookMatch = message.match(/use\w+/i);
    return hookMatch ? hookMatch[0] : undefined;
  }

  /**
   * Generate actionable suggestions based on error categories
   */
  static generateSuggestions(categories: ErrorCategory[]): string[] {
    const suggestions: string[] = [];
    const seenSuggestions = new Set<string>();

    categories.forEach((category) => {
      let categorySuggestions: string[] = [];

      switch (category.type) {
        case 'HookMockError':
          categorySuggestions = [
            'Check hook mock configuration in test setup',
            'Ensure all required hook methods are properly mocked',
            'Verify hook dependencies are correctly imported',
            'Review useToast mock structure for completeness',
          ];
          break;

        case 'RenderError':
          categorySuggestions = [
            'Verify component props are correctly provided',
            'Check provider setup in renderWithProviders',
            'Ensure all required context providers are included',
            'Review component dependencies and imports',
          ];
          break;

        case 'ProviderError':
          categorySuggestions = [
            'Ensure all required providers are included in test wrapper',
            'Check provider order and nesting structure',
            'Verify provider props and initial values',
            'Review context provider configuration',
          ];
          break;

        case 'StorageError':
          categorySuggestions = [
            'Mock localStorage/sessionStorage in test setup',
            'Check storage mock configuration',
            'Verify storage cleanup in test teardown',
            'Review auto-save functionality mocks',
          ];
          break;

        case 'TimerError':
          categorySuggestions = [
            'Use jest.useFakeTimers() for timer-dependent tests',
            'Check timer mock configuration',
            'Verify timer cleanup in test teardown',
            'Review debounced functionality mocks',
          ];
          break;

        default:
          categorySuggestions = [
            'Review error stack trace for specific component issues',
            'Check test setup and mock configuration',
            'Verify component dependencies and imports',
            'Consider adding error boundary for better error handling',
          ];
      }

      // Add unique suggestions
      categorySuggestions.forEach((suggestion) => {
        if (!seenSuggestions.has(suggestion)) {
          seenSuggestions.add(suggestion);
          suggestions.push(suggestion);
        }
      });
    });

    return suggestions;
  }

  /**
   * Determine if errors are recoverable
   */
  static isRecoverable(categories: ErrorCategory[]): boolean {
    // Consider error recoverable if all errors are medium severity or lower
    // OR are primarily mock-related (even if high severity)
    return categories.every((cat) => {
      const isLowSeverity = ['low', 'medium'].includes(cat.severity);
      const isMockRelated = [
        'HookMockError',
        'ProviderError',
        'StorageError',
        'TimerError',
      ].includes(cat.type);
      return isLowSeverity || isMockRelated;
    });
  }

  /**
   * Enhanced Error Recovery System
   * Attempts to recover from errors using various strategies
   */
  static attemptErrorRecovery(
    error: Error | AggregateError,
    errorInfo: ErrorInfo,
    retryCount: number = 0,
    maxRetries: number = 3
  ): {
    canRecover: boolean;
    recoveryStrategy: string;
    estimatedRecoveryTime: number;
    fallbackOptions: string[];
  } {
    const report =
      error instanceof AggregateError
        ? this.handleAggregateError(error, errorInfo)
        : this.handleStandardError(error, errorInfo);

    // Determine recovery strategy based on error categories
    const recoveryStrategies = this.analyzeRecoveryStrategies(
      report.categories || []
    );
    const primaryStrategy = recoveryStrategies[0];

    return {
      canRecover: report.recoverable && retryCount < maxRetries,
      recoveryStrategy: primaryStrategy?.strategy || 'manual-intervention',
      estimatedRecoveryTime: primaryStrategy?.estimatedTime || 0,
      fallbackOptions: recoveryStrategies.slice(1).map((s) => s.strategy),
    };
  }

  /**
   * Analyze possible recovery strategies for error categories
   */
  static analyzeRecoveryStrategies(categories: ErrorCategory[]): Array<{
    strategy: string;
    estimatedTime: number;
    confidence: number;
  }> {
    const strategies: Array<{
      strategy: string;
      estimatedTime: number;
      confidence: number;
    }> = [];

    categories.forEach((category) => {
      switch (category.type) {
        case 'HookMockError':
          strategies.push({
            strategy: 'reinitialize-hook-mocks',
            estimatedTime: 100,
            confidence: 0.8,
          });
          break;

        case 'ProviderError':
          strategies.push({
            strategy: 'reset-provider-context',
            estimatedTime: 200,
            confidence: 0.7,
          });
          break;

        case 'RenderError':
          strategies.push({
            strategy: 'force-component-remount',
            estimatedTime: 150,
            confidence: 0.6,
          });
          break;

        case 'StorageError':
          strategies.push({
            strategy: 'clear-storage-mocks',
            estimatedTime: 50,
            confidence: 0.9,
          });
          break;

        case 'TimerError':
          strategies.push({
            strategy: 'reset-timer-mocks',
            estimatedTime: 50,
            confidence: 0.9,
          });
          break;

        default:
          strategies.push({
            strategy: 'component-isolation',
            estimatedTime: 300,
            confidence: 0.4,
          });
      }
    });

    // Sort by confidence and estimated time
    return strategies.sort((a, b) => {
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }
      return a.estimatedTime - b.estimatedTime;
    });
  }

  /**
   * Execute error recovery strategy
   */
  static async executeRecoveryStrategy(
    strategy: string,
    context?: {
      mockRegistry?: any;
      componentRef?: React.RefObject<any>;
      testName?: string;
    }
  ): Promise<{
    success: boolean;
    message: string;
    nextSteps?: string[];
  }> {
    try {
      switch (strategy) {
        case 'reinitialize-hook-mocks':
          return await this.reinitializeHookMocks(context);

        case 'reset-provider-context':
          return await this.resetProviderContext(context);

        case 'force-component-remount':
          return await this.forceComponentRemount(context);

        case 'clear-storage-mocks':
          return await this.clearStorageMocks(context);

        case 'reset-timer-mocks':
          return await this.resetTimerMocks(context);

        case 'component-isolation':
          return await this.isolateComponent(context);

        default:
          return {
            success: false,
            message: `Unknown recovery strategy: ${strategy}`,
            nextSteps: [
              'Try manual intervention',
              'Check error logs',
              'Contact support',
            ],
          };
      }
    } catch (recoveryError) {
      return {
        success: false,
        message: `Recovery strategy failed: ${recoveryError instanceof Error ? recoveryError.message : 'Unknown error'}`,
        nextSteps: [
          'Try alternative recovery strategy',
          'Manual intervention required',
        ],
      };
    }
  }

  /**
   * Recovery Strategy Implementations
   */
  private static async reinitializeHookMocks(
    context?: any
  ): Promise<{ success: boolean; message: string; nextSteps?: string[] }> {
    // Clear existing hook mocks
    if (global.__GLOBAL_MOCK_REGISTRY?.hooks) {
      global.__GLOBAL_MOCK_REGISTRY.hooks.clear();
    }

    // Reinitialize common hook mocks
    const { setupUseToastMock } = await import('./setup-use-toast-mock');
    const { setupEnhancedFormMocks } = await import(
      './setup-enhanced-form-mocks'
    );

    try {
      setupUseToastMock();
      setupEnhancedFormMocks();

      return {
        success: true,
        message: 'Hook mocks reinitialized successfully',
        nextSteps: ['Retry component render', 'Verify hook functionality'],
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to reinitialize hook mocks: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nextSteps: ['Check mock configuration', 'Manual mock setup required'],
      };
    }
  }

  private static async resetProviderContext(
    context?: any
  ): Promise<{ success: boolean; message: string; nextSteps?: string[] }> {
    // Clear provider-related mocks
    if (global.__GLOBAL_MOCK_REGISTRY?.providers) {
      global.__GLOBAL_MOCK_REGISTRY.providers.clear();
    }

    return {
      success: true,
      message: 'Provider context reset successfully',
      nextSteps: [
        'Remount component with fresh providers',
        'Verify context values',
      ],
    };
  }

  private static async forceComponentRemount(
    context?: any
  ): Promise<{ success: boolean; message: string; nextSteps?: string[] }> {
    // Force component remount by clearing component cache
    if (context?.componentRef?.current) {
      // Trigger component unmount/remount cycle
      const component = context.componentRef.current;
      if (component && typeof component.forceUpdate === 'function') {
        component.forceUpdate();
      }
    }

    return {
      success: true,
      message: 'Component remount initiated',
      nextSteps: [
        'Wait for component to remount',
        'Check for persistent errors',
      ],
    };
  }

  private static async clearStorageMocks(
    context?: any
  ): Promise<{ success: boolean; message: string; nextSteps?: string[] }> {
    // Clear localStorage and sessionStorage mocks
    if (global.localStorage?.clear) {
      global.localStorage.clear();
    }
    if (global.sessionStorage?.clear) {
      global.sessionStorage.clear();
    }

    return {
      success: true,
      message: 'Storage mocks cleared successfully',
      nextSteps: [
        'Retry storage-dependent operations',
        'Verify storage functionality',
      ],
    };
  }

  private static async resetTimerMocks(
    context?: any
  ): Promise<{ success: boolean; message: string; nextSteps?: string[] }> {
    // Reset timer mocks
    if (jest.isMockFunction(setTimeout)) {
      jest.useRealTimers();
      jest.useFakeTimers();
    }

    return {
      success: true,
      message: 'Timer mocks reset successfully',
      nextSteps: [
        'Retry timer-dependent operations',
        'Verify timer functionality',
      ],
    };
  }

  private static async isolateComponent(
    context?: unknown
  ): Promise<{ success: boolean; message: string; nextSteps?: string[] }> {
    // Isolate component by clearing all external dependencies
    if (global.__ENHANCED_CLEANUP) {
      global.__ENHANCED_CLEANUP();
    }

    return {
      success: true,
      message: 'Component isolated from external dependencies',
      nextSteps: [
        'Render component in minimal environment',
        'Gradually add dependencies',
      ],
    };
  }

  /**
   * Enhanced Performance Impact Analysis
   */
  static analyzePerformanceImpact(
    error: Error | AggregateError,
    startTime: number,
    memoryBefore: number
  ): {
    errorHandlingTime: number;
    memoryImpact: number;
    performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    optimizationSuggestions: string[];
  } {
    const errorHandlingTime = performance.now() - startTime;
    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryImpact = memoryAfter - memoryBefore;

    // Grade performance impact
    let performanceGrade: 'A' | 'B' | 'C' | 'D' | 'F' = 'A';
    const suggestions: string[] = [];

    if (errorHandlingTime > 100) {
      performanceGrade = 'C';
      suggestions.push('Error handling is taking too long (>100ms)');
    }
    if (errorHandlingTime > 500) {
      performanceGrade = 'F';
      suggestions.push('Critical: Error handling is blocking (>500ms)');
    }
    if (memoryImpact > 10 * 1024 * 1024) {
      // 10MB
      performanceGrade = performanceGrade === 'A' ? 'B' : 'D';
      suggestions.push('High memory usage during error handling');
    }
    if (memoryImpact > 50 * 1024 * 1024) {
      // 50MB
      performanceGrade = 'F';
      suggestions.push('Critical: Memory leak detected during error handling');
    }

    if (suggestions.length === 0) {
      suggestions.push('Error handling performance is optimal');
    }

    return {
      errorHandlingTime,
      memoryImpact,
      performanceGrade,
      optimizationSuggestions: suggestions,
    };
  }

  /**
   * Memory Leak Detection for Error Handling
   */
  static detectMemoryLeaks(
    beforeMemory: NodeJS.MemoryUsage,
    afterMemory: NodeJS.MemoryUsage,
    errorCount: number
  ): {
    hasLeak: boolean;
    leakSeverity: 'none' | 'minor' | 'moderate' | 'severe';
    leakSources: string[];
    recommendations: string[];
  } {
    const heapDelta = afterMemory.heapUsed - beforeMemory.heapUsed;
    const externalDelta = afterMemory.external - beforeMemory.external;

    // Calculate per-error memory impact
    const memoryPerError = errorCount > 0 ? heapDelta / errorCount : heapDelta;

    let hasLeak = false;
    let leakSeverity: 'none' | 'minor' | 'moderate' | 'severe' = 'none';
    const leakSources: string[] = [];
    const recommendations: string[] = [];

    // Detect heap memory leaks
    if (memoryPerError > 1024 * 1024) {
      // 1MB per error
      hasLeak = true;
      leakSeverity = 'severe';
      leakSources.push('Heap memory not being released after error handling');
      recommendations.push('Review error boundary cleanup logic');
      recommendations.push('Check for retained references in error handlers');
    } else if (memoryPerError > 100 * 1024) {
      // 100KB per error
      hasLeak = true;
      leakSeverity = 'moderate';
      leakSources.push('Moderate heap memory retention');
      recommendations.push('Optimize error object cleanup');
    } else if (memoryPerError > 10 * 1024) {
      // 10KB per error
      hasLeak = true;
      leakSeverity = 'minor';
      leakSources.push('Minor heap memory retention');
      recommendations.push('Consider more aggressive cleanup');
    }

    // Detect external memory leaks
    if (externalDelta > 5 * 1024 * 1024) {
      // 5MB
      hasLeak = true;
      if (leakSeverity === 'none') leakSeverity = 'moderate';
      leakSources.push(
        'External memory (buffers, native objects) not released'
      );
      recommendations.push('Check for unreleased external resources');
    }

    if (!hasLeak) {
      recommendations.push('Memory usage is within acceptable limits');
    }

    return {
      hasLeak,
      leakSeverity,
      leakSources,
      recommendations,
    };
  }

  /**
   * Generate enhanced detailed debug information with performance and memory analysis
   */
  static generateDebugInfo(
    error: Error | AggregateError,
    errorInfo: ErrorInfo,
    report: TestErrorReport,
    performanceData?: {
      errorHandlingTime: number;
      memoryImpact: number;
      performanceGrade: string;
    },
    memoryLeakData?: {
      hasLeak: boolean;
      leakSeverity: string;
      leakSources: string[];
    }
  ): string {
    const debugLines: string[] = [];

    debugLines.push('=== Enhanced React 19 Error Boundary Debug Report ===');
    debugLines.push(`Timestamp: ${new Date(report.timestamp).toISOString()}`);
    debugLines.push(`Error Type: ${report.type}`);
    debugLines.push(`Total Errors: ${report.totalErrors || 1}`);
    debugLines.push(`Recoverable: ${report.recoverable ? 'Yes' : 'No'}`);
    debugLines.push(`Error Boundary: ${report.errorBoundary}`);
    debugLines.push('');

    // Performance Analysis Section
    if (performanceData) {
      debugLines.push('=== Performance Impact Analysis ===');
      debugLines.push(
        `Error Handling Time: ${performanceData.errorHandlingTime.toFixed(2)}ms`
      );
      debugLines.push(
        `Memory Impact: ${(performanceData.memoryImpact / 1024 / 1024).toFixed(2)}MB`
      );
      debugLines.push(`Performance Grade: ${performanceData.performanceGrade}`);
      debugLines.push('');
    }

    // Memory Leak Detection Section
    if (memoryLeakData) {
      debugLines.push('=== Memory Leak Analysis ===');
      debugLines.push(
        `Memory Leak Detected: ${memoryLeakData.hasLeak ? 'Yes' : 'No'}`
      );
      debugLines.push(`Leak Severity: ${memoryLeakData.leakSeverity}`);
      if (memoryLeakData.leakSources.length > 0) {
        debugLines.push('Leak Sources:');
        memoryLeakData.leakSources.forEach((source, index) => {
          debugLines.push(`  ${index + 1}. ${source}`);
        });
      }
      debugLines.push('');
    }

    // Error Details Section
    if (error instanceof AggregateError) {
      debugLines.push('=== AggregateError Details ===');
      debugLines.push(`Primary Message: ${error.message}`);
      debugLines.push(`Individual Errors (${error.errors?.length || 0}):`);
      error.errors?.forEach((err, index) => {
        debugLines.push(
          `  ${index + 1}. ${err.constructor.name}: ${err.message}`
        );
        if (err.stack) {
          const stackLines = err.stack.split('\n').slice(1, 3); // First 2 stack lines
          stackLines.forEach((line) => {
            debugLines.push(`     ${line.trim()}`);
          });
        }
      });
      debugLines.push('');
    } else {
      debugLines.push('=== Error Details ===');
      debugLines.push(`Error Name: ${error.constructor.name}`);
      debugLines.push(`Error Message: ${error.message}`);
      debugLines.push('');
    }

    // Error Categories Analysis
    debugLines.push('=== Error Categories Analysis ===');
    report.categories?.forEach((category, index) => {
      debugLines.push(
        `${index + 1}. ${category.type} (${category.severity} severity)`
      );
      debugLines.push(`   Source: ${category.source}`);
      debugLines.push(`   Message: ${category.message}`);
      if (category.component) {
        debugLines.push(`   Component: ${category.component}`);
      }
      if (category.hook) {
        debugLines.push(`   Hook: ${category.hook}`);
      }
      debugLines.push('');
    });

    // Recovery Suggestions
    debugLines.push('=== Recovery Suggestions ===');
    report.suggestions?.forEach((suggestion, index) => {
      debugLines.push(`${index + 1}. ${suggestion}`);
    });
    debugLines.push('');

    // Recovery Strategy Analysis
    const recoveryAnalysis = this.attemptErrorRecovery(error, errorInfo);
    debugLines.push('=== Recovery Strategy Analysis ===');
    debugLines.push(
      `Can Recover: ${recoveryAnalysis.canRecover ? 'Yes' : 'No'}`
    );
    debugLines.push(`Primary Strategy: ${recoveryAnalysis.recoveryStrategy}`);
    debugLines.push(
      `Estimated Recovery Time: ${recoveryAnalysis.estimatedRecoveryTime}ms`
    );
    if (recoveryAnalysis.fallbackOptions.length > 0) {
      debugLines.push('Fallback Options:');
      recoveryAnalysis.fallbackOptions.forEach((option, index) => {
        debugLines.push(`  ${index + 1}. ${option}`);
      });
    }
    debugLines.push('');

    // Component Stack Analysis
    if (errorInfo.componentStack) {
      debugLines.push('=== Component Stack Analysis ===');
      const componentStackLines = errorInfo.componentStack
        .split('\n')
        .filter((line) => line.trim());
      componentStackLines.forEach((line, index) => {
        if (line.includes('at ')) {
          const componentName = line.match(/at (\w+)/)?.[1];
          debugLines.push(
            `${index + 1}. ${componentName || 'Unknown'}: ${line.trim()}`
          );
        }
      });
      debugLines.push('');
    }

    // Full Error Stack (truncated for readability)
    if (error.stack) {
      debugLines.push('=== Error Stack (First 10 lines) ===');
      const stackLines = error.stack.split('\n').slice(0, 10);
      stackLines.forEach((line, index) => {
        debugLines.push(`${index + 1}. ${line}`);
      });
      if (error.stack.split('\n').length > 10) {
        debugLines.push('... (stack truncated for readability)');
      }
      debugLines.push('');
    }

    // Environment Information
    debugLines.push('=== Environment Information ===');
    debugLines.push(`React Version: ${global.__REACT_VERSION || 'Unknown'}`);
    debugLines.push(`Node Environment: ${process.env.NODE_ENV || 'Unknown'}`);
    debugLines.push(
      `Test Environment: ${process.env.JEST_WORKER_ID ? 'Jest' : 'Unknown'}`
    );
    debugLines.push(
      `Memory Usage: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)}MB`
    );
    debugLines.push('');

    debugLines.push('=== End Debug Report ===');

    return debugLines.join('\n');
  }
}

/**
 * Default Fallback UI Component for Test Errors
 */
export const DefaultTestErrorFallback: React.FC<{
  error: Error | AggregateError;
  errorReport: TestErrorReport;
  retry: () => void;
  canRetry: boolean;
}> = ({ error, errorReport, retry, canRetry }) => {
  const [showDetails, setShowDetails] = React.useState(false);
  const [showDebugInfo, setShowDebugInfo] = React.useState(false);

  return (
    <div
      data-testid="react19-error-boundary"
      role="alert"
      style={{
        padding: '16px',
        border: '2px solid #ef4444',
        borderRadius: '8px',
        backgroundColor: '#fef2f2',
        color: '#991b1b',
        fontFamily: 'monospace',
        fontSize: '14px',
        margin: '16px',
      }}
    >
      <div
        style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}
      >
        <span style={{ fontSize: '18px', marginRight: '8px' }}>⚠️</span>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
          React 19 Test Error Boundary
        </h2>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <strong>Error Type:</strong> {errorReport.type}
        {errorReport.totalErrors && errorReport.totalErrors > 1 && (
          <span> ({errorReport.totalErrors} errors)</span>
        )}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <strong>Recoverable:</strong> {errorReport.recoverable ? 'Yes' : 'No'}
      </div>

      <div style={{ marginBottom: '12px' }}>
        <strong>Primary Message:</strong> {error.message}
      </div>

      {errorReport.suggestions && errorReport.suggestions.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <strong>Suggestions:</strong>
          <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
            {errorReport.suggestions.slice(0, 3).map((suggestion, index) => (
              <li key={index} style={{ marginBottom: '4px' }}>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Enhanced Task 3.1: Performance and Recovery Information */}
      {errorReport.performanceImpact && (
        <div style={{ marginBottom: '12px' }}>
          <strong>Performance Impact:</strong> Grade{' '}
          {errorReport.performanceImpact.performanceGrade} (
          {errorReport.performanceImpact.errorHandlingTime.toFixed(1)}ms)
        </div>
      )}

      {errorReport.recoveryAnalysis && (
        <div style={{ marginBottom: '12px' }}>
          <strong>Recovery Strategy:</strong>{' '}
          {errorReport.recoveryAnalysis.recoveryStrategy}
          {errorReport.recoveryAnalysis.canRecover && (
            <span>
              {' '}
              (Est. {errorReport.recoveryAnalysis.estimatedRecoveryTime}ms)
            </span>
          )}
        </div>
      )}

      {errorReport.memoryLeakAnalysis?.hasLeak && (
        <div style={{ marginBottom: '12px', color: '#dc2626' }}>
          <strong>⚠️ Memory Leak Detected:</strong>{' '}
          {errorReport.memoryLeakAnalysis.leakSeverity} severity
        </div>
      )}

      <div style={{ marginBottom: '12px' }}>
        <button
          type="button"
          onClick={() => setShowDetails(!showDetails)}
          style={{
            marginRight: '8px',
            padding: '4px 8px',
            border: '1px solid #991b1b',
            backgroundColor: 'transparent',
            color: '#991b1b',
            cursor: 'pointer',
            borderRadius: '4px',
          }}
        >
          {showDetails ? 'Hide' : 'Show'} Error Details
        </button>

        <button
          type="button"
          onClick={() => setShowDebugInfo(!showDebugInfo)}
          style={{
            marginRight: '8px',
            padding: '4px 8px',
            border: '1px solid #991b1b',
            backgroundColor: 'transparent',
            color: '#991b1b',
            cursor: 'pointer',
            borderRadius: '4px',
          }}
        >
          {showDebugInfo ? 'Hide' : 'Show'} Debug Info
        </button>

        {canRetry && (
          <button
            type="button"
            onClick={retry}
            data-testid="error-boundary-retry"
            style={{
              padding: '4px 8px',
              border: '1px solid #991b1b',
              backgroundColor: '#991b1b',
              color: 'white',
              cursor: 'pointer',
              borderRadius: '4px',
            }}
          >
            Retry Test
          </button>
        )}
      </div>

      {showDetails && (
        <details open style={{ marginBottom: '12px' }}>
          <summary style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            Error Categories ({errorReport.categories?.length || 0})
          </summary>
          {errorReport.categories?.map((category, index) => (
            <div
              key={index}
              style={{ marginBottom: '8px', paddingLeft: '16px' }}
            >
              <div>
                <strong>Type:</strong> {category.type}
              </div>
              <div>
                <strong>Severity:</strong> {category.severity}
              </div>
              <div>
                <strong>Source:</strong> {category.source}
              </div>
              <div>
                <strong>Message:</strong> {category.message}
              </div>
              {category.component && (
                <div>
                  <strong>Component:</strong> {category.component}
                </div>
              )}
              {category.hook && (
                <div>
                  <strong>Hook:</strong> {category.hook}
                </div>
              )}
            </div>
          ))}
        </details>
      )}

      {showDebugInfo && (
        <details open>
          <summary style={{ fontWeight: 'bold', marginBottom: '8px' }}>
            Debug Information
          </summary>
          <pre
            style={{
              fontSize: '12px',
              overflow: 'auto',
              backgroundColor: '#f9fafb',
              padding: '8px',
              borderRadius: '4px',
              border: '1px solid #d1d5db',
            }}
          >
            {React19ErrorHandler.generateDebugInfo(
              error,
              { componentStack: '' },
              errorReport,
              errorReport.performanceImpact,
              errorReport.memoryLeakAnalysis
            )}
          </pre>
        </details>
      )}
    </div>
  );
};

/**
 * React 19 Error Boundary Component
 * Enhanced error boundary specifically designed for React 19 AggregateError handling
 * Provides detailed error reporting, debugging information, and fallback UI for test error states
 */
export class React19ErrorBoundary extends Component<
  React19ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: React19ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      retryCount: 0,
      maxRetries: props.maxRetries || 3,
      errorReport: undefined,
      debugMode: props.debugMode || false,
    };
  }

  static getDerivedStateFromError(
    error: Error | AggregateError
  ): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error | AggregateError, errorInfo: ErrorInfo) {
    const startTime = performance.now();
    const memoryBefore = process.memoryUsage().heapUsed;

    const context = {
      testName: this.props.testName,
      componentName: this.props.componentName || 'React19ErrorBoundary',
    };

    // Generate comprehensive error report
    const errorReport =
      error instanceof AggregateError
        ? React19ErrorHandler.handleAggregateError(error, errorInfo, context)
        : React19ErrorHandler.handleStandardError(error, errorInfo, context);

    // Analyze performance impact
    const performanceAnalysis = React19ErrorHandler.analyzePerformanceImpact(
      error,
      startTime,
      memoryBefore
    );

    // Detect memory leaks
    const memoryLeakAnalysis = React19ErrorHandler.detectMemoryLeaks(
      {
        heapUsed: memoryBefore,
        external: 0,
        rss: 0,
        heapTotal: 0,
        arrayBuffers: 0,
      },
      process.memoryUsage(),
      error instanceof AggregateError ? error.errors?.length || 1 : 1
    );

    // Attempt error recovery analysis
    const recoveryAnalysis = React19ErrorHandler.attemptErrorRecovery(
      error,
      errorInfo,
      this.state.retryCount,
      this.state.maxRetries
    );

    this.setState({
      errorInfo,
      errorReport: {
        ...errorReport,
        performanceImpact: performanceAnalysis,
        memoryLeakAnalysis,
        recoveryAnalysis,
      },
    });

    // Enhanced logging for React 19 AggregateError
    if (error instanceof AggregateError) {
      console.group('🚨 Enhanced React 19 AggregateError Analysis');
      console.error('Total Errors:', error.errors?.length || 0);
      console.error('Recoverable:', errorReport.recoverable);
      console.error('Performance Grade:', performanceAnalysis.performanceGrade);
      console.error('Memory Leak Detected:', memoryLeakAnalysis.hasLeak);
      console.error('Recovery Strategy:', recoveryAnalysis.recoveryStrategy);
      console.error('Error Report:', errorReport);

      error.errors?.forEach((individualError, index) => {
        console.error(`Error ${index + 1}:`, individualError);
      });

      if (this.state.debugMode) {
        console.error(
          'Enhanced Debug Info:',
          React19ErrorHandler.generateDebugInfo(
            error,
            errorInfo,
            errorReport,
            performanceAnalysis,
            memoryLeakAnalysis
          )
        );
      }

      console.groupEnd();
    } else {
      console.group('🚨 Enhanced React Error Analysis');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Performance Grade:', performanceAnalysis.performanceGrade);
      console.error('Memory Leak Detected:', memoryLeakAnalysis.hasLeak);
      console.error('Recovery Strategy:', recoveryAnalysis.recoveryStrategy);
      console.error('Error Report:', errorReport);

      if (this.state.debugMode) {
        console.error(
          'Enhanced Debug Info:',
          React19ErrorHandler.generateDebugInfo(
            error,
            errorInfo,
            errorReport,
            performanceAnalysis,
            memoryLeakAnalysis
          )
        );
      }

      console.groupEnd();
    }

    // Track error in global registry for analysis
    if (global.__REACT_19_ERROR_TRACKER) {
      const errorEntry = {
        message: error.message,
        type: error.constructor.name,
        timestamp: Date.now(),
        recoverable: errorReport.recoverable,
        performanceGrade: performanceAnalysis.performanceGrade,
        memoryLeak: memoryLeakAnalysis.hasLeak,
        recoveryStrategy: recoveryAnalysis.recoveryStrategy,
        testName: this.props.testName,
        componentName: this.props.componentName,
      };

      if (error instanceof AggregateError) {
        global.__REACT_19_ERROR_TRACKER.aggregateErrors.push({
          ...errorEntry,
          errors: error.errors?.map((e) => e.message) || [],
          source: 'errorBoundary',
        });
      } else {
        global.__REACT_19_ERROR_TRACKER.renderErrors.push({
          ...errorEntry,
          source: 'errorBoundary',
        });
      }
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo, errorReport);
  }

  componentDidUpdate(prevProps: React19ErrorBoundaryProps) {
    // Reset error boundary if props change and resetOnPropsChange is true
    if (
      this.props.resetOnPropsChange &&
      this.state.hasError &&
      (prevProps.children !== this.props.children ||
        prevProps.testName !== this.props.testName)
    ) {
      this.resetErrorBoundary();
    }
  }

  componentWillUnmount() {
    // Clear any pending retry timeouts
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: undefined,
      errorInfo: undefined,
      errorReport: undefined,
      retryCount: 0,
    });
  };

  retry = async () => {
    if (
      this.state.retryCount < this.state.maxRetries &&
      this.state.error &&
      this.state.errorInfo
    ) {
      console.log(
        `🔄 Enhanced retry with recovery strategy (attempt ${this.state.retryCount + 1}/${this.state.maxRetries})`
      );

      // Get recovery analysis
      const recoveryAnalysis = React19ErrorHandler.attemptErrorRecovery(
        this.state.error,
        this.state.errorInfo,
        this.state.retryCount,
        this.state.maxRetries
      );

      console.log(
        `🛠️ Executing recovery strategy: ${recoveryAnalysis.recoveryStrategy}`
      );

      // Execute recovery strategy
      try {
        const recoveryResult =
          await React19ErrorHandler.executeRecoveryStrategy(
            recoveryAnalysis.recoveryStrategy,
            {
              mockRegistry: global.__GLOBAL_MOCK_REGISTRY,
              testName: this.props.testName,
            }
          );

        console.log(`🔧 Recovery result:`, recoveryResult);

        if (recoveryResult.success) {
          console.log(`✅ Recovery successful: ${recoveryResult.message}`);
        } else {
          console.warn(`⚠️ Recovery failed: ${recoveryResult.message}`);
          // Try fallback strategies if available
          if (recoveryAnalysis.fallbackOptions.length > 0) {
            const fallbackStrategy = recoveryAnalysis.fallbackOptions[0];
            console.log(`🔄 Trying fallback strategy: ${fallbackStrategy}`);
            const fallbackResult =
              await React19ErrorHandler.executeRecoveryStrategy(
                fallbackStrategy,
                {
                  mockRegistry: global.__GLOBAL_MOCK_REGISTRY,
                  testName: this.props.testName,
                }
              );
            console.log(`🔧 Fallback result:`, fallbackResult);
          }
        }
      } catch (recoveryError) {
        console.error(`❌ Recovery strategy execution failed:`, recoveryError);
      }

      // Reset error boundary state
      this.setState({
        hasError: false,
        error: undefined,
        errorInfo: undefined,
        errorReport: undefined,
        retryCount: this.state.retryCount + 1,
      });

      // Add a delay based on recovery strategy estimation
      const delay = Math.max(recoveryAnalysis.estimatedRecoveryTime, 100);
      this.retryTimeoutId = setTimeout(() => {
        // Force re-render by updating a dummy state if needed
        this.forceUpdate();
      }, delay);
    } else {
      console.warn(
        `❌ Cannot retry: ${this.state.retryCount >= this.state.maxRetries ? 'Max retries reached' : 'No error to retry'}`
      );
    }
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const canRetry = this.state.retryCount < this.state.maxRetries;

      // If errorReport is not yet available (before componentDidCatch), create a basic one
      const errorReport = this.state.errorReport || {
        type: 'Error' as const,
        totalErrors: 1,
        categories: [],
        suggestions: [
          'Error boundary caught an error',
          'Check component implementation',
        ],
        recoverable: true,
        timestamp: Date.now(),
        componentStack: '',
        errorBoundary: this.props.componentName || 'React19ErrorBoundary',
      };

      // Use custom fallback component if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return (
          <FallbackComponent
            error={this.state.error}
            errorReport={errorReport}
            retry={this.retry}
            canRetry={canRetry}
          />
        );
      }

      // Use default fallback UI
      return (
        <DefaultTestErrorFallback
          error={this.state.error}
          errorReport={errorReport}
          retry={this.retry}
          canRetry={canRetry}
        />
      );
    }

    return this.props.children;
  }
}

// Export all components and utilities
export default React19ErrorBoundary;

// Convenience wrapper for backward compatibility
export const TestErrorBoundary: React.FC<{
  children: ReactNode;
  testName?: string;
}> = ({ children, testName }) => {
  return (
    <React19ErrorBoundary testName={testName} debugMode={true}>
      {children}
    </React19ErrorBoundary>
  );
};

// Types are already exported above, no need to re-export
