@echo off
REM Medical Device Regulatory Assistant - Frontend Startup Script (CMD)
REM This script starts the Next.js frontend development server

echo Starting Medical Device Regulatory Assistant Frontend...
echo.

REM Check if we're in the correct directory
if not exist "package.json" (
    echo Error: package.json not found. Please run this script from the medical-device-regulatory-assistant directory.
    echo Current directory: %CD%
    pause
    exit /b 1
)

REM Check if pnpm is installed
pnpm --version >nul 2>&1
if errorlevel 1 (
    echo Error: pnpm is not installed or not in PATH.
    echo Please install pnpm first: npm install -g pnpm
    pause
    exit /b 1
)

REM Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    pnpm install
    if errorlevel 1 (
        echo Error: Failed to install dependencies.
        pause
        exit /b 1
    )
)

REM Start the development server
echo Starting Next.js development server...
echo Frontend will be available at: http://localhost:3000
echo Press Ctrl+C to stop the server
echo.
pnpm dev

REM If we get here, the server was stopped
echo Frontend server stopped.
pause