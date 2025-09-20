/**
 * Unit tests for HookExecutionTracer
 *
 * Tests hook execution tracing capabilities including
 * dependency tracking, state changes, and performance monitoring.
 */

import {
  HookExecutionTracer,
  hookExecutionTracer,
} from '../HookExecutionTracer';

// Mock hook functions for testing
const mockUseState = jest.fn((initialValue) => [initialValue, jest.fn()]);
const mockUseEffect = jest.fn((effect, deps) => {
  if (typeof effect === 'function') {
    effect();
  }
});
const mockUseToast = jest.fn(() => ({
  toast: jest.fn(),
  dismiss: jest.fn(),
}));

describe('HookExecutionTracer', () => {
  beforeEach(() => {
    // Clear any existing traces
    hookExecutionTracer['activeTraces'].clear();
    hookExecutionTracer['completedTraces'] = [];
    hookExecutionTracer['renderCycleCounter'] = 0;
    hookExecutionTracer['isTracingEnabled'] = false;

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('startTracing and stopTracing', () => {
    it('should start and stop tracing correctly', () => {
      const executionId = hookExecutionTracer.startTracing('TestComponent');

      expect(executionId).toMatch(/TestComponent-\d+-\w+/);
      expect(hookExecutionTracer['isTracingEnabled']).toBe(true);
      expect(hookExecutionTracer['renderCycleCounter']).toBe(1);

      const trace = hookExecutionTracer.stopTracing(executionId);

      expect(trace).toBeDefined();
      expect(trace!.componentName).toBe('TestComponent');
      expect(trace!.status).toBe('COMPLETED');
      expect(trace!.duration).toBeGreaterThan(0);
      expect(hookExecutionTracer['isTracingEnabled']).toBe(false);
    });

    it('should return null when stopping non-existent trace', () => {
      const result = hookExecutionTracer.stopTracing('non-existent-id');

      expect(result).toBeNull();
    });

    it('should maintain multiple active traces', () => {
      const id1 = hookExecutionTracer.startTracing('Component1');
      const id2 = hookExecutionTracer.startTracing('Component2');

      expect(hookExecutionTracer['activeTraces'].size).toBe(2);
      expect(hookExecutionTracer['isTracingEnabled']).toBe(true);

      hookExecutionTracer.stopTracing(id1);
      expect(hookExecutionTracer['activeTraces'].size).toBe(1);
      expect(hookExecutionTracer['isTracingEnabled']).toBe(true);

      hookExecutionTracer.stopTracing(id2);
      expect(hookExecutionTracer['activeTraces'].size).toBe(0);
      expect(hookExecutionTracer['isTracingEnabled']).toBe(false);
    });
  });

  describe('traceHook', () => {
    it('should trace hook execution successfully', () => {
      hookExecutionTracer.startTracing('TestComponent');

      const result = hookExecutionTracer.traceHook(
        'useState',
        'TestComponent',
        mockUseState,
        ['initial value']
      );

      expect(result).toEqual(['initial value', expect.any(Function)]);
      expect(mockUseState).toHaveBeenCalledWith('initial value');
    });

    it('should not trace when tracing is disabled', () => {
      const result = hookExecutionTracer.traceHook(
        'useState',
        'TestComponent',
        mockUseState,
        ['initial value']
      );

      expect(result).toEqual(['initial value', expect.any(Function)]);
      expect(mockUseState).toHaveBeenCalledWith('initial value');
      expect(hookExecutionTracer['activeTraces'].size).toBe(0);
    });

    it('should handle hook execution errors', () => {
      const errorHook = jest.fn(() => {
        throw new Error('Hook execution failed');
      });

      hookExecutionTracer.startTracing('TestComponent');

      expect(() => {
        hookExecutionTracer.traceHook(
          'errorHook',
          'TestComponent',
          errorHook,
          []
        );
      }).toThrow('Hook execution failed');

      // Should still create trace with error information
      const traces = Array.from(hookExecutionTracer['activeTraces'].values());
      expect(traces).toHaveLength(1);
      expect(traces[0].status).toBe('ERROR');
      expect(traces[0].errors).toHaveLength(1);
    });

    it('should create execution steps during tracing', () => {
      hookExecutionTracer.startTracing('TestComponent');

      hookExecutionTracer.traceHook(
        'useEffect',
        'TestComponent',
        mockUseEffect,
        [() => console.log('effect'), []]
      );

      const traces = Array.from(hookExecutionTracer['activeTraces'].values());
      expect(traces[0].steps).toHaveLength(1);
      expect(traces[0].steps[0].stepType).toBe('INITIALIZATION');
      expect(traces[0].steps[0].description).toContain('useEffect');
    });
  });

  describe('generateHookExecutionReport', () => {
    it('should generate comprehensive execution report', () => {
      const executionId = hookExecutionTracer.startTracing('TestComponent');

      hookExecutionTracer.traceHook('useState', 'TestComponent', mockUseState, [
        'test',
      ]);
      hookExecutionTracer.traceHook(
        'useToast',
        'TestComponent',
        mockUseToast,
        []
      );

      const trace = hookExecutionTracer.stopTracing(executionId);
      const report = hookExecutionTracer.generateHookExecutionReport(trace!);

      expect(report).toContain('# Hook Execution Report');
      expect(report).toContain('## Hook: TestComponent');
      expect(report).toContain('**Status**: COMPLETED');
      expect(report).toContain('## Performance Metrics');
      expect(report).toContain('## Execution Steps');
      expect(report).toContain('## Dependencies');
      expect(report).toContain('## State Changes');
      expect(report).toContain('## Effect Executions');
    });

    it('should include error information in report when present', () => {
      const errorHook = jest.fn(() => {
        throw new Error('Test hook error');
      });

      const executionId = hookExecutionTracer.startTracing('TestComponent');

      try {
        hookExecutionTracer.traceHook(
          'errorHook',
          'TestComponent',
          errorHook,
          []
        );
      } catch (error) {
        // Expected error
      }

      const trace = hookExecutionTracer.stopTracing(executionId);
      const report = hookExecutionTracer.generateHookExecutionReport(trace!);

      expect(report).toContain('## Errors');
      expect(report).toContain('Test hook error');
      expect(report).toContain('**Recoverable**:');
    });

    it('should format performance metrics correctly', () => {
      const executionId = hookExecutionTracer.startTracing('TestComponent');
      hookExecutionTracer.traceHook('useState', 'TestComponent', mockUseState, [
        'test',
      ]);
      const trace = hookExecutionTracer.stopTracing(executionId);

      const report = hookExecutionTracer.generateHookExecutionReport(trace!);

      expect(report).toMatch(/\*\*Total Execution Time\*\*: \d+\.\d+ms/);
      expect(report).toMatch(/\*\*Average Step Time\*\*: \d+\.\d+ms/);
      expect(report).toMatch(/\*\*Memory Usage\*\*: \d+\.\d+MB/);
    });
  });

  describe('getHookExecutionStatistics', () => {
    it('should return empty statistics when no executions recorded', () => {
      const stats = hookExecutionTracer.getHookExecutionStatistics();

      expect(stats.totalExecutions).toBe(0);
      expect(stats.successfulExecutions).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.averageExecutionTime).toBe(0);
      expect(stats.hookUsageBreakdown).toEqual({});
      expect(stats.errorBreakdown).toEqual({});
    });

    it('should calculate statistics correctly with multiple executions', () => {
      // Perform multiple hook traces
      const id1 = hookExecutionTracer.startTracing('Component1');
      hookExecutionTracer.traceHook('useState', 'Component1', mockUseState, [
        'test1',
      ]);
      hookExecutionTracer.stopTracing(id1);

      const id2 = hookExecutionTracer.startTracing('Component2');
      hookExecutionTracer.traceHook('useToast', 'Component2', mockUseToast, []);
      hookExecutionTracer.stopTracing(id2);

      const id3 = hookExecutionTracer.startTracing('Component3');
      hookExecutionTracer.traceHook('useState', 'Component3', mockUseState, [
        'test2',
      ]);
      hookExecutionTracer.stopTracing(id3);

      const stats = hookExecutionTracer.getHookExecutionStatistics();

      expect(stats.totalExecutions).toBe(3);
      expect(stats.successfulExecutions).toBe(3);
      expect(stats.successRate).toBe(100);
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
      expect(stats.hookUsageBreakdown).toHaveProperty('useState', 2);
      expect(stats.hookUsageBreakdown).toHaveProperty('useToast', 1);
    });

    it('should track error statistics', () => {
      const errorHook = jest.fn(() => {
        throw new Error('Test error');
      });

      const id1 = hookExecutionTracer.startTracing('Component1');
      try {
        hookExecutionTracer.traceHook('errorHook', 'Component1', errorHook, []);
      } catch (error) {
        // Expected
      }
      hookExecutionTracer.stopTracing(id1);

      const stats = hookExecutionTracer.getHookExecutionStatistics();

      expect(stats.totalExecutions).toBe(1);
      expect(stats.successfulExecutions).toBe(0);
      expect(stats.successRate).toBe(0);
    });
  });

  describe('analyzeHookPerformance', () => {
    it('should analyze performance and identify issues', () => {
      const executionId = hookExecutionTracer.startTracing('TestComponent');
      hookExecutionTracer.traceHook('useState', 'TestComponent', mockUseState, [
        'test',
      ]);
      const trace = hookExecutionTracer.stopTracing(executionId);

      const analysis = hookExecutionTracer.analyzeHookPerformance(trace!);

      expect(analysis.overallScore).toBeGreaterThanOrEqual(0);
      expect(analysis.overallScore).toBeLessThanOrEqual(100);
      expect(analysis.issues).toBeDefined();
      expect(analysis.suggestions).toBeDefined();
      expect(analysis.metrics).toBeDefined();
    });

    it('should identify slow execution issues', () => {
      const executionId = hookExecutionTracer.startTracing('TestComponent');

      // Mock a slow hook
      const slowHook = jest.fn(() => {
        // Simulate slow execution by manipulating the trace
        const traces = Array.from(hookExecutionTracer['activeTraces'].values());
        if (traces.length > 0) {
          traces[0].performance.totalExecutionTime = 150; // > 100ms threshold
        }
        return 'result';
      });

      hookExecutionTracer.traceHook('slowHook', 'TestComponent', slowHook, []);
      const trace = hookExecutionTracer.stopTracing(executionId);

      const analysis = hookExecutionTracer.analyzeHookPerformance(trace!);

      expect(
        analysis.issues.some((issue) => issue.type === 'SLOW_EXECUTION')
      ).toBe(true);
    });

    it('should provide appropriate suggestions', () => {
      const executionId = hookExecutionTracer.startTracing('TestComponent');
      hookExecutionTracer.traceHook('useState', 'TestComponent', mockUseState, [
        'test',
      ]);
      const trace = hookExecutionTracer.stopTracing(executionId);

      const analysis = hookExecutionTracer.analyzeHookPerformance(trace!);

      expect(analysis.suggestions).toContain(
        'Hook performance is within acceptable limits'
      );
    });
  });

  describe('error categorization', () => {
    it('should categorize invalid hook call errors', () => {
      const invalidHookError = new Error(
        'Invalid hook call. Hooks can only be called inside the body of a function component.'
      );

      const category =
        hookExecutionTracer['categorizeHookError'](invalidHookError);
      expect(category).toBe('INVALID_HOOK_CALL');
    });

    it('should categorize dependency errors', () => {
      const depError = new Error(
        'useEffect dependency array is missing dependencies'
      );

      const category = hookExecutionTracer['categorizeHookError'](depError);
      expect(category).toBe('DEPENDENCY_ERROR');
    });

    it('should categorize state update errors', () => {
      const stateError = new Error('Cannot update state during render');

      const category = hookExecutionTracer['categorizeHookError'](stateError);
      expect(category).toBe('STATE_UPDATE_ERROR');
    });

    it('should categorize infinite loop errors', () => {
      const loopError = new Error('Maximum update depth exceeded');

      const category = hookExecutionTracer['categorizeHookError'](loopError);
      expect(category).toBe('INFINITE_LOOP');
    });
  });

  describe('error recovery assessment', () => {
    it('should identify non-recoverable errors', () => {
      const invalidHookError = new Error('Invalid hook call');

      const isRecoverable =
        hookExecutionTracer['isRecoverableError'](invalidHookError);
      expect(isRecoverable).toBe(false);
    });

    it('should identify recoverable errors', () => {
      const depError = new Error('useEffect dependency missing');

      const isRecoverable = hookExecutionTracer['isRecoverableError'](depError);
      expect(isRecoverable).toBe(true);
    });
  });

  describe('error suggestions', () => {
    it('should provide appropriate suggestions for different error types', () => {
      const testCases = [
        {
          error: new Error('Invalid hook call'),
          expectedSuggestion:
            'Ensure hooks are only called at the top level of React components or custom hooks',
        },
        {
          error: new Error('useEffect dependency missing'),
          expectedSuggestion:
            'Check useEffect dependency arrays and ensure all dependencies are included',
        },
        {
          error: new Error('setState called during render'),
          expectedSuggestion:
            'Verify state updates are properly handled and not causing infinite loops',
        },
      ];

      testCases.forEach(({ error, expectedSuggestion }) => {
        const suggestion = hookExecutionTracer['getErrorSuggestion'](error);
        expect(suggestion).toBe(expectedSuggestion);
      });
    });
  });

  describe('performance metrics calculation', () => {
    it('should calculate performance metrics correctly', () => {
      const executionId = hookExecutionTracer.startTracing('TestComponent');

      // Add some mock steps
      const trace = hookExecutionTracer['activeTraces'].get(executionId);
      if (trace) {
        trace.steps = [
          {
            stepId: '1',
            stepType: 'INITIALIZATION',
            description: 'Init',
            input: {},
            output: {},
            duration: 10,
            success: true,
          },
          {
            stepId: '2',
            stepType: 'STATE_UPDATE',
            description: 'Update',
            input: {},
            output: {},
            duration: 20,
            success: true,
          },
        ];
        trace.stateChanges = [
          {
            stateVariable: 'count',
            previousValue: 0,
            newValue: 1,
            changeType: 'UPDATE',
            trigger: 'user action',
            timestamp: Date.now(),
          },
        ];
      }

      const completedTrace = hookExecutionTracer.stopTracing(executionId);

      expect(completedTrace!.performance.averageStepTime).toBe(15); // (10 + 20) / 2
      expect(completedTrace!.performance.slowestStep).toBe('Update');
      expect(completedTrace!.performance.stateUpdateCount).toBe(1);
    });
  });

  describe('trace history management', () => {
    it('should maintain completed traces with size limit', () => {
      // Add traces up to the limit (100)
      for (let i = 0; i < 105; i++) {
        const id = hookExecutionTracer.startTracing(`Component${i}`);
        hookExecutionTracer.traceHook(
          'useState',
          `Component${i}`,
          mockUseState,
          [`test${i}`]
        );
        hookExecutionTracer.stopTracing(id);
      }

      const completedTraces = hookExecutionTracer['completedTraces'];
      expect(completedTraces).toHaveLength(100);

      // Should contain the most recent traces
      expect(completedTraces[completedTraces.length - 1].componentName).toBe(
        'Component104'
      );
      expect(completedTraces[0].componentName).toBe('Component5'); // First 5 should be removed
    });
  });

  describe('call stack capture', () => {
    it('should capture call stack information', () => {
      const callStack = hookExecutionTracer['captureCallStack']();

      expect(callStack).toBeInstanceOf(Array);
      expect(callStack.length).toBeGreaterThan(0);
      expect(callStack.length).toBeLessThanOrEqual(8); // Limited to 8 frames
    });
  });

  describe('performance score calculation', () => {
    it('should calculate performance score correctly', () => {
      const mockTrace = {
        performance: {
          totalExecutionTime: 25, // Good performance
          renderCount: 3, // Reasonable
          memoryUsage: 10 * 1024 * 1024, // 10MB - reasonable
        },
        errors: [],
      } as any;

      const score = hookExecutionTracer['calculatePerformanceScore'](mockTrace);
      expect(score).toBe(100); // Perfect score
    });

    it('should deduct points for performance issues', () => {
      const mockTrace = {
        performance: {
          totalExecutionTime: 75, // Slow but not critical
          renderCount: 8, // High but not excessive
          memoryUsage: 30 * 1024 * 1024, // 30MB - high but not critical
        },
        errors: [{ type: 'PERFORMANCE_WARNING' }],
      } as any;

      const score = hookExecutionTracer['calculatePerformanceScore'](mockTrace);
      expect(score).toBeLessThan(100);
      expect(score).toBeGreaterThan(0);
    });
  });
});
