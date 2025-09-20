# Kiro Format and Lint Auto-Fix Hook

## Overview

This hook provides intelligent format and lint checking for the Medical Device Regulatory Assistant project. It implements a two-stage process that first formats code with Prettier, then lints and auto-fixes issues with ESLint.

## Features

### ✅ Two-Stage Processing

1. **Stage 1: Prettier Formatting**
   - Automatically formats code according to project standards
   - Handles indentation, spacing, quotes, and semicolons
   - Ensures consistent visual appearance

2. **Stage 2: ESLint Linting**
   - Analyzes code for potential errors and style violations
   - Auto-fixes many common issues
   - Reports unfixable issues with suggested solutions

### ✅ Intelligent Error Handling

- **Graceful Degradation**: Continues processing even if some files fail
- **Detailed Reporting**: Provides specific error messages and suggestions
- **Recovery Strategies**: Offers actionable solutions for common problems
- **Partial Success**: Reports successful operations even when some fail

### ✅ Comprehensive File Support

- JavaScript (`.js`, `.mjs`)
- TypeScript (`.ts`)
- React/JSX (`.jsx`, `.tsx`)
- Automatic file discovery in `src/`, `components/`, `pages/`, `app/`

## Installation

The hook is already configured and ready to use. Ensure you have the required dependencies:

```bash
# Install dependencies (if not already installed)
pnpm install

# Verify the hook works
node .kiro/hooks/format-and-lint-autofix.js --help
```

## Usage

### Automatic Usage (Kiro IDE)

The hook automatically runs when:

- Files are saved (if configured)
- Manual trigger through Kiro IDE
- Keyboard shortcuts: `Ctrl+Shift+L`

### Manual Usage

```bash
# Run on specific files
node .kiro/hooks/format-and-lint-autofix.js src/components/MyComponent.tsx

# Run on all supported files
node .kiro/hooks/format-and-lint-autofix.js

# Test the hook
node test-format-lint-hook.js
```

### Package.json Scripts

```bash
# Format and lint with auto-fix
pnpm lint:fix

# Check only (no auto-fix)
pnpm lint:check

# Format only
pnpm format
```

## Configuration

### Hook Settings (`.kiro/hooks/hooks.json`)

```json
{
  "settings": {
    "timeout": 30000,
    "maxRetries": 3,
    "runOnSave": true,
    "runOnCommit": true,
    "showProgress": true,
    "reportLevel": "detailed"
  }
}
```

### File Patterns

**Included:**

- `**/*.js`, `**/*.jsx`
- `**/*.ts`, `**/*.tsx`
- `**/*.mjs`

**Excluded:**

- `**/node_modules/**`
- `**/.next/**`, `**/build/**`, `**/dist/**`
- `**/coverage/**`
- `**/*.min.js`, `**/*.min.css`

## Error Handling

### Common Issues and Solutions

#### 1. Syntax Errors

**Issue**: File has syntax errors preventing formatting
**Solution**:

- Fix syntax errors manually
- Check for missing brackets, quotes, or semicolons
- Use IDE syntax highlighting to identify issues

#### 2. ESLint Configuration Errors

**Issue**: ESLint rules conflict or configuration is invalid
**Solution**:

- Run `pnpm eslint --print-config file.js` to debug
- Check `eslint.config.mjs` for configuration issues
- Verify all ESLint plugins are installed

#### 3. Performance Issues

**Issue**: Hook runs slowly on large files
**Solution**:

- Process files in smaller batches
- Check for infinite loops or complex rules
- Clear ESLint cache: `rm .eslintcache`

#### 4. Import Resolution Issues

**Issue**: ESLint cannot resolve TypeScript imports
**Solution**:

- Verify `tsconfig.json` path mapping
- Check TypeScript compilation
- Ensure all dependencies are installed

### Auto-Fix Limitations

Some issues require manual intervention:

- **Logic Errors**: Incorrect business logic
- **Type Errors**: TypeScript type mismatches
- **Complex Refactoring**: Large-scale code restructuring
- **Accessibility Issues**: Some a11y violations need manual review

## Output Examples

### Successful Run

