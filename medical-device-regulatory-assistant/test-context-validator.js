#!/usr/bin/env node

/**
 * Test runner for ContextMockValidator
 * Task: B3.3 Add context mock validation
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('Testing ContextMockValidator...');
console.log('='.repeat(50));

try {
  // Run the specific test file
  const testCommand =
    'npx jest src/lib/testing/__tests__/ContextMockValidator.test.ts --verbose';

  console.log(`Running: ${testCommand}`);
  console.log('-'.repeat(50));

  const result = execSync(testCommand, {
    cwd: __dirname,
    stdio: 'inherit',
    encoding: 'utf8',
  });

  console.log('-'.repeat(50));
  console.log('✅ ContextMockValidator tests completed successfully!');
} catch (error) {
  console.error('-'.repeat(50));
  console.error('❌ ContextMockValidator tests failed:');
  console.error(error.message);

  // Try alternative test command
  console.log('\nTrying alternative test command...');
  try {
    const altCommand =
      'npx jest --testNamePattern="ContextMockValidator" --verbose';
    console.log(`Running: ${altCommand}`);

    execSync(altCommand, {
      cwd: __dirname,
      stdio: 'inherit',
      encoding: 'utf8',
    });

    console.log('✅ Alternative test command succeeded!');
  } catch (altError) {
    console.error('❌ Alternative test also failed:', altError.message);
    process.exit(1);
  }
}
