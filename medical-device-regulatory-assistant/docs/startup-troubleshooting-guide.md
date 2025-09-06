# Startup Troubleshooting Guide

## Overview

This guide helps resolve common startup issues with the Medical Device Regulatory Assistant. The optimized startup script reduces startup time from 8+ seconds to under 5 seconds while providing better error handling and diagnostics.

## Quick Start Options

### Standard Startup
```powershell
.\start-dev.ps1
```

### Optimized Startup (Recommended)
```powershell
.\start-dev-optimized.ps1
```

### Fast Startup (Skip Checks)
```powershell
.\start-dev-optimized.ps1 -SkipChecks
```

### Parallel Startup (Fastest)
```powershell
.\start-dev-optimized.ps1 -Parallel -SkipChecks
```

### Custom Ports
```powershell
.\start-dev-optimized.ps1 -BackendPort 8001 -FrontendPort 3001
```

## Common Issues and Solutions

### 1. Port Already in Use

**Error**: `Port 8000 is already in use` or `EADDRINUSE`

**Solutions**:
```powershell
# Option 1: Use different ports
.\start-dev-optimized.ps1 -BackendPort 8001 -FrontendPort 3001

# Option 2: Kill processes using the ports
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Option 3: Use automatic port resolution
.\start-dev-optimized.ps1  # Automatically finds available ports
```

### 2. Prerequisites Not Installed

**Error**: `pnpm is not installed` or `Poetry is not available`

**Solutions**:

#### Install pnpm
```powershell
# Option 1: Via npm
npm install -g pnpm

# Option 2: Via PowerShell
iwr https://get.pnpm.io/install.ps1 -useb | iex

# Option 3: Via Chocolatey
choco install pnpm
```

#### Install Poetry
```powershell
# Option 1: Via PowerShell (Recommended)
(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -

# Option 2: Via pip
pip install poetry

# Option 3: Via Chocolatey
choco install poetry
```

### 3. Dependency Installation Failures

**Error**: `Failed to install frontend/backend dependencies`

**Solutions**:

#### Frontend Dependencies
```powershell
# Clear cache and reinstall
cd medical-device-regulatory-assistant
Remove-Item node_modules -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item pnpm-lock.yaml -ErrorAction SilentlyContinue
pnpm install

# Use different registry if needed
pnpm install --registry https://registry.npmjs.org/
```

#### Backend Dependencies
```powershell
# Clear poetry cache and reinstall
cd medical-device-regulatory-assistant/backend
poetry env remove python
poetry install

# Install with verbose output for debugging
poetry install -vvv
```

### 4. Slow Startup Performance

**Current Performance**: 8+ seconds
**Target Performance**: < 5 seconds

**Optimization Strategies**:

#### Use Optimized Script
```powershell
# Standard optimized startup
.\start-dev-optimized.ps1

# Skip prerequisite checks (saves ~2 seconds)
.\start-dev-optimized.ps1 -SkipChecks

# Parallel service startup (saves ~1-2 seconds)
.\start-dev-optimized.ps1 -Parallel

# Maximum speed (saves ~3-4 seconds)
.\start-dev-optimized.ps1 -SkipChecks -Parallel
```

#### System Optimizations
```powershell
# Disable Windows Defender real-time scanning for project folder
# Add exclusion in Windows Security > Virus & threat protection > Exclusions

# Use SSD storage for better I/O performance
# Ensure project is on SSD, not HDD

# Close unnecessary applications to free up system resources
```

### 5. Database Connection Issues

**Error**: `Database manager not initialized` or `SQLite errors`

**Solutions**:
```powershell
# Check database file permissions
cd medical-device-regulatory-assistant/backend
Get-Acl medical_device_assistant.db

# Recreate database if corrupted
Remove-Item medical_device_assistant.db -ErrorAction SilentlyContinue
poetry run python -c "from database.connection import init_database; import asyncio; asyncio.run(init_database())"

# Check disk space
Get-WmiObject -Class Win32_LogicalDisk | Select-Object DeviceID, @{Name="FreeSpace(GB)";Expression={[math]::Round($_.FreeSpace/1GB,2)}}
```

