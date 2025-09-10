# Automated Integration Testing Pipeline for Medical Device Regulatory Assistant
# Runs comprehensive integration tests with proper setup and teardown

param(
    [Parameter(HelpMessage="Test suite to run: all, health, auth, api, performance")]
    [ValidateSet("all", "health", "auth", "api", "performance", "startup")]
    [string]$TestSuite = "all",
    
    [Parameter(HelpMessage="Generate detailed test report")]
    [switch]$GenerateReport,
    
    [Parameter(HelpMessage="Run tests in parallel where possible")]
    [switch]$Parallel,
    
    [Parameter(HelpMessage="Stop on first failure")]
    [switch]$StopOnFailure,
    
    [Parameter(HelpMessage="Clean environment before testing")]
    [switch]$CleanEnvironment,
    
    [Parameter(HelpMessage="Skip service startup (assume services are running)")]
    [switch]$SkipStartup
)

# Global test configuration
$script:TestResults = @()
$script:TestStartTime = Get-Date
$script:ReportFile = "integration-test-report-$(Get-Date -Format 'yyyy-MM-dd-HHmm').html"
$script:LogFile = "integration-test-log-$(Get-Date -Format 'yyyy-MM-dd-HHmm').log"

function Write-TestLog {
    param([string]$Message, [string]$Level = "INFO")
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    Write-Host $logEntry
    Add-Content -Path $script:LogFile -Value $logEntry
}

function Start-TestServices {
    if ($SkipStartup) {
        Write-TestLog "Skipping service startup (assuming services are running)" "INFO"
        return $true
    }
    
    Write-TestLog "Starting test services..." "INFO"
    
    # Check if services are already running
    $backendRunning = $false
    $frontendRunning = $false
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -Method Head -TimeoutSec 3 -ErrorAction Stop
        $backendRunning = $true
        Write-TestLog "Backend already running" "INFO"
    }
    catch {
        Write-TestLog "Backend not running, starting..." "INFO"
    }
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method Head -TimeoutSec 3 -ErrorAction Stop
        $frontendRunning = $true
        Write-TestLog "Frontend already running" "INFO"
    }
    catch {
        Write-TestLog "Frontend not running, starting..." "INFO"
    }
    
    if (-not $backendRunning -or -not $frontendRunning) {
        Write-TestLog "Starting services with start-dev.ps1..." "INFO"
        
        # Start services in background
        $startProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-File", "start-dev.ps1" -PassThru -WindowStyle Minimized
        
        # Wait for services to be ready
        $maxWaitTime = 60  # seconds
        $waitTime = 0
        
        while ($waitTime -lt $maxWaitTime) {
            Start-Sleep -Seconds 2
            $waitTime += 2
            
            try {
                $backendReady = $false
                $frontendReady = $false
                
                # Check backend
                try {
                    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -Method Head -TimeoutSec 3 -ErrorAction Stop
                    $backendReady = $true
                }
                catch { }
                
                # Check frontend
                try {
                    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method Head -TimeoutSec 3 -ErrorAction Stop
                    $frontendReady = $true
                }
                catch { }
                
                if ($backendReady -and $frontendReady) {
                    Write-TestLog "Services are ready after $waitTime seconds" "INFO"
                    return $true
                }
                
                Write-Host "." -NoNewline
            }
            catch {
                Write-Host "." -NoNewline
            }
        }
        
        Write-TestLog "Services failed to start within $maxWaitTime seconds" "ERROR"
        return $false
    }
    
    return $true
}

function Stop-TestServices {
    if ($SkipStartup) {
        Write-TestLog "Skipping service shutdown (services were not started by this script)" "INFO"
        return
    }
    
    Write-TestLog "Stopping test services..." "INFO"
    
    # Find and stop any processes we started
    $processes = Get-Process | Where-Object { $_.ProcessName -eq "node" -or $_.ProcessName -eq "python" }
    foreach ($process in $processes) {
        try {
            $process.Kill()
            Write-TestLog "Stopped process: $($process.ProcessName) (PID: $($process.Id))" "INFO"
        }
        catch {
            Write-TestLog "Failed to stop process: $($process.ProcessName) (PID: $($process.Id))" "WARNING"
        }
    }
}

