#!/usr/bin/env node

/**
 * CI/CD Pipeline Validation Script
 *
 * Validates the continuous integration pipeline configuration and
 * ensures all quality assurance measures are properly configured.
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
};

/**
 * CI Pipeline Validator
 */
class CIPipelineValidator {
  constructor() {
    this.projectRoot = process.cwd();
    this.validationResults = {
      github_actions: { valid: false, issues: [] },
      pre_commit: { valid: false, issues: [] },
      quality_gates: { valid: false, issues: [] },
      scripts: { valid: false, issues: [] },
      dependencies: { valid: false, issues: [] },
    };
  }

  log(message, color = COLORS.RESET) {
    console.log(`${color}${message}${COLORS.RESET}`);
  }

  logSection(title) {
    console.log(`\n${  '='.repeat(70)}`);
    this.log(`${COLORS.BOLD}${title}${COLORS.RESET}`, COLORS.BLUE);
    console.log('='.repeat(70));
  }

  /**
   * Validate GitHub Actions workflow
   */
  async validateGitHubActions() {
    this.log('🔍 Validating GitHub Actions workflow...', COLORS.YELLOW);
    const issues = [];

    try {
      const workflowPath = path.join(
        this.projectRoot,
        '.github',
        'workflows',
        'quality-assurance.yml'
      );

      if (!(await this.pathExists(workflowPath))) {
        issues.push('GitHub Actions workflow file not found');
        this.validationResults.github_actions = { valid: false, issues };
        return false;
      }

      const workflowContent = await fs.readFile(workflowPath, 'utf8');
      const workflow = yaml.load(workflowContent);

      // Check required jobs
      const requiredJobs = [
        'environment-validation',
        'frontend-quality',
        'backend-quality',
        'integration-tests',
        'e2e-tests',
        'performance-tests',
        'quality-gates',
        'security-scan',
        'deployment-readiness',
      ];

      const actualJobs = Object.keys(workflow.jobs || {});
      const missingJobs = requiredJobs.filter(
        (job) => !actualJobs.includes(job)
      );

      if (missingJobs.length > 0) {
        issues.push(`Missing required jobs: ${missingJobs.join(', ')}`);
      }

      // Check environment variables
      const requiredEnvVars = [
        'NODE_VERSION',
        'PYTHON_VERSION',
        'PNPM_VERSION',
      ];
      const actualEnvVars = Object.keys(workflow.env || {});
      const missingEnvVars = requiredEnvVars.filter(
        (env) => !actualEnvVars.includes(env)
      );

      if (missingEnvVars.length > 0) {
        issues.push(
          `Missing environment variables: ${missingEnvVars.join(', ')}`
        );
      }

      // Check triggers
      const triggers = workflow.on;
      if (!triggers.push || !triggers.pull_request) {
        issues.push('Missing required triggers (push, pull_request)');
      }

      // Check if quality gates job exists and has proper dependencies
      const qualityGatesJob = workflow.jobs['quality-gates'];
      if (qualityGatesJob) {
        const expectedDependencies = [
          'frontend-quality',
          'backend-quality',
          'integration-tests',
          'performance-tests',
        ];
        const actualDependencies = qualityGatesJob.needs || [];
        const missingDependencies = expectedDependencies.filter(
          (dep) => !actualDependencies.includes(dep)
        );

        if (missingDependencies.length > 0) {
          issues.push(
            `Quality gates job missing dependencies: ${missingDependencies.join(', ')}`
          );
        }
      }

      this.validationResults.github_actions = {
        valid: issues.length === 0,
        issues,
        jobs_count: actualJobs.length,
        workflow_file: workflowPath,
      };

      if (issues.length === 0) {
        this.log('✅ GitHub Actions workflow validation passed', COLORS.GREEN);
      } else {
        this.log(
          `❌ GitHub Actions workflow validation failed (${issues.length} issues)`,
          COLORS.RED
        );
      }

      return issues.length === 0;
    } catch (error) {
      issues.push(`Workflow validation error: ${error.message}`);
      this.validationResults.github_actions = { valid: false, issues };
      return false;
    }
  }

