# Health Check Documentation

## Overview

The Medical Device Regulatory Assistant includes comprehensive health checks to monitor system status and dependencies. The health check system is designed to provide clear information about service availability while ensuring the application remains functional even when optional services are unavailable.

## Health Check Endpoints

### Main Health Check
- **URL**: `GET /health`
- **Description**: Comprehensive health check for all system components
- **Response**: Overall system health with individual component details

### API Health Checks
- **URL**: `GET /api/health/`
- **Description**: Same as main health check but through API router
- **Query Parameters**: `?checks=database,redis,fda_api` (optional, specific checks)

### Individual Component Checks
- **Database**: `GET /api/health/database`
- **Redis Cache**: `GET /api/health/redis`
- **FDA API**: `GET /api/health/fda-api`
- **System Resources**: `GET /api/health/system`

### Kubernetes-Style Probes
- **Readiness**: `GET /api/health/ready` (critical services only)
- **Liveness**: `GET /api/health/live` (basic application responsiveness)

## Health Check Components

### 1. Database Health Check

**Purpose**: Verify SQLite database connectivity and configuration

**Status Values**:
- `connected`: Database is accessible and responding
- `not_initialized`: Database manager not yet initialized (startup phase)
- `connection_failed`: Cannot connect to database file
- `database_error`: Database operations failing
- `error`: Unexpected error

**Critical**: Yes - Application cannot function without database

**Common Issues**:
- Database file permissions
- Disk space issues
- Database corruption
- Initialization timing during startup

### 2. Redis Health Check

**Purpose**: Verify Redis cache connectivity (optional service)

**Status Values**:
- `connected`: Redis is accessible and responding
- `not_configured`: Redis client not initialized (normal)
- `not_available`: Redis server not running (normal)
- `configuration_error`: Redis configuration issues
- `error`: Unexpected Redis error

**Critical**: No - Application works without Redis

**Redis Dependency Explanation**:
Redis is an **optional** caching service that improves performance but is not required for core functionality:

- ✅ **Without Redis**: Application works normally, FDA API calls are made directly
- ✅ **With Redis**: FDA API responses are cached, improving response times
- ⚠️ **Redis Down**: Application continues working, caching is disabled

**Expected Behavior**:
- Fresh installation: Redis reports "not_available" - this is normal
- With Redis installed: Redis reports "connected" - caching enabled
- Redis fails: Redis reports "not_available" - application continues

### 3. FDA API Health Check

**Purpose**: Verify external FDA API accessibility

**Status Values**:
- `accessible`: FDA API responding normally
- `timeout`: FDA API request timed out
- `http_error`: FDA API returned error status
- `network_error`: Network connectivity issues
- `inaccessible`: Cannot reach FDA API

**Critical**: Yes - Core functionality requires FDA API access

**Common Issues**:
- Internet connectivity problems
- FDA API service outages
- Rate limiting (temporary)
- Firewall blocking external requests

### 4. Disk Space Health Check

**Purpose**: Monitor available disk space

**Status Values**:
- `ok`: Sufficient disk space available (< 90% used)
- `low_space`: Disk space running low (> 90% used)
- `error`: Cannot determine disk usage

**Critical**: No - Monitored for operational awareness

**Thresholds**:
- Healthy: < 90% disk usage
- Warning: > 90% disk usage

### 5. Memory Health Check

**Purpose**: Monitor system memory usage (requires psutil)

**Status Values**:
- `ok`: Memory usage within normal limits (< 90%)
- `high_usage`: Memory usage high (> 90%)
- `not_available`: psutil not installed (normal)
- `error`: Cannot determine memory usage

**Critical**: No - Monitored for operational awareness

**Note**: Memory monitoring requires the `psutil` package, which is optional.

## Health Check Response Format

