# 🧪 Comprehensive Test Guide - Medical Device Regulatory Assistant

## Overview

This comprehensive guide merges all testing documentation for the Medical Device Regulatory Assistant project, optimized for Next.js with SWC compilation and React 19 compatibility. It provides speed-optimized commands, Windows-specific benchmarking, and comprehensive testing strategies.

## 📚 Tech Stack

- **Jest 30.1.1** with **Next.js SWC** - Ultra-fast compilation
- **Playwright 1.55.0** - End-to-end testing
- **React Testing Library 16.3.0** - Component testing
- **Package Manager:** pnpm 9.0.0
- **Framework:** Next.js 15.5.2 with React 19.1.0

## 📊 Test Categories

- **Unit Tests**: `*.unit.test.{js,jsx,ts,tsx}`
- **Integration Tests**: `*.integration.test.{js,jsx,ts,tsx}`
- **Accessibility Tests**: `*.accessibility.test.{js,jsx,ts,tsx}`
- **E2E Tests**: `./e2e/**/*.spec.ts`

## 🎯 Quick Start Commands

### Instant Health Check (< 5 seconds)
```bash
pnpm test --silent --maxWorkers=100% --cache --reporters=summary --bail
```

### Error-Only Analysis (< 10 seconds)
```bash
pnpm test --silent --onlyFailures --maxWorkers=100% --cache | head -20
```

### Single File Debug (< 3 seconds)
```bash
pnpm test src/components/Button.test.tsx --maxWorkers=1 --cache --silent
```

### Coverage Summary (< 15 seconds)
```bash
pnpm test --coverage --maxWorkers=100% --cache --silent --coverageReporters=text-summary --bail
```

## 🚀 Performance Hierarchy (Fastest to Slowest)

1. **⚡ Ultra-Fast** (1-5s): `--bail --maxWorkers=100% --cache --silent --reporters=dot`
2. **🔥 Very Fast** (5-10s): `--maxWorkers=75% --cache --silent --reporters=summary`  
3. **⚡ Fast** (10-20s): `--maxWorkers=50% --cache --silent`
4. **📊 Coverage** (20-30s): `--coverage --maxWorkers=75% --cache --silent --coverageReporters=text-summary`

## 🎛️ Speed Control Parameters

| Parameter | Speed Impact | Use Case |
|-----------|--------------|----------|
| `--maxWorkers=100%` | 🚀 Maximum | Unit tests, error detection |
| `--maxWorkers=75%` | ⚡ High | General testing, CI |
| `--maxWorkers=50%` | 🔥 Medium | Integration tests |
| `--maxWorkers=25%` | 📊 Conservative | Accessibility, heavy tests |
| `--cache` | 🚀 Essential | Always use (SWC cache) |
| `--silent` | ⚡ High | Reduces output overhead |
| `--bail` | 🚀 Maximum | Stop on first failure |
| `--reporters=dot` | ⚡ High | Minimal progress output |
| `--reporters=summary` | 🔥 Medium | Just final summary |

## 🔍 Error Detection Workflow

### Step 1: Quick Health (5 seconds)
```bash
pnpm test --silent --bail --maxWorkers=100% --cache --reporters=summary
```

### Step 2: Error Analysis (10 seconds)  
```bash
pnpm test --silent --onlyFailures --maxWorkers=75% --cache | head -15
```

### Step 3: Specific Investigation (3 seconds)
```bash
pnpm test failing-test.tsx --maxWorkers=1 --cache --silent --reporters=default
```

## 📊 Category-Specific Speed Commands

```bash
# Unit Tests (Fastest)
pnpm test:unit --maxWorkers=100% --cache --silent --reporters=dot

# Integration Tests (Medium)  
pnpm test:integration --maxWorkers=50% --cache --silent --reporters=summary

# Accessibility Tests (Conservative)
pnpm test:accessibility --maxWorkers=25% --cache --silent --reporters=dot

# Performance Tests (Controlled)
pnpm test:performance --maxWorkers=25% --cache --silent --reporters=summary
```

## 🛠️ Troubleshooting Speed Issues

### Cache Problems
```bash
# Clear and rebuild cache
pnpm test --clearCache && pnpm test --cache --silent --bail --reporters=dot

# Check cache effectiveness  
time pnpm test --cache --silent --bail && echo "With cache" && \
time pnpm test --no-cache --silent --bail && echo "Without cache"
```

### Worker Optimization
```bash
# Test optimal worker count
pnpm test --maxWorkers=25% --silent --reporters=dot && echo "25%" && \
pnpm test --maxWorkers=50% --silent --reporters=dot && echo "50%" && \
pnpm test --maxWorkers=75% --silent --reporters=dot && echo "75%" && \
pnpm test --maxWorkers=100% --silent --reporters=dot && echo "100%"
```

