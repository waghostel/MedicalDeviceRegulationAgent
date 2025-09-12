# Maintenance and Monitoring Guide - Medical Device Regulatory Assistant

## Overview

This guide provides comprehensive procedures for maintaining system health, monitoring performance, and managing the error resolution systems in the Medical Device Regulatory Assistant. The project includes automated monitoring and maintenance tools that help ensure optimal system performance.

## System Health Monitoring

### Automated Health Checks

The system includes comprehensive health monitoring that runs automatically and can be triggered manually.

#### Backend Health Monitoring

```bash
# Check overall system health
cd medical-device-regulatory-assistant/backend
poetry run python -c "
from api.health import get_health_status
from testing.database_isolation import DatabaseTestIsolation
from core.environment import EnvironmentValidator
import asyncio
import json

async def comprehensive_health_check():
    print('=== Comprehensive System Health Check ===')
    
    # API health
    try:
        health_status = await get_health_status()
        print(f'✅ API Health: {health_status[\"status\"]}')
        print(f'   Database: {health_status.get(\"database\", \"unknown\")}')
        print(f'   Memory: {health_status.get(\"memory_usage\", \"unknown\")}MB')
    except Exception as e:
        print(f'❌ API Health Check Failed: {e}')
    
    # Database health
    try:
        isolation = DatabaseTestIsolation()
        db_health = await isolation.check_database_health()
        print(f'✅ Database Health: {\"healthy\" if db_health.get(\"healthy\") else \"unhealthy\"}')
        print(f'   Test isolation: {\"working\" if db_health.get(\"test_isolation_working\") else \"not working\"}')
        print(f'   Active sessions: {db_health.get(\"active_test_sessions\", 0)}')
    except Exception as e:
        print(f'❌ Database Health Check Failed: {e}')
    
    # Environment validation
    try:
        validator = EnvironmentValidator()
        env_result = validator.validate_python_environment()
        print(f'✅ Environment: {\"valid\" if env_result.is_valid else \"invalid\"}')
        if not env_result.is_valid:
            print('   Issues:')
            for error in env_result.errors:
                print(f'     - {error}')
    except Exception as e:
        print(f'❌ Environment Check Failed: {e}')

asyncio.run(comprehensive_health_check())
"
```

#### Frontend Health Monitoring

```bash
# Check frontend health
cd medical-device-regulatory-assistant
node -e "
const http = require('http');

// Check if frontend is running
const checkFrontend = () => {
  return new Promise((resolve, reject) => {
    const req = http.get('http://localhost:3000/api/health', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const health = JSON.parse(data);
          resolve(health);
        } catch (e) {
          resolve({ status: 'running', data: data });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(5000, () => reject(new Error('Timeout')));
  });
};

checkFrontend()
  .then(health => {
    console.log('✅ Frontend Health:', health.status || 'running');
    console.log('   Response time: <5s');
  })
  .catch(err => {
    console.log('❌ Frontend Health Check Failed:', err.message);
    console.log('   Ensure frontend is running on port 3000');
  });
"
```

### Performance Monitoring

#### Real-time Performance Metrics

```bash
# Monitor system performance in real-time
cd medical-device-regulatory-assistant/backend
poetry run python -c "
from testing.performance_monitor import get_performance_monitor
from services.performance_monitor import SystemPerformanceMonitor
import asyncio
import time

async def monitor_system_performance():
    system_monitor = SystemPerformanceMonitor()
    test_monitor = get_performance_monitor()
    
    print('=== Real-time Performance Monitoring ===')
    print('Press Ctrl+C to stop monitoring')
    
    try:
        while True:
            # Collect system metrics
            metrics = await system_monitor.collect_system_metrics()
            
            print(f'\\n[{metrics[\"timestamp\"].strftime(\"%H:%M:%S\")}]')
            print(f'CPU Usage: {metrics[\"cpu\"][\"usage_percent\"]:.1f}%')
            print(f'Memory Usage: {metrics[\"memory\"][\"usage_percent\"]:.1f}% ({metrics[\"memory\"][\"available_gb\"]:.1f}GB available)')
            print(f'Disk Usage: {metrics[\"disk\"][\"usage_percent\"]:.1f}% ({metrics[\"disk\"][\"free_gb\"]:.1f}GB free)')
            
            # Test performance summary
            test_summary = test_monitor.get_performance_summary()
            if test_summary['total_tests'] > 0:
                print(f'Test Performance: {test_summary[\"total_tests\"]} tests, avg {test_summary[\"average_execution_time\"]:.2f}s')
                if test_summary['warnings']:
                    print(f'⚠️  Performance warnings: {len(test_summary[\"warnings\"])}')
            
            await asyncio.sleep(10)  # Update every 10 seconds
            
    except KeyboardInterrupt:
        print('\\n\\nMonitoring stopped.')

asyncio.run(monitor_system_performance())
"
```

