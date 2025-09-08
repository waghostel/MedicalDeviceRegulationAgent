# Optimized Development Startup Script
# Medical Device Regulatory Assistant MVP - Optimized Version

param(
    [Parameter(HelpMessage="Skip health checks to start faster")]
    [switch]$Fast,
    
    [Parameter(HelpMessage="Show detailed startup progress")]
    [switch]$ShowProgress,
    
    [Parameter(HelpMessage="Skip frontend startup")]
    [switch]$BackendOnly,
    
    [Parameter(HelpMessage="Skip backend startup")]
    [switch]$FrontendOnly
)

# Performance tracking
$script:StartTime = Get-Date
$script:StepTimes = @{}

function Write-Progress-Step {
    param(
        [string]$Step,
        [string]$Status = "Starting"
    )
    
    $currentTime = Get-Date
    $elapsed = ($currentTime - $script:StartTime).TotalMilliseconds
    
    if ($Status -eq "Completed") {
        $stepStart = $script:StepTimes[$Step]
        $stepDuration = ($currentTime - $stepStart).TotalMilliseconds
        Write-Host "✅ $Step completed in $([math]::Round($stepDuration))ms" -ForegroundColor Green
    } else {
        $script:StepTimes[$Step] = $currentTime
        if ($ShowProgress) {
            Write-Host "⏳ $Step... (${elapsed}ms elapsed)" -ForegroundColor Yellow
        } else {
            Write-Host "⏳ $Step..." -ForegroundColor Yellow
        }
    }
}

function Test-Port {
    param([int]$Port)
    
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.Connect("localhost", $Port)
        $tcpClient.Close()
        return $true
    }
    catch {
        return $false
    }
}

function Wait-ForService {
    param(
        [string]$Name,
        [int]$Port,
        [int]$TimeoutSeconds = 30,
        [string]$HealthEndpoint = $null
    )
    
    Write-Progress-Step "Waiting for $Name"
    
    $timeout = (Get-Date).AddSeconds($TimeoutSeconds)
    $ready = $false
    
    while ((Get-Date) -lt $timeout -and -not $ready) {
        if (Test-Port $Port) {
            if ($HealthEndpoint) {
                try {
                    $response = Invoke-RestMethod -Uri $HealthEndpoint -TimeoutSec 2 -ErrorAction SilentlyContinue
                    if ($response) {
                        $ready = $true
                    }
                }
                catch {
                    # Health check failed, continue waiting
                }
            } else {
                $ready = $true
            }
        }
        
        if (-not $ready) {
            Start-Sleep -Milliseconds 200
        }
    }
    
    if ($ready) {
        Write-Progress-Step "Waiting for $Name" "Completed"
        return $true
    } else {
        Write-Host "⚠️  $Name did not start within ${TimeoutSeconds}s" -ForegroundColor Yellow
        return $false
    }
}

function Start-BackendOptimized {
    Write-Progress-Step "Backend Prerequisites Check"
    
    # Quick prerequisite check
    try {
        $poetryVersion = poetry --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "Poetry not found"
        }
    }
    catch {
        Write-Host "❌ Poetry not found. Please install Poetry first." -ForegroundColor Red
        return $false
    }
    
    Write-Progress-Step "Backend Prerequisites Check" "Completed"
    
    # Navigate to backend directory
    Write-Progress-Step "Backend Environment Setup"
    Push-Location "medical-device-regulatory-assistant/backend"
    
    # Set optimized environment variables
    $env:PYTHONPATH = "."
    $env:UVICORN_LOG_LEVEL = "warning"  # Reduce log noise
    $env:DISABLE_REDIS = "true"  # Skip Redis for faster startup
    
    if ($Fast) {
        $env:SKIP_HEALTH_CHECKS = "true"
        $env:DISABLE_FDA_API_CHECK = "true"
    }
    
    Write-Progress-Step "Backend Environment Setup" "Completed"
    
    # Start backend with optimized settings
    Write-Progress-Step "Backend Server Startup"
    
    $backendArgs = @(
        "run", "uvicorn", "main:app",
        "--host", "0.0.0.0",
        "--port", "8000",
        "--reload"
    )
    
    if (-not $ShowProgress) {
        $backendArgs += "--log-level", "warning"
    }
    
    # Start backend in new window
    $backendProcess = Start-Process -FilePath "poetry" -ArgumentList $backendArgs -WindowStyle Normal -PassThru
    
    Pop-Location
    
    # Wait for backend to be ready (with timeout)
    if (-not $Fast) {
        $backendReady = Wait-ForService "Backend" 8000 15 "http://localhost:8000/health"
        if (-not $backendReady) {
            Write-Host "⚠️  Backend startup may have issues, but continuing..." -ForegroundColor Yellow
        }
    } else {
        # Just wait for port to be open
        Wait-ForService "Backend" 8000 10
    }
    
    Write-Progress-Step "Backend Server Startup" "Completed"
    return $true
}

