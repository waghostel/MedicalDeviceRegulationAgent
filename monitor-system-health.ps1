# System Health Monitoring Dashboard for Medical Device Regulatory Assistant
# Provides real-time monitoring of all system components

param(
    [Parameter(HelpMessage="Monitoring mode: dashboard, continuous, or single")]
    [ValidateSet("dashboard", "continuous", "single")]
    [string]$Mode = "dashboard",
    
    [Parameter(HelpMessage="Refresh interval in seconds for continuous monitoring")]
    [int]$RefreshInterval = 30,
    
    [Parameter(HelpMessage="Enable alerts for unhealthy services")]
    [switch]$EnableAlerts,
    
    [Parameter(HelpMessage="Log monitoring results to file")]
    [switch]$LogToFile,
    
    [Parameter(HelpMessage="Backend URL to monitor")]
    [string]$BackendUrl = "http://localhost:8000"
)

# Global variables
$script:MonitoringActive = $true
$script:LogFile = "monitoring-$(Get-Date -Format 'yyyy-MM-dd').log"
$script:AlertHistory = @()

function Write-MonitoringLog {
    param([string]$Message, [string]$Level = "INFO")
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    Write-Host $logEntry
    
    if ($LogToFile) {
        Add-Content -Path $script:LogFile -Value $logEntry
    }
}

function Test-ServiceHealth {
    param([string]$Url, [string]$ServiceName)
    
    try {
        $response = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 10 -ErrorAction Stop
        
        return @{
            ServiceName = $ServiceName
            Status = "Healthy"
            ResponseTime = $response.execution_time_ms
            Details = $response
            Error = $null
            Timestamp = Get-Date
        }
    }
    catch {
        return @{
            ServiceName = $ServiceName
            Status = "Unhealthy"
            ResponseTime = $null
            Details = $null
            Error = $_.Exception.Message
            Timestamp = Get-Date
        }
    }
}

function Get-SystemHealthStatus {
    Write-MonitoringLog "Checking system health status..." "INFO"
    
    $healthChecks = @()
    
    # Main health check
    $mainHealth = Test-ServiceHealth -Url "$BackendUrl/health" -ServiceName "Overall System"
    $healthChecks += $mainHealth
    
    # Individual component checks
    $components = @(
        @{ Name = "Database"; Endpoint = "/api/health/database" },
        @{ Name = "Redis Cache"; Endpoint = "/api/health/redis" },
        @{ Name = "FDA API"; Endpoint = "/api/health/fda-api" },
        @{ Name = "System Resources"; Endpoint = "/api/health/system" }
    )
    
    foreach ($component in $components) {
        $componentHealth = Test-ServiceHealth -Url "$BackendUrl$($component.Endpoint)" -ServiceName $component.Name
        $healthChecks += $componentHealth
    }
    
    # Frontend health check
    try {
        $frontendResponse = Invoke-WebRequest -Uri "http://localhost:3000" -Method Head -TimeoutSec 5 -ErrorAction Stop
        $healthChecks += @{
            ServiceName = "Frontend (Next.js)"
            Status = if ($frontendResponse.StatusCode -eq 200) { "Healthy" } else { "Unhealthy" }
            ResponseTime = $null
            Details = @{ StatusCode = $frontendResponse.StatusCode }
            Error = $null
            Timestamp = Get-Date
        }
    }
    catch {
        $healthChecks += @{
            ServiceName = "Frontend (Next.js)"
            Status = "Unhealthy"
            ResponseTime = $null
            Details = $null
            Error = $_.Exception.Message
            Timestamp = Get-Date
        }
    }
    
    return $healthChecks
}

