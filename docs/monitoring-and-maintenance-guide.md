# Monitoring and Maintenance Guide

## Overview

This guide covers the comprehensive monitoring and maintenance tools for the Medical Device Regulatory Assistant. These tools ensure system reliability, performance, and proper maintenance of the application.

## Monitoring Tools

### 1. System Health Monitor (`monitor-system-health.ps1`)

Real-time health monitoring dashboard for all system components.

#### Features
- Interactive dashboard with real-time updates
- Health checks for all services (backend, frontend, database, Redis, FDA API)
- Alert system for unhealthy services
- Performance metrics tracking
- Logging capabilities

#### Usage
```powershell
# Interactive dashboard (default)
.\monitor-system-health.ps1

# Continuous monitoring with alerts and logging
.\monitor-system-health.ps1 -Mode continuous -EnableAlerts -LogToFile

# Single health check
.\monitor-system-health.ps1 -Mode single

# Custom backend URL
.\monitor-system-health.ps1 -BackendUrl "http://localhost:8001"
```

#### Dashboard Controls
- `q` - Quit monitoring
- `r` - Refresh now
- `c` - Clear alert history

### 2. Performance Monitor (`performance-monitor.ps1`)

Advanced performance monitoring with alerting and trend analysis.

#### Features
- Response time monitoring for all endpoints
- System resource usage tracking (CPU, memory, disk)
- Error rate monitoring
- Availability tracking
- Configurable alert thresholds
- Performance trend analysis
- Detailed reporting

#### Usage
```powershell
# Continuous performance monitoring
.\performance-monitor.ps1

# Monitor for specific duration
.\performance-monitor.ps1 -Duration 60 -Interval 30

# Enable email alerts and logging
.\performance-monitor.ps1 -EnableEmailAlerts -EnableLogging

# Custom configuration file
.\performance-monitor.ps1 -ConfigFile "custom-thresholds.json"
```

#### Configuration
Create `performance-thresholds.json` to customize alert thresholds:

```json
{
  "ResponseTime": {
    "HealthCheck": 5000,
    "APIEndpoint": 10000,
    "DatabaseQuery": 3000
  },
  "ResourceUsage": {
    "CPUPercent": 80,
    "MemoryPercent": 85,
    "DiskSpacePercent": 90
  },
  "ErrorRates": {
    "HTTPErrorRate": 5,
    "DatabaseErrorRate": 2
  },
  "Availability": {
    "UptimePercent": 99.5
  }
}
```

## Testing Tools

### 3. Integration Test Pipeline (`run-integration-tests.ps1`)

Automated testing pipeline for comprehensive integration testing.

#### Features
- Multiple test suites (health, auth, api, performance, startup)
- Parallel test execution support
- Detailed HTML test reports
- Service startup/shutdown management
- Environment cleanup
- Comprehensive logging

#### Usage
```powershell
# Run all tests
.\run-integration-tests.ps1

# Run specific test suite
.\run-integration-tests.ps1 -TestSuite health
.\run-integration-tests.ps1 -TestSuite auth
.\run-integration-tests.ps1 -TestSuite api

# Generate detailed report
.\run-integration-tests.ps1 -GenerateReport

# Stop on first failure
.\run-integration-tests.ps1 -StopOnFailure

# Clean environment before testing
.\run-integration-tests.ps1 -CleanEnvironment

# Skip service startup (assume services running)
.\run-integration-tests.ps1 -SkipStartup
```

#### Test Suites
- **health** - Health endpoint tests
- **auth** - Authentication and authorization tests
- **api** - API endpoint functionality tests
- **performance** - Performance and load tests
- **startup** - Startup script tests
- **all** - All test suites (default)

## Maintenance Tools

### 4. Maintenance Scripts (`maintenance-scripts.ps1`)

Comprehensive maintenance and cleanup tools.

#### Features
- Log rotation and cleanup
- Database backup and recovery
- Temporary file cleanup
- System health monitoring
- Disk space monitoring
- Configurable retention policies

#### Usage
```powershell
# Run all maintenance tasks
.\maintenance-scripts.ps1

# Run specific maintenance task
.\maintenance-scripts.ps1 -Task cleanup
.\maintenance-scripts.ps1 -Task backup
.\maintenance-scripts.ps1 -Task logs
.\maintenance-scripts.ps1 -Task health

# Dry run (show what would be done)
.\maintenance-scripts.ps1 -DryRun

# Force operations without confirmation
.\maintenance-scripts.ps1 -Force

# Verbose output
.\maintenance-scripts.ps1 -Verbose
```

#### Maintenance Tasks
- **cleanup** - Clean temporary files and rotate logs
- **backup** - Backup database and log files
- **logs** - Rotate log files only
- **health** - Check system health
- **all** - Run all maintenance tasks (default)

#### Configuration
The maintenance scripts use these default settings:

