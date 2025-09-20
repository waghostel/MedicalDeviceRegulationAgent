#!/usr/bin/env node

/**
 * Comprehensive test execution script for Medical Device Regulatory Assistant
 * Runs all test suites and generates consolidated reports
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
};

class TestRunner {
  constructor() {
    this.results = {
      frontend: { passed: false, coverage: 0, duration: 0 },
      backend: { passed: false, coverage: 0, duration: 0 },
      e2e: { passed: false, duration: 0 },
      security: { passed: false, duration: 0 },
      performance: { passed: false, duration: 0 },
    };
    this.startTime = Date.now();
  }

  log(message, color = COLORS.RESET) {
    console.log(`${color}${message}${COLORS.RESET}`);
  }

  logSection(title) {
    console.log('\n' + '='.repeat(60));
    this.log(`${COLORS.BOLD}${title}${COLORS.RESET}`, COLORS.BLUE);
    console.log('='.repeat(60));
  }

  async runCommand(command, cwd = process.cwd(), description = '') {
    return new Promise((resolve, reject) => {
      if (description) {
        this.log(`Running: ${description}`, COLORS.YELLOW);
      }

      const startTime = Date.now();
      const child = spawn(command, {
        shell: true,
        cwd,
        stdio: 'inherit',
      });

      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        if (code === 0) {
          this.log(
            `✅ ${description || command} completed in ${duration}ms`,
            COLORS.GREEN
          );
          resolve({ success: true, duration });
        } else {
          this.log(
            `❌ ${description || command} failed with code ${code}`,
            COLORS.RED
          );
          resolve({ success: false, duration });
        }
      });

      child.on('error', (error) => {
        this.log(
          `❌ Error running ${description || command}: ${error.message}`,
          COLORS.RED
        );
        resolve({ success: false, duration: 0 });
      });
    });
  }

  async checkPrerequisites() {
    this.logSection('Checking Prerequisites');

    try {
      // Check if backend server is running
      execSync('curl -f http://localhost:8000/health', { stdio: 'ignore' });
      this.log('✅ Backend server is running', COLORS.GREEN);
    } catch (error) {
      this.log('⚠️  Backend server not running, starting it...', COLORS.YELLOW);

      // Start backend server in background
      const backendProcess = spawn(
        'poetry',
        ['run', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8000'],
        {
          cwd: path.join(process.cwd(), 'backend'),
          detached: true,
          stdio: 'ignore',
        }
      );

      // Wait for server to start
      await new Promise((resolve) => setTimeout(resolve, 5000));

      try {
        execSync('curl -f http://localhost:8000/health', { stdio: 'ignore' });
        this.log('✅ Backend server started successfully', COLORS.GREEN);
      } catch (error) {
        this.log('❌ Failed to start backend server', COLORS.RED);
        throw new Error('Backend server required for testing');
      }
    }

    // Check Node.js and pnpm
    try {
      execSync('node --version', { stdio: 'ignore' });
      execSync('pnpm --version', { stdio: 'ignore' });
      this.log('✅ Node.js and pnpm are available', COLORS.GREEN);
    } catch (error) {
      throw new Error('Node.js and pnpm are required');
    }

    // Check Python and Poetry
    try {
      execSync('python --version', { stdio: 'ignore' });
      execSync('poetry --version', { stdio: 'ignore' });
      this.log('✅ Python and Poetry are available', COLORS.GREEN);
    } catch (error) {
      throw new Error('Python and Poetry are required');
    }
  }

  async runFrontendTests() {
    this.logSection('Frontend Tests');

    // Install dependencies
    let result = await this.runCommand(
      'pnpm install',
      process.cwd(),
      'Installing frontend dependencies'
    );
    if (!result.success) return false;

    // Type checking
    result = await this.runCommand(
      'pnpm type-check',
      process.cwd(),
      'TypeScript type checking'
    );
    if (!result.success) return false;

    // Linting
    result = await this.runCommand(
      'pnpm lint',
      process.cwd(),
      'ESLint checking'
    );
    if (!result.success) return false;

    // Unit tests with coverage
    const startTime = Date.now();
    result = await this.runCommand(
      'pnpm test:coverage',
      process.cwd(),
      'Frontend unit tests with coverage'
    );
    this.results.frontend.duration = Date.now() - startTime;
    this.results.frontend.passed = result.success;

    // Extract coverage information
    try {
      const coverageFile = path.join(
        process.cwd(),
        'coverage',
        'coverage-summary.json'
      );
      if (fs.existsSync(coverageFile)) {
        const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
        this.results.frontend.coverage = coverage.total.lines.pct;
        this.log(
          `📊 Frontend coverage: ${this.results.frontend.coverage}%`,
          COLORS.BLUE
        );
      }
    } catch (error) {
      this.log('⚠️  Could not read frontend coverage report', COLORS.YELLOW);
    }

    return result.success;
  }

  async runBackendTests() {
    this.logSection('Backend Tests');

    const backendDir = path.join(process.cwd(), 'backend');

    // Install dependencies
    let result = await this.runCommand(
      'poetry install',
      backendDir,
      'Installing backend dependencies'
    );
    if (!result.success) return false;

    // Linting
    result = await this.runCommand(
      'poetry run black --check .',
      backendDir,
      'Black code formatting check'
    );
    if (!result.success) return false;

    result = await this.runCommand(
      'poetry run isort --check-only .',
      backendDir,
      'isort import sorting check'
    );
    if (!result.success) return false;

    result = await this.runCommand(
      'poetry run flake8 .',
      backendDir,
      'Flake8 linting'
    );
    if (!result.success) return false;

    // Type checking
    result = await this.runCommand(
      'poetry run mypy .',
      backendDir,
      'MyPy type checking'
    );
    if (!result.success) return false;

    // Unit tests with coverage
    const startTime = Date.now();
    result = await this.runCommand(
      'poetry run python -m pytest tests/ -v --cov=backend --cov-report=xml --cov-report=html --cov-fail-under=90',
      backendDir,
      'Backend unit tests with coverage'
    );
    this.results.backend.duration = Date.now() - startTime;
    this.results.backend.passed = result.success;

    // Extract coverage information
    try {
      const coverageFile = path.join(backendDir, 'htmlcov', 'index.html');
      if (fs.existsSync(coverageFile)) {
        const coverageHtml = fs.readFileSync(coverageFile, 'utf8');
        const match = coverageHtml.match(/pc_cov">(\d+)%</);
        if (match) {
          this.results.backend.coverage = parseInt(match[1]);
          this.log(
            `📊 Backend coverage: ${this.results.backend.coverage}%`,
            COLORS.BLUE
          );
        }
      }
    } catch (error) {
      this.log('⚠️  Could not read backend coverage report', COLORS.YELLOW);
    }

    return result.success;
  }

  async runE2ETests() {
    this.logSection('End-to-End Tests');

    // Install Playwright browsers
    let result = await this.runCommand(
      'pnpm exec playwright install',
      process.cwd(),
      'Installing Playwright browsers'
    );
    if (!result.success) return false;

    // Run E2E tests
    const startTime = Date.now();
    result = await this.runCommand(
      'pnpm test:e2e',
      process.cwd(),
      'End-to-end tests'
    );
    this.results.e2e.duration = Date.now() - startTime;
    this.results.e2e.passed = result.success;

    return result.success;
  }

  async runSecurityTests() {
    this.logSection('Security Tests');

    const backendDir = path.join(process.cwd(), 'backend');

    const startTime = Date.now();
    const result = await this.runCommand(
      'poetry run python -m pytest tests/security/ -v',
      backendDir,
      'Security tests'
    );
    this.results.security.duration = Date.now() - startTime;
    this.results.security.passed = result.success;

    return result.success;
  }

  async runPerformanceTests() {
    this.logSection('Performance Tests');

    const backendDir = path.join(process.cwd(), 'backend');

    const startTime = Date.now();
    const result = await this.runCommand(
      'poetry run python -m pytest tests/performance/ -v -m "not slow"',
      backendDir,
      'Performance tests (excluding slow tests)'
    );
    this.results.performance.duration = Date.now() - startTime;
    this.results.performance.passed = result.success;

    return result.success;
  }

  generateReport() {
    this.logSection('Test Results Summary');

    const totalDuration = Date.now() - this.startTime;
    const passedTests = Object.values(this.results).filter(
      (r) => r.passed
    ).length;
    const totalTests = Object.keys(this.results).length;

    console.log('\n📊 Test Suite Results:');
    console.log('┌─────────────────┬─────────┬──────────┬──────────┐');
    console.log('│ Test Suite      │ Status  │ Coverage │ Duration │');
    console.log('├─────────────────┼─────────┼──────────┼──────────┤');

    Object.entries(this.results).forEach(([suite, result]) => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const coverage = result.coverage ? `${result.coverage}%` : 'N/A';
      const duration = `${(result.duration / 1000).toFixed(1)}s`;

      console.log(
        `│ ${suite.padEnd(15)} │ ${status.padEnd(7)} │ ${coverage.padEnd(8)} │ ${duration.padEnd(8)} │`
      );
    });

    console.log('└─────────────────┴─────────┴──────────┴──────────┘');

    console.log(`\n🎯 Overall Results:`);
    console.log(`   Tests Passed: ${passedTests}/${totalTests}`);
    console.log(`   Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);

    if (this.results.frontend.coverage) {
      console.log(`   Frontend Coverage: ${this.results.frontend.coverage}%`);
    }
    if (this.results.backend.coverage) {
      console.log(`   Backend Coverage: ${this.results.backend.coverage}%`);
    }

    // Generate JSON report
    const report = {
      timestamp: new Date().toISOString(),
      totalDuration,
      passedTests,
      totalTests,
      results: this.results,
    };

    fs.writeFileSync('test-results.json', JSON.stringify(report, null, 2));
    this.log('\n📄 Detailed report saved to test-results.json', COLORS.BLUE);

    return passedTests === totalTests;
  }

  async run() {
    try {
      this.log(
        `${COLORS.BOLD}🧪 Medical Device Regulatory Assistant - Comprehensive Test Suite${COLORS.RESET}`,
        COLORS.BLUE
      );

      await this.checkPrerequisites();

      // Run all test suites
      await this.runFrontendTests();
      await this.runBackendTests();
      await this.runE2ETests();
      await this.runSecurityTests();
      await this.runPerformanceTests();

      const allPassed = this.generateReport();

      if (allPassed) {
        this.log('\n🎉 All tests passed! Ready for production.', COLORS.GREEN);
        process.exit(0);
      } else {
        this.log(
          '\n❌ Some tests failed. Please review and fix issues.',
          COLORS.RED
        );
        process.exit(1);
      }
    } catch (error) {
      this.log(`\n💥 Test execution failed: ${error.message}`, COLORS.RED);
      process.exit(1);
    }
  }
}

// Run if called directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.run();
}

module.exports = TestRunner;
