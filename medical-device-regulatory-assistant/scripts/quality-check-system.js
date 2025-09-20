#!/usr/bin/env node

/**
 * Automated Quality Check System
 *
 * Comprehensive quality validation system that runs code quality checks,
 * test coverage analysis, performance validation, and detects common
 * error patterns and anti-patterns.
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync, spawn } = require('child_process');
const glob = require('glob');

const COLORS = {
  GREEN: '\x1b[32m',
  RED: '\x1b[31m',
  YELLOW: '\x1b[33m',
  BLUE: '\x1b[34m',
  MAGENTA: '\x1b[35m',
  CYAN: '\x1b[36m',
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
};

/**
 * Quality metrics and thresholds
 */
const QUALITY_THRESHOLDS = {
  coverage: {
    statements: 85,
    branches: 80,
    functions: 85,
    lines: 85,
  },
  performance: {
    maxTestExecutionTime: 30000, // 30 seconds
    maxMemoryUsage: 100, // MB
    maxBundleSize: 500, // KB
    maxLighthouseScore: 90,
  },
  codeQuality: {
    maxComplexity: 10,
    maxLinesPerFunction: 50,
    maxParametersPerFunction: 5,
    maxNestingDepth: 4,
  },
  errorPatterns: {
    maxConsoleStatements: 5,
    maxTodoComments: 10,
    maxFixmeComments: 5,
  },
};

/**
 * Anti-patterns to detect
 */
const ANTI_PATTERNS = [
  {
    name: 'Console statements in production code',
    pattern: /console\.(log|warn|error|info|debug)/g,
    severity: 'warning',
    files: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.js', 'src/**/*.jsx'],
    exclude: ['**/*.test.*', '**/*.spec.*', '**/test-utils.*'],
  },
  {
    name: 'TODO comments',
    pattern: /\/\/\s*TODO|\/\*\s*TODO|\#\s*TODO/gi,
    severity: 'info',
    files: ['src/**/*', 'backend/**/*'],
    exclude: ['**/node_modules/**', '**/coverage/**'],
  },
  {
    name: 'FIXME comments',
    pattern: /\/\/\s*FIXME|\/\*\s*FIXME|\#\s*FIXME/gi,
    severity: 'warning',
    files: ['src/**/*', 'backend/**/*'],
    exclude: ['**/node_modules/**', '**/coverage/**'],
  },
  {
    name: 'Hardcoded API URLs',
    pattern: /https?:\/\/[^\s"'`]+/g,
    severity: 'warning',
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    exclude: ['**/*.test.*', '**/*.spec.*', '**/constants.*', '**/config.*'],
  },
  {
    name: 'Missing error handling in async functions',
    pattern: /async\s+function[^{]*{[^}]*(?!try|catch)[^}]*}/g,
    severity: 'warning',
    files: ['src/**/*.ts', 'src/**/*.tsx', 'backend/**/*.py'],
    exclude: ['**/*.test.*', '**/*.spec.*'],
  },
  {
    name: 'Direct DOM manipulation in React',
    pattern: /document\.(getElementById|querySelector|createElement)/g,
    severity: 'error',
    files: ['src/**/*.tsx', 'src/**/*.jsx'],
    exclude: ['**/*.test.*', '**/*.spec.*', '**/test-utils.*'],
  },
  {
    name: 'Unused imports',
    pattern: /^import\s+.*\s+from\s+['"][^'"]+['"];?\s*$/gm,
    severity: 'info',
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    exclude: ['**/*.test.*', '**/*.spec.*'],
  },
];

/**
 * Quality Check System
 */
class QualityCheckSystem {
  constructor() {
    this.projectRoot = process.cwd();
    this.results = {
      codeQuality: { passed: false, score: 0, issues: [] },
      testCoverage: { passed: false, coverage: {}, issues: [] },
      performance: { passed: false, metrics: {}, issues: [] },
      antiPatterns: { passed: false, patterns: [], issues: [] },
      security: { passed: false, vulnerabilities: [], issues: [] },
      dependencies: { passed: false, outdated: [], issues: [] },
    };
    this.startTime = Date.now();
  }