  /**
   * Validate pre-commit configuration
   */
  async validatePreCommitConfig() {
    this.log('🔍 Validating pre-commit configuration...', COLORS.YELLOW);
    const issues = [];

    try {
      const preCommitPath = path.join(
        this.projectRoot,
        '.pre-commit-config.yaml'
      );

      if (!(await this.pathExists(preCommitPath))) {
        issues.push('Pre-commit configuration file not found');
        this.validationResults.pre_commit = { valid: false, issues };
        return false;
      }

      const preCommitContent = await fs.readFile(preCommitPath, 'utf8');
      const preCommitConfig = yaml.load(preCommitContent);

      // Check for required hook categories
      const requiredHookTypes = [
        'frontend-type-check',
        'frontend-lint',
        'frontend-format',
        'backend-black',
        'backend-isort',
        'backend-flake8',
        'backend-mypy',
      ];

      const repos = preCommitConfig.repos || [];
      const localRepo = repos.find((repo) => repo.repo === 'local');

      if (!localRepo) {
        issues.push(
          'Local repository configuration not found in pre-commit config'
        );
      } else {
        const hookIds = localRepo.hooks.map((hook) => hook.id);
        const missingHooks = requiredHookTypes.filter(
          (hookType) => !hookIds.includes(hookType)
        );

        if (missingHooks.length > 0) {
          issues.push(`Missing pre-commit hooks: ${missingHooks.join(', ')}`);
        }
      }

      // Check for security hooks
      const hasSecurityHooks = repos.some(
        (repo) =>
          repo.hooks &&
          repo.hooks.some(
            (hook) =>
              hook.id.includes('audit') ||
              hook.id.includes('safety') ||
              hook.id.includes('security')
          )
      );

      if (!hasSecurityHooks) {
        issues.push('No security-related pre-commit hooks found');
      }

      this.validationResults.pre_commit = {
        valid: issues.length === 0,
        issues,
        hooks_count: localRepo ? localRepo.hooks.length : 0,
        config_file: preCommitPath,
      };

      if (issues.length === 0) {
        this.log('✅ Pre-commit configuration validation passed', COLORS.GREEN);
      } else {
        this.log(
          `❌ Pre-commit configuration validation failed (${issues.length} issues)`,
          COLORS.RED
        );
      }

      return issues.length === 0;
    } catch (error) {
      issues.push(`Pre-commit validation error: ${error.message}`);
      this.validationResults.pre_commit = { valid: false, issues };
      return false;
    }
  }

  /**
   * Validate quality gates configuration
   */
  async validateQualityGates() {
    this.log('🔍 Validating quality gates configuration...', COLORS.YELLOW);
    const issues = [];

    try {
      const qualityGatesPath = path.join(
        this.projectRoot,
        'quality-gates.json'
      );

      if (!(await this.pathExists(qualityGatesPath))) {
        issues.push('Quality gates configuration file not found');
        this.validationResults.quality_gates = { valid: false, issues };
        return false;
      }

      const qualityGatesContent = await fs.readFile(qualityGatesPath, 'utf8');
      const qualityGates = JSON.parse(qualityGatesContent);

      // Check required gates
      const requiredGates = [
        'overall_quality',
        'frontend_coverage',
        'backend_coverage',
        'critical_issues',
        'security_vulnerabilities',
      ];

      const actualGates = Object.keys(qualityGates.gates || {});
      const missingGates = requiredGates.filter(
        (gate) => !actualGates.includes(gate)
      );

      if (missingGates.length > 0) {
        issues.push(`Missing quality gates: ${missingGates.join(', ')}`);
      }

      // Validate gate structure
      Object.entries(qualityGates.gates || {}).forEach(([gateName, gate]) => {
        if (!gate.threshold && gate.threshold !== 0) {
          issues.push(`Gate '${gateName}' missing threshold`);
        }
        if (!gate.operator) {
          issues.push(`Gate '${gateName}' missing operator`);
        }
        if (!gate.severity) {
          issues.push(`Gate '${gateName}' missing severity`);
        }
      });

      // Check environments
      const requiredEnvironments = ['development', 'staging', 'production'];
      const actualEnvironments = Object.keys(qualityGates.environments || {});
      const missingEnvironments = requiredEnvironments.filter(
        (env) => !actualEnvironments.includes(env)
      );

      if (missingEnvironments.length > 0) {
        issues.push(
          `Missing environment configurations: ${missingEnvironments.join(', ')}`
        );
      }

      this.validationResults.quality_gates = {
        valid: issues.length === 0,
        issues,
        gates_count: actualGates.length,
        environments_count: actualEnvironments.length,
        config_file: qualityGatesPath,
      };

      if (issues.length === 0) {
        this.log(
          '✅ Quality gates configuration validation passed',
          COLORS.GREEN
        );
      } else {
        this.log(
          `❌ Quality gates configuration validation failed (${issues.length} issues)`,
          COLORS.RED
        );
      }

      return issues.length === 0;
    } catch (error) {
      issues.push(`Quality gates validation error: ${error.message}`);
      this.validationResults.quality_gates = { valid: false, issues };
      return false;
    }
  }