function Show-HealthDashboard {
    param([array]$HealthChecks)
    
    Clear-Host
    
    Write-Host "╔══════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║                Medical Device Regulatory Assistant - Health Dashboard        ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Last Updated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
    Write-Host "Refresh Interval: $RefreshInterval seconds" -ForegroundColor Gray
    Write-Host ""
    
    # Overall status
    $healthyCount = ($HealthChecks | Where-Object { $_.Status -eq "Healthy" }).Count
    $totalCount = $HealthChecks.Count
    $overallStatus = if ($healthyCount -eq $totalCount) { "🟢 HEALTHY" } elseif ($healthyCount -gt 0) { "🟡 DEGRADED" } else { "🔴 UNHEALTHY" }
    
    Write-Host "Overall System Status: $overallStatus ($healthyCount/$totalCount services healthy)" -ForegroundColor $(
        if ($healthyCount -eq $totalCount) { "Green" } 
        elseif ($healthyCount -gt 0) { "Yellow" } 
        else { "Red" }
    )
    Write-Host ""
    
    # Service details
    Write-Host "Service Details:" -ForegroundColor White
    Write-Host "─" * 80 -ForegroundColor Gray
    
    foreach ($check in $HealthChecks) {
        $statusIcon = if ($check.Status -eq "Healthy") { "✅" } else { "❌" }
        $statusColor = if ($check.Status -eq "Healthy") { "Green" } else { "Red" }
        
        Write-Host "$statusIcon $($check.ServiceName)" -ForegroundColor $statusColor -NoNewline
        
        if ($check.ResponseTime) {
            Write-Host " (${check.ResponseTime}ms)" -ForegroundColor Gray -NoNewline
        }
        
        Write-Host ""
        
        if ($check.Status -ne "Healthy" -and $check.Error) {
            Write-Host "   Error: $($check.Error)" -ForegroundColor Red
        }
        
        if ($check.Details -and $check.Details.PSObject.Properties.Count -gt 0) {
            if ($check.Details.healthy -ne $null) {
                $detailStatus = if ($check.Details.healthy) { "Connected" } else { "Disconnected" }
                Write-Host "   Status: $detailStatus" -ForegroundColor Gray
            }
            
            if ($check.Details.checks) {
                foreach ($subCheck in $check.Details.checks.PSObject.Properties) {
                    $subStatus = if ($subCheck.Value.healthy) { "✅" } else { "❌" }
                    Write-Host "   $subStatus $($subCheck.Name): $($subCheck.Value.status)" -ForegroundColor Gray
                }
            }
        }
        
        Write-Host ""
    }
    
    # Performance metrics
    Write-Host "Performance Metrics:" -ForegroundColor White
    Write-Host "─" * 80 -ForegroundColor Gray
    
    $avgResponseTime = ($HealthChecks | Where-Object { $_.ResponseTime } | Measure-Object -Property ResponseTime -Average).Average
    if ($avgResponseTime) {
        Write-Host "Average Response Time: $([math]::Round($avgResponseTime, 2))ms" -ForegroundColor Cyan
    }
    
    $slowServices = $HealthChecks | Where-Object { $_.ResponseTime -gt 1000 }
    if ($slowServices) {
        Write-Host "Slow Services (>1s):" -ForegroundColor Yellow
        foreach ($service in $slowServices) {
            Write-Host "  - $($service.ServiceName): $($service.ResponseTime)ms" -ForegroundColor Yellow
        }
    }
    
    Write-Host ""
    
    # Recent alerts
    if ($script:AlertHistory.Count -gt 0) {
        Write-Host "Recent Alerts:" -ForegroundColor White
        Write-Host "─" * 80 -ForegroundColor Gray
        
        $recentAlerts = $script:AlertHistory | Sort-Object Timestamp -Descending | Select-Object -First 5
        foreach ($alert in $recentAlerts) {
            $timeAgo = (Get-Date) - $alert.Timestamp
            Write-Host "⚠️  $($alert.Message) ($([math]::Round($timeAgo.TotalMinutes, 1)) min ago)" -ForegroundColor Yellow
        }
        Write-Host ""
    }
    
    # Instructions
    Write-Host "Controls:" -ForegroundColor White
    Write-Host "─" * 80 -ForegroundColor Gray
    Write-Host "Press 'q' to quit, 'r' to refresh now, 'c' to clear alerts" -ForegroundColor Gray
    Write-Host ""
}

function Send-Alert {
    param([string]$Message, [string]$ServiceName)
    
    $alert = @{
        Message = $Message
        ServiceName = $ServiceName
        Timestamp = Get-Date
    }
    
    $script:AlertHistory += $alert
    
    Write-MonitoringLog "ALERT: $Message" "ALERT"
    
    if ($EnableAlerts) {
        # In a real implementation, you could send emails, Slack messages, etc.
        Write-Host "🚨 ALERT: $Message" -ForegroundColor Red -BackgroundColor Yellow
    }
}

function Monitor-SystemHealth {
    Write-MonitoringLog "Starting system health monitoring..." "INFO"
    
    while ($script:MonitoringActive) {
        try {
            $healthChecks = Get-SystemHealthStatus
            
            # Check for alerts
            foreach ($check in $healthChecks) {
                if ($check.Status -ne "Healthy") {
                    $alertMessage = "$($check.ServiceName) is unhealthy: $($check.Error)"
                    
                    # Only send alert if this is a new issue (not already in recent alerts)
                    $recentAlert = $script:AlertHistory | Where-Object { 
                        $_.ServiceName -eq $check.ServiceName -and 
                        ((Get-Date) - $_.Timestamp).TotalMinutes -lt 5 
                    }
                    
                    if (-not $recentAlert) {
                        Send-Alert -Message $alertMessage -ServiceName $check.ServiceName
                    }
                }
            }
            
            if ($Mode -eq "dashboard") {
                Show-HealthDashboard -HealthChecks $healthChecks
                
                # Check for user input
                if ([Console]::KeyAvailable) {
                    $key = [Console]::ReadKey($true)
                    switch ($key.KeyChar) {
                        'q' { 
                            $script:MonitoringActive = $false
                            Write-MonitoringLog "Monitoring stopped by user" "INFO"
                        }
                        'r' { 
                            Write-MonitoringLog "Manual refresh requested" "INFO"
                            continue
                        }
                        'c' { 
                            $script:AlertHistory = @()
                            Write-MonitoringLog "Alert history cleared" "INFO"
                        }
                    }
                }
                
                if ($script:MonitoringActive) {
                    Start-Sleep -Seconds $RefreshInterval
                }
            }
            elseif ($Mode -eq "single") {
                Show-HealthDashboard -HealthChecks $healthChecks
                break
            }
            else {
                # Continuous mode - just log
                $unhealthyServices = $healthChecks | Where-Object { $_.Status -ne "Healthy" }
                if ($unhealthyServices) {
                    Write-MonitoringLog "Unhealthy services detected: $($unhealthyServices.ServiceName -join ', ')" "WARNING"
                } else {
                    Write-MonitoringLog "All services healthy" "INFO"
                }
                
                Start-Sleep -Seconds $RefreshInterval
            }
        }
        catch {
            Write-MonitoringLog "Error during monitoring: $($_.Exception.Message)" "ERROR"
            Start-Sleep -Seconds 10
        }
    }
}

