# Troubleshooting Guide - Medical Device Regulatory Assistant

## Overview

This guide provides solutions to common issues encountered during development, testing, and deployment of the Medical Device Regulatory Assistant. The project includes comprehensive error resolution systems that provide detailed error messages and actionable suggestions.

## Quick Diagnosis

### Run Automated Diagnostics

Before diving into specific issues, run the automated diagnostic tools:

```bash
# Complete environment validation
./scripts/validate-package-managers.sh

# Frontend-specific diagnostics
cd medical-device-regulatory-assistant
node scripts/validate-frontend-environment.js

# Backend-specific diagnostics
cd backend
poetry run python -c "
from core.environment import EnvironmentValidator
validator = EnvironmentValidator()
result = validator.validate_python_environment()
db_result = validator.validate_database_connection()

print('=== Environment Validation ===')
if result.is_valid:
    print('✅ Python environment: OK')
else:
    print('❌ Python environment issues:')
    for error in result.errors:
        print(f'  - {error}')

if db_result.is_valid:
    print('✅ Database connection: OK')
else:
    print('❌ Database issues:')
    for error in db_result.errors:
        print(f'  - {error}')
"
```

### Check System Health

```bash
# Frontend health check
curl http://localhost:3000/api/health

# Backend health check
curl http://localhost:8000/health

# Database health check
cd backend
poetry run python -c "
from testing.database_isolation import DatabaseTestIsolation
import asyncio

async def check_db_health():
    isolation = DatabaseTestIsolation()
    health = await isolation.check_database_health()
    print(f'Database healthy: {health.get(\"healthy\", False)}')
    print(f'Test isolation working: {health.get(\"test_isolation_working\", False)}')
    print(f'Test database ready: {health.get(\"test_database_ready\", False)}')

asyncio.run(check_db_health())
"
```

## Environment Setup Issues

### Package Manager Problems

#### Issue: "Command not found: pnpm"

**Symptoms:**
- `pnpm: command not found` when running frontend commands
- Scripts fail with pnpm errors

**Solutions:**

```bash
# Option 1: Install via npm
npm install -g pnpm

# Option 2: Install via curl
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Option 3: Install via Homebrew (macOS)
brew install pnpm

# Verify installation
pnpm --version

# If still not found, add to PATH
echo 'export PATH="$HOME/.local/share/pnpm:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

#### Issue: "Command not found: poetry"

**Symptoms:**
- `poetry: command not found` when running backend commands
- Python dependency management fails

**Solutions:**

```bash
# Option 1: Install via official installer
curl -sSL https://install.python-poetry.org | python3 -

# Option 2: Install via pip
pip install poetry

# Option 3: Install via Homebrew (macOS)
brew install poetry

# Add to PATH
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify installation
poetry --version
```

#### Issue: Wrong Package Manager Used

**Symptoms:**
- `package-lock.json` exists (should be `pnpm-lock.yaml`)
- `requirements.txt` exists (should use `pyproject.toml`)
- Dependency conflicts

**Solutions:**

```bash
# Frontend: Remove npm artifacts and use pnpm
rm package-lock.json node_modules -rf
pnpm install

# Backend: Remove pip artifacts and use poetry
rm requirements.txt
cd backend
poetry install
```

### Version Compatibility Issues

#### Issue: Node.js Version Too Old

**Symptoms:**
- Build errors with modern JavaScript features
- Package installation failures
- Runtime errors

**Solutions:**

```bash
# Check current version
node --version

# Install Node Version Manager
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Install and use Node.js 18+
nvm install 18
nvm use 18
nvm alias default 18

# Verify
node --version  # Should be v18.x.x or higher
```

#### Issue: Python Version Too Old

**Symptoms:**
- Poetry installation fails
- Import errors with modern Python features
- Type hint errors

**Solutions:**

```bash
# Check current version
python --version

# Install pyenv for Python version management
curl https://pyenv.run | bash

# Install Python 3.9+
pyenv install 3.11.0
pyenv global 3.11.0

# Verify
python --version  # Should be 3.9+ or higher
```

### Environment Variable Issues

#### Issue: Missing Environment Variables

**Symptoms:**
- Authentication failures
- API connection errors
- Configuration errors

**Solutions:**

```bash
# Check if .env.local exists
ls -la .env.local

# If missing, copy from example
cp .env.example .env.local

# Edit with your values
nano .env.local

# Required variables:
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-32-character-secret
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
DATABASE_URL=sqlite:./dev.db
```

#### Issue: Invalid NEXTAUTH_SECRET

**Symptoms:**
- Authentication errors
- Session creation failures
- JWT errors

**Solutions:**

```bash
# Generate secure secret (32+ characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use OpenSSL
openssl rand -hex 32

