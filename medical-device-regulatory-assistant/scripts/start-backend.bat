@echo off
REM Medical Device Regulatory Assistant - Backend Startup Script (CMD)
REM This script starts the FastAPI backend development server

echo Starting Medical Device Regulatory Assistant Backend...
echo.

REM Check if we're in the correct directory
if not exist "backend\pyproject.toml" (
    echo Error: backend\pyproject.toml not found. Please run this script from the medical-device-regulatory-assistant directory.
    echo Current directory: %CD%
    pause
    exit /b 1
)

REM Check if poetry is installed
poetry --version >nul 2>&1
if errorlevel 1 (
    echo Error: Poetry is not installed or not in PATH.
    echo Please install Poetry first: https://python-poetry.org/docs/#installation
    pause
    exit /b 1
)

REM Navigate to backend directory
cd backend

REM Check if virtual environment exists, if not install dependencies
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

REM Start the FastAPI development server
echo Starting FastAPI development server...
echo Backend will be available at: http://localhost:8000
echo API documentation at: http://localhost:8000/docs
echo Press Ctrl+C to stop the server
echo.
poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8000

REM If we get here, the server was stopped
cd ..
echo Backend server stopped.
pause