#### Performance Report Generation

```bash
# Generate comprehensive performance report
cd medical-device-regulatory-assistant/backend
poetry run python -c "
from testing.performance_monitor import get_performance_monitor
from services.performance_monitor import ApplicationPerformanceMonitor
import json
from datetime import datetime

def generate_performance_report():
    print('=== Generating Performance Report ===')
    
    # Test performance metrics
    test_monitor = get_performance_monitor()
    test_summary = test_monitor.get_performance_summary()
    
    # Application performance metrics (if available)
    app_monitor = ApplicationPerformanceMonitor()
    endpoint_report = app_monitor.get_endpoint_performance_report()
    
    # Create comprehensive report
    report = {
        'generated_at': datetime.utcnow().isoformat(),
        'test_performance': test_summary,
        'endpoint_performance': endpoint_report,
        'recommendations': []
    }
    
    # Add recommendations based on metrics
    if test_summary.get('slow_tests'):
        report['recommendations'].append({
            'category': 'test_performance',
            'issue': f'{len(test_summary[\"slow_tests\"])} slow tests detected',
            'action': 'Review and optimize slow tests',
            'tests': [test['name'] for test in test_summary['slow_tests'][:5]]
        })
    
    if test_summary.get('memory_intensive_tests'):
        report['recommendations'].append({
            'category': 'memory_usage',
            'issue': f'{len(test_summary[\"memory_intensive_tests\"])} memory-intensive tests detected',
            'action': 'Review memory usage in tests',
            'tests': [test['name'] for test in test_summary['memory_intensive_tests'][:5]]
        })
    
    # Save report
    report_file = f'performance_report_{datetime.now().strftime(\"%Y%m%d_%H%M%S\")}.json'
    with open(report_file, 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f'✅ Performance report saved to {report_file}')
    
    # Display summary
    print('\\n=== Performance Summary ===')
    print(f'Total tests monitored: {test_summary.get(\"total_tests\", 0)}')
    print(f'Average execution time: {test_summary.get(\"average_execution_time\", 0):.2f}s')
    print(f'Average memory usage: {test_summary.get(\"average_memory_usage\", 0):.2f}MB')
    print(f'Performance warnings: {len(test_summary.get(\"warnings\", []))}')
    
    if report['recommendations']:
        print('\\n=== Recommendations ===')
        for rec in report['recommendations']:
            print(f'• {rec[\"issue\"]}: {rec[\"action\"]}')

generate_performance_report()
"
```

### Error Tracking and Analysis

#### Error Rate Monitoring

```bash
# Monitor error rates and trends
cd medical-device-regulatory-assistant/backend
poetry run python -c "
from core.error_tracker import ErrorTracker
from datetime import datetime, timedelta
import json

def monitor_error_rates():
    print('=== Error Rate Monitoring ===')
    
    tracker = ErrorTracker()
    
    # Get error statistics for different time periods
    periods = [
        ('Last Hour', timedelta(hours=1)),
        ('Last 24 Hours', timedelta(days=1)),
        ('Last Week', timedelta(weeks=1))
    ]
    
    for period_name, period_delta in periods:
        try:
            end_time = datetime.utcnow()
            start_time = end_time - period_delta
            
            # Analyze error trends (mock implementation)
            trends = tracker.analyze_error_trends(
                start_time=start_time,
                end_time=end_time,
                error_categories=['PROJECT_NOT_FOUND', 'VALIDATION_ERROR', 'DATABASE_ERROR']
            )
            
            print(f'\\n{period_name}:')
            print(f'  Total errors: {trends.get(\"total_errors\", 0)}')
            print(f'  Error rate: {trends.get(\"error_rate\", 0):.2%}')
            print(f'  Most common: {trends.get(\"most_common_error\", \"None\")}')
            
            if trends.get('trending_up'):
                print(f'  ⚠️  Trending up: {trends[\"trending_up\"]}')
            
        except Exception as e:
            print(f'  ❌ Error analyzing {period_name}: {e}')
    
    # Get overall error statistics
    try:
        stats = tracker.get_error_statistics()
        print(f'\\n=== Overall Statistics ===')
        print(f'Total tracked errors: {stats.get(\"total_errors\", 0)}')
        print(f'Average resolution time: {stats.get(\"avg_resolution_time\", \"N/A\")}')
        print(f'Most problematic component: {stats.get(\"most_problematic_component\", \"N/A\")}')
    except Exception as e:
        print(f'❌ Error getting statistics: {e}')

monitor_error_rates()
"
```

