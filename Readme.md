# Agentic AI Regulatory Assistant

## 1. Project Overview

This project is an **Agentic AI Regulatory Assistant**, a specialized platform designed to streamline and accelerate the medical device regulatory pathway discovery process. The Minimum Viable Product (MVP) focuses exclusively on the **US FDA market**.

The primary goal is to assist **Regulatory Affairs Managers at medical device startups** (10-50 employees) who have budget authority but limited resources. The system addresses their most critical pain point: the complex, time-consuming, and error-prone **510(k) predicate search and comparison workflow**.

The key success metric for the MVP is to **reduce the time required to identify suitable predicate devices from 2-3 days to under 2 hours**, while improving accuracy and compliance.

## 2. Core MVP Capabilities

The assistant is built on a "human-in-the-loop" philosophy, where the AI suggests and automates, but the human expert decides. All outputs are designed to be auditable, traceable, and include confidence scores.

- **Auto-Classification with FDA Product Codes**: Automatically classifies devices based on their intended use and suggests the appropriate FDA product codes and CFR sections.
- **Predicate Search & Analysis**: Automates the search for predicate devices in the openFDA database, providing a ranked list of candidates and side-by-side technological comparison tables.
- **FDA Guidance Document Mapping**: Identifies relevant FDA guidance documents based on device type and technology (e.g., cybersecurity for connected devices).
- **Real-time FDA Database Integration**: Ensures all regulatory data is current by using live queries to the openFDA API.
- **510(k) Submission Checklist Generator**: Creates tailored checklists for FDA submissions based on the device classification and predicate analysis.

## 3. Technical Architecture

The system is a full-stack application built with a modern, robust technology set.

- **Frontend**: Next.js, React, Shadcn UI, Tailwind CSS
- **Backend**: Next.js API Routes with a FastAPI service for Python-based AI/agentic logic.
- **AI Framework**: LangGraph for agent architecture and CopilotKit for the conversational UI.
- **Database**: SQLite for local development and project-based data storage.
- **Authentication**: Google OAuth 2.0.

### System Architecture Diagram

```text
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   Project   │  │ Regulatory  │  │   Agent     │          │
│  │     Hub     │  │ Dashboard   │  │  Workflow   │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  Markdown   │  │ Quick       │  │  Citation   │          │
│  │   Editor    │  │ Actions     │  │   Panel     │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│                 API Layer (Next.js API Routes)              │
├─────────────────────────────────────────────────────────────┤
│                    Backend Services (FastAPI)               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │  LangGraph  │  │   openFDA   │  │  Document   │          │
│  │   Agents    │  │ Integration │  │ Processing  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
├─────────────────────────────────────────────────────────────┤
│                     Data Layer                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │   SQLite    │  │  Markdown   │  │    JSON     │          │
│  │  Database   │  │    Files    │  │ Structured  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## 4. Scripts and Automation

This project includes a suite of scripts to automate common development, testing, and maintenance tasks. These are located in the root directory.

### Development and Startup Scripts

-   **`start-dev.ps1` / `start-dev.sh`**: The main entry point for starting the development environment. It launches both the frontend and backend services concurrently.
-   **`start-dev-optimized.ps1`**: An optimized version of the startup script that offers faster launch times by skipping non-essential checks, ideal for daily development.
-   **`start-frontend.ps1` / `start-frontend.sh`**: Starts only the Next.js frontend service.
-   **`start-backend.ps1` / `start-backend.sh`**: Starts only the FastAPI backend service.
-   **`setup-redis.ps1` / `setup-redis-windows.ps1`**: Helper scripts to install and configure Redis, which is an optional dependency for caching and performance improvement.

### Testing Scripts

-   **`run-integration-tests.ps1`**: Executes a comprehensive suite of integration tests to validate the entire system, from health checks to API authentication.
-   **`test-integration.ps1`**: A general-purpose script for running various integration tests, including frontend-backend communication and CORS checks.
-   **`test-start-dev.ps1`**, **`test-start-frontend.ps1`**, **`test-start-backend.ps1`**: Scripts used specifically for testing the startup logic of the main development scripts.

### Monitoring and Maintenance Scripts

-   **`monitor-system-health.ps1`**: A real-time dashboard to monitor the health of all system components, including the database, Redis, and external APIs.
-   **`performance-monitor.ps1`**: Tracks key performance indicators (KPIs) like response times, resource usage, and error rates, with options for alerting.
-   **`monitor-startup-performance.ps1`**: Measures and compares the startup times of different development scripts to identify performance bottlenecks.
-   **`maintenance-scripts.ps1`**: A collection of maintenance tasks such as log rotation, temporary file cleanup, and database backups.

## 5. Package Manager Standards

This project uses **standardized package managers** to ensure consistent development environments and has been enhanced with comprehensive error resolution systems:

### Frontend: pnpm Only
- **Use**: `pnpm` for all frontend package management
- **Don't use**: `npm`, `yarn`, or other package managers
- **Why**: Better performance, disk space efficiency, and strict dependency resolution

### Backend: Poetry Only
- **Use**: `poetry` for all Python dependency management
- **Don't use**: `pip`, `conda`, `pipenv`, or other Python package managers
- **Why**: Deterministic builds, better dependency resolution, and integrated virtual environment management

### Environment Validation
The project includes automated environment validation to ensure proper setup:

```bash
# Validate complete development environment
./scripts/validate-package-managers.sh

