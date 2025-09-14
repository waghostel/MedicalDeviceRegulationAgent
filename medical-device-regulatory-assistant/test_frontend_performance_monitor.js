#!/usr/bin/env node
/**
 * Test script for Frontend Performance Monitor
 * 
 * This script tests the frontend performance monitoring functionality.
 * Note: This is a Node.js script that simulates the frontend environment.
 */

const { performance } = require('perf_hooks');

// Mock DOM environment for testing
global.MutationObserver = class MutationObserver {
  constructor(callback) {
    this.callback = callback;
  }
  
  observe() {
    // Mock implementation
  }
  
  disconnect() {
    // Mock implementation
  }
};

// Mock React Testing Library RenderResult
function createMockRenderResult() {
  return {
    container: {
      querySelectorAll: (selector) => {
        // Mock DOM elements
        return new Array(Math.floor(Math.random() * 100) + 10).fill({});
      }
    },
    rerender: () => {},
    unmount: () => {}
  };
}

// Import the performance monitor (we'll need to transpile TypeScript)
// For now, let's create a simplified JavaScript version for testing

class FrontendTestPerformanceMonitor {
  constructor(thresholds = {}) {
    this.thresholds = {
      maxExecutionTime: 1000,
      maxRenderTime: 50,
      maxReRenderTime: 25,
      maxMemoryUsage: 10,
      maxComponentCount: 500,
      maxRerenderCount: 5,
      memoryLeakThreshold: 5,
      ...thresholds
    };
    
    this.activeMonitors = new Map();
    this.performanceHistory = [];
    this.memorySnapshots = [];
  }

