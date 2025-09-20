#!/usr/bin/env node

/**
 * Frontend Environment Validation Script
 *
 * This script validates the frontend development environment for the
 * Medical Device Regulatory Assistant, including Node.js version,
 * pnpm installation, and required dependencies.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { promisify } = require('util');

// Configuration
const REQUIRED_NODE_VERSION = '18.0.0';
const REQUIRED_PNPM_VERSION = '8.0.0';
const PROJECT_ROOT = path.resolve(__dirname, '..');

const REQUIRED_DEPENDENCIES = [
  'next',
  'react',
  'react-dom',
  '@copilotkit/react-core',
  '@copilotkit/react-ui',
  'next-auth',
  'tailwindcss',
  'typescript',
];

const REQUIRED_DEV_DEPENDENCIES = [
  '@testing-library/react',
  '@testing-library/jest-dom',
  '@playwright/test',
  'jest',
  'eslint',
  'prettier',
];

const REQUIRED_FILES = [
  'package.json',
  'pnpm-lock.yaml',
  'next.config.ts',
  'tsconfig.json',
];

const ALTERNATIVE_FILES = {
  'tailwind.config.js': [
    'tailwind.config.ts',
    'tailwind.config.mjs',
    'postcss.config.mjs',
  ],
};

const OPTIONAL_FILES = [
  '.env.local',
  '.env.development',
  'components.json',
  'jest.config.js',
  'playwright.config.ts',
];

const REQUIRED_ENV_VARS = ['NEXTAUTH_URL', 'NEXTAUTH_SECRET'];

const OPTIONAL_ENV_VARS = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'FDA_API_KEY',
];

/**
 * Validation result structure
 */
class ValidationResult {
  constructor() {
    this.isValid = true;
    this.errors = [];
    this.warnings = [];
    this.recommendations = [];
    this.details = {};
  }

  addError(message, recommendation = null) {
    this.errors.push(message);
    this.isValid = false;
    if (recommendation) {
      this.recommendations.push(recommendation);
    }
  }

  addWarning(message, recommendation = null) {
    this.warnings.push(message);
    if (recommendation) {
      this.recommendations.push(recommendation);
    }
  }

  addDetail(key, value) {
    this.details[key] = value;
  }
}

/**
 * Frontend Environment Validator
 */
class FrontendEnvironmentValidator {
  constructor() {
    this.projectRoot = PROJECT_ROOT;
    this.packageJsonPath = path.join(this.projectRoot, 'package.json');
    this.pnpmLockPath = path.join(this.projectRoot, 'pnpm-lock.yaml');
  }

