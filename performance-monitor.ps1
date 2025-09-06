# Performance Monitoring and Alerting for Medical Device Regulatory Assistant
# Monitors system performance metrics and sends alerts when thresholds are exceeded

param(
    [Parameter(HelpMessage="Monitoring duration in minutes (0 = continuous)")]
    [int]$Duration = 0,
    
    [Parameter(HelpMessage="Sampling interval in seconds")]
    [int]$Interval = 60,
    
    [Parameter(HelpMessage="Enable email alerts")]
    [switch]$EnableEmailAlerts,
    
    [Parameter(HelpMessage="Enable file logging")]
    [switch]$EnableLogging,
    
    [Parameter(HelpMessage="Performance thresholds configuration file")]
    [string]$ConfigFile = "performance-thresholds.json"
)

# Default performance thresholds
$script:DefaultThresholds = @{
    ResponseTime = @{
        HealthCheck = 5000      # 5 seconds
        APIEndpoint = 10000     # 10 seconds
        DatabaseQuery = 3000    # 3 seconds
    }
    ResourceUsage = @{
        CPUPercent = 80         # 80%
        MemoryPercent = 85      # 85%
        DiskSpacePercent = 90   # 90%
    }
    ErrorRates = @{
        HTTPErrorRate = 5       # 5%
        DatabaseErrorRate = 2   # 2%
    }
    Availability = @{
        UptimePercent = 99.5    # 99.5%
    }
}

$script:PerformanceData = @()
$script:AlertHistory = @()
$script:MonitoringActive = $true

function Write-PerformanceLog {
    param([string]$Message, [string]$Level = "INFO")
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    Write-Host $logEntry -ForegroundColor $(
        switch ($Level) {
            "ERROR" { "Red" }
            "WARNING" { "Yellow" }
            "ALERT" { "Magenta" }
            "INFO" { "White" }
            default { "Gray" }
        }
    )
    
    if ($EnableLogging) {
        $logFile = "performance-$(Get-Date -Format 'yyyy-MM-dd').log"
        Add-Content -Path $logFile -Value $logEntry
    }
}

function Load-PerformanceThresholds {
    if (Test-Path $ConfigFile) {
        try {
            $config = Get-Content $ConfigFile | ConvertFrom-Json
            Write-PerformanceLog "Loaded performance thresholds from $ConfigFile" "INFO"
            return $config
        }
        catch {
            Write-PerformanceLog "Failed to load config file, using defaults: $($_.Exception.Message)" "WARNING"
        }
    }
    
    # Create default config file
    $script:DefaultThresholds | ConvertTo-Json -Depth 3 | Set-Content $ConfigFile
    Write-PerformanceLog "Created default performance thresholds: $ConfigFile" "INFO"
    
    return $script:DefaultThresholds
}

function Measure-ResponseTime {
    param([string]$Url, [string]$Description)
    
    try {
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        $response = Invoke-WebRequest -Uri $Url -Method Get -TimeoutSec 30 -ErrorAction Stop
        $stopwatch.Stop()
        
        return @{
            Success = $true
            ResponseTimeMs = $stopwatch.ElapsedMilliseconds
            StatusCode = $response.StatusCode
            Error = $null
        }
    }
    catch {
        $stopwatch.Stop()
        return @{
            Success = $false
            ResponseTimeMs = $stopwatch.ElapsedMilliseconds
            StatusCode = $null
            Error = $_.Exception.Message
        }
    }
}

function Get-SystemResourceUsage {
    try {
        # CPU Usage
        $cpuUsage = (Get-WmiObject -Class Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
        
        # Memory Usage
        $memory = Get-WmiObject -Class Win32_OperatingSystem
        $memoryUsage = [math]::Round((($memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory) / $memory.TotalVisibleMemorySize) * 100, 2)
        
        # Disk Usage
        $disk = Get-WmiObject -Class Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 } | Select-Object -First 1
        $diskUsage = [math]::Round((($disk.Size - $disk.FreeSpace) / $disk.Size) * 100, 2)
        
        return @{
            CPUPercent = $cpuUsage
            MemoryPercent = $memoryUsage
            DiskSpacePercent = $diskUsage
            Timestamp = Get-Date
        }
    }
    catch {
        Write-PerformanceLog "Error getting system resource usage: $($_.Exception.Message)" "ERROR"
        return $null
    }
}

