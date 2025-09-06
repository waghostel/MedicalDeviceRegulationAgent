# Troubleshooting Guide

## Overview

This comprehensive troubleshooting guide helps resolve common issues encountered when setting up, running, and maintaining the Medical Device Regulatory Assistant across different platforms.

## Quick Diagnostic Commands

### System Health Check
```bash
# Check all services
./monitor-system-health.ps1 -Mode single  # Windows
./monitor-system-health.sh --mode single  # Linux/macOS

# Check individual components
curl http://localhost:8000/health         # Backend health
curl http://localhost:3000                # Frontend health
```

### Service Status Check
```bash
# Windows
Get-Process | Where-Object {$_.ProcessName -match "node|python"}

# Linux/macOS
ps aux | grep -E "(node|python|uvicorn)"
netstat -tulpn | grep -E ":(3000|8000)"
```

## Common Issues and Solutions

### 1. Services Won't Start

#### Issue: "Port already in use"
**Symptoms:**
- Error messages about port 3000 or 8000 being in use
- Services fail to start with EADDRINUSE error

**Diagnosis:**
```bash
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :8000

# Linux/macOS
lsof -i :3000
lsof -i :8000
```

**Solutions:**
```bash
# Windows - Kill process by PID
taskkill /PID <PID> /F

# Linux/macOS - Kill process by PID
kill -9 <PID>

# Or use different ports
./start-backend.ps1 -Port 8001    # Windows
./start-backend.sh --port 8001    # Linux/macOS
```

#### Issue: "Permission denied"
**Symptoms:**
- Scripts fail to execute
- "Access denied" or "Permission denied" errors

**Solutions:**
```bash
# Windows - Set execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Linux/macOS - Make scripts executable
chmod +x *.sh

# Fix file ownership
sudo chown -R $USER:$USER .  # Linux/macOS
```

#### Issue: "Command not found"
**Symptoms:**
- "node: command not found"
- "python: command not found"
- "poetry: command not found"

**Solutions:**
```bash
# Check if installed
node --version
python --version
poetry --version

# Add to PATH (Linux/macOS)
export PATH="$HOME/.local/bin:$PATH"
export PATH="/usr/local/bin:$PATH"

# Windows - Reinstall or repair installation
choco install nodejs python poetry
```

### 2. Database Issues

#### Issue: "Database locked" or "Database is locked"
**Symptoms:**
- SQLite database operations fail
- "database is locked" error messages

**Diagnosis:**
```bash
# Check for database file
ls -la medical_device_assistant.db*

# Check for lock files
ls -la *.db-*

# Check processes using database
lsof medical_device_assistant.db  # Linux/macOS
```

**Solutions:**
```bash
# Stop all services first
./stop-all-services.sh  # or Ctrl+C

# Remove lock files (if safe)
rm medical_device_assistant.db-shm
rm medical_device_assistant.db-wal

# Restart services
./start-dev.sh
```

#### Issue: "No such table" errors
**Symptoms:**
- Database queries fail with table not found
- Fresh installation database errors

**Solutions:**
```bash
# Delete database to recreate
rm medical_device_assistant.db*

# Restart backend (will recreate database)
./start-backend.sh

# Or run database initialization
cd backend
poetry run python -c "from database.connection import init_database; import asyncio; asyncio.run(init_database())"
```

#### Issue: Database corruption
**Symptoms:**
- "database disk image is malformed"
- Inconsistent data or query failures

**Solutions:**
```bash
# Backup current database
cp medical_device_assistant.db medical_device_assistant.db.backup

# Try to repair
sqlite3 medical_device_assistant.db ".recover" | sqlite3 medical_device_assistant_recovered.db

# If repair fails, restore from backup
cp backups/database/medical_device_assistant-*.db medical_device_assistant.db
```

### 3. Network and API Issues

#### Issue: "FDA API not accessible"
**Symptoms:**
- Health checks fail for FDA API
- Timeout errors when accessing FDA endpoints

**Diagnosis:**
```bash
# Test FDA API directly
curl -v "https://api.fda.gov/device/510k.json?limit=1"

# Check DNS resolution
nslookup api.fda.gov

# Check network connectivity
ping api.fda.gov
```

**Solutions:**
```bash
# Check firewall settings
# Windows
netsh advfirewall show allprofiles

# Linux
sudo ufw status
sudo iptables -L

# Check proxy settings
echo $HTTP_PROXY
echo $HTTPS_PROXY

# Test with different DNS
# Temporarily use Google DNS: 8.8.8.8
```

#### Issue: CORS errors in browser
**Symptoms:**
- Browser console shows CORS errors
- Frontend cannot connect to backend

