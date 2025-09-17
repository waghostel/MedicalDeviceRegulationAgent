# ⚡ Lightning-Fast Jest Testing Guide - Next.js SWC Optimized

## 🎯 Quick Commands (Copy & Paste Ready)

### Instant Health Check (< 5 seconds)
```bash
pnpm test:fast
# OR
pnpm test --silent --maxWorkers=100% --cache --reporters=summary --bail
```

### Error-Only Analysis (< 10 seconds)
```bash
pnpm test:errors
# OR  
pnpm test --silent --onlyFailures --maxWorkers=100% --cache | head -20
```

### Single File Debug (< 3 seconds)
```bash
pnpm test:file src/components/Button.test.tsx
# OR
pnpm test src/components/Button.test.tsx --maxWorkers=1 --cache --silent
```

### Coverage Summary (< 15 seconds)
```bash
pnpm test:coverage:fast
# OR
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

---

**💡 Pro Tip**: Always use `--cache` with Next.js SWC for maximum speed. The combination of SWC compilation + Jest caching can make tests 5-10x faster than traditional Babel setups.

**🎯 Default Recommendation**: `pnpm test --silent --maxWorkers=75% --cache --reporters=summary` for the best balance of speed and reliability.