#### Error Resolution Tracking

```bash
# Track error resolution effectiveness
cd medical-device-regulatory-assistant/backend
poetry run python -c "
from core.error_tracker import ErrorTracker
from core.exceptions import *
import json

def track_error_resolution():
    print('=== Error Resolution Tracking ===')
    
    tracker = ErrorTracker()
    
    # Check resolution status of different error types
    error_types = [
        'PROJECT_NOT_FOUND',
        'VALIDATION_ERROR', 
        'DATABASE_ERROR',
        'AUTHENTICATION_ERROR',
        'EXTERNAL_SERVICE_ERROR'
    ]
    
    resolution_report = {
        'timestamp': datetime.utcnow().isoformat(),
        'error_types': {}
    }
    
    for error_type in error_types:
        try:
            # Get resolution metrics for this error type
            metrics = tracker.get_resolution_metrics(error_type)
            
            resolution_report['error_types'][error_type] = {
                'total_occurrences': metrics.get('total_occurrences', 0),
                'resolved_count': metrics.get('resolved_count', 0),
                'resolution_rate': metrics.get('resolution_rate', 0),
                'avg_resolution_time': metrics.get('avg_resolution_time', 0),
                'common_causes': metrics.get('common_causes', [])
            }
            
            print(f'\\n{error_type}:')
            print(f'  Occurrences: {metrics.get(\"total_occurrences\", 0)}')
            print(f'  Resolution rate: {metrics.get(\"resolution_rate\", 0):.1%}')
            print(f'  Avg resolution time: {metrics.get(\"avg_resolution_time\", 0):.1f}h')
            
        except Exception as e:
            print(f'  ❌ Error tracking {error_type}: {e}')
            resolution_report['error_types'][error_type] = {'error': str(e)}
    
    # Save resolution report
    report_file = f'error_resolution_report_{datetime.now().strftime(\"%Y%m%d_%H%M%S\")}.json'
    with open(report_file, 'w') as f:
        json.dump(resolution_report, f, indent=2)
    
    print(f'\\n✅ Error resolution report saved to {report_file}')

track_error_resolution()
"
```

## Maintenance Procedures

### Daily Maintenance Tasks

#### Automated Daily Health Check

```bash
#!/bin/bash
# daily_health_check.sh

echo "=== Daily Health Check - $(date) ==="

# Check system health
cd medical-device-regulatory-assistant/backend
poetry run python -c "
from api.health import get_health_status
from testing.database_isolation import DatabaseTestIsolation
import asyncio

async def daily_health_check():
    print('Running daily health check...')
    
    # API health
    try:
        health = await get_health_status()
        if health['status'] == 'healthy':
            print('✅ API: Healthy')
        else:
            print(f'⚠️  API: {health[\"status\"]}')
    except Exception as e:
        print(f'❌ API: Error - {e}')
    
    # Database health
    try:
        isolation = DatabaseTestIsolation()
        db_health = await isolation.check_database_health()
        if db_health.get('healthy'):
            print('✅ Database: Healthy')
        else:
            print(f'⚠️  Database: Issues detected')
    except Exception as e:
        print(f'❌ Database: Error - {e}')
    
    print('Daily health check completed.')

asyncio.run(daily_health_check())
"

# Check disk space
echo "Checking disk space..."
df -h | grep -E "(Filesystem|/dev/)"

# Check memory usage
echo "Checking memory usage..."
free -h

# Check for large log files
echo "Checking log files..."
find . -name "*.log" -size +100M -exec ls -lh {} \;

echo "=== Daily Health Check Complete ==="
```

#### Performance Baseline Update

