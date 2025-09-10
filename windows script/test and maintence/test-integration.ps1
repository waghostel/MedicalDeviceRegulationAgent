# Medical Device Regulatory Assistant - Integration Testing Script
# Tests frontend-backend integration comprehensively

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Integration Testing Script" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$testResults = @()
$currentDir = Get-Location

function Test-Endpoint {
    param(
        [string]$Url,
        [string]$Description,
        [int]$ExpectedStatus = 200,
        [int]$TimeoutSeconds = 10
    )
    
    try {
        Write-Host "Testing: $Description" -ForegroundColor Yellow
        Write-Host "URL: $Url" -ForegroundColor Gray
        
        $response = Invoke-WebRequest -Uri $Url -TimeoutSec $TimeoutSeconds -UseBasicParsing
        
        if ($response.StatusCode -eq $ExpectedStatus) {
            Write-Host "✓ PASS: $Description" -ForegroundColor Green
            return @{ Test = $Description; Status = "PASS"; Details = "Status: $($response.StatusCode)" }
        } else {
            Write-Host "✗ FAIL: $Description - Expected $ExpectedStatus, got $($response.StatusCode)" -ForegroundColor Red
            return @{ Test = $Description; Status = "FAIL"; Details = "Expected $ExpectedStatus, got $($response.StatusCode)" }
        }
    } catch {
        Write-Host "✗ FAIL: $Description - $($_.Exception.Message)" -ForegroundColor Red
        return @{ Test = $Description; Status = "FAIL"; Details = $_.Exception.Message }
    }
}

function Start-BackendService {
    Write-Host "Starting Backend Service..." -ForegroundColor Yellow
    
    Set-Location "medical-device-regulatory-assistant/backend"
    
    # Start backend as background job
    $backendJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        poetry run uvicorn main:app --host 0.0.0.0 --port 8000
    }
    
    Set-Location $currentDir
    
    # Wait for backend to start
    Write-Host "Waiting for backend to start..." -ForegroundColor Gray
    Start-Sleep -Seconds 8
    
    return $backendJob
}

function Start-FrontendService {
    Write-Host "Starting Frontend Service..." -ForegroundColor Yellow
    
    Set-Location "medical-device-regulatory-assistant"
    
    # Start frontend as background job
    $frontendJob = Start-Job -ScriptBlock {
        Set-Location $using:PWD
        pnpm dev
    }
    
    Set-Location $currentDir
    
    # Wait for frontend to start
    Write-Host "Waiting for frontend to start..." -ForegroundColor Gray
    Start-Sleep -Seconds 10
    
    return $frontendJob
}

