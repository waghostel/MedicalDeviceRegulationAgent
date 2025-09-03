# Terminal Detection Script for Windows PowerShell
# This script helps users identify their terminal environment

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Terminal Environment Detection" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Current Shell Information:" -ForegroundColor Yellow
Write-Host "- Shell: PowerShell" -ForegroundColor White
Write-Host "- Version: $($PSVersionTable.PSVersion)" -ForegroundColor White
Write-Host "- Edition: $($PSVersionTable.PSEdition)" -ForegroundColor White
Write-Host "- OS: $($PSVersionTable.OS)" -ForegroundColor White
Write-Host ""

Write-Host "RECOMMENDATION: Use PowerShell (.ps1) scripts for better experience" -ForegroundColor Green
Write-Host ""
Write-Host "Available Scripts:" -ForegroundColor Yellow
Write-Host "- start-frontend.ps1  (Start Next.js frontend)" -ForegroundColor Cyan
Write-Host "- start-backend.ps1   (Start FastAPI backend)" -ForegroundColor Cyan
Write-Host "- start-all.ps1       (Start both services)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Alternative (.bat scripts for cmd.exe):" -ForegroundColor Gray
Write-Host "- start-frontend.bat" -ForegroundColor DarkGray
Write-Host "- start-backend.bat" -ForegroundColor DarkGray
Write-Host "- start-all.bat" -ForegroundColor DarkGray
Write-Host ""

Write-Host "Checking required tools..." -ForegroundColor Yellow

# Check pnpm
try {
    $pnpmVersion = pnpm --version 2>$null
    Write-Host "✓ pnpm: $pnpmVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ pnpm: NOT FOUND - Please install: npm install -g pnpm" -ForegroundColor Red
}

# Check Poetry
try {
    $poetryVersion = poetry --version 2>$null
    Write-Host "✓ Poetry: $poetryVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Poetry: NOT FOUND - Please install from: https://python-poetry.org/docs/#installation" -ForegroundColor Red
}

# Check Node.js
try {
    $nodeVersion = node --version 2>$null
    Write-Host "✓ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Node.js: NOT FOUND - Please install from: https://nodejs.org/" -ForegroundColor Red
}

# Check Python
try {
    $pythonVersion = python --version 2>$null
    Write-Host "✓ Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "✗ Python: NOT FOUND - Please install from: https://python.org/" -ForegroundColor Red
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Read-Host "Press Enter to exit"