```bash
# Update performance baselines weekly
cd medical-device-regulatory-assistant/backend
poetry run python -c "
from testing.performance_monitor import get_performance_monitor
from testing.continuous_performance_monitor import ContinuousPerformanceMonitor
import json

def update_performance_baseline():
    print('=== Updating Performance Baseline ===')
    
    # Get current performance metrics
    monitor = get_performance_monitor()
    current_metrics = {}
    
    # Convert performance history to baseline format
    for metric in monitor.performance_history:
        current_metrics[metric.test_name] = {
            'execution_time': metric.execution_time,
            'memory_usage': metric.memory_usage,
            'database_queries': metric.database_queries,
            'api_calls': metric.api_calls
        }
    
    if current_metrics:
        # Update baseline
        continuous_monitor = ContinuousPerformanceMonitor()
        continuous_monitor.save_baseline(current_metrics)
        
        print(f'✅ Updated baseline with {len(current_metrics)} test metrics')
        
        # Generate comparison report
        comparison = continuous_monitor.compare_with_baseline(current_metrics)
        
        if comparison['regressions']:
            print(f'⚠️  {len(comparison[\"regressions\"])} performance regressions detected')
        
        if comparison['improvements']:
            print(f'✅ {len(comparison[\"improvements\"])} performance improvements detected')
            
    else:
        print('⚠️  No performance metrics available for baseline update')

update_performance_baseline()
"
```

### Weekly Maintenance Tasks

#### Database Maintenance

```bash
# Weekly database maintenance
cd medical-device-regulatory-assistant/backend
poetry run python -c "
from database.connection import get_database_manager
from testing.database_isolation import DatabaseTestIsolation
import asyncio
import os

async def weekly_database_maintenance():
    print('=== Weekly Database Maintenance ===')
    
    db_manager = get_database_manager()
    
    # Check database size
    db_files = ['medical_device_assistant.db', 'medical_device_assistant.db-shm', 'medical_device_assistant.db-wal']
    total_size = 0
    
    for db_file in db_files:
        if os.path.exists(db_file):
            size = os.path.getsize(db_file)
            total_size += size
            print(f'  {db_file}: {size / 1024 / 1024:.2f} MB')
    
    print(f'Total database size: {total_size / 1024 / 1024:.2f} MB')
    
    # Check for orphaned test sessions
    isolation = DatabaseTestIsolation()
    active_sessions = await isolation.get_active_sessions_count()
    
    if active_sessions > 0:
        print(f'⚠️  {active_sessions} active test sessions found - cleaning up')
        await isolation.cleanup_all_sessions()
        print('✅ Test sessions cleaned up')
    else:
        print('✅ No orphaned test sessions')
    
    # Vacuum database (SQLite optimization)
    try:
        async with db_manager.get_session() as session:
            await session.execute(text('VACUUM'))
            print('✅ Database vacuumed successfully')
    except Exception as e:
        print(f'⚠️  Database vacuum failed: {e}')
    
    print('Weekly database maintenance completed.')

asyncio.run(weekly_database_maintenance())
"
```

#### Log Rotation and Cleanup

```bash
#!/bin/bash
# weekly_log_cleanup.sh

echo "=== Weekly Log Cleanup - $(date) ==="

# Find and archive old log files
find . -name "*.log" -mtime +7 -exec gzip {} \;

# Remove very old compressed logs
find . -name "*.log.gz" -mtime +30 -delete

# Clean up test artifacts
find . -name "test_*.json" -mtime +7 -delete
find . -name "performance_report_*.json" -mtime +14 -delete

# Clean up temporary files
find . -name "*.tmp" -mtime +1 -delete
find . -name ".DS_Store" -delete

# Clean up node_modules cache (if needed)
cd medical-device-regulatory-assistant
if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
    echo "✅ Cleaned node_modules cache"
fi

# Clean up Python cache
find . -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null
find . -name "*.pyc" -delete

echo "=== Log Cleanup Complete ==="
```

### Monthly Maintenance Tasks

#### Dependency Updates and Security Audit

