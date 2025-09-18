#!/usr/bin/env node

/**
 * Simple Command Verification Script
 * Verifies that pnpm test commands are properly configured without running actual tests
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Simple Command Verification Script');
console.log('=====================================\n');

// Check if we're in the right directory
const packageJsonPath = path.join(process.cwd(), 'medical-device-regulatory-assistant', 'package.json');
const workingDir = fs.existsSync(packageJsonPath) 
  ? path.join(process.cwd(), 'medical-device-regulatory-assistant')
  : process.cwd();

console.log(`Working directory: ${workingDir}\n`);

// Change to the correct directory if needed
if (workingDir !== process.cwd()) {
  process.chdir(workingDir);
  console.log(`Changed to directory: ${workingDir}\n`);
}

// Verify pnpm is available
try {
  const pnpmVersion = execSync('pnpm --version', { stdio: 'pipe', encoding: 'utf8' }).trim();
  console.log(`✅ pnpm is available (version ${pnpmVersion})\n`);
} catch (error) {
  console.error('❌ pnpm is not available. Please install pnpm first.');
  process.exit(1);
}

// Read package.json to verify test scripts
let packageJson;
try {
  const packageJsonContent = fs.readFileSync('package.json', 'utf8');
  packageJson = JSON.parse(packageJsonContent);
  console.log('✅ package.json found and parsed\n');
} catch (error) {
  console.error('❌ Could not read package.json');
  process.exit(1);
}

// Test scripts to verify
const testScripts = [
  'test',
  'test:fast',
  'test:errors', 
  'test:bail',
  'test:watch',
  'test:coverage',
  'test:coverage:fast',
  'test:unit',
  'test:integration',
  'test:accessibility',
  'test:e2e'
];

console.log('📋 VERIFYING TEST SCRIPTS IN PACKAGE.JSON');
console.log('==========================================\n');

const results = {
  found: [],
  missing: []
};

testScripts.forEach(script => {
  if (packageJson.scripts && packageJson.scripts[script]) {
    console.log(`✅ ${script}: ${packageJson.scripts[script]}`);
    results.found.push({
      name: script,
      command: packageJson.scripts[script]
    });
  } else {
    console.log(`❌ ${script}: NOT FOUND`);
    results.missing.push(script);
  }
});

console.log('\n📊 VERIFICATION SUMMARY');
console.log('=======================\n');

console.log(`✅ Found scripts: ${results.found.length}`);
console.log(`❌ Missing scripts: ${results.missing.length}`);
console.log(`📊 Total checked: ${testScripts.length}\n`);

// Show found scripts
if (results.found.length > 0) {
  console.log('✅ AVAILABLE TEST COMMANDS:');
  results.found.forEach(result => {
    console.log(`  pnpm ${result.name}`);
  });
  console.log('');
}

// Show missing scripts
if (results.missing.length > 0) {
  console.log('❌ MISSING TEST COMMANDS:');
  results.missing.forEach(script => {
    console.log(`  pnpm ${script}`);
  });
  console.log('');
}

// Verify Jest configuration exists
const jestConfigFiles = [
  'jest.config.js',
  'jest.config.ts', 
  'jest.config.json'
];

console.log('🔧 VERIFYING JEST CONFIGURATION');
console.log('===============================\n');

let jestConfigFound = false;
jestConfigFiles.forEach(configFile => {
  if (fs.existsSync(configFile)) {
    console.log(`✅ ${configFile} found`);
    jestConfigFound = true;
  } else {
    console.log(`❌ ${configFile} not found`);
  }
});

if (!jestConfigFound) {
  console.log('⚠️  No Jest configuration file found');
} else {
  console.log('✅ Jest configuration available');
}

console.log('');

// Test command syntax validation
console.log('🔍 VALIDATING COMMAND SYNTAX');
console.log('============================\n');

const commandPatterns = [
  {
    name: 'Speed Optimization',
    pattern: /--maxWorkers=\d+%/,
    description: 'Uses maxWorkers for parallel execution'
  },
  {
    name: 'Cache Usage',
    pattern: /--cache/,
    description: 'Enables Jest caching for faster runs'
  },
  {
    name: 'Silent Mode',
    pattern: /--silent/,
    description: 'Reduces output for faster execution'
  },
  {
    name: 'Reporter Configuration',
    pattern: /--reporters=/,
    description: 'Uses custom reporters for minimal output'
  },
  {
    name: 'Coverage Optimization',
    pattern: /--coverageReporters=/,
    description: 'Optimized coverage reporting'
  }
];

results.found.forEach(script => {
  console.log(`📝 Analyzing: pnpm ${script.name}`);
  console.log(`   Command: ${script.command}`);
  
  commandPatterns.forEach(pattern => {
    if (pattern.pattern.test(script.command)) {
      console.log(`   ✅ ${pattern.name}: ${pattern.description}`);
    }
  });
  console.log('');
});

// Performance recommendations
console.log('💡 PERFORMANCE RECOMMENDATIONS');
console.log('==============================\n');

const recommendations = [
  'Use --maxWorkers=75% for balanced performance',
  'Always include --cache for faster subsequent runs',
  'Use --silent to reduce output overhead',
  'Use --reporters=summary for minimal output',
  'Use --bail to stop on first failure for quick feedback'
];

recommendations.forEach(rec => {
  console.log(`  • ${rec}`);
});

console.log('\n🎯 QUICK REFERENCE COMMANDS');
console.log('===========================\n');

const quickCommands = [
  {
    name: 'Health Check',
    command: 'pnpm test:fast',
    description: 'Fast overview of test status'
  },
  {
    name: 'Error Detection',
    command: 'pnpm test:errors',
    description: 'Show only failing tests'
  },
  {
    name: 'Coverage Summary',
    command: 'pnpm test:coverage:fast',
    description: 'Quick coverage report'
  },
  {
    name: 'Watch Mode',
    command: 'pnpm test:watch',
    description: 'Interactive test watching'
  }
];

quickCommands.forEach(cmd => {
  const scriptExists = results.found.some(s => s.name === cmd.command.replace('pnpm ', ''));
  const status = scriptExists ? '✅' : '❌';
  console.log(`${status} ${cmd.command} - ${cmd.description}`);
});

console.log('\n🏁 Verification complete!');

// Exit with appropriate code
const success = results.missing.length === 0 && jestConfigFound;
console.log(`\n${success ? '🎉 All commands verified successfully!' : '⚠️  Some issues found - check the output above'}`);

process.exit(success ? 0 : 1);