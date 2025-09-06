# Redis Setup Script for Windows Development
# Medical Device Regulatory Assistant

param(
    [Parameter(HelpMessage="Installation method: wsl, docker, or check")]
    [ValidateSet("wsl", "docker", "check")]
    [string]$Method = "check",
    
    [Parameter(HelpMessage="Skip confirmation prompts")]
    [switch]$Force
)

Write-Host "Redis Setup for Medical Device Regulatory Assistant" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

function Test-RedisConnection {
    Write-Host "`n🔍 Testing Redis Connection..." -ForegroundColor Yellow
    
    try {
        # Test if Redis is accessible on default port
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $tcpClient.Connect("localhost", 6379)
        $tcpClient.Close()
        
        Write-Host "✅ Redis is running on localhost:6379" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ Redis is not accessible on localhost:6379" -ForegroundColor Red
        return $false
    }
}

function Test-WSLAvailable {
    try {
        $wslVersion = wsl --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ WSL is available" -ForegroundColor Green
            return $true
        }
    }
    catch {
        Write-Host "❌ WSL is not available" -ForegroundColor Red
        return $false
    }
    return $false
}

function Test-DockerAvailable {
    try {
        $dockerVersion = docker --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Docker is available" -ForegroundColor Green
            return $true
        }
    }
    catch {
        Write-Host "❌ Docker is not available" -ForegroundColor Red
        return $false
    }
    return $false
}

function Install-RedisWSL {
    Write-Host "`n🐧 Installing Redis via WSL..." -ForegroundColor Yellow
    
    if (-not (Test-WSLAvailable)) {
        Write-Host "❌ WSL is not available. Please install WSL2 first." -ForegroundColor Red
        Write-Host "💡 Run: wsl --install" -ForegroundColor Cyan
        return $false
    }
    
    # Check if Ubuntu is installed
    $wslDistros = wsl -l -v 2>$null
    if ($wslDistros -notmatch "Ubuntu") {
        Write-Host "⚠️  Ubuntu not found in WSL. Installing Ubuntu..." -ForegroundColor Yellow
        Write-Host "💡 Please install Ubuntu from Microsoft Store and run this script again." -ForegroundColor Cyan
        Start-Process "ms-windows-store://pdp/?ProductId=9PDXGNCFSCZV"
        return $false
    }
    
    Write-Host "📦 Installing Redis in Ubuntu..." -ForegroundColor Cyan
    
    # Install Redis in WSL Ubuntu
    $commands = @(
        "sudo apt update",
        "sudo apt install -y redis-server",
        "sudo service redis-server start",
        "redis-cli ping"
    )
    
    foreach ($cmd in $commands) {
        Write-Host "Running: $cmd" -ForegroundColor Gray
        wsl -d Ubuntu bash -c $cmd
        if ($LASTEXITCODE -ne 0 -and $cmd -ne "redis-cli ping") {
            Write-Host "❌ Command failed: $cmd" -ForegroundColor Red
            return $false
        }
    }
    
    # Configure Redis for external access
    Write-Host "🔧 Configuring Redis for Windows access..." -ForegroundColor Cyan
    $configCommands = @(
        "sudo sed -i 's/bind 127.0.0.1/bind 127.0.0.1 0.0.0.0/' /etc/redis/redis.conf",
        "sudo sed -i 's/protected-mode yes/protected-mode no/' /etc/redis/redis.conf",
        "sudo service redis-server restart"
    )
    
    foreach ($cmd in $configCommands) {
        wsl -d Ubuntu bash -c $cmd
    }
    
    Write-Host "✅ Redis installation completed!" -ForegroundColor Green
    return $true
}

function Install-RedisDocker {
    Write-Host "`n🐳 Installing Redis via Docker..." -ForegroundColor Yellow
    
    if (-not (Test-DockerAvailable)) {
        Write-Host "❌ Docker is not available. Please install Docker Desktop first." -ForegroundColor Red
        Write-Host "💡 Download from: https://www.docker.com/products/docker-desktop/" -ForegroundColor Cyan
        return $false
    }
    
    Write-Host "📦 Pulling and starting Redis container..." -ForegroundColor Cyan
    
    # Stop existing container if it exists
    docker stop redis-dev 2>$null
    docker rm redis-dev 2>$null
    
    # Run Redis container
    docker run -d --name redis-dev -p 6379:6379 redis:7-alpine
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Redis container started successfully!" -ForegroundColor Green
        
        # Test connection
        Start-Sleep -Seconds 3
        $testResult = docker exec redis-dev redis-cli ping 2>$null
        if ($testResult -eq "PONG") {
            Write-Host "✅ Redis is responding to ping!" -ForegroundColor Green
        }
        
        return $true
    }
    else {
        Write-Host "❌ Failed to start Redis container" -ForegroundColor Red
        return $false
    }
}

