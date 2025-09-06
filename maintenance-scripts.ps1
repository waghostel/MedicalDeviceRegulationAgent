# Maintenance Scripts for Medical Device Regulatory Assistant
# Handles log rotation, cleanup, backup, and system maintenance tasks

param(
    [Parameter(HelpMessage="Maintenance task: cleanup, backup, logs, all")]
    [ValidateSet("cleanup", "backup", "logs", "health", "all")]
    [string]$Task = "all",
    
    [Parameter(HelpMessage="Dry run - show what would be done without executing")]
    [switch]$DryRun,
    
    [Parameter(HelpMessage="Force operations without confirmation")]
    [switch]$Force,
    
    [Parameter(HelpMessage="Verbose output")]
    [switch]$Verbose
)

# Configuration
$script:Config = @{
    LogRetentionDays = 30
    BackupRetentionDays = 7
    TempFileRetentionDays = 1
    DatabaseBackupPath = "backups/database"
    LogBackupPath = "backups/logs"
    MaxLogSizeMB = 100
    MaxDatabaseSizeMB = 500
}

function Write-MaintenanceLog {
    param([string]$Message, [string]$Level = "INFO")
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    if ($Verbose -or $Level -eq "ERROR" -or $Level -eq "WARNING") {
        Write-Host $logEntry -ForegroundColor $(
            switch ($Level) {
                "ERROR" { "Red" }
                "WARNING" { "Yellow" }
                "INFO" { "White" }
                default { "Gray" }
            }
        )
    }
    
    # Log to maintenance log file
    $maintenanceLog = "maintenance-$(Get-Date -Format 'yyyy-MM').log"
    Add-Content -Path $maintenanceLog -Value $logEntry
}

function Get-DirectorySize {
    param([string]$Path)
    
    if (-not (Test-Path $Path)) {
        return 0
    }
    
    try {
        $size = (Get-ChildItem -Path $Path -Recurse -File | Measure-Object -Property Length -Sum).Sum
        return [math]::Round($size / 1MB, 2)
    }
    catch {
        Write-MaintenanceLog "Error calculating directory size for $Path: $($_.Exception.Message)" "ERROR"
        return 0
    }
}

function Remove-OldFiles {
    param(
        [string]$Path,
        [int]$RetentionDays,
        [string]$Pattern = "*",
        [string]$Description = "files"
    )
    
    if (-not (Test-Path $Path)) {
        Write-MaintenanceLog "Path does not exist: $Path" "WARNING"
        return
    }
    
    $cutoffDate = (Get-Date).AddDays(-$RetentionDays)
    $oldFiles = Get-ChildItem -Path $Path -Filter $Pattern -Recurse | Where-Object { $_.LastWriteTime -lt $cutoffDate }
    
    if ($oldFiles.Count -eq 0) {
        Write-MaintenanceLog "No old $Description found in $Path (older than $RetentionDays days)" "INFO"
        return
    }
    
    $totalSize = ($oldFiles | Measure-Object -Property Length -Sum).Sum
    $totalSizeMB = [math]::Round($totalSize / 1MB, 2)
    
    Write-MaintenanceLog "Found $($oldFiles.Count) old $Description ($totalSizeMB MB) in $Path" "INFO"
    
    if ($DryRun) {
        Write-MaintenanceLog "[DRY RUN] Would remove $($oldFiles.Count) old $Description" "INFO"
        foreach ($file in $oldFiles) {
            Write-MaintenanceLog "[DRY RUN] Would remove: $($file.FullName)" "INFO"
        }
        return
    }
    
    if (-not $Force) {
        $response = Read-Host "Remove $($oldFiles.Count) old $Description ($totalSizeMB MB)? (y/N)"
        if ($response -ne "y" -and $response -ne "Y") {
            Write-MaintenanceLog "Skipped removal of old $Description" "INFO"
            return
        }
    }
    
    $removedCount = 0
    $removedSize = 0
    
    foreach ($file in $oldFiles) {
        try {
            $fileSize = $file.Length
            Remove-Item $file.FullName -Force
            $removedCount++
            $removedSize += $fileSize
            Write-MaintenanceLog "Removed: $($file.FullName)" "INFO"
        }
        catch {
            Write-MaintenanceLog "Failed to remove: $($file.FullName) - $($_.Exception.Message)" "ERROR"
        }
    }
    
    $removedSizeMB = [math]::Round($removedSize / 1MB, 2)
    Write-MaintenanceLog "Removed $removedCount old $Description ($removedSizeMB MB)" "INFO"
}