```
🔧 Kiro Format and Lint Auto-Fix Hook
=====================================

📁 Processing 5 file(s)
   • src/components/Button.tsx
   • src/hooks/useAuth.ts
   • src/pages/dashboard.tsx
   • src/utils/helpers.js
   • src/types/project.ts

📝 Stage 1: Formatting with Prettier
✅ Formatted 5 file(s) successfully

🔍 Stage 2: Linting with ESLint
🔧 Auto-fixed: 12 issues
⚠️  Warnings: 3

📊 Summary Report
================

Formatting:
  ✅ Formatted: 5 files

Linting:
  🔧 Auto-fixed: 12 issues
  ⚠️  Warnings: 3

Hook execution completed successfully
```

### Issues Found

```
🔧 Kiro Format and Lint Auto-Fix Hook
=====================================

📁 Processing 2 file(s)
   • src/components/Form.tsx
   • src/utils/api.ts

📝 Stage 1: Formatting with Prettier
✅ Formatted 2 file(s) successfully

🔍 Stage 2: Linting with ESLint
❌ 3 error(s) and 1 warning(s) found

Remaining Issues:

  📄 src/components/Form.tsx:
    ❌    Line 15:7 - 'useState' is not defined (no-undef)
    ❌    Line 23:5 - Assignment to property of function parameter 'props' (no-param-reassign)
    ⚠️     Line 30:9 - Unexpected console statement (no-console)

Suggested Actions:
  👨‍💻 Manual fixes required for some errors
  📚 Review ESLint documentation for specific rules
  🔍 Run `pnpm lint:check` to see all issues without auto-fixing
  📖 Check FORMAT_AND_LINT_FEATURE_DOCUMENTATION.md for detailed guidance

Hook execution completed with issues
```

## Integration with Kiro IDE

### Status Bar Integration

- Shows current format/lint status
- Click to run manual check
- Visual indicators for issues

### Context Menu

- Right-click on files to run format/lint
- Batch operations on multiple files
- Quick access to common actions

### Command Palette

- `Format and Lint: Run Auto-Fix`
- `Format and Lint: Check Only`
- `Format and Lint: Format Only`

### Keyboard Shortcuts

- `Ctrl+Shift+F`: Format current file
- `Ctrl+Shift+L`: Format and lint fix current file

## Performance Optimization

### Caching

- ESLint cache enabled (`.eslintcache`)
- Prettier uses file modification times
- Hook results cached in `.kiro/cache/format-lint`

### Parallel Processing

- Multiple files processed concurrently
- Configurable concurrency limit
- Timeout protection per file

### Incremental Processing

- Only processes changed files in development
- Full codebase check in CI/CD
- Smart file discovery

## Troubleshooting

### Debug Mode

```bash
# Run with debug output
DEBUG=1 node .kiro/hooks/format-and-lint-autofix.js

# Check ESLint configuration
pnpm eslint --print-config src/components/Button.tsx

# Test Prettier formatting
pnpm prettier --check src/components/Button.tsx
```

### Common Commands

```bash
# Clear all caches
rm -rf .eslintcache .kiro/cache/format-lint

# Reinstall dependencies
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Validate configuration
pnpm lint:check --debug
```

### Log Files

- Hook execution logs: `.kiro/reports/format-lint/`
- ESLint cache: `.eslintcache`
- Performance metrics: `.kiro/cache/format-lint/metrics.json`

## Contributing

### Adding New Rules

1. Update `eslint.config.mjs` with new rules
2. Test with `node test-format-lint-hook.js`
3. Update documentation
4. Verify hook still works correctly

### Modifying Hook Behavior

1. Edit `.kiro/hooks/format-and-lint-autofix.js`
2. Update configuration in `hooks.json`
3. Test thoroughly with various file types
4. Update this README

### Reporting Issues

1. Run hook with debug mode
2. Collect error messages and logs
3. Include sample files that cause issues
4. Provide system information (OS, Node version, etc.)

This hook provides a robust, intelligent solution for maintaining code quality in the Medical Device Regulatory Assistant project while integrating seamlessly with the Kiro IDE.