# Add to .env.local
echo "NEXTAUTH_SECRET=$(openssl rand -hex 32)" >> .env.local
```

## Development Server Issues

### Port Conflicts

#### Issue: Port Already in Use

**Symptoms:**
- `EADDRINUSE: address already in use :::3000`
- `EADDRINUSE: address already in use :::8000`

**Solutions:**

```bash
# Find process using port 3000
lsof -ti:3000

# Kill process using port 3000
kill -9 $(lsof -ti:3000)

# Find process using port 8000
lsof -ti:8000

# Kill process using port 8000
kill -9 $(lsof -ti:8000)

# Alternative: Use different ports
PORT=3001 pnpm dev  # Frontend on port 3001
poetry run uvicorn main:app --reload --port 8001  # Backend on port 8001
```

### Database Connection Issues

#### Issue: Database File Locked

**Symptoms:**
- `database is locked` errors
- SQLite connection failures
- Test database issues

**Solutions:**

```bash
# Check for active connections
cd backend
poetry run python -c "
from testing.database_isolation import DatabaseTestIsolation
import asyncio

async def check_connections():
    isolation = DatabaseTestIsolation()
    count = await isolation.get_active_sessions_count()
    print(f'Active test sessions: {count}')
    
    if count > 0:
        print('Cleaning up active sessions...')
        await isolation.cleanup_all_sessions()
        print('Cleanup complete')

asyncio.run(check_connections())
"

# If still locked, remove database file (development only)
rm medical_device_assistant.db
rm medical_device_assistant.db-shm
rm medical_device_assistant.db-wal

# Restart application to recreate database
```

#### Issue: Database Schema Mismatch

**Symptoms:**
- Table doesn't exist errors
- Column not found errors
- Migration failures

**Solutions:**

```bash
cd backend

# Check database schema
poetry run python -c "
from database.connection import get_database_manager
import asyncio

async def check_schema():
    db_manager = get_database_manager()
    await db_manager.initialize()
    print('Database schema initialized')

asyncio.run(check_schema())
"

# If issues persist, reset database (development only)
rm medical_device_assistant.db*
poetry run python -c "
from database.connection import get_database_manager
import asyncio
asyncio.run(get_database_manager().initialize())
"
```

## Testing Issues

### Frontend Testing Problems

#### Issue: React `act()` Warnings

**Symptoms:**
- Console warnings about `act()` in tests
- Tests pass but with warnings
- Inconsistent test behavior

**Solutions:**

```typescript
// Use enhanced testing utilities instead of direct render
import { renderWithProviders, waitForAsyncUpdates } from '@/lib/testing/react-test-utils';

// Before (causes act warnings)
const { getByText } = render(<MyComponent />);
fireEvent.click(getByText('Button'));
expect(getByText('Result')).toBeInTheDocument();

// After (no act warnings)
const { getByText } = await renderWithProviders(<MyComponent />);
fireEvent.click(getByText('Button'));
await waitForAsyncUpdates();
expect(getByText('Result')).toBeInTheDocument();
```

#### Issue: Toast Testing Failures

**Symptoms:**
- Toast notifications not detected in tests
- Mock toast system not working
- Lifecycle warnings with toasts

**Solutions:**

```typescript
import { getMockToastSystem, toastTestUtils } from '@/lib/testing/mock-toast-system';

// Setup mock toast system
beforeEach(() => {
  getMockToastSystem().clear();
});

// Test toast notifications
test('shows success toast', async () => {
  const { getByText } = await renderWithProviders(<MyComponent />);
  
  fireEvent.click(getByText('Save'));
  await waitForAsyncUpdates();
  
  // Assert toast was called
  toastTestUtils.expectToastCalledWith('Success', 'Data saved', 'success');
});
```

#### Issue: Component Performance Warnings

**Symptoms:**
- Slow component render warnings
- Memory usage warnings
- Performance test failures

**Solutions:**

```typescript
// Use performance monitoring to identify issues
import { usePerformanceMonitoring } from '@/lib/testing/performance-monitor';

function MyComponent() {
  const { metrics, recordInteraction } = usePerformanceMonitoring('MyComponent');

  const handleClick = () => {
    const endInteraction = recordInteraction('button_click');
    // Perform action
    performAction();
    endInteraction();
  };

  // Check metrics in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && metrics?.warnings.length > 0) {
      console.warn('Performance issues:', metrics.warnings);
    }
  }, [metrics]);

  return <button onClick={handleClick}>Click me</button>;
}
```

### Backend Testing Problems

#### Issue: Database Test Interference

**Symptoms:**
- Tests fail when run together but pass individually
- Data from one test affects another
- Inconsistent test results

**Solutions:**

```python
# Use database isolation for all tests
from backend.testing.database_isolation import DatabaseTestIsolation

