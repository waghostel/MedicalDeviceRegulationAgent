# Developer Setup Guide - Medical Device Regulatory Assistant

## Overview

This guide provides step-by-step instructions for setting up the Medical Device Regulatory Assistant development environment. The project includes comprehensive error resolution systems that ensure reliable development and testing.

## Quick Start

For experienced developers who want to get started immediately:

```bash
# 1. Clone and navigate to project
git clone <repository-url>
cd medical-device-regulatory-assistant

# 2. Validate environment
./scripts/validate-package-managers.sh

# 3. Install dependencies
pnpm install
cd backend && poetry install && cd ..

# 4. Setup environment
cp .env.example .env.local
# Edit .env.local with your configuration

# 5. Start development
./start-dev.sh  # Mac/Linux
# or
start-dev.ps1   # Windows PowerShell
```

## Detailed Setup Instructions

### Step 1: Prerequisites

#### Required Software

**Node.js (v18 or higher)**
```bash
# Check current version
node --version

# Install via Node Version Manager (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Or download from https://nodejs.org/
```

**Python (v3.9 or higher)**
```bash
# Check current version
python --version
# or
python3 --version

# Install via pyenv (recommended)
curl https://pyenv.run | bash
pyenv install 3.11.0
pyenv global 3.11.0

# Or download from https://python.org/
```

#### Package Managers

**pnpm (Frontend Package Manager)**
```bash
# Install pnpm globally
npm install -g pnpm

# Verify installation
pnpm --version

# Alternative installation methods:
# Via curl
curl -fsSL https://get.pnpm.io/install.sh | sh -

# Via Homebrew (macOS)
brew install pnpm
```

**Poetry (Backend Package Manager)**
```bash
# Install Poetry
curl -sSL https://install.python-poetry.org | python3 -

# Add to PATH (add to your shell profile)
export PATH="$HOME/.local/bin:$PATH"

# Verify installation
poetry --version

# Alternative installation methods:
# Via pip
pip install poetry

# Via Homebrew (macOS)
brew install poetry
```

### Step 2: Environment Validation

Run the comprehensive environment validation to ensure everything is properly configured:

```bash
# Navigate to project root
cd medical-device-regulatory-assistant

# Run complete validation
./scripts/validate-package-managers.sh
```

The validation script will check:
- ✅ Node.js version compatibility
- ✅ Python version compatibility  
- ✅ pnpm installation and configuration
- ✅ Poetry installation and configuration
- ✅ Project configuration files
- ✅ Dependency consistency
- ✅ Lock file integrity

**If validation fails**, the script will provide specific instructions to fix each issue.

#### Manual Validation

You can also run individual validation checks:

**Frontend Environment:**
```bash
# Validate frontend setup
node scripts/validate-frontend-environment.js

# Expected output:
# ✅ Node.js version: v18.x.x (compatible)
# ✅ pnpm installed: v8.x.x
# ✅ package.json found and valid
# ✅ pnpm-lock.yaml exists
# ✅ Frontend environment ready
```

**Backend Environment:**
```bash
cd backend

# Validate backend setup
poetry run python -c "
from core.environment import EnvironmentValidator
validator = EnvironmentValidator()
result = validator.validate_python_environment()

if result.is_valid:
    print('✅ Backend environment is properly configured')
    print(f'✅ Python version: {validator.get_python_version()}')
    print('✅ Poetry configuration valid')
    print('✅ All required packages available')
else:
    print('❌ Backend environment issues found:')
    for error in result.errors:
        print(f'  - {error}')
    print('💡 Recommendations:')
    for rec in result.recommendations:
        print(f'  - {rec}')
"
```

### Step 3: Project Setup

#### Clone Repository

```bash
git clone <repository-url>
cd medical-device-regulatory-assistant
```

#### Install Dependencies

**Frontend Dependencies:**
```bash
# Install frontend dependencies (use pnpm only)
pnpm install

# Verify installation
pnpm list --depth=0
```

**Backend Dependencies:**
```bash
# Navigate to backend directory
cd backend

# Install backend dependencies (use poetry only)
poetry install

# Verify installation
poetry show

# Return to project root
cd ..
```

### Step 4: Environment Configuration

#### Create Environment File