# Validate frontend environment specifically
node scripts/validate-frontend-environment.js

# Backend environment validation (from backend directory)
cd medical-device-regulatory-assistant/backend
poetry run python -c "from core.environment import EnvironmentValidator; validator = EnvironmentValidator(); result = validator.validate_python_environment(); print('✅ Environment valid' if result.is_valid else f'❌ Issues: {result.errors}')"
```

### Installation Commands
If you need to install the required package managers:

**pnpm:**
```bash
# Using npm (if you have Node.js)
npm install -g pnpm

# Using Homebrew (macOS)
brew install pnpm

# Using curl
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

**Poetry:**
```bash
# Using pip
pip install poetry

# Using curl
curl -sSL https://install.python-poetry.org | python3 -

# Using Homebrew (macOS)
brew install poetry
```

### Error Resolution Systems

This project includes comprehensive error resolution systems that provide:

- **95%+ frontend test success rate** with enhanced React testing utilities
- **100% backend integration test success rate** with database isolation
- **Automated performance monitoring** with <30 second test execution times
- **Comprehensive error tracking** with detailed error context and suggestions
- **Environment validation** with clear setup instructions for any issues

For detailed information about the error resolution systems, see:
- [System Documentation](docs/system-documentation/README.md)
- [Testing Infrastructure](docs/system-documentation/testing-infrastructure.md)
- [Error Handling System](docs/system-documentation/error-handling-system.md)

## 6. Getting Started

### Prerequisites

The startup scripts will automatically check for and guide you through installing:

- **Node.js** (v18 or higher)
- **pnpm** (package manager for frontend) - **Required, do not use npm or yarn**
- **Python** (3.9 or higher)
- **Poetry** (package manager for backend) - **Required, do not use pip or conda**
- **Google OAuth 2.0 Credentials**
- **FDA API Key** (optional for basic functionality)

#### Environment Validation and Setup

Before starting development, run the comprehensive environment validation to ensure your setup is correct:

```bash
# Complete environment validation (recommended)
./scripts/validate-package-managers.sh

# Frontend-specific validation
cd medical-device-regulatory-assistant
node scripts/validate-frontend-environment.js

# Backend-specific validation
cd backend
poetry run python -c "
from core.environment import EnvironmentValidator
validator = EnvironmentValidator()
result = validator.validate_python_environment()
if result.is_valid:
    print('✅ Backend environment is properly configured')
else:
    print('❌ Backend environment issues found:')
    for error in result.errors:
        print(f'  - {error}')
    print('💡 Recommendations:')
    for rec in result.recommendations:
        print(f'  - {rec}')
"
```

