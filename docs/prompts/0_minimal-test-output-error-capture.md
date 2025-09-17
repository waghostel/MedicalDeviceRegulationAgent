# Minimal Test Output with Error Capture - Medical Device Regulatory Assistant

## Overview

This prompt guides LLMs to run tests with minimal output while efficiently capturing errors to conserve tokens. The codebase uses Jest for unit/integration testing and Playwright for e2e testing with pnpm as the package manager.

## Tech Stack Context

**Testing Frameworks:**
- **Jest 30.1.1** - Unit, integration, accessibility tests
- **Playwright 1.55.0** - End-to-end testing
- **React Testing Library 16.3.0** - Component testing
- **Package Manager:** pnpm 9.0.0
- **Framework:** Next.js 15.5.2 with React 19.1.0

**Test Categories:**
- Unit tests: `*.unit.test.{js,jsx,ts,tsx}`
- Integration tests: `*.integration.test.{js,jsx,ts,tsx}`
- Accessibility tests: `*.accessibility.test.{js,jsx,ts,tsx}`
- E2E tests: `./e2e/**/*.spec.ts`

## Minimal Output Commands

### Jest Tests (Unit/Integration/Accessibility)

#### 1. Silent Mode with Error Capture Only
```bash
# Basic silent run - shows only failures
pnpm test --silent --verbose=false --reporters=default

# Even more minimal - just pass/fail summary
CI=true pnpm test --silent --reporters=summary

# Capture only failed tests with minimal context
pnpm test --silent --reporters=default --onlyFailures
```

#### 2. Custom Minimal Reporter
```bash
# Use built-in minimal reporters
pnpm test --reporters=summary --silent

# Dot reporter (just dots for progress)
pnpm test --reporters=dot --silent

# JSON output for programmatic parsing
pnpm test --reporters=json --outputFile=test-results.json --silent
```

#### 3. Specific Test Categories (Minimal)
```bash
# Unit tests only - minimal output
pnpm test:unit --silent --reporters=summary

# Integration tests - error-focused
pnpm test:integration --silent --reporters=default --onlyFailures

# Accessibility tests - minimal
pnpm test:accessibility --silent --reporters=dot
```

#### 4. Coverage with Minimal Output
```bash
# Coverage summary only (no detailed reports)
pnpm test:coverage --silent --reporters=summary --coverageReporters=text-summary

# Coverage with error capture
pnpm test:coverage --silent --reporters=default --coverageReporters=text-summary --onlyFailures
```

### Playwright Tests (E2E)

#### 1. Minimal E2E Output
```bash
# Basic minimal output
pnpm test:e2e --reporter=dot

# Line reporter (one line per test)
pnpm test:e2e --reporter=line

# JSON output for parsing
pnpm test:e2e --reporter=json --output=e2e-results.json
```

#### 2. Specific E2E Categories (Minimal)
```bash
# Visual tests - minimal output
pnpm test:e2e:visual --reporter=dot

# Cross-browser - summary only
pnpm test:e2e:cross-browser --reporter=line

# Mobile tests - minimal
pnpm test:e2e:mobile --reporter=dot
```

#### 3. Failed Tests Only
```bash
# Show only failures with minimal context
pnpm test:e2e --reporter=line --grep="@failing"

# Retry failed tests with minimal output
pnpm test:e2e --reporter=dot --last-failed
```

## Error Capture Strategies

### 1. Redirect and Filter Output
```bash
# Capture full output, show only errors
pnpm test --silent 2>&1 | grep -E "(FAIL|Error|✕|Failed|Exception)"

# Save full log, display summary
pnpm test --silent --reporters=summary > test.log 2>&1 && tail -20 test.log

# Filter Jest output for errors only
pnpm test --silent --verbose=false 2>&1 | grep -A 5 -B 2 "FAIL\|Error\|✕"
```

