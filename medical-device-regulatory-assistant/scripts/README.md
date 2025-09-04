# Development Scripts

This directory contains platform-specific scripts for starting the Medical Device Regulatory Assistant development environment.

## Directory Structure

```text
scripts/
├── windows/          # Windows-specific scripts (.bat and .ps1)
│   ├── start-frontend.bat
│   ├── start-backend.bat
│   ├── start-all.bat
│   ├── detect-terminal.bat
│   └── detect-terminal.ps1
├── unix/             # Mac/Linux scripts (.sh)
│   ├── start-frontend.sh
│   ├── start-backend.sh
│   └── start-all.sh
└── README.md         # This file
```

## Quick Reference

### Root Level Scripts (Recommended)

From the project root directory:

```bash
./start-dev.sh        # Start both frontend and backend
./start-frontend.sh   # Start frontend only
./start-backend.sh    # Start backend only
```

### Platform-Specific Scripts

From the `medical-device-regulatory-assistant` directory:

**Mac/Linux:**

```bash
./scripts/unix/start-all.sh       # Start both services
./scripts/unix/start-frontend.sh  # Start frontend only
./scripts/unix/start-backend.sh   # Start backend only
```

**Windows:**

```cmd
scripts\windows\start-all.bat       # Start both services (Command Prompt)
scripts\windows\start-all.ps1       # Start both services (PowerShell)
scripts\windows\start-frontend.bat  # Start frontend only
scripts\windows\start-backend.bat   # Start backend only
```

## Services

When running, the services will be available at:

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Prerequisites

Scripts will automatically check for and guide installation of:

- **Node.js** (v18+) and **pnpm**
- **Python** (3.11+) and **Poetry**

## Troubleshooting

1. **Permission denied on Mac/Linux**:
   ```bash
   chmod +x scripts/unix/*.sh
   ```

2. **Missing package managers**:
   ```bash
   # Install pnpm
   npm install -g pnpm
   
   # Install Poetry
   curl -sSL https://install.python-poetry.org | python3 -
   ```

3. **Port conflicts**: Ensure ports 3000 and 8000 are available

For detailed usage instructions, see the main project README.