function Get-ApplicationMetrics {
    $metrics = @{
        Timestamp = Get-Date
        ResponseTimes = @{}
        ResourceUsage = Get-SystemResourceUsage
        ErrorRates = @{}
        Availability = @{}
    }
    
    # Test response times
    $endpoints = @{
        "Health Check" = "http://localhost:8000/health"
        "API Root" = "http://localhost:8000/"
        "Frontend" = "http://localhost:3000/"
        "Database Health" = "http://localhost:8000/api/health/database"
        "FDA API Health" = "http://localhost:8000/api/health/fda-api"
    }
    
    foreach ($endpoint in $endpoints.GetEnumerator()) {
        $result = Measure-ResponseTime -Url $endpoint.Value -Description $endpoint.Key
        $metrics.ResponseTimes[$endpoint.Key] = $result
    }
    
    # Calculate error rates
    $totalRequests = $metrics.ResponseTimes.Count
    $failedRequests = ($metrics.ResponseTimes.Values | Where-Object { -not $_.Success }).Count
    $metrics.ErrorRates["HTTP"] = if ($totalRequests -gt 0) { [math]::Round(($failedRequests / $totalRequests) * 100, 2) } else { 0 }
    
    # Calculate availability (simplified)
    $availableServices = ($metrics.ResponseTimes.Values | Where-Object { $_.Success }).Count
    $metrics.Availability["Overall"] = if ($totalRequests -gt 0) { [math]::Round(($availableServices / $totalRequests) * 100, 2) } else { 0 }
    
    return $metrics
}

function Check-PerformanceThresholds {
    param($Metrics, $Thresholds)
    
    $alerts = @()
    
    # Check response times
    foreach ($endpoint in $Metrics.ResponseTimes.GetEnumerator()) {
        $responseTime = $endpoint.Value.ResponseTimeMs
        $endpointName = $endpoint.Key
        
        $threshold = switch ($endpointName) {
            "Health Check" { $Thresholds.ResponseTime.HealthCheck }
            "Database Health" { $Thresholds.ResponseTime.DatabaseQuery }
            default { $Thresholds.ResponseTime.APIEndpoint }
        }
        
        if ($responseTime -gt $threshold) {
            $alerts += @{
                Type = "ResponseTime"
                Severity = "WARNING"
                Message = "$endpointName response time ($responseTime ms) exceeds threshold ($threshold ms)"
                Value = $responseTime
                Threshold = $threshold
                Timestamp = Get-Date
            }
        }
        
        if (-not $endpoint.Value.Success) {
            $alerts += @{
                Type = "Availability"
                Severity = "ERROR"
                Message = "$endpointName is not available: $($endpoint.Value.Error)"
                Value = 0
                Threshold = 100
                Timestamp = Get-Date
            }
        }
    }
    
    # Check resource usage
    if ($Metrics.ResourceUsage) {
        if ($Metrics.ResourceUsage.CPUPercent -gt $Thresholds.ResourceUsage.CPUPercent) {
            $alerts += @{
                Type = "CPU"
                Severity = "WARNING"
                Message = "CPU usage ($($Metrics.ResourceUsage.CPUPercent)%) exceeds threshold ($($Thresholds.ResourceUsage.CPUPercent)%)"
                Value = $Metrics.ResourceUsage.CPUPercent
                Threshold = $Thresholds.ResourceUsage.CPUPercent
                Timestamp = Get-Date
            }
        }
        
        if ($Metrics.ResourceUsage.MemoryPercent -gt $Thresholds.ResourceUsage.MemoryPercent) {
            $alerts += @{
                Type = "Memory"
                Severity = "WARNING"
                Message = "Memory usage ($($Metrics.ResourceUsage.MemoryPercent)%) exceeds threshold ($($Thresholds.ResourceUsage.MemoryPercent)%)"
                Value = $Metrics.ResourceUsage.MemoryPercent
                Threshold = $Thresholds.ResourceUsage.MemoryPercent
                Timestamp = Get-Date
            }
        }
        
        if ($Metrics.ResourceUsage.DiskSpacePercent -gt $Thresholds.ResourceUsage.DiskSpacePercent) {
            $alerts += @{
                Type = "DiskSpace"
                Severity = "ERROR"
                Message = "Disk usage ($($Metrics.ResourceUsage.DiskSpacePercent)%) exceeds threshold ($($Thresholds.ResourceUsage.DiskSpacePercent)%)"
                Value = $Metrics.ResourceUsage.DiskSpacePercent
                Threshold = $Thresholds.ResourceUsage.DiskSpacePercent
                Timestamp = Get-Date
            }
        }
    }
    
    # Check error rates
    if ($Metrics.ErrorRates["HTTP"] -gt $Thresholds.ErrorRates.HTTPErrorRate) {
        $alerts += @{
            Type = "ErrorRate"
            Severity = "WARNING"
            Message = "HTTP error rate ($($Metrics.ErrorRates["HTTP"])%) exceeds threshold ($($Thresholds.ErrorRates.HTTPErrorRate)%)"
            Value = $Metrics.ErrorRates["HTTP"]
            Threshold = $Thresholds.ErrorRates.HTTPErrorRate
            Timestamp = Get-Date
        }
    }
    
    # Check availability
    if ($Metrics.Availability["Overall"] -lt $Thresholds.Availability.UptimePercent) {
        $alerts += @{
            Type = "Availability"
            Severity = "ERROR"
            Message = "System availability ($($Metrics.Availability["Overall"])%) below threshold ($($Thresholds.Availability.UptimePercent)%)"
            Value = $Metrics.Availability["Overall"]
            Threshold = $Thresholds.Availability.UptimePercent
            Timestamp = Get-Date
        }
    }
    
    return $alerts
}

