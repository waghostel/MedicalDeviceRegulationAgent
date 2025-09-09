#!/usr/bin/env node

/**
 * End-to-End Test Runner Script
 * 
 * Comprehensive test runner for project workflow end-to-end tests.
 * Handles test environment setup, execution, and cleanup.
 */

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  // Test categories
  testCategories: {
    workflow: 'e2e/project-workflow-e2e.spec.ts',
    websocket: 'e2e/websocket-realtime.spec.ts',
    performance: 'e2e/performance-load.spec.ts',
    all: 'e2e/'
  },

  // Environment setup
  services: {
    backend: {
      command: 'cd backend && poetry run uvicorn main:app --host 0.0.0.0 --port 8000',
      port: 8000,
      healthCheck: 'http://localhost:8000/api/health'
    },
    frontend: {
      command: 'pnpm dev',
      port: 3000,
      healthCheck: 'http://localhost:3000'
    }
  },

  // Test execution options
  execution: {
    timeout: 300000, // 5 minutes
    retries: 2,
    workers: process.env.CI ? 1 : undefined,
    reporter: ['html', 'json', 'junit']
  }
};

class E2ETestRunner {
  constructor() {
    this.runningServices = [];
    this.testResults = {
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0
    };
  }

  /**
   * Main test execution function
   */
  async run() {
    console.log('🚀 Starting End-to-End Test Runner');
    console.log('=====================================');

    try {
      // Parse command line arguments
      const args = this.parseArguments();
      
      // Setup test environment
      await this.setupEnvironment();
      
      // Start required services
      await this.startServices();
      
      // Wait for services to be ready
      await this.waitForServices();
      
      // Run tests
      await this.runTests(args);
      
      // Generate reports
      await this.generateReports();
      
      console.log('✅ End-to-End tests completed successfully');
      
    } catch (error) {
      console.error('❌ End-to-End tests failed:', error.message);
      process.exit(1);
    } finally {
      // Cleanup
      await this.cleanup();
    }
  }

  /**
   * Parse command line arguments
   */
  parseArguments() {
    const args = process.argv.slice(2);
    const options = {
      category: 'all',
      headed: false,
      debug: false,
      workers: CONFIG.execution.workers,
      retries: CONFIG.execution.retries,
      reporter: CONFIG.execution.reporter,
      grep: null,
      project: null
    };

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      
      switch (arg) {
        case '--category':
        case '-c':
          options.category = args[++i];
          break;
        case '--headed':
          options.headed = true;
          break;
        case '--debug':
          options.debug = true;
          break;
        case '--workers':
        case '-w':
          options.workers = parseInt(args[++i]);
          break;
        case '--retries':
        case '-r':
          options.retries = parseInt(args[++i]);
          break;
        case '--grep':
        case '-g':
          options.grep = args[++i];
          break;
        case '--project':
        case '-p':
          options.project = args[++i];
          break;
        case '--help':
        case '-h':
          this.showHelp();
          process.exit(0);
          break;
      }
    }

