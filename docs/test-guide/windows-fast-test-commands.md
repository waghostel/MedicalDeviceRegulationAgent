# ⚡ Windows PowerShell Fast Test Commands

## 🎯 Benchmarking Commands (Copy & Paste Ready)

### Single Test Benchmark
```powershell
# Basic benchmark
Measure-Command { pnpm test src/path/to/test.tsx --silent --reporters=summary } | Select-Object TotalSeconds

# With cache optimization
Measure-Command { pnpm test src/path/to/test.tsx --maxWorkers=100% --cache --silent --reporters=summary } | Select-Object TotalSeconds

# Memory-optimized benchmark
Measure-Command { pnpm test src/path/to/test.tsx --maxWorkers=50% --cache --silent --reporters=dot } | Select-Object TotalSeconds
```

### Performance Comparison
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

### Cache Performance Test
```powershell
# Test cache effectiveness
Write-Host "=== Cold Cache ===" -ForegroundColor Red
pnpm test --clearCache | Out-Null
Measure-Command { pnpm test src/path/to/test.tsx --cache --silent --reporters=summary } | Select-Object TotalSeconds

Write-Host "=== Warm Cache ===" -ForegroundColor Green
Measure-Command { pnpm test src/path/to/test.tsx --cache --silent --reporters=summary } | Select-Object TotalSeconds
```

## 🔥 Ultra-Fast Commands for Daily Use

### Instant Health Check (< 2 seconds with cache)
```powershell
pnpm test --maxWorkers=100% --cache --silent --reporters=summary --bail
```

### Error-Only Detection (< 3 seconds)
```powershell
pnpm test --silent --onlyFailures --maxWorkers=100% --cache --reporters=dot
```

### Memory-Optimized Testing (for large test suites)
```powershell
pnpm test --maxWorkers=50% --cache --silent --reporters=summary
```

### Single File Lightning Test
```powershell
pnpm test src/components/Button.test.tsx --maxWorkers=1 --cache --silent --reporters=dot
```

## 📈 Performance Monitoring Scripts

### Full Performance Analysis
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

### Memory Usage Monitoring
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

## 🛠️ Troubleshooting Commands

### Clear All Caches and Test
```powershell
Write-Host "Clearing all caches..." -ForegroundColor Yellow
pnpm test --clearCache | Out-Null
Remove-Item -Path ".next" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -Path "node_modules/.cache" -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Running clean test..." -ForegroundColor Green
Measure-Command { pnpm test src/path/to/test.tsx --cache --silent --reporters=summary } | Select-Object TotalSeconds
```

### Memory Leak Detection
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

## 🎯 Recommended Daily Workflow

### Morning Health Check
```powershell
Write-Host "🌅 Morning Test Health Check" -ForegroundColor Cyan
Measure-Command { pnpm test --maxWorkers=75% --cache --silent --reporters=summary --bail } | Select-Object TotalSeconds
```

### Pre-Commit Fast Check
```powershell
Write-Host "🚀 Pre-commit Fast Check" -ForegroundColor Green
Measure-Command { pnpm test --onlyChanged --maxWorkers=100% --cache --silent --reporters=dot } | Select-Object TotalSeconds
```

### Error Investigation
```powershell
Write-Host "🔍 Error Investigation Mode" -ForegroundColor Red
pnpm test --silent --onlyFailures --maxWorkers=100% --cache --reporters=default | Select-String -Pattern "FAIL|Error|✕" | Select-Object -First 10
```

---

**💡 Pro Tips for Windows:**
- Use `Measure-Command` instead of `time` for benchmarking
- Add `2>$null` to suppress stderr in performance tests
- Use `--maxWorkers=75%` as the sweet spot for most Windows systems
- Clear `.next` cache if you see inconsistent performance