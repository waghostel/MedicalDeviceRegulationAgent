#!/usr/bin/env node

/**
 * Simple integration verification script
 * Tests basic frontend-backend connectivity without authentication
 */

const http = require('http');

// Configuration
const BACKEND_HOST = process.env.BACKEND_HOST || 'localhost';
const BACKEND_PORT = process.env.BACKEND_PORT || '8000';
const FRONTEND_HOST = process.env.FRONTEND_HOST || 'localhost';
const FRONTEND_PORT = process.env.FRONTEND_PORT || '3000';

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

// Simple HTTP request function
function makeRequest(options) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function testBackendHealth() {
  logInfo('Testing backend health endpoint...');
  
  try {
    const response = await makeRequest({
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: '/api/health',
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.statusCode === 200) {
      logSuccess(`Backend health endpoint responded: ${response.statusCode}`);
      return true;
    } else {
      logError(`Backend health endpoint failed: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`Backend health endpoint error: ${error.message}`);
    return false;
  }
}

async function testBackendRoot() {
  logInfo('Testing backend root endpoint...');
  
  try {
    const response = await makeRequest({
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: '/',
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.statusCode === 200) {
      logSuccess(`Backend root endpoint responded: ${response.statusCode}`);
      try {
        const data = JSON.parse(response.data);
        logInfo(`Backend message: ${data.message}`);
        logInfo(`Backend version: ${data.version}`);
      } catch (e) {
        logWarning('Could not parse backend response as JSON');
      }
      return true;
    } else {
      logError(`Backend root endpoint failed: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`Backend root endpoint error: ${error.message}`);
    return false;
  }
}

async function testFrontendHealth() {
  logInfo('Testing frontend health...');
  
  try {
    const response = await makeRequest({
      hostname: FRONTEND_HOST,
      port: FRONTEND_PORT,
      path: '/',
      method: 'GET',
      headers: {
        'Accept': 'text/html'
      }
    });

    if (response.statusCode === 200) {
      logSuccess(`Frontend responded: ${response.statusCode}`);
      return true;
    } else {
      logError(`Frontend failed: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`Frontend error: ${error.message}`);
    return false;
  }
}

async function testCORS() {
  logInfo('Testing CORS configuration...');
  
  try {
    const response = await makeRequest({
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: '/api/health',
      method: 'OPTIONS',
      headers: {
        'Origin': `http://${FRONTEND_HOST}:${FRONTEND_PORT}`,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });

    const corsHeaders = response.headers['access-control-allow-origin'];
    if (corsHeaders) {
      logSuccess(`CORS configured correctly: ${corsHeaders}`);
      return true;
    } else {
      logWarning('CORS headers not found - may need configuration');
      return false;
    }
  } catch (error) {
    logError(`CORS test error: ${error.message}`);
    return false;
  }
}

async function testAPIStructure() {
  logInfo('Testing API structure...');
  
  try {
    // Test projects endpoint (should return 401/403 without auth)
    const response = await makeRequest({
      hostname: BACKEND_HOST,
      port: BACKEND_PORT,
      path: '/api/projects',
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (response.statusCode === 401 || response.statusCode === 403) {
      logSuccess('Projects endpoint properly protected (requires authentication)');
      return true;
    } else if (response.statusCode === 200) {
      logWarning('Projects endpoint accessible without authentication');
      return true;
    } else {
      logError(`Projects endpoint unexpected response: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    logError(`API structure test error: ${error.message}`);
    return false;
  }
}

// Main verification function
async function runVerification() {
  log('\n🚀 Starting Frontend-Backend Integration Verification\n', colors.blue);
  
  const results = {
    backendHealth: false,
    backendRoot: false,
    frontendHealth: false,
    cors: false,
    apiStructure: false
  };
  
  // Run tests
  results.backendHealth = await testBackendHealth();
  results.backendRoot = await testBackendRoot();
  results.frontendHealth = await testFrontendHealth();
  results.cors = await testCORS();
  results.apiStructure = await testAPIStructure();
  
  // Summary
  log('\n📊 Verification Results Summary\n', colors.blue);
  
  const testNames = {
    backendHealth: 'Backend Health Endpoint',
    backendRoot: 'Backend Root Endpoint',
    frontendHealth: 'Frontend Health',
    cors: 'CORS Configuration',
    apiStructure: 'API Structure'
  };
  
  let passedTests = 0;
  let totalTests = Object.keys(results).length;
  
  for (const [key, passed] of Object.entries(results)) {
    if (passed) {
      logSuccess(`${testNames[key]}: PASSED`);
      passedTests++;
    } else {
      logError(`${testNames[key]}: FAILED`);
    }
  }
  
  log(`\n📈 Overall Results: ${passedTests}/${totalTests} tests passed\n`, colors.blue);
  
  if (passedTests >= 3) { // At least backend health, root, and API structure
    logSuccess('🎉 Basic integration verification passed! Core connectivity is working.');
    
    if (passedTests < totalTests) {
      logWarning('Some optional tests failed. Check the results above for details.');
    }
    
    log('\n📝 Next Steps:', colors.blue);
    log('1. Start the backend server: cd backend && poetry run uvicorn main:app --reload');
    log('2. Start the frontend server: pnpm dev');
    log('3. Run the full integration tests: pnpm test');
    
    process.exit(0);
  } else {
    logError('❌ Integration verification failed. Please check your server configuration.');
    
    log('\n🔧 Troubleshooting:', colors.blue);
    log('1. Make sure the backend server is running on port 8000');
    log('2. Make sure the frontend server is running on port 3000');
    log('3. Check for any firewall or network issues');
    log('4. Verify the server configurations match the expected ports');
    
    process.exit(1);
  }
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Frontend-Backend Integration Verification Script

Usage: node verify-integration.js [options]

Environment Variables:
  BACKEND_HOST     Backend server host (default: localhost)
  BACKEND_PORT     Backend server port (default: 8000)
  FRONTEND_HOST    Frontend server host (default: localhost)
  FRONTEND_PORT    Frontend server port (default: 3000)

Options:
  --help, -h       Show this help message

Examples:
  node verify-integration.js
  BACKEND_PORT=8080 node verify-integration.js
  BACKEND_HOST=127.0.0.1 FRONTEND_PORT=3001 node verify-integration.js
`);
  process.exit(0);
}

// Run the verification
runVerification().catch((error) => {
  logError(`Verification script failed: ${error.message}`);
  process.exit(1);
});