@pytest.fixture
async def isolation():
    return DatabaseTestIsolation()

@pytest.fixture
async def test_data(isolation):
    async with isolation.isolated_session() as session:
        factory = TestDataFactory(session)
        yield factory
        # Automatic cleanup on exit

# Test with proper isolation
async def test_project_creation(test_data):
    # Create test data - automatically cleaned up
    user = await test_data.create_user(email="test@example.com")
    project = await test_data.create_project(name="Test Project", user_id=user.id)
    
    # Assertions
    assert project.name == "Test Project"
    # No manual cleanup needed
```

#### Issue: API Testing Failures

**Symptoms:**
- Connection refused errors
- Timeout errors
- Inconsistent API test results

**Solutions:**

```python
from backend.testing.api_client import TestAPIClient

async def test_api_endpoint():
    client = TestAPIClient("http://localhost:8000")
    
    # Check if API is available
    is_connected = await client.connect()
    if not is_connected:
        pytest.skip("API server not available")
    
    # Make request with retry logic
    async with client.request_with_retry("GET", "/api/projects") as response:
        if response is None:
            pytest.skip("API request failed after retries")
        
        assert response.status_code == 200
```

#### Issue: Performance Test Failures

**Symptoms:**
- Tests exceed time thresholds
- Memory usage warnings
- Performance regression alerts

**Solutions:**

```python
from backend.testing.performance_monitor import TestPerformanceMonitor, PerformanceThresholds

# Adjust thresholds for your environment
custom_thresholds = PerformanceThresholds(
    max_execution_time=10.0,     # Increase if needed
    max_memory_usage=200.0,      # Increase if needed
    max_database_queries=100     # Increase if needed
)

monitor = TestPerformanceMonitor(custom_thresholds)

# Monitor test performance
async def test_with_monitoring():
    with monitor.monitor_test("my_test") as monitor_id:
        # Perform operations
        # Monitor will track performance automatically
        pass
```

## Build and Deployment Issues

### Build Failures

#### Issue: TypeScript Compilation Errors

**Symptoms:**
- Build fails with type errors
- Missing type definitions
- Import resolution errors

**Solutions:**

```bash
# Check TypeScript configuration
npx tsc --noEmit

# Install missing type definitions
pnpm add -D @types/node @types/react @types/react-dom

# Clear TypeScript cache
rm -rf .next/cache
pnpm build
```

#### Issue: Python Import Errors

**Symptoms:**
- Module not found errors
- Import path issues
- Package resolution failures

**Solutions:**

```bash
cd backend

# Check Python path and imports
poetry run python -c "
import sys
print('Python path:')
for path in sys.path:
    print(f'  {path}')
"

# Reinstall dependencies
poetry install --no-cache

# Check for circular imports
poetry run python -m py_compile main.py
```

### Performance Issues

#### Issue: Slow Application Startup

**Symptoms:**
- Long startup times
- Timeout errors during startup
- Resource usage spikes

**Solutions:**

```bash
# Monitor startup performance
cd backend
poetry run python -c "
from testing.performance_monitor import TestPerformanceMonitor
import time
import asyncio

async def monitor_startup():
    monitor = TestPerformanceMonitor()
    
    with monitor.monitor_test('application_startup') as monitor_id:
        # Simulate startup operations
        start_time = time.time()
        
        # Your startup code here
        from main import app
        
        end_time = time.time()
        print(f'Startup time: {end_time - start_time:.2f}s')
    
    summary = monitor.get_performance_summary()
    if summary['warnings']:
        print('Performance warnings:')
        for warning in summary['warnings']:
            print(f'  - {warning}')

asyncio.run(monitor_startup())
"
```

#### Issue: High Memory Usage

**Symptoms:**
- Memory usage warnings
- Out of memory errors
- Performance degradation

**Solutions:**

```bash
# Monitor memory usage
cd backend
poetry run python -c "
import psutil
import gc

# Check current memory usage
process = psutil.Process()
memory_info = process.memory_info()
print(f'Memory usage: {memory_info.rss / 1024 / 1024:.2f} MB')

# Force garbage collection
gc.collect()

# Check for memory leaks in tests
from testing.performance_monitor import get_performance_monitor
monitor = get_performance_monitor()
summary = monitor.get_performance_summary()

memory_intensive_tests = summary.get('memory_intensive_tests', [])
if memory_intensive_tests:
    print('Memory intensive tests:')
    for test in memory_intensive_tests:
        print(f'  - {test[\"name\"]}: {test[\"memory\"]:.2f}MB')
