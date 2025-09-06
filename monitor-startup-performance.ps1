# Startup Performance Monitor for Medical Device Regulatory Assistant
# Measures and compares startup performance between different methods

param(
    [switch]$Compare,
    [switch]$Detailed,
    [int]$Iterations = 3
)

function Measure-StartupTime {
    param(
        [string]$ScriptPath,
        [string]$Method,
        [hashtable]$Parameters = @{}
    )
    
    Write-Host "`n🔍 Testing $Method..." -ForegroundColor Cyan
    
    $times = @()
    
    for ($i = 1; $i -le $Iterations; $i++) {
        Write-Host "  Iteration $i/$Iterations..." -ForegroundColor Gray
        
        # Kill any existing processes
        Get-Process | Where-Object {$_.ProcessName -match "node|python"} | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        
        # Measure startup time
        $startTime = Get-Date
        
        try {
            # Start the script with timeout
            $paramString = ($Parameters.GetEnumerator() | ForEach-Object { "-$($_.Key) $($_.Value)" }) -join " "
            $command = "& '$ScriptPath' $paramString -SkipChecks"
            
            # Use a job to run the script with timeout
            $job = Start-Job -ScriptBlock {
                param($cmd)
                Invoke-Expression $cmd
            } -ArgumentList $command
            
            # Wait for services to start (check health endpoint)
            $healthCheckStart = Get-Date
            $maxWait = 30  # seconds
            $serviceReady = $false
            
            while (((Get-Date) - $healthCheckStart).TotalSeconds -lt $maxWait) {
                try {
                    $response = Invoke-RestMethod -Uri "http://localhost:8000/health" -TimeoutSec 2 -ErrorAction Stop
                    if ($response.healthy) {
                        $serviceReady = $true
                        break
                    }
                } catch {
                    Start-Sleep -Seconds 1
                }
            }
            
            $endTime = Get-Date
            $totalTime = ($endTime - $startTime).TotalSeconds
            
            if ($serviceReady) {
                $times += $totalTime
                Write-Host "    ✓ Startup completed in $([math]::Round($totalTime, 1))s" -ForegroundColor Green
            } else {
                Write-Host "    ✗ Startup timed out after $maxWait seconds" -ForegroundColor Red
                $times += $maxWait
            }
            
            # Cleanup
            $job | Stop-Job -ErrorAction SilentlyContinue
            $job | Remove-Job -ErrorAction SilentlyContinue
            
        } catch {
            Write-Host "    ✗ Error during startup: $($_.Exception.Message)" -ForegroundColor Red
            $times += 999  # Mark as failed
        }
        
        # Cleanup processes
        Get-Process | Where-Object {$_.ProcessName -match "node|python"} | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
    }
    
    # Calculate statistics
    $validTimes = $times | Where-Object { $_ -lt 900 }  # Exclude failed attempts
    
    if ($validTimes.Count -gt 0) {
        $avgTime = ($validTimes | Measure-Object -Average).Average
        $minTime = ($validTimes | Measure-Object -Minimum).Minimum
        $maxTime = ($validTimes | Measure-Object -Maximum).Maximum
        
        return @{
            Method = $Method
            Average = [math]::Round($avgTime, 1)
            Minimum = [math]::Round($minTime, 1)
            Maximum = [math]::Round($maxTime, 1)
            SuccessRate = [math]::Round(($validTimes.Count / $Iterations) * 100, 0)
            RawTimes = $times
        }
    } else {
        return @{
            Method = $Method
            Average = "Failed"
            Minimum = "Failed"
            Maximum = "Failed"
            SuccessRate = 0
            RawTimes = $times
        }
    }
}

function Test-SystemPerformance {
    Write-Host "🖥️  System Performance Check" -ForegroundColor Cyan
    Write-Host "-" * 40
    
    # CPU Info
    $cpu = Get-WmiObject -Class Win32_Processor
    Write-Host "CPU: $($cpu.Name)" -ForegroundColor White
    Write-Host "Cores: $($cpu.NumberOfCores) cores, $($cpu.NumberOfLogicalProcessors) threads" -ForegroundColor White
    
    # Memory Info
    $memory = Get-WmiObject -Class Win32_ComputerSystem
    $totalMemory = [math]::Round($memory.TotalPhysicalMemory / 1GB, 1)
    Write-Host "Memory: $totalMemory GB" -ForegroundColor White
    
    # Disk Info
    $disk = Get-WmiObject -Class Win32_LogicalDisk | Where-Object { $_.DeviceID -eq "C:" }
    $freeSpace = [math]::Round($disk.FreeSpace / 1GB, 1)
    $totalSpace = [math]::Round($disk.Size / 1GB, 1)
    Write-Host "Disk: $freeSpace GB free of $totalSpace GB" -ForegroundColor White
    
    # Check if project is on SSD
    $physicalDisk = Get-PhysicalDisk | Where-Object { $_.DeviceID -eq 0 }
    Write-Host "Storage Type: $($physicalDisk.MediaType)" -ForegroundColor White
    
    Write-Host ""
}

