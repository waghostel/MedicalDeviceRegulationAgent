/**
 * Integration tests for TestDebuggingTools
 * 
 * Tests the integrated debugging system that combines test failure analysis,
 * component rendering debugging, and hook execution tracing.
 */

import React from 'react';
import { TestDebuggingTools, testDebuggingTools, debugTest, quickDebugGuide } from '../TestDebuggingTools';

// Mock component for testing
const TestComponent: React.FC<{ title: string; onClick?: () => void }> = ({ title, onClick }) => (
  <div data-testid="test-component" onClick={onClick}>
    <h1>{title}</h1>
  </div>
);

// Component that uses hooks
const HookComponent: React.FC<{ initialCount?: number }> = ({ initialCount = 0 }) => {
  const [count, setCount] = React.useState(initialCount);
  
  React.useEffect(() => {
    console.log(`Count changed to: ${count}`);
  }, [count]);

  return (
    <div data-testid="hook-component">
      <span data-testid="count">{count}</span>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
};

describe('TestDebuggingTools Integration', () => {
  beforeEach(() => {
    // Clear debugging history
    testDebuggingTools['debugHistory'] = [];
    testDebuggingTools['debuggingSessions'].clear();
  });

  describe('debugTestFailure', () => {
    it('should perform comprehensive debugging for hook mock error', async () => {
      const error = new Error('useToast is not a function');
      const options = {
        component: TestComponent,
        props: { title: 'Test Title' },
        enableHookTracing: false // Disable for simpler test
      };

      const report = await testDebuggingTools.debugTestFailure('Hook mock test', error, options);

      expect(report.testName).toBe('Hook mock test');
      expect(report.componentName).toBe('TestComponent');
      expect(report.debuggingSession.toolsUsed).toContain('TestFailureAnalyzer');
      expect(report.debuggingSession.toolsUsed).toContain('ComponentRenderingDebugger');
      expect(report.failureAnalysis).toBeDefined();
      expect(report.renderingAnalysis).toBeDefined();
      expect(report.overallAssessment.severity).toBe('high');
      expect(report.actionableRecommendations.length).toBeGreaterThan(0);
    });

    it('should handle React 19 AggregateError with comprehensive analysis', async () => {
      const aggregateError = new AggregateError(
        [new Error('Component render failed'), new Error('Hook execution failed')],
        'Multiple React 19 errors'
      );
      
      const options = {
        component: TestComponent,
        props: { title: 'Test Title' },
        enableHookTracing: false
      };

      const report = await testDebuggingTools.debugTestFailure('React 19 test', aggregateError, options);

      expect(report.failureAnalysis?.analysis.category).toBe('REACT_19_COMPATIBILITY');
      expect(report.overallAssessment.severity).toBe('critical');
      expect(report.actionableRecommendations.some(rec => 
        rec.category === 'TEST_ENVIRONMENT' && rec.title.includes('React 19')
      )).toBe(true);
    });

    it('should integrate hook tracing when enabled', async () => {
      const error = new Error('Hook execution failed');
      const options = {
        component: HookComponent,
        props: { initialCount: 5 },
        enableHookTracing: true,
        tracingOptions: { includePerformanceMetrics: true }
      };

      const report = await testDebuggingTools.debugTestFailure('Hook tracing test', error, options);

      expect(report.debuggingSession.toolsUsed).toContain('HookExecutionTracer');
      expect(report.debuggingSession.phases.some(phase => phase.phase === 'HOOK_TRACING')).toBe(true);
    });

    it('should generate appropriate recommendations based on multiple analyses', async () => {
      const error = new Error('useToast is not a function');
      const options = {
        component: TestComponent,
        props: {}, // Missing required 'title' prop
        enableHookTracing: false
      };

      const report = await testDebuggingTools.debugTestFailure('Multi-issue test', error, options);

      // Should have recommendations for both hook mock and missing props
      expect(report.actionableRecommendations.some(rec => 
        rec.category === 'MOCK_CONFIGURATION'
      )).toBe(true);
      
      expect(report.actionableRecommendations.some(rec => 
        rec.category === 'COMPONENT_PROPS'
      )).toBe(true);
    });

    it('should handle debugging errors gracefully', async () => {
      const error = new Error('Test error');
      const options = {
        component: null as any, // Invalid component to trigger debugging error
        enableHookTracing: false
      };

      const report = await testDebuggingTools.debugTestFailure('Error handling test', error, options);

      expect(report.overallAssessment.severity).toBe('critical');
      expect(report.overallAssessment.isFixable).toBe(false);
      expect(report.actionableRecommendations[0].title).toBe('Manual Investigation Required');
    });

    it('should track debugging session metrics', async () => {
      const error = new Error('Test error');
      const options = {
        component: TestComponent,
        props: { title: 'Test' },
        enableHookTracing: false
      };

      const report = await testDebuggingTools.debugTestFailure('Metrics test', error, options);

      expect(report.debuggingSession.duration).toBeGreaterThan(0);
      expect(report.debuggingSession.phases.length).toBeGreaterThan(0);
      expect(report.debuggingSession.issuesFound).toBeGreaterThanOrEqual(0);
      expect(report.timestamp).toBeGreaterThan(0);
    });
  });

  describe('generateInteractiveDebuggingGuide', () => {
    it('should generate comprehensive interactive guide', async () => {
      const error = new Error('useToast is not a function');
      const options = {
        component: TestComponent,
        props: { title: 'Test Title' },
        enableHookTracing: false
      };

      const report = await testDebuggingTools.debugTestFailure('Guide test', error, options);
      const guide = testDebuggingTools.generateInteractiveDebuggingGuide(report);

      expect(guide).toContain('# Interactive Test Debugging Guide');
      expect(guide).toContain('## Test: Guide test');
      expect(guide).toContain('## 🎯 Quick Assessment');
      expect(guide).toContain('## 🔧 Actionable Recommendations');
      expect(guide).toContain('## 📊 Debugging Session Analysis');
      expect(guide).toContain('## 🔍 Detailed Analysis');
      expect(guide).toContain('## 🎯 Next Steps');
      expect(guide).toContain('## 📋 Checklist');
    });

    it('should prioritize recommendations by priority level', async () => {
      const error = new Error('Multiple issues');
      const options = {
        component: TestComponent,
        props: {},
        enableHookTracing: false
      };

      const report = await testDebuggingTools.debugTestFailure('Priority test', error, options);
      
      // Manually add recommendations with different priorities for testing
      report.actionableRecommendations = [
        {
          priority: 'low',
          category: 'PERFORMANCE',
          title: 'Low Priority Task',
          description: 'Low priority description',
          steps: ['Step 1'],
          relatedFiles: [],
          estimatedTime: '5 minutes'
        },
        {
          priority: 'high',
          category: 'MOCK_CONFIGURATION',
          title: 'High Priority Task',
          description: 'High priority description',
          steps: ['Step 1'],
          relatedFiles: [],
          estimatedTime: '30 minutes'
        },
        {
          priority: 'medium',
          category: 'COMPONENT_PROPS',
          title: 'Medium Priority Task',
          description: 'Medium priority description',
          steps: ['Step 1'],
          relatedFiles: [],
          estimatedTime: '15 minutes'
        }
      ];

      const guide = testDebuggingTools.generateInteractiveDebuggingGuide(report);

      // High priority should come first
      const highPriorityIndex = guide.indexOf('High Priority Task');
      const mediumPriorityIndex = guide.indexOf('Medium Priority Task');
      const lowPriorityIndex = guide.indexOf('Low Priority Task');

      expect(highPriorityIndex).toBeLessThan(mediumPriorityIndex);
      expect(mediumPriorityIndex).toBeLessThan(lowPriorityIndex);
    });

    it('should include code examples when available', async () => {
      const error = new Error('useToast is not a function');
      const options = {
        component: TestComponent,
        props: { title: 'Test' },
        enableHookTracing: false
      };

      const report = await testDebuggingTools.debugTestFailure('Code example test', error, options);
      const guide = testDebuggingTools.generateInteractiveDebuggingGuide(report);

      // Should include code example for hook mock configuration
      expect(guide).toContain('**Code Example**:');
      expect(guide).toContain('```typescript');
      expect(guide).toContain('useToast');
    });
  });

  describe('getDebuggingStatistics', () => {
    it('should return empty statistics when no debugging sessions recorded', () => {
      const stats = testDebuggingTools.getDebuggingStatistics();

      expect(stats.totalSessions).toBe(0);
      expect(stats.successfulSessions).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.averageSessionDuration).toBe(0);
      expect(stats.severityBreakdown).toEqual({});
      expect(stats.categoryBreakdown).toEqual({});
    });

    it('should calculate statistics correctly with multiple sessions', async () => {
      // Perform multiple debugging sessions
      await testDebuggingTools.debugTestFailure('Test 1', new Error('Error 1'), {
        component: TestComponent,
        props: { title: 'Test 1' },
        enableHookTracing: false
      });

      await testDebuggingTools.debugTestFailure('Test 2', new AggregateError([], 'Error 2'), {
        component: TestComponent,
        props: { title: 'Test 2' },
        enableHookTracing: false
      });

      await testDebuggingTools.debugTestFailure('Test 3', new Error('Error 3'), {
        component: TestComponent,
        props: { title: 'Test 3' },
        enableHookTracing: false
      });

      const stats = testDebuggingTools.getDebuggingStatistics();

      expect(stats.totalSessions).toBe(3);
      expect(stats.averageSessionDuration).toBeGreaterThan(0);
      expect(stats.severityBreakdown).toHaveProperty('high');
      expect(stats.categoryBreakdown).toHaveProperty('MOCK_CONFIGURATION');
      expect(stats.recentSessions).toHaveLength(3);
    });
  });

  describe('utility functions', () => {
    it('should provide quick debug function', async () => {
      const error = new Error('Quick debug test');
      const options = {
        component: TestComponent,
        props: { title: 'Quick Test' },
        enableHookTracing: false
      };

      const report = await debugTest('Quick debug test', error, options);

      expect(report.testName).toBe('Quick debug test');
      expect(report.componentName).toBe('TestComponent');
      expect(report.overallAssessment).toBeDefined();
    });

    it('should provide quick debug guide function', async () => {
      const error = new Error('Guide test');
      const options = {
        component: TestComponent,
        props: { title: 'Guide Test' },
        enableHookTracing: false
      };

      const report = await debugTest('Guide test', error, options);
      const guide = quickDebugGuide(report);

      expect(guide).toContain('# Interactive Test Debugging Guide');
      expect(guide).toContain('Guide test');
    });
  });

  describe('integration analysis', () => {
    it('should identify correlations between different analysis types', async () => {
      const error = new Error('useToast is not a function');
      const options = {
        component: TestComponent,
        props: {}, // Missing props to create rendering issues
        enableHookTracing: false
      };

      const report = await testDebuggingTools.debugTestFailure('Integration test', error, options);

      // Should identify that hook mock issues may be causing rendering problems
      const integrationPhase = report.debuggingSession.phases.find(
        phase => phase.phase === 'INTEGRATION_ANALYSIS'
      );

      expect(integrationPhase).toBeDefined();
      expect(integrationPhase!.success).toBe(true);
    });
  });

  describe('performance and reliability', () => {
    it('should complete comprehensive debugging within reasonable time', async () => {
      const startTime = performance.now();
      
      const error = new Error('Performance test');
      const options = {
        component: TestComponent,
        props: { title: 'Performance Test' },
        enableHookTracing: true
      };

      await testDebuggingTools.debugTestFailure('Performance test', error, options);
      
      const duration = performance.now() - startTime;
      expect(duration).toBeLessThan(1000); // Should complete in less than 1 second
    });

    it('should handle concurrent debugging sessions', async () => {
      const promises = [
        testDebuggingTools.debugTestFailure('Concurrent 1', new Error('Error 1'), {
          component: TestComponent,
          props: { title: 'Test 1' },
          enableHookTracing: false
        }),
        testDebuggingTools.debugTestFailure('Concurrent 2', new Error('Error 2'), {
          component: TestComponent,
          props: { title: 'Test 2' },
          enableHookTracing: false
        }),
        testDebuggingTools.debugTestFailure('Concurrent 3', new Error('Error 3'), {
          component: TestComponent,
          props: { title: 'Test 3' },
          enableHookTracing: false
        })
      ];

      const reports = await Promise.all(promises);

      expect(reports).toHaveLength(3);
      reports.forEach((report, index) => {
        expect(report.testName).toBe(`Concurrent ${index + 1}`);
        expect(report.debuggingSession.sessionId).toBeDefined();
      });
    });

    it('should maintain debugging history with size limit', async () => {
      // Perform debugging sessions up to the limit (50)
      for (let i = 0; i < 55; i++) {
        await testDebuggingTools.debugTestFailure(`Test ${i}`, new Error(`Error ${i}`), {
          component: TestComponent,
          props: { title: `Test ${i}` },
          enableHookTracing: false
        });
      }

      const history = testDebuggingTools['debugHistory'];
      expect(history).toHaveLength(50);
      
      // Should contain the most recent sessions
      expect(history[history.length - 1].testName).toBe('Test 54');
      expect(history[0].testName).toBe('Test 5'); // First 5 should be removed
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle undefined component gracefully', async () => {
      const error = new Error('Undefined component test');
      const options = {
        component: undefined as any,
        enableHookTracing: false
      };

      const report = await testDebuggingTools.debugTestFailure('Undefined component test', error, options);

      expect(report.componentName).toBe('Unknown');
      expect(report.overallAssessment.isFixable).toBe(false);
    });

    it('should handle empty props object', async () => {
      const error = new Error('Empty props test');
      const options = {
        component: TestComponent,
        props: {},
        enableHookTracing: false
      };

      const report = await testDebuggingTools.debugTestFailure('Empty props test', error, options);

      expect(report.renderingAnalysis?.propsAnalysis.providedProps).toEqual({});
    });

    it('should handle complex error objects', async () => {
      const complexError = new AggregateError([
        new Error('First error'),
        new TypeError('Type error'),
        new ReferenceError('Reference error')
      ], 'Complex aggregate error');

      const options = {
        component: TestComponent,
        props: { title: 'Complex Error Test' },
        enableHookTracing: false
      };

      const report = await testDebuggingTools.debugTestFailure('Complex error test', complexError, options);

      expect(report.failureAnalysis?.failureType).toBe('AGGREGATE_ERROR');
      expect(report.overallAssessment.severity).toBe('critical');
    });
  });
});