```bash
#!/bin/bash
# monthly_dependency_audit.sh

echo "=== Monthly Dependency Audit - $(date) ==="

cd medical-device-regulatory-assistant

# Frontend dependency audit
echo "Checking frontend dependencies..."
pnpm audit --audit-level moderate
pnpm outdated

# Backend dependency audit
echo "Checking backend dependencies..."
cd backend
poetry audit
poetry show --outdated

# Security vulnerability check
echo "Checking for security vulnerabilities..."
cd ..
pnpm audit --audit-level high
cd backend
poetry audit --format json > security_audit.json

echo "=== Dependency Audit Complete ==="
echo "Review the output above and update dependencies as needed"
echo "Run 'pnpm update' and 'poetry update' to update dependencies"
```

#### Performance Trend Analysis

```bash
# Monthly performance trend analysis
cd medical-device-regulatory-assistant/backend
poetry run python -c "
from testing.performance_monitor import get_performance_monitor
from testing.continuous_performance_monitor import ContinuousPerformanceMonitor
import json
from datetime import datetime, timedelta
import matplotlib.pyplot as plt
import numpy as np

def analyze_performance_trends():
    print('=== Monthly Performance Trend Analysis ===')
    
    monitor = get_performance_monitor()
    continuous_monitor = ContinuousPerformanceMonitor()
    
    # Analyze trends over the past month
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=30)
    
    # Get performance history
    monthly_metrics = [
        metric for metric in monitor.performance_history
        if start_date <= metric.start_time <= end_date
    ]
    
    if not monthly_metrics:
        print('⚠️  No performance data available for the past month')
        return
    
    # Calculate trends
    execution_times = [m.execution_time for m in monthly_metrics]
    memory_usage = [m.memory_usage for m in monthly_metrics]
    
    avg_execution_time = np.mean(execution_times)
    avg_memory_usage = np.mean(memory_usage)
    
    # Trend analysis
    execution_trend = np.polyfit(range(len(execution_times)), execution_times, 1)[0]
    memory_trend = np.polyfit(range(len(memory_usage)), memory_usage, 1)[0]
    
    print(f'Performance metrics for the past 30 days:')
    print(f'  Total tests: {len(monthly_metrics)}')
    print(f'  Average execution time: {avg_execution_time:.2f}s')
    print(f'  Average memory usage: {avg_memory_usage:.2f}MB')
    print(f'  Execution time trend: {\"improving\" if execution_trend < 0 else \"degrading\"} ({execution_trend:.4f}s/test)')
    print(f'  Memory usage trend: {\"improving\" if memory_trend < 0 else \"degrading\"} ({memory_trend:.4f}MB/test)')
    
    # Identify performance issues
    slow_tests = [m for m in monthly_metrics if m.execution_time > avg_execution_time * 2]
    memory_intensive_tests = [m for m in monthly_metrics if m.memory_usage > avg_memory_usage * 2]
    
    if slow_tests:
        print(f'\\n⚠️  {len(slow_tests)} slow tests identified:')
        for test in slow_tests[:5]:  # Show top 5
            print(f'    {test.test_name}: {test.execution_time:.2f}s')
    
    if memory_intensive_tests:
        print(f'\\n⚠️  {len(memory_intensive_tests)} memory-intensive tests identified:')
        for test in memory_intensive_tests[:5]:  # Show top 5
            print(f'    {test.test_name}: {test.memory_usage:.2f}MB')
    
    # Generate recommendations
    recommendations = []
    
    if execution_trend > 0.01:  # Degrading by more than 0.01s per test
        recommendations.append('Consider optimizing test execution - performance is degrading')
    
    if memory_trend > 1.0:  # Degrading by more than 1MB per test
        recommendations.append('Consider optimizing memory usage - memory consumption is increasing')
    
    if len(slow_tests) > len(monthly_metrics) * 0.1:  # More than 10% slow tests
        recommendations.append('High number of slow tests detected - review test efficiency')
    
    if recommendations:
        print('\\n=== Recommendations ===')
        for rec in recommendations:
            print(f'• {rec}')
    else:
        print('\\n✅ No performance issues detected')

analyze_performance_trends()
"
```

## Monitoring Dashboards

### System Health Dashboard