function Show-PerformanceReport {
    param([array]$Results)
    
    Write-Host "`n📊 Startup Performance Report" -ForegroundColor Green
    Write-Host "=" * 60
    
    # Table header
    Write-Host ("{0,-25} {1,8} {2,8} {3,8} {4,10}" -f "Method", "Avg (s)", "Min (s)", "Max (s)", "Success %") -ForegroundColor Cyan
    Write-Host ("-" * 60)
    
    # Sort by average time
    $sortedResults = $Results | Sort-Object { if ($_.Average -eq "Failed") { 999 } else { $_.Average } }
    
    foreach ($result in $sortedResults) {
        $color = if ($result.Average -eq "Failed") { "Red" } 
                elseif ($result.Average -le 5) { "Green" }
                elseif ($result.Average -le 8) { "Yellow" }
                else { "Red" }
        
        Write-Host ("{0,-25} {1,8} {2,8} {3,8} {4,9}%" -f 
            $result.Method, 
            $result.Average, 
            $result.Minimum, 
            $result.Maximum, 
            $result.SuccessRate
        ) -ForegroundColor $color
    }
    
    Write-Host ""
    
    # Performance analysis
    $bestResult = $sortedResults | Where-Object { $_.Average -ne "Failed" } | Select-Object -First 1
    if ($bestResult) {
        Write-Host "🏆 Best Performance: $($bestResult.Method) - $($bestResult.Average)s average" -ForegroundColor Green
        
        if ($bestResult.Average -le 5) {
            Write-Host "✅ Target performance achieved (< 5s)" -ForegroundColor Green
        } else {
            Write-Host "⚠️  Target performance not met (goal: < 5s)" -ForegroundColor Yellow
        }
    }
    
    # Recommendations
    Write-Host "`n💡 Performance Recommendations:" -ForegroundColor Cyan
    
    if ($bestResult -and $bestResult.Average -gt 5) {
        Write-Host "• Consider using SSD storage for better I/O performance" -ForegroundColor White
        Write-Host "• Close unnecessary applications to free system resources" -ForegroundColor White
        Write-Host "• Add Windows Defender exclusion for project folder" -ForegroundColor White
    }
    
    if ($bestResult -and $bestResult.Average -le 3) {
        Write-Host "• Excellent performance! Consider this your standard startup method" -ForegroundColor Green
    }
    
    Write-Host "• Use -SkipChecks flag for daily development" -ForegroundColor White
    Write-Host "• Use -Parallel flag for maximum speed" -ForegroundColor White
}

# Main execution
Write-Host "🚀 Medical Device Assistant - Startup Performance Monitor" -ForegroundColor Green
Write-Host "=" * 70

Test-SystemPerformance

if ($Compare) {
    Write-Host "🔄 Running comparative performance tests..." -ForegroundColor Yellow
    Write-Host "This will take several minutes to complete." -ForegroundColor Gray
    Write-Host ""
    
    $results = @()
    
    # Test different startup methods
    if (Test-Path "start-dev.ps1") {
        $results += Measure-StartupTime -ScriptPath "start-dev.ps1" -Method "Original Script"
    }
    
    if (Test-Path "start-dev-optimized.ps1") {
        $results += Measure-StartupTime -ScriptPath "start-dev-optimized.ps1" -Method "Optimized Script"
        $results += Measure-StartupTime -ScriptPath "start-dev-optimized.ps1" -Method "Optimized + SkipChecks" -Parameters @{ "SkipChecks" = "" }
        $results += Measure-StartupTime -ScriptPath "start-dev-optimized.ps1" -Method "Optimized + Parallel" -Parameters @{ "Parallel" = "" }
        $results += Measure-StartupTime -ScriptPath "start-dev-optimized.ps1" -Method "Optimized + All Flags" -Parameters @{ "SkipChecks" = ""; "Parallel" = "" }
    }
    
    Show-PerformanceReport -Results $results
    
} else {
    Write-Host "ℹ️  Quick performance check mode" -ForegroundColor Cyan
    Write-Host "Use -Compare flag for comprehensive testing" -ForegroundColor Gray
    Write-Host ""
    
    # Quick test of optimized script if available
    if (Test-Path "start-dev-optimized.ps1") {
        $result = Measure-StartupTime -ScriptPath "start-dev-optimized.ps1" -Method "Optimized Script" 
        Show-PerformanceReport -Results @($result)
    } else {
        Write-Host "⚠️  Optimized startup script not found" -ForegroundColor Yellow
        Write-Host "Run this monitor from the project root directory" -ForegroundColor Gray
    }
}

Write-Host "`n📋 Usage Examples:" -ForegroundColor Cyan
Write-Host "• Full comparison:  .\monitor-startup-performance.ps1 -Compare" -ForegroundColor White
Write-Host "• Multiple runs:    .\monitor-startup-performance.ps1 -Compare -Iterations 5" -ForegroundColor White
Write-Host "• Quick check:      .\monitor-startup-performance.ps1" -ForegroundColor White
Write-Host ""