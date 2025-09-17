# Optimized Jest Testing with SWC - Medical Device Regulatory Assistant

## Overview

This guide optimizes Jest testing for Next.js projects using SWC compilation, focusing on speed and minimal output while efficiently capturing errors. The setup leverages Next.js built-in SWC for maximum performance.

## Tech Stack Context

**Testing Frameworks:**
- **Jest 30.1.1** with **Next.js SWC** - Ultra-fast compilation
- **Playwright 1.55.0** - End-to-end testing
- **React Testing Library 16.3.0** - Component testing
- **Package Manager:** pnpm 9.0.0
- **Framework:** Next.js 15.5.2 with React 19.1.0 (SWC enabled)

**Test Categories:**
- Unit tests: `*.unit.test.{js,jsx,ts,tsx}`
- Integration tests: `*.integration.test.{js,jsx,ts,tsx}`
- Accessibility tests: `*.accessibility.test.{js,jsx,ts,tsx}`
- E2E tests: `./e2e/**/*.spec.ts`

## SWC-Optimized Fast Testing Commands

### Jest with Next.js SWC (Ultra-Fast)

#### 1. Speed-Optimized Silent Mode
```bash
# Fastest: SWC + parallel + cache + silent
pnpm test --silent --maxWorkers=75% --cache --reporters=summary

# Ultra-minimal: Just pass/fail counts
CI=true pnpm test --silent --reporters=summary --bail

# Error-focused: Only failures with SWC speed
pnpm test --silent --onlyFailures --maxWorkers=100% --cache
```

#### 2. Performance-First Reporters
```bash
# Fastest reporter: Summary only
pnpm test --reporters=summary --silent --maxWorkers=75%

# Speed + progress: Dot reporter with parallel execution
pnpm test --reporters=dot --silent --maxWorkers=100%

# Structured fast: JSON with SWC compilation cache
pnpm test --reporters=json --outputFile=results.json --silent --cache
```

#### 3. SWC Cache Optimization
```bash
# Leverage Next.js SWC cache for maximum speed
NEXT_CACHE_ENABLED=true pnpm test --silent --cache --reporters=summary

# Force SWC cache rebuild if needed
pnpm test --silent --clearCache && pnpm test --silent --reporters=summary

# Parallel + cache + minimal output
pnpm test --silent --maxWorkers=100% --cache --reporters=dot
```

#### 4. Fast Category-Specific Testing
```bash
# Unit tests: Maximum speed with SWC
pnpm test:unit --silent --reporters=summary --maxWorkers=100% --cache

# Integration tests: Parallel + error-focused
pnpm test:integration --silent --onlyFailures --maxWorkers=75%

# Accessibility tests: Fast + minimal
pnpm test:accessibility --silent --reporters=dot --maxWorkers=50%

# Performance tests: Speed-optimized
pnpm test:performance --silent --reporters=summary --maxWorkers=25%
```

#### 5. Lightning-Fast Coverage
```bash
# Coverage: SWC speed + summary only
pnpm test:coverage --silent --reporters=summary --coverageReporters=text-summary --maxWorkers=75%

# Coverage errors only: Fast + focused
pnpm test:coverage --silent --onlyFailures --coverageReporters=text-summary --maxWorkers=100%

# Coverage with cache: Maximum performance
pnpm test:coverage --silent --cache --reporters=summary --coverageReporters=text-summary
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

## High-Speed Error Capture Strategies

### 1. SWC-Optimized Error Filtering
```bash
# Fast compilation + error extraction
pnpm test --silent --maxWorkers=100% --cache 2>&1 | grep -E "(FAIL|Error|✕|Failed|Exception)"

# Speed + structured logging
pnpm test --silent --reporters=summary --maxWorkers=75% > test.log 2>&1 && tail -20 test.log

# Parallel execution + error focus
pnpm test --silent --onlyFailures --maxWorkers=100% 2>&1 | grep -A 3 -B 1 "FAIL\|Error\|✕"
```

### 2. Performance-First Error Extraction
```bash
# SWC speed + custom filtering
pnpm test --silent --maxWorkers=100% --cache 2>&1 | awk '/FAIL|Error|✕/{flag=1} flag{print} /PASS/{flag=0}'

