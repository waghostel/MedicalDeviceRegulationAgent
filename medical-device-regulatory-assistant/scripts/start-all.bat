@echo off
REM Medical Device Regulatory Assistant - Master Startup Script (CMD)
REM This script starts both frontend and backend services

echo ========================================
echo Medical Device Regulatory Assistant MVP
echo ========================================
echo.
echo Starting both Frontend and Backend services...
echo.

REM Check if we're in the correct directory
if not exist "package.json" (
    echo Error: package.json not found. Please run this script from the medical-device-regulatory-assistant directory.
    echo Current directory: %CD%
    pause
    exit /b 1
)

if not exist "backend\pyproject.toml" (
    echo Error: backend\pyproject.toml not found. Please run this script from the medical-device-regulatory-assistant directory.
    echo Current directory: %CD%
    pause
    exit /b 1
)

REM Check if required tools are installed
echo Checking prerequisites...

pnpm --version >nul 2>&1
if errorlevel 1 (
    echo Error: pnpm is not installed. Please install pnpm first: npm install -g pnpm
    pause
    exit /b 1
)

poetry --version >nul 2>&1
if errorlevel 1 (
    echo Error: Poetry is not installed. Please install Poetry first: https://python-poetry.org/docs/#installation
    pause
    exit /b 1
)

echo Prerequisites check passed!
echo.

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing frontend dependencies...
    pnpm install
    if errorlevel 1 (
        echo Error: Failed to install frontend dependencies.
        pause
        exit /b 1
    )
)

cd backend
poetry env info >nul 2>&1
if errorlevel 1 (
    echo Installing backend dependencies...
    poetry install
    if errorlevel 1 (
        echo Error: Failed to install backend dependencies.
        cd ..
        pause
        exit /b 1
    )
)
cd ..

echo.
echo ========================================
echo Starting Services
echo ========================================
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo.
echo Press Ctrl+C in each window to stop services
echo Close this window to stop monitoring
echo ========================================
echo.

REM Start backend in new window
start "Medical Device Assistant - Backend" cmd /k "cd /d %CD%\backend && poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8000"

REM Wait a moment for backend to start
timeout /t 3 /nobreak >nul

REM Start frontend in new window
start "Medical Device Assistant - Frontend" cmd /k "cd /d %CD% && pnpm dev"

echo Both services are starting in separate windows...
echo.
echo To stop all services:
echo 1. Press Ctrl+C in each service window
echo 2. Or close the service windows directly
echo 3. Or close this monitoring window
echo.
pause