The validation scripts will:
- Check Node.js and Python versions
- Verify pnpm and Poetry installations
- Validate project configuration files (package.json, pyproject.toml)
- Check for dependency consistency and lock files
- Test database connectivity and schema
- Validate environment variables
- Provide detailed setup instructions for any issues found

#### Troubleshooting Setup Issues

If you encounter setup issues, the project includes comprehensive troubleshooting guides:

1. **Common Issues**: Check [docs/system-documentation/guides/troubleshooting-guide.md](docs/system-documentation/guides/troubleshooting-guide.md)
2. **Environment Setup**: See [docs/system-documentation/environment-management.md](docs/system-documentation/environment-management.md)
3. **Testing Issues**: Review [docs/system-documentation/testing-infrastructure.md](docs/system-documentation/testing-infrastructure.md)

The error resolution systems will provide specific, actionable guidance for resolving any setup problems.

### Quick Start

#### Option 1: Root Level Scripts (Easiest)

From the project root directory, use these convenience scripts:

```bash
# Mac/Linux - Start both frontend and backend
./start-dev.sh

# Mac/Linux - Start individual services
./start-frontend.sh
./start-backend.sh
```

#### Option 2: Platform-Specific Scripts

Navigate to the `medical-device-regulatory-assistant` directory first, then:

**Mac/Linux:**

```bash
# Start both services
./scripts/unix/start-all.sh

# Start individual services
./scripts/unix/start-frontend.sh
./scripts/unix/start-backend.sh
```

**Windows:**

```cmd
# Command Prompt - Start both services
scripts\windows\start-all.bat

# PowerShell - Start both services
scripts\windows\start-all.ps1

# Individual services (replace start-all with start-frontend or start-backend)
scripts\windows\start-frontend.bat
scripts\windows\start-backend.bat
```

### Platform-Specific Script Guide

#### Mac/Linux

All scripts are located in `scripts/unix/` and are executable shell scripts:

```bash
# Make scripts executable (if needed)
chmod +x scripts/unix/*.sh

# Run from medical-device-regulatory-assistant directory
./scripts/unix/start-all.sh
./scripts/unix/start-frontend.sh  
./scripts/unix/start-backend.sh
```

#### Windows

##### When to Use .bat vs .ps1 Scripts

| Terminal | Script Type | Command Example |
|----------|-------------|-----------------|
| **Command Prompt (cmd.exe)** | `.bat` files | `scripts\windows\start-all.bat` |
| **PowerShell** | `.ps1` files | `scripts\windows\start-all.ps1` |
| **Windows Terminal** | Either (depends on shell) | Run detection script first |

##### Command Prompt (cmd.exe)

```cmd
# Navigate to project directory
cd medical-device-regulatory-assistant

# Run any .bat script directly
scripts\windows\start-all.bat
scripts\windows\start-frontend.bat
scripts\windows\start-backend.bat
```

##### PowerShell

```powershell
# Navigate to project directory
cd medical-device-regulatory-assistant

# Run .ps1 scripts (may require execution policy change)
scripts\windows\start-all.ps1
scripts\windows\start-frontend.ps1
scripts\windows\start-backend.ps1

# If you get execution policy errors, run:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

##### Terminal Detection

Not sure which terminal you're using? Run the detection script:

```cmd
# Command Prompt
scripts\windows\detect-terminal.bat

# PowerShell
scripts\windows\detect-terminal.ps1
```

### Manual Development Setup

If you prefer manual setup or need more control:

#### Environment Setup

Create a `.env.local` file in the `medical-device-regulatory-assistant` directory and add the following variables:

```bash
# .env.local
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FDA_API_KEY=your-fda-api-key
DATABASE_URL=sqlite:./dev.db
REDIS_URL=redis://localhost:6379
```

**📖 For detailed instructions on generating these keys and secrets, see:**
- **[Environment Setup Guide](medical-device-regulatory-assistant/docs/ENVIRONMENT_SETUP_GUIDE.md)** - Complete guide for all platforms and cloud providers

#### Frontend (Next.js)

**Important**: Only use `pnpm` for frontend package management. Do not use `npm` or `yarn`.

```bash
cd medical-device-regulatory-assistant

