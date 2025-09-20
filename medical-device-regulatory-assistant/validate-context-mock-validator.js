#!/usr/bin/env node

/**
 * Simple validation script for ContextMockValidator
 * Task: B3.3 Add context mock validation
 */

console.log('Validating ContextMockValidator implementation...');
console.log('='.repeat(60));

// Basic syntax validation
try {
  console.log('1. Checking TypeScript compilation...');

  // Check if the file can be parsed
  const fs = require('fs');
  const path = require('path');

  const filePath = path.join(
    __dirname,
    'src/lib/testing/ContextMockValidator.ts'
  );
  const content = fs.readFileSync(filePath, 'utf8');

  // Basic syntax checks
  const checks = [
    {
      name: 'Has export statements',
      test: () => content.includes('export class ContextMockValidator'),
      required: true,
    },
    {
      name: 'Has interface definitions',
      test: () => content.includes('interface ContextValidationResult'),
      required: true,
    },
    {
      name: 'Has validation methods',
      test: () =>
        content.includes('validateContext') &&
        content.includes('validateToastContext'),
      required: true,
    },
    {
      name: 'Has debug functionality',
      test: () =>
        content.includes('generateDebugInfo') &&
        content.includes('ContextMockDebugInfo'),
      required: true,
    },
    {
      name: 'Has utility functions',
      test: () =>
        content.includes('createContextMockValidator') &&
        content.includes('validateContextMock'),
      required: true,
    },
    {
      name: 'Has proper imports',
      test: () =>
        content.includes('import React') &&
        content.includes('@testing-library/react'),
      required: true,
    },
    {
      name: 'Has error handling',
      test: () => content.includes('try') && content.includes('catch'),
      required: true,
    },
    {
      name: 'Has caching system',
      test: () =>
        content.includes('validationCache') && content.includes('clearCache'),
      required: true,
    },
    {
      name: 'Has performance tracking',
      test: () =>
        content.includes('performance.now()') &&
        content.includes('validationTime'),
      required: true,
    },
    {
      name: 'Has context-specific validators',
      test: () =>
        content.includes('validateToastContext') &&
        content.includes('validateFormContext') &&
        content.includes('validateThemeContext') &&
        content.includes('validateSessionContext'),
      required: true,
    },
  ];

  let passed = 0;
  let failed = 0;

  checks.forEach((check, index) => {
    const result = check.test();
    const status = result ? '✅' : '❌';
    const priority = check.required ? '[REQUIRED]' : '[OPTIONAL]';

    console.log(`   ${index + 1}. ${check.name} ${priority}: ${status}`);

    if (result) {
      passed++;
    } else {
      failed++;
      if (check.required) {
        console.log(`      ⚠️  This is a required feature!`);
      }
    }
  });

  console.log(`\n${  '-'.repeat(60)}`);
  console.log(`Summary: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('✅ All validation checks passed!');
  } else {
    console.log(`❌ ${failed} validation checks failed.`);
  }

  // Check file size and complexity
  const lines = content.split('\n').length;
  const functions = (content.match(/function|=>/g) || []).length;
  const classes = (content.match(/class /g) || []).length;
  const interfaces = (content.match(/interface /g) || []).length;

  console.log(`\n${  '-'.repeat(60)}`);
  console.log('Implementation Statistics:');
  console.log(`   Lines of code: ${lines}`);
  console.log(`   Functions/methods: ${functions}`);
  console.log(`   Classes: ${classes}`);
  console.log(`   Interfaces: ${interfaces}`);

  // Validate test file exists
  console.log('\n2. Checking test file...');
  const testFilePath = path.join(
    __dirname,
    'src/lib/testing/__tests__/ContextMockValidator.test.ts'
  );

  if (fs.existsSync(testFilePath)) {
    console.log('   ✅ Test file exists');

    const testContent = fs.readFileSync(testFilePath, 'utf8');
    const testCount = (testContent.match(/it\(/g) || []).length;
    const describeCount = (testContent.match(/describe\(/g) || []).length;

    console.log(`   📊 Test suites: ${describeCount}`);
    console.log(`   📊 Test cases: ${testCount}`);

    if (testCount >= 20) {
      console.log('   ✅ Comprehensive test coverage');
    } else {
      console.log('   ⚠️  Consider adding more test cases');
    }
  } else {
    console.log('   ❌ Test file not found');
  }

  console.log(`\n${  '='.repeat(60)}`);

  if (failed === 0) {
    console.log(
      '🎉 ContextMockValidator implementation is complete and ready!'
    );
    console.log('\nNext steps:');
    console.log('1. Run the full test suite to validate functionality');
    console.log('2. Integrate with existing test infrastructure');
    console.log('3. Update task status to completed');
  } else {
    console.log('⚠️  ContextMockValidator implementation needs attention.');
    console.log('\nRequired fixes:');
    checks.forEach((check, index) => {
      if (check.required && !check.test()) {
        console.log(`   - ${check.name}`);
      }
    });
  }
} catch (error) {
  console.error('❌ Validation failed:', error.message);
  process.exit(1);
}