function Show-RedisStatus {
    Write-Host "`n📊 Redis Status Check" -ForegroundColor Yellow
    Write-Host "-" * 30 -ForegroundColor Yellow
    
    # Test connection
    $isRunning = Test-RedisConnection
    
    if ($isRunning) {
        Write-Host "🟢 Redis Status: RUNNING" -ForegroundColor Green
        
        # Test with application
        Write-Host "`n🧪 Testing with application..." -ForegroundColor Cyan
        Push-Location "medical-device-regulatory-assistant/backend"
        
        if (Test-Path "test_redis_connection.py") {
            try {
                poetry run python test_redis_connection.py
            }
            catch {
                Write-Host "⚠️  Could not run application test (poetry not available)" -ForegroundColor Yellow
            }
        }
        
        Pop-Location
    }
    else {
        Write-Host "🔴 Redis Status: NOT RUNNING" -ForegroundColor Red
        Write-Host "`n💡 Redis is optional for the Medical Device Assistant" -ForegroundColor Cyan
        Write-Host "   The application will work without Redis (no caching)" -ForegroundColor Cyan
    }
}

function Show-InstallationOptions {
    Write-Host "`n🛠️  Redis Installation Options" -ForegroundColor Yellow
    Write-Host "-" * 40 -ForegroundColor Yellow
    
    Write-Host "1. WSL (Windows Subsystem for Linux) - Recommended" -ForegroundColor Cyan
    Write-Host "   ✅ Most reliable on Windows" -ForegroundColor Green
    Write-Host "   ✅ Native Redis performance" -ForegroundColor Green
    Write-Host "   ⚠️  Requires WSL2 installation" -ForegroundColor Yellow
    
    Write-Host "`n2. Docker - Alternative" -ForegroundColor Cyan
    Write-Host "   ✅ Easy to manage" -ForegroundColor Green
    Write-Host "   ✅ Isolated environment" -ForegroundColor Green
    Write-Host "   ⚠️  Requires Docker Desktop" -ForegroundColor Yellow
    
    Write-Host "`n3. No Redis - Default" -ForegroundColor Cyan
    Write-Host "   ✅ No additional setup required" -ForegroundColor Green
    Write-Host "   ✅ Application works normally" -ForegroundColor Green
    Write-Host "   ⚠️  No caching (slower FDA API responses)" -ForegroundColor Yellow
    
    Write-Host "`n💡 For development, you can start without Redis and add it later." -ForegroundColor Cyan
}

function Main {
    switch ($Method) {
        "check" {
            Show-RedisStatus
            
            if (-not (Test-RedisConnection)) {
                Show-InstallationOptions
                
                if (-not $Force) {
                    Write-Host "`n❓ Would you like to install Redis now? (y/N): " -NoNewline -ForegroundColor Yellow
                    $response = Read-Host
                    
                    if ($response -eq "y" -or $response -eq "Y") {
                        Write-Host "`n❓ Choose installation method (wsl/docker): " -NoNewline -ForegroundColor Yellow
                        $installMethod = Read-Host
                        
                        if ($installMethod -eq "wsl") {
                            Install-RedisWSL
                        }
                        elseif ($installMethod -eq "docker") {
                            Install-RedisDocker
                        }
                        else {
                            Write-Host "❌ Invalid method. Use 'wsl' or 'docker'" -ForegroundColor Red
                        }
                    }
                }
            }
        }
        
        "wsl" {
            if ($Force -or (Read-Host "Install Redis via WSL? (y/N)") -eq "y") {
                Install-RedisWSL
                Show-RedisStatus
            }
        }
        
        "docker" {
            if ($Force -or (Read-Host "Install Redis via Docker? (y/N)") -eq "y") {
                Install-RedisDocker
                Show-RedisStatus
            }
        }
    }
    
    Write-Host "`n📖 For detailed instructions, see:" -ForegroundColor Cyan
    Write-Host "   medical-device-regulatory-assistant/backend/docs/redis-setup-guide.md" -ForegroundColor Gray
    
    Write-Host "`n🚀 You can now start the Medical Device Regulatory Assistant!" -ForegroundColor Green
    Write-Host "   Run: ./start-dev.ps1" -ForegroundColor Gray
}

# Run main function
Main