  log(message, color = COLORS.RESET) {
    console.log(`${color}${message}${COLORS.RESET}`);
  }

  logSection(title) {
    console.log('\n' + '='.repeat(70));
    this.log(`${COLORS.BOLD}${title}${COLORS.RESET}`, COLORS.BLUE);
    console.log('='.repeat(70));
  }

  async runCommand(command, cwd = this.projectRoot, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        const result = execSync(command, {
          encoding: 'utf8',
          cwd,
          stdio: options.silent ? 'pipe' : 'inherit',
          ...options,
        });
        resolve({ success: true, output: result.trim() });
      } catch (error) {
        resolve({
          success: false,
          output: error.stdout || error.stderr || error.message,
          code: error.status,
        });
      }
    });
  }

  /**
   * Check code quality using ESLint, Prettier, and TypeScript
   */
  async checkCodeQuality() {
    this.logSection('Code Quality Analysis');
    const issues = [];
    let score = 100;

    try {
      // TypeScript type checking
      this.log('Running TypeScript type checking...', COLORS.YELLOW);
      const tscResult = await this.runCommand(
        'pnpm type-check',
        this.projectRoot,
        { silent: true }
      );

      if (!tscResult.success) {
        issues.push({
          type: 'typescript',
          severity: 'error',
          message: 'TypeScript type checking failed',
          details: tscResult.output,
        });
        score -= 20;
      } else {
        this.log('✅ TypeScript type checking passed', COLORS.GREEN);
      }

      // ESLint checking
      this.log('Running ESLint analysis...', COLORS.YELLOW);
      const eslintResult = await this.runCommand(
        'pnpm lint',
        this.projectRoot,
        { silent: true }
      );

      if (!eslintResult.success) {
        const eslintIssues = this.parseESLintOutput(eslintResult.output);
        issues.push(...eslintIssues);
        score -= Math.min(30, eslintIssues.length * 2);
      } else {
        this.log('✅ ESLint analysis passed', COLORS.GREEN);
      }

      // Prettier formatting check
      this.log('Running Prettier format checking...', COLORS.YELLOW);
      const prettierResult = await this.runCommand(
        'pnpm format:check',
        this.projectRoot,
        { silent: true }
      );

      if (!prettierResult.success) {
        issues.push({
          type: 'formatting',
          severity: 'warning',
          message: 'Code formatting issues found',
          details: 'Run `pnpm format` to fix formatting issues',
        });
        score -= 10;
      } else {
        this.log('✅ Code formatting is consistent', COLORS.GREEN);
      }

      // Backend code quality (Python)
      await this.checkPythonCodeQuality(issues);
    } catch (error) {
      issues.push({
        type: 'system',
        severity: 'error',
        message: `Code quality check failed: ${error.message}`,
      });
      score = 0;
    }

    this.results.codeQuality = {
      passed: score >= 80,
      score: Math.max(0, score),
      issues,
    };

    this.log(
      `Code Quality Score: ${score}/100`,
      score >= 80 ? COLORS.GREEN : COLORS.RED
    );
    return this.results.codeQuality.passed;
  }

  /**
   * Check Python code quality
   */
  async checkPythonCodeQuality(issues) {
    const backendDir = path.join(this.projectRoot, 'backend');

    try {
      // Black formatting check
      this.log('Running Black formatting check...', COLORS.YELLOW);
      const blackResult = await this.runCommand(
        'poetry run black --check .',
        backendDir,
        { silent: true }
      );

      if (!blackResult.success) {
        issues.push({
          type: 'python-formatting',
          severity: 'warning',
          message: 'Python code formatting issues found',
          details: 'Run `poetry run black .` to fix formatting',
        });
      }

      // isort import sorting check
      this.log('Running isort import sorting check...', COLORS.YELLOW);
      const isortResult = await this.runCommand(
        'poetry run isort --check-only .',
        backendDir,
        { silent: true }
      );

      if (!isortResult.success) {
        issues.push({
          type: 'python-imports',
          severity: 'warning',
          message: 'Python import sorting issues found',
          details: 'Run `poetry run isort .` to fix import sorting',
        });
      }

      // Flake8 linting
      this.log('Running Flake8 linting...', COLORS.YELLOW);
      const flake8Result = await this.runCommand(
        'poetry run flake8 .',
        backendDir,
        { silent: true }
      );

      if (!flake8Result.success) {
        issues.push({
          type: 'python-linting',
          severity: 'warning',
          message: 'Python linting issues found',
          details: flake8Result.output,
        });
      }

      // MyPy type checking
      this.log('Running MyPy type checking...', COLORS.YELLOW);
      const mypyResult = await this.runCommand(
        'poetry run mypy .',
        backendDir,
        { silent: true }
      );

      if (!mypyResult.success) {
        issues.push({
          type: 'python-types',
          severity: 'error',
          message: 'Python type checking issues found',
          details: mypyResult.output,
        });
      }
    } catch (error) {
      this.log(
        `⚠️  Python code quality check skipped: ${error.message}`,
        COLORS.YELLOW
      );
    }
  }

  /**
   * Analyze test coverage
   */
  async analyzeTestCoverage() {
    this.logSection('Test Coverage Analysis');
    const issues = [];
    let coverage = {};

    try {
      // Frontend coverage
      this.log('Running frontend test coverage...', COLORS.YELLOW);
      const frontendResult = await this.runCommand(
        'pnpm test:coverage --silent',
        this.projectRoot,
        { silent: true }
      );

      if (frontendResult.success) {
        coverage.frontend = await this.parseFrontendCoverage();
        this.validateCoverageThresholds(coverage.frontend, 'frontend', issues);
      } else {
        issues.push({
          type: 'frontend-coverage',
          severity: 'error',
          message: 'Frontend test coverage analysis failed',
          details: frontendResult.output,
        });
      }

      // Backend coverage
      this.log('Running backend test coverage...', COLORS.YELLOW);
      const backendDir = path.join(this.projectRoot, 'backend');
      const backendResult = await this.runCommand(
        'poetry run python -m pytest tests/ --cov=backend --cov-report=json --cov-report=html -q',
        backendDir,
        { silent: true }
      );

      if (backendResult.success) {
        coverage.backend = await this.parseBackendCoverage();
        this.validateCoverageThresholds(coverage.backend, 'backend', issues);
      } else {
        issues.push({
          type: 'backend-coverage',
          severity: 'error',
          message: 'Backend test coverage analysis failed',
          details: backendResult.output,
        });
      }
    } catch (error) {
      issues.push({
        type: 'system',
        severity: 'error',
        message: `Coverage analysis failed: ${error.message}`,
      });
    }

    const overallPassed =
      issues.filter((i) => i.severity === 'error').length === 0;

    this.results.testCoverage = {
      passed: overallPassed,
      coverage,
      issues,
    };

    this.log(
      `Test Coverage Analysis: ${overallPassed ? 'PASSED' : 'FAILED'}`,
      overallPassed ? COLORS.GREEN : COLORS.RED
    );

    return overallPassed;
  }

  /**
   * Validate coverage against thresholds
   */
  validateCoverageThresholds(coverage, type, issues) {
    const thresholds = QUALITY_THRESHOLDS.coverage;

    Object.entries(thresholds).forEach(([metric, threshold]) => {
      if (coverage[metric] !== undefined && coverage[metric] < threshold) {
        issues.push({
          type: `${type}-coverage-${metric}`,
          severity: 'warning',
          message: `${type} ${metric} coverage below threshold`,
          details: `${coverage[metric]}% < ${threshold}%`,
        });
      }
    });
  }

  /**
   * Parse frontend coverage report
   */
  async parseFrontendCoverage() {
    try {
      const coveragePath = path.join(
        this.projectRoot,
        'coverage',
        'coverage-summary.json'
      );
      const coverageData = JSON.parse(await fs.readFile(coveragePath, 'utf8'));

      return {
        statements: coverageData.total.statements.pct,
        branches: coverageData.total.branches.pct,
        functions: coverageData.total.functions.pct,
        lines: coverageData.total.lines.pct,
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * Parse backend coverage report
   */
  async parseBackendCoverage() {
    try {
      const coveragePath = path.join(
        this.projectRoot,
        'backend',
        'coverage.json'
      );
      const coverageData = JSON.parse(await fs.readFile(coveragePath, 'utf8'));

      return {
        statements: coverageData.totals.percent_covered,
        branches: coverageData.totals.percent_covered_display || 0,
        functions: coverageData.totals.percent_covered,
        lines: coverageData.totals.percent_covered,
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * Detect anti-patterns and common errors
   */
  async detectAntiPatterns() {
    this.logSection('Anti-Pattern Detection');
    const detectedPatterns = [];
    const issues = [];

    for (const antiPattern of ANTI_PATTERNS) {
      this.log(`Checking for: ${antiPattern.name}...`, COLORS.YELLOW);

      try {
        const matches = await this.findPatternInFiles(antiPattern);

        if (matches.length > 0) {
          detectedPatterns.push({
            name: antiPattern.name,
            severity: antiPattern.severity,
            matches: matches.length,
            files: matches,
          });

          issues.push({
            type: 'anti-pattern',
            severity: antiPattern.severity,
            message: `${antiPattern.name} detected`,
            details: `Found ${matches.length} occurrences`,
          });

          this.log(`  ⚠️  Found ${matches.length} occurrences`, COLORS.YELLOW);
        } else {
          this.log(`  ✅ No issues found`, COLORS.GREEN);
        }
      } catch (error) {
        this.log(`  ❌ Error checking pattern: ${error.message}`, COLORS.RED);
      }
    }

    const passed = issues.filter((i) => i.severity === 'error').length === 0;

    this.results.antiPatterns = {
      passed,
      patterns: detectedPatterns,
      issues,
    };

    return passed;
  }

  /**
   * Find pattern occurrences in files
   */
  async findPatternInFiles(antiPattern) {
    const matches = [];

    for (const filePattern of antiPattern.files) {
      const files = glob.sync(filePattern, {
        cwd: this.projectRoot,
        ignore: antiPattern.exclude || [],
      });

      for (const file of files) {
        try {
          const filePath = path.join(this.projectRoot, file);
          const content = await fs.readFile(filePath, 'utf8');
          const patternMatches = content.match(antiPattern.pattern);

          if (patternMatches) {
            matches.push({
              file,
              matches: patternMatches.length,
              lines: this.findMatchingLines(content, antiPattern.pattern),
            });
          }
        } catch (error) {
          // Skip files that can't be read
        }
      }
    }

    return matches;
  }

  /**
   * Find line numbers for pattern matches
   */
  findMatchingLines(content, pattern) {
    const lines = content.split('\n');
    const matchingLines = [];

    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        matchingLines.push(index + 1);
      }
    });

    return matchingLines;
  }

  /**
   * Check performance metrics
   */
  async checkPerformanceMetrics() {
    this.logSection('Performance Metrics Analysis');
    const metrics = {};
    const issues = [];

    try {
      // Test execution time
      this.log('Measuring test execution time...', COLORS.YELLOW);
      const testStartTime = Date.now();
      const testResult = await this.runCommand(
        'pnpm test --passWithNoTests --silent',
        this.projectRoot,
        { silent: true }
      );
      const testExecutionTime = Date.now() - testStartTime;

      metrics.testExecutionTime = testExecutionTime;

      if (
        testExecutionTime > QUALITY_THRESHOLDS.performance.maxTestExecutionTime
      ) {
        issues.push({
          type: 'performance-test-time',
          severity: 'warning',
          message: 'Test execution time exceeds threshold',
          details: `${testExecutionTime}ms > ${QUALITY_THRESHOLDS.performance.maxTestExecutionTime}ms`,
        });
      }

      // Bundle size analysis
      this.log('Analyzing bundle size...', COLORS.YELLOW);
      await this.analyzeBundleSize(metrics, issues);

      // Memory usage during tests
      this.log('Checking memory usage...', COLORS.YELLOW);
      await this.checkMemoryUsage(metrics, issues);
    } catch (error) {
      issues.push({
        type: 'performance-system',
        severity: 'error',
        message: `Performance analysis failed: ${error.message}`,
      });
    }

    const passed = issues.filter((i) => i.severity === 'error').length === 0;

    this.results.performance = {
      passed,
      metrics,
      issues,
    };

    return passed;
  }

  /**
   * Analyze bundle size
   */
  async analyzeBundleSize(metrics, issues) {
    try {
      const buildResult = await this.runCommand(
        'pnpm build',
        this.projectRoot,
        { silent: true }
      );

      if (buildResult.success) {
        // Check .next/static/chunks for bundle sizes
        const chunksDir = path.join(
          this.projectRoot,
          '.next',
          'static',
          'chunks'
        );

        try {
          const files = await fs.readdir(chunksDir);
          let totalSize = 0;

          for (const file of files) {
            if (file.endsWith('.js')) {
              const filePath = path.join(chunksDir, file);
              const stats = await fs.stat(filePath);
              totalSize += stats.size;
            }
          }

          metrics.bundleSize = Math.round(totalSize / 1024); // KB

          if (
            metrics.bundleSize > QUALITY_THRESHOLDS.performance.maxBundleSize
          ) {
            issues.push({
              type: 'performance-bundle-size',
              severity: 'warning',
              message: 'Bundle size exceeds threshold',
              details: `${metrics.bundleSize}KB > ${QUALITY_THRESHOLDS.performance.maxBundleSize}KB`,
            });
          }
        } catch (error) {
          // Build directory might not exist
        }
      }
    } catch (error) {
      // Build might fail, skip bundle size check
    }
  }

  /**
   * Check memory usage
   */
  async checkMemoryUsage(metrics, issues) {
    try {
      const initialMemory = process.memoryUsage();

      // Run a memory-intensive operation (test suite)
      await this.runCommand(
        'pnpm test --passWithNoTests --silent',
        this.projectRoot,
        { silent: true }
      );

      const finalMemory = process.memoryUsage();
      const memoryDiff =
        (finalMemory.heapUsed - initialMemory.heapUsed) / 1024 / 1024; // MB

      metrics.memoryUsage = Math.round(memoryDiff);

      if (metrics.memoryUsage > QUALITY_THRESHOLDS.performance.maxMemoryUsage) {
        issues.push({
          type: 'performance-memory',
          severity: 'warning',
          message: 'Memory usage exceeds threshold',
          details: `${metrics.memoryUsage}MB > ${QUALITY_THRESHOLDS.performance.maxMemoryUsage}MB`,
        });
      }
    } catch (error) {
      // Memory check failed, skip
    }
  }

  /**
   * Check security vulnerabilities
   */
  async checkSecurity() {
    this.logSection('Security Vulnerability Check');
    const vulnerabilities = [];
    const issues = [];

    try {
      // Frontend security audit
      this.log('Running frontend security audit...', COLORS.YELLOW);
      const auditResult = await this.runCommand(
        'pnpm audit --audit-level moderate',
        this.projectRoot,
        { silent: true }
      );

      if (!auditResult.success) {
        const vulns = this.parseAuditOutput(auditResult.output);
        vulnerabilities.push(...vulns);

        if (vulns.length > 0) {
          issues.push({
            type: 'security-frontend',
            severity: 'warning',
            message: `Found ${vulns.length} security vulnerabilities`,
            details: 'Run `pnpm audit fix` to resolve',
          });
        }
      }

      // Backend security check (if available)
      await this.checkBackendSecurity(vulnerabilities, issues);
    } catch (error) {
      issues.push({
        type: 'security-system',
        severity: 'error',
        message: `Security check failed: ${error.message}`,
      });
    }

    const passed =
      vulnerabilities.filter(
        (v) => v.severity === 'high' || v.severity === 'critical'
      ).length === 0;

    this.results.security = {
      passed,
      vulnerabilities,
      issues,
    };

    return passed;
  }

  /**
   * Check backend security
   */
  async checkBackendSecurity(vulnerabilities, issues) {
    try {
      const backendDir = path.join(this.projectRoot, 'backend');

      // Check for safety (Python security linter)
      const safetyResult = await this.runCommand(
        'poetry run safety check',
        backendDir,
        { silent: true }
      );

      if (
        !safetyResult.success &&
        !safetyResult.output.includes('No known security vulnerabilities found')
      ) {
        issues.push({
          type: 'security-backend',
          severity: 'warning',
          message: 'Python security vulnerabilities found',
          details: safetyResult.output,
        });
      }
    } catch (error) {
      // Safety might not be installed, skip
    }
  }

  /**
   * Check dependency status
   */
  async checkDependencies() {
    this.logSection('Dependency Status Check');
    const outdated = [];
    const issues = [];

    try {
      // Frontend dependencies
      this.log('Checking frontend dependencies...', COLORS.YELLOW);
      const frontendResult = await this.runCommand(
        'pnpm outdated --format json',
        this.projectRoot,
        { silent: true }
      );

      if (frontendResult.success && frontendResult.output) {
        try {
          const outdatedData = JSON.parse(frontendResult.output);
          Object.entries(outdatedData).forEach(([pkg, info]) => {
            outdated.push({
              package: pkg,
              current: info.current,
              wanted: info.wanted,
              latest: info.latest,
              type: 'frontend',
            });
          });
        } catch (parseError) {
          // JSON parsing failed, skip
        }
      }

      // Backend dependencies
      await this.checkBackendDependencies(outdated, issues);
    } catch (error) {
      issues.push({
        type: 'dependencies-system',
        severity: 'error',
        message: `Dependency check failed: ${error.message}`,
      });
    }

    const criticalOutdated = outdated.filter((dep) => {
      const currentVersion = dep.current.replace(/[^\d.]/g, '');
      const latestVersion = dep.latest.replace(/[^\d.]/g, '');
      return this.isVersionSignificantlyOutdated(currentVersion, latestVersion);
    });

    if (criticalOutdated.length > 0) {
      issues.push({
        type: 'dependencies-outdated',
        severity: 'warning',
        message: `${criticalOutdated.length} dependencies are significantly outdated`,
        details: criticalOutdated
          .map((d) => `${d.package}: ${d.current} -> ${d.latest}`)
          .join(', '),
      });
    }

    this.results.dependencies = {
      passed: issues.filter((i) => i.severity === 'error').length === 0,
      outdated,
      issues,
    };

    return this.results.dependencies.passed;
  }

  /**
   * Check backend dependencies
   */
  async checkBackendDependencies(outdated, issues) {
    try {
      const backendDir = path.join(this.projectRoot, 'backend');
      const showResult = await this.runCommand(
        'poetry show --outdated',
        backendDir,
        { silent: true }
      );

      if (showResult.success && showResult.output) {
        const lines = showResult.output.split('\n');
        lines.forEach((line) => {
          const match = line.match(/^(\S+)\s+(\S+)\s+(\S+)/);
          if (match) {
            outdated.push({
              package: match[1],
              current: match[2],
              latest: match[3],
              type: 'backend',
            });
          }
        });
      }
    } catch (error) {
      // Poetry might not be available, skip
    }
  }

  /**
   * Check if version is significantly outdated
   */
  isVersionSignificantlyOutdated(current, latest) {
    try {
      const currentParts = current.split('.').map(Number);
      const latestParts = latest.split('.').map(Number);

      // Major version difference
      if (latestParts[0] > currentParts[0]) return true;

      // Minor version difference > 5
      if (
        latestParts[0] === currentParts[0] &&
        latestParts[1] - currentParts[1] > 5
      )
        return true;

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Parse ESLint output
   */
  parseESLintOutput(output) {
    const issues = [];
    const lines = output.split('\n');

    lines.forEach((line) => {
      if (line.includes('error') || line.includes('warning')) {
        const severity = line.includes('error') ? 'error' : 'warning';
        issues.push({
          type: 'eslint',
          severity,
          message: line.trim(),
          details: line,
        });
      }
    });

    return issues;
  }

  /**
   * Parse audit output
   */
  parseAuditOutput(output) {
    const vulnerabilities = [];

    try {
      // Try to parse as JSON first
      const auditData = JSON.parse(output);

      if (auditData.advisories) {
        Object.values(auditData.advisories).forEach((advisory) => {
          vulnerabilities.push({
            package: advisory.module_name,
            severity: advisory.severity,
            title: advisory.title,
            url: advisory.url,
          });
        });
      }
    } catch (error) {
      // Fallback to text parsing
      const lines = output.split('\n');
      lines.forEach((line) => {
        if (line.includes('vulnerability') || line.includes('advisory')) {
          vulnerabilities.push({
            package: 'unknown',
            severity: 'unknown',
            title: line.trim(),
            url: '',
          });
        }
      });
    }

    return vulnerabilities;
  }

  /**
   * Generate quality report
   */
  generateQualityReport() {
    const timestamp = new Date().toISOString();
    const totalDuration = Date.now() - this.startTime;

    const report = {
      timestamp,
      duration: totalDuration,
      summary: {
        overallScore: this.calculateOverallScore(),
        passedChecks: Object.values(this.results).filter((r) => r.passed)
          .length,
        totalChecks: Object.keys(this.results).length,
        criticalIssues: this.getCriticalIssues().length,
        warnings: this.getWarnings().length,
      },
      results: this.results,
      recommendations: this.generateRecommendations(),
    };

    return report;
  }

  /**
   * Calculate overall quality score
   */
  calculateOverallScore() {
    const weights = {
      codeQuality: 0.3,
      testCoverage: 0.25,
      performance: 0.2,
      antiPatterns: 0.15,
      security: 0.1,
    };

    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(weights).forEach(([check, weight]) => {
      if (this.results[check]) {
        const score = this.results[check].passed
          ? 100
          : this.results[check].score || 0;
        totalScore += score * weight;
        totalWeight += weight;
      }
    });

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  }

  /**
   * Get critical issues
   */
  getCriticalIssues() {
    const criticalIssues = [];

    Object.values(this.results).forEach((result) => {
      if (result.issues) {
        criticalIssues.push(
          ...result.issues.filter((i) => i.severity === 'error')
        );
      }
    });

    return criticalIssues;
  }

  /**
   * Get warnings
   */
  getWarnings() {
    const warnings = [];

    Object.values(this.results).forEach((result) => {
      if (result.issues) {
        warnings.push(...result.issues.filter((i) => i.severity === 'warning'));
      }
    });

    return warnings;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    // Code quality recommendations
    if (!this.results.codeQuality.passed) {
      recommendations.push(
        'Fix TypeScript and ESLint errors to improve code quality'
      );
      recommendations.push(
        'Run `pnpm lint:fix` and `pnpm format` to auto-fix issues'
      );
    }

    // Coverage recommendations
    if (!this.results.testCoverage.passed) {
      recommendations.push(
        'Increase test coverage by adding more unit and integration tests'
      );
      recommendations.push(
        'Focus on testing critical business logic and error paths'
      );
    }

    // Performance recommendations
    if (!this.results.performance.passed) {
      recommendations.push(
        'Optimize test execution time by parallelizing tests'
      );
      recommendations.push('Consider code splitting to reduce bundle size');
    }

    // Anti-pattern recommendations
    if (!this.results.antiPatterns.passed) {
      recommendations.push('Remove console statements from production code');
      recommendations.push('Address TODO and FIXME comments');
    }

    // Security recommendations
    if (!this.results.security.passed) {
      recommendations.push('Update dependencies with security vulnerabilities');
      recommendations.push('Run `pnpm audit fix` to resolve security issues');
    }

    return recommendations;
  }

  /**
   * Print quality summary
   */
  printQualitySummary() {
    const report = this.generateQualityReport();

    console.log('\n' + '='.repeat(70));
    this.log('QUALITY CHECK SYSTEM - SUMMARY REPORT', COLORS.BOLD);
    console.log('='.repeat(70));

    const overallScore = report.summary.overallScore;
    const scoreColor =
      overallScore >= 90
        ? COLORS.GREEN
        : overallScore >= 70
          ? COLORS.YELLOW
          : COLORS.RED;

    this.log(`\nOverall Quality Score: ${overallScore}/100`, scoreColor);
    this.log(
      `Checks Passed: ${report.summary.passedChecks}/${report.summary.totalChecks}`
    );
    this.log(`Critical Issues: ${report.summary.criticalIssues}`);
    this.log(`Warnings: ${report.summary.warnings}`);
    this.log(`Duration: ${(report.duration / 1000).toFixed(1)}s`);

    // Detailed results
    console.log('\n📊 Detailed Results:');
    console.log('┌─────────────────────┬─────────┬───────┬─────────────┐');
    console.log('│ Check               │ Status  │ Score │ Issues      │');
    console.log('├─────────────────────┼─────────┼───────┼─────────────┤');

    Object.entries(this.results).forEach(([check, result]) => {
      const displayName = check.replace(/([A-Z])/g, ' $1').toLowerCase();
      const name = displayName.charAt(0).toUpperCase() + displayName.slice(1);
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const score = result.score !== undefined ? `${result.score}/100` : 'N/A';
      const issues = result.issues ? result.issues.length : 0;

      console.log(
        `│ ${name.padEnd(19)} │ ${status.padEnd(7)} │ ${score.padEnd(5)} │ ${issues.toString().padEnd(11)} │`
      );
    });

    console.log('└─────────────────────┴─────────┴───────┴─────────────┘');

    // Recommendations
    if (report.recommendations.length > 0) {
      console.log('\n🔧 Recommendations:');
      report.recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
    }

    // Save report
    const reportPath = path.join(this.projectRoot, 'quality-report.json');
    require('fs').writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.log(`\n📄 Detailed report saved to: ${reportPath}`, COLORS.BLUE);

    return overallScore >= 70;
  }

  /**
   * Run comprehensive quality checks
   */
  async runQualityChecks() {
    this.log(
      `${COLORS.BOLD}🔍 Medical Device Regulatory Assistant - Quality Check System${COLORS.RESET}`,
      COLORS.BLUE
    );

    try {
      await this.checkCodeQuality();
      await this.analyzeTestCoverage();
      await this.detectAntiPatterns();
      await this.checkPerformanceMetrics();
      await this.checkSecurity();
      await this.checkDependencies();

      const passed = this.printQualitySummary();

      if (passed) {
        this.log(
          '\n🎉 Quality checks passed! Code is ready for production.',
          COLORS.GREEN
        );
        process.exit(0);
      } else {
        this.log(
          '\n❌ Quality checks failed. Please address the issues above.',
          COLORS.RED
        );
        process.exit(1);
      }
    } catch (error) {
      this.log(
        `\n💥 Quality check system failed: ${error.message}`,
        COLORS.RED
      );
      process.exit(1);
    }
  }
}

// CLI interface
async function main() {
  const qualityChecker = new QualityCheckSystem();
  await qualityChecker.runQualityChecks();
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = QualityCheckSystem;