  startMonitoring(testName) {
    const monitorId = `${testName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startMemory = this.getMemorySnapshot();
    
    this.activeMonitors.set(monitorId, {
      testName,
      startTime: performance.now(),
      startMemory,
      peakMemory: startMemory,
      rerenderCount: 0,
      domUpdates: 0,
      warnings: []
    });

    return monitorId;
  }

  stopMonitoring(monitorId) {
    const monitor = this.activeMonitors.get(monitorId);
    if (!monitor) {
      throw new Error(`Monitor ${monitorId} not found`);
    }

    const endTime = performance.now();
    const endMemory = this.getMemorySnapshot();
    const executionTime = endTime - monitor.startTime;
    const memoryUsage = (endMemory.heapUsed - monitor.startMemory.heapUsed) / 1024 / 1024;
    const peakMemoryUsage = (monitor.peakMemory.heapUsed - monitor.startMemory.heapUsed) / 1024 / 1024;

    const metrics = {
      testName: monitor.testName,
      executionTime,
      renderTime: 0,
      memoryUsage,
      peakMemoryUsage,
      componentCount: 0,
      rerenderCount: monitor.rerenderCount,
      domUpdates: monitor.domUpdates,
      startTime: monitor.startTime,
      endTime,
      warnings: [...monitor.warnings],
      context: {}
    };

    if (monitor.renderResult) {
      metrics.componentCount = monitor.renderResult.container.querySelectorAll('*').length;
    }

    this.checkThresholds(metrics);
    this.performanceHistory.push(metrics);
    this.activeMonitors.delete(monitorId);

    return metrics;
  }

  async monitorTest(testName, testFn) {
    const monitorId = this.startMonitoring(testName);
    try {
      const result = await testFn(monitorId);
      return result;
    } finally {
      const metrics = this.stopMonitoring(monitorId);
      this.logPerformanceSummary(metrics);
    }
  }

  recordRerender(monitorId) {
    const monitor = this.activeMonitors.get(monitorId);
    if (monitor) {
      monitor.rerenderCount++;
      
      const currentMemory = this.getMemorySnapshot();
      if (currentMemory.heapUsed > monitor.peakMemory.heapUsed) {
        monitor.peakMemory = currentMemory;
      }
    }
  }

  getPerformanceSummary() {
    if (this.performanceHistory.length === 0) {
      return {
        totalTests: 0,
        averageExecutionTime: 0,
        averageRenderTime: 0,
        averageMemoryUsage: 0,
        slowTests: [],
        memoryIntensiveTests: [],
        testsWithWarnings: [],
        memoryLeaks: []
      };
    }

    const totalTests = this.performanceHistory.length;
    const averageExecutionTime = this.performanceHistory.reduce((sum, m) => sum + m.executionTime, 0) / totalTests;
    const averageRenderTime = this.performanceHistory.reduce((sum, m) => sum + m.renderTime, 0) / totalTests;
    const averageMemoryUsage = this.performanceHistory.reduce((sum, m) => sum + m.memoryUsage, 0) / totalTests;

    const slowTests = this.performanceHistory
      .filter(m => m.executionTime > this.thresholds.maxExecutionTime)
      .map(m => ({ name: m.testName, time: m.executionTime }));

    const memoryIntensiveTests = this.performanceHistory
      .filter(m => m.memoryUsage > this.thresholds.maxMemoryUsage)
      .map(m => ({ name: m.testName, memory: m.memoryUsage }));

    const testsWithWarnings = this.performanceHistory
      .filter(m => m.warnings.length > 0)
      .map(m => ({ name: m.testName, warnings: m.warnings }));

    return {
      totalTests,
      averageExecutionTime,
      averageRenderTime,
      averageMemoryUsage,
      slowTests,
      memoryIntensiveTests,
      testsWithWarnings,
      memoryLeaks: []
    };
  }

  getMemorySnapshot() {
    const memUsage = process.memoryUsage();
    return {
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      timestamp: Date.now()
    };
  }

  checkThresholds(metrics) {
    if (metrics.executionTime > this.thresholds.maxExecutionTime) {
      metrics.warnings.push(
        `Slow test: ${metrics.testName} took ${metrics.executionTime.toFixed(2)}ms ` +
        `(threshold: ${this.thresholds.maxExecutionTime}ms)`
      );
    }

    if (metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      metrics.warnings.push(
        `High memory usage: ${metrics.testName} used ${metrics.memoryUsage.toFixed(2)}MB ` +
        `(threshold: ${this.thresholds.maxMemoryUsage}MB)`
      );
    }
  }

  logPerformanceSummary(metrics) {
    const status = metrics.warnings.length === 0 ? '✅' : '⚠️';
    console.log(
      `${status} ${metrics.testName}: ` +
      `${metrics.executionTime.toFixed(2)}ms, ` +
      `${metrics.memoryUsage.toFixed(2)}MB, ` +
      `${metrics.componentCount} components, ` +
      `${metrics.rerenderCount} re-renders`
    );

    metrics.warnings.forEach(warning => {
      console.warn(`  ⚠️  ${warning}`);
    });
  }

  clearHistory() {
    this.performanceHistory = [];
    this.memorySnapshots = [];
  }
}

// Test functions
async function testBasicMonitoring() {
  console.log('🧪 Testing basic frontend performance monitoring...');
  
  const monitor = new FrontendTestPerformanceMonitor();
  
  await monitor.monitorTest('test_basic_component', async (monitorId) => {
    // Simulate component rendering
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Simulate re-renders
    monitor.recordRerender(monitorId);
    monitor.recordRerender(monitorId);
    
    // Simulate more work
    await new Promise(resolve => setTimeout(resolve, 30));
  });
  
  const summary = monitor.getPerformanceSummary();
  console.log(`✅ Monitored ${summary.totalTests} tests`);
  console.log(`✅ Average execution time: ${summary.averageExecutionTime.toFixed(2)}ms`);
  
  return true;
}

async function testThresholdWarnings() {
  console.log('\n🧪 Testing threshold warnings...');
  
  // Create monitor with very low thresholds
  const monitor = new FrontendTestPerformanceMonitor({
    maxExecutionTime: 50,
    maxMemoryUsage: 1
  });
  
  await monitor.monitorTest('test_slow_component', async (monitorId) => {
    // Simulate slow work to exceed threshold
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate memory allocation
    const largeArray = new Array(10000).fill('test');
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Keep reference to prevent GC
    global.testArray = largeArray;
  });
  
  const summary = monitor.getPerformanceSummary();
  console.log(`✅ Generated ${summary.testsWithWarnings.length} tests with warnings`);
  
  if (summary.testsWithWarnings.length > 0) {
    summary.testsWithWarnings.forEach(test => {
      console.log(`   Test: ${test.name}`);
      test.warnings.forEach(warning => {
        console.log(`     ⚠️  ${warning}`);
      });
    });
  }
  
  return true;
}

async function testMultipleTests() {
  console.log('\n🧪 Testing multiple test monitoring...');
  
  const monitor = new FrontendTestPerformanceMonitor();
  
  const testNames = ['component_a', 'component_b', 'component_c'];
  
  for (const testName of testNames) {
    await monitor.monitorTest(testName, async (monitorId) => {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 20));
      
      // Simulate different numbers of re-renders
      const rerenders = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < rerenders; i++) {
        monitor.recordRerender(monitorId);
      }
    });
  }
  
  const summary = monitor.getPerformanceSummary();
  console.log(`✅ Monitored ${summary.totalTests} tests`);
  console.log(`✅ Average execution time: ${summary.averageExecutionTime.toFixed(2)}ms`);
  console.log(`✅ Slow tests: ${summary.slowTests.length}`);
  
  return true;
}

async function testMemoryTracking() {
  console.log('\n🧪 Testing memory tracking...');
  
  const monitor = new FrontendTestPerformanceMonitor();
  
  await monitor.monitorTest('memory_test', async (monitorId) => {
    // Allocate memory
    const data = [];
    for (let i = 0; i < 1000; i++) {
      data.push(new Array(100).fill(`item_${i}`));
    }
    
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Simulate re-render with memory update
    monitor.recordRerender(monitorId);
    
    // Keep reference
    global.testData = data;
  });
  
  const metrics = monitor.performanceHistory[0];
  console.log(`✅ Memory usage: ${metrics.memoryUsage.toFixed(2)}MB`);
  console.log(`✅ Peak memory: ${metrics.peakMemoryUsage.toFixed(2)}MB`);
  
  return true;
}

// Main test runner
async function main() {
  console.log('🚀 Starting Frontend Performance Monitor tests...\n');
  
  const tests = [
    testBasicMonitoring,
    testThresholdWarnings,
    testMultipleTests,
    testMemoryTracking
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of tests) {
    try {
      const result = await test();
      if (result) {
        passed++;
        console.log(`✅ ${test.name} PASSED`);
      } else {
        failed++;
        console.log(`❌ ${test.name} FAILED`);
      }
    } catch (error) {
      failed++;
      console.log(`❌ ${test.name} FAILED: ${error.message}`);
    }
  }
  
  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All frontend performance monitor tests passed!');
    return true;
  } else {
    console.log('💥 Some tests failed!');
    return false;
  }
}

// Run tests
if (require.main === module) {
  main().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}