function Rotate-LogFiles {
    Write-MaintenanceLog "Starting log rotation..." "INFO"
    
    $logPaths = @(
        "medical-device-regulatory-assistant/backend/*.log",
        "*.log",
        "medical-device-regulatory-assistant/backend/logs/*.log"
    )
    
    foreach ($logPath in $logPaths) {
        $logFiles = Get-ChildItem -Path $logPath -ErrorAction SilentlyContinue
        
        foreach ($logFile in $logFiles) {
            $fileSizeMB = [math]::Round($logFile.Length / 1MB, 2)
            
            if ($fileSizeMB -gt $script:Config.MaxLogSizeMB) {
                Write-MaintenanceLog "Log file $($logFile.Name) is large ($fileSizeMB MB), rotating..." "INFO"
                
                if (-not $DryRun) {
                    $rotatedName = "$($logFile.BaseName)-$(Get-Date -Format 'yyyy-MM-dd-HHmm')$($logFile.Extension)"
                    $rotatedPath = Join-Path $logFile.Directory $rotatedName
                    
                    try {
                        Move-Item $logFile.FullName $rotatedPath
                        Write-MaintenanceLog "Rotated log: $($logFile.Name) -> $rotatedName" "INFO"
                    }
                    catch {
                        Write-MaintenanceLog "Failed to rotate log: $($logFile.Name) - $($_.Exception.Message)" "ERROR"
                    }
                } else {
                    Write-MaintenanceLog "[DRY RUN] Would rotate: $($logFile.Name)" "INFO"
                }
            }
        }
    }
    
    # Remove old log files
    Remove-OldFiles -Path "." -RetentionDays $script:Config.LogRetentionDays -Pattern "*.log" -Description "log files"
    Remove-OldFiles -Path "medical-device-regulatory-assistant/backend" -RetentionDays $script:Config.LogRetentionDays -Pattern "*.log" -Description "backend log files"
}

function Cleanup-TempFiles {
    Write-MaintenanceLog "Cleaning up temporary files..." "INFO"
    
    $tempPaths = @(
        @{ Path = "medical-device-regulatory-assistant/backend/__pycache__"; Description = "Python cache files" },
        @{ Path = "medical-device-regulatory-assistant/backend/.pytest_cache"; Description = "Pytest cache files" },
        @{ Path = "medical-device-regulatory-assistant/backend/.mypy_cache"; Description = "MyPy cache files" },
        @{ Path = "medical-device-regulatory-assistant/.next"; Description = "Next.js cache files" },
        @{ Path = "medical-device-regulatory-assistant/node_modules/.cache"; Description = "Node.js cache files" }
    )
    
    foreach ($tempPath in $tempPaths) {
        if (Test-Path $tempPath.Path) {
            $sizeMB = Get-DirectorySize -Path $tempPath.Path
            Write-MaintenanceLog "Found $($tempPath.Description): $sizeMB MB" "INFO"
            
            if (-not $DryRun) {
                if ($Force -or (Read-Host "Remove $($tempPath.Description) ($sizeMB MB)? (y/N)") -eq "y") {
                    try {
                        Remove-Item $tempPath.Path -Recurse -Force
                        Write-MaintenanceLog "Removed $($tempPath.Description)" "INFO"
                    }
                    catch {
                        Write-MaintenanceLog "Failed to remove $($tempPath.Description): $($_.Exception.Message)" "ERROR"
                    }
                }
            } else {
                Write-MaintenanceLog "[DRY RUN] Would remove $($tempPath.Description)" "INFO"
            }
        }
    }
    
    # Remove temporary test files
    Remove-OldFiles -Path "." -RetentionDays $script:Config.TempFileRetentionDays -Pattern "test_*.db" -Description "test database files"
    Remove-OldFiles -Path "." -RetentionDays $script:Config.TempFileRetentionDays -Pattern "*.tmp" -Description "temporary files"
}