```bash
# Create system health dashboard
cd medical-device-regulatory-assistant/backend
poetry run python -c "
from services.performance_monitor import SystemPerformanceMonitor
from testing.performance_monitor import get_performance_monitor
from core.error_tracker import ErrorTracker
import asyncio
import json
from datetime import datetime

async def create_health_dashboard():
    print('=== System Health Dashboard ===')
    print(f'Generated at: {datetime.utcnow().strftime(\"%Y-%m-%d %H:%M:%S UTC\")}')
    
    # System metrics
    system_monitor = SystemPerformanceMonitor()
    try:
        metrics = await system_monitor.collect_system_metrics()
        
        print('\\n📊 System Resources:')
        print(f'  CPU Usage: {metrics[\"cpu\"][\"usage_percent\"]:.1f}%')
        print(f'  Memory Usage: {metrics[\"memory\"][\"usage_percent\"]:.1f}% ({metrics[\"memory\"][\"available_gb\"]:.1f}GB available)')
        print(f'  Disk Usage: {metrics[\"disk\"][\"usage_percent\"]:.1f}% ({metrics[\"disk\"][\"free_gb\"]:.1f}GB free)')
        
        # Alert on high usage
        if metrics['cpu']['usage_percent'] > 80:
            print('  ⚠️  High CPU usage detected')
        if metrics['memory']['usage_percent'] > 85:
            print('  ⚠️  High memory usage detected')
        if metrics['disk']['usage_percent'] > 90:
            print('  ⚠️  Low disk space detected')
            
    except Exception as e:
        print(f'❌ System metrics unavailable: {e}')
    
    # Test performance
    test_monitor = get_performance_monitor()
    test_summary = test_monitor.get_performance_summary()
    
    print('\\n🧪 Test Performance:')
    print(f'  Total tests: {test_summary.get(\"total_tests\", 0)}')
    print(f'  Average execution time: {test_summary.get(\"average_execution_time\", 0):.2f}s')
    print(f'  Average memory usage: {test_summary.get(\"average_memory_usage\", 0):.2f}MB')
    print(f'  Slow tests: {len(test_summary.get(\"slow_tests\", []))}')
    print(f'  Memory intensive tests: {len(test_summary.get(\"memory_intensive_tests\", []))}')
    
    if test_summary.get('warnings'):
        print(f'  ⚠️  Performance warnings: {len(test_summary[\"warnings\"])}')
    
    # Error tracking
    error_tracker = ErrorTracker()
    try:
        error_stats = error_tracker.get_error_statistics()
        
        print('\\n🚨 Error Statistics:')
        print(f'  Total errors tracked: {error_stats.get(\"total_errors\", 0)}')
        print(f'  Error rate: {error_stats.get(\"error_rate\", 0):.2%}')
        print(f'  Most common error: {error_stats.get(\"most_common_error\", \"None\")}')
        print(f'  Average resolution time: {error_stats.get(\"avg_resolution_time\", \"N/A\")}')
        
    except Exception as e:
        print(f'❌ Error statistics unavailable: {e}')
    
    # Overall health status
    print('\\n🏥 Overall Health Status:')
    
    health_score = 100
    issues = []
    
    # Deduct points for issues
    if test_summary.get('warnings'):
        health_score -= len(test_summary['warnings']) * 5
        issues.append(f'{len(test_summary[\"warnings\"])} performance warnings')
    
    if test_summary.get('slow_tests'):
        health_score -= len(test_summary['slow_tests']) * 2
        issues.append(f'{len(test_summary[\"slow_tests\"])} slow tests')
    
    try:
        if metrics['cpu']['usage_percent'] > 80:
            health_score -= 10
            issues.append('High CPU usage')
        if metrics['memory']['usage_percent'] > 85:
            health_score -= 15
            issues.append('High memory usage')
        if metrics['disk']['usage_percent'] > 90:
            health_score -= 20
            issues.append('Low disk space')
    except:
        pass
    
    health_score = max(0, health_score)
    
    if health_score >= 90:
        status_emoji = '🟢'
        status_text = 'Excellent'
    elif health_score >= 75:
        status_emoji = '🟡'
        status_text = 'Good'
    elif health_score >= 50:
        status_emoji = '🟠'
        status_text = 'Fair'
    else:
        status_emoji = '🔴'
        status_text = 'Poor'
    
    print(f'  {status_emoji} Health Score: {health_score}/100 ({status_text})')
    
    if issues:
        print('  Issues detected:')
        for issue in issues:
            print(f'    • {issue}')
    else:
        print('  ✅ No issues detected')

asyncio.run(create_health_dashboard())
"
```

### Performance Metrics Dashboard