  /**
   * Validate quality assurance scripts
   */
  async validateQualityScripts() {
    this.log('🔍 Validating quality assurance scripts...', COLORS.YELLOW);
    const issues = [];

    try {
      const scriptsDir = path.join(this.projectRoot, 'scripts');

      if (!(await this.pathExists(scriptsDir))) {
        issues.push('Scripts directory not found');
        this.validationResults.scripts = { valid: false, issues };
        return false;
      }

      // Check required scripts
      const requiredScripts = [
        'quality-check-system.js',
        'quality-metrics-reporter.js',
        'regression-detector.js',
        'validate-frontend-environment.js',
        'testing-maintenance.js',
      ];

      const scriptFiles = await fs.readdir(scriptsDir);
      const missingScripts = requiredScripts.filter(
        (script) => !scriptFiles.includes(script)
      );

      if (missingScripts.length > 0) {
        issues.push(`Missing required scripts: ${missingScripts.join(', ')}`);
      }

      // Check if scripts are executable (have proper shebang)
      for (const script of requiredScripts) {
        const scriptPath = path.join(scriptsDir, script);
        if (await this.pathExists(scriptPath)) {
          const scriptContent = await fs.readFile(scriptPath, 'utf8');
          if (!scriptContent.startsWith('#!/usr/bin/env node')) {
            issues.push(`Script '${script}' missing proper shebang`);
          }
        }
      }

      // Check backend quality checker
      const backendQualityChecker = path.join(
        this.projectRoot,
        'backend',
        'testing',
        'quality_checker.py'
      );
      if (!(await this.pathExists(backendQualityChecker))) {
        issues.push('Backend quality checker script not found');
      }

      this.validationResults.scripts = {
        valid: issues.length === 0,
        issues,
        scripts_count: scriptFiles.length,
        scripts_dir: scriptsDir,
      };

      if (issues.length === 0) {
        this.log('✅ Quality scripts validation passed', COLORS.GREEN);
      } else {
        this.log(
          `❌ Quality scripts validation failed (${issues.length} issues)`,
          COLORS.RED
        );
      }

      return issues.length === 0;
    } catch (error) {
      issues.push(`Scripts validation error: ${error.message}`);
      this.validationResults.scripts = { valid: false, issues };
      return false;
    }
  }