**Solutions:**
```bash
# Verify backend CORS configuration
curl -H "Origin: http://localhost:3000" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: X-Requested-With" \
     -X OPTIONS \
     http://localhost:8000/api/projects/

# Check backend logs for CORS issues
tail -f backend.log | grep -i cors
```

### 4. Authentication Issues

#### Issue: "Not authenticated" errors
**Symptoms:**
- API calls return 401 Unauthorized
- Authentication tokens not working

**Diagnosis:**
```bash
# Test authentication endpoints
cd backend
poetry run python test_auth_simple.py

# Check JWT token validity
poetry run python -c "
from services.auth import AuthService
auth = AuthService()
# Test with your token
"
```

**Solutions:**
```bash
# Check environment variables
echo $NEXTAUTH_SECRET

# Regenerate JWT secret
# Update .env.local with new NEXTAUTH_SECRET

# Clear browser cookies and localStorage
# Restart authentication flow
```

#### Issue: Google OAuth not working
**Symptoms:**
- OAuth redirect fails
- "Invalid client" errors

**Solutions:**
```bash
# Verify Google OAuth configuration
# Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET
# Verify redirect URLs in Google Console

# Test OAuth endpoints
curl http://localhost:3000/api/auth/providers
```

### 5. Performance Issues

#### Issue: Slow response times
**Symptoms:**
- API calls take longer than 10 seconds
- Frontend loading is slow

**Diagnosis:**
```bash
# Monitor performance
./performance-monitor.ps1  # Windows
./performance-monitor.sh   # Linux/macOS

# Check resource usage
# Windows
Get-Counter "\Process(node)\% Processor Time"
Get-Counter "\Process(python)\% Processor Time"

# Linux/macOS
top -p $(pgrep -f "node|python")
```

**Solutions:**
```bash
# Clear caches
# Redis cache
redis-cli FLUSHALL

# Node.js cache
rm -rf node_modules/.cache
rm -rf .next

# Python cache
find . -name "__pycache__" -type d -exec rm -rf {} +

# Restart services with fresh state
```

#### Issue: High memory usage
**Symptoms:**
- System becomes slow
- Out of memory errors

**Solutions:**
```bash
# Monitor memory usage
# Windows
Get-Counter "\Memory\Available MBytes"

# Linux/macOS
free -h
vm_stat  # macOS

# Restart services to free memory
./stop-all-services.sh
./start-dev.sh

# Increase system memory if needed
```

### 6. Frontend Issues

#### Issue: "Module not found" errors
**Symptoms:**
- Frontend fails to start
- Import errors in browser console

**Solutions:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install

# Clear Next.js cache
rm -rf .next

# Check for version conflicts
pnpm list --depth=0
```

#### Issue: Build failures
**Symptoms:**
- "pnpm build" fails
- TypeScript compilation errors

**Solutions:**
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Update dependencies
pnpm update

# Clear TypeScript cache
rm -rf .tsbuildinfo
```

### 7. Backend Issues

#### Issue: Python import errors
**Symptoms:**
- "ModuleNotFoundError" when starting backend
- Poetry environment issues

**Solutions:**
```bash
# Recreate Poetry environment
cd backend
poetry env remove python
poetry install

# Check Python path
poetry run python -c "import sys; print(sys.path)"

# Verify all dependencies
poetry check
poetry show
```

#### Issue: FastAPI startup errors
**Symptoms:**
- Backend fails to start
- Uvicorn errors

**Solutions:**
```bash
# Test FastAPI app directly
cd backend
poetry run python -c "from main import app; print('App loaded successfully')"

# Check for syntax errors
poetry run python -m py_compile main.py

# Run with debug mode
poetry run uvicorn main:app --reload --log-level debug
```

## Platform-Specific Issues

### Windows-Specific Issues

#### Issue: PowerShell execution policy
**Symptoms:**
- Scripts cannot be executed
- "Execution of scripts is disabled" error

**Solutions:**
```powershell
# Check current policy
Get-ExecutionPolicy

# Set policy for current user
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Temporarily bypass policy
powershell -ExecutionPolicy Bypass -File start-dev.ps1
```

#### Issue: Windows Defender blocking files
**Symptoms:**
- Files disappear after creation
- Antivirus warnings

**Solutions:**
```powershell
# Add exclusion for project directory
Add-MpPreference -ExclusionPath "C:\path\to\project"

# Temporarily disable real-time protection (not recommended)
Set-MpPreference -DisableRealtimeMonitoring $true
```

### Linux-Specific Issues

#### Issue: Permission denied for ports < 1024
**Symptoms:**
- Cannot bind to port 80 or 443
- "Permission denied" for low ports

**Solutions:**
```bash
# Use ports > 1024 (recommended)
./start-backend.sh --port 8000

# Or use sudo (not recommended for development)
sudo ./start-backend.sh --port 80

# Or use authbind
sudo apt install authbind
authbind --deep ./start-backend.sh --port 80
```

