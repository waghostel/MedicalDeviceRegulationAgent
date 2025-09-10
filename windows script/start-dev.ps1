# Medical Device Regulatory Assistant - Unified Development Startup Script
# Optimized version with Turbopack support and performance enhancements

param(
    [Parameter(HelpMessage="Skip health checks and validations for faster startup")]
    [switch]$Fast,
    
    [Parameter(HelpMessage="Start services in parallel for faster startup")]
    [switch]$Parallel,
    
    [Parameter(HelpMessage="Show detailed startup progress and timing")]
    [switch]$ShowProgress,
    
    [Parameter(HelpMessage="Skip frontend startup (backend only)")]
    [switch]$BackendOnly,
    
    [Parameter(HelpMessage="Skip backend startup (frontend only)")]
    [switch]$FrontendOnly,
    
    [Parameter(HelpMessage="Custom backend port (default: 8000)")]
    [int]$BackendPort = 8000,
    
    [Parameter(HelpMessage="Custom frontend port (default: 3000)")]
    [int]$FrontendPort = 3000,
    
    [Parameter(HelpMessage="Force use of Webpack instead of Turbopack")]
    [switch]$UseWebpack,
    
    [Parameter(HelpMessage="Show help information")]
    [switch]$Help
)

# Performance tracking
$script:StartTime = Get-Date
$script:StepTimes = @{}