# Install dependencies (pnpm only)
pnpm install

# Start development server with Turbopack (default)
pnpm dev

# Start development server with Webpack (fallback)
pnpm dev:webpack

# Run tests with enhanced testing infrastructure
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run performance tests
pnpm test:performance
```

**Enhanced Testing Features**:
- **React Testing Utilities**: Proper `act()` wrapping eliminates React lifecycle warnings
- **Mock Toast System**: Reliable toast notification testing without issues
- **Performance Monitoring**: Automatic detection of slow tests and memory leaks
- **95%+ Test Success Rate**: Comprehensive error resolution ensures reliable tests

#### Backend (FastAPI)

**Important**: Only use `poetry` for backend package management. Do not use `pip`, `conda`, or other Python package managers.

```bash
cd medical-device-regulatory-assistant/backend

# Install dependencies (poetry only)
poetry install

# Start development server
poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8000

# Run tests with enhanced testing infrastructure
poetry run python -m pytest tests/ -v

# Run tests with performance monitoring
poetry run python -m pytest tests/ -v --performance-report

# Run specific test categories
poetry run python -m pytest tests/test_database_isolation.py -v
poetry run python -m pytest tests/test_exception_handling.py -v
poetry run python -m pytest tests/test_performance_monitor.py -v
```

**Enhanced Testing Features**:
- **Database Test Isolation**: Each test runs in its own transaction with automatic rollback
- **Exception Handling**: Unified exception hierarchy with detailed error context
- **Performance Monitoring**: Automatic tracking of test execution time and resource usage
- **API Testing**: Robust API client with retry logic and graceful failure handling
- **100% Integration Test Success Rate**: Comprehensive error resolution ensures reliable backend tests

### Application URLs

Once started, the application will be available at:

- **Frontend**: http://localhost:3000 (powered by Turbopack)
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

### Development Performance

This project uses **Turbopack** for frontend development, providing:

- **Faster startup times**: Up to 10x faster than Webpack for large applications
- **Faster updates**: Near-instant hot module replacement (HMR)
- **Better memory usage**: More efficient bundling and caching
- **Improved developer experience**: Faster feedback loops during development

If you encounter any issues with Turbopack, you can fall back to Webpack using:
```bash
pnpm dev:webpack
```

Or use the `--webpack` flag with the shell scripts:
```bash
./start-frontend.sh --webpack
```

## 7. Project Structure

The repository is organized into a main application folder, `medical-device-regulatory-assistant`, which contains the frontend and backend services.

```text
project-root/
├── medical-device-regulatory-assistant/
│   ├── backend/            # FastAPI Python services
│   │   ├── agents/         # LangGraph agent implementations
│   │   ├── api/            # FastAPI endpoints
│   │   ├── database/       # Database configurations and migrations
│   │   ├── models/         # Data models and schemas
│   │   ├── services/       # Business logic services
│   │   ├── tests/          # Backend tests
│   │   └── tools/          # Agent tools (FDA API, document processing)
│   ├── src/                # Next.js frontend source
│   │   ├── app/            # Next.js App Router
│   │   ├── components/     # React components
│   │   ├── hooks/          # React hooks
│   │   ├── lib/            # Library functions
│   │   ├── pages/          # Next.js Pages Router
│   │   ├── styles/         # CSS styles
│   │   └── types/          # TypeScript types
│   ├── public/             # Static assets
│   ├── .github/            # GitHub workflows
│   ├── e2e/                # End-to-end tests
│   ├── monitoring/         # Monitoring configurations
│   ├── nginx/              # Nginx configuration
│   ├── scripts/            # Helper scripts
│   ├── .env.example        # Example environment variables
│   ├── package.json        # Frontend dependencies and scripts
│   └── ...
├── .kiro/
│   ├── steering/           # High-level steering documents
│   └── specs/              # Detailed feature specifications
└── docs/                   # Technical documentation
```

## 8. Testing

The project includes a comprehensive testing strategy using `pytest` for the backend and `React Testing Library` with `Jest` for the frontend.

To run the tests, please see the commands provided in the **Manual Development Setup** section above.

## 9. Compliance and Safety

This tool is designed with regulatory compliance at its core.

- **Human-in-the-Loop**: The AI is an assistant. A qualified human professional must review and approve all critical AI outputs.
- **Auditable Traceability**: Every action taken by the agent is logged in a transparent, human-readable format, providing a full "reasoning trace."
- **Confidence & Citation**: Every piece of information the agent provides is accompanied by a confidence score (0-1) and a direct citation to the source URL or document.

## 10. Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial
- [FastAPI Documentation](https://fastapi.tiangolo.com/) - learn about FastAPI features
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/) - learn about agent workflows
- [CopilotKit Documentation](https://docs.copilotkit.ai/) - learn about AI-powered UI components

You can check out the [Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## 11. Production Deployment

### Automated Production Setup

For quick production deployment, use the automated setup script:

```bash
cd medical-device-regulatory-assistant
chmod +x scripts/setup-production.sh
./scripts/setup-production.sh
```

The `setup-production.sh` script will:

1. **Check Dependencies**: Verify Node.js and pnpm are installed
2. **Generate Secure Secrets**: Create a cryptographically secure `NEXTAUTH_SECRET`
3. **Create Environment File**: Generate `.env.production` with proper configuration
4. **Install Dependencies**: Run `pnpm install` for all packages
5. **Build Application**: Create optimized production build
6. **Setup Process Management**: Create PM2 ecosystem configuration
7. **Create Log Directories**: Setup logging infrastructure

### Manual Production Setup

If you prefer manual setup or need custom configuration:

#### 1. Environment Configuration

Create `.env.production` with your production values:

```bash
# Copy example and customize
cp .env.example .env.production

