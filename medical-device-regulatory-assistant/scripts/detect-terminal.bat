@echo off
REM Terminal Detection Script for Windows
REM This script helps users identify their terminal environment

echo ========================================
echo Terminal Environment Detection
echo ========================================
echo.

echo Current Shell Information:
echo - Shell: Command Prompt (cmd.exe)
echo - Version: %COMSPEC%
echo - OS: %OS%
echo - Processor: %PROCESSOR_ARCHITECTURE%
echo.

echo Checking for PowerShell availability...
powershell -Command "Write-Host 'PowerShell is available'" 2>nul
if errorlevel 1 (
    echo - PowerShell: Not available or not in PATH
    echo.
    echo RECOMMENDATION: Use .bat scripts
    echo - start-frontend.bat
    echo - start-backend.bat  
    echo - start-all.bat
) else (
    echo - PowerShell: Available
    echo.
    echo RECOMMENDATION: You can use either .bat or .ps1 scripts
    echo.
    echo For Command Prompt (current):
    echo - start-frontend.bat
    echo - start-backend.bat
    echo - start-all.bat
    echo.
    echo For PowerShell (recommended):
    echo - start-frontend.ps1
    echo - start-backend.ps1
    echo - start-all.ps1
)

echo.
echo Checking required tools...

pnpm --version >nul 2>&1
if errorlevel 1 (
    echo - pnpm: NOT FOUND - Please install: npm install -g pnpm
) else (
    for /f "tokens=*" %%i in ('pnpm --version 2^>nul') do echo - pnpm: %%i
)

poetry --version >nul 2>&1
if errorlevel 1 (
    echo - Poetry: NOT FOUND - Please install from: https://python-poetry.org/docs/#installation
) else (
    for /f "tokens=*" %%i in ('poetry --version 2^>nul') do echo - Poetry: %%i
)

echo.
echo ========================================
pause