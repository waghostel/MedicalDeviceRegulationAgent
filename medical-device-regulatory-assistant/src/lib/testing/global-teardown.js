/**
 * Global Jest teardown
 * Runs once after all test suites
 */

module.exports = async () => {
  // Cleanup any global resources
  
  // Force garbage collection if available
  if (global.gc) {
    global.gc();
  }
  
  console.log('🧹 Global test teardown completed');
};