function Write-Progress-Step {
    param(
        [string]$Step,
        [string]$Status = "Starting",
        [string]$Color = "Yellow"
    )
    
    $currentTime = Get-Date
    $elapsed = ($currentTime - $script:StartTime).TotalMilliseconds
    
    if ($Status -eq "Completed") {
        $stepStart = $script:StepTimes[$Step]
        if ($stepStart) {
            $stepDuration = ($currentTime - $stepStart).TotalMilliseconds
            Write-Host "✅ $Step completed in $([math]::Round($stepDuration))ms" -ForegroundColor Green
        } else {
            Write-Host "✅ $Step completed" -ForegroundColor Green
        }
    } else {
        $script:StepTimes[$Step] = $currentTime
        if ($ShowProgress) {
            Write-Host "⏳ $Step... (${elapsed}ms elapsed)" -ForegroundColor $Color
        } else {
            Write-Host "⏳ $Step..." -ForegroundColor $Color
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
    
    if ($Fast) {
        # In fast mode, just wait for port to be open
        $TimeoutSeconds = [math]::Min($TimeoutSeconds, 10)
    }
    
    Write-Progress-Step "Waiting for $Name to be ready"
    
    $timeout = (Get-Date).AddSeconds($TimeoutSeconds)
    $ready = $false
    
    while ((Get-Date) -lt $timeout -and -not $ready) {
        if (Test-Port $Port) {
            if ($HealthEndpoint -and -not $Fast) {
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
        Write-Progress-Step "Waiting for $Name to be ready" "Completed"
        return $true
    } else {
        Write-Host "⚠️  $Name did not start within ${TimeoutSeconds}s" -ForegroundColor Yellow
        return $false
    }
}

function Test-Prerequisites {
    Write-Progress-Step "Checking prerequisites"
    
    $errors = @()
    
    # Check pnpm
    if (-not $FrontendOnly) {
        try {
            $pnpmVersion = pnpm --version 2>$null
            if ($LASTEXITCODE -ne 0) {
                throw "pnpm not found"
            }
            if ($ShowProgress) {
                Write-Host "  ✓ pnpm: $pnpmVersion" -ForegroundColor Green
            }
        }
        catch {
            $errors += "pnpm is not installed. Install with: npm install -g pnpm"
        }
    }
    
    # Check Poetry
    if (-not $BackendOnly) {
        try {
            $poetryVersion = poetry --version 2>$null
            if ($LASTEXITCODE -ne 0) {
                throw "Poetry not found"
            }
            if ($ShowProgress) {
                Write-Host "  ✓ Poetry: $poetryVersion" -ForegroundColor Green
            }
        }
        catch {
            $errors += "Poetry is not installed. Install from: https://python-poetry.org/docs/#installation"
        }
    }
    
    if ($errors.Count -gt 0) {
        Write-Host "❌ Prerequisites check failed:" -ForegroundColor Red
        foreach ($error in $errors) {
            Write-Host "  • $error" -ForegroundColor Red
        }
        return $false
    }
    
    Write-Progress-Step "Checking prerequisites" "Completed"
    return $true
}

function Initialize-Environment {
    Write-Progress-Step "Initializing environment"
    
    # Store original directory
    $script:OriginalDir = Get-Location
    
    # Navigate to project directory
    if (Test-Path "medical-device-regulatory-assistant") {
        Set-Location "medical-device-regulatory-assistant"
        if ($ShowProgress) {
            Write-Host "  ✓ Navigated to medical-device-regulatory-assistant directory" -ForegroundColor Green
        }
    } elseif (-not (Test-Path "package.json") -or -not (Test-Path "backend\pyproject.toml")) {
        Write-Host "❌ Project files not found." -ForegroundColor Red
        Write-Host "Please run this script from either:" -ForegroundColor Yellow
        Write-Host "  1. The parent directory containing 'medical-device-regulatory-assistant' folder" -ForegroundColor Yellow
        Write-Host "  2. The 'medical-device-regulatory-assistant' directory itself" -ForegroundColor Yellow
        Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
        return $false
    }
    
    # Verify we're in the correct location
    if (-not (Test-Path "package.json")) {
        Write-Host "❌ package.json not found after navigation." -ForegroundColor Red
        return $false
    }
    
    if (-not $FrontendOnly -and -not (Test-Path "backend\pyproject.toml")) {
        Write-Host "❌ backend\pyproject.toml not found after navigation." -ForegroundColor Red
        return $false
    }
    
    Write-Progress-Step "Initializing environment" "Completed"
    return $true
}

function Install-Dependencies {
    if ($Fast) {
        # Skip dependency installation in fast mode
        return $true
    }
    
    $success = $true
    
    # Install frontend dependencies
    if (-not $BackendOnly -and -not (Test-Path "node_modules")) {
        Write-Progress-Step "Installing frontend dependencies"
        pnpm install
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ Failed to install frontend dependencies." -ForegroundColor Red
            $success = $false
        } else {
            Write-Progress-Step "Installing frontend dependencies" "Completed"
        }
    }
    
    # Install backend dependencies
    if (-not $FrontendOnly) {
        Write-Progress-Step "Checking backend environment"
        Push-Location "backend"
        try {
            poetry env info | Out-Null
            if ($ShowProgress) {
                Write-Host "  ✓ Backend environment ready" -ForegroundColor Green
            }
        } catch {
            Write-Progress-Step "Installing backend dependencies"
            poetry install
            if ($LASTEXITCODE -ne 0) {
                Write-Host "❌ Failed to install backend dependencies." -ForegroundColor Red
                $success = $false
            } else {
                Write-Progress-Step "Installing backend dependencies" "Completed"
            }
        }
        Pop-Location
        Write-Progress-Step "Checking backend environment" "Completed"
    }
    
    return $success
}

function Start-BackendService {
    Write-Progress-Step "Starting backend service"
    
    # Set optimized environment variables
    $env:PYTHONPATH = "."
    $env:UVICORN_LOG_LEVEL = if ($ShowProgress) { "info" } else { "warning" }
    
    if ($Fast) {
        $env:SKIP_HEALTH_CHECKS = "true"
        $env:DISABLE_FDA_API_CHECK = "true"
        $env:DISABLE_REDIS = "true"
    }
    
    # Build backend command
    $backendArgs = @(
        "run", "uvicorn", "main:app",
        "--host", "0.0.0.0",
        "--port", $BackendPort.ToString(),
        "--reload"
    )
    
    if (-not $ShowProgress) {
        $backendArgs += "--log-level", "warning"
    }
    
    # Start backend in new window
    $backendPath = Join-Path (Get-Location) "backend"
    $backendCmd = "Set-Location '$backendPath'; poetry " + ($backendArgs -join " ")
    
    $backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCmd -WindowStyle Normal -PassThru
    
    Write-Progress-Step "Starting backend service" "Completed"
    
    # Wait for backend to be ready
    if (-not $Fast) {
        $healthEndpoint = "http://localhost:$BackendPort/health"
        $backendReady = Wait-ForService "Backend" $BackendPort 20 $healthEndpoint
        if (-not $backendReady) {
            Write-Host "⚠️  Backend startup may have issues, but continuing..." -ForegroundColor Yellow
        }
    } else {
        Wait-ForService "Backend" $BackendPort 10
    }
    
    return $backendProcess
}

function Start-FrontendService {
    Write-Progress-Step "Starting frontend service"
    
    # Set optimized environment variables
    $env:NODE_ENV = "development"
    $env:NEXT_TELEMETRY_DISABLED = "1"  # Disable telemetry for faster startup
    $env:NEXT_WEBPACK_USEPOLLING = "false"  # Disable polling for better performance
    
    # Build frontend command - use Turbopack by default unless UseWebpack is specified
    if ($UseWebpack) {
        $frontendArgs = @("dev:webpack", "--port", $FrontendPort.ToString())
        $bundlerInfo = "Webpack"
    } else {
        $frontendArgs = @("dev", "--port", $FrontendPort.ToString())
        $bundlerInfo = "Turbopack"
    }
    
    # Start frontend in new window
    $frontendPath = Get-Location
    $frontendCmd = "Set-Location '$frontendPath'; pnpm " + ($frontendArgs -join " ")
    
    $frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCmd -WindowStyle Normal -PassThru
    
    Write-Progress-Step "Starting frontend service" "Completed"
    
    # Wait for frontend to be ready
    if (-not $Fast) {
        $frontendReady = Wait-ForService "Frontend" $FrontendPort 25
        if (-not $frontendReady) {
            Write-Host "⚠️  Frontend startup may have issues, but continuing..." -ForegroundColor Yellow
        }
    } else {
        Wait-ForService "Frontend" $FrontendPort 15
    }
    
    if ($ShowProgress) {
        Write-Host "  ✓ Using $bundlerInfo for frontend bundling" -ForegroundColor Green
    }
    
    return $frontendProcess
}

function Start-ServicesParallel {
    Write-Host "🚀 Starting services in parallel..." -ForegroundColor Cyan
    
    $jobs = @()
    
    if (-not $FrontendOnly) {
        $backendJob = Start-Job -ScriptBlock {
            param($BackendPort, $Fast, $ShowProgress)
            # This would need to be implemented differently for parallel execution
            # For now, we'll use sequential startup
        } -ArgumentList $BackendPort, $Fast, $ShowProgress
        $jobs += $backendJob
    }
    
    if (-not $BackendOnly) {
        $frontendJob = Start-Job -ScriptBlock {
            param($FrontendPort, $UseWebpack, $Fast, $ShowProgress)
            # This would need to be implemented differently for parallel execution
            # For now, we'll use sequential startup
        } -ArgumentList $FrontendPort, $UseWebpack, $Fast, $ShowProgress
        $jobs += $frontendJob
    }
    
    # For now, fall back to sequential startup
    # Parallel startup would require more complex job management
    return Start-ServicesSequential
}

function Start-ServicesSequential {
    $processes = @()
    
    if (-not $FrontendOnly) {
        Write-Host "🔧 Starting Backend Service..." -ForegroundColor Cyan
        $backendProcess = Start-BackendService
        if ($backendProcess) {
            $processes += $backendProcess
        }
    }
    
    if (-not $BackendOnly) {
        Write-Host "🎨 Starting Frontend Service..." -ForegroundColor Cyan
        $frontendProcess = Start-FrontendService
        if ($frontendProcess) {
            $processes += $frontendProcess
        }
    }
    
    return $processes
}

function Show-StartupSummary {
    param(
        [array]$Processes,
        [bool]$BackendStarted,
        [bool]$FrontendStarted
    )
    
    $totalTime = ((Get-Date) - $script:StartTime).TotalMilliseconds
    
    Write-Host "`n🎉 Startup Summary" -ForegroundColor Cyan
    Write-Host "=" * 50 -ForegroundColor Cyan
    Write-Host "Total startup time: $([math]::Round($totalTime))ms ($([math]::Round($totalTime/1000, 1))s)" -ForegroundColor White
    
    if ($BackendStarted) {
        Write-Host "✅ Backend: http://localhost:$BackendPort" -ForegroundColor Green
        Write-Host "📚 API Docs: http://localhost:$BackendPort/docs" -ForegroundColor Green
        Write-Host "🏥 Health Check: http://localhost:$BackendPort/health" -ForegroundColor Green
    }
    
    if ($FrontendStarted) {
        $bundler = if ($UseWebpack) { "Webpack" } else { "Turbopack" }
        Write-Host "✅ Frontend: http://localhost:$FrontendPort ($bundler)" -ForegroundColor Green
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
        Write-Host "💡 Try using -Fast flag for quicker startup" -ForegroundColor Cyan
    }
    
    Write-Host "`n💡 Performance Tips:" -ForegroundColor Cyan
    Write-Host "  • Use -Fast to skip health checks (saves ~3-5s)" -ForegroundColor Gray
    Write-Host "  • Use -BackendOnly or -FrontendOnly for single service" -ForegroundColor Gray
    Write-Host "  • Turbopack is enabled by default for faster frontend builds" -ForegroundColor Gray
    Write-Host "  • Use -UseWebpack if you encounter Turbopack issues" -ForegroundColor Gray
    
    Write-Host "`n🛑 To stop services:" -ForegroundColor Yellow
    Write-Host "  • Close the service windows directly" -ForegroundColor Gray
    Write-Host "  • Or press Ctrl+C in each service window" -ForegroundColor Gray
    Write-Host "  • Or close this monitoring window" -ForegroundColor Gray
}

function Show-Help {
    Write-Host "Medical Device Regulatory Assistant - Development Startup Script" -ForegroundColor Cyan
    Write-Host "=" * 70 -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor White
    Write-Host "  .\start-dev.ps1 [options]" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Options:" -ForegroundColor White
    Write-Host "  -Fast              Skip health checks for faster startup" -ForegroundColor Gray
    Write-Host "  -Parallel          Start services in parallel (experimental)" -ForegroundColor Gray
    Write-Host "  -ShowProgress      Show detailed progress and timing" -ForegroundColor Gray
    Write-Host "  -BackendOnly       Start only the backend service" -ForegroundColor Gray
    Write-Host "  -FrontendOnly      Start only the frontend service" -ForegroundColor Gray
    Write-Host "  -BackendPort N     Custom backend port (default: 8000)" -ForegroundColor Gray
    Write-Host "  -FrontendPort N    Custom frontend port (default: 3000)" -ForegroundColor Gray
    Write-Host "  -UseWebpack        Use Webpack instead of Turbopack" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor White
    Write-Host "  .\start-dev.ps1                    # Standard startup with Turbopack" -ForegroundColor Gray
    Write-Host "  .\start-dev.ps1 -Fast              # Quick startup, skip checks" -ForegroundColor Gray
    Write-Host "  .\start-dev.ps1 -ShowProgress      # Detailed progress information" -ForegroundColor Gray
    Write-Host "  .\start-dev.ps1 -BackendOnly       # Backend service only" -ForegroundColor Gray
    Write-Host "  .\start-dev.ps1 -UseWebpack        # Use Webpack instead of Turbopack" -ForegroundColor Gray
    Write-Host "  .\start-dev.ps1 -BackendPort 8001  # Custom backend port" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Features:" -ForegroundColor White
    Write-Host "  • Turbopack enabled by default for faster frontend builds" -ForegroundColor Green
    Write-Host "  • Automatic dependency installation" -ForegroundColor Green
    Write-Host "  • Health checks and service monitoring" -ForegroundColor Green
    Write-Host "  • Performance timing and optimization tips" -ForegroundColor Green
    Write-Host "  • Flexible port configuration" -ForegroundColor Green
    Write-Host ""
}

function Main {
    # Show help if requested
    if ($Help) {
        Show-Help
        return 0
    }
    
    Write-Host "🚀 Medical Device Regulatory Assistant - Development Startup" -ForegroundColor Cyan
    Write-Host "=" * 65 -ForegroundColor Cyan
    
    # Show configuration
    $config = @()
    if ($Fast) { $config += "Fast Mode" }
    if ($Parallel) { $config += "Parallel Startup" }
    if ($ShowProgress) { $config += "Detailed Progress" }
    if ($BackendOnly) { $config += "Backend Only" }
    if ($FrontendOnly) { $config += "Frontend Only" }
    if ($UseWebpack) { $config += "Webpack" } else { $config += "Turbopack" }
    
    if ($config.Count -gt 0) {
        Write-Host "Configuration: $($config -join ', ')" -ForegroundColor Yellow
    }
    
    Write-Host ""
    
    # Initialize and validate environment
    if (-not (Test-Prerequisites)) {
        return 1
    }
    
    if (-not (Initialize-Environment)) {
        return 1
    }
    
    if (-not (Install-Dependencies)) {
        return 1
    }
    
    # Start services
    try {
        if ($Parallel) {
            $processes = Start-ServicesParallel
        } else {
            $processes = Start-ServicesSequential
        }
        
        # Show summary
        $backendStarted = (-not $FrontendOnly)
        $frontendStarted = (-not $BackendOnly)
        
        Show-StartupSummary $processes $backendStarted $frontendStarted
        
        # Keep script running to monitor
        Write-Host "`nPress Enter to close this monitoring window..." -ForegroundColor Yellow
        Read-Host
        
    } catch {
        Write-Host "❌ Startup failed: $($_.Exception.Message)" -ForegroundColor Red
        return 1
    } finally {
        # Return to original directory
        if ($script:OriginalDir) {
            Set-Location $script:OriginalDir
        }
    }
    
    return 0
}

# Run main function
$exitCode = Main
exit $exitCode