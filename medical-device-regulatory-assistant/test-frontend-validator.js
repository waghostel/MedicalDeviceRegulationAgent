#!/usr/bin/env node

/**
 * Test script for the Frontend Environment Validator.
 * 
 * This script tests the FrontendEnvironmentValidator to ensure it works correctly
 * and provides useful feedback about the frontend development environment.
 */

const path = require('path');
const { FrontendEnvironmentValidator } = require('./scripts/validate-frontend-environment.js');

function testFrontendValidator() {
    console.log('='.repeat(60));
    console.log('TESTING FRONTEND ENVIRONMENT VALIDATOR');
    console.log('='.repeat(60));
    
    // Create validator instance
    const validator = new FrontendEnvironmentValidator();
    console.log('✅ Created FrontendEnvironmentValidator instance');
    
    // Test individual validation methods
    console.log('\n1. Testing Node Environment Validation...');
    const nodeResult = validator.validateNodeEnvironment();
    console.log(`   Result: ${nodeResult.isValid ? '✅ Valid' : '❌ Issues Found'}`);
    console.log(`   Errors: ${nodeResult.errors.length}`);
    console.log(`   Warnings: ${nodeResult.warnings.length}`);
    console.log(`   Node version: ${nodeResult.details.node_version}`);
    
    console.log('\n2. Testing pnpm Installation Validation...');
    const pnpmResult = validator.validatePnpmInstallation();
    console.log(`   Result: ${pnpmResult.isValid ? '✅ Valid' : '❌ Issues Found'}`);
    console.log(`   pnpm available: ${pnpmResult.details.pnpm_available}`);
    if (pnpmResult.details.pnpm_version) {
        console.log(`   pnpm version: ${pnpmResult.details.pnpm_version}`);
    }
    
    console.log('\n3. Testing Project Files Validation...');
    const filesResult = validator.validateProjectFiles();
    console.log(`   Result: ${filesResult.isValid ? '✅ Valid' : '❌ Issues Found'}`);
    console.log(`   Required files found: ${filesResult.details.existing_required_files?.length || 0}`);
    console.log(`   Required files missing: ${filesResult.details.missing_required_files?.length || 0}`);
    console.log(`   Package.json valid: ${filesResult.details.package_json_valid}`);
    console.log(`   pnpm-lock exists: ${filesResult.details.pnpm_lock_exists}`);
    
    console.log('\n4. Testing Dependencies Validation...');
    const depsResult = validator.validateDependencies();
    console.log(`   Result: ${depsResult.isValid ? '✅ Valid' : '❌ Issues Found'}`);
    console.log(`   Installed dependencies: ${depsResult.details.installed_dependencies?.length || 0}`);
    console.log(`   Missing required: ${depsResult.details.missing_required_dependencies?.length || 0}`);
    console.log(`   Missing dev: ${depsResult.details.missing_dev_dependencies?.length || 0}`);
    console.log(`   node_modules exists: ${depsResult.details.node_modules_exists}`);
    
    console.log('\n5. Testing Environment Variables Validation...');
    const envResult = validator.validateEnvironmentVariables();
    console.log(`   Result: ${envResult.isValid ? '✅ Valid' : '❌ Issues Found'}`);
    const envVars = envResult.details.environment_variables || {};
    const setVars = Object.values(envVars).filter(v => v === 'set').length;
    console.log(`   Environment variables set: ${setVars}/${Object.keys(envVars).length}`);
    
    console.log('\n6. Testing Build Tools Validation...');
    const buildResult = validator.validateBuildTools();
    console.log(`   Result: ${buildResult.isValid ? '✅ Valid' : '❌ Issues Found'}`);
    console.log(`   TypeScript available: ${buildResult.details.typescript_available}`);
    console.log(`   Next.js available: ${buildResult.details.nextjs_available}`);
    console.log(`   ESLint available: ${buildResult.details.eslint_available}`);
    console.log(`   Prettier available: ${buildResult.details.prettier_available}`);
    
    console.log('\n7. Testing Comprehensive Validation...');
    const allResults = validator.runComprehensiveValidation();
    const overallValid = Object.values(allResults).every(result => result.isValid);
    console.log(`   Overall Result: ${overallValid ? '✅ All Valid' : '❌ Issues Found'}`);
    
    console.log('\n8. Testing Setup Instructions Generation...');
    const instructions = validator.generateSetupInstructions(allResults);
    console.log(`   Generated instructions: ${instructions.length} characters`);
    console.log('   Sample instructions:');
    console.log('   ' + instructions.split('\n').slice(0, 5).join('\n   '));
    
    console.log('\n9. Testing Validation Summary Display...');
    const summaryResult = validator.printValidationSummary(allResults);
    
    return overallValid;
}

function main() {
    console.log('Medical Device Regulatory Assistant - Frontend Environment Validator Test');
    console.log(`Node.js version: ${process.version}`);
    console.log(`Working directory: ${process.cwd()}`);
    console.log(`Project root: ${path.resolve(__dirname)}`);
    
    // Test the validator
    const validatorResult = testFrontendValidator();
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`Frontend Validator Test: ${validatorResult ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Overall Test Result: ${validatorResult ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    
    return validatorResult;
}

if (require.main === module) {
    const success = main();
    process.exit(success ? 0 : 1);
}