### Successful Response (200 OK)
```json
{
  "healthy": true,
  "timestamp": "2025-09-06T04:54:11.666911Z",
  "execution_time_ms": 125.7,
  "service": "medical-device-regulatory-assistant",
  "version": "0.1.0",
  "checks": {
    "database": {
      "healthy": true,
      "status": "connected",
      "error": null,
      "message": "Database connection successful",
      "details": null,
      "execution_time_ms": 15.2,
      "timestamp": "2025-09-06T04:54:11.666911Z"
    },
    "redis": {
      "healthy": true,
      "status": "not_available",
      "error": "Connection refused",
      "message": "Redis server not running - application will work without cache",
      "details": null,
      "execution_time_ms": 8.5,
      "timestamp": "2025-09-06T04:54:11.666911Z"
    }
  }
}
```

### Unhealthy Response (503 Service Unavailable)
```json
{
  "healthy": false,
  "timestamp": "2025-09-06T04:54:11.666911Z",
  "execution_time_ms": 125.7,
  "service": "medical-device-regulatory-assistant",
  "version": "0.1.0",
  "checks": {
    "database": {
      "healthy": false,
      "status": "connection_failed",
      "error": "Cannot access database file",
      "message": null,
      "details": null,
      "execution_time_ms": 15.2,
      "timestamp": "2025-09-06T04:54:11.666911Z"
    }
  }
}
```

## Overall Health Determination

The system is considered **healthy** when:
- All critical services are healthy (database, FDA API)
- Optional services may be unhealthy without affecting overall status
- Database in "not_initialized" state is acceptable during startup

The system is considered **unhealthy** when:
- Any critical service fails
- Database connection completely fails
- FDA API is inaccessible

## Service Classification

### Critical Services
- **Database**: Required for data persistence
- **FDA API**: Required for core regulatory functionality

### Optional Services
- **Redis**: Improves performance but not required
- **Disk Space**: Monitored for operational awareness
- **Memory**: Monitored for operational awareness

## Startup Behavior

During application startup:
1. Database may report "not_initialized" initially - this is normal
2. Redis may report "not_configured" or "not_available" - this is normal
3. FDA API should become "accessible" once network is available
4. Overall health becomes true once critical services are ready

## Monitoring and Alerting

### Production Monitoring
- Monitor `/api/health/ready` for service readiness
- Monitor `/api/health/live` for basic liveness
- Alert on overall `healthy: false` status
- Monitor individual component status for operational insights

### Development Monitoring
- Use `/health` endpoint for comprehensive status
- Redis "not_available" is normal and expected
- Focus on database and FDA API health

## Troubleshooting Guide

### Database Issues
1. Check database file exists and is accessible
2. Verify file permissions (readable/writable)
3. Check disk space availability
4. Review application logs for initialization errors

### Redis Issues
1. **Not Required**: Remember Redis is optional
2. Check if Redis server is running: `redis-cli ping`
3. Verify Redis configuration and port (6379)
4. See `docs/redis-setup-guide.md` for installation

### FDA API Issues
1. Check internet connectivity
2. Verify FDA API status: https://api.fda.gov/device/510k.json?limit=1
3. Check for rate limiting or temporary outages
4. Review firewall and proxy settings

### System Resource Issues
1. Free up disk space if usage > 90%
2. Monitor memory usage patterns
3. Consider system resource limits
4. Check for resource-intensive processes

## Integration Examples

### Health Check in CI/CD
```bash
# Wait for service to be ready
while ! curl -f http://localhost:8000/api/health/ready; do
  echo "Waiting for service to be ready..."
  sleep 5
done
```

### Monitoring Script
```bash
#!/bin/bash
HEALTH=$(curl -s http://localhost:8000/health | jq -r '.healthy')
if [ "$HEALTH" != "true" ]; then
  echo "Service unhealthy, investigating..."
  curl -s http://localhost:8000/health | jq '.checks'
fi
```

### Docker Health Check
```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/health/ready || exit 1
```

## Security Considerations

- Health check endpoints do not require authentication
- Sensitive information (passwords, keys) is not exposed
- Database paths may be shown but not credentials
- Error messages are informative but not overly detailed

## Performance Impact

- Health checks are designed to be lightweight
- Individual checks typically complete in < 100ms
- Full health check typically completes in < 500ms
- Concurrent execution of checks for better performance
- Caching of health check results not implemented (real-time status)

This health check system ensures reliable monitoring while maintaining application functionality even when optional services are unavailable.