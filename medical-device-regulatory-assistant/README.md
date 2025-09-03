# Medical Device Regulatory Assistant MVP

An AI-powered regulatory assistant designed specifically for medical device regulatory pathway discovery, with an initial focus on the US FDA market.

## Quick Start (Windows)

### Option 1: Automatic Setup (Recommended)
Use our startup scripts to automatically detect your environment and start the application:

```cmd
# For Command Prompt (cmd.exe)
scripts\start-all.bat

# For PowerShell
scripts\start-all.ps1
```

### Option 2: Manual Setup
If you prefer to start services individually:

**Frontend only:**
```cmd
# Command Prompt
scripts\start-frontend.bat

# PowerShell  
scripts\start-frontend.ps1
```

**Backend only:**
```cmd
# Command Prompt
scripts\start-backend.bat

# PowerShell
scripts\start-backend.ps1
```

## Windows Script Guide

### When to Use .bat vs .ps1 Scripts

| Terminal | Script Type | Command Example |
|----------|-------------|-----------------|
| **Command Prompt (cmd.exe)** | `.bat` files | `scripts\start-all.bat` |
| **PowerShell** | `.ps1` files | `scripts\start-all.ps1` |
| **Windows Terminal** | Either (depends on shell) | Run detection script first |

### How to Run Scripts

#### Command Prompt (cmd.exe)
```cmd
# Navigate to project directory
cd medical-device-regulatory-assistant

# Run any .bat script directly
scripts\start-all.bat
scripts\start-frontend.bat
scripts\start-backend.bat
```

#### PowerShell
```powershell
# Navigate to project directory
cd medical-device-regulatory-assistant

# Run .ps1 scripts (may require execution policy change)
scripts\start-all.ps1
scripts\start-frontend.ps1
scripts\start-backend.ps1

# If you get execution policy errors, run:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Terminal Detection
Not sure which terminal you're using? Run the detection script:

```cmd
# Command Prompt
scripts\detect-terminal.bat

# PowerShell
scripts\detect-terminal.ps1
```

### Prerequisites

The startup scripts will automatically check for and guide you through installing:

- **Node.js** (v18 or higher)
- **pnpm** (package manager for frontend)
- **Python** (3.11 or higher)
- **Poetry** (package manager for backend)

## Manual Development Setup

If you prefer manual setup or are using a different operating system:

### Frontend (Next.js)
```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
```

### Backend (FastAPI)
```bash
# Navigate to backend directory
cd backend

# Install dependencies
poetry install

# Start development server
poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## Application URLs

Once started, the application will be available at:

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Project Structure

This is a full-stack application with:
- **Frontend**: Next.js 14 with React, TypeScript, Tailwind CSS, and Shadcn UI
- **Backend**: FastAPI with Python, LangGraph agents, and SQLite database
- **AI Integration**: CopilotKit for conversational UI and LangGraph for agent workflows

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
