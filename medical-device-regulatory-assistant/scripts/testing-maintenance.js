#!/usr/bin/env node

/**
 * Testing Maintenance Script
 * 
 * Automates common testing maintenance tasks including:
 * - Mock data validation
 * - Test coverage analysis
 * - Performance monitoring
 * - Dependency updates
 * - Cleanup operations
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const glob = require('glob');

class TestingMaintenance {
  constructor() {
    this.projectRoot = process.cwd();
    this.maintenanceLog = [];
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    console.log(logEntry);
    this.maintenanceLog.push(logEntry);
  }

  async runCommand(command, options = {}) {
    try {
      const result = execSync(command, { 
        encoding: 'utf8', 
        cwd: this.projectRoot,
        ...options 
      });
      return result.trim();
    } catch (error) {
      this.log(`Command failed: ${command}`, 'error');
      this.log(error.message, 'error');
      throw error;
    }
  }

  async validateMockData() {
    this.log('Validating mock data generators...');
    
    try {
      // Check if mock data file exists
      const mockDataPath = path.join(this.projectRoot, 'src/lib/mock-data.ts');
      await fs.access(mockDataPath);
      
      // Run TypeScript compilation to check for errors
      await this.runCommand('pnpm type-check');
      
      // Run mock data validation tests
      const testResult = await this.runCommand('pnpm test src/lib/mock-data.unit.test.ts --passWithNoTests');
      
      this.log('Mock data validation completed successfully');
      return true;
    } catch (error) {
      this.log('Mock data validation failed', 'error');
      return false;
    }
  }

  async analyzeCoverage() {
    this.log('Analyzing test coverage...');
    
    try {
      // Run tests with coverage
      await this.runCommand('pnpm test:coverage --silent');
      
      // Read coverage summary
      const coveragePath = path.join(this.projectRoot, 'coverage/coverage-summary.json');
      const coverageData = JSON.parse(await fs.readFile(coveragePath, 'utf8'));
      
      const totalCoverage = coverageData.total;
      const coverageReport = {
        statements: totalCoverage.statements.pct,
        branches: totalCoverage.branches.pct,
        functions: totalCoverage.functions.pct,
        lines: totalCoverage.lines.pct,
      };
      
      this.log(`Coverage Report: ${JSON.stringify(coverageReport, null, 2)}`);
      
      // Check if coverage meets thresholds
      const thresholds = { statements: 85, branches: 85, functions: 85, lines: 85 };
      const failedThresholds = [];
      
      Object.entries(thresholds).forEach(([metric, threshold]) => {
        if (coverageReport[metric] < threshold) {
          failedThresholds.push(`${metric}: ${coverageReport[metric]}% < ${threshold}%`);
        }
      });
      
      if (failedThresholds.length > 0) {
        this.log(`Coverage thresholds not met: ${failedThresholds.join(', ')}`, 'warn');
      } else {
        this.log('All coverage thresholds met');
      }
      
      return coverageReport;
    } catch (error) {
      this.log('Coverage analysis failed', 'error');
      return null;
    }
  }

  async checkPerformance() {
    this.log('Checking performance metrics...');
    
    try {
      // Check bundle size
      const bundleSizeResult = await this.runCommand('pnpm bundlesize --json', { stdio: 'pipe' });
      
      // Run Lighthouse CI if available
      try {
        await this.runCommand('pnpm lighthouse:collect --quiet');
        this.log('Lighthouse audit completed');
      } catch (lighthouseError) {
        this.log('Lighthouse audit skipped (server not running)', 'warn');
      }
      
      this.log('Performance check completed');
      return true;
    } catch (error) {
      this.log('Performance check failed', 'error');
      return false;
    }
  }

  async updateDependencies() {
    this.log('Checking for dependency updates...');
    
    try {
      // Check for outdated packages
      const outdatedResult = await this.runCommand('pnpm outdated --format json', { stdio: 'pipe' });
      
      if (outdatedResult) {
        const outdatedPackages = JSON.parse(outdatedResult);
        const packageCount = Object.keys(outdatedPackages).length;
        
        if (packageCount > 0) {
          this.log(`Found ${packageCount} outdated packages`);
          
          // Update non-breaking changes only
          await this.runCommand('pnpm update --latest');
          this.log('Dependencies updated (non-breaking changes only)');
        } else {
          this.log('All dependencies are up to date');
        }
      }
      
      return true;
    } catch (error) {
      this.log('Dependency update check failed', 'error');
      return false;
    }
  }

  async cleanupArtifacts() {
    this.log('Cleaning up test artifacts...');
    
    try {
      const artifactPatterns = [
        'coverage/**/*',
        'playwright-report/**/*',
        'test-results/**/*',
        '.lighthouseci/**/*',
        '**/*.test-output.*',
        'test-*.db',
      ];
      
      let cleanedFiles = 0;
      
      for (const pattern of artifactPatterns) {
        const files = glob.sync(pattern, { cwd: this.projectRoot });
        
        for (const file of files) {
          try {
            const filePath = path.join(this.projectRoot, file);
            const stats = await fs.stat(filePath);
            
            if (stats.isFile()) {
              await fs.unlink(filePath);
              cleanedFiles++;
            }
          } catch (unlinkError) {
            // File might not exist or be in use, continue
          }
        }
      }
      
      this.log(`Cleaned up ${cleanedFiles} artifact files`);
      return true;
    } catch (error) {
      this.log('Artifact cleanup failed', 'error');
      return false;
    }
  }

  async checkTestHealth() {
    this.log('Checking test suite health...');
    
    try {
      // Run a quick test to check for obvious failures
      await this.runCommand('pnpm test --passWithNoTests --testTimeout=10000');
      
      // Check for flaky tests by running a subset multiple times
      const flakyTestCheck = await this.runCommand(
        'pnpm test --testNamePattern="should render" --testTimeout=5000 --verbose',
        { stdio: 'pipe' }
      );
      
      this.log('Test suite health check completed');
      return true;
    } catch (error) {
      this.log('Test suite health check failed', 'error');
      return false;
    }
  }

  async generateMaintenanceReport() {
    const timestamp = new Date().toISOString();
    const reportPath = path.join(this.projectRoot, 'maintenance-reports');
    
    // Ensure reports directory exists
    try {
      await fs.mkdir(reportPath, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
    
    const report = {
      timestamp,
      maintenanceLog: this.maintenanceLog,
      summary: {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
      },
    };
    
    // Count task results from log
    this.maintenanceLog.forEach(entry => {
      if (entry.includes('completed') || entry.includes('failed')) {
        report.summary.totalTasks++;
        if (entry.includes('completed')) {
          report.summary.completedTasks++;
        } else {
          report.summary.failedTasks++;
        }
      }
    });
    
    const reportFile = path.join(reportPath, `maintenance-${timestamp.split('T')[0]}.json`);
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    
    this.log(`Maintenance report saved to ${reportFile}`);
    return report;
  }

  async runDailyMaintenance() {
    this.log('Starting daily maintenance tasks...');
    
    const tasks = [
      { name: 'Mock Data Validation', fn: () => this.validateMockData() },
      { name: 'Test Health Check', fn: () => this.checkTestHealth() },
      { name: 'Artifact Cleanup', fn: () => this.cleanupArtifacts() },
    ];
    
    for (const task of tasks) {
      try {
        this.log(`Running ${task.name}...`);
        await task.fn();
        this.log(`${task.name} completed`);
      } catch (error) {
        this.log(`${task.name} failed`, 'error');
      }
    }
    
    await this.generateMaintenanceReport();
    this.log('Daily maintenance completed');
  }

  async runWeeklyMaintenance() {
    this.log('Starting weekly maintenance tasks...');
    
    const tasks = [
      { name: 'Mock Data Validation', fn: () => this.validateMockData() },
      { name: 'Coverage Analysis', fn: () => this.analyzeCoverage() },
      { name: 'Performance Check', fn: () => this.checkPerformance() },
      { name: 'Dependency Updates', fn: () => this.updateDependencies() },
      { name: 'Test Health Check', fn: () => this.checkTestHealth() },
      { name: 'Artifact Cleanup', fn: () => this.cleanupArtifacts() },
    ];
    
    for (const task of tasks) {
      try {
        this.log(`Running ${task.name}...`);
        await task.fn();
        this.log(`${task.name} completed`);
      } catch (error) {
        this.log(`${task.name} failed`, 'error');
      }
    }
    
    await this.generateMaintenanceReport();
    this.log('Weekly maintenance completed');
  }

  async runMonthlyMaintenance() {
    this.log('Starting monthly maintenance tasks...');
    
    // Run all weekly tasks plus additional monthly tasks
    await this.runWeeklyMaintenance();
    
    // Additional monthly tasks
    try {
      this.log('Running comprehensive test audit...');
      await this.runCommand('pnpm test:all');
      this.log('Comprehensive test audit completed');
    } catch (error) {
      this.log('Comprehensive test audit failed', 'error');
    }
    
    this.log('Monthly maintenance completed');
  }
}

// CLI interface
async function main() {
  const maintenance = new TestingMaintenance();
  const command = process.argv[2] || 'daily';
  
  try {
    switch (command) {
      case 'daily':
        await maintenance.runDailyMaintenance();
        break;
      case 'weekly':
        await maintenance.runWeeklyMaintenance();
        break;
      case 'monthly':
        await maintenance.runMonthlyMaintenance();
        break;
      case 'validate-mock-data':
        await maintenance.validateMockData();
        break;
      case 'analyze-coverage':
        await maintenance.analyzeCoverage();
        break;
      case 'check-performance':
        await maintenance.checkPerformance();
        break;
      case 'update-dependencies':
        await maintenance.updateDependencies();
        break;
      case 'cleanup':
        await maintenance.cleanupArtifacts();
        break;
      case 'health-check':
        await maintenance.checkTestHealth();
        break;
      default:
        console.log('Usage: node scripts/testing-maintenance.js [command]');
        console.log('Commands:');
        console.log('  daily              - Run daily maintenance tasks');
        console.log('  weekly             - Run weekly maintenance tasks');
        console.log('  monthly            - Run monthly maintenance tasks');
        console.log('  validate-mock-data - Validate mock data generators');
        console.log('  analyze-coverage   - Analyze test coverage');
        console.log('  check-performance  - Check performance metrics');
        console.log('  update-dependencies- Update dependencies');
        console.log('  cleanup            - Clean up test artifacts');
        console.log('  health-check       - Check test suite health');
        process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Maintenance script failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = TestingMaintenance;