```bash
# Copy example environment file
cp .env.example .env.local

# Edit with your configuration
nano .env.local  # or use your preferred editor
```

#### Required Environment Variables

```bash
# .env.local
# Basic configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secure-random-string-at-least-32-characters

# Google OAuth (required for authentication)
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Database (SQLite for development)
DATABASE_URL=sqlite:./dev.db

# Optional: FDA API (for enhanced functionality)
FDA_API_KEY=your-fda-api-key

# Optional: Redis (for caching)
REDIS_URL=redis://localhost:6379
```

#### Generate Secure Secrets

```bash
# Generate secure NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or use OpenSSL
openssl rand -hex 32
```

#### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3000/api/auth/callback/google` (development)
   - `https://yourdomain.com/api/auth/callback/google` (production)

For detailed instructions, see [Environment Setup Guide](ENVIRONMENT_SETUP_GUIDE.md).

### Step 5: Database Setup

The project uses SQLite for development with automatic schema management:

```bash
# Database will be created automatically on first run
# No manual setup required for development

# To manually initialize (optional)
cd backend
poetry run python -c "
from database.connection import get_database_manager
import asyncio

async def init_db():
    db_manager = get_database_manager()
    await db_manager.initialize()
    print('✅ Database initialized successfully')

asyncio.run(init_db())
"
```

### Step 6: Start Development Environment

#### Option 1: Automated Scripts (Recommended)

**Mac/Linux:**
```bash
# Start both frontend and backend
./start-dev.sh

# Start individual services
./start-frontend.sh
./start-backend.sh
```

**Windows:**
```powershell
# PowerShell
.\start-dev.ps1

# Individual services
.\start-frontend.ps1
.\start-backend.ps1
```

#### Option 2: Manual Start

**Terminal 1 - Frontend:**
```bash
cd medical-device-regulatory-assistant
pnpm dev
```

**Terminal 2 - Backend:**
```bash
cd medical-device-regulatory-assistant/backend
poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Step 7: Verify Installation

#### Check Application URLs

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

#### Run Health Checks

```bash
# Frontend health check
curl http://localhost:3000/api/health

# Backend health check
curl http://localhost:8000/health

# Expected response:
# {"status": "healthy", "timestamp": "2025-01-11T10:30:00Z"}
```

#### Run Tests

**Frontend Tests:**
```bash
# Run all frontend tests
pnpm test

# Run with coverage
pnpm test:coverage

# Expected: 95%+ test success rate
```

**Backend Tests:**
```bash
cd backend

# Run all backend tests
poetry run python -m pytest tests/ -v

# Run with performance monitoring
poetry run python -m pytest tests/ -v --performance-report

# Expected: 100% integration test success rate
```

## Development Workflow

### Daily Development

1. **Start Development Environment:**
   ```bash
   ./start-dev.sh  # or start-dev.ps1 on Windows
   ```

2. **Run Tests Before Committing:**
   ```bash
   # Frontend tests
   pnpm test
   
   # Backend tests
   cd backend && poetry run python -m pytest tests/ -v
   ```

3. **Check Code Quality:**
   ```bash
   # Frontend linting
   pnpm lint
   
   # Backend linting
   cd backend && poetry run flake8 .
   ```

### Testing Workflow

The project includes comprehensive testing infrastructure:

#### Frontend Testing

```bash
# Run all tests with enhanced utilities
pnpm test

# Run specific test files
pnpm test src/components/projects/project-form.test.tsx

# Run tests in watch mode
pnpm test:watch

# Generate coverage report
pnpm test:coverage
```

**Features:**
- Enhanced React testing utilities with proper `act()` wrapping
- Mock toast system for reliable notification testing
- Performance monitoring for component tests
- Automatic error boundary testing

#### Backend Testing

```bash
cd backend

# Run all tests with database isolation
poetry run python -m pytest tests/ -v

# Run specific test categories
poetry run python -m pytest tests/test_database_isolation.py -v
poetry run python -m pytest tests/test_exception_handling.py -v
poetry run python -m pytest tests/test_performance_monitor.py -v

