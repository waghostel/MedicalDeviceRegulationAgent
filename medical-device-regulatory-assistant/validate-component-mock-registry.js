/**
 * Simple validation script for ComponentMockRegistry
 */

const path = require('path');

console.log('Starting ComponentMockRegistry validation...');

try {
  // Test basic Node.js module loading
  console.log('✓ Node.js environment ready');
  
  // Test if TypeScript compilation works
  const tsNode = require('ts-node');
  console.log('✓ TypeScript environment ready');
  
  // Test if we can load the ComponentMockRegistry
  const { ComponentMockRegistry } = require('./src/lib/testing/ComponentMockRegistry.ts');
  console.log('✓ ComponentMockRegistry loaded successfully');
  
  // Test if we can create an instance
  const registry = new ComponentMockRegistry();
  console.log('✓ ComponentMockRegistry instance created');
  
  // Test basic functionality
  const stats = registry.getStats();
  console.log('✓ ComponentMockRegistry stats:', stats);
  
  console.log('\n✅ ComponentMockRegistry validation completed successfully!');
  
} catch (error) {
  console.error('\n❌ ComponentMockRegistry validation failed:');
  console.error(error.message);
  console.error('\nStack trace:');
  console.error(error.stack);
  process.exit(1);
}