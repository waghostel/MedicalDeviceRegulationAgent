# 🧪 Test Guide - Medical Device Regulatory Assistant

## Overview

This directory contains comprehensive testing guides for the Medical Device Regulatory Assistant project, optimized for Next.js with SWC compilation and React 19 compatibility.

## 📚 Available Guides

### 🚀 Performance & Speed Optimization
- **[Fast Test Guide](./fast-test-guide.md)** - Lightning-fast Jest testing with Next.js SWC optimization
- **[Windows PowerShell Commands](./windows-fast-test-commands.md)** - Windows-specific fast test commands and benchmarking
- **[Minimal Test Output & Error Capture](./minimal-test-output-error-capture.md)** - Comprehensive guide for optimized test execution

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

## 🛠️ Tech Stack

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

## 🎛️ Performance Hierarchy

1. **⚡ Ultra-Fast** (1-5s): `--bail --maxWorkers=100% --cache --silent --reporters=dot`
2. **🔥 Very Fast** (5-10s): `--maxWorkers=75% --cache --silent --reporters=summary`
3. **⚡ Fast** (10-20s): `--maxWorkers=50% --cache --silent`
4. **📊 Coverage** (20-30s): `--coverage --maxWorkers=75% --cache --silent --coverageReporters=text-summary`

## 🔍 LLM Testing Workflow

For AI assistants running tests to diagnose issues:

1. **Start with SWC speed**: Use `--maxWorkers=100% --cache --reporters=summary --silent`
2. **Focus on failures fast**: Add `--onlyFailures --maxWorkers=75%` for rapid error detection
3. **Progressive detail**: Start with `--bail` for instant feedback, add `--verbose` only for specific failures
4. **Memory-aware execution**: Use `--maxWorkers=50%` for tests with memory leaks

## 🚨 Emergency Commands

### When Tests Are Broken
```bash
# Instant status check
pnpm test --silent --bail --maxWorkers=1 --reporters=summary 2>&1 | tail -5

# Quick error extraction
pnpm test --silent --maxWorkers=100% --cache 2>&1 | grep -E "FAIL|Error|✕" | head -5

# Single test isolation
pnpm test specific.test.tsx --maxWorkers=1 --cache --silent --verbose
```

## 💡 Pro Tips

- **Always use `--cache`** with Next.js SWC for maximum speed
- **SWC + Jest caching** can make tests 5-10x faster than Babel setups
- **Default recommendation**: `pnpm test --silent --maxWorkers=75% --cache --reporters=summary`
- **For Windows**: Use `Measure-Command` instead of `time` for benchmarking

## 📖 Related Documentation

- [Technical Implementation Guidelines](../backend/technical-implementation-guidelines.md)
- [Frontend Testing Strategy](../frontend/testing-strategy.md)
- [CI/CD Pipeline Configuration](../system-documentation/ci-cd-pipeline.md)

---

**🎯 Quick Reference**: For the fastest test execution, always combine `--maxWorkers=100%`, `--cache`, `--silent`, and appropriate reporters based on your needs.