```powershell
$Config = @{
    LogRetentionDays = 30
    BackupRetentionDays = 7
    TempFileRetentionDays = 1
    DatabaseBackupPath = "backups/database"
    LogBackupPath = "backups/logs"
    MaxLogSizeMB = 100
    MaxDatabaseSizeMB = 500
}
```

## Automated Scheduling

### Windows Task Scheduler

Set up automated maintenance using Windows Task Scheduler:

#### Daily Health Check
```powershell
# Create scheduled task for daily health monitoring
schtasks /create /tn "Medical Device Assistant Health Check" /tr "powershell.exe -File C:\path\to\monitor-system-health.ps1 -Mode single" /sc daily /st 09:00
```

#### Weekly Maintenance
```powershell
# Create scheduled task for weekly maintenance
schtasks /create /tn "Medical Device Assistant Maintenance" /tr "powershell.exe -File C:\path\to\maintenance-scripts.ps1 -Force" /sc weekly /d SUN /st 02:00
```

#### Performance Monitoring
```powershell
# Create scheduled task for performance monitoring during business hours
schtasks /create /tn "Medical Device Assistant Performance Monitor" /tr "powershell.exe -File C:\path\to\performance-monitor.ps1 -Duration 480 -EnableLogging" /sc daily /st 08:00
```

### PowerShell Scheduled Jobs

Alternative using PowerShell scheduled jobs:

```powershell
# Register daily maintenance job
Register-ScheduledJob -Name "MedicalDeviceMaintenanceDaily" -ScriptBlock {
    Set-Location "C:\path\to\project"
    .\maintenance-scripts.ps1 -Task cleanup -Force
} -Trigger (New-JobTrigger -Daily -At "2:00 AM")

# Register weekly backup job
Register-ScheduledJob -Name "MedicalDeviceBackupWeekly" -ScriptBlock {
    Set-Location "C:\path\to\project"
    .\maintenance-scripts.ps1 -Task backup -Force
} -Trigger (New-JobTrigger -Weekly -DaysOfWeek Sunday -At "3:00 AM")
```

## Monitoring Best Practices

### 1. Regular Health Checks
- Run health checks at least daily
- Monitor critical services continuously during development
- Set up alerts for service failures

### 2. Performance Monitoring
- Monitor response times during peak usage
- Track resource usage trends
- Set appropriate alert thresholds based on your environment

### 3. Log Management
- Rotate logs regularly to prevent disk space issues
- Archive important logs for compliance
- Monitor log file sizes and growth patterns

### 4. Backup Strategy
- Backup databases daily during active development
- Keep multiple backup versions
- Test backup restoration procedures regularly

### 5. Maintenance Schedule
- Run cleanup tasks weekly
- Perform comprehensive maintenance monthly
- Update monitoring thresholds based on usage patterns

## Troubleshooting

### Common Issues

#### Services Not Responding
1. Check if services are running: `.\monitor-system-health.ps1 -Mode single`
2. Restart services: `.\start-dev.ps1`
3. Check logs for error messages
4. Verify port availability

#### High Resource Usage
1. Monitor performance: `.\performance-monitor.ps1`
2. Check for memory leaks or CPU spikes
3. Review application logs
4. Consider scaling or optimization

#### Disk Space Issues
1. Run cleanup: `.\maintenance-scripts.ps1 -Task cleanup`
2. Check log file sizes
3. Archive or remove old files
4. Monitor disk usage trends

#### Alert Fatigue
1. Review and adjust alert thresholds
2. Implement alert suppression for known issues
3. Focus on actionable alerts
4. Regular review of alert patterns

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Health and Performance Monitoring

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  health-check:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Start Services
        run: .\start-dev.ps1
        
      - name: Run Health Check
        run: .\monitor-system-health.ps1 -Mode single
        
      - name: Run Integration Tests
        run: .\run-integration-tests.ps1 -TestSuite health -GenerateReport
        
      - name: Upload Test Results
        uses: actions/upload-artifact@v3
        with:
          name: health-check-results
          path: |
            *.html
            *.log
```

## Security Considerations

### Monitoring Security
- Protect monitoring endpoints from unauthorized access
- Secure log files containing sensitive information
- Use encrypted connections for remote monitoring
- Implement proper authentication for monitoring dashboards

### Maintenance Security
- Run maintenance scripts with appropriate permissions
- Secure backup files and storage locations
- Validate input parameters to prevent injection attacks
- Log all maintenance activities for audit trails

## Performance Optimization

### Monitoring Overhead
- Adjust monitoring intervals based on requirements
- Use efficient monitoring techniques
- Cache monitoring data when appropriate
- Minimize impact on application performance

### Resource Management
- Monitor monitoring tool resource usage
- Set appropriate limits and timeouts
- Clean up monitoring data regularly
- Optimize monitoring queries and operations

This comprehensive monitoring and maintenance system ensures the Medical Device Regulatory Assistant runs reliably and efficiently while providing detailed insights into system health and performance.