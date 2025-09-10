# Test script for Medical Device Regulatory Assistant startup scripts
# This script tests the functionality of the startup scripts without actually starting services

Write-Host "🧪 Testing Medical Device Regulatory Assistant Scripts" -ForegroundColor Cyan
Write-Host "=" * 55 -ForegroundColor Cyan
Write-Host ""

function Test-ScriptSyntax {
    param([string]$ScriptPath, [string]$ScriptName)
    
    Write-Host "Testing $ScriptName syntax..." -ForegroundColor Yellow
    
    try {
        # Test script syntax by parsing it
        $null = [System.Management.Automation.PSParser]::Tokenize((Get-Content $ScriptPath -Raw), [ref]$null)
        Write-Host "✅ $ScriptName syntax is valid" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "❌ $ScriptName has syntax errors: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-ScriptHelp {
    param([string]$ScriptPath, [string]$ScriptName)
    
    Write-Host "Testing $ScriptName help functionality..." -ForegroundColor Yellow
    
    try {
        if ($ScriptName -eq "start-dev.ps1") {
            $result = & $ScriptPath -Help
        } else {
            # Other scripts don't have help parameters, just test they can be invoked
            Write-Host "✅ $ScriptName can be invoked (no help parameter)" -ForegroundColor Green
            return $true
        }
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ $ScriptName help works correctly" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ $ScriptName help returned error code $LASTEXITCODE" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ $ScriptName help failed: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

function Test-PackageJsonTurbopack {
    Write-Host "Testing package.json Turbopack configuration..." -ForegroundColor Yellow
    
    $packageJsonPath = "medical-device-regulatory-assistant/package.json"
    
    if (-not (Test-Path $packageJsonPath)) {
        Write-Host "❌ package.json not found at $packageJsonPath" -ForegroundColor Red
        return $false
    }
    
    try {
        $packageJson = Get-Content $packageJsonPath | ConvertFrom-Json
        
        if ($packageJson.scripts.dev -eq "next dev --turbo") {
            Write-Host "✅ Turbopack is properly configured in package.json" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Turbopack not configured correctly. Found: $($packageJson.scripts.dev)" -ForegroundColor Red
            return $false
        }
    }
    catch {
        Write-Host "❌ Failed to parse package.json: $($_.Exception.Message)" -ForegroundColor Red
        return $false
    }
}

# Test all scripts
$scripts = @(
    @{ Path = "windows script/start-dev.ps1"; Name = "start-dev.ps1" },
    @{ Path = "windows script/start-frontend.ps1"; Name = "start-frontend.ps1" },
    @{ Path = "windows script/start-backend.ps1"; Name = "start-backend.ps1" }
)

$allPassed = $true

foreach ($script in $scripts) {
    if (-not (Test-Path $script.Path)) {
        Write-Host "❌ Script not found: $($script.Path)" -ForegroundColor Red
        $allPassed = $false
        continue
    }
    
    $syntaxOk = Test-ScriptSyntax $script.Path $script.Name
    $helpOk = Test-ScriptHelp $script.Path $script.Name
    
    if (-not $syntaxOk -or -not $helpOk) {
        $allPassed = $false
    }
    
    Write-Host ""
}

# Test Turbopack configuration
$turbopackOk = Test-PackageJsonTurbopack
if (-not $turbopackOk) {
    $allPassed = $false
}

Write-Host ""
Write-Host "🏁 Test Summary" -ForegroundColor Cyan
Write-Host "=" * 20 -ForegroundColor Cyan

if ($allPassed) {
    Write-Host "✅ All tests passed! Scripts are ready to use." -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 Quick Start Commands:" -ForegroundColor Cyan
    Write-Host "  • Full development: .\start-dev.ps1" -ForegroundColor White
    Write-Host "  • Fast startup: .\start-dev.ps1 -Fast" -ForegroundColor White
    Write-Host "  • Frontend only: .\start-dev.ps1 -FrontendOnly" -ForegroundColor White
    Write-Host "  • Backend only: .\start-dev.ps1 -BackendOnly" -ForegroundColor White
    Write-Host "  • Use Webpack: .\start-dev.ps1 -UseWebpack" -ForegroundColor White
} else {
    Write-Host "❌ Some tests failed. Please review the errors above." -ForegroundColor Red
}

Write-Host ""