  /**
   * Validate package.json scripts
   */
  async validatePackageScripts() {
    this.log('🔍 Validating package.json scripts...', COLORS.YELLOW);
    const issues = [];

    try {
      const packageJsonPath = path.join(this.projectRoot, 'package.json');

      if (!(await this.pathExists(packageJsonPath))) {
        issues.push('package.json not found');
        this.validationResults.dependencies = { valid: false, issues };
        return false;
      }

      const packageJson = JSON.parse(
        await fs.readFile(packageJsonPath, 'utf8')
      );
      const scripts = packageJson.scripts || {};

      // Check required npm scripts
      const requiredScripts = [
        'quality:check',
        'quality:report',
        'quality:full',
        'test:coverage',
        'lint',
        'format',
        'type-check',
      ];

      const missingScripts = requiredScripts.filter(
        (script) => !scripts[script]
      );

      if (missingScripts.length > 0) {
        issues.push(
          `Missing package.json scripts: ${missingScripts.join(', ')}`
        );
      }

      // Check if quality scripts reference the correct files
      if (
        scripts['quality:check'] &&
        !scripts['quality:check'].includes('quality-check-system.js')
      ) {
        issues.push(
          'quality:check script does not reference quality-check-system.js'
        );
      }

      if (
        scripts['quality:report'] &&
        !scripts['quality:report'].includes('quality-metrics-reporter.js')
      ) {
        issues.push(
          'quality:report script does not reference quality-metrics-reporter.js'
        );
      }

      // Check development dependencies
      const devDependencies = packageJson.devDependencies || {};
      const requiredDevDeps = [
        '@testing-library/react',
        '@testing-library/jest-dom',
        'jest',
        'eslint',
        'prettier',
        'typescript',
      ];

      const missingDevDeps = requiredDevDeps.filter(
        (dep) => !devDependencies[dep]
      );

      if (missingDevDeps.length > 0) {
        issues.push(
          `Missing development dependencies: ${missingDevDeps.join(', ')}`
        );
      }

      this.validationResults.dependencies = {
        valid: issues.length === 0,
        issues,
        scripts_count: Object.keys(scripts).length,
        dev_deps_count: Object.keys(devDependencies).length,
      };

      if (issues.length === 0) {
        this.log('✅ Package scripts validation passed', COLORS.GREEN);
      } else {
        this.log(
          `❌ Package scripts validation failed (${issues.length} issues)`,
          COLORS.RED
        );
      }

      return issues.length === 0;
    } catch (error) {
      issues.push(`Package scripts validation error: ${error.message}`);
      this.validationResults.dependencies = { valid: false, issues };
      return false;
    }
  }

  /**
   * Generate validation report
   */
  generateValidationReport() {
    const totalChecks = Object.keys(this.validationResults).length;
    const passedChecks = Object.values(this.validationResults).filter(
      (result) => result.valid
    ).length;
    const allIssues = Object.values(this.validationResults).flatMap(
      (result) => result.issues
    );

    return {
      timestamp: new Date().toISOString(),
      summary: {
        total_checks: totalChecks,
        passed_checks: passedChecks,
        failed_checks: totalChecks - passedChecks,
        total_issues: allIssues.length,
        overall_valid: passedChecks === totalChecks,
      },
      results: this.validationResults,
      recommendations: this.generateRecommendations(),
    };
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    Object.entries(this.validationResults).forEach(([category, result]) => {
      if (!result.valid && result.issues.length > 0) {
        switch (category) {
          case 'github_actions':
            recommendations.push({
              category: 'CI/CD Pipeline',
              priority: 'high',
              message: 'Fix GitHub Actions workflow configuration',
              actions: [
                'Review .github/workflows/quality-assurance.yml',
                'Add missing jobs and environment variables',
                'Ensure proper job dependencies',
              ],
            });
            break;

          case 'pre_commit':
            recommendations.push({
              category: 'Pre-commit Hooks',
              priority: 'medium',
              message: 'Fix pre-commit configuration',
              actions: [
                'Review .pre-commit-config.yaml',
                'Add missing hooks for code quality',
                'Install pre-commit: pip install pre-commit',
              ],
            });
            break;

          case 'quality_gates':
            recommendations.push({
              category: 'Quality Gates',
              priority: 'high',
              message: 'Fix quality gates configuration',
              actions: [
                'Review quality-gates.json',
                'Add missing quality gates',
                'Configure environment-specific thresholds',
              ],
            });
            break;

          case 'scripts':
            recommendations.push({
              category: 'Quality Scripts',
              priority: 'high',
              message: 'Fix quality assurance scripts',
              actions: [
                'Add missing quality check scripts',
                'Ensure scripts have proper permissions',
                'Test script execution',
              ],
            });
            break;

          case 'dependencies':
            recommendations.push({
              category: 'Dependencies',
              priority: 'medium',
              message: 'Fix package configuration',
              actions: [
                'Add missing npm scripts to package.json',
                'Install missing development dependencies',
                'Update script references',
              ],
            });
            break;
        }
      }
    });

    return recommendations;
  }