# Playwright with speed optimization
pnpm test:e2e --reporter=line --workers=4 2>&1 | grep -E "✘|failed|error" -A 3
```

### 3. Fast Structured Error Capture
```bash
# JSON with SWC compilation cache
pnpm test --reporters=json --outputFile=results.json --silent --cache --maxWorkers=100%
# Parse errors: jq '.testResults[] | select(.status=="failed") | .message' results.json

# Playwright JSON optimized
pnpm test:e2e --reporter=json --output=e2e-results.json --workers=4
# Fast parse: jq '.suites[].specs[] | select(.tests[].results[].status=="failed")' e2e-results.json
```

### 4. Speed-Optimized Error Analysis
```bash
# Fastest error detection
pnpm test --silent --bail --maxWorkers=100% --cache 2>&1 | head -20

# Parallel error categorization
pnpm test --silent --maxWorkers=75% 2>&1 | grep -c "FAIL\|Error\|✕" | xargs echo "Total errors:"

# Quick error summary with SWC speed
pnpm test --silent --reporters=summary --maxWorkers=100% --onlyFailures
```

## Ultra-Fast Token-Efficient Error Analysis

### 1. Lightning-Speed Error Summary
```bash
# Instant error overview with SWC
pnpm test --silent --reporters=summary --maxWorkers=100% --cache 2>&1 | tail -10

# Fast failed test discovery
pnpm test --silent --listTests --onlyFailures --maxWorkers=75%

# Speed-optimized error counting
pnpm test --silent --bail --maxWorkers=100% 2>&1 | grep -c "FAIL\|Error\|✕" && echo "errors found"
```

### 2. Rapid Error Investigation
```bash
# Parallel failure analysis
pnpm test --silent --onlyFailures --maxWorkers=100% --cache --reporters=default

# Single file: Maximum SWC speed
pnpm test src/components/Button.test.tsx --silent --maxWorkers=1 --cache --reporters=default

# Pattern matching with speed
pnpm test --testNamePattern="should handle errors" --silent --maxWorkers=75% --reporters=summary
```

### 3. High-Speed Progressive Diagnosis
```bash
# Step 1: Instant health check (SWC + bail)
pnpm test --silent --reporters=summary --bail --maxWorkers=100% --cache

# Step 2: Fast failure summary (parallel + cache)
pnpm test --silent --onlyFailures --maxWorkers=75% --cache --reporters=default | head-30

# Step 3: Category-specific speed analysis
pnpm test:unit --silent --onlyFailures --maxWorkers=100% --cache --reporters=default
```

### 4. Performance Monitoring During Tests
```bash
# Speed + memory monitoring
time pnpm test --silent --reporters=summary --maxWorkers=75% --cache

# Cache effectiveness check
pnpm test --silent --cache --reporters=summary && echo "Cache hit" || echo "Cache miss"

# Parallel efficiency test
pnpm test --silent --maxWorkers=25% --reporters=dot && echo "25% workers" && \
pnpm test --silent --maxWorkers=100% --reporters=dot && echo "100% workers"
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

## Optimized LLM Testing Workflow

When running tests to diagnose issues with maximum speed:

1. **Start with SWC speed**: Use `--maxWorkers=100% --cache --reporters=summary --silent`
2. **Focus on failures fast**: Add `--onlyFailures --maxWorkers=75%` for rapid error detection
3. **Parallel structured data**: Use `--reporters=json --maxWorkers=100% --cache` for fast analysis
4. **Progressive speed detail**: Start with `--bail` for instant feedback, add detail only for specific failures
5. **High-speed filtering**: Use parallel grep/awk with SWC compilation cache

### Lightning-Fast LLM Workflow
```bash
# Step 1: Instant health check (SWC + parallel + cache)
pnpm test --silent --reporters=summary --bail --maxWorkers=100% --cache

# Step 2: Rapid failure analysis (parallel + focused)
pnpm test --silent --onlyFailures --maxWorkers=75% --cache --reporters=default | head -20

# Step 3: Speed-targeted investigation (single worker + cache)
pnpm test path/to/failing/test.tsx --silent --maxWorkers=1 --cache --reporters=default
```

### Performance-First Commands
```bash
# Ultra-fast overview (< 5 seconds)
pnpm test --silent --reporters=summary --maxWorkers=100% --cache --bail

# Speed-optimized error capture (< 10 seconds)
pnpm test --silent --onlyFailures --maxWorkers=75% --cache | head -15

# Instant single test (< 2 seconds)
pnpm test specific.test.tsx --silent --maxWorkers=1 --cache --reporters=dot
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