function Backup-DatabaseFiles {
    Write-MaintenanceLog "Starting database backup..." "INFO"
    
    $backupDir = $script:Config.DatabaseBackupPath
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        Write-MaintenanceLog "Created backup directory: $backupDir" "INFO"
    }
    
    $dbFiles = Get-ChildItem -Path "medical-device-regulatory-assistant/backend" -Filter "*.db" -ErrorAction SilentlyContinue
    
    foreach ($dbFile in $dbFiles) {
        $backupName = "$($dbFile.BaseName)-$(Get-Date -Format 'yyyy-MM-dd-HHmm')$($dbFile.Extension)"
        $backupPath = Join-Path $backupDir $backupName
        
        if (-not $DryRun) {
            try {
                Copy-Item $dbFile.FullName $backupPath
                Write-MaintenanceLog "Backed up database: $($dbFile.Name) -> $backupName" "INFO"
            }
            catch {
                Write-MaintenanceLog "Failed to backup database: $($dbFile.Name) - $($_.Exception.Message)" "ERROR"
            }
        } else {
            Write-MaintenanceLog "[DRY RUN] Would backup: $($dbFile.Name) -> $backupName" "INFO"
        }
    }
    
    # Remove old backups
    Remove-OldFiles -Path $backupDir -RetentionDays $script:Config.BackupRetentionDays -Pattern "*.db" -Description "database backups"
}

function Backup-LogFiles {
    Write-MaintenanceLog "Starting log backup..." "INFO"
    
    $backupDir = $script:Config.LogBackupPath
    if (-not (Test-Path $backupDir)) {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        Write-MaintenanceLog "Created log backup directory: $backupDir" "INFO"
    }
    
    # Compress and backup current logs
    $logFiles = Get-ChildItem -Path "." -Filter "*.log" | Where-Object { $_.LastWriteTime -gt (Get-Date).AddDays(-1) }
    
    if ($logFiles.Count -gt 0) {
        $archiveName = "logs-$(Get-Date -Format 'yyyy-MM-dd-HHmm').zip"
        $archivePath = Join-Path $backupDir $archiveName
        
        if (-not $DryRun) {
            try {
                Compress-Archive -Path $logFiles.FullName -DestinationPath $archivePath
                Write-MaintenanceLog "Created log archive: $archiveName" "INFO"
            }
            catch {
                Write-MaintenanceLog "Failed to create log archive: $($_.Exception.Message)" "ERROR"
            }
        } else {
            Write-MaintenanceLog "[DRY RUN] Would create log archive: $archiveName" "INFO"
        }
    }
    
    # Remove old log backups
    Remove-OldFiles -Path $backupDir -RetentionDays $script:Config.BackupRetentionDays -Pattern "*.zip" -Description "log backups"
}

function Check-SystemHealth {
    Write-MaintenanceLog "Checking system health..." "INFO"
    
    # Check disk space
    $drives = Get-WmiObject -Class Win32_LogicalDisk | Where-Object { $_.DriveType -eq 3 }
    foreach ($drive in $drives) {
        $freeSpacePercent = [math]::Round(($drive.FreeSpace / $drive.Size) * 100, 1)
        
        if ($freeSpacePercent -lt 10) {
            Write-MaintenanceLog "WARNING: Drive $($drive.DeviceID) has low disk space ($freeSpacePercent% free)" "WARNING"
        } else {
            Write-MaintenanceLog "Drive $($drive.DeviceID): $freeSpacePercent% free space" "INFO"
        }
    }
    
    # Check database file sizes
    $dbFiles = Get-ChildItem -Path "medical-device-regulatory-assistant/backend" -Filter "*.db" -ErrorAction SilentlyContinue
    foreach ($dbFile in $dbFiles) {
        $sizeMB = [math]::Round($dbFile.Length / 1MB, 2)
        
        if ($sizeMB -gt $script:Config.MaxDatabaseSizeMB) {
            Write-MaintenanceLog "WARNING: Database $($dbFile.Name) is large ($sizeMB MB)" "WARNING"
        } else {
            Write-MaintenanceLog "Database $($dbFile.Name): $sizeMB MB" "INFO"
        }
    }
    
    # Check log file sizes
    $logFiles = Get-ChildItem -Path "." -Filter "*.log" -ErrorAction SilentlyContinue
    $totalLogSize = ($logFiles | Measure-Object -Property Length -Sum).Sum / 1MB
    
    if ($totalLogSize -gt 500) {
        Write-MaintenanceLog "WARNING: Total log files size is large ($([math]::Round($totalLogSize, 2)) MB)" "WARNING"
    } else {
        Write-MaintenanceLog "Total log files size: $([math]::Round($totalLogSize, 2)) MB" "INFO"
    }
    
    # Check service health if running
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:8000/health" -Method Get -TimeoutSec 5 -ErrorAction Stop
        if ($response.healthy) {
            Write-MaintenanceLog "Backend service is healthy" "INFO"
        } else {
            Write-MaintenanceLog "Backend service reports unhealthy status" "WARNING"
        }
    }
    catch {
        Write-MaintenanceLog "Backend service is not accessible (may not be running)" "INFO"
    }
}

