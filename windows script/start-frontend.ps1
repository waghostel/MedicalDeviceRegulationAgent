# Medical Device Regulatory Assistant - Frontend Startup Script (PowerShell)
# This script starts the Next.js frontend development server

Write-Host "Starting Medical Device Regulatory Assistant Frontend..." -ForegroundColor Green
Write-Host ""

# Navigate to the medical-device-regulatory-assistant directory if it exists
if (Test-Path "medical-device-regulatory-assistant") {
    Set-Location "medical-device-regulatory-assistant"
    Write-Host "Navigated to medical-device-regulatory-assistant directory" -ForegroundColor Cyan
} elseif (-not (Test-Path "package.json")) {
    Write-Host "Error: package.json not found." -ForegroundColor Red
    Write-Host "Please run this script from either:" -ForegroundColor Yellow
    Write-Host "  1. The parent directory containing 'medical-device-regulatory-assistant' folder" -ForegroundColor Yellow
    Write-Host "  2. The 'medical-device-regulatory-assistant' directory itself" -ForegroundColor Yellow
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Double-check we're in the correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "Error: package.json not found after navigation." -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if pnpm is installed
try {
    $pnpmVersion = pnpm --version 2>$null
    Write-Host "Found pnpm version: $pnpmVersion" -ForegroundColor Cyan
} catch {
    Write-Host "Error: pnpm is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install pnpm first: npm install -g pnpm" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if node_modules exists, if not install dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    pnpm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error: Failed to install dependencies." -ForegroundColor Red
        # Return to original directory if we navigated
        if ((Split-Path -Leaf (Get-Location)) -eq "medical-device-regulatory-assistant") {
            Set-Location ..
        }
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Start the development server
Write-Host "Starting Next.js development server..." -ForegroundColor Green
Write-Host "Frontend will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

try {
    pnpm dev
} catch {
    Write-Host "Frontend server encountered an error." -ForegroundColor Red
} finally {
    # Return to original directory if we navigated
    if ((Split-Path -Leaf (Get-Location)) -eq "medical-device-regulatory-assistant") {
        Set-Location ..
    }
    Write-Host "Frontend server stopped." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
}