### 6. Redis Connection Issues

**Error**: `Redis connection refused` or `Redis not available`

**Note**: Redis is optional and the application works without it.

**Solutions**:
```powershell
# Option 1: Install Redis (see redis-setup-guide.md)
.\setup-redis-windows.ps1

# Option 2: Continue without Redis (recommended for development)
# The application will show Redis as "not_available" but remain healthy

# Option 3: Disable Redis checks
$env:DISABLE_REDIS = "true"
.\start-dev-optimized.ps1
```

### 7. Health Check Failures

**Error**: `Backend health check failed` or `503 Service Unavailable`

**Solutions**:
```powershell
# Check health status manually
curl http://localhost:8000/health

# Check individual components
curl http://localhost:8000/api/health/database
curl http://localhost:8000/api/health/fda-api

# View detailed health information
curl http://localhost:8000/health | ConvertFrom-Json | ConvertTo-Json -Depth 10
```

### 8. Frontend Build Issues

**Error**: `Frontend compilation failed` or `Module not found`

**Solutions**:
```powershell
# Clear Next.js cache
cd medical-device-regulatory-assistant
Remove-Item .next -Recurse -Force -ErrorAction SilentlyContinue

# Reinstall dependencies
Remove-Item node_modules -Recurse -Force
pnpm install

# Check for TypeScript errors
pnpm run type-check

# Build in development mode
pnpm run build
```

### 9. Permission Errors

**Error**: `Access denied` or `Permission denied`

**Solutions**:
```powershell
# Run PowerShell as Administrator
# Right-click PowerShell > "Run as Administrator"

# Check execution policy
Get-ExecutionPolicy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Fix file permissions
cd medical-device-regulatory-assistant
icacls . /grant Everyone:F /T
```

### 10. Network/Firewall Issues

**Error**: `Connection refused` or `Network unreachable`

**Solutions**:
```powershell
# Check Windows Firewall
# Allow Node.js and Python through Windows Firewall

# Test network connectivity
Test-NetConnection -ComputerName localhost -Port 8000
Test-NetConnection -ComputerName localhost -Port 3000

# Disable proxy temporarily
$env:HTTP_PROXY = ""
$env:HTTPS_PROXY = ""
```

## Performance Monitoring

### Startup Time Measurement

The optimized script includes built-in performance tracking:

```powershell
# Example output
[0.1s] Initializing optimized startup...
[0.3s] Located project directory
[0.5s] Checking port availability...
[1.2s] Verifying prerequisites...
[1.4s] ✓ pnpm: 9.0.0
[1.6s] ✓ poetry: Poetry (version 2.1.4)
[1.8s] Checking dependencies...
[2.1s] ✓ Frontend dependencies ready
[2.3s] ✓ Backend dependencies ready
[2.5s] Starting backend service...
[3.2s] Starting frontend service...
[4.1s] Services started in 4.1 seconds!
[4.8s] ✓ Backend health check passed
```

### Performance Targets

| Metric | Target | Current | Optimized |
|--------|--------|---------|-----------|
| Total Startup Time | < 5s | 8-12s | 3-5s |
| Prerequisite Check | < 1s | 2-3s | 0.5-1s |
| Dependency Check | < 2s | 3-5s | 1-2s |
| Service Startup | < 3s | 4-6s | 2-3s |
| Health Check | < 1s | 1-2s | 0.5-1s |

## Diagnostic Commands

### System Information
```powershell
# Check system resources
Get-ComputerInfo | Select-Object TotalPhysicalMemory, CsProcessors
Get-Process | Where-Object {$_.ProcessName -match "node|python|uvicorn"} | Select-Object ProcessName, CPU, WorkingSet

# Check disk performance
Get-PhysicalDisk | Select-Object DeviceID, MediaType, OperationalStatus
```

