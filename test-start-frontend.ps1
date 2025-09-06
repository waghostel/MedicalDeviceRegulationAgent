# Medical Device Regulatory Assistant - Frontend Startup Script (PowerShell)
# Modified for testing - uses relative paths

Write-Host "Starting Medical Device Regulatory Assistant Frontend..." -ForegroundColor Green
Write-Host ""

# Navigate to the medical-device-regulatory-assistant directory
if (Test-Path "medical-device-regulatory-assistant") {
    Set-Location "medical-device-regulatory-assistant"
    Write-Host "Navigated to medical-device-regulatory-assistant directory" -ForegroundColor Cyan
} else {
    Write-Host "Error: medical-device-regulatory-assistant directory not found in current location." -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if we're in the correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "Error: package.json not found." -ForegroundColor Red
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
        Set-Location ..
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
    Set-Location ..
    Write-Host "Frontend server stopped." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
}