#### Issue: systemd service issues
**Symptoms:**
- Service fails to start automatically
- systemctl errors

**Solutions:**
```bash
# Check service status
sudo systemctl status medical-device-assistant

# Check service logs
sudo journalctl -u medical-device-assistant -f

# Reload systemd configuration
sudo systemctl daemon-reload
sudo systemctl restart medical-device-assistant
```

### macOS-Specific Issues

#### Issue: Gatekeeper blocking execution
**Symptoms:**
- "App cannot be opened" warnings
- Security warnings for scripts

**Solutions:**
```bash
# Allow execution for specific file
xattr -d com.apple.quarantine start-dev.sh

# Or allow in System Preferences > Security & Privacy
```

#### Issue: Homebrew path issues
**Symptoms:**
- Commands not found after Homebrew installation
- PATH not updated

**Solutions:**
```bash
# Add Homebrew to PATH
echo 'export PATH="/opt/homebrew/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# For Intel Macs
echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc
```

## Debugging Tools and Techniques

### Logging and Monitoring

#### Enable Debug Logging
```bash
# Backend debug logging
export LOG_LEVEL=DEBUG
export DEBUG=true

# Frontend debug logging
export NODE_ENV=development
export DEBUG=*
```

#### Log File Locations
```bash
# Application logs
backend.log          # Backend application log
frontend.log         # Frontend application log
medical_device_assistant.log  # Combined application log

# System logs
# Windows: Event Viewer > Application
# Linux: /var/log/syslog or journalctl
# macOS: Console.app or /var/log/system.log
```

### Performance Profiling

#### Backend Profiling
```bash
# Python profiling
cd backend
poetry run python -m cProfile -o profile.stats main.py

# Memory profiling
poetry run python -m memory_profiler main.py
```

#### Frontend Profiling
```bash
# Next.js bundle analysis
pnpm analyze

# Performance monitoring
# Use browser DevTools > Performance tab
```

### Network Debugging

#### Capture Network Traffic
```bash
# Using curl with verbose output
curl -v http://localhost:8000/health

# Using tcpdump (Linux/macOS)
sudo tcpdump -i any port 8000

# Using Wireshark (all platforms)
# Filter: tcp.port == 8000 or tcp.port == 3000
```

## Recovery Procedures

### Complete System Recovery

#### 1. Stop All Services
```bash
# Kill all related processes
pkill -f "node.*medical-device"
pkill -f "python.*uvicorn"
pkill -f "uvicorn.*main:app"
```

#### 2. Clean Environment
```bash
# Remove temporary files
rm -rf node_modules/.cache
rm -rf .next
rm -rf backend/__pycache__
rm -rf backend/.pytest_cache

# Clear logs
rm -f *.log
```

#### 3. Reinstall Dependencies
```bash
# Frontend
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Backend
cd backend
poetry env remove python
poetry install
cd ..
```

#### 4. Reset Database
```bash
# Backup current database
cp backend/medical_device_assistant.db backup_$(date +%Y%m%d_%H%M%S).db

# Remove database files
rm -f backend/medical_device_assistant.db*

# Restart services (will recreate database)
./start-dev.sh
```

### Backup and Restore

#### Create Backup
```bash
# Run maintenance script
./maintenance-scripts.ps1 -Task backup  # Windows
./maintenance-scripts.sh --task backup  # Linux/macOS

# Manual backup
tar -czf backup_$(date +%Y%m%d_%H%M%S).tar.gz \
    medical-device-regulatory-assistant/ \
    *.log \
    *.env*
```

#### Restore from Backup
```bash
# Extract backup
tar -xzf backup_YYYYMMDD_HHMMSS.tar.gz

# Restore database
cp backup/medical_device_assistant.db backend/

# Restart services
./start-dev.sh
```

## Getting Help

### Self-Help Resources
1. Check this troubleshooting guide
2. Review system requirements document
3. Check application logs
4. Run health checks
5. Search GitHub issues

### Diagnostic Information to Collect
When reporting issues, include:

```bash
# System information
uname -a                    # Linux/macOS
systeminfo                  # Windows

# Software versions
node --version
python --version
poetry --version
pnpm --version

# Service status
./monitor-system-health.ps1 -Mode single

# Recent logs
tail -n 50 backend.log
tail -n 50 frontend.log

# Network connectivity
curl -v http://localhost:8000/health
curl -v https://api.fda.gov/device/510k.json?limit=1
```

### Contact Information
- **GitHub Issues**: [Project Repository Issues]
- **Documentation**: [Project Documentation]
- **Community**: [Project Discussions]

This troubleshooting guide should help resolve most common issues encountered with the Medical Device Regulatory Assistant. For issues not covered here, please check the project documentation or create a GitHub issue with detailed diagnostic information.