function Test-Prerequisites {
    Write-MonitoringLog "Checking prerequisites..." "INFO"
    
    # Check if backend is accessible
    try {
        $response = Invoke-WebRequest -Uri $BackendUrl -Method Head -TimeoutSec 5 -ErrorAction Stop
        Write-MonitoringLog "Backend accessible at $BackendUrl" "INFO"
    }
    catch {
        Write-MonitoringLog "Backend not accessible at $BackendUrl" "WARNING"
        Write-Host "⚠️  Backend not accessible at $BackendUrl" -ForegroundColor Yellow
        Write-Host "   Make sure the backend is running with: ./start-backend.ps1" -ForegroundColor Gray
        Write-Host ""
    }
    
    # Check if frontend is accessible
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method Head -TimeoutSec 5 -ErrorAction Stop
        Write-MonitoringLog "Frontend accessible at http://localhost:3000" "INFO"
    }
    catch {
        Write-MonitoringLog "Frontend not accessible at http://localhost:3000" "WARNING"
        Write-Host "⚠️  Frontend not accessible at http://localhost:3000" -ForegroundColor Yellow
        Write-Host "   Make sure the frontend is running with: ./start-frontend.ps1" -ForegroundColor Gray
        Write-Host ""
    }
}

function Show-MonitoringHelp {
    Write-Host "System Health Monitoring Dashboard" -ForegroundColor Cyan
    Write-Host "=" * 50 -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor White
    Write-Host "  .\monitor-system-health.ps1 [options]" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Modes:" -ForegroundColor White
    Write-Host "  -Mode dashboard    Interactive dashboard (default)" -ForegroundColor Gray
    Write-Host "  -Mode continuous   Continuous monitoring with logging" -ForegroundColor Gray
    Write-Host "  -Mode single       Single health check" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Options:" -ForegroundColor White
    Write-Host "  -RefreshInterval   Seconds between checks (default: 30)" -ForegroundColor Gray
    Write-Host "  -EnableAlerts      Enable alert notifications" -ForegroundColor Gray
    Write-Host "  -LogToFile         Log results to file" -ForegroundColor Gray
    Write-Host "  -BackendUrl        Backend URL (default: http://localhost:8000)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor White
    Write-Host "  .\monitor-system-health.ps1" -ForegroundColor Gray
    Write-Host "  .\monitor-system-health.ps1 -Mode continuous -EnableAlerts -LogToFile" -ForegroundColor Gray
    Write-Host "  .\monitor-system-health.ps1 -Mode single" -ForegroundColor Gray
    Write-Host ""
}

# Main execution
function Main {
    if ($args -contains "-help" -or $args -contains "--help" -or $args -contains "/?") {
        Show-MonitoringHelp
        return
    }
    
    Write-Host "Medical Device Regulatory Assistant - System Health Monitor" -ForegroundColor Cyan
    Write-Host "=" * 70 -ForegroundColor Cyan
    Write-Host ""
    
    Test-Prerequisites
    
    switch ($Mode) {
        "dashboard" {
            Write-Host "Starting interactive health dashboard..." -ForegroundColor Green
            Write-Host "Press 'q' to quit, 'r' to refresh, 'c' to clear alerts" -ForegroundColor Gray
            Write-Host ""
            Monitor-SystemHealth
        }
        "continuous" {
            Write-Host "Starting continuous monitoring..." -ForegroundColor Green
            Write-Host "Press Ctrl+C to stop" -ForegroundColor Gray
            Write-Host ""
            Monitor-SystemHealth
        }
        "single" {
            Write-Host "Performing single health check..." -ForegroundColor Green
            Write-Host ""
            Monitor-SystemHealth
        }
    }
    
    Write-Host ""
    Write-Host "Monitoring stopped." -ForegroundColor Yellow
    
    if ($LogToFile) {
        Write-Host "Monitoring log saved to: $script:LogFile" -ForegroundColor Cyan
    }
}

# Handle Ctrl+C gracefully
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    $script:MonitoringActive = $false
}

# Run main function
Main