### Memory Issues
```bash
# Conservative memory usage
pnpm test --maxWorkers=25% --cache --silent --reporters=summary

# Monitor memory during tests
time -v pnpm test --maxWorkers=75% --cache --silent --reporters=summary
```

## 🎯 LLM Token-Efficient Commands

### Minimal Output (Save Tokens)
```bash
# Just pass/fail count
pnpm test --silent --reporters=summary --maxWorkers=100% --cache --bail

# Error count only
pnpm test --silent --maxWorkers=100% --cache 2>&1 | grep -c "FAIL\|Error\|✕"

# Failed test names only
pnpm test --silent --listTests --onlyFailures --maxWorkers=75%
```

### Structured Error Capture
```bash
# JSON for parsing (fast)
pnpm test --reporters=json --outputFile=results.json --silent --maxWorkers=100% --cache

# Extract errors programmatically
jq '.testResults[] | select(.status=="failed") | .message' results.json | head -10
```

## ⚙️ Next.js SWC Optimization

### Leverage SWC Cache
```bash
# Ensure SWC cache is enabled
NEXT_CACHE_ENABLED=true pnpm test --cache --silent --maxWorkers=100% --reporters=summary

# Force SWC cache rebuild if needed
pnpm test --clearCache && NEXT_CACHE_ENABLED=true pnpm test --cache --silent --bail
```

### SWC Performance Monitoring
```bash
# Compare with/without SWC optimizations
time pnpm test --cache --silent --bail --reporters=dot
time pnpm test --no-cache --silent --bail --reporters=dot
```

## 🚨 Emergency Commands (When Tests Are Broken)

### Instant Status Check
```bash
pnpm test --silent --bail --maxWorkers=1 --reporters=summary 2>&1 | tail -5
```

### Quick Error Extraction
```bash
pnpm test --silent --maxWorkers=100% --cache 2>&1 | grep -E "FAIL|Error|✕" | head -5
```

### Single Test Isolation
```bash
pnpm test specific.test.tsx --maxWorkers=1 --cache --silent --verbose
```

## 🖥️ Windows PowerShell Fast Test Commands

### Benchmarking Commands (Copy & Paste Ready)

#### Single Test Benchmark
```powershell
# Basic benchmark
Measure-Command { pnpm test src/path/to/test.tsx --silent --reporters=summary } | Select-Object TotalSeconds

# With cache optimization
Measure-Command { pnpm test src/path/to/test.tsx --maxWorkers=100% --cache --silent --reporters=summary } | Select-Object TotalSeconds

# Memory-optimized benchmark
Measure-Command { pnpm test src/path/to/test.tsx --maxWorkers=50% --cache --silent --reporters=dot } | Select-Object TotalSeconds
```

#### Performance Comparison
```powershell
# Compare different worker configurations
Write-Host "=== 25% Workers ===" -ForegroundColor Yellow
Measure-Command { pnpm test src/path/to/test.tsx --maxWorkers=25% --cache --silent --reporters=dot } | Select-Object TotalSeconds

Write-Host "=== 50% Workers ===" -ForegroundColor Yellow  
Measure-Command { pnpm test src/path/to/test.tsx --maxWorkers=50% --cache --silent --reporters=dot } | Select-Object TotalSeconds

Write-Host "=== 75% Workers ===" -ForegroundColor Yellow
Measure-Command { pnpm test src/path/to/test.tsx --maxWorkers=75% --cache --silent --reporters=dot } | Select-Object TotalSeconds

Write-Host "=== 100% Workers ===" -ForegroundColor Yellow
Measure-Command { pnpm test src/path/to/test.tsx --maxWorkers=100% --cache --silent --reporters=dot } | Select-Object TotalSeconds
```

#### Cache Performance Test
```powershell
# Test cache effectiveness
Write-Host "=== Cold Cache ===" -ForegroundColor Red
pnpm test --clearCache | Out-Null
Measure-Command { pnpm test src/path/to/test.tsx --cache --silent --reporters=summary } | Select-Object TotalSeconds

Write-Host "=== Warm Cache ===" -ForegroundColor Green
Measure-Command { pnpm test src/path/to/test.tsx --cache --silent --reporters=summary } | Select-Object TotalSeconds
```

### Ultra-Fast Commands for Daily Use

#### Instant Health Check (< 2 seconds with cache)
```powershell
pnpm test --maxWorkers=100% --cache --silent --reporters=summary --bail
```

#### Error-Only Detection (< 3 seconds)
```powershell
pnpm test --silent --onlyFailures --maxWorkers=100% --cache --reporters=dot
```

#### Memory-Optimized Testing (for large test suites)
```powershell
pnpm test --maxWorkers=50% --cache --silent --reporters=summary
```