```bash
# Create performance metrics dashboard
cd medical-device-regulatory-assistant/backend
poetry run python -c "
from testing.performance_monitor import get_performance_monitor
from testing.continuous_performance_monitor import ContinuousPerformanceMonitor
import json
from datetime import datetime, timedelta

def create_performance_dashboard():
    print('=== Performance Metrics Dashboard ===')
    print(f'Generated at: {datetime.utcnow().strftime(\"%Y-%m-%d %H:%M:%S UTC\")}')
    
    monitor = get_performance_monitor()
    continuous_monitor = ContinuousPerformanceMonitor()
    
    # Current performance summary
    summary = monitor.get_performance_summary()
    
    print('\\n📈 Current Performance Metrics:')
    print(f'  Tests monitored: {summary.get(\"total_tests\", 0)}')
    print(f'  Average execution time: {summary.get(\"average_execution_time\", 0):.3f}s')
    print(f'  Average memory usage: {summary.get(\"average_memory_usage\", 0):.2f}MB')
    print(f'  Total database queries: {summary.get(\"total_database_queries\", 0)}')
    print(f'  Total API calls: {summary.get(\"total_api_calls\", 0)}')
    
    # Performance trends
    if monitor.performance_history:
        recent_metrics = monitor.performance_history[-10:]  # Last 10 tests
        
        if len(recent_metrics) >= 2:
            recent_avg_time = sum(m.execution_time for m in recent_metrics) / len(recent_metrics)
            older_metrics = monitor.performance_history[-20:-10] if len(monitor.performance_history) >= 20 else []
            
            if older_metrics:
                older_avg_time = sum(m.execution_time for m in older_metrics) / len(older_metrics)
                trend = ((recent_avg_time - older_avg_time) / older_avg_time) * 100
                
                print(f'\\n📊 Performance Trends:')
                if trend > 5:
                    print(f'  ⚠️  Execution time trending up: +{trend:.1f}%')
                elif trend < -5:
                    print(f'  ✅ Execution time trending down: {trend:.1f}%')
                else:
                    print(f'  ➡️  Execution time stable: {trend:+.1f}%')
    
    # Top performers and problem areas
    if monitor.performance_history:
        fastest_tests = sorted(monitor.performance_history, key=lambda x: x.execution_time)[:5]
        slowest_tests = sorted(monitor.performance_history, key=lambda x: x.execution_time, reverse=True)[:5]
        
        print('\\n🏆 Fastest Tests:')
        for test in fastest_tests:
            print(f'  {test.test_name}: {test.execution_time:.3f}s')
        
        print('\\n🐌 Slowest Tests:')
        for test in slowest_tests:
            print(f'  {test.test_name}: {test.execution_time:.3f}s')
            if test.warnings:
                print(f'    Warnings: {len(test.warnings)}')
    
    # Performance warnings and recommendations
    warnings = summary.get('warnings', [])
    if warnings:
        print('\\n⚠️  Performance Warnings:')
        for warning in warnings[:10]:  # Show top 10
            print(f'  • {warning}')
    
    # Recommendations
    recommendations = []
    
    if summary.get('slow_tests'):
        recommendations.append(f'Optimize {len(summary[\"slow_tests\"])} slow tests')
    
    if summary.get('memory_intensive_tests'):
        recommendations.append(f'Review memory usage in {len(summary[\"memory_intensive_tests\"])} tests')
    
    if summary.get('average_execution_time', 0) > 2.0:
        recommendations.append('Consider optimizing overall test execution time')
    
    if recommendations:
        print('\\n💡 Recommendations:')
        for rec in recommendations:
            print(f'  • {rec}')
    else:
        print('\\n✅ No performance issues detected')

create_performance_dashboard()
"
```

## Automated Maintenance Scripts

### Cron Job Setup

```bash
# Setup automated maintenance cron jobs
# Add to crontab with: crontab -e

# Daily health check at 6 AM
0 6 * * * /path/to/medical-device-regulatory-assistant/scripts/daily_health_check.sh >> /var/log/mdra_health.log 2>&1

# Weekly database maintenance on Sundays at 2 AM
0 2 * * 0 /path/to/medical-device-regulatory-assistant/scripts/weekly_database_maintenance.sh >> /var/log/mdra_maintenance.log 2>&1

# Weekly log cleanup on Sundays at 3 AM
0 3 * * 0 /path/to/medical-device-regulatory-assistant/scripts/weekly_log_cleanup.sh >> /var/log/mdra_cleanup.log 2>&1

# Monthly dependency audit on the 1st at 4 AM
0 4 1 * * /path/to/medical-device-regulatory-assistant/scripts/monthly_dependency_audit.sh >> /var/log/mdra_audit.log 2>&1

# Performance report generation daily at 11 PM
0 23 * * * cd /path/to/medical-device-regulatory-assistant/backend && poetry run python -c "from testing.performance_monitor import get_performance_monitor; get_performance_monitor().export_metrics('daily_performance_$(date +\%Y\%m\%d).json')" >> /var/log/mdra_performance.log 2>&1
```

