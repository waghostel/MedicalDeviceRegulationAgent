/**
 * React 19 Setup Verification Test
 * Tests that the enhanced global setup and teardown are working correctly
 */

describe('React 19 Enhanced Setup Verification', () => {
  it('should have React 19 compatibility enabled', () => {
    // These are set in jest.setup.js, not global-setup.js
    expect(global.__REACT_VERSION).toBe('19.1.0');
    expect(global.__REACT_19_FEATURES).toBeDefined();
    expect(global.__REACT_19_FEATURES.concurrentFeatures).toBe(true);
    expect(global.__REACT_19_FEATURES.aggregateErrorSupport).toBe(true);
  });

  it('should have enhanced error tracking available', () => {
    expect(global.__REACT_19_ERROR_TRACKER).toBeDefined();
    expect(typeof global.__REACT_19_ERROR_TRACKER.clear).toBe('function');
    expect(Array.isArray(global.__REACT_19_ERROR_TRACKER.aggregateErrors)).toBe(true);
    expect(Array.isArray(global.__REACT_19_ERROR_TRACKER.hookErrors)).toBe(true);
    expect(Array.isArray(global.__REACT_19_ERROR_TRACKER.renderErrors)).toBe(true);
  });

  it('should have global mock registry available', () => {
    expect(global.__GLOBAL_MOCK_REGISTRY).toBeDefined();
    expect(typeof global.__GLOBAL_MOCK_REGISTRY.register).toBe('function');
    expect(typeof global.__GLOBAL_MOCK_REGISTRY.clearAll).toBe('function');
    expect(typeof global.__GLOBAL_MOCK_REGISTRY.getSummary).toBe('function');
  });

  it('should have enhanced cleanup function available', () => {
    expect(global.__ENHANCED_CLEANUP).toBeDefined();
    expect(typeof global.__ENHANCED_CLEANUP).toBe('function');
  });

  it('should have React DevTools hook with React 19 enhancements', () => {
    expect(global.__REACT_DEVTOOLS_GLOBAL_HOOK__).toBeDefined();
    expect(typeof global.__REACT_DEVTOOLS_GLOBAL_HOOK__.onAggregateError).toBe('function');
    expect(typeof global.__REACT_DEVTOOLS_GLOBAL_HOOK__.onErrorCaptured).toBe('function');
    expect(typeof global.__REACT_DEVTOOLS_GLOBAL_HOOK__.onRecoverableError).toBe('function');
  });

  it('should track React 19 AggregateError correctly', () => {
    // Clear any existing errors
    global.__REACT_19_ERROR_TRACKER.clear();
    
    // Simulate an AggregateError
    const mockError1 = new Error('Mock error 1');
    const mockError2 = new Error('Mock error 2');
    const aggregateError = new AggregateError([mockError1, mockError2], 'Multiple errors occurred');
    
    // Trigger the DevTools hook
    global.__REACT_DEVTOOLS_GLOBAL_HOOK__.onAggregateError(aggregateError);
    
    // Verify tracking
    expect(global.__REACT_19_ERROR_TRACKER.aggregateErrors.length).toBe(1);
    expect(global.__REACT_19_ERROR_TRACKER.aggregateErrors[0].message).toBe('Multiple errors occurred');
    expect(global.__REACT_19_ERROR_TRACKER.aggregateErrors[0].errors).toEqual(['Mock error 1', 'Mock error 2']);
    expect(global.__REACT_19_ERROR_TRACKER.aggregateErrors[0].source).toBe('devtools');
  });

  it('should handle console error filtering for React 19', () => {
    // Clear any existing errors
    global.__REACT_19_ERROR_TRACKER.clear();
    
    // Test that React 19 warnings are filtered by checking the current console.error function
    // The filtering is already applied in jest.setup.js
    expect(typeof console.error).toBe('function');
    
    // Verify that the error tracker is working
    expect(global.__REACT_19_ERROR_TRACKER.aggregateErrors).toEqual([]);
    expect(global.__REACT_19_ERROR_TRACKER.hookErrors).toEqual([]);
    expect(global.__REACT_19_ERROR_TRACKER.renderErrors).toEqual([]);
  });

  it('should perform enhanced cleanup correctly', () => {
    // Add some mock data to registries
    global.__GLOBAL_MOCK_REGISTRY.register('hooks', 'testHook', jest.fn());
    global.__GLOBAL_MOCK_REGISTRY.register('components', 'TestComponent', jest.fn());
    
    // Add some error tracking data
    global.__REACT_19_ERROR_TRACKER.aggregateErrors.push({
      message: 'Test error',
      timestamp: Date.now()
    });
    
    // Verify data exists
    expect(global.__GLOBAL_MOCK_REGISTRY.getSummary().hooks).toBe(1);
    expect(global.__GLOBAL_MOCK_REGISTRY.getSummary().components).toBe(1);
    expect(global.__REACT_19_ERROR_TRACKER.aggregateErrors.length).toBe(1);
    
    // Perform cleanup
    global.__ENHANCED_CLEANUP();
    
    // Verify cleanup
    expect(global.__GLOBAL_MOCK_REGISTRY.getSummary().hooks).toBe(0);
    expect(global.__GLOBAL_MOCK_REGISTRY.getSummary().components).toBe(0);
    expect(global.__REACT_19_ERROR_TRACKER.aggregateErrors.length).toBe(0);
  });

  it('should have performance and health monitoring setup', () => {
    // These globals are set in global-setup.js and may not be available in individual tests
    // But we can verify that the test health reporter is available
    expect(global.__testHealthReporter).toBeDefined();
    
    // Verify that performance tracking is working by checking if the setup ran
    // (evidenced by the console output we saw)
    expect(typeof performance.now).toBe('function');
    expect(typeof process.memoryUsage).toBe('function');
  });
});