#### Single File Lightning Test
```powershell
pnpm test src/components/Button.test.tsx --maxWorkers=1 --cache --silent --reporters=dot
```

### Performance Monitoring Scripts

#### Full Performance Analysis
```powershell
# Create performance report
$results = @()

Write-Host "Testing different configurations..." -ForegroundColor Cyan

# Test different worker counts
@(25, 50, 75, 100) | ForEach-Object {
    $workers = $_
    Write-Host "Testing $workers% workers..." -ForegroundColor Yellow
    
    $time = Measure-Command { 
        pnpm test src/lib/testing/__tests__/react19-compatibility.unit.test.tsx --maxWorkers=$workers% --cache --silent --reporters=dot 2>$null
    }
    
    $results += [PSCustomObject]@{
        Workers = "$workers%"
        Time = [math]::Round($time.TotalSeconds, 2)
    }
}

# Display results
$results | Format-Table -AutoSize
$fastest = $results | Sort-Object Time | Select-Object -First 1
Write-Host "Fastest configuration: $($fastest.Workers) workers in $($fastest.Time)s" -ForegroundColor Green
```

#### Memory Usage Monitoring
```powershell
# Monitor memory during test execution
$before = Get-Process -Name node -ErrorAction SilentlyContinue | Measure-Object WorkingSet -Sum
pnpm test src/path/to/test.tsx --maxWorkers=75% --cache --silent --reporters=summary
$after = Get-Process -Name node -ErrorAction SilentlyContinue | Measure-Object WorkingSet -Sum

if ($before -and $after) {
    $memoryDiff = [math]::Round(($after.Sum - $before.Sum) / 1MB, 2)
    Write-Host "Memory usage change: $memoryDiff MB" -ForegroundColor $(if($memoryDiff -gt 50) {"Red"} else {"Green"})
}
```

### Troubleshooting Commands

#### Clear All Caches and Test
```powershell
Write-Host "Clearing all caches..." -ForegroundColor Yellow
pnpm test --clearCache | Out-Null
Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "node_modules/.cache" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Running clean test..." -ForegroundColor Green
Measure-Command { pnpm test src/path/to/test.tsx --cache --silent --reporters=summary } | Select-Object TotalSeconds
```

#### Memory Leak Detection
```powershell
# Run test with memory monitoring
Write-Host "Monitoring for memory leaks..." -ForegroundColor Yellow
$output = pnpm test src/path/to/test.tsx --maxWorkers=50% --cache --silent --reporters=default 2>&1
if ($output -match "memory leak") {
    Write-Host "⚠️  Memory leak detected!" -ForegroundColor Red
    Write-Host "Consider using --maxWorkers=25% for this test" -ForegroundColor Yellow
} else {
    Write-Host "✅ No memory leaks detected" -ForegroundColor Green
}
```

### Recommended Daily Workflow

#### Morning Health Check
```powershell
Write-Host "🌅 Morning Test Health Check" -ForegroundColor Cyan
Measure-Command { pnpm test --maxWorkers=75% --cache --silent --reporters=summary --bail } | Select-Object TotalSeconds
```

#### Pre-Commit Fast Check
```powershell
Write-Host "🚀 Pre-commit Fast Check" -ForegroundColor Green
Measure-Command { pnpm test --onlyChanged --maxWorkers=100% --cache --silent --reporters=dot } | Select-Object TotalSeconds
```

#### Error Investigation
```powershell
Write-Host "🔍 Error Investigation Mode" -ForegroundColor Red
pnpm test --silent --onlyFailures --maxWorkers=100% --cache --reporters=default | Select-String -Pattern "FAIL|Error|✕" | Select-Object -First 10
```

## 🎯 High-Speed Error Capture Strategies

### SWC-Optimized Error Filtering
```bash
# Fast compilation + error extraction
pnpm test --silent --maxWorkers=100% --cache 2>&1 | grep -E "(FAIL|Error|✕|Failed|Exception)"

# Speed + structured logging
pnpm test --silent --reporters=summary --maxWorkers=75% > test.log 2>&1 && tail -20 test.log

# Parallel execution + error focus
pnpm test --silent --onlyFailures --maxWorkers=100% 2>&1 | grep -A 3 -B 1 "FAIL\|Error\|✕"
```

### Performance-First Error Extraction
```bash
# SWC speed + custom filtering
pnpm test --silent --maxWorkers=100% --cache 2>&1 | awk '/FAIL|Error|✕/{flag=1} flag{print} /PASS/{flag=0}'

# Playwright with speed optimization
pnpm test:e2e --reporter=line --workers=4 2>&1 | grep -E "✘|failed|error" -A 3
```