function Send-PerformanceAlert {
    param($Alert)
    
    $script:AlertHistory += $Alert
    
    $alertMessage = "🚨 PERFORMANCE ALERT: $($Alert.Message)"
    Write-PerformanceLog $alertMessage "ALERT"
    
    if ($EnableEmailAlerts) {
        # In a real implementation, you would send email alerts here
        Write-PerformanceLog "Email alert would be sent: $($Alert.Message)" "INFO"
    }
    
    # Write to Windows Event Log (optional)
    try {
        Write-EventLog -LogName Application -Source "Medical Device Assistant" -EventId 1001 -EntryType Warning -Message $Alert.Message
    }
    catch {
        # Event source may not exist, which is fine for development
    }
}

function Show-PerformanceDashboard {
    param($Metrics, $Alerts)
    
    Clear-Host
    
    Write-Host "╔══════════════════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
    Write-Host "║              Medical Device Assistant - Performance Monitor                  ║" -ForegroundColor Cyan
    Write-Host "╚══════════════════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Last Updated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
    Write-Host "Monitoring Interval: $Interval seconds" -ForegroundColor Gray
    Write-Host ""
    
    # System Resources
    Write-Host "System Resources:" -ForegroundColor White
    Write-Host "─" * 50 -ForegroundColor Gray
    
    if ($Metrics.ResourceUsage) {
        $cpuColor = if ($Metrics.ResourceUsage.CPUPercent -gt 80) { "Red" } elseif ($Metrics.ResourceUsage.CPUPercent -gt 60) { "Yellow" } else { "Green" }
        $memColor = if ($Metrics.ResourceUsage.MemoryPercent -gt 85) { "Red" } elseif ($Metrics.ResourceUsage.MemoryPercent -gt 70) { "Yellow" } else { "Green" }
        $diskColor = if ($Metrics.ResourceUsage.DiskSpacePercent -gt 90) { "Red" } elseif ($Metrics.ResourceUsage.DiskSpacePercent -gt 80) { "Yellow" } else { "Green" }
        
        Write-Host "CPU Usage:    $($Metrics.ResourceUsage.CPUPercent)%" -ForegroundColor $cpuColor
        Write-Host "Memory Usage: $($Metrics.ResourceUsage.MemoryPercent)%" -ForegroundColor $memColor
        Write-Host "Disk Usage:   $($Metrics.ResourceUsage.DiskSpacePercent)%" -ForegroundColor $diskColor
    } else {
        Write-Host "Resource data unavailable" -ForegroundColor Red
    }
    
    Write-Host ""
    
    # Response Times
    Write-Host "Response Times:" -ForegroundColor White
    Write-Host "─" * 50 -ForegroundColor Gray
    
    foreach ($endpoint in $Metrics.ResponseTimes.GetEnumerator()) {
        $result = $endpoint.Value
        if ($result.Success) {
            $color = if ($result.ResponseTimeMs -gt 5000) { "Red" } elseif ($result.ResponseTimeMs -gt 2000) { "Yellow" } else { "Green" }
            Write-Host "$($endpoint.Key): $($result.ResponseTimeMs) ms" -ForegroundColor $color
        } else {
            Write-Host "$($endpoint.Key): FAILED - $($result.Error)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    
    # Error Rates and Availability
    Write-Host "Error Rates & Availability:" -ForegroundColor White
    Write-Host "─" * 50 -ForegroundColor Gray
    
    $errorColor = if ($Metrics.ErrorRates["HTTP"] -gt 5) { "Red" } elseif ($Metrics.ErrorRates["HTTP"] -gt 2) { "Yellow" } else { "Green" }
    $availColor = if ($Metrics.Availability["Overall"] -lt 99) { "Red" } elseif ($Metrics.Availability["Overall"] -lt 99.5) { "Yellow" } else { "Green" }
    
    Write-Host "HTTP Error Rate: $($Metrics.ErrorRates["HTTP"])%" -ForegroundColor $errorColor
    Write-Host "System Availability: $($Metrics.Availability["Overall"])%" -ForegroundColor $availColor
    
    Write-Host ""
    
    # Active Alerts
    if ($Alerts.Count -gt 0) {
        Write-Host "Active Alerts:" -ForegroundColor Red
        Write-Host "─" * 50 -ForegroundColor Gray
        
        foreach ($alert in $Alerts) {
            $alertIcon = if ($alert.Severity -eq "ERROR") { "🔴" } else { "🟡" }
            Write-Host "$alertIcon $($alert.Message)" -ForegroundColor Red
        }
        Write-Host ""
    }
    
    # Recent Alert History
    if ($script:AlertHistory.Count -gt 0) {
        Write-Host "Recent Alerts (Last 10):" -ForegroundColor White
        Write-Host "─" * 50 -ForegroundColor Gray
        
        $recentAlerts = $script:AlertHistory | Sort-Object Timestamp -Descending | Select-Object -First 10
        foreach ($alert in $recentAlerts) {
            $timeAgo = (Get-Date) - $alert.Timestamp
            $timeAgoStr = if ($timeAgo.TotalHours -gt 1) { "$([math]::Round($timeAgo.TotalHours, 1))h ago" } else { "$([math]::Round($timeAgo.TotalMinutes, 1))m ago" }
            Write-Host "⚠️  $($alert.Type): $($alert.Message) ($timeAgoStr)" -ForegroundColor Yellow
        }
        Write-Host ""
    }
    
    # Performance Trends
    if ($script:PerformanceData.Count -gt 1) {
        Write-Host "Performance Trends (Last Hour):" -ForegroundColor White
        Write-Host "─" * 50 -ForegroundColor Gray
        
        $recentData = $script:PerformanceData | Where-Object { $_.Timestamp -gt (Get-Date).AddHours(-1) }
        
        if ($recentData.Count -gt 1) {
            $avgResponseTime = ($recentData | ForEach-Object { $_.ResponseTimes.Values | Where-Object { $_.Success } | ForEach-Object { $_.ResponseTimeMs } } | Measure-Object -Average).Average
            $avgCPU = ($recentData | Where-Object { $_.ResourceUsage } | ForEach-Object { $_.ResourceUsage.CPUPercent } | Measure-Object -Average).Average
            $avgMemory = ($recentData | Where-Object { $_.ResourceUsage } | ForEach-Object { $_.ResourceUsage.MemoryPercent } | Measure-Object -Average).Average
            
            Write-Host "Avg Response Time: $([math]::Round($avgResponseTime, 0)) ms" -ForegroundColor Cyan
            Write-Host "Avg CPU Usage: $([math]::Round($avgCPU, 1))%" -ForegroundColor Cyan
            Write-Host "Avg Memory Usage: $([math]::Round($avgMemory, 1))%" -ForegroundColor Cyan
        }
        Write-Host ""
    }
    
    # Controls
    Write-Host "Controls: Press 'q' to quit, 'r' to refresh now, 'c' to clear alerts" -ForegroundColor Gray
}

function Export-PerformanceReport {
    $reportFile = "performance-report-$(Get-Date -Format 'yyyy-MM-dd-HHmm').json"
    
    $report = @{
        GeneratedAt = Get-Date
        MonitoringDuration = if ($Duration -gt 0) { "$Duration minutes" } else { "Continuous" }
        SamplingInterval = "$Interval seconds"
        TotalSamples = $script:PerformanceData.Count
        TotalAlerts = $script:AlertHistory.Count
        PerformanceData = $script:PerformanceData
        AlertHistory = $script:AlertHistory
        Summary = @{
            AverageResponseTime = if ($script:PerformanceData.Count -gt 0) { 
                ($script:PerformanceData | ForEach-Object { $_.ResponseTimes.Values | Where-Object { $_.Success } | ForEach-Object { $_.ResponseTimeMs } } | Measure-Object -Average).Average 
            } else { 0 }
            AverageCPUUsage = if ($script:PerformanceData.Count -gt 0) { 
                ($script:PerformanceData | Where-Object { $_.ResourceUsage } | ForEach-Object { $_.ResourceUsage.CPUPercent } | Measure-Object -Average).Average 
            } else { 0 }
            AverageMemoryUsage = if ($script:PerformanceData.Count -gt 0) { 
                ($script:PerformanceData | Where-Object { $_.ResourceUsage } | ForEach-Object { $_.ResourceUsage.MemoryPercent } | Measure-Object -Average).Average 
            } else { 0 }
        }
    }
    
    $report | ConvertTo-Json -Depth 5 | Set-Content $reportFile
    Write-PerformanceLog "Performance report exported: $reportFile" "INFO"
}

function Main {
    Write-Host "Performance Monitor - Medical Device Regulatory Assistant" -ForegroundColor Cyan
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host ""
    
    # Load configuration
    $thresholds = Load-PerformanceThresholds
    
    Write-PerformanceLog "Starting performance monitoring..." "INFO"
    Write-PerformanceLog "Duration: $(if ($Duration -gt 0) { "$Duration minutes" } else { "Continuous" })" "INFO"
    Write-PerformanceLog "Interval: $Interval seconds" "INFO"
    
    $startTime = Get-Date
    $endTime = if ($Duration -gt 0) { $startTime.AddMinutes($Duration) } else { [DateTime]::MaxValue }
    
    while ($script:MonitoringActive -and (Get-Date) -lt $endTime) {
        try {
            # Collect metrics
            $metrics = Get-ApplicationMetrics
            $script:PerformanceData += $metrics
            
            # Check thresholds and generate alerts
            $alerts = Check-PerformanceThresholds -Metrics $metrics -Thresholds $thresholds
            
            # Send alerts
            foreach ($alert in $alerts) {
                # Check if this is a new alert (not sent in last 5 minutes)
                $recentAlert = $script:AlertHistory | Where-Object { 
                    $_.Type -eq $alert.Type -and 
                    ((Get-Date) - $_.Timestamp).TotalMinutes -lt 5 
                }
                
                if (-not $recentAlert) {
                    Send-PerformanceAlert -Alert $alert
                }
            }
            
            # Show dashboard
            Show-PerformanceDashboard -Metrics $metrics -Alerts $alerts
            
            # Check for user input
            if ([Console]::KeyAvailable) {
                $key = [Console]::ReadKey($true)
                switch ($key.KeyChar) {
                    'q' { 
                        $script:MonitoringActive = $false
                        Write-PerformanceLog "Monitoring stopped by user" "INFO"
                    }
                    'r' { 
                        Write-PerformanceLog "Manual refresh requested" "INFO"
                        continue
                    }
                    'c' { 
                        $script:AlertHistory = @()
                        Write-PerformanceLog "Alert history cleared" "INFO"
                    }
                }
            }
            
            # Wait for next interval
            if ($script:MonitoringActive) {
                Start-Sleep -Seconds $Interval
            }
        }
        catch {
            Write-PerformanceLog "Error during monitoring cycle: $($_.Exception.Message)" "ERROR"
            Start-Sleep -Seconds 10
        }
    }
    
    # Export final report
    Export-PerformanceReport
    
    Write-PerformanceLog "Performance monitoring completed" "INFO"
    Write-Host ""
    Write-Host "Performance monitoring stopped." -ForegroundColor Yellow
    
    if ($EnableLogging) {
        Write-Host "Performance log: performance-$(Get-Date -Format 'yyyy-MM-dd').log" -ForegroundColor Cyan
    }
}

# Handle Ctrl+C gracefully
$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action {
    $script:MonitoringActive = $false
}

# Run main function
Main