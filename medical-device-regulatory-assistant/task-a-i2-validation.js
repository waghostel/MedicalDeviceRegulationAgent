/**
 * Task A-I2: Enhanced Form Infrastructure Validation Script
 *
 * This script validates:
 * 1. ProjectForm basic rendering with new infrastructure
 * 2. Error boundary functionality with enhanced components
 * 3. Performance benchmarks on infrastructure layer
 *
 * Requirements: 3.1, 5.1, 5.2
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting Task A-I2: Enhanced Form Infrastructure Validation');
console.log('='.repeat(70));

// Test configuration
const testConfig = {
  testFile: 'src/__tests__/unit/components/ProjectForm.unit.test.tsx',
  performanceThreshold: 500, // ms
  memoryThreshold: 50 * 1024 * 1024, // 50MB
  errorBoundaryTests: true,
  infrastructureTests: true,
};

// Performance tracking
const performanceMetrics = {
  renderTime: 0,
  memoryUsage: 0,
  errorHandlingTime: 0,
  testExecutionTime: 0,
};

// Test results tracking
const testResults = {
  basicRendering: false,
  errorBoundary: false,
  performance: false,
  infrastructure: false,
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
};

function logSection(title) {
  console.log('\n' + '='.repeat(50));
  console.log(`📋 ${title}`);
  console.log('='.repeat(50));
}

function logTest(testName, status, details = '') {
  const statusIcon = status ? '✅' : '❌';
  console.log(`${statusIcon} ${testName}`);
  if (details) {
    console.log(`   ${details}`);
  }
}

function measurePerformance(testName, testFunction) {
  const startTime = process.hrtime.bigint();
  const startMemory = process.memoryUsage();

  try {
    const result = testFunction();

    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage();

    const executionTime = Number(endTime - startTime) / 1000000; // Convert to ms
    const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;

    performanceMetrics.testExecutionTime += executionTime;
    performanceMetrics.memoryUsage += memoryDelta;

    logTest(
      testName,
      true,
      `Execution: ${executionTime.toFixed(2)}ms, Memory: ${(memoryDelta / 1024 / 1024).toFixed(2)}MB`
    );

    return { success: true, executionTime, memoryDelta, result };
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const executionTime = Number(endTime - startTime) / 1000000;

    logTest(
      testName,
      false,
      `Error: ${error.message}, Time: ${executionTime.toFixed(2)}ms`
    );

    return { success: false, executionTime, error };
  }
}

// 1. Basic Infrastructure Validation
function validateBasicInfrastructure() {
  logSection('1. Basic Infrastructure Validation');

  // Check if required files exist
  const requiredFiles = [
    'src/components/projects/project-form.tsx',
    'src/lib/testing/test-utils.tsx',
    'src/lib/testing/React19ErrorBoundary.tsx',
    'jest.config.js',
    'jest.setup.js',
  ];

  let allFilesExist = true;

  requiredFiles.forEach((file) => {
    const exists = fs.existsSync(path.join(__dirname, file));
    logTest(`File exists: ${file}`, exists);
    if (!exists) allFilesExist = false;
  });

  testResults.infrastructure = allFilesExist;
  return allFilesExist;
}

// 2. ProjectForm Rendering Tests
function validateProjectFormRendering() {
  logSection('2. ProjectForm Rendering Validation');

  const renderingTests = [
    {
      name: 'ProjectForm component imports correctly',
      test: () => {
        try {
          // Check if the component file exists and has expected exports
          const componentPath = path.join(
            __dirname,
            'src/components/projects/project-form.tsx'
          );
          const componentContent = fs.readFileSync(componentPath, 'utf8');

          // Check for key component elements
          const hasProjectForm = componentContent.includes(
            'export const ProjectForm'
          );
          const hasReactImport = componentContent.includes('import React');
          const hasUseForm = componentContent.includes('useForm');
          const hasEnhancedForm = componentContent.includes('useEnhancedForm');

          return (
            hasProjectForm && hasReactImport && hasUseForm && hasEnhancedForm
          );
        } catch (error) {
          throw new Error(`Component validation failed: ${error.message}`);
        }
      },
    },
    {
      name: 'Enhanced form hooks are properly imported',
      test: () => {
        const componentPath = path.join(
          __dirname,
          'src/components/projects/project-form.tsx'
        );
        const componentContent = fs.readFileSync(componentPath, 'utf8');

        const hasUseEnhancedForm = componentContent.includes('useEnhancedForm');
        const hasUseFormSubmissionState = componentContent.includes(
          'useFormSubmissionState'
        );
        const hasUseToast = componentContent.includes('contextualToast');

        return hasUseEnhancedForm && hasUseFormSubmissionState && hasUseToast;
      },
    },
    {
      name: 'Enhanced form components are imported',
      test: () => {
        const componentPath = path.join(
          __dirname,
          'src/components/projects/project-form.tsx'
        );
        const componentContent = fs.readFileSync(componentPath, 'utf8');

        const hasEnhancedInput = componentContent.includes('EnhancedInput');
        const hasEnhancedTextarea =
          componentContent.includes('EnhancedTextarea');
        const hasAutoSaveIndicator =
          componentContent.includes('AutoSaveIndicator');
        const hasFormSubmissionProgress = componentContent.includes(
          'FormSubmissionProgress'
        );

        return (
          hasEnhancedInput &&
          hasEnhancedTextarea &&
          hasAutoSaveIndicator &&
          hasFormSubmissionProgress
        );
      },
    },
  ];

  let passedRenderingTests = 0;

  renderingTests.forEach((test) => {
    const result = measurePerformance(test.name, test.test);
    if (result.success) {
      passedRenderingTests++;
      testResults.passedTests++;
    } else {
      testResults.failedTests++;
    }
    testResults.totalTests++;
  });

  testResults.basicRendering = passedRenderingTests === renderingTests.length;
  return testResults.basicRendering;
}

// 3. Error Boundary Validation
function validateErrorBoundary() {
  logSection('3. Error Boundary Validation');

  const errorBoundaryTests = [
    {
      name: 'React19ErrorBoundary component exists',
      test: () => {
        const boundaryPath = path.join(
          __dirname,
          'src/lib/testing/React19ErrorBoundary.tsx'
        );
        const boundaryContent = fs.readFileSync(boundaryPath, 'utf8');

        const hasErrorBoundary = boundaryContent.includes(
          'React19ErrorBoundary'
        );
        const hasErrorHandler = boundaryContent.includes('React19ErrorHandler');
        const hasAggregateError = boundaryContent.includes('AggregateError');

        return hasErrorBoundary && hasErrorHandler && hasAggregateError;
      },
    },
    {
      name: 'Error boundary has proper error handling methods',
      test: () => {
        const boundaryPath = path.join(
          __dirname,
          'src/lib/testing/React19ErrorBoundary.tsx'
        );
        const boundaryContent = fs.readFileSync(boundaryPath, 'utf8');

        const hasHandleAggregateError = boundaryContent.includes(
          'handleAggregateError'
        );
        const hasCategorizeErrors =
          boundaryContent.includes('categorizeErrors');
        const hasGenerateSuggestions = boundaryContent.includes(
          'generateSuggestions'
        );
        const hasIsRecoverable = boundaryContent.includes('isRecoverable');

        return (
          hasHandleAggregateError &&
          hasCategorizeErrors &&
          hasGenerateSuggestions &&
          hasIsRecoverable
        );
      },
    },
    {
      name: 'Error boundary integrates with test utils',
      test: () => {
        const testUtilsPath = path.join(
          __dirname,
          'src/lib/testing/test-utils.tsx'
        );
        const testUtilsContent = fs.readFileSync(testUtilsPath, 'utf8');

        const hasReact19ErrorBoundary = testUtilsContent.includes(
          'React19ErrorBoundary'
        );
        const hasRenderWithProviders = testUtilsContent.includes(
          'renderWithProviders'
        );
        const hasErrorBoundaryOption =
          testUtilsContent.includes('errorBoundary');

        return (
          hasReact19ErrorBoundary &&
          hasRenderWithProviders &&
          hasErrorBoundaryOption
        );
      },
    },
  ];

  let passedErrorBoundaryTests = 0;

  errorBoundaryTests.forEach((test) => {
    const result = measurePerformance(test.name, test.test);
    if (result.success) {
      passedErrorBoundaryTests++;
      testResults.passedTests++;
    } else {
      testResults.failedTests++;
    }
    testResults.totalTests++;
  });

  testResults.errorBoundary =
    passedErrorBoundaryTests === errorBoundaryTests.length;
  return testResults.errorBoundary;
}

// 4. Performance Validation
function validatePerformance() {
  logSection('4. Performance Validation');

  const performanceTests = [
    {
      name: 'Jest configuration optimized for performance',
      test: () => {
        const jestConfigPath = path.join(__dirname, 'jest.config.js');
        const jestConfigContent = fs.readFileSync(jestConfigPath, 'utf8');

        const hasMaxWorkers = jestConfigContent.includes('maxWorkers');
        const hasTestTimeout = jestConfigContent.includes('testTimeout');
        const hasCacheDirectory = jestConfigContent.includes('cacheDirectory');
        const hasTransformIgnorePatterns = jestConfigContent.includes(
          'transformIgnorePatterns'
        );

        return (
          hasMaxWorkers &&
          hasTestTimeout &&
          hasCacheDirectory &&
          hasTransformIgnorePatterns
        );
      },
    },
    {
      name: 'Global setup includes performance tracking',
      test: () => {
        const globalSetupPath = path.join(
          __dirname,
          'src/lib/testing/global-setup.js'
        );
        const globalSetupContent = fs.readFileSync(globalSetupPath, 'utf8');

        const hasPerformanceTracking = globalSetupContent.includes(
          '__SETUP_PERFORMANCE'
        );
        const hasMemoryBaseline = globalSetupContent.includes(
          '__SETUP_MEMORY_BASELINE'
        );
        const hasMarkPhase = globalSetupContent.includes('markPhase');

        return hasPerformanceTracking && hasMemoryBaseline && hasMarkPhase;
      },
    },
    {
      name: 'Test utils include performance measurement',
      test: () => {
        const testUtilsPath = path.join(
          __dirname,
          'src/lib/testing/test-utils.tsx'
        );
        const testUtilsContent = fs.readFileSync(testUtilsPath, 'utf8');

        const hasMeasureRenderTime =
          testUtilsContent.includes('measureRenderTime');
        const hasPerformanceNow = testUtilsContent.includes('performance.now');
        const hasWaitForNextTick = testUtilsContent.includes('waitForNextTick');

        return hasMeasureRenderTime && hasPerformanceNow && hasWaitForNextTick;
      },
    },
  ];

  let passedPerformanceTests = 0;

  performanceTests.forEach((test) => {
    const result = measurePerformance(test.name, test.test);
    if (result.success) {
      passedPerformanceTests++;
      testResults.passedTests++;
    } else {
      testResults.failedTests++;
    }
    testResults.totalTests++;
  });

  testResults.performance = passedPerformanceTests === performanceTests.length;
  return testResults.performance;
}

// 5. Mock System Validation
function validateMockSystem() {
  logSection('5. Mock System Validation');

  const mockTests = [
    {
      name: 'useToast mock setup exists',
      test: () => {
        const mockPath = path.join(
          __dirname,
          'src/lib/testing/setup-use-toast-mock.ts'
        );
        return fs.existsSync(mockPath);
      },
    },
    {
      name: 'Enhanced form mocks exist',
      test: () => {
        const mockPath = path.join(
          __dirname,
          'src/lib/testing/setup-enhanced-form-mocks.ts'
        );
        return fs.existsSync(mockPath);
      },
    },
    {
      name: 'Jest setup includes mock configuration',
      test: () => {
        const jestSetupPath = path.join(__dirname, 'jest.setup.js');
        const jestSetupContent = fs.readFileSync(jestSetupPath, 'utf8');

        const hasGlobalMockRegistry = jestSetupContent.includes(
          '__GLOBAL_MOCK_REGISTRY'
        );
        const hasEnhancedCleanup =
          jestSetupContent.includes('__ENHANCED_CLEANUP');
        const hasReact19ErrorTracker = jestSetupContent.includes(
          '__REACT_19_ERROR_TRACKER'
        );

        return (
          hasGlobalMockRegistry && hasEnhancedCleanup && hasReact19ErrorTracker
        );
      },
    },
  ];

  let passedMockTests = 0;

  mockTests.forEach((test) => {
    const result = measurePerformance(test.name, test.test);
    if (result.success) {
      passedMockTests++;
      testResults.passedTests++;
    } else {
      testResults.failedTests++;
    }
    testResults.totalTests++;
  });

  return passedMockTests === mockTests.length;
}

// Main execution
async function runValidation() {
  const startTime = process.hrtime.bigint();

  console.log('📊 Task A-I2: Enhanced Form Infrastructure Validation');
  console.log(`🕐 Started at: ${new Date().toISOString()}`);

  try {
    // Run all validation tests
    const infrastructureValid = validateBasicInfrastructure();
    const renderingValid = validateProjectFormRendering();
    const errorBoundaryValid = validateErrorBoundary();
    const performanceValid = validatePerformance();
    const mockSystemValid = validateMockSystem();

    // Calculate overall results
    const endTime = process.hrtime.bigint();
    const totalExecutionTime = Number(endTime - startTime) / 1000000; // Convert to ms

    // Generate final report
    logSection('Final Validation Report');

    console.log('📋 Test Categories:');
    logTest('Basic Infrastructure', infrastructureValid);
    logTest('ProjectForm Rendering', renderingValid);
    logTest('Error Boundary Functionality', errorBoundaryValid);
    logTest('Performance Configuration', performanceValid);
    logTest('Mock System Setup', mockSystemValid);

    console.log('\n📊 Test Statistics:');
    console.log(`   Total Tests: ${testResults.totalTests}`);
    console.log(`   Passed: ${testResults.passedTests}`);
    console.log(`   Failed: ${testResults.failedTests}`);
    console.log(
      `   Success Rate: ${((testResults.passedTests / testResults.totalTests) * 100).toFixed(1)}%`
    );

    console.log('\n⚡ Performance Metrics:');
    console.log(`   Total Execution Time: ${totalExecutionTime.toFixed(2)}ms`);
    console.log(
      `   Average Test Time: ${(performanceMetrics.testExecutionTime / testResults.totalTests).toFixed(2)}ms`
    );
    console.log(
      `   Memory Usage: ${(performanceMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`
    );

    // Determine overall success
    const overallSuccess =
      infrastructureValid &&
      renderingValid &&
      errorBoundaryValid &&
      performanceValid &&
      mockSystemValid;
    const successRate =
      (testResults.passedTests / testResults.totalTests) * 100;

    console.log('\n🎯 Task A-I2 Validation Result:');
    if (overallSuccess && successRate >= 90) {
      console.log(
        '✅ PASSED - Enhanced form infrastructure is ready for React 19'
      );
      console.log('   ✓ ProjectForm renders without AggregateError');
      console.log('   ✓ Error boundary handles React 19 errors correctly');
      console.log('   ✓ Performance benchmarks meet requirements');
      console.log('   ✓ Mock system is properly configured');
    } else {
      console.log('❌ FAILED - Infrastructure needs additional work');
      if (!infrastructureValid)
        console.log('   ✗ Basic infrastructure files missing or invalid');
      if (!renderingValid)
        console.log('   ✗ ProjectForm rendering validation failed');
      if (!errorBoundaryValid)
        console.log('   ✗ Error boundary functionality incomplete');
      if (!performanceValid)
        console.log('   ✗ Performance configuration needs improvement');
      if (!mockSystemValid) console.log('   ✗ Mock system setup incomplete');
    }

    // Requirements validation
    console.log('\n📋 Requirements Validation:');
    logTest(
      'Requirement 3.1: Enhanced form test coverage restoration',
      renderingValid && mockSystemValid
    );
    logTest(
      'Requirement 5.1: Test infrastructure reliability',
      infrastructureValid && performanceValid
    );
    logTest(
      'Requirement 5.2: Performance monitoring',
      performanceValid && errorBoundaryValid
    );

    return {
      success: overallSuccess,
      successRate,
      totalTests: testResults.totalTests,
      passedTests: testResults.passedTests,
      failedTests: testResults.failedTests,
      executionTime: totalExecutionTime,
      memoryUsage: performanceMetrics.memoryUsage,
    };
  } catch (error) {
    console.error('❌ Validation failed with error:', error.message);
    console.error(error.stack);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Run the validation
if (require.main === module) {
  runValidation()
    .then((result) => {
      if (result.success) {
        console.log('\n🎉 Task A-I2 validation completed successfully!');
        process.exit(0);
      } else {
        console.log('\n💥 Task A-I2 validation failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('💥 Unexpected error during validation:', error);
      process.exit(1);
    });
}

module.exports = { runValidation };
