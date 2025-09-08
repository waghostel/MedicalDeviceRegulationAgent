# Medical Device Regulatory Assistant - Backend Startup Script (PowerShell)
# This script starts the FastAPI backend development server

Write-Host "Starting Medical Device Regulatory Assistant Backend..." -ForegroundColor Green
Write-Host ""

# Navigate to the medical-device-regulatory-assistant directory if it exists
if (Test-Path "medical-device-regulatory-assistant") {
    Set-Location "medical-device-regulatory-assistant"
    Write-Host "Navigated to medical-device-regulatory-assistant directory" -ForegroundColor Cyan
} elseif (-not (Test-Path "backend\pyproject.toml")) {
    Write-Host "Error: backend\pyproject.toml not found." -ForegroundColor Red
    Write-Host "Please run this script from either:" -ForegroundColor Yellow
    Write-Host "  1. The parent directory containing 'medical-device-regulatory-assistant' folder" -ForegroundColor Yellow
    Write-Host "  2. The 'medical-device-regulatory-assistant' directory itself" -ForegroundColor Yellow
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Double-check we're in the correct directory
if (-not (Test-Path "backend\pyproject.toml")) {
    Write-Host "Error: backend\pyproject.toml not found after navigation." -ForegroundColor Red
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
        # Return to original directory
        if ((Split-Path -Leaf (Get-Location)) -eq "backend") {
            Set-Location ..
            if ((Split-Path -Leaf (Get-Location)) -eq "medical-device-regulatory-assistant") {
                Set-Location ..
            }
        }
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Check Redis availability (optional service)
Write-Host "Checking optional services..." -ForegroundColor Yellow
try {
    $redisTest = Test-NetConnection -ComputerName "localhost" -Port 6379 -InformationLevel Quiet -WarningAction SilentlyContinue
    if ($redisTest) {
        Write-Host "Redis: Available on port 6379" -ForegroundColor Green
    } else {
        Write-Host "Redis: Not available (optional - health checks may show warnings)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Redis: Not available (optional - health checks may show warnings)" -ForegroundColor Yellow
}

# Start the FastAPI development server
Write-Host "Starting FastAPI development server..." -ForegroundColor Green
Write-Host "Backend will be available at: http://localhost:8000" -ForegroundColor Cyan
Write-Host "API documentation at: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "Health check at: http://localhost:8000/health" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

try {
    poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8000
} catch {
    Write-Host "Backend server encountered an error." -ForegroundColor Red
} finally {
    # Return to parent directory if we navigated into medical-device-regulatory-assistant
    if ((Split-Path -Leaf (Get-Location)) -eq "backend") {
        Set-Location ..
        if ((Split-Path -Leaf (Get-Location)) -eq "medical-device-regulatory-assistant") {
            Set-Location ..
        }
    }
    Write-Host "Backend server stopped." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
}