### Monitoring Alerts

```bash
# Create monitoring alert script
cat > scripts/monitoring_alerts.sh << 'EOF'
#!/bin/bash

# monitoring_alerts.sh - Send alerts for critical issues

ALERT_EMAIL="admin@yourcompany.com"
ALERT_THRESHOLD_CPU=85
ALERT_THRESHOLD_MEMORY=90
ALERT_THRESHOLD_DISK=95

# Check system resources
CPU_USAGE=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | awk -F'%' '{print $1}')
MEMORY_USAGE=$(free | grep Mem | awk '{printf("%.1f"), $3/$2 * 100.0}')
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

# Check for alerts
ALERTS=()

if (( $(echo "$CPU_USAGE > $ALERT_THRESHOLD_CPU" | bc -l) )); then
    ALERTS+=("High CPU usage: ${CPU_USAGE}%")
fi

if (( $(echo "$MEMORY_USAGE > $ALERT_THRESHOLD_MEMORY" | bc -l) )); then
    ALERTS+=("High memory usage: ${MEMORY_USAGE}%")
fi

if [ "$DISK_USAGE" -gt "$ALERT_THRESHOLD_DISK" ]; then
    ALERTS+=("Low disk space: ${DISK_USAGE}% used")
fi

# Check application health
cd medical-device-regulatory-assistant/backend
HEALTH_CHECK=$(poetry run python -c "
from api.health import get_health_status
import asyncio
try:
    health = asyncio.run(get_health_status())
    print(health['status'])
except:
    print('unhealthy')
" 2>/dev/null)

if [ "$HEALTH_CHECK" != "healthy" ]; then
    ALERTS+=("Application health check failed")
fi

# Send alerts if any issues found
if [ ${#ALERTS[@]} -gt 0 ]; then
    ALERT_MESSAGE="MDRA System Alert - $(date)\n\nThe following issues were detected:\n"
    for alert in "${ALERTS[@]}"; do
        ALERT_MESSAGE="${ALERT_MESSAGE}\n• $alert"
    done
    
    echo -e "$ALERT_MESSAGE" | mail -s "MDRA System Alert" "$ALERT_EMAIL"
    echo "Alert sent: ${#ALERTS[@]} issues detected"
else
    echo "No alerts: System healthy"
fi
EOF

chmod +x scripts/monitoring_alerts.sh

# Add to cron for hourly monitoring
# 0 * * * * /path/to/medical-device-regulatory-assistant/scripts/monitoring_alerts.sh >> /var/log/mdra_alerts.log 2>&1
```

## Maintenance Best Practices

### 1. Regular Monitoring

- **Daily**: Check system health and performance metrics
- **Weekly**: Review error rates and performance trends
- **Monthly**: Analyze long-term trends and update baselines

### 2. Proactive Maintenance

- **Database**: Regular vacuuming and cleanup of test sessions
- **Logs**: Rotation and archival to prevent disk space issues
- **Dependencies**: Regular security audits and updates

### 3. Performance Optimization

- **Test Performance**: Monitor and optimize slow tests
- **Memory Usage**: Track and resolve memory leaks
- **Resource Usage**: Monitor system resources and scale as needed

### 4. Error Resolution

- **Error Tracking**: Monitor error rates and resolution times
- **Root Cause Analysis**: Investigate recurring errors
- **System Improvements**: Implement fixes based on error patterns

### 5. Documentation Updates

- **Maintenance Logs**: Keep detailed records of maintenance activities
- **Performance Reports**: Archive performance reports for trend analysis
- **Issue Resolution**: Document solutions for future reference

This comprehensive maintenance and monitoring guide ensures the Medical Device Regulatory Assistant remains healthy, performant, and reliable over time.