function Invoke-TestCommand {
    param(
        [string]$TestName,
        [string]$Command,
        [string]$WorkingDirectory = ".",
        [hashtable]$Environment = @{},
        [int]$TimeoutSeconds = 300
    )
    
    $testStart = Get-Date
    Write-TestLog "Starting test: $TestName" "INFO"
    
    try {
        # Set environment variables
        foreach ($key in $Environment.Keys) {
            [Environment]::SetEnvironmentVariable($key, $Environment[$key], "Process")
        }
        
        # Execute command
        $processInfo = New-Object System.Diagnostics.ProcessStartInfo
        $processInfo.FileName = "powershell.exe"
        $processInfo.Arguments = "-Command `"$Command`""
        $processInfo.WorkingDirectory = $WorkingDirectory
        $processInfo.RedirectStandardOutput = $true
        $processInfo.RedirectStandardError = $true
        $processInfo.UseShellExecute = $false
        $processInfo.CreateNoWindow = $true
        
        $process = New-Object System.Diagnostics.Process
        $process.StartInfo = $processInfo
        
        $stdout = New-Object System.Text.StringBuilder
        $stderr = New-Object System.Text.StringBuilder
        
        $process.add_OutputDataReceived({
            if ($null -ne $EventArgs.Data) {
                [void]$stdout.AppendLine($EventArgs.Data)
            }
        })
        
        $process.add_ErrorDataReceived({
            if ($null -ne $EventArgs.Data) {
                [void]$stderr.AppendLine($EventArgs.Data)
            }
        })
        
        $process.Start()
        $process.BeginOutputReadLine()
        $process.BeginErrorReadLine()
        
        $completed = $process.WaitForExit($TimeoutSeconds * 1000)
        
        if (-not $completed) {
            $process.Kill()
            throw "Test timed out after $TimeoutSeconds seconds"
        }
        
        $testEnd = Get-Date
        $duration = ($testEnd - $testStart).TotalSeconds
        
        $result = @{
            TestName = $TestName
            Success = $process.ExitCode -eq 0
            ExitCode = $process.ExitCode
            Duration = $duration
            Output = $stdout.ToString()
            Error = $stderr.ToString()
            StartTime = $testStart
            EndTime = $testEnd
        }
        
        $script:TestResults += $result
        
        if ($result.Success) {
            Write-TestLog "Test passed: $TestName (${duration}s)" "INFO"
        } else {
            Write-TestLog "Test failed: $TestName (${duration}s, exit code: $($process.ExitCode))" "ERROR"
            if ($result.Error) {
                Write-TestLog "Error output: $($result.Error)" "ERROR"
            }
        }
        
        return $result
    }
    catch {
        $testEnd = Get-Date
        $duration = ($testEnd - $testStart).TotalSeconds
        
        $result = @{
            TestName = $TestName
            Success = $false
            ExitCode = -1
            Duration = $duration
            Output = ""
            Error = $_.Exception.Message
            StartTime = $testStart
            EndTime = $testEnd
        }
        
        $script:TestResults += $result
        Write-TestLog "Test exception: $TestName - $($_.Exception.Message)" "ERROR"
        
        return $result
    }
}

function Test-HealthEndpoints {
    Write-TestLog "Running health endpoint tests..." "INFO"
    
    $tests = @(
        @{
            Name = "Main Health Check"
            Command = "curl -f http://localhost:8000/health"
        },
        @{
            Name = "Database Health Check"
            Command = "curl -f http://localhost:8000/api/health/database"
        },
        @{
            Name = "Redis Health Check"
            Command = "curl -f http://localhost:8000/api/health/redis"
        },
        @{
            Name = "FDA API Health Check"
            Command = "curl -f http://localhost:8000/api/health/fda-api"
        },
        @{
            Name = "System Health Check"
            Command = "curl -f http://localhost:8000/api/health/system"
        },
        @{
            Name = "Readiness Probe"
            Command = "curl -f http://localhost:8000/api/health/ready"
        },
        @{
            Name = "Liveness Probe"
            Command = "curl -f http://localhost:8000/api/health/live"
        }
    )
    
    $results = @()
    foreach ($test in $tests) {
        $result = Invoke-TestCommand -TestName $test.Name -Command $test.Command
        $results += $result
        
        if (-not $result.Success -and $StopOnFailure) {
            Write-TestLog "Stopping tests due to failure in: $($test.Name)" "ERROR"
            break
        }
    }
    
    return $results
}

function Test-AuthenticationEndpoints {
    Write-TestLog "Running authentication tests..." "INFO"
    
    $backendDir = "medical-device-regulatory-assistant/backend"
    
    $tests = @(
        @{
            Name = "Simple Authentication Test"
            Command = "poetry run python test_auth_simple.py"
            WorkingDirectory = $backendDir
        },
        @{
            Name = "Authentication Framework Test"
            Command = "poetry run python -c `"from tests.auth_test_framework import AuthTestFramework; print('Framework loaded successfully')`""
            WorkingDirectory = $backendDir
        },
        @{
            Name = "Authentication Endpoints Test"
            Command = "poetry run pytest tests/test_auth_endpoints.py::TestProjectsAuthentication::test_create_project_no_auth -v"
            WorkingDirectory = $backendDir
        }
    )
    
    $results = @()
    foreach ($test in $tests) {
        $result = Invoke-TestCommand -TestName $test.Name -Command $test.Command -WorkingDirectory $test.WorkingDirectory
        $results += $result
        
        if (-not $result.Success -and $StopOnFailure) {
            Write-TestLog "Stopping tests due to failure in: $($test.Name)" "ERROR"
            break
        }
    }
    
    return $results
}