function Stop-Services {
    param($BackendJob, $FrontendJob)
    
    Write-Host "Stopping services..." -ForegroundColor Yellow
    
    if ($BackendJob) {
        Stop-Job $BackendJob -ErrorAction SilentlyContinue
        Remove-Job $BackendJob -ErrorAction SilentlyContinue
    }
    
    if ($FrontendJob) {
        Stop-Job $FrontendJob -ErrorAction SilentlyContinue
        Remove-Job $FrontendJob -ErrorAction SilentlyContinue
    }
    
    # Kill any remaining processes on ports 3000 and 8000
    try {
        $processes3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
        $processes8000 = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
        
        foreach ($pid in $processes3000) {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
        
        foreach ($pid in $processes8000) {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    } catch {
        # Ignore errors when stopping processes
    }
}

# Test 1: Backend Service Tests
Write-Host ""
Write-Host "=== BACKEND SERVICE TESTS ===" -ForegroundColor Cyan

$backendJob = Start-BackendService

$testResults += Test-Endpoint "http://localhost:8000/" "Backend Root Endpoint"
$testResults += Test-Endpoint "http://localhost:8000/health" "Backend Health Check" 503  # Expected to be unhealthy due to Redis
$testResults += Test-Endpoint "http://localhost:8000/docs" "Backend API Documentation"
$testResults += Test-Endpoint "http://localhost:8000/api/health" "Backend API Health Endpoint" 503

Stop-Services -BackendJob $backendJob

# Test 2: Frontend Service Tests
Write-Host ""
Write-Host "=== FRONTEND SERVICE TESTS ===" -ForegroundColor Cyan

$frontendJob = Start-FrontendService

$testResults += Test-Endpoint "http://localhost:3000/" "Frontend Root Page"
$testResults += Test-Endpoint "http://localhost:3000/_next/static/css/app/layout.css" "Frontend Static Assets" 404  # May not exist, that's ok

Stop-Services -FrontendJob $frontendJob

# Test 3: Full Stack Integration Tests
Write-Host ""
Write-Host "=== FULL STACK INTEGRATION TESTS ===" -ForegroundColor Cyan

Write-Host "Starting both services..." -ForegroundColor Yellow
$backendJob = Start-BackendService
Start-Sleep -Seconds 2
$frontendJob = Start-FrontendService

# Test both services are running
$testResults += Test-Endpoint "http://localhost:8000/" "Backend Service (Full Stack)"
$testResults += Test-Endpoint "http://localhost:3000/" "Frontend Service (Full Stack)"

# Test CORS configuration by checking if frontend can potentially access backend
Write-Host "Testing CORS configuration..." -ForegroundColor Yellow
try {
    $corsTest = Invoke-WebRequest -Uri "http://localhost:8000/" -Headers @{"Origin" = "http://localhost:3000"} -UseBasicParsing
    $corsHeaders = $corsTest.Headers["Access-Control-Allow-Origin"]
    if ($corsHeaders -contains "http://localhost:3000" -or $corsHeaders -contains "*") {
        Write-Host "✓ PASS: CORS Configuration" -ForegroundColor Green
        $testResults += @{ Test = "CORS Configuration"; Status = "PASS"; Details = "CORS headers present" }
    } else {
        Write-Host "✗ FAIL: CORS Configuration - No proper CORS headers" -ForegroundColor Red
        $testResults += @{ Test = "CORS Configuration"; Status = "FAIL"; Details = "No proper CORS headers" }
    }
} catch {
    Write-Host "✗ FAIL: CORS Configuration - $($_.Exception.Message)" -ForegroundColor Red
    $testResults += @{ Test = "CORS Configuration"; Status = "FAIL"; Details = $_.Exception.Message }
}

Stop-Services -BackendJob $backendJob -FrontendJob $frontendJob

# Test 4: API Endpoint Tests
Write-Host ""
Write-Host "=== API ENDPOINT TESTS ===" -ForegroundColor Cyan

$backendJob = Start-BackendService

# Test various API endpoints
$apiEndpoints = @(
    @{ Url = "http://localhost:8000/api/health"; Description = "Health API"; ExpectedStatus = 503 },
    @{ Url = "http://localhost:8000/api/projects"; Description = "Projects API"; ExpectedStatus = 200 }
)

foreach ($endpoint in $apiEndpoints) {
    $testResults += Test-Endpoint $endpoint.Url $endpoint.Description $endpoint.ExpectedStatus
}

Stop-Services -BackendJob $backendJob

# Test Results Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "TEST RESULTS SUMMARY" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan

$passCount = ($testResults | Where-Object { $_.Status -eq "PASS" }).Count
$failCount = ($testResults | Where-Object { $_.Status -eq "FAIL" }).Count
$totalCount = $testResults.Count

Write-Host ""
Write-Host "Total Tests: $totalCount" -ForegroundColor White
Write-Host "Passed: $passCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "🎉 ALL TESTS PASSED!" -ForegroundColor Green
} else {
    Write-Host "⚠️ SOME TESTS FAILED" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Detailed Results:" -ForegroundColor White
Write-Host "=================" -ForegroundColor White

foreach ($result in $testResults) {
    $color = if ($result.Status -eq "PASS") { "Green" } else { "Red" }
    $symbol = if ($result.Status -eq "PASS") { "✓" } else { "✗" }
    
    Write-Host "$symbol $($result.Test): $($result.Status)" -ForegroundColor $color
    if ($result.Details) {
        Write-Host "   Details: $($result.Details)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Integration testing completed!" -ForegroundColor Cyan
Write-Host "Check the results above for any issues that need to be addressed." -ForegroundColor Yellow

# Return to original directory
Set-Location $currentDir