function Start-FrontendOptimized {
    Write-Progress-Step "Frontend Prerequisites Check"
    
    # Quick prerequisite check
    try {
        $pnpmVersion = pnpm --version 2>$null
        if ($LASTEXITCODE -ne 0) {
            throw "pnpm not found"
        }
    }
    catch {
        Write-Host "❌ pnpm not found. Please install pnpm first." -ForegroundColor Red
        return $false
    }
    
    Write-Progress-Step "Frontend Prerequisites Check" "Completed"
    
    # Navigate to frontend directory
    Write-Progress-Step "Frontend Environment Setup"
    Push-Location "medical-device-regulatory-assistant"
    
    # Set optimized environment variables
    $env:NODE_ENV = "development"
    $env:NEXT_TELEMETRY_DISABLED = "1"  # Disable telemetry for faster startup
    
    Write-Progress-Step "Frontend Environment Setup" "Completed"
    
    # Start frontend
    Write-Progress-Step "Frontend Server Startup"
    
    $frontendArgs = @("dev", "--port", "3000")
    
    # Always use Turbopack for better performance
    # Note: Turbopack is now enabled by default in package.json
    
    # Start frontend in new window
    $frontendProcess = Start-Process -FilePath "pnpm" -ArgumentList $frontendArgs -WindowStyle Normal -PassThru
    
    Pop-Location
    
    # Wait for frontend to be ready
    if (-not $Fast) {
        $frontendReady = Wait-ForService "Frontend" 3000 20
        if (-not $frontendReady) {
            Write-Host "⚠️  Frontend startup may have issues, but continuing..." -ForegroundColor Yellow
        }
    } else {
        # Just wait for port to be open
        Wait-ForService "Frontend" 3000 15
    }
    
    Write-Progress-Step "Frontend Server Startup" "Completed"
    return $true
}

function Show-StartupSummary {
    param(
        [bool]$BackendStarted,
        [bool]$FrontendStarted
    )
    
    $totalTime = ((Get-Date) - $script:StartTime).TotalMilliseconds
    
    Write-Host "`n🎉 Startup Summary" -ForegroundColor Cyan
    Write-Host "=" * 40 -ForegroundColor Cyan
    Write-Host "Total startup time: $([math]::Round($totalTime))ms ($([math]::Round($totalTime/1000, 1))s)" -ForegroundColor White
    
    if ($BackendStarted) {
        Write-Host "✅ Backend: http://localhost:8000" -ForegroundColor Green
        Write-Host "📚 API Docs: http://localhost:8000/docs" -ForegroundColor Green
    }
    
    if ($FrontendStarted) {
        Write-Host "✅ Frontend: http://localhost:3000 (Turbopack)" -ForegroundColor Green
    }
    
    # Performance rating
    if ($totalTime -lt 5000) {
        Write-Host "⭐ Performance: Excellent (< 5s)" -ForegroundColor Green
    } elseif ($totalTime -lt 8000) {
        Write-Host "⭐ Performance: Good (< 8s)" -ForegroundColor Green
    } elseif ($totalTime -lt 15000) {
        Write-Host "⭐ Performance: Acceptable (< 15s)" -ForegroundColor Yellow
    } else {
        Write-Host "⭐ Performance: Needs Improvement (> 15s)" -ForegroundColor Red
    }
    
    Write-Host "`n💡 Tips for faster startup:" -ForegroundColor Cyan
    Write-Host "  • Use -Fast flag to skip health checks" -ForegroundColor Gray
    Write-Host "  • Use -BackendOnly or -FrontendOnly for single service" -ForegroundColor Gray
    Write-Host "  • Install Redis for better performance (optional)" -ForegroundColor Gray
    
    Write-Host "`n🛑 To stop services:" -ForegroundColor Yellow
    Write-Host "  • Close the service windows directly" -ForegroundColor Gray
    Write-Host "  • Or press Ctrl+C in each service window" -ForegroundColor Gray
}

function Main {
    Write-Host "🚀 Medical Device Regulatory Assistant - Optimized Startup" -ForegroundColor Cyan
    Write-Host "=" * 60 -ForegroundColor Cyan
    
    if ($Fast) {
        Write-Host "⚡ Fast mode enabled - skipping health checks" -ForegroundColor Yellow
    }
    
    if ($ShowProgress) {
        Write-Host "📊 Progress mode enabled - showing detailed progress" -ForegroundColor Yellow
    }
    
    $backendStarted = $false
    $frontendStarted = $false
    
    # Start services based on parameters
    if (-not $FrontendOnly) {
        Write-Host "`n🔧 Starting Backend Services..." -ForegroundColor Cyan
        $backendStarted = Start-BackendOptimized
        
        if (-not $backendStarted) {
            Write-Host "❌ Backend startup failed" -ForegroundColor Red
            return 1
        }
    }
    
    if (-not $BackendOnly) {
        Write-Host "`n🎨 Starting Frontend Services..." -ForegroundColor Cyan
        $frontendStarted = Start-FrontendOptimized
        
        if (-not $frontendStarted) {
            Write-Host "❌ Frontend startup failed" -ForegroundColor Red
            return 1
        }
    }
    
    # Show summary
    Show-StartupSummary $backendStarted $frontendStarted
    
    # Keep script running to monitor
    Write-Host "`nPress Enter to close this monitoring window..." -ForegroundColor Yellow
    Read-Host
    
    return 0
}

# Run main function
$exitCode = Main
exit $exitCode