function Test-APIEndpoints {
    Write-TestLog "Running API endpoint tests..." "INFO"
    
    $tests = @(
        @{
            Name = "Root Endpoint"
            Command = "curl -f http://localhost:8000/"
        },
        @{
            Name = "API Documentation"
            Command = "curl -f http://localhost:8000/docs"
        },
        @{
            Name = "OpenAPI Schema"
            Command = "curl -f http://localhost:8000/openapi.json"
        },
        @{
            Name = "Frontend Root"
            Command = "curl -f http://localhost:3000/"
        },
        @{
            Name = "Projects Endpoint (Unauthenticated)"
            Command = "curl -s -o /dev/null -w `"%{http_code}`" http://localhost:8000/api/projects/ | findstr `"401 403`""
        }
    )
    
    $results = @()
    foreach ($test in $tests) {
        $result = Invoke-TestCommand -TestName $test.Name -Command $test.Command
        $results += $result
        
        if (-not $result.Success -and $StopOnFailure) {
            Write-TestLog "Stopping tests due to failure in: $($test.Name)" "ERROR"
            break
        }
    }
    
    return $results
}

function Test-PerformanceMetrics {
    Write-TestLog "Running performance tests..." "INFO"
    
    $backendDir = "medical-device-regulatory-assistant/backend"
    
    $tests = @(
        @{
            Name = "Backend Startup Performance"
            Command = "poetry run python test_startup_performance.py"
            WorkingDirectory = $backendDir
        },
        @{
            Name = "Health Check Performance"
            Command = "poetry run python -c `"import asyncio; from services.health_check import health_service; print('Performance test:', asyncio.run(health_service.check_all()).execution_time_ms, 'ms')`""
            WorkingDirectory = $backendDir
        }
    )
    
    $results = @()
    foreach ($test in $tests) {
        $result = Invoke-TestCommand -TestName $test.Name -Command $test.Command -WorkingDirectory $test.WorkingDirectory
        $results += $result
        
        if (-not $result.Success -and $StopOnFailure) {
            Write-TestLog "Stopping tests due to failure in: $($test.Name)" "ERROR"
            break
        }
    }
    
    return $results
}

function Test-StartupScripts {
    Write-TestLog "Running startup script tests..." "INFO"
    
    $tests = @(
        @{
            Name = "Backend Startup Script Test"
            Command = "powershell -File test-start-backend.ps1"
        },
        @{
            Name = "Frontend Startup Script Test"
            Command = "powershell -File test-start-frontend.ps1"
        }
    )
    
    $results = @()
    foreach ($test in $tests) {
        if (Test-Path $test.Command.Split(' ')[-1]) {
            $result = Invoke-TestCommand -TestName $test.Name -Command $test.Command
            $results += $result
            
            if (-not $result.Success -and $StopOnFailure) {
                Write-TestLog "Stopping tests due to failure in: $($test.Name)" "ERROR"
                break
            }
        } else {
            Write-TestLog "Skipping test (script not found): $($test.Name)" "WARNING"
        }
    }
    
    return $results
}

function Generate-TestReport {
    if (-not $GenerateReport) {
        return
    }
    
    Write-TestLog "Generating test report..." "INFO"
    
    $totalTests = $script:TestResults.Count
    $passedTests = ($script:TestResults | Where-Object { $_.Success }).Count
    $failedTests = $totalTests - $passedTests
    $totalDuration = ($script:TestResults | Measure-Object -Property Duration -Sum).Sum
    
    $html = @"
<!DOCTYPE html>
<html>
<head>
    <title>Integration Test Report - Medical Device Regulatory Assistant</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f0f8ff; padding: 20px; border-radius: 5px; }
        .summary { background-color: #f9f9f9; padding: 15px; margin: 20px 0; border-radius: 5px; }
        .test-result { margin: 10px 0; padding: 10px; border-radius: 3px; }
        .passed { background-color: #d4edda; border-left: 4px solid #28a745; }
        .failed { background-color: #f8d7da; border-left: 4px solid #dc3545; }
        .details { margin-top: 10px; font-family: monospace; font-size: 12px; }
        .timestamp { color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Integration Test Report</h1>
        <p>Medical Device Regulatory Assistant</p>
        <p class="timestamp">Generated: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')</p>
    </div>
    
    <div class="summary">
        <h2>Test Summary</h2>
        <p><strong>Total Tests:</strong> $totalTests</p>
        <p><strong>Passed:</strong> $passedTests</p>
        <p><strong>Failed:</strong> $failedTests</p>
        <p><strong>Success Rate:</strong> $([math]::Round(($passedTests / $totalTests) * 100, 1))%</p>
        <p><strong>Total Duration:</strong> $([math]::Round($totalDuration, 2)) seconds</p>
    </div>
    
    <h2>Test Results</h2>
"@
    
    foreach ($result in $script:TestResults) {
        $statusClass = if ($result.Success) { "passed" } else { "failed" }
        $statusText = if ($result.Success) { "PASSED" } else { "FAILED" }
        
        $html += @"
    <div class="test-result $statusClass">
        <h3>$($result.TestName) - $statusText</h3>
        <p><strong>Duration:</strong> $([math]::Round($result.Duration, 2)) seconds</p>
        <p><strong>Exit Code:</strong> $($result.ExitCode)</p>
        <p class="timestamp">Started: $($result.StartTime.ToString('yyyy-MM-dd HH:mm:ss'))</p>
"@
        
        if ($result.Output) {
            $html += "<div class='details'><strong>Output:</strong><br><pre>$($result.Output)</pre></div>"
        }
        
        if ($result.Error) {
            $html += "<div class='details'><strong>Error:</strong><br><pre>$($result.Error)</pre></div>"
        }
        
        $html += "</div>"
    }
    
    $html += @"
</body>
</html>
"@
    
    Set-Content -Path $script:ReportFile -Value $html
    Write-TestLog "Test report generated: $script:ReportFile" "INFO"
}

function Clean-TestEnvironment {
    if (-not $CleanEnvironment) {
        return
    }
    
    Write-TestLog "Cleaning test environment..." "INFO"
    
    # Clean up test databases
    $testDbFiles = Get-ChildItem -Path "medical-device-regulatory-assistant/backend" -Filter "test_*.db" -ErrorAction SilentlyContinue
    foreach ($file in $testDbFiles) {
        Remove-Item $file.FullName -Force
        Write-TestLog "Removed test database: $($file.Name)" "INFO"
    }
    
    # Clean up log files older than 7 days
    $oldLogs = Get-ChildItem -Path "." -Filter "*test*.log" | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) }
    foreach ($log in $oldLogs) {
        Remove-Item $log.FullName -Force
        Write-TestLog "Removed old log file: $($log.Name)" "INFO"
    }
}

function Main {
    Write-Host "Integration Testing Pipeline - Medical Device Regulatory Assistant" -ForegroundColor Cyan
    Write-Host "=" * 70 -ForegroundColor Cyan
    Write-Host ""
    
    Write-TestLog "Starting integration test pipeline" "INFO"
    Write-TestLog "Test suite: $TestSuite" "INFO"
    Write-TestLog "Generate report: $GenerateReport" "INFO"
    Write-TestLog "Stop on failure: $StopOnFailure" "INFO"
    
    # Clean environment if requested
    Clean-TestEnvironment
    
    # Start services
    if (-not (Start-TestServices)) {
        Write-TestLog "Failed to start services, aborting tests" "ERROR"
        return 1
    }
    
    try {
        # Run test suites based on selection
        switch ($TestSuite) {
            "health" {
                Test-HealthEndpoints
            }
            "auth" {
                Test-AuthenticationEndpoints
            }
            "api" {
                Test-APIEndpoints
            }
            "performance" {
                Test-PerformanceMetrics
            }
            "startup" {
                Test-StartupScripts
            }
            "all" {
                Test-HealthEndpoints
                Test-AuthenticationEndpoints
                Test-APIEndpoints
                Test-PerformanceMetrics
                Test-StartupScripts
            }
        }
        
        # Generate report
        Generate-TestReport
        
        # Summary
        $totalTests = $script:TestResults.Count
        $passedTests = ($script:TestResults | Where-Object { $_.Success }).Count
        $failedTests = $totalTests - $passedTests
        
        Write-Host ""
        Write-Host "Test Summary:" -ForegroundColor White
        Write-Host "─" * 30 -ForegroundColor Gray
        Write-Host "Total Tests: $totalTests" -ForegroundColor Cyan
        Write-Host "Passed: $passedTests" -ForegroundColor Green
        Write-Host "Failed: $failedTests" -ForegroundColor Red
        Write-Host "Success Rate: $([math]::Round(($passedTests / $totalTests) * 100, 1))%" -ForegroundColor Cyan
        
        if ($GenerateReport) {
            Write-Host ""
            Write-Host "Detailed report: $script:ReportFile" -ForegroundColor Cyan
        }
        
        Write-Host "Test log: $script:LogFile" -ForegroundColor Cyan
        
        return if ($failedTests -eq 0) { 0 } else { 1 }
    }
    finally {
        # Stop services
        Stop-TestServices
    }
}

# Run main function
$exitCode = Main
exit $exitCode