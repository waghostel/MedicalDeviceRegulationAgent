Set-Location "C:\Users\Cheney\Documents\Github\MedicalDeviceRegulationAgent\medical-device-regulatory-assistant"
# Medical Device Regulatory Assistant - Master Startup Script (PowerShell)
# This script starts both frontend and backend services

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Medical Device Regulatory Assistant MVP" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Starting both Frontend and Backend services..." -ForegroundColor Yellow
Write-Host ""

# Check if we're in the correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "Error: package.json not found. Please run this script from the medical-device-regulatory-assistant directory." -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

if (-not (Test-Path "backend\pyproject.toml")) {
    Write-Host "Error: backend\pyproject.toml not found. Please run this script from the medical-device-regulatory-assistant directory." -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if required tools are installed
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

try {
    $pnpmVersion = pnpm --version 2>$null
    Write-Host "✓ pnpm: $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ pnpm is not installed. Please install pnpm first: npm install -g pnpm" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

try {
    $poetryVersion = poetry --version 2>$null
    Write-Host "✓ Poetry: $poetryVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Poetry is not installed. Please install Poetry first: https://python-poetry.org/docs/#installation" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "Prerequisites check passed!" -ForegroundColor Green
Write-Host ""

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    pnpm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to install frontend dependencies." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Set-Location backend
try {
    poetry env info | Out-Null
    Write-Host "✓ Backend environment ready" -ForegroundColor Green
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
Set-Location ..

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Starting Services" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Backend:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C in each window to stop services" -ForegroundColor Yellow
Write-Host "Close this window to stop monitoring" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start backend in new PowerShell window
$backendPath = Join-Path (Get-Location) "backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backendPath'; poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8000" -WindowStyle Normal

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend in new PowerShell window
$frontendPath = Get-Location
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontendPath'; pnpm dev" -WindowStyle Normal

Write-Host "Both services are starting in separate windows..." -ForegroundColor Green
Write-Host ""
Write-Host "To stop all services:" -ForegroundColor Yellow
Write-Host "1. Press Ctrl+C in each service window" -ForegroundColor White
Write-Host "2. Or close the service windows directly" -ForegroundColor White
Write-Host "3. Or close this monitoring window" -ForegroundColor White
Write-Host ""
Read-Host "Press Enter to close this monitoring window"