"
```

## Error Resolution System Issues

### Exception Handling Problems

#### Issue: Unhandled Exceptions

**Symptoms:**
- Generic error messages
- Missing error context
- Poor user experience

**Solutions:**

```python
# Use unified exception hierarchy
from backend.core.exceptions import (
    RegulatoryAssistantException,
    ProjectNotFoundError,
    ValidationError,
    DatabaseError
)

# Instead of generic exceptions
# raise Exception("Project not found")

# Use specific exceptions with context
raise ProjectNotFoundError(
    project_id=123,
    user_id="user_456",
    additional_context={"attempted_action": "update"}
)

# Exception will automatically provide:
# - User-friendly message
# - Error code for tracking
# - Actionable suggestions
# - Detailed context for debugging
```

#### Issue: Poor Error Messages

**Symptoms:**
- Technical error messages shown to users
- No actionable suggestions
- Difficult debugging

**Solutions:**

```python
# Create custom exceptions with helpful messages
class CustomValidationError(ValidationError):
    def __init__(self, field_name: str, field_value: Any):
        super().__init__(
            field=field_name,
            value=field_value,
            constraint="custom_validation",
            validation_errors=[{
                "field": field_name,
                "message": f"The {field_name} field has invalid format",
                "suggestion": f"Please check the {field_name} format and try again"
            }]
        )

# Usage
if not is_valid_email(email):
    raise CustomValidationError("email", email)
```

### Error Tracking Issues

#### Issue: Missing Error Context

**Symptoms:**
- Errors without sufficient debugging information
- Difficult to reproduce issues
- Poor error tracking

**Solutions:**

```python
from backend.core.error_tracker import ErrorTracker

tracker = ErrorTracker()

try:
    # Some operation
    result = await some_operation()
except Exception as e:
    # Add context before tracking
    if isinstance(e, RegulatoryAssistantException):
        e.add_context("user_id", current_user.id)
        e.add_context("operation", "project_creation")
        e.add_context("timestamp", datetime.utcnow().isoformat())
    
    # Track with full context
    error_report = tracker.create_error_report(e, request)
    
    # Log for debugging
    logger.error(f"Operation failed: {e}", extra=e.to_dict() if hasattr(e, 'to_dict') else {})
    
    raise
```

## Getting Additional Help

### Diagnostic Commands

```bash
# Complete system health check
./scripts/validate-package-managers.sh

# Generate diagnostic report
cd backend
poetry run python -c "
from core.environment import EnvironmentValidator
from testing.database_isolation import DatabaseTestIsolation
from testing.performance_monitor import get_performance_monitor
import asyncio
import json

async def generate_diagnostic_report():
    # Environment validation
    validator = EnvironmentValidator()
    env_result = validator.validate_python_environment()
    db_result = validator.validate_database_connection()
    
    # Database health
    isolation = DatabaseTestIsolation()
    db_health = await isolation.check_database_health()
    
    # Performance metrics
    monitor = get_performance_monitor()
    perf_summary = monitor.get_performance_summary()
    
    report = {
        'environment': {
            'python_valid': env_result.is_valid,
            'python_errors': env_result.errors,
            'database_valid': db_result.is_valid,
            'database_errors': db_result.errors
        },
        'database_health': db_health,
        'performance': perf_summary,
        'timestamp': datetime.utcnow().isoformat()
    }
    
    with open('diagnostic_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    print('Diagnostic report saved to diagnostic_report.json')

asyncio.run(generate_diagnostic_report())
"
```

### Documentation Resources

1. **System Documentation**: [docs/system-documentation/README.md](../README.md)
2. **Testing Infrastructure**: [docs/system-documentation/testing-infrastructure.md](../testing-infrastructure.md)
3. **Error Handling System**: [docs/system-documentation/error-handling-system.md](../error-handling-system.md)
4. **Performance Monitoring**: [docs/system-documentation/performance-monitoring.md](../performance-monitoring.md)
5. **API Documentation**: [docs/system-documentation/api/](../api/)

### Support Channels

1. **Check Error Messages**: The error resolution system provides detailed, actionable error messages
2. **Run Diagnostics**: Use automated diagnostic tools to identify issues
3. **Review Logs**: Check application logs for detailed error information
4. **Performance Reports**: Use performance monitoring to identify bottlenecks

### Common Resolution Patterns

1. **Environment Issues**: Run validation scripts and follow specific instructions
2. **Test Issues**: Use enhanced testing utilities and proper isolation
3. **Performance Issues**: Use performance monitoring to identify and resolve bottlenecks
4. **Error Handling**: Use unified exception hierarchy with proper context

The comprehensive error resolution systems in this project are designed to provide clear, actionable guidance for resolving issues quickly and effectively.