# Required variables for production:
ENVIRONMENT=production
NEXTAUTH_URL=https://your-domain.com
NEXTAUTH_SECRET=your-super-secure-random-string-at-least-32-characters
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret
```

#### 2. Build and Deploy

```bash
# Install dependencies
pnpm install

# Build for production
pnpm build

# Start production server
pnpm start

# Or use PM2 for process management
pm2 start ecosystem.config.js
```

### Production Requirements

Before deploying to production, ensure you have:

- **Google OAuth 2.0 Credentials**: Required for user authentication
- **Secure NEXTAUTH_SECRET**: 32+ character random string
- **HTTPS Certificate**: For production domains
- **Process Manager**: PM2 or similar for production reliability

### Deployment Options

1. **Simple Start**: `pnpm start` (basic production server)
2. **PM2 Process Manager**: `pm2 start ecosystem.config.js` (recommended)
3. **Docker**: Use provided Dockerfile for containerized deployment
4. **Vercel/Netlify**: Deploy directly to cloud platforms

For detailed production deployment instructions, see:
- `docs/PRODUCTION_DEPLOYMENT.md` - Complete deployment guide
- `docs/DEVELOPMENT_SETUP.md` - Development environment setup

### Security Considerations

- Never commit `.env.production` to version control
- Use environment variable injection in your deployment platform
- Rotate secrets regularly
- Always use HTTPS in production
- Consider upgrading from SQLite to PostgreSQL for production databases

## 12. Additional Resources

### Documentation

- **[Environment Setup Guide](medical-device-regulatory-assistant/docs/ENVIRONMENT_SETUP_GUIDE.md)** - Complete guide for generating keys, secrets, and configuring environment variables across all platforms
- **[Production Deployment Guide](medical-device-regulatory-assistant/docs/PRODUCTION_DEPLOYMENT.md)** - Detailed deployment instructions
- **[Development Setup Guide](medical-device-regulatory-assistant/docs/DEVELOPMENT_SETUP.md)** - Quick development environment setup

### External Resources

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API
- [FastAPI Documentation](https://fastapi.tiangolo.com/) - learn about FastAPI features
- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/) - learn about agent workflows
