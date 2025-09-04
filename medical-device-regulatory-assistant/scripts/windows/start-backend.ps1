# Medical Device Regulatory Assistant - Backend Startup Script (PowerShell)
# This script starts the FastAPI backend development server

Write-Host "Starting Medical Device Regulatory Assistant Backend..." -ForegroundColor Green
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "backend\pyproject.toml")) {
    Write-Host "Error: backend\pyproject.toml not found. Please run this script from the medical-device-regulatory-assistant directory." -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if poetry is installed
try {
    $poetryVersion = poetry --version 2>$null
    Write-Host "Found Poetry: $poetryVersion" -ForegroundColor Cyan
} catch {
    Write-Host "Error: Poetry is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Poetry first: https://python-poetry.org/docs/#installation" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Navigate to backend directory
Set-Location backend

# Check if virtual environment exists, if not install dependencies
try {
    poetry env info | Out-Null
    Write-Host "Poetry environment found." -ForegroundColor Cyan
} catch {
    Write-Host "Installing backend dependencies..." -ForegroundColor Yellow
    poetry install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to install backend dependencies." -ForegroundColor Red
        Set-Location ..
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Start the FastAPI development server
Write-Host "Starting FastAPI development server..." -ForegroundColor Green
Write-Host "Backend will be available at: http://localhost:8000" -ForegroundColor Cyan
Write-Host "API documentation at: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

try {
    poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8000
} catch {
    Write-Host "Backend server encountered an error." -ForegroundColor Red
} finally {
    Set-Location ..
    Write-Host "Backend server stopped." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
}