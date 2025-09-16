/**
 * Global Jest teardown
 * Runs once after all test suites
 * Enhanced for React 19 compatibility and comprehensive cleanup
 */

const { performance } = require('perf_hooks');
const { writeFileSync, existsSync } = require('fs');
const { join } = require('path');

module.exports = async () => {
  const teardownStartTime = performance.now();
  
  console.log('🧹 Starting enhanced global test teardown...');
  
  // Collect final statistics
  const finalStats = {
    teardownStartTime: Date.now(),
    setupTime: global.__SETUP_PERFORMANCE ? global.__SETUP_PERFORMANCE.getSetupTime() : 0,
    react19Features: global.__REACT_19_FEATURE_DETECTION ? global.__REACT_19_FEATURE_DETECTION.getEnabledFeatures().length : 0,
    errorSummary: global.__GLOBAL_ERROR_TRACKER ? global.__GLOBAL_ERROR_TRACKER.getSummary() : {},
    mockCount: global.__ENHANCED_MOCK_SYSTEM ? global.__ENHANCED_MOCK_SYSTEM.getMockCount() : 0,
    memoryBaseline: global.__SETUP_MEMORY_BASELINE || {},
    react19SetupComplete: global.__REACT_19_SETUP_COMPLETE || false
  };
  
  // Get current memory usage for comparison
  const currentMemory = process.memoryUsage();
  const finalMemoryUsage = {
    heapUsed: currentMemory.heapUsed / 1024 / 1024, // MB
    heapTotal: currentMemory.heapTotal / 1024 / 1024, // MB
    external: currentMemory.external / 1024 / 1024, // MB
    rss: currentMemory.rss / 1024 / 1024, // MB
    timestamp: Date.now()
  };
  
  // Calculate memory delta from setup
  let memoryDelta = {};
  if (global.__SETUP_MEMORY_BASELINE) {
    memoryDelta = {
      heapUsed: finalMemoryUsage.heapUsed - global.__SETUP_MEMORY_BASELINE.heapUsed,
      heapTotal: finalMemoryUsage.heapTotal - global.__SETUP_MEMORY_BASELINE.heapTotal,
      external: finalMemoryUsage.external - global.__SETUP_MEMORY_BASELINE.external,
      rss: finalMemoryUsage.rss - global.__SETUP_MEMORY_BASELINE.rss
    };
  }
  
  // Cleanup enhanced mock system
  if (global.__ENHANCED_MOCK_SYSTEM) {
    try {
      console.log(`🧽 Cleaning up ${global.__ENHANCED_MOCK_SYSTEM.getMockCount()} registered mocks...`);
      global.__ENHANCED_MOCK_SYSTEM.clearAllMocks();
    } catch (error) {
      console.warn('⚠️  Error during mock system cleanup:', error.message);
    }
  }
  
  // Cleanup global mock registry
  if (global.__GLOBAL_MOCK_REGISTRY) {
    try {
      const mockSummary = global.__GLOBAL_MOCK_REGISTRY.getSummary();
      console.log('🧽 Cleaning up global mock registry:', mockSummary);
      global.__GLOBAL_MOCK_REGISTRY.clearAll();
    } catch (error) {
      console.warn('⚠️  Error during global mock registry cleanup:', error.message);
    }
  }
  
  // Cleanup React 19 error tracking
  if (global.__REACT_19_ERROR_TRACKER) {
    const errorSummary = {
      aggregateErrors: global.__REACT_19_ERROR_TRACKER.aggregateErrors.length,
      hookErrors: global.__REACT_19_ERROR_TRACKER.hookErrors.length,
      renderErrors: global.__REACT_19_ERROR_TRACKER.renderErrors.length
    };
    
    if (errorSummary.aggregateErrors > 0 || errorSummary.hookErrors > 0 || errorSummary.renderErrors > 0) {
      console.log('📊 React 19 Error Summary:', errorSummary);
      
      // Log detailed error information if verbose
      if (process.env.JEST_VERBOSE) {
        if (global.__REACT_19_ERROR_TRACKER.aggregateErrors.length > 0) {
          console.log('🚨 AggregateErrors encountered:');
          global.__REACT_19_ERROR_TRACKER.aggregateErrors.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error.message} (${error.errors?.length || 0} individual errors)`);
          });
        }
        
        if (global.__REACT_19_ERROR_TRACKER.hookErrors.length > 0) {
          console.log('🪝 Hook Errors encountered:');
          global.__REACT_19_ERROR_TRACKER.hookErrors.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error.message}`);
          });
        }
        
        if (global.__REACT_19_ERROR_TRACKER.renderErrors.length > 0) {
          console.log('🎨 Render Errors encountered:');
          global.__REACT_19_ERROR_TRACKER.renderErrors.forEach((error, index) => {
            console.log(`   ${index + 1}. ${error.message}`);
          });
        }
      }
    }
    
    global.__REACT_19_ERROR_TRACKER.clear();
  }
  
  // Cleanup global error tracker
  if (global.__GLOBAL_ERROR_TRACKER) {
    const globalErrorSummary = global.__GLOBAL_ERROR_TRACKER.getSummary();
    if (globalErrorSummary.total > 0) {
      console.log('📊 Global Error Summary:', globalErrorSummary);
    }
    global.__GLOBAL_ERROR_TRACKER.clear();
  }
  
  // Restore original console methods
  if (global.__ORIGINAL_CONSOLE_METHODS) {
    console.error = global.__ORIGINAL_CONSOLE_METHODS.error;
    console.warn = global.__ORIGINAL_CONSOLE_METHODS.warn;
  }
  
  // Cleanup enhanced cleanup function
  if (global.__ENHANCED_CLEANUP) {
    try {
      global.__ENHANCED_CLEANUP();
    } catch (error) {
      console.warn('⚠️  Error during enhanced cleanup:', error.message);
    }
  }
  
  // Clear React 19 globals
  delete global.__REACT_19_SETUP_COMPLETE;
  delete global.__REACT_19_SETUP_TIMESTAMP;
  delete global.__REACT_19_FEATURE_DETECTION;
  delete global.__REACT_VERSION;
  delete global.__REACT_19_FEATURES;
  delete global.__JEST_SETUP_VERSION;
  
  // Clear performance tracking globals
  delete global.__SETUP_PERFORMANCE;
  delete global.__SETUP_MEMORY_BASELINE;
  
  // Clear enhanced systems
  delete global.__ENHANCED_MOCK_SYSTEM;
  delete global.__GLOBAL_MOCK_REGISTRY;
  delete global.__REACT_19_ERROR_TRACKER;
  delete global.__GLOBAL_ERROR_TRACKER;
  delete global.__ORIGINAL_CONSOLE_METHODS;
  delete global.__ENHANCED_CLEANUP;
  
  // Force garbage collection if available (helps with memory cleanup)
  if (global.gc) {
    console.log('🗑️  Running garbage collection...');
    global.gc();
  }
  
  // Generate final teardown report
  const teardownTime = performance.now() - teardownStartTime;
  const finalReport = {
    ...finalStats,
    finalMemoryUsage,
    memoryDelta,
    teardownTime,
    teardownCompletedAt: Date.now()
  };
  
  // Save final report to test health data
  try {
    const healthDataPath = join('./test-health-data', 'final-teardown-report.json');
    writeFileSync(healthDataPath, JSON.stringify(finalReport, null, 2));
  } catch (error) {
    console.warn('⚠️  Could not save final teardown report:', error.message);
  }
  
  // Log final summary
  console.log('✅ Enhanced global test teardown completed');
  console.log(`   Teardown Time: ${teardownTime.toFixed(2)}ms`);
  console.log(`   Final Memory: ${finalMemoryUsage.heapUsed.toFixed(2)}MB heap, ${finalMemoryUsage.rss.toFixed(2)}MB RSS`);
  
  if (Object.keys(memoryDelta).length > 0) {
    const heapDelta = memoryDelta.heapUsed;
    const deltaSign = heapDelta >= 0 ? '+' : '';
    console.log(`   Memory Delta: ${deltaSign}${heapDelta.toFixed(2)}MB heap`);
    
    // Warn about potential memory leaks
    if (heapDelta > 50) { // More than 50MB increase
      console.warn('⚠️  Potential memory leak detected: heap usage increased by more than 50MB');
    }
  }
  
  console.log(`   React 19 Compatibility: ${finalStats.react19SetupComplete ? '✅ Enabled' : '❌ Disabled'}`);
  console.log(`   Total Errors Tracked: ${finalStats.errorSummary.total || 0}`);
  
  // Log detailed breakdown if verbose
  if (process.env.JEST_VERBOSE) {
    console.log('📊 Final Test Session Summary:');
    console.log(`   Setup Time: ${finalStats.setupTime.toFixed(2)}ms`);
    console.log(`   React 19 Features: ${finalStats.react19Features}`);
    console.log(`   Mocks Registered: ${finalStats.mockCount}`);
    console.log(`   Error Breakdown:`, finalStats.errorSummary);
    
    if (Object.keys(memoryDelta).length > 0) {
      console.log('   Memory Usage Breakdown:');
      console.log(`     Heap Used: ${memoryDelta.heapUsed.toFixed(2)}MB delta`);
      console.log(`     Heap Total: ${memoryDelta.heapTotal.toFixed(2)}MB delta`);
      console.log(`     External: ${memoryDelta.external.toFixed(2)}MB delta`);
      console.log(`     RSS: ${memoryDelta.rss.toFixed(2)}MB delta`);
    }
  }
  
  console.log('🎯 All test infrastructure cleanup completed successfully');
};