    return options;
  }

  /**
   * Show help information
   */
  showHelp() {
    console.log(`
End-to-End Test Runner

Usage: node scripts/run-e2e-tests.js [options]

Options:
  -c, --category <type>     Test category to run (workflow, websocket, performance, all)
  --headed                  Run tests in headed mode (visible browser)
  --debug                   Enable debug mode with verbose logging
  -w, --workers <number>    Number of parallel workers
  -r, --retries <number>    Number of retries for failed tests
  -g, --grep <pattern>      Only run tests matching pattern
  -p, --project <name>      Run tests for specific browser project
  -h, --help               Show this help message

Examples:
  node scripts/run-e2e-tests.js --category workflow
  node scripts/run-e2e-tests.js --category performance --workers 1
  node scripts/run-e2e-tests.js --grep "WebSocket" --debug
  node scripts/run-e2e-tests.js --project chromium --headed
    `);
  }

  /**
   * Setup test environment
   */
  async setupEnvironment() {
    console.log('🔧 Setting up test environment...');

    // Create necessary directories
    const dirs = ['screenshots', 'test-results', 'playwright-report'];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }

    // Set environment variables
    process.env.NODE_ENV = 'test';
    process.env.PLAYWRIGHT_BROWSERS_PATH = '0';
    
    // Enable debug mode if requested
    if (process.argv.includes('--debug')) {
      process.env.DEBUG = 'pw:*';
      process.env.DEBUG_NETWORK = 'true';
    }

    console.log('✅ Test environment setup complete');
  }

  /**
   * Start required services
   */
  async startServices() {
    console.log('🚀 Starting services...');

    for (const [serviceName, config] of Object.entries(CONFIG.services)) {
      console.log(`Starting ${serviceName} service...`);
      
      const service = spawn('sh', ['-c', config.command], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      service.stdout.on('data', (data) => {
        if (process.argv.includes('--debug')) {
          console.log(`[${serviceName}] ${data.toString().trim()}`);
        }
      });

      service.stderr.on('data', (data) => {
        const message = data.toString().trim();
        if (message && !message.includes('WARNING')) {
          console.error(`[${serviceName}] ${message}`);
        }
      });

      service.on('error', (error) => {
        console.error(`Failed to start ${serviceName}:`, error);
      });

      this.runningServices.push({
        name: serviceName,
        process: service,
        port: config.port
      });
    }

    console.log('✅ Services started');
  }

  /**
   * Wait for services to be ready
   */
  async waitForServices() {
    console.log('⏳ Waiting for services to be ready...');

    const maxWaitTime = 60000; // 1 minute
    const checkInterval = 2000; // 2 seconds
    const startTime = Date.now();

    for (const [serviceName, config] of Object.entries(CONFIG.services)) {
      console.log(`Checking ${serviceName} health...`);
      
      while (Date.now() - startTime < maxWaitTime) {
        try {
          const response = await this.makeHealthCheck(config.healthCheck);
          if (response) {
            console.log(`✅ ${serviceName} is ready`);
            break;
          }
        } catch (error) {
          // Service not ready yet, continue waiting
        }

        await this.sleep(checkInterval);
      }

      // Final check
      try {
        await this.makeHealthCheck(config.healthCheck);
      } catch (error) {
        throw new Error(`${serviceName} failed to start within ${maxWaitTime}ms`);
      }
    }

    console.log('✅ All services are ready');
  }

  /**
   * Make health check request
   */
  async makeHealthCheck(url) {
    return new Promise((resolve, reject) => {
      const http = require('http');
      const urlObj = new URL(url);
      
      const req = http.get({
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname,
        timeout: 5000
      }, (res) => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve(true);
        } else {
          reject(new Error(`Health check failed: ${res.statusCode}`));
        }
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Health check timeout'));
      });
    });
  }

  /**
   * Run tests with Playwright
   */
  async runTests(options) {
    console.log('🧪 Running tests...');
    console.log(`Category: ${options.category}`);
    console.log(`Workers: ${options.workers || 'auto'}`);
    console.log(`Retries: ${options.retries}`);

    const testPath = CONFIG.testCategories[options.category] || options.category;
    
    const playwrightArgs = [
      'test',
      testPath,
      '--config=playwright.config.ts'
    ];

    // Add options
    if (options.headed) {
      playwrightArgs.push('--headed');
    }

    if (options.workers) {
      playwrightArgs.push(`--workers=${options.workers}`);
    }

    if (options.retries !== undefined) {
      playwrightArgs.push(`--retries=${options.retries}`);
    }

    if (options.grep) {
      playwrightArgs.push(`--grep=${options.grep}`);
    }

    if (options.project) {
      playwrightArgs.push(`--project=${options.project}`);
    }

    // Add reporters
    for (const reporter of options.reporter) {
      playwrightArgs.push(`--reporter=${reporter}`);
    }

    console.log(`Running: npx playwright ${playwrightArgs.join(' ')}`);

    return new Promise((resolve, reject) => {
      const testProcess = spawn('npx', ['playwright', ...playwrightArgs], {
        stdio: 'inherit',
        env: {
          ...process.env,
          FORCE_COLOR: '1'
        }
      });

      testProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Tests passed');
          resolve();
        } else {
          reject(new Error(`Tests failed with exit code ${code}`));
        }
      });

      testProcess.on('error', (error) => {
        reject(new Error(`Failed to run tests: ${error.message}`));
      });
    });
  }

  /**
   * Generate test reports
   */
  async generateReports() {
    console.log('📊 Generating test reports...');

    try {
      // Generate HTML report
      if (fs.existsSync('playwright-report')) {
        console.log('HTML report available at: playwright-report/index.html');
      }

      // Generate summary report
      if (fs.existsSync('test-results')) {
        const testResults = this.collectTestResults();
        this.generateSummaryReport(testResults);
      }

      // Generate performance report
      if (fs.existsSync('playwright-report/results.json')) {
        this.generatePerformanceReport();
      }

    } catch (error) {
      console.warn('Failed to generate some reports:', error.message);
    }

    console.log('✅ Reports generated');
  }

  /**
   * Collect test results from output files
   */
  collectTestResults() {
    const results = {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      duration: 0,
      tests: []
    };

    try {
      if (fs.existsSync('playwright-report/results.json')) {
        const data = JSON.parse(fs.readFileSync('playwright-report/results.json', 'utf8'));
        
        results.total = data.stats?.total || 0;
        results.passed = data.stats?.passed || 0;
        results.failed = data.stats?.failed || 0;
        results.skipped = data.stats?.skipped || 0;
        results.duration = data.stats?.duration || 0;
        results.tests = data.tests || [];
      }
    } catch (error) {
      console.warn('Failed to parse test results:', error.message);
    }

    return results;
  }

  /**
   * Generate summary report
   */
  generateSummaryReport(results) {
    const summary = `
# End-to-End Test Summary

## Results
- **Total Tests**: ${results.total}
- **Passed**: ${results.passed}
- **Failed**: ${results.failed}
- **Skipped**: ${results.skipped}
- **Duration**: ${(results.duration / 1000).toFixed(2)}s
- **Success Rate**: ${results.total > 0 ? ((results.passed / results.total) * 100).toFixed(1) : 0}%

## Test Categories
- Project Workflow Tests
- WebSocket Real-time Tests
- Performance and Load Tests

## Generated Reports
- HTML Report: playwright-report/index.html
- JSON Results: playwright-report/results.json
- JUnit XML: playwright-report/results.xml

Generated at: ${new Date().toISOString()}
`;

    fs.writeFileSync('test-results/summary.md', summary);
    console.log('Summary report: test-results/summary.md');
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport() {
    try {
      const resultsData = JSON.parse(fs.readFileSync('playwright-report/results.json', 'utf8'));
      
      const performanceTests = resultsData.tests?.filter(test => 
        test.title?.includes('Performance') || 
        test.title?.includes('Load') ||
        test.file?.includes('performance')
      ) || [];

      if (performanceTests.length > 0) {
        const performanceReport = {
          summary: {
            totalPerformanceTests: performanceTests.length,
            averageDuration: performanceTests.reduce((sum, test) => sum + (test.duration || 0), 0) / performanceTests.length,
            slowestTest: performanceTests.reduce((slowest, test) => 
              (test.duration || 0) > (slowest.duration || 0) ? test : slowest, performanceTests[0]
            )
          },
          tests: performanceTests.map(test => ({
            title: test.title,
            duration: test.duration,
            status: test.status,
            file: test.file
          }))
        };

        fs.writeFileSync('test-results/performance-report.json', JSON.stringify(performanceReport, null, 2));
        console.log('Performance report: test-results/performance-report.json');
      }
    } catch (error) {
      console.warn('Failed to generate performance report:', error.message);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    console.log('🧹 Cleaning up...');

    // Stop running services
    for (const service of this.runningServices) {
      try {
        console.log(`Stopping ${service.name}...`);
        
        // Try graceful shutdown first
        service.process.kill('SIGTERM');
        
        // Wait a bit for graceful shutdown
        await this.sleep(2000);
        
        // Force kill if still running
        if (!service.process.killed) {
          service.process.kill('SIGKILL');
        }
        
        console.log(`✅ ${service.name} stopped`);
      } catch (error) {
        console.warn(`Failed to stop ${service.name}:`, error.message);
      }
    }

    // Clean up temporary files if needed
    try {
      // Remove any temporary test files
      const tempFiles = ['temp-test-data.json', '.test-cache'];
      for (const file of tempFiles) {
        if (fs.existsSync(file)) {
          fs.unlinkSync(file);
        }
      }
    } catch (error) {
      console.warn('Failed to clean up temporary files:', error.message);
    }

    console.log('✅ Cleanup complete');
  }

  /**
   * Utility function to sleep
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the test runner if this script is executed directly
if (require.main === module) {
  const runner = new E2ETestRunner();
  runner.run().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

module.exports = E2ETestRunner;