### 2. Custom Error-Only Output
```bash
# Jest with custom output filtering
pnpm test --silent --reporters=default 2>&1 | awk '/FAIL|Error|✕/{flag=1} flag{print} /PASS/{flag=0}'

# Playwright error extraction
pnpm test:e2e --reporter=line 2>&1 | grep -E "✘|failed|error" -A 3
```

### 3. Structured Error Capture
```bash
# JSON output for programmatic error parsing
pnpm test --reporters=json --outputFile=results.json --silent
# Then parse: jq '.testResults[] | select(.status=="failed") | .message' results.json

# Playwright JSON with error extraction
pnpm test:e2e --reporter=json --output=e2e-results.json
# Parse: jq '.suites[].specs[] | select(.tests[].results[].status=="failed")' e2e-results.json
```

## Token-Efficient Error Analysis

### 1. Error Summary Commands
```bash
# Get just the error count and types
pnpm test --silent --reporters=summary 2>&1 | tail -10

# Failed test names only
pnpm test --silent --listTests --findRelatedTests --onlyFailures

# Error categories summary
pnpm test --silent 2>&1 | grep -c "FAIL\|Error\|✕" && echo "errors found"
```

### 2. Focused Error Investigation
```bash
# Run only failing tests with minimal output
pnpm test --silent --onlyFailures --reporters=default

# Single test file with error focus
pnpm test src/components/Button.test.tsx --silent --reporters=default

# Specific test pattern with minimal output
pnpm test --testNamePattern="should handle errors" --silent --reporters=summary
```

### 3. Progressive Error Diagnosis
```bash
# Step 1: Quick health check
pnpm test --silent --reporters=summary --bail

# Step 2: If failures, get error summary
pnpm test --silent --onlyFailures --reporters=default | head -50

# Step 3: Focus on specific failing category
pnpm test:unit --silent --onlyFailures --reporters=default
```

## Environment-Specific Optimizations

### CI/Production Mode
```bash
# CI optimized minimal output
CI=true pnpm test --silent --reporters=summary --maxWorkers=2

# Production-like minimal testing
NODE_ENV=production pnpm test --silent --reporters=dot --bail
```

### Development Mode
```bash
# Watch mode with minimal output
pnpm test:watch --silent --reporters=summary

# Interactive minimal mode
pnpm test --silent --reporters=default --watch --onlyFailures
```

## LLM Usage Instructions

When running tests to diagnose issues:

1. **Start with summary**: Use `--reporters=summary --silent` for overview
2. **Focus on failures**: Add `--onlyFailures` to see only problems
3. **Capture structured data**: Use JSON reporters for programmatic analysis
4. **Progressive detail**: Start minimal, add detail only for specific failures
5. **Filter output**: Use grep/awk to extract only error-relevant information

### Example LLM Workflow
```bash
# Step 1: Quick health check (minimal tokens)
pnpm test --silent --reporters=summary --bail

# Step 2: If failures, get error details (focused tokens)
pnpm test --silent --onlyFailures --reporters=default | head -30

# Step 3: Investigate specific test (targeted tokens)
pnpm test path/to/failing/test.tsx --silent --reporters=default
```

## Output Parsing for Token Efficiency

### Extract Key Information
```bash
# Get just the essential error info
pnpm test --silent 2>&1 | grep -E "FAIL|✕|Error" | head -10

# Count and categorize errors
pnpm test --silent 2>&1 | grep -c "FAIL" && echo "failed tests"
pnpm test --silent 2>&1 | grep -c "Error" && echo "runtime errors"

# Get test file names with failures
pnpm test --silent --onlyFailures --listTests
```

### Structured Error Summary
```bash
# Create concise error report
echo "=== Test Summary ===" && \
pnpm test --silent --reporters=summary 2>&1 | tail -5 && \
echo "=== Failed Tests ===" && \
pnpm test --silent --onlyFailures --reporters=default 2>&1 | head -20
```

This approach ensures maximum error capture with minimal token usage, focusing on actionable information while filtering out verbose test output.