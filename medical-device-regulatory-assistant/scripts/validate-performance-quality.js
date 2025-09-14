#!/usr/bin/env node

/**
 * Performance and Quality Validation Script
 * Task 11.3: Performance and Quality Validation
 * 
 * Validates test execution performance, monitoring systems, and environment setup
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class PerformanceQualityValidator {
  constructor() {
    this.results = {
      performance: { passed: 0, failed: 0, tests: [], executionTime: 0 },
      monitoring: { passed: 0, failed: 0, tests: [] },
      environment: { passed: 0, failed: 0, tests: [] },
      packageManagers: { passed: 0, failed: 0, tests: [] },
      overall: { success: false, issues: [] }
    };
    this.startTime = Date.now();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      progress: '🔄',
      performance: '⚡',
      quality: '🎯'
    }[type] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runCommand(command, cwd = process.cwd(), timeout = 30000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      this.log(`Running: ${command}`, 'progress');
      
      const child = spawn('sh', ['-c', command], {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, DATABASE_URL: 'sqlite:./test.db' }
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timeoutId = setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error(`Command timed out after ${timeout}ms: ${command}`));
      }, timeout);

      child.on('close', (code) => {
        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        
        resolve({
          code,
          stdout,
          stderr,
          duration,
          success: code === 0
        });
      });

      child.on('error', (error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
    });
  }

  async validateTestPerformance() {
    this.log('Validating test execution performance...', 'performance');
    
    const performanceTests = [
      {
        name: 'Frontend Test Suite Performance',
        command: 'timeout 30s npx jest --passWithNoTests --silent --maxWorkers=1',
        cwd: path.join(process.cwd(), 'medical-device-regulatory-assistant'),
        target: 30000, // 30 seconds target
        description: 'Validate frontend test suite completes within 30 seconds'
      },
      {
        name: 'Backend Core Tests Performance',
        command: 'timeout 15s poetry run python -m pytest tests/test_framework.py tests/test_health_check_service.py -v --tb=no',
        cwd: path.join(process.cwd(), 'medical-device-regulatory-assistant', 'backend'),
        target: 15000, // 15 seconds target
        description: 'Validate core backend tests complete within 15 seconds'
      },
      {
        name: 'Environment Validation Performance',
        command: 'timeout 5s poetry run python -c "from core.environment import EnvironmentValidator; v = EnvironmentValidator(); result = v.validate_python_environment(); print(f\'✓ Environment validation: {result.is_valid}\')"',
        cwd: path.join(process.cwd(), 'medical-device-regulatory-assistant', 'backend'),
        target: 5000, // 5 seconds target
        description: 'Validate environment checks complete within 5 seconds'
      }
    ];

    for (const test of performanceTests) {
      const testStartTime = Date.now();
      
      try {
        const result = await this.runCommand(test.command, test.cwd, test.target + 5000);
        const actualDuration = Date.now() - testStartTime;
        
        const withinTarget = actualDuration <= test.target;
        
        if (result.success && withinTarget) {
          this.results.performance.passed++;
          this.results.performance.tests.push({
            name: test.name,
            status: 'passed',
            description: test.description,
            duration: actualDuration,
            target: test.target,
            withinTarget: true,
            output: result.stdout.trim()
          });
          this.log(`${test.name}: PASSED (${actualDuration}ms <= ${test.target}ms)`, 'success');
        } else {
          this.results.performance.failed++;
          this.results.performance.tests.push({
            name: test.name,
            status: 'failed',
            description: test.description,
            duration: actualDuration,
            target: test.target,
            withinTarget: withinTarget,
            error: !result.success ? result.stderr : `Exceeded time target: ${actualDuration}ms > ${test.target}ms`,
            output: result.stdout
          });
          this.log(`${test.name}: FAILED - ${!result.success ? 'Execution failed' : 'Time target exceeded'} (${actualDuration}ms)`, 'error');
        }
        
        this.results.performance.executionTime += actualDuration;
      } catch (error) {
        const actualDuration = Date.now() - testStartTime;
        this.results.performance.failed++;
        this.results.performance.tests.push({
          name: test.name,
          status: 'error',
          description: test.description,
          duration: actualDuration,
          target: test.target,
          withinTarget: false,
          error: error.message
        });
        this.log(`${test.name}: ERROR - ${error.message}`, 'error');
        this.results.performance.executionTime += actualDuration;
      }
    }
  }

  async validateMonitoringSystems() {
    this.log('Validating performance monitoring and regression detection...', 'quality');
    
    const backendDir = path.join(process.cwd(), 'medical-device-regulatory-assistant', 'backend');
    
    const monitoringTests = [
      {
        name: 'Performance Monitor Functionality',
        command: 'poetry run python -c "from testing.performance_monitor import TestPerformanceMonitor; monitor = TestPerformanceMonitor(); print(\'✓ Performance monitor functional\')"',
        description: 'Test that performance monitoring system is functional'
      },
      {
        name: 'Error Tracking System',
        command: 'poetry run python -c "from core.error_tracker import ErrorTracker; tracker = ErrorTracker(); print(\'✓ Error tracking system functional\')"',
        description: 'Test that error tracking system works'
      },
      {
        name: 'Database Performance Monitoring',
        command: 'poetry run python -c "from testing.database_isolation import DatabaseTestIsolation; isolation = DatabaseTestIsolation(None); print(\'✓ Database monitoring functional\')"',
        description: 'Test that database performance monitoring works'
      },
      {
        name: 'Quality Metrics Collection',
        command: 'poetry run python -c "import psutil; import time; start = time.time(); cpu = psutil.cpu_percent(); memory = psutil.virtual_memory().percent; duration = time.time() - start; print(f\'✓ Quality metrics: CPU {cpu}%, Memory {memory}%, Collection time {duration:.3f}s\')"',
        description: 'Test that quality metrics can be collected'
      }
    ];

    for (const test of monitoringTests) {
      try {
        const result = await this.runCommand(test.command, backendDir, 10000);
        
        if (result.success && result.stdout.includes('✓')) {
          this.results.monitoring.passed++;
          this.results.monitoring.tests.push({
            name: test.name,
            status: 'passed',
            description: test.description,
            output: result.stdout.trim()
          });
          this.log(`${test.name}: PASSED`, 'success');
        } else {
          this.results.monitoring.failed++;
          this.results.monitoring.tests.push({
            name: test.name,
            status: 'failed',
            description: test.description,
            error: result.stderr || 'No success indicator found',
            output: result.stdout
          });
          this.log(`${test.name}: FAILED - ${result.stderr}`, 'error');
        }
      } catch (error) {
        this.results.monitoring.failed++;
        this.results.monitoring.tests.push({
          name: test.name,
          status: 'error',
          description: test.description,
          error: error.message
        });
        this.log(`${test.name}: ERROR - ${error.message}`, 'error');
      }
    }
  }

  async validateEnvironmentSetup() {
    this.log('Validating environment setup and package manager standardization...', 'quality');
    
    const environmentTests = [
      {
        name: 'Node.js Version Check',
        command: 'node --version',
        description: 'Validate Node.js version is appropriate',
        validator: (output) => {
          const version = output.match(/v(\d+)\.(\d+)\.(\d+)/);
          if (version) {
            const major = parseInt(version[1]);
            return major >= 18; // Node 18+ required
          }
          return false;
        }
      },
      {
        name: 'Python Version Check',
        command: 'python --version',
        description: 'Validate Python version is appropriate',
        validator: (output) => {
          const version = output.match(/Python (\d+)\.(\d+)\.(\d+)/);
          if (version) {
            const major = parseInt(version[1]);
            const minor = parseInt(version[2]);
            return major === 3 && minor >= 9; // Python 3.9+ required
          }
          return false;
        }
      },
      {
        name: 'pnpm Installation',
        command: 'pnpm --version',
        description: 'Validate pnpm is installed and functional',
        validator: (output) => /^\d+\.\d+\.\d+/.test(output.trim())
      },
      {
        name: 'Poetry Installation',
        command: 'poetry --version',
        description: 'Validate Poetry is installed and functional',
        validator: (output) => output.includes('Poetry')
      }
    ];

    for (const test of environmentTests) {
      try {
        const result = await this.runCommand(test.command, process.cwd(), 5000);
        
        const isValid = result.success && test.validator(result.stdout);
        
        if (isValid) {
          this.results.environment.passed++;
          this.results.environment.tests.push({
            name: test.name,
            status: 'passed',
            description: test.description,
            output: result.stdout.trim()
          });
          this.log(`${test.name}: PASSED - ${result.stdout.trim()}`, 'success');
        } else {
          this.results.environment.failed++;
          this.results.environment.tests.push({
            name: test.name,
            status: 'failed',
            description: test.description,
            error: 'Version validation failed',
            output: result.stdout.trim()
          });
          this.log(`${test.name}: FAILED - Version validation failed`, 'error');
        }
      } catch (error) {
        this.results.environment.failed++;
        this.results.environment.tests.push({
          name: test.name,
          status: 'error',
          description: test.description,
          error: error.message
        });
        this.log(`${test.name}: ERROR - ${error.message}`, 'error');
      }
    }
  }

  async validatePackageManagers() {
    this.log('Validating package manager standardization...', 'quality');
    
    const frontendDir = path.join(process.cwd(), 'medical-device-regulatory-assistant');
    const backendDir = path.join(process.cwd(), 'medical-device-regulatory-assistant', 'backend');
    
    const packageTests = [
      {
        name: 'Frontend pnpm Lock File',
        command: 'ls pnpm-lock.yaml',
        cwd: frontendDir,
        description: 'Validate pnpm lock file exists for frontend'
      },
      {
        name: 'Backend Poetry Lock File',
        command: 'ls poetry.lock',
        cwd: backendDir,
        description: 'Validate Poetry lock file exists for backend'
      },
      {
        name: 'Frontend Package Manager Usage',
        command: 'grep -q "packageManager.*pnpm" package.json && echo "✓ pnpm specified in package.json"',
        cwd: frontendDir,
        description: 'Validate pnpm is specified as package manager'
      },
      {
        name: 'Backend Dependency Management',
        command: 'poetry check && echo "✓ Poetry configuration valid"',
        cwd: backendDir,
        description: 'Validate Poetry configuration is valid'
      }
    ];

    for (const test of packageTests) {
      try {
        const result = await this.runCommand(test.command, test.cwd, 10000);
        
        if (result.success) {
          this.results.packageManagers.passed++;
          this.results.packageManagers.tests.push({
            name: test.name,
            status: 'passed',
            description: test.description,
            output: result.stdout.trim()
          });
          this.log(`${test.name}: PASSED`, 'success');
        } else {
          this.results.packageManagers.failed++;
          this.results.packageManagers.tests.push({
            name: test.name,
            status: 'failed',
            description: test.description,
            error: result.stderr,
            output: result.stdout
          });
          this.log(`${test.name}: FAILED - ${result.stderr}`, 'error');
        }
      } catch (error) {
        this.results.packageManagers.failed++;
        this.results.packageManagers.tests.push({
          name: test.name,
          status: 'error',
          description: test.description,
          error: error.message
        });
        this.log(`${test.name}: ERROR - ${error.message}`, 'error');
      }
    }
  }

  generateReport() {
    const totalExecutionTime = Date.now() - this.startTime;
    
    const totalPassed = this.results.performance.passed + 
                       this.results.monitoring.passed + 
                       this.results.environment.passed +
                       this.results.packageManagers.passed;
    
    const totalFailed = this.results.performance.failed + 
                       this.results.monitoring.failed + 
                       this.results.environment.failed +
                       this.results.packageManagers.failed;
    
    const totalTests = totalPassed + totalFailed;
    const successRate = totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(1) : '0.0';

    const report = {
      timestamp: new Date().toISOString(),
      totalExecutionTime,
      summary: {
        overall: {
          successRate,
          passed: totalPassed,
          failed: totalFailed,
          total: totalTests,
          executionTime: totalExecutionTime
        },
        performance: {
          successRate: this.results.performance.passed + this.results.performance.failed > 0 
            ? (this.results.performance.passed / (this.results.performance.passed + this.results.performance.failed) * 100).toFixed(1)
            : '0.0',
          passed: this.results.performance.passed,
          failed: this.results.performance.failed,
          totalExecutionTime: this.results.performance.executionTime,
          tests: this.results.performance.tests
        },
        monitoring: {
          successRate: this.results.monitoring.passed + this.results.monitoring.failed > 0 
            ? (this.results.monitoring.passed / (this.results.monitoring.passed + this.results.monitoring.failed) * 100).toFixed(1)
            : '0.0',
          passed: this.results.monitoring.passed,
          failed: this.results.monitoring.failed,
          tests: this.results.monitoring.tests
        },
        environment: {
          successRate: this.results.environment.passed + this.results.environment.failed > 0 
            ? (this.results.environment.passed / (this.results.environment.passed + this.results.environment.failed) * 100).toFixed(1)
            : '0.0',
          passed: this.results.environment.passed,
          failed: this.results.environment.failed,
          tests: this.results.environment.tests
        },
        packageManagers: {
          successRate: this.results.packageManagers.passed + this.results.packageManagers.failed > 0 
            ? (this.results.packageManagers.passed / (this.results.packageManagers.passed + this.results.packageManagers.failed) * 100).toFixed(1)
            : '0.0',
          passed: this.results.packageManagers.passed,
          failed: this.results.packageManagers.failed,
          tests: this.results.packageManagers.tests
        }
      },
      recommendations: this.generateRecommendations(successRate, totalExecutionTime)
    };

    return report;
  }

  generateRecommendations(successRate, totalExecutionTime) {
    const recommendations = [];

    // Performance recommendations
    if (this.results.performance.executionTime > 30000) {
      recommendations.push({
        category: 'Performance',
        priority: 'High',
        issue: `Test execution time ${(this.results.performance.executionTime / 1000).toFixed(1)}s exceeds 30s target`,
        action: 'Optimize test execution and reduce test suite complexity'
      });
    }

    // Overall success rate
    if (parseFloat(successRate) < 100) {
      recommendations.push({
        category: 'Quality',
        priority: 'High',
        issue: `Overall success rate ${successRate}% indicates quality issues`,
        action: 'Address failing validation tests'
      });
    }

    // Specific category recommendations
    if (this.results.monitoring.failed > 0) {
      recommendations.push({
        category: 'Monitoring',
        priority: 'Medium',
        issue: 'Performance monitoring system issues detected',
        action: 'Fix monitoring and regression detection systems'
      });
    }

    if (this.results.environment.failed > 0) {
      recommendations.push({
        category: 'Environment',
        priority: 'Medium',
        issue: 'Environment setup validation failures',
        action: 'Ensure all required tools are properly configured'
      });
    }

    if (this.results.packageManagers.failed > 0) {
      recommendations.push({
        category: 'Package Management',
        priority: 'Low',
        issue: 'Package manager standardization issues',
        action: 'Ensure consistent use of pnpm and Poetry'
      });
    }

    return recommendations;
  }

  async run() {
    this.log('Starting performance and quality validation...', 'performance');
    
    // Run all validation phases
    await this.validateTestPerformance();
    await this.validateMonitoringSystems();
    await this.validateEnvironmentSetup();
    await this.validatePackageManagers();

    // Generate and display report
    const report = this.generateReport();
    
    this.log('='.repeat(80), 'info');
    this.log('PERFORMANCE AND QUALITY VALIDATION RESULTS', 'info');
    this.log('='.repeat(80), 'info');
    
    this.log(`Performance: ${report.summary.performance.passed}/${report.summary.performance.passed + report.summary.performance.failed} passed (${report.summary.performance.successRate}%) - ${(report.summary.performance.totalExecutionTime / 1000).toFixed(1)}s`, 
      report.summary.performance.successRate >= 100 && report.summary.performance.totalExecutionTime <= 30000 ? 'success' : 'error');
    
    this.log(`Monitoring: ${report.summary.monitoring.passed}/${report.summary.monitoring.passed + report.summary.monitoring.failed} passed (${report.summary.monitoring.successRate}%)`, 
      report.summary.monitoring.successRate >= 100 ? 'success' : 'error');
    
    this.log(`Environment: ${report.summary.environment.passed}/${report.summary.environment.passed + report.summary.environment.failed} passed (${report.summary.environment.successRate}%)`, 
      report.summary.environment.successRate >= 100 ? 'success' : 'error');

    this.log(`Package Managers: ${report.summary.packageManagers.passed}/${report.summary.packageManagers.passed + report.summary.packageManagers.failed} passed (${report.summary.packageManagers.successRate}%)`, 
      report.summary.packageManagers.successRate >= 100 ? 'success' : 'error');

    this.log(`Overall: ${report.summary.overall.passed}/${report.summary.overall.total} passed (${report.summary.overall.successRate}%) - Total time: ${(report.totalExecutionTime / 1000).toFixed(1)}s`, 
      report.summary.overall.successRate >= 100 ? 'success' : 'error');

    // Show recommendations
    if (report.recommendations.length > 0) {
      this.log('='.repeat(80), 'info');
      this.log('RECOMMENDATIONS', 'warning');
      this.log('='.repeat(80), 'info');
      
      report.recommendations.forEach((rec, index) => {
        this.log(`${index + 1}. [${rec.priority}] ${rec.category}: ${rec.issue}`, 'warning');
        this.log(`   Action: ${rec.action}`, 'info');
      });
    }

    // Save detailed report
    const reportPath = path.join(process.cwd(), '.kiro', 'specs', 'system-error-resolution', 'task-execute-history', 'task-11.3-performance-quality-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`Detailed report saved to: ${reportPath}`, 'info');

    // Determine overall success
    const overallSuccess = parseFloat(report.summary.overall.successRate) >= 100 && 
                          report.summary.performance.totalExecutionTime <= 30000;

    this.log('='.repeat(80), 'info');
    this.log(`OVERALL RESULT: ${overallSuccess ? 'SUCCESS' : 'NEEDS IMPROVEMENT'}`, 
      overallSuccess ? 'success' : 'error');
    this.log('='.repeat(80), 'info');

    return overallSuccess;
  }
}

// Run the validation
if (require.main === module) {
  const validator = new PerformanceQualityValidator();
  validator.run()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Performance and quality validation failed:', error);
      process.exit(1);
    });
}

module.exports = PerformanceQualityValidator;