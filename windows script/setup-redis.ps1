# Redis Setup Script for Medical Device Regulatory Assistant
# This script helps install and configure Redis for enhanced functionality

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Redis Setup for Medical Device Assistant" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Redis is an optional service that provides:" -ForegroundColor Yellow
Write-Host "  • Caching for FDA API responses" -ForegroundColor White
Write-Host "  • Session storage" -ForegroundColor White
Write-Host "  • Performance improvements" -ForegroundColor White
Write-Host "  • Full health check functionality" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Do you want to install Redis? (y/N)"

if ($choice -eq 'y' -or $choice -eq 'Y') {
    Write-Host "Installing Redis..." -ForegroundColor Green
    
    # Check if Chocolatey is installed
    try {
        choco --version | Out-Null
        Write-Host "Chocolatey found, installing Redis..." -ForegroundColor Cyan
        choco install redis-64 -y
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Redis installed successfully!" -ForegroundColor Green
            Write-Host "Starting Redis service..." -ForegroundColor Yellow
            
            # Start Redis service
            try {
                Start-Service Redis
                Write-Host "Redis service started!" -ForegroundColor Green
                
                # Test Redis connection
                Write-Host "Testing Redis connection..." -ForegroundColor Yellow
                $redisTest = Test-NetConnection -ComputerName "localhost" -Port 6379 -InformationLevel Quiet
                
                if ($redisTest) {
                    Write-Host "✅ Redis is running and accessible on port 6379" -ForegroundColor Green
                } else {
                    Write-Host "⚠️ Redis installed but not accessible on port 6379" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "⚠️ Redis installed but service start failed: $($_.Exception.Message)" -ForegroundColor Yellow
            }
        } else {
            Write-Host "❌ Redis installation failed" -ForegroundColor Red
        }
    } catch {
        Write-Host "Chocolatey not found. Please install Redis manually:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Option 1 - Install Chocolatey first:" -ForegroundColor Cyan
        Write-Host "  1. Open PowerShell as Administrator" -ForegroundColor White
        Write-Host "  2. Run: Set-ExecutionPolicy Bypass -Scope Process -Force" -ForegroundColor White
        Write-Host "  3. Run: [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072" -ForegroundColor White
        Write-Host "  4. Run: iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))" -ForegroundColor White
        Write-Host "  5. Run this script again" -ForegroundColor White
        Write-Host ""
        Write-Host "Option 2 - Manual Redis installation:" -ForegroundColor Cyan
        Write-Host "  1. Download Redis from: https://github.com/microsoftarchive/redis/releases" -ForegroundColor White
        Write-Host "  2. Extract and run redis-server.exe" -ForegroundColor White
        Write-Host "  3. Redis will be available on port 6379" -ForegroundColor White
        Write-Host ""
        Write-Host "Option 3 - Docker Redis (if Docker is installed):" -ForegroundColor Cyan
        Write-Host "  docker run -d -p 6379:6379 --name redis redis:alpine" -ForegroundColor White
    }
} else {
    Write-Host "Skipping Redis installation." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "The application will work without Redis, but:" -ForegroundColor Yellow
    Write-Host "  • Health checks may show warnings" -ForegroundColor White
    Write-Host "  • FDA API responses won't be cached" -ForegroundColor White
    Write-Host "  • Performance may be slower" -ForegroundColor White
    Write-Host ""
    Write-Host "You can install Redis later by running this script again." -ForegroundColor Cyan
}

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host "You can now run the application with:" -ForegroundColor Cyan
Write-Host "  .\start-dev.ps1" -ForegroundColor White
Write-Host ""

Read-Host "Press Enter to exit"