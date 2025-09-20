#!/usr/bin/env node

/**
 * Test script for the Format and Lint Hook
 * Creates test files with various issues and runs the hook to verify functionality
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Test files with different types of issues
const testFiles = {
  'test-format-issues.js': `
// File with formatting issues
let   x    =    "hello"   +   "world";
var y=42;
const obj={a:1,b:2,c:3};

function test(  ){
return x+y;
}
`,

  'test-lint-issues.ts': `
// File with linting issues
let unusedVar = "test";
var oldStyleVar = "old";

function testFunc() {
  console.log("debug message");
  return "test";
}

const obj = {
  testFunc: testFunc,
  value: oldStyleVar
};
`,

  'test-complex-issues.tsx': `
// File with both formatting and linting issues
import React from 'react';

const Component=({prop1,prop2})=>{
let state=useState(null);
var count=0;

useEffect(()=>{
console.log("effect");
},[]);

return <div onClick={()=>count++}>{prop1+prop2}</div>;
};

export default Component;
`,
};

console.log('🧪 Testing Format and Lint Hook');
console.log('===============================\n');

// Create test files
console.log('📝 Creating test files...');
Object.entries(testFiles).forEach(([filename, content]) => {
  fs.writeFileSync(filename, content);
  console.log(`   Created: ${filename}`);
});

console.log('\n🔧 Running Format and Lint Hook...\n');

// Run the hook
try {
  const FormatAndLintHook = require('./.kiro/hooks/format-and-lint-autofix.js');
  const hook = new FormatAndLintHook();

  const testFileNames = Object.keys(testFiles);
  hook.execute(testFileNames).then((result) => {
    console.log('\n📊 Test Results:');
    console.log('================');
    console.log(`Success: ${result.success}`);
    console.log(`Formatted files: ${result.formatting.formattedFiles}`);
    console.log(`Remaining issues: ${result.linting.remainingIssues}`);

    // Cleanup
    console.log('\n🧹 Cleaning up test files...');
    testFileNames.forEach((filename) => {
      if (fs.existsSync(filename)) {
        fs.unlinkSync(filename);
        console.log(`   Removed: ${filename}`);
      }
    });

    console.log('\n✅ Hook test completed!');
  });
} catch (error) {
  console.error('❌ Hook test failed:', error.message);

  // Cleanup on error
  Object.keys(testFiles).forEach((filename) => {
    if (fs.existsSync(filename)) {
      fs.unlinkSync(filename);
    }
  });
}