# Run with performance monitoring
poetry run python -m pytest tests/ -v --performance-report
```

**Features:**
- Database test isolation with automatic rollback
- Unified exception handling testing
- Performance monitoring for all tests
- API testing with retry logic

### Performance Monitoring

The development environment includes automatic performance monitoring:

```bash
# View performance metrics
cd backend
poetry run python -c "
from testing.performance_monitor import get_performance_monitor
monitor = get_performance_monitor()
summary = monitor.get_performance_summary()
print(f'Average test execution time: {summary[\"average_execution_time\"]:.2f}s')
print(f'Total tests monitored: {summary[\"total_tests\"]}')
"

# Export performance report
poetry run python -c "
from testing.performance_monitor import get_performance_monitor
monitor = get_performance_monitor()
monitor.export_metrics('performance-report.json')
print('Performance report exported to performance-report.json')
"
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Package Manager Issues

**Problem**: "Command not found: pnpm"
```bash
# Solution: Install pnpm globally
npm install -g pnpm
# or
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

**Problem**: "Command not found: poetry"
```bash
# Solution: Install Poetry and add to PATH
curl -sSL https://install.python-poetry.org | python3 -
export PATH="$HOME/.local/bin:$PATH"
```

#### 2. Environment Issues

**Problem**: Environment validation fails
```bash
# Solution: Run validation and follow specific instructions
./scripts/validate-package-managers.sh

# The script will provide detailed fixing instructions for each issue
```

**Problem**: Database connection errors
```bash
# Solution: Check database configuration
cd backend
poetry run python -c "
from core.environment import EnvironmentValidator
validator = EnvironmentValidator()
result = validator.validate_database_connection()
if not result.is_valid:
    print('Database issues:')
    for error in result.errors:
        print(f'  - {error}')
"
```

#### 3. Test Issues

**Problem**: React `act()` warnings in tests
```bash
# Solution: Use enhanced testing utilities
# Replace direct render() calls with renderWithProviders()
# Use waitForAsyncUpdates() before assertions
```

**Problem**: Database test interference
```bash
# Solution: Use database isolation
# All tests should use isolated_session() context manager
# This ensures automatic rollback and no test interference
```

#### 4. Performance Issues

**Problem**: Slow test execution
```bash
# Solution: Check performance monitoring
cd backend
poetry run python -c "
from testing.performance_monitor import get_performance_monitor
monitor = get_performance_monitor()
summary = monitor.get_performance_summary()
if summary['slow_tests']:
    print('Slow tests detected:')
    for test in summary['slow_tests']:
        print(f'  - {test[\"name\"]}: {test[\"time\"]:.2f}s')
"
```

### Getting Help

1. **Check System Documentation**: [docs/system-documentation/README.md](system-documentation/README.md)
2. **Review Troubleshooting Guide**: [docs/system-documentation/guides/troubleshooting-guide.md](system-documentation/guides/troubleshooting-guide.md)
3. **Run Environment Validation**: `./scripts/validate-package-managers.sh`
4. **Check Error Logs**: Look for detailed error messages with suggestions

### Advanced Configuration

#### Custom Performance Thresholds

```python
# backend/conftest.py
from testing.performance_monitor import TestPerformanceMonitor, PerformanceThresholds

# Custom thresholds for your team
custom_thresholds = PerformanceThresholds(
    max_execution_time=3.0,      # 3 seconds max
    max_memory_usage=75.0,       # 75 MB max
    max_database_queries=25,     # 25 queries max
    max_api_calls=5              # 5 API calls max
)

monitor = TestPerformanceMonitor(custom_thresholds)
```

#### Custom Test Configuration

```typescript
// src/lib/testing/test-config.ts
export const customTestConfig = {
  skipActWarnings: false,        // Show act warnings for debugging
  mockToasts: true,             // Enable toast mocking
  timeout: 10000,               // 10 second timeout
  performanceMonitoring: true   // Enable performance tracking
};
```

## Next Steps

Once your development environment is set up:

1. **Explore the Codebase**: Start with `src/app/page.tsx` and `backend/main.py`
2. **Run the Test Suite**: Ensure all tests pass in your environment
3. **Review Documentation**: Check out the [System Documentation](system-documentation/README.md)
4. **Start Development**: Begin working on your features with confidence

The comprehensive error resolution systems ensure that you'll have reliable tests, clear error messages, and excellent development experience throughout your work on the Medical Device Regulatory Assistant.