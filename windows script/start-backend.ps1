# Medical Device Regulatory Assistant - Backend Startup Script (PowerShell)
# This script starts the FastAPI backend development server

param(
    [Parameter(HelpMessage="Custom port (default: 8000)")]
    [int]$Port = 8000,
    
    [Parameter(HelpMessage="Show detailed output")]
    [switch]$ShowDetails,
    
    [Parameter(HelpMessage="Skip health checks for faster startup")]
    [switch]$Fast
)

Write-Host "🔧 Medical Device Regulatory Assistant - Backend Service" -ForegroundColor Cyan
Write-Host "=" * 55 -ForegroundColor Cyan
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
    if ($ShowDetails) {
        Write-Host "✓ Found Poetry: $poetryVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Poetry is not installed or not in PATH." -ForegroundColor Red
    Write-Host "Please install Poetry first: https://python-poetry.org/docs/#installation" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Navigate to backend directory
Set-Location backend

# Check if virtual environment exists, if not install dependencies
try {
    poetry env info | Out-Null
    if ($ShowDetails) {
        Write-Host "✅ Poetry environment found." -ForegroundColor Green
    }
} catch {
    Write-Host "⏳ Installing backend dependencies..." -ForegroundColor Yellow
    poetry install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install backend dependencies." -ForegroundColor Red
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
    Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
}

# Set optimized environment variables
$env:PYTHONPATH = "."
$env:UVICORN_LOG_LEVEL = if ($ShowDetails) { "info" } else { "warning" }

if ($Fast) {
    $env:SKIP_HEALTH_CHECKS = "true"
    $env:DISABLE_FDA_API_CHECK = "true"
    $env:DISABLE_REDIS = "true"
}

# Check Redis availability (optional service) - only if not in fast mode
if (-not $Fast) {
    Write-Host "⏳ Checking optional services..." -ForegroundColor Yellow
    try {
        $redisTest = Test-NetConnection -ComputerName "localhost" -Port 6379 -InformationLevel Quiet -WarningAction SilentlyContinue
        if ($redisTest) {
            Write-Host "✅ Redis: Available on port 6379" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Redis: Not available (optional - health checks may show warnings)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  Redis: Not available (optional - health checks may show warnings)" -ForegroundColor Yellow
    }
}

# Start the FastAPI development server
Write-Host "🚀 Starting FastAPI development server..." -ForegroundColor Green
Write-Host "Backend will be available at: http://localhost:$Port" -ForegroundColor Cyan
Write-Host "📚 API documentation at: http://localhost:$Port/docs" -ForegroundColor Cyan
Write-Host "🏥 Health check at: http://localhost:$Port/health" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

try {
    $logLevel = if ($ShowDetails) { "info" } else { "warning" }
    poetry run uvicorn main:app --reload --host 0.0.0.0 --port $Port --log-level $logLevel
} catch {
    Write-Host "❌ Backend server encountered an error." -ForegroundColor Red
} finally {
    # Return to parent directory if we navigated into medical-device-regulatory-assistant
    if ((Split-Path -Leaf (Get-Location)) -eq "backend") {
        Set-Location ..
        if ((Split-Path -Leaf (Get-Location)) -eq "medical-device-regulatory-assistant") {
            Set-Location ..
        }
    }
    Write-Host "🛑 Backend server stopped." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
}