  /**
   * Print validation summary
   */
  printValidationSummary() {
    const report = this.generateValidationReport();

    this.logSection('CI/CD Pipeline Validation Summary');

    const overallValid = report.summary.overall_valid;
    const statusColor = overallValid ? COLORS.GREEN : COLORS.RED;
    const statusText = overallValid ? 'VALID' : 'ISSUES FOUND';

    this.log(`Overall Status: ${statusText}`, statusColor);
    this.log(
      `Checks Passed: ${report.summary.passed_checks}/${report.summary.total_checks}`
    );
    this.log(`Total Issues: ${report.summary.total_issues}`);

    // Detailed results
    console.log('\n📊 Validation Results:');
    console.log('┌─────────────────────┬─────────┬─────────────┐');
    console.log('│ Component           │ Status  │ Issues      │');
    console.log('├─────────────────────┼─────────┼─────────────┤');

    Object.entries(this.validationResults).forEach(([component, result]) => {
      const displayName = component
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());
      const status = result.valid ? '✅ PASS' : '❌ FAIL';
      const issues = result.issues.length;

      console.log(
        `│ ${displayName.padEnd(19)} │ ${status.padEnd(7)} │ ${issues.toString().padEnd(11)} │`
      );
    });

    console.log('└─────────────────────┴─────────┴─────────────┘');

    // Issues details
    if (report.summary.total_issues > 0) {
      console.log('\n❌ Issues Found:');
      Object.entries(this.validationResults).forEach(([component, result]) => {
        if (result.issues.length > 0) {
          const displayName = component
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (l) => l.toUpperCase());
          this.log(`\n${displayName}:`, COLORS.YELLOW);
          result.issues.forEach((issue) => {
            this.log(`  • ${issue}`, COLORS.RED);
          });
        }
      });
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      console.log('\n🔧 Recommendations:');
      report.recommendations.forEach((rec, i) => {
        const priorityColor =
          rec.priority === 'high'
            ? COLORS.RED
            : rec.priority === 'medium'
              ? COLORS.YELLOW
              : COLORS.BLUE;
        this.log(
          `\n${i + 1}. [${rec.priority.toUpperCase()}] ${rec.category}: ${rec.message}`,
          priorityColor
        );
        rec.actions.forEach((action) => {
          this.log(`   • ${action}`, COLORS.RESET);
        });
      });
    }

    // Save report
    const reportPath = path.join(
      this.projectRoot,
      'ci-pipeline-validation-report.json'
    );
    fs.writeFile(reportPath, JSON.stringify(report, null, 2)).then(() => {
      this.log(`\n📄 Validation report saved to: ${reportPath}`, COLORS.BLUE);
    });

    return overallValid;
  }

  /**
   * Helper methods
   */
  async pathExists(path) {
    try {
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Main execution
   */
  async run() {
    try {
      this.log(
        `${COLORS.BOLD}🔍 CI/CD Pipeline Validation - Medical Device Regulatory Assistant${COLORS.RESET}`,
        COLORS.BLUE
      );

      await this.validateGitHubActions();
      await this.validatePreCommitConfig();
      await this.validateQualityGates();
      await this.validateQualityScripts();
      await this.validatePackageScripts();

      const isValid = this.printValidationSummary();

      if (isValid) {
        this.log(
          '\n🎉 CI/CD pipeline validation passed! All components are properly configured.',
          COLORS.GREEN
        );
        process.exit(0);
      } else {
        this.log(
          '\n❌ CI/CD pipeline validation failed. Please address the issues above.',
          COLORS.RED
        );
        process.exit(1);
      }
    } catch (error) {
      this.log(`\n💥 Pipeline validation failed: ${error.message}`, COLORS.RED);
      process.exit(1);
    }
  }
}

// CLI interface
async function main() {
  // Check if js-yaml is available
  try {
    require('js-yaml');
  } catch (error) {
    console.log('Installing required dependency: js-yaml');
    const { execSync } = require('child_process');
    execSync('pnpm add --dev js-yaml', { stdio: 'inherit' });
    // Re-require after installation
    global.yaml = require('js-yaml');
  }

  const validator = new CIPipelineValidator();
  await validator.run();
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = CIPipelineValidator;
