#!/usr/bin/env node

/**
 * Kiro Auto-Fix Hook: Format and Lint Check
 * 
 * This hook implements a two-stage process:
 * 1. Format code with Prettier
 * 2. Lint and auto-fix with ESLint
 * 
 * If errors cannot be auto-fixed, it reports them with potential solutions.
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  maxRetries: 3,
  timeout: 30000, // 30 seconds
  supportedExtensions: ['.js', '.jsx', '.ts', '.tsx', '.mjs'],
  excludePatterns: [
    'node_modules',
    '.next',
    'build',
    'dist',
    'coverage',
    '.kiro',
    '*.min.js',
    '*.min.css'
  ]
};

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class FormatAndLintHook {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.fixedIssues = [];
    this.unfixableIssues = [];
  }

  /**
   * Main execution function
   */
  async execute(filePaths = []) {
    console.log(`${colors.cyan}🔧 Kiro Format and Lint Auto-Fix Hook${colors.reset}`);
    console.log(`${colors.cyan}=====================================\n${colors.reset}`);

    try {
      // Validate environment
      await this.validateEnvironment();

      // Get files to process
      const files = await this.getFilesToProcess(filePaths);
      
      if (files.length === 0) {
        console.log(`${colors.yellow}⚠️  No files to process${colors.reset}`);
        return { success: true, message: 'No files to process' };
      }

      console.log(`${colors.blue}📁 Processing ${files.length} file(s)${colors.reset}`);
      files.forEach(file => console.log(`   • ${file}`));
      console.log();

      // Stage 1: Format with Prettier
      const formatResult = await this.formatFiles(files);
      
      // Stage 2: Lint with ESLint
      const lintResult = await this.lintFiles(files);

      // Generate report
      return this.generateReport(formatResult, lintResult);

    } catch (error) {
      console.error(`${colors.red}❌ Hook execution failed:${colors.reset}`, error.message);
      return {
        success: false,
        error: error.message,
        suggestions: this.getErrorSuggestions(error)
      };
    }
  }

  /**
   * Validate that required tools are available
   */
  async validateEnvironment() {
    // Check if pnpm is available
    try {
      execSync('pnpm --version', { stdio: 'pipe' });
    } catch (error) {
      throw new Error('pnpm not found. Please install pnpm first.');
    }

    // Check if prettier and eslint are available through pnpm
    try {
      execSync('pnpm prettier --version', { stdio: 'pipe' });
    } catch (error) {
      throw new Error('Prettier not found. Please install prettier with: pnpm add -D prettier');
    }

    try {
      execSync('pnpm eslint --version', { stdio: 'pipe' });
    } catch (error) {
      throw new Error('ESLint not found. Please install eslint with: pnpm add -D eslint');
    }

    // Check if package.json exists
    if (!fs.existsSync('package.json')) {
      throw new Error('package.json not found. Please run this hook from the project root.');
    }

    // Check if ESLint config exists
    if (!fs.existsSync('eslint.config.mjs') && !fs.existsSync('.eslintrc.js') && !fs.existsSync('.eslintrc.json')) {
      throw new Error('ESLint configuration not found. Please ensure ESLint is properly configured.');
    }
  }

  /**
   * Get list of files to process
   */
  async getFilesToProcess(inputFiles) {
    let files = [];

    if (inputFiles.length > 0) {
      // Process specific files
      files = inputFiles.filter(file => this.shouldProcessFile(file));
    } else {
      // Process all supported files in src directory
      files = await this.findSupportedFiles(['src', 'components', 'pages', 'app']);
    }

    return files.filter(file => fs.existsSync(file));
  }

  /**
   * Check if file should be processed
   */
  shouldProcessFile(filePath) {
    const ext = path.extname(filePath);
    
    // Check extension
    if (!CONFIG.supportedExtensions.includes(ext)) {
      return false;
    }

    // Check exclude patterns
    return !CONFIG.excludePatterns.some(pattern => 
      filePath.includes(pattern)
    );
  }

  /**
   * Find all supported files in given directories
   */
  async findSupportedFiles(directories) {
    const files = [];

    for (const dir of directories) {
      if (fs.existsSync(dir)) {
        const dirFiles = await this.walkDirectory(dir);
        files.push(...dirFiles);
      }
    }

    return files;
  }

  /**
   * Recursively walk directory to find files
   */
  async walkDirectory(dir) {
    const files = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip excluded directories
        if (!CONFIG.excludePatterns.some(pattern => entry.name.includes(pattern))) {
          const subFiles = await this.walkDirectory(fullPath);
          files.push(...subFiles);
        }
      } else if (entry.isFile() && this.shouldProcessFile(fullPath)) {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Stage 1: Format files with Prettier
   */
  async formatFiles(files) {
    console.log(`${colors.magenta}📝 Stage 1: Formatting with Prettier${colors.reset}`);
    
    const result = {
      success: false,
      formattedFiles: [],
      errors: []
    };

    try {
      // Run Prettier on all files
      const fileList = files.join(' ');
      const command = `pnpm prettier --write ${fileList}`;
      
      console.log(`   Running: ${command}`);
      
      const output = execSync(command, { 
        encoding: 'utf8',
        timeout: CONFIG.timeout,
        stdio: 'pipe'
      });

      result.success = true;
      result.formattedFiles = files;
      
      console.log(`${colors.green}✅ Formatted ${files.length} file(s) successfully${colors.reset}\n`);

    } catch (error) {
      console.log(`${colors.red}❌ Prettier formatting failed${colors.reset}`);
      
      // Try to format files individually to identify problematic ones
      for (const file of files) {
        try {
          execSync(`pnpm prettier --write "${file}"`, { stdio: 'pipe' });
          result.formattedFiles.push(file);
        } catch (fileError) {
          result.errors.push({
            file,
            error: fileError.message,
            suggestions: [
              'Check for syntax errors in the file',
              'Ensure the file has valid JavaScript/TypeScript syntax',
              'Try running prettier --check to see what would change'
            ]
          });
        }
      }

      if (result.formattedFiles.length > 0) {
        console.log(`${colors.yellow}⚠️  Formatted ${result.formattedFiles.length} file(s), ${result.errors.length} failed${colors.reset}\n`);
        result.success = true; // Partial success
      } else {
        console.log(`${colors.red}❌ No files could be formatted${colors.reset}\n`);
      }
    }

    return result;
  }

  /**
   * Stage 2: Lint files with ESLint
   */
  async lintFiles(files) {
    console.log(`${colors.magenta}🔍 Stage 2: Linting with ESLint${colors.reset}`);
    
    const result = {
      success: false,
      fixedIssues: [],
      remainingIssues: [],
      errors: []
    };

    try {
      // First, try to auto-fix issues
      const fileList = files.join(' ');
      const fixCommand = `pnpm eslint ${fileList} --fix --format json`;
      
      console.log(`   Running auto-fix: pnpm eslint --fix`);
      
      let fixOutput;
      try {
        fixOutput = execSync(fixCommand, { 
          encoding: 'utf8',
          timeout: CONFIG.timeout,
          stdio: 'pipe'
        });
      } catch (fixError) {
        // ESLint returns non-zero exit code when there are unfixable issues
        fixOutput = fixError.stdout || '[]';
      }

      // Parse ESLint JSON output
      let eslintResults = [];
      try {
        eslintResults = JSON.parse(fixOutput);
      } catch (parseError) {
        console.log(`${colors.yellow}⚠️  Could not parse ESLint output, running check mode${colors.reset}`);
        
        // Fallback to check mode
        const checkCommand = `pnpm eslint ${fileList} --format json`;
        try {
          const checkOutput = execSync(checkCommand, { encoding: 'utf8', stdio: 'pipe' });
          eslintResults = JSON.parse(checkOutput);
        } catch (checkError) {
          eslintResults = JSON.parse(checkError.stdout || '[]');
        }
      }

      // Process results
      this.processESLintResults(eslintResults, result);

      // Determine overall success
      const totalIssues = result.remainingIssues.length;
      const errorCount = result.remainingIssues.filter(issue => issue.severity === 2).length;
      
      if (errorCount === 0) {
        result.success = true;
        if (totalIssues === 0) {
          console.log(`${colors.green}✅ No linting issues found${colors.reset}\n`);
        } else {
          console.log(`${colors.yellow}⚠️  ${totalIssues} warning(s) found, but no errors${colors.reset}\n`);
        }
      } else {
        console.log(`${colors.red}❌ ${errorCount} error(s) and ${totalIssues - errorCount} warning(s) found${colors.reset}\n`);
      }

    } catch (error) {
      console.log(`${colors.red}❌ ESLint execution failed${colors.reset}`);
      result.errors.push({
        error: error.message,
        suggestions: [
          'Check ESLint configuration',
          'Ensure all dependencies are installed',
          'Try running ESLint manually to debug'
        ]
      });
    }

    return result;
  }

  /**
   * Process ESLint results and categorize issues
   */
  processESLintResults(eslintResults, result) {
    for (const fileResult of eslintResults) {
      const { filePath, messages, fixableErrorCount, fixableWarningCount } = fileResult;

      // Count fixed issues (if fixable counts are available)
      if (fixableErrorCount > 0 || fixableWarningCount > 0) {
        result.fixedIssues.push({
          file: filePath,
          fixedErrors: fixableErrorCount || 0,
          fixedWarnings: fixableWarningCount || 0
        });
      }

      // Process remaining issues
      for (const message of messages) {
        const issue = {
          file: filePath,
          line: message.line,
          column: message.column,
          rule: message.ruleId,
          message: message.message,
          severity: message.severity, // 1 = warning, 2 = error
          fixable: message.fix !== undefined
        };

        result.remainingIssues.push(issue);
      }
    }
  }

  /**
   * Generate comprehensive report
   */
  generateReport(formatResult, lintResult) {
    console.log(`${colors.cyan}📊 Summary Report${colors.reset}`);
    console.log(`${colors.cyan}================\n${colors.reset}`);

    const report = {
      success: formatResult.success && lintResult.success,
      formatting: {
        success: formatResult.success,
        formattedFiles: formatResult.formattedFiles.length,
        errors: formatResult.errors.length
      },
      linting: {
        success: lintResult.success,
        fixedIssues: lintResult.fixedIssues.length,
        remainingIssues: lintResult.remainingIssues.length,
        errors: lintResult.errors.length
      },
      details: {
        formatErrors: formatResult.errors,
        lintIssues: lintResult.remainingIssues,
        lintErrors: lintResult.errors
      }
    };

    // Print summary
    console.log(`${colors.bright}Formatting:${colors.reset}`);
    console.log(`  ✅ Formatted: ${report.formatting.formattedFiles} files`);
    if (report.formatting.errors > 0) {
      console.log(`  ❌ Failed: ${report.formatting.errors} files`);
    }

    console.log(`\n${colors.bright}Linting:${colors.reset}`);
    if (lintResult.fixedIssues.length > 0) {
      const totalFixed = lintResult.fixedIssues.reduce((sum, item) => 
        sum + item.fixedErrors + item.fixedWarnings, 0);
      console.log(`  🔧 Auto-fixed: ${totalFixed} issues`);
    }
    
    if (report.linting.remainingIssues > 0) {
      const errors = lintResult.remainingIssues.filter(issue => issue.severity === 2).length;
      const warnings = report.linting.remainingIssues - errors;
      
      if (errors > 0) {
        console.log(`  ❌ Errors: ${errors}`);
      }
      if (warnings > 0) {
        console.log(`  ⚠️  Warnings: ${warnings}`);
      }
    } else {
      console.log(`  ✅ No remaining issues`);
    }

    // Show detailed issues if any
    if (lintResult.remainingIssues.length > 0) {
      console.log(`\n${colors.bright}Remaining Issues:${colors.reset}`);
      this.printDetailedIssues(lintResult.remainingIssues);
    }

    // Show suggestions for unfixable issues
    if (!report.success) {
      console.log(`\n${colors.bright}Suggested Actions:${colors.reset}`);
      this.printSuggestions(report);
    }

    console.log(`\n${colors.cyan}Hook execution ${report.success ? 'completed successfully' : 'completed with issues'}${colors.reset}`);
    
    return report;
  }

  /**
   * Print detailed issues with context
   */
  printDetailedIssues(issues) {
    const groupedByFile = {};
    
    // Group issues by file
    issues.forEach(issue => {
      if (!groupedByFile[issue.file]) {
        groupedByFile[issue.file] = [];
      }
      groupedByFile[issue.file].push(issue);
    });

    // Print issues for each file
    Object.entries(groupedByFile).forEach(([file, fileIssues]) => {
      console.log(`\n  📄 ${file}:`);
      
      fileIssues.forEach(issue => {
        const severity = issue.severity === 2 ? '❌' : '⚠️ ';
        const fixable = issue.fixable ? '🔧' : '  ';
        
        console.log(`    ${severity} ${fixable} Line ${issue.line}:${issue.column} - ${issue.message} (${issue.rule})`);
      });
    });
  }

  /**
   * Print actionable suggestions
   */
  printSuggestions(report) {
    const suggestions = [];

    // Format error suggestions
    if (report.formatting.errors > 0) {
      suggestions.push('🔧 Fix syntax errors in files that failed formatting');
      suggestions.push('📝 Run `pnpm prettier --check <file>` to see formatting issues');
    }

    // Lint error suggestions
    if (report.linting.remainingIssues > 0) {
      const errors = report.details.lintIssues.filter(issue => issue.severity === 2);
      const fixableErrors = errors.filter(issue => issue.fixable);
      
      if (fixableErrors.length > 0) {
        suggestions.push('🔧 Some errors are auto-fixable - run the hook again');
      }
      
      if (errors.length > fixableErrors.length) {
        suggestions.push('👨‍💻 Manual fixes required for some errors');
        suggestions.push('📚 Review ESLint documentation for specific rules');
        suggestions.push('🤝 Consider discussing rule modifications with the team');
      }
    }

    // General suggestions
    suggestions.push('🔍 Run `pnpm lint:check` to see all issues without auto-fixing');
    suggestions.push('📖 Check FORMAT_AND_LINT_FEATURE_DOCUMENTATION.md for detailed guidance');

    suggestions.forEach(suggestion => {
      console.log(`  ${suggestion}`);
    });
  }

  /**
   * Get error-specific suggestions
   */
  getErrorSuggestions(error) {
    const suggestions = [];

    if (error.message.includes('not found')) {
      suggestions.push('Install missing dependencies with `pnpm install`');
      suggestions.push('Ensure you are running from the project root directory');
    }

    if (error.message.includes('configuration')) {
      suggestions.push('Check ESLint configuration in eslint.config.mjs');
      suggestions.push('Verify Prettier configuration in .prettierrc');
      suggestions.push('Run configuration validation scripts');
    }

    if (error.message.includes('timeout')) {
      suggestions.push('Try processing fewer files at once');
      suggestions.push('Check for infinite loops or performance issues');
      suggestions.push('Increase timeout in hook configuration');
    }

    return suggestions;
  }
}

// Export for use as a module
module.exports = FormatAndLintHook;

// If run directly, execute the hook
if (require.main === module) {
  const hook = new FormatAndLintHook();
  const args = process.argv.slice(2);
  
  hook.execute(args)
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Hook failed:', error);
      process.exit(1);
    });
}