### Service Status
```powershell
# Check running services
Get-Process | Where-Object {$_.ProcessName -match "node|python"}
netstat -ano | findstr ":8000\|:3000"

# Test endpoints
Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 5
Invoke-RestMethod -Uri "http://localhost:3000" -TimeoutSec 5
```

### Log Analysis
```powershell
# Backend logs
cd medical-device-regulatory-assistant/backend
Get-Content medical_device_assistant.log -Tail 50

# Check for errors in recent logs
Select-String -Path "medical_device_assistant.log" -Pattern "ERROR|CRITICAL" | Select-Object -Last 10
```

## Automated Troubleshooting

### Health Check Script
```powershell
# Create automated health check
$healthScript = @"
Write-Host "Medical Device Assistant Health Check" -ForegroundColor Cyan
Write-Host "=" * 50

# Check prerequisites
try { pnpm --version | Out-Null; Write-Host "✓ pnpm installed" -ForegroundColor Green } catch { Write-Host "✗ pnpm missing" -ForegroundColor Red }
try { poetry --version | Out-Null; Write-Host "✓ poetry installed" -ForegroundColor Green } catch { Write-Host "✗ poetry missing" -ForegroundColor Red }

# Check ports
if (Test-NetConnection -ComputerName localhost -Port 8000 -InformationLevel Quiet) { Write-Host "✓ Backend running" -ForegroundColor Green } else { Write-Host "✗ Backend not running" -ForegroundColor Red }
if (Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet) { Write-Host "✓ Frontend running" -ForegroundColor Green } else { Write-Host "✗ Frontend not running" -ForegroundColor Red }

# Check health endpoint
try {
    $health = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 5
    if ($health.healthy) { Write-Host "✓ System healthy" -ForegroundColor Green } else { Write-Host "⚠ System unhealthy" -ForegroundColor Yellow }
} catch {
    Write-Host "✗ Health check failed" -ForegroundColor Red
}
"@

$healthScript | Out-File -FilePath "health-check.ps1" -Encoding UTF8
```

### Cleanup Script
```powershell
# Create cleanup script for stuck processes
$cleanupScript = @"
Write-Host "Cleaning up Medical Device Assistant processes..." -ForegroundColor Yellow

# Kill Node.js processes
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force -ErrorAction SilentlyContinue

# Kill Python processes (be careful with this)
Get-Process | Where-Object {$_.ProcessName -eq "python" -and $_.MainWindowTitle -match "uvicorn"} | Stop-Process -Force -ErrorAction SilentlyContinue

# Clear ports
netstat -ano | findstr ":8000" | ForEach-Object { $pid = ($_ -split '\s+')[-1]; taskkill /PID $pid /F 2>$null }
netstat -ano | findstr ":3000" | ForEach-Object { $pid = ($_ -split '\s+')[-1]; taskkill /PID $pid /F 2>$null }

Write-Host "Cleanup complete" -ForegroundColor Green
"@

$cleanupScript | Out-File -FilePath "cleanup-processes.ps1" -Encoding UTF8
```

## Best Practices

### Development Workflow
1. **Use the optimized startup script** for daily development
2. **Skip checks** when you know prerequisites are installed
3. **Use parallel startup** for maximum speed
4. **Monitor performance** with the built-in timing
5. **Check health endpoints** after startup

### System Maintenance
1. **Regularly update dependencies** with `pnpm update` and `poetry update`
2. **Clear caches** periodically to avoid build issues
3. **Monitor disk space** to prevent database issues
4. **Keep antivirus exclusions** updated for the project folder
5. **Restart services** if they become unresponsive

### Troubleshooting Workflow
1. **Check the error message** for specific guidance
2. **Use the health check script** to diagnose issues
3. **Try the cleanup script** if processes are stuck
4. **Restart with different ports** if there are conflicts
5. **Check the logs** for detailed error information

This troubleshooting guide should help resolve most startup issues and optimize performance for the Medical Device Regulatory Assistant.