### Fast Structured Error Capture
```bash
# JSON with SWC compilation cache
pnpm test --reporters=json --outputFile=results.json --silent --cache --maxWorkers=100%
# Parse errors: jq '.testResults[] | select(.status=="failed") | .message' results.json

# Playwright JSON optimized
pnpm test:e2e --reporter=json --output=e2e-results.json --workers=4
# Fast parse: jq '.suites[].specs[] | select(.tests[].results[].status=="failed")' e2e-results.json
```

### Speed-Optimized Error Analysis
```bash
# Fastest error detection
pnpm test --silent --bail --maxWorkers=100% --cache 2>&1 | head -20

# Parallel error categorization
pnpm test --silent --maxWorkers=75% 2>&1 | grep -c "FAIL\|Error\|✕" | xargs echo "Total errors:"

# Quick error summary with SWC speed
pnpm test --silent --reporters=summary --maxWorkers=100% --onlyFailures
```

## 🔥 Ultra-Fast Token-Efficient Error Analysis

### Lightning-Speed Error Summary
```bash
# Instant error overview with SWC
pnpm test --silent --reporters=summary --maxWorkers=100% --cache 2>&1 | tail -10

# Fast failed test discovery
pnpm test --silent --listTests --onlyFailures --maxWorkers=75%

# Speed-optimized error counting
pnpm test --silent --bail --maxWorkers=100% 2>&1 | grep -c "FAIL\|Error\|✕" && echo "errors found"
```

### Rapid Error Investigation
```bash
# Parallel failure analysis
pnpm test --silent --onlyFailures --maxWorkers=100% --cache --reporters=default

# Single file: Maximum SWC speed
pnpm test src/components/Button.test.tsx --silent --maxWorkers=1 --cache --reporters=default

# Pattern matching with speed
pnpm test --testNamePattern="should handle errors" --silent --maxWorkers=75% --reporters=summary
```

### High-Speed Progressive Diagnosis
```bash
# Step 1: Instant health check (SWC + bail)
pnpm test --silent --reporters=summary --bail --maxWorkers=100% --cache

# Step 2: Fast failure summary (parallel + cache)
pnpm test --silent --onlyFailures --maxWorkers=75% --cache --reporters=default | head-30

# Step 3: Category-specific speed analysis
pnpm test:unit --silent --onlyFailures --maxWorkers=100% --cache --reporters=default
```

### Performance Monitoring During Tests
```bash
# Speed + memory monitoring
time pnpm test --silent --reporters=summary --maxWorkers=75% --cache

# Cache effectiveness check
pnpm test --silent --cache --reporters=summary && echo "Cache hit" || echo "Cache miss"

# Parallel efficiency test
pnpm test --silent --maxWorkers=25% --reporters=dot && echo "25% workers" && \
pnpm test --silent --maxWorkers=100% --reporters=dot && echo "100% workers"
```

## 🎭 Playwright E2E Testing

### Minimal E2E Output
```bash
# Basic minimal output
pnpm test:e2e --reporter=dot

# Line reporter (one line per test)
pnpm test:e2e --reporter=line

# JSON output for parsing
pnpm test:e2e --reporter=json --output=e2e-results.json
```

### Specific E2E Categories (Minimal)
```bash
# Visual tests - minimal output
pnpm test:e2e:visual --reporter=dot

# Cross-browser - summary only
pnpm test:e2e:cross-browser --reporter=line

# Mobile tests - minimal
pnpm test:e2e:mobile --reporter=dot
```

### Failed Tests Only
```bash
# Show only failures with minimal context
pnpm test:e2e --reporter=line --grep="@failing"

# Retry failed tests with minimal output
pnpm test:e2e --reporter=dot --last-failed
```

## 🌍 Environment-Specific Optimizations

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

## 🔧 Output Parsing for Token Efficiency

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

## 🎯 LLM Testing Workflow

For AI assistants running tests to diagnose issues with maximum speed:

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

## 💡 Pro Tips

- **Always use `--cache`** with Next.js SWC for maximum speed
- **SWC + Jest caching** can make tests 5-10x faster than Babel setups
- **Default recommendation**: `pnpm test --silent --maxWorkers=75% --cache --reporters=summary`
- **For Windows**: Use `Measure-Command` instead of `time` for benchmarking
- **Memory-aware execution**: Use `--maxWorkers=50%` for tests with memory leaks
- **Token efficiency**: Use `--silent --reporters=summary` to minimize output for LLM processing

## 📖 Related Documentation

- [Technical Implementation Guidelines](../backend/technical-implementation-guidelines.md)
- [Frontend Testing Strategy](../frontend/testing-strategy.md)
- [CI/CD Pipeline Configuration](../system-documentation/ci-cd-pipeline.md)

---

**🎯 Quick Reference**: For the fastest test execution, always combine `--maxWorkers=100%`, `--cache`, `--silent`, and appropriate reporters based on your needs.

This approach ensures maximum error capture with minimal token usage, focusing on actionable information while filtering out verbose test output.