  /**
   * Validate Node.js version and installation
   */
  validateNodeEnvironment() {
    const result = new ValidationResult();

    try {
      // Check Node.js version
      const nodeVersion = process.version.substring(1); // Remove 'v' prefix
      result.addDetail('node_version', nodeVersion);
      result.addDetail('node_executable', process.execPath);

      if (this.compareVersions(nodeVersion, REQUIRED_NODE_VERSION) < 0) {
        result.addError(
          `Node.js ${REQUIRED_NODE_VERSION}+ required, found ${nodeVersion}`,
          `Install Node.js ${REQUIRED_NODE_VERSION} or higher from https://nodejs.org/`
        );
      }

      // Check npm availability (fallback package manager)
      try {
        const npmVersion = execSync('npm --version', {
          encoding: 'utf8',
        }).trim();
        result.addDetail('npm_version', npmVersion);
        result.addDetail('npm_available', true);
      } catch (error) {
        result.addWarning(
          'npm not available',
          'Consider installing npm as fallback package manager'
        );
        result.addDetail('npm_available', false);
      }
    } catch (error) {
      result.addError(`Node.js environment check failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Validate pnpm installation and configuration
   */
  validatePnpmInstallation() {
    const result = new ValidationResult();

    try {
      // Check pnpm availability
      const pnpmVersion = execSync('pnpm --version', {
        encoding: 'utf8',
      }).trim();
      result.addDetail('pnpm_version', pnpmVersion);
      result.addDetail('pnpm_available', true);

      if (this.compareVersions(pnpmVersion, REQUIRED_PNPM_VERSION) < 0) {
        result.addWarning(
          `pnpm ${REQUIRED_PNPM_VERSION}+ recommended, found ${pnpmVersion}`,
          `Update pnpm: npm install -g pnpm@latest`
        );
      }

      // Check pnpm configuration
      try {
        const pnpmConfig = execSync('pnpm config list', { encoding: 'utf8' });
        result.addDetail('pnpm_config_available', true);
      } catch (error) {
        result.addWarning('Could not read pnpm configuration');
        result.addDetail('pnpm_config_available', false);
      }
    } catch (error) {
      result.addError(
        'pnpm not found in PATH',
        'Install pnpm: npm install -g pnpm'
      );
      result.addDetail('pnpm_available', false);
    }

    return result;
  }

  /**
   * Validate project files and configuration
   */
  validateProjectFiles() {
    const result = new ValidationResult();
    const existingFiles = [];
    const missingFiles = [];

    // Check required files
    for (const file of REQUIRED_FILES) {
      const filePath = path.join(this.projectRoot, file);
      if (fs.existsSync(filePath)) {
        existingFiles.push(file);
      } else {
        missingFiles.push(file);
        result.addError(`Required file missing: ${file}`);
      }
    }

    // Check alternative files (e.g., different Tailwind config formats)
    for (const [primaryFile, alternatives] of Object.entries(
      ALTERNATIVE_FILES
    )) {
      const primaryPath = path.join(this.projectRoot, primaryFile);
      let found = false;

      if (fs.existsSync(primaryPath)) {
        existingFiles.push(primaryFile);
        found = true;
      } else {
        // Check alternatives
        for (const altFile of alternatives) {
          const altPath = path.join(this.projectRoot, altFile);
          if (fs.existsSync(altPath)) {
            existingFiles.push(`${altFile} (alternative to ${primaryFile})`);
            found = true;
            break;
          }
        }
      }

      if (!found) {
        missingFiles.push(primaryFile);
        result.addWarning(
          `Configuration file missing: ${primaryFile}`,
          `Create ${primaryFile} or one of its alternatives: ${alternatives.join(', ')}`
        );
      }
    }

    result.addDetail('existing_required_files', existingFiles);
    result.addDetail('missing_required_files', missingFiles);

    // Check optional files
    const existingOptionalFiles = [];
    const missingOptionalFiles = [];

    for (const file of OPTIONAL_FILES) {
      const filePath = path.join(this.projectRoot, file);
      if (fs.existsSync(filePath)) {
        existingOptionalFiles.push(file);
      } else {
        missingOptionalFiles.push(file);
        if (file === '.env.local') {
          result.addWarning(
            'Environment file .env.local not found',
            'Copy .env.example to .env.local and configure variables'
          );
        }
      }
    }

    result.addDetail('existing_optional_files', existingOptionalFiles);
    result.addDetail('missing_optional_files', missingOptionalFiles);

    // Validate package.json
    if (fs.existsSync(this.packageJsonPath)) {
      try {
        const packageJson = JSON.parse(
          fs.readFileSync(this.packageJsonPath, 'utf8')
        );
        result.addDetail('package_json_valid', true);
        result.addDetail('project_name', packageJson.name);
        result.addDetail('project_version', packageJson.version);
        result.addDetail('package_manager', packageJson.packageManager);

        // Check if packageManager is set to pnpm
        if (
          !packageJson.packageManager ||
          !packageJson.packageManager.startsWith('pnpm')
        ) {
          result.addWarning(
            'packageManager not set to pnpm in package.json',
            'Add "packageManager": "pnpm@9.0.0" to package.json'
          );
        }
      } catch (error) {
        result.addError(`package.json is invalid: ${error.message}`);
        result.addDetail('package_json_valid', false);
      }
    }

    // Check pnpm-lock.yaml
    if (fs.existsSync(this.pnpmLockPath)) {
      result.addDetail('pnpm_lock_exists', true);
      const lockStats = fs.statSync(this.pnpmLockPath);
      result.addDetail('pnpm_lock_size', lockStats.size);
    } else {
      result.addWarning('pnpm-lock.yaml not found', 'Run: pnpm install');
      result.addDetail('pnpm_lock_exists', false);
    }

    return result;
  }

  /**
   * Validate package dependencies
   */
  validateDependencies() {
    const result = new ValidationResult();

    if (!fs.existsSync(this.packageJsonPath)) {
      result.addError('Cannot validate dependencies: package.json not found');
      return result;
    }

    try {
      const packageJson = JSON.parse(
        fs.readFileSync(this.packageJsonPath, 'utf8')
      );
      const dependencies = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      const installedDeps = [];
      const missingRequiredDeps = [];
      const missingDevDeps = [];

      // Check required dependencies
      for (const dep of REQUIRED_DEPENDENCIES) {
        if (dependencies[dep]) {
          installedDeps.push({
            name: dep,
            version: dependencies[dep],
            type: 'required',
          });
        } else {
          missingRequiredDeps.push(dep);
          result.addError(`Required dependency missing: ${dep}`);
        }
      }

      // Check required dev dependencies
      for (const dep of REQUIRED_DEV_DEPENDENCIES) {
        if (dependencies[dep]) {
          installedDeps.push({
            name: dep,
            version: dependencies[dep],
            type: 'dev',
          });
        } else {
          missingDevDeps.push(dep);
          result.addError(`Required dev dependency missing: ${dep}`);
        }
      }

      result.addDetail('installed_dependencies', installedDeps);
      result.addDetail('missing_required_dependencies', missingRequiredDeps);
      result.addDetail('missing_dev_dependencies', missingDevDeps);
      result.addDetail('total_dependencies', Object.keys(dependencies).length);

      // Check for node_modules
      const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
      if (fs.existsSync(nodeModulesPath)) {
        result.addDetail('node_modules_exists', true);
        const nodeModulesStats = fs.statSync(nodeModulesPath);
        result.addDetail(
          'node_modules_is_directory',
          nodeModulesStats.isDirectory()
        );
      } else {
        result.addWarning(
          'node_modules directory not found',
          'Run: pnpm install'
        );
        result.addDetail('node_modules_exists', false);
      }
    } catch (error) {
      result.addError(`Dependency validation failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Validate environment variables
   */
  validateEnvironmentVariables() {
    const result = new ValidationResult();
    const envVarStatus = {};

    // Load environment variables from .env files
    const envFiles = ['.env.local', '.env.development', '.env'];
    let loadedEnvVars = { ...process.env };

    for (const envFile of envFiles) {
      const envPath = path.join(this.projectRoot, envFile);
      if (fs.existsSync(envPath)) {
        try {
          const envContent = fs.readFileSync(envPath, 'utf8');
          const envLines = envContent.split('\n');
          for (const line of envLines) {
            const trimmedLine = line.trim();
            if (trimmedLine && !trimmedLine.startsWith('#')) {
              const [key, ...valueParts] = trimmedLine.split('=');
              if (key && valueParts.length > 0) {
                loadedEnvVars[key.trim()] = valueParts.join('=').trim();
              }
            }
          }
        } catch (error) {
          result.addWarning(`Could not read ${envFile}: ${error.message}`);
        }
      }
    }

    // Check required environment variables
    for (const envVar of REQUIRED_ENV_VARS) {
      if (loadedEnvVars[envVar]) {
        envVarStatus[envVar] = 'set';
      } else {
        envVarStatus[envVar] = 'missing';
        result.addError(
          `Required environment variable '${envVar}' not set`,
          `Set ${envVar} in your .env.local file`
        );
      }
    }

    // Check optional environment variables
    for (const envVar of OPTIONAL_ENV_VARS) {
      if (loadedEnvVars[envVar]) {
        envVarStatus[envVar] = 'set';
      } else {
        envVarStatus[envVar] = 'missing';
        result.addWarning(`Optional environment variable '${envVar}' not set`);
      }
    }

    result.addDetail('environment_variables', envVarStatus);
    result.addDetail(
      'loaded_env_files',
      envFiles.filter((f) => fs.existsSync(path.join(this.projectRoot, f)))
    );

    return result;
  }

  /**
   * Validate build and development tools
   */
  validateBuildTools() {
    const result = new ValidationResult();

    try {
      // Check TypeScript
      const tscVersion = execSync('npx tsc --version', {
        encoding: 'utf8',
      }).trim();
      result.addDetail('typescript_version', tscVersion);
      result.addDetail('typescript_available', true);
    } catch (error) {
      result.addWarning('TypeScript not available via npx');
      result.addDetail('typescript_available', false);
    }

    try {
      // Check Next.js
      const nextVersion = execSync('npx next --version', {
        encoding: 'utf8',
      }).trim();
      result.addDetail('nextjs_version', nextVersion);
      result.addDetail('nextjs_available', true);
    } catch (error) {
      result.addError('Next.js not available via npx');
      result.addDetail('nextjs_available', false);
    }

    try {
      // Check ESLint
      const eslintVersion = execSync('npx eslint --version', {
        encoding: 'utf8',
      }).trim();
      result.addDetail('eslint_version', eslintVersion);
      result.addDetail('eslint_available', true);
    } catch (error) {
      result.addWarning('ESLint not available via npx');
      result.addDetail('eslint_available', false);
    }

    try {
      // Check Prettier
      const prettierVersion = execSync('npx prettier --version', {
        encoding: 'utf8',
      }).trim();
      result.addDetail('prettier_version', prettierVersion);
      result.addDetail('prettier_available', true);
    } catch (error) {
      result.addWarning('Prettier not available via npx');
      result.addDetail('prettier_available', false);
    }

    return result;
  }

  /**
   * Run comprehensive validation
   */
  runComprehensiveValidation() {
    const results = {};

    console.log('🔍 Running Frontend Environment Validation...\n');

    results.nodeEnvironment = this.validateNodeEnvironment();
    results.pnpmInstallation = this.validatePnpmInstallation();
    results.projectFiles = this.validateProjectFiles();
    results.dependencies = this.validateDependencies();
    results.environmentVariables = this.validateEnvironmentVariables();
    results.buildTools = this.validateBuildTools();

    return results;
  }

  /**
   * Generate setup instructions
   */
  generateSetupInstructions(results) {
    const instructions = [];
    instructions.push(
      '# Medical Device Regulatory Assistant - Frontend Setup Instructions\n'
    );

    // Collect all errors and recommendations
    const allErrors = [];
    const allRecommendations = [];

    for (const [checkName, result] of Object.entries(results)) {
      allErrors.push(...result.errors);
      allRecommendations.push(...result.recommendations);
    }

    if (allErrors.length > 0) {
      instructions.push('## Critical Issues (Must Fix)');
      allErrors.forEach((error, i) => {
        instructions.push(`${i + 1}. ❌ ${error}`);
      });
      instructions.push('');
    }

    if (allRecommendations.length > 0) {
      instructions.push('## Recommended Actions');
      // Remove duplicates
      const uniqueRecommendations = [...new Set(allRecommendations)];
      uniqueRecommendations.forEach((rec, i) => {
        instructions.push(`${i + 1}. 🔧 ${rec}`);
      });
      instructions.push('');
    }

    // Add general setup instructions
    instructions.push('## General Frontend Setup Steps');
    instructions.push('1. Ensure Node.js 18.0.0+ is installed');
    instructions.push('2. Install pnpm: `npm install -g pnpm`');
    instructions.push(
      '3. Navigate to project directory: `cd medical-device-regulatory-assistant`'
    );
    instructions.push('4. Install dependencies: `pnpm install`');
    instructions.push(
      '5. Copy .env.example to .env.local and configure variables'
    );
    instructions.push('6. Run type checking: `pnpm type-check`');
    instructions.push('7. Run tests: `pnpm test`');
    instructions.push('8. Start development server: `pnpm dev`');
    instructions.push('');

    instructions.push('## Verification');
    instructions.push(
      'Run the frontend environment validator again to confirm all issues are resolved:'
    );
    instructions.push('```bash');
    instructions.push('node scripts/validate-frontend-environment.js');
    instructions.push('```');

    return instructions.join('\n');
  }

  /**
   * Print validation summary
   */
  printValidationSummary(results) {
    console.log('='.repeat(60));
    console.log('MEDICAL DEVICE REGULATORY ASSISTANT - FRONTEND VALIDATION');
    console.log('='.repeat(60));

    const overallValid = Object.values(results).every(
      (result) => result.isValid
    );
    const statusIcon = overallValid ? '✅' : '❌';
    console.log(
      `\nOverall Status: ${statusIcon} ${overallValid ? 'VALID' : 'ISSUES FOUND'}`
    );

    for (const [checkName, result] of Object.entries(results)) {
      const displayName = checkName.replace(/([A-Z])/g, ' $1').toLowerCase();
      console.log(
        `\n${displayName.charAt(0).toUpperCase() + displayName.slice(1)}:`
      );
      console.log(
        `  Status: ${result.isValid ? '✅ Valid' : '❌ Issues Found'}`
      );

      if (result.errors.length > 0) {
        console.log('  Errors:');
        result.errors.forEach((error) => {
          console.log(`    ❌ ${error}`);
        });
      }

      if (result.warnings.length > 0) {
        console.log('  Warnings:');
        result.warnings.forEach((warning) => {
          console.log(`    ⚠️  ${warning}`);
        });
      }

      if (result.recommendations.length > 0) {
        console.log('  Recommendations:');
        result.recommendations.forEach((rec) => {
          console.log(`    🔧 ${rec}`);
        });
      }
    }

    console.log('\n' + '='.repeat(60));

    return overallValid;
  }

  /**
   * Compare version strings
   */
  compareVersions(version1, version2) {
    const v1parts = version1.split('.').map(Number);
    const v2parts = version2.split('.').map(Number);

    for (let i = 0; i < Math.max(v1parts.length, v2parts.length); i++) {
      const v1part = v1parts[i] || 0;
      const v2part = v2parts[i] || 0;

      if (v1part < v2part) return -1;
      if (v1part > v2part) return 1;
    }

    return 0;
  }
}

/**
 * Main execution function
 */
function main() {
  const validator = new FrontendEnvironmentValidator();
  const results = validator.runComprehensiveValidation();
  const isValid = validator.printValidationSummary(results);

  if (!isValid) {
    console.log('\n📋 Setup Instructions:');
    console.log(
      'Run with --instructions flag to see detailed setup instructions'
    );

    if (process.argv.includes('--instructions')) {
      console.log('\n' + validator.generateSetupInstructions(results));
    }
  }

  process.exit(isValid ? 0 : 1);
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { FrontendEnvironmentValidator, ValidationResult };
