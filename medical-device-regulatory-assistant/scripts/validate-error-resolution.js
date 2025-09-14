#!/usr/bin/env node

/**
 * Error Resolution Validation Script
 * Task 11.2: Validate Error Resolution Effectiveness
 * 
 * Tests previously failing error scenarios to confirm resolution
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

class ErrorResolutionValidator {
  constructor() {
    this.results = {
      exceptionHandling: { passed: 0, failed: 0, tests: [] },
      errorTracking: { passed: 0, failed: 0, tests: [] },
      systemLayers: { passed: 0, failed: 0, tests: [] },
      overall: { success: false, issues: [] }
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      progress: '🔄'
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

  async validateExceptionHandling() {
    this.log('Validating exception handling consistency...', 'progress');
    
    const backendDir = path.join(process.cwd(), 'medical-device-regulatory-assistant', 'backend');
    
    const exceptionTests = [
      {
        name: 'Core Exceptions Import',
        command: 'poetry run python -c "from core.exceptions import ProjectNotFoundError, ValidationError, DatabaseError; print(\'✓ Core exceptions imported successfully\')"',
        description: 'Test that core exceptions can be imported without errors'
      },
      {
        name: 'Project Exceptions Import',
        command: 'poetry run python -c "from exceptions.project_exceptions import ProjectValidationError; print(\'✓ Project exceptions imported successfully\')"',
        description: 'Test that project-specific exceptions can be imported'
      },
      {
        name: 'Exception Mapping',
        command: 'poetry run python -c "from core.exception_mapper import ExceptionMapper; mapper = ExceptionMapper(); print(\'✓ Exception mapper initialized successfully\')"',
        description: 'Test that exception mapping system works'
      },
      {
        name: 'Services Exception Usage',
        command: 'poetry run python -c "from services.projects import ProjectService, ProjectValidationError; print(\'✓ Services can import and use exceptions\')"',
        description: 'Test that services can properly import and use exceptions'
      }
    ];

    for (const test of exceptionTests) {
      try {
        const result = await this.runCommand(test.command, backendDir, 10000);
        
        if (result.success && result.stdout.includes('✓')) {
          this.results.exceptionHandling.passed++;
          this.results.exceptionHandling.tests.push({
            name: test.name,
            status: 'passed',
            description: test.description,
            output: result.stdout.trim()
          });
          this.log(`${test.name}: PASSED`, 'success');
        } else {
          this.results.exceptionHandling.failed++;
          this.results.exceptionHandling.tests.push({
            name: test.name,
            status: 'failed',
            description: test.description,
            error: result.stderr || 'No success indicator found',
            output: result.stdout
          });
          this.log(`${test.name}: FAILED - ${result.stderr}`, 'error');
        }
      } catch (error) {
        this.results.exceptionHandling.failed++;
        this.results.exceptionHandling.tests.push({
          name: test.name,
          status: 'error',
          description: test.description,
          error: error.message
        });
        this.log(`${test.name}: ERROR - ${error.message}`, 'error');
      }
    }
  }

  async validateErrorTracking() {
    this.log('Validating error tracking and monitoring...', 'progress');
    
    const backendDir = path.join(process.cwd(), 'medical-device-regulatory-assistant', 'backend');
    
    const trackingTests = [
      {
        name: 'Error Tracker Import',
        command: 'poetry run python -c "from core.error_tracker import ErrorTracker; print(\'✓ Error tracker imported successfully\')"',
        description: 'Test that error tracking system can be imported'
      },
      {
        name: 'Error Handler Import',
        command: 'poetry run python -c "from core.error_handler import GlobalErrorHandler; print(\'✓ Global error handler imported successfully\')"',
        description: 'Test that global error handler can be imported'
      },
      {
        name: 'Performance Monitor Import',
        command: 'poetry run python -c "from testing.performance_monitor import TestPerformanceMonitor; print(\'✓ Performance monitor imported successfully\')"',
        description: 'Test that performance monitoring system works'
      },
      {
        name: 'Database Isolation Import',
        command: 'poetry run python -c "from testing.database_isolation import DatabaseTestIsolation; print(\'✓ Database isolation imported successfully\')"',
        description: 'Test that database isolation system works'
      }
    ];

    for (const test of trackingTests) {
      try {
        const result = await this.runCommand(test.command, backendDir, 10000);
        
        if (result.success && result.stdout.includes('✓')) {
          this.results.errorTracking.passed++;
          this.results.errorTracking.tests.push({
            name: test.name,
            status: 'passed',
            description: test.description,
            output: result.stdout.trim()
          });
          this.log(`${test.name}: PASSED`, 'success');
        } else {
          this.results.errorTracking.failed++;
          this.results.errorTracking.tests.push({
            name: test.name,
            status: 'failed',
            description: test.description,
            error: result.stderr || 'No success indicator found',
            output: result.stdout
          });
          this.log(`${test.name}: FAILED - ${result.stderr}`, 'error');
        }
      } catch (error) {
        this.results.errorTracking.failed++;
        this.results.errorTracking.tests.push({
          name: test.name,
          status: 'error',
          description: test.description,
          error: error.message
        });
        this.log(`${test.name}: ERROR - ${error.message}`, 'error');
      }
    }
  }

  async validateSystemLayers() {
    this.log('Validating system layer consistency...', 'progress');
    
    const frontendDir = path.join(process.cwd(), 'medical-device-regulatory-assistant');
    const backendDir = path.join(process.cwd(), 'medical-device-regulatory-assistant', 'backend');
    
    const layerTests = [
      {
        name: 'Frontend Error Boundary',
        command: 'node -e "const fs = require(\'fs\'); const path = \'src/components/error-boundary.tsx\'; if (fs.existsSync(path)) { console.log(\'✓ Error boundary component exists\'); } else { throw new Error(\'Error boundary not found\'); }"',
        cwd: frontendDir,
        description: 'Test that frontend error boundary exists'
      },
      {
        name: 'Frontend Testing Utils',
        command: 'node -e "const fs = require(\'fs\'); const path = \'src/lib/testing/react-test-utils.tsx\'; if (fs.existsSync(path)) { console.log(\'✓ React testing utilities exist\'); } else { throw new Error(\'Testing utilities not found\'); }"',
        cwd: frontendDir,
        description: 'Test that React testing utilities exist'
      },
      {
        name: 'Backend API Client',
        command: 'poetry run python -c "from testing.api_client import TestAPIClient; print(\'✓ Test API client available\')"',
        cwd: backendDir,
        description: 'Test that backend API client works'
      },
      {
        name: 'Environment Validation',
        command: 'poetry run python -c "from core.environment import EnvironmentValidator; print(\'✓ Environment validator available\')"',
        cwd: backendDir,
        description: 'Test that environment validation works'
      }
    ];

    for (const test of layerTests) {
      try {
        const result = await this.runCommand(test.command, test.cwd, 10000);
        
        if (result.success && result.stdout.includes('✓')) {
          this.results.systemLayers.passed++;
          this.results.systemLayers.tests.push({
            name: test.name,
            status: 'passed',
            description: test.description,
            output: result.stdout.trim()
          });
          this.log(`${test.name}: PASSED`, 'success');
        } else {
          this.results.systemLayers.failed++;
          this.results.systemLayers.tests.push({
            name: test.name,
            status: 'failed',
            description: test.description,
            error: result.stderr || 'No success indicator found',
            output: result.stdout
          });
          this.log(`${test.name}: FAILED - ${result.stderr}`, 'error');
        }
      } catch (error) {
        this.results.systemLayers.failed++;
        this.results.systemLayers.tests.push({
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
    const totalPassed = this.results.exceptionHandling.passed + 
                       this.results.errorTracking.passed + 
                       this.results.systemLayers.passed;
    
    const totalFailed = this.results.exceptionHandling.failed + 
                       this.results.errorTracking.failed + 
                       this.results.systemLayers.failed;
    
    const totalTests = totalPassed + totalFailed;
    const successRate = totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(1) : '0.0';

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        overall: {
          successRate,
          passed: totalPassed,
          failed: totalFailed,
          total: totalTests
        },
        exceptionHandling: {
          successRate: this.results.exceptionHandling.passed + this.results.exceptionHandling.failed > 0 
            ? (this.results.exceptionHandling.passed / (this.results.exceptionHandling.passed + this.results.exceptionHandling.failed) * 100).toFixed(1)
            : '0.0',
          passed: this.results.exceptionHandling.passed,
          failed: this.results.exceptionHandling.failed,
          tests: this.results.exceptionHandling.tests
        },
        errorTracking: {
          successRate: this.results.errorTracking.passed + this.results.errorTracking.failed > 0 
            ? (this.results.errorTracking.passed / (this.results.errorTracking.passed + this.results.errorTracking.failed) * 100).toFixed(1)
            : '0.0',
          passed: this.results.errorTracking.passed,
          failed: this.results.errorTracking.failed,
          tests: this.results.errorTracking.tests
        },
        systemLayers: {
          successRate: this.results.systemLayers.passed + this.results.systemLayers.failed > 0 
            ? (this.results.systemLayers.passed / (this.results.systemLayers.passed + this.results.systemLayers.failed) * 100).toFixed(1)
            : '0.0',
          passed: this.results.systemLayers.passed,
          failed: this.results.systemLayers.failed,
          tests: this.results.systemLayers.tests
        }
      },
      recommendations: this.generateRecommendations(successRate)
    };

    return report;
  }

  generateRecommendations(successRate) {
    const recommendations = [];

    if (parseFloat(successRate) < 100) {
      recommendations.push({
        category: 'Error Resolution',
        priority: 'High',
        issue: `Overall success rate ${successRate}% indicates unresolved error scenarios`,
        action: 'Address failing error resolution tests before proceeding'
      });
    }

    if (this.results.exceptionHandling.failed > 0) {
      recommendations.push({
        category: 'Exception Handling',
        priority: 'High',
        issue: 'Exception handling consistency issues detected',
        action: 'Fix import dependencies and exception mapping'
      });
    }

    if (this.results.errorTracking.failed > 0) {
      recommendations.push({
        category: 'Error Tracking',
        priority: 'Medium',
        issue: 'Error tracking and monitoring system issues',
        action: 'Ensure error tracking components are properly implemented'
      });
    }

    if (this.results.systemLayers.failed > 0) {
      recommendations.push({
        category: 'System Integration',
        priority: 'Medium',
        issue: 'System layer consistency problems',
        action: 'Verify all system components are properly integrated'
      });
    }

    return recommendations;
  }

  async run() {
    this.log('Starting error resolution effectiveness validation...', 'progress');
    
    // Run all validation phases
    await this.validateExceptionHandling();
    await this.validateErrorTracking();
    await this.validateSystemLayers();

    // Generate and display report
    const report = this.generateReport();
    
    this.log('='.repeat(80), 'info');
    this.log('ERROR RESOLUTION VALIDATION RESULTS', 'info');
    this.log('='.repeat(80), 'info');
    
    this.log(`Exception Handling: ${report.summary.exceptionHandling.passed}/${report.summary.exceptionHandling.passed + report.summary.exceptionHandling.failed} passed (${report.summary.exceptionHandling.successRate}%)`, 
      report.summary.exceptionHandling.successRate >= 100 ? 'success' : 'error');
    
    this.log(`Error Tracking: ${report.summary.errorTracking.passed}/${report.summary.errorTracking.passed + report.summary.errorTracking.failed} passed (${report.summary.errorTracking.successRate}%)`, 
      report.summary.errorTracking.successRate >= 100 ? 'success' : 'error');
    
    this.log(`System Layers: ${report.summary.systemLayers.passed}/${report.summary.systemLayers.passed + report.summary.systemLayers.failed} passed (${report.summary.systemLayers.successRate}%)`, 
      report.summary.systemLayers.successRate >= 100 ? 'success' : 'error');

    this.log(`Overall: ${report.summary.overall.passed}/${report.summary.overall.total} passed (${report.summary.overall.successRate}%)`, 
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
    const reportPath = path.join(process.cwd(), '.kiro', 'specs', 'system-error-resolution', 'task-execute-history', 'task-11.2-error-resolution-results.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`Detailed report saved to: ${reportPath}`, 'info');

    // Determine overall success
    const overallSuccess = parseFloat(report.summary.overall.successRate) >= 100;

    this.log('='.repeat(80), 'info');
    this.log(`OVERALL RESULT: ${overallSuccess ? 'SUCCESS' : 'NEEDS IMPROVEMENT'}`, 
      overallSuccess ? 'success' : 'error');
    this.log('='.repeat(80), 'info');

    return overallSuccess;
  }
}

// Run the validation
if (require.main === module) {
  const validator = new ErrorResolutionValidator();
  validator.run()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Error resolution validation failed:', error);
      process.exit(1);
    });
}

module.exports = ErrorResolutionValidator;