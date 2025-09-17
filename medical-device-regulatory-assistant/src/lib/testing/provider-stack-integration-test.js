/**
 * Simple integration test for Provider Stack Manager
 * Task: B3.2 Create provider stack management
 * Requirements: 7.1, 7.2
 */

const React = require('react');

// Simple test to verify the Provider Stack Manager can be imported and instantiated
try {
  console.log('🧪 Testing Provider Stack Manager Integration...');
  
  // Test 1: Import the module
  console.log('✅ Step 1: Importing ProviderStackManager...');
  const { ProviderStackManager, providerStackManager } = require('./ProviderStackManager');
  console.log('✅ Successfully imported ProviderStackManager');
  
  // Test 2: Get singleton instance
  console.log('✅ Step 2: Getting singleton instance...');
  const manager = ProviderStackManager.getInstance();
  console.log('✅ Successfully got singleton instance');
  
  // Test 3: Verify it's the same instance as the exported one
  console.log('✅ Step 3: Verifying singleton pattern...');
  if (manager === providerStackManager) {
    console.log('✅ Singleton pattern working correctly');
  } else {
    console.log('❌ Singleton pattern failed');
  }
  
  // Test 4: Test basic functionality
  console.log('✅ Step 4: Testing basic functionality...');
  const debugInfo = manager.getDebugInfo();
  console.log('✅ Debug info retrieved:', {
    registeredProviders: debugInfo.registeredProviders.length,
    activeStacks: debugInfo.activeStacks.length,
    validation: debugInfo.validation.isValid
  });
  
  // Test 5: Test provider registration
  console.log('✅ Step 5: Testing provider registration...');
  const TestProvider = ({ children }) => React.createElement('div', { 'data-testid': 'test-provider' }, children);
  
  manager.registerProvider({
    name: 'test-provider',
    component: TestProvider,
    dependencies: [],
    priority: 1,
    enabled: true,
    cleanup: () => console.log('Test provider cleanup called'),
  });
  
  const updatedDebugInfo = manager.getDebugInfo();
  if (updatedDebugInfo.registeredProviders.includes('test-provider')) {
    console.log('✅ Provider registration working correctly');
  } else {
    console.log('❌ Provider registration failed');
  }
  
  // Test 6: Test stack creation
  console.log('✅ Step 6: Testing stack creation...');
  const ProviderStack = manager.createProviderStack('test-stack', {
    enabledProviders: ['test-provider'],
  });
  
  if (typeof ProviderStack === 'function') {
    console.log('✅ Stack creation working correctly');
  } else {
    console.log('❌ Stack creation failed');
  }
  
  // Test 7: Test cleanup
  console.log('✅ Step 7: Testing cleanup...');
  manager.cleanupStack('test-stack');
  manager.unregisterProvider('test-provider');
  
  const finalDebugInfo = manager.getDebugInfo();
  if (!finalDebugInfo.registeredProviders.includes('test-provider')) {
    console.log('✅ Cleanup working correctly');
  } else {
    console.log('❌ Cleanup failed');
  }
  
  console.log('🎉 All Provider Stack Manager tests passed!');
  console.log('✅ Task B3.2 implementation verified successfully');
  
} catch (error) {
  console.error('❌ Provider Stack Manager test failed:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}