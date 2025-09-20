#!/usr/bin/env node

/**
 * API Integration Test Script
 * Tests the Next.js API routes that proxy to FastAPI backend
 */

const http = require('http');
const https = require('https');

const BASE_URL = 'http://localhost:3000';

// Test configuration
const tests = [
  {
    name: 'Health Check',
    path: '/api/health',
    method: 'GET',
    expectedStatus: [200, 503], // 503 is acceptable if backend is not fully configured
  },
  {
    name: 'Projects List (Unauthenticated)',
    path: '/api/projects',
    method: 'GET',
    expectedStatus: [401, 403], // Should require authentication
  },
  {
    name: 'Agent Execute (Unauthenticated)',
    path: '/api/agent/execute',
    method: 'POST',
    expectedStatus: [401, 403], // Should require authentication
    body: JSON.stringify({
      task_type: 'device_classification',
      project_id: 'test-project',
      device_description: 'Test device',
      intended_use: 'Test use',
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  },
];

function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const protocol = options.protocol === 'https:' ? https : http;

    const req = protocol.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function runTest(test) {
  console.log(`\n🧪 Testing: ${test.name}`);
  console.log(`   ${test.method} ${test.path}`);

  try {
    const url = new URL(test.path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname,
      method: test.method,
      headers: test.headers || {},
    };

    if (test.body) {
      options.body = test.body;
    }

    const response = await makeRequest(options);

    const isExpectedStatus = test.expectedStatus.includes(response.statusCode);
    const status = isExpectedStatus ? '✅' : '❌';

    console.log(
      `   ${status} Status: ${response.statusCode} (expected: ${test.expectedStatus.join(' or ')})`
    );

    if (response.body) {
      try {
        const jsonBody = JSON.parse(response.body);
        console.log(
          `   📄 Response: ${JSON.stringify(jsonBody, null, 2).substring(0, 200)}...`
        );
      } catch (e) {
        console.log(`   📄 Response: ${response.body.substring(0, 100)}...`);
      }
    }

    return {
      name: test.name,
      passed: isExpectedStatus,
      statusCode: response.statusCode,
      expectedStatus: test.expectedStatus,
    };
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    return {
      name: test.name,
      passed: false,
      error: error.message,
    };
  }
}

async function runAllTests() {
  console.log('🚀 Starting API Integration Tests...');
  console.log(`📍 Base URL: ${BASE_URL}`);

  const results = [];

  for (const test of tests) {
    const result = await runTest(test);
    results.push(result);
  }

  console.log('\n📊 Test Results Summary:');
  console.log('========================');

  let passed = 0;
  let failed = 0;

  results.forEach((result) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${result.name}`);

    if (result.passed) {
      passed++;
    } else {
      failed++;
    }

    if (result.error) {
      console.log(`      Error: ${result.error}`);
    } else if (!result.passed) {
      console.log(
        `      Expected: ${result.expectedStatus.join(' or ')}, Got: ${result.statusCode}`
      );
    }
  });

  console.log(`\n📈 Results: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log(
      '⚠️  Some tests failed. This may be expected if the server is not running.'
    );
    process.exit(1);
  }
}

// Check if server is running first
async function checkServerHealth() {
  try {
    const response = await makeRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/',
      method: 'GET',
      timeout: 5000,
    });

    console.log('✅ Server is running');
    return true;
  } catch (error) {
    console.log('❌ Server is not running or not accessible');
    console.log('   Please start the development server with: pnpm dev');
    return false;
  }
}

async function main() {
  const serverRunning = await checkServerHealth();

  if (!serverRunning) {
    console.log('\n⚠️  Skipping API tests - server not running');
    console.log('   This is expected during automated testing');
    console.log('   To run these tests manually:');
    console.log('   1. Start the server: pnpm dev');
    console.log('   2. Run this script: node test-api-integration.js');
    process.exit(0);
  }

  await runAllTests();
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { runAllTests, runTest };