function Show-MaintenanceReport {
    Write-Host ""
    Write-Host "Maintenance Report" -ForegroundColor Cyan
    Write-Host "=" * 50 -ForegroundColor Cyan
    
    # Disk usage
    Write-Host ""
    Write-Host "Disk Usage:" -ForegroundColor White
    $projectSize = Get-DirectorySize -Path "medical-device-regulatory-assistant"
    $backupSize = Get-DirectorySize -Path "backups"
    $logSize = Get-DirectorySize -Path "."
    
    Write-Host "  Project files: $projectSize MB" -ForegroundColor Gray
    Write-Host "  Backup files: $backupSize MB" -ForegroundColor Gray
    Write-Host "  Log files: $logSize MB" -ForegroundColor Gray
    
    # File counts
    Write-Host ""
    Write-Host "File Counts:" -ForegroundColor White
    $logCount = (Get-ChildItem -Path "." -Filter "*.log" -ErrorAction SilentlyContinue).Count
    $dbCount = (Get-ChildItem -Path "medical-device-regulatory-assistant/backend" -Filter "*.db" -ErrorAction SilentlyContinue).Count
    $backupCount = (Get-ChildItem -Path "backups" -Recurse -File -ErrorAction SilentlyContinue).Count
    
    Write-Host "  Log files: $logCount" -ForegroundColor Gray
    Write-Host "  Database files: $dbCount" -ForegroundColor Gray
    Write-Host "  Backup files: $backupCount" -ForegroundColor Gray
    
    Write-Host ""
}

function Main {
    Write-Host "Maintenance Scripts - Medical Device Regulatory Assistant" -ForegroundColor Cyan
    Write-Host "=" * 60 -ForegroundColor Cyan
    Write-Host ""
    
    if ($DryRun) {
        Write-Host "DRY RUN MODE - No changes will be made" -ForegroundColor Yellow
        Write-Host ""
    }
    
    Write-MaintenanceLog "Starting maintenance task: $Task" "INFO"
    
    switch ($Task) {
        "cleanup" {
            Cleanup-TempFiles
            Rotate-LogFiles
        }
        "backup" {
            Backup-DatabaseFiles
            Backup-LogFiles
        }
        "logs" {
            Rotate-LogFiles
        }
        "health" {
            Check-SystemHealth
        }
        "all" {
            Check-SystemHealth
            Cleanup-TempFiles
            Rotate-LogFiles
            Backup-DatabaseFiles
            Backup-LogFiles
        }
    }
    
    Show-MaintenanceReport
    
    Write-MaintenanceLog "Maintenance task completed: $Task" "INFO"
    Write-Host ""
    Write-Host "Maintenance completed successfully!" -ForegroundColor Green
    
    if ($Verbose) {
        Write-Host "Maintenance log: maintenance-$(Get-Date -Format 'yyyy-MM').log" -ForegroundColor Cyan
    }
}

# Show help if requested
if ($args -contains "-help" -or $args -contains "--help" -or $args -contains "/?") {
    Write-Host "Maintenance Scripts for Medical Device Regulatory Assistant" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor White
    Write-Host "  .\maintenance-scripts.ps1 [options]" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Tasks:" -ForegroundColor White
    Write-Host "  -Task cleanup    Clean temporary files and rotate logs" -ForegroundColor Gray
    Write-Host "  -Task backup     Backup database and log files" -ForegroundColor Gray
    Write-Host "  -Task logs       Rotate log files only" -ForegroundColor Gray
    Write-Host "  -Task health     Check system health" -ForegroundColor Gray
    Write-Host "  -Task all        Run all maintenance tasks (default)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Options:" -ForegroundColor White
    Write-Host "  -DryRun          Show what would be done without executing" -ForegroundColor Gray
    Write-Host "  -Force           Skip confirmation prompts" -ForegroundColor Gray
    Write-Host "  -Verbose         Show detailed output" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor White
    Write-Host "  .\maintenance-scripts.ps1" -ForegroundColor Gray
    Write-Host "  .\maintenance-scripts.ps1 -Task cleanup -DryRun" -ForegroundColor Gray
    Write-Host "  .\maintenance-scripts.ps1 -Task backup -Force -Verbose" -ForegroundColor Gray
    exit 0
}

# Run main function
Main