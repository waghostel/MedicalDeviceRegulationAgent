# Medical Device Regulatory Assistant - Frontend Startup Script (PowerShell)
# This script starts the Next.js frontend development server with Turbopack

param(
    [Parameter(HelpMessage="Custom port (default: 3000)")]
    [int]$Port = 3000,
    
    [Parameter(HelpMessage="Use Webpack instead of Turbopack")]
    [switch]$UseWebpack,
    
    [Parameter(HelpMessage="Show detailed output")]
    [switch]$ShowDetails
)

Write-Host "🎨 Medical Device Regulatory Assistant - Frontend Service" -ForegroundColor Cyan
Write-Host "=" * 55 -ForegroundColor Cyan
Write-Host ""

# Store original directory for cleanup
$originalDir = Get-Location

# Try to find and navigate to the project directory
$projectFound = $false

# Check if we're already in the project directory
if (Test-Path "package.json") {
    $projectFound = $true
    Write-Host "✓ Already in medical-device-regulatory-assistant directory" -ForegroundColor Green
}
# Check if project directory exists in current location
elseif (Test-Path "medical-device-regulatory-assistant") {
    Set-Location "medical-device-regulatory-assistant"
    $projectFound = $true
    Write-Host "✓ Navigated to medical-device-regulatory-assistant directory" -ForegroundColor Green
}
# Check if project directory exists in parent directory (for scripts in subdirectories)
elseif (Test-Path "..\medical-device-regulatory-assistant") {
    Set-Location "..\medical-device-regulatory-assistant"
    $projectFound = $true
    Write-Host "✓ Navigated to ../medical-device-regulatory-assistant directory" -ForegroundColor Green
}

if (-not $projectFound) {
    Write-Host "❌ Project files not found." -ForegroundColor Red
    Write-Host "Please run this script from either:" -ForegroundColor Yellow
    Write-Host "  1. The parent directory containing 'medical-device-regulatory-assistant' folder" -ForegroundColor Yellow
    Write-Host "  2. The 'medical-device-regulatory-assistant' directory itself" -ForegroundColor Yellow
    Write-Host "  3. A subdirectory (like 'windows script') of the parent directory" -ForegroundColor Yellow
    Write-Host "Current directory: $originalDir" -ForegroundColor Yellow
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
    if ($ShowDetails) {
        Write-Host "✓ Found pnpm version: $pnpmVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ pnpm is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install pnpm first: npm install -g pnpm" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if node_modules exists, if not install dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "⏳ Installing dependencies..." -ForegroundColor Yellow
    pnpm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies." -ForegroundColor Red
        # Return to original directory if we navigated
        if ((Split-Path -Leaf (Get-Location)) -eq "medical-device-regulatory-assistant") {
            Set-Location ..
        }
        Read-Host "Press Enter to exit"
        exit 1
    }
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
}

# Set optimized environment variables
$env:NODE_ENV = "development"
$env:NEXT_TELEMETRY_DISABLED = "1"
$env:NEXT_WEBPACK_USEPOLLING = "false"

# Determine which bundler to use
$bundler = if ($UseWebpack) { "Webpack" } else { "Turbopack" }
$devCommand = if ($UseWebpack) { "dev:webpack" } else { "dev" }

# Start the development server
Write-Host "🚀 Starting Next.js development server with $bundler..." -ForegroundColor Green
Write-Host "Frontend will be available at: http://localhost:$Port" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

try {
    if ($Port -ne 3000) {
        pnpm $devCommand --port $Port
    } else {
        pnpm $devCommand
    }
} catch {
    Write-Host "❌ Frontend server encountered an error." -ForegroundColor Red
} finally {
    # Return to original directory
    Set-Location $originalDir
    Write-Host "🛑 Frontend server stopped." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
}