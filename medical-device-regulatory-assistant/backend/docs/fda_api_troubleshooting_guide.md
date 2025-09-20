# FDA API Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting information for FDA API integration issues in the Medical Device Regulatory Assistant. It covers common problems, diagnostic steps, and solutions for production environments.

## Table of Contents

1. [Quick Diagnostics](#quick-diagnostics)
2. [Common Issues](#common-issues)
3. [Authentication Problems](#authentication-problems)
4. [Rate Limiting Issues](#rate-limiting-issues)
5. [Network and Connectivity](#network-and-connectivity)
6. [Cache-Related Issues](#cache-related-issues)
7. [Performance Problems](#performance-problems)
8. [Circuit Breaker Issues](#circuit-breaker-issues)
9. [Data Quality Issues](#data-quality-issues)
10. [Monitoring and Debugging](#monitoring-and-debugging)

## Quick Diagnostics

### Health Check Command

```bash
cd medical-device-regulatory-assistant/backend
poetry run python -c "
import asyncio
from services.openfda import create_production_openfda_service

async def check_health():
    service = await create_production_openfda_service()
    health = await service.health_check()
    print(f'Status: {health[\"status\"]}')
    print(f'Response Time: {health.get(\"response_time_seconds\", \"N/A\")}s')
    print(f'Circuit Breaker: {health[\"circuit_breaker_state\"]}')
    print(f'API Key Configured: {health[\"api_key_configured\"]}')
    if 'error' in health:
        print(f'Error: {health[\"error\"]}')
    await service.close()

asyncio.run(check_health())
"
```

### Configuration Validation

```bash
poetry run python -c "
import asyncio
from services.openfda import create_production_openfda_service

async def validate_config():
    service = await create_production_openfda_service()
    validation = await service.validate_api_configuration()

    print('Configuration Validation Results:')
    print(f'API Key Configured: {validation[\"api_key_configured\"]}')
    print(f'Base URL Accessible: {validation[\"base_url_accessible\"]}')
    print(f'Cache Configured: {validation[\"cache_configured\"]}')

    if validation['errors']:
        print('\\nErrors:')
        for error in validation['errors']:
            print(f'  - {error}')

    if validation['warnings']:
        print('\\nWarnings:')
        for warning in validation['warnings']:
            print(f'  - {warning}')

    await service.close()

asyncio.run(validate_config())
"
```

## Common Issues

### Issue 1: "Database manager not initialized"

**Symptoms:**

- API endpoints return 500 errors
- Error message: "Database manager not initialized"

**Diagnosis:**

```bash
# Check if database is accessible
poetry run python -c "
import sqlite3
try:
    conn = sqlite3.connect('medical_device_assistant.db')
    print('Database accessible')
    conn.close()
except Exception as e:
    print(f'Database error: {e}')
"
```

**Solutions:**

1. **Initialize Database:**

   ```bash
   poetry run python -c "
   from database.connection import initialize_database_manager
   initialize_database_manager()
   print('Database manager initialized')
   "
   ```

2. **Check Database File Permissions:**

   ```bash
   ls -la medical_device_assistant.db
   chmod 664 medical_device_assistant.db
   ```

3. **Recreate Database:**
   ```bash
   rm medical_device_assistant.db
   poetry run alembic upgrade head
   ```

### Issue 2: "No module named 'services.openfda'"

**Symptoms:**

- Import errors when trying to use FDA service
- Module not found errors

**Solutions:**

1. **Check Python Path:**

   ```bash
   poetry run python -c "import sys; print('\\n'.join(sys.path))"
   ```

2. **Reinstall Dependencies:**

   ```bash
   poetry install --no-cache
   ```

3. **Check File Structure:**
   ```bash
   ls -la services/openfda.py
   ls -la services/__init__.py
   ```

### Issue 3: "Connection pool is closed"

**Symptoms:**

- HTTP connection errors
- "Connection pool is closed" messages

**Solutions:**

1. **Proper Service Cleanup:**

   ```python
   # Always close service properly
   async def main():
       service = await create_openfda_service()
       try:
           # Use service
           pass
       finally:
           await service.close()
   ```

2. **Check Connection Limits:**

   ```python
   # Increase connection limits
   import httpx

   http_client = httpx.AsyncClient(
       limits=httpx.Limits(
           max_keepalive_connections=20,
           max_connections=50
       )
   )
   ```

## Authentication Problems

### Issue: "Authentication failed - check FDA_API_KEY"

**Symptoms:**

- 401 Unauthorized errors
- Authentication failed messages

**Diagnosis Steps:**

1. **Check API Key Configuration:**

   ```bash
   echo $FDA_API_KEY
   # Should output your API key (if set)
   ```

2. **Verify API Key Format:**

   ```bash
   poetry run python -c "
   import os
   api_key = os.getenv('FDA_API_KEY')
   if api_key:
       print(f'API Key length: {len(api_key)}')
       print(f'API Key starts with: {api_key[:10]}...')
   else:
       print('FDA_API_KEY not set')
   "
   ```

3. **Test API Key Manually:**
   ```bash
   curl "https://api.fda.gov/device/510k.json?api_key=YOUR_API_KEY&search=device_class:II&limit=1"
   ```

**Solutions:**

1. **Set API Key:**

   ```bash
   export FDA_API_KEY="your-actual-api-key"
   # Or add to .env.local file
   echo "FDA_API_KEY=your-actual-api-key" >> .env.local
   ```

2. **Request New API Key:**
   - Visit: https://open.fda.gov/apis/authentication/
   - Register for a new API key
   - Update configuration

3. **Use Without API Key (Limited):**
   ```bash
   export USE_REAL_FDA_API=true
   # Remove or comment out FDA_API_KEY
   # Note: This will have lower rate limits
   ```

### Issue: "Access forbidden - API key may be invalid or expired"

**Symptoms:**

- 403 Forbidden errors
- API key expired messages

**Solutions:**

1. **Check API Key Status:**
   - Log into FDA developer portal
   - Verify key is active and not expired

2. **Regenerate API Key:**
   - Request new API key from FDA
   - Update configuration with new key

3. **Check API Key Permissions:**
   - Ensure key has access to device endpoints
   - Verify no IP restrictions

## Rate Limiting Issues

### Issue: "Rate limit exceeded after X attempts"

**Symptoms:**

- 429 Too Many Requests errors
- Long delays in API responses
- Rate limit exceeded messages

**Diagnosis:**

1. **Check Current Rate Limit Status:**

   ```bash
   poetry run python -c "
   import asyncio
   from services.openfda import create_production_openfda_service

   async def check_rate_limit():
       service = await create_production_openfda_service()
       health = await service.health_check()
       print(f'Rate limiter requests: {health.get(\"rate_limiter_requests\", 0)}/240')
       await service.close()

   asyncio.run(check_rate_limit())
   "
   ```

2. **Monitor Request Frequency:**
   ```bash
   # Check logs for request patterns
   grep "Making FDA API request" backend.log | tail -20
   ```

**Solutions:**

1. **Implement Request Batching:**

   ```python
   # Batch multiple searches
   async def batch_searches(search_terms_list):
       results = []
       for terms in search_terms_list:
           result = await service.search_predicates(terms)
           results.append(result)
           # Rate limiter handles delays automatically
       return results
   ```

2. **Increase Cache TTL:**

   ```python
   service = OpenFDAService(
       cache_ttl=7200  # 2 hours instead of 1
   )
   ```

3. **Use API Key for Higher Limits:**

   ```bash
   # API key provides 240 requests/minute vs 40/minute without
   export FDA_API_KEY="your-api-key"
   ```

4. **Implement Request Queuing:**

   ```python
   import asyncio
   from asyncio import Queue

   request_queue = Queue(maxsize=100)

   async def queue_processor():
       while True:
           request = await request_queue.get()
           try:
               result = await service.search_predicates(request['terms'])
               request['callback'](result)
           except Exception as e:
               request['error_callback'](e)
           finally:
               request_queue.task_done()
   ```

## Network and Connectivity

### Issue: "Network error after X attempts"

**Symptoms:**

- Connection timeout errors
- Network unreachable messages
- DNS resolution failures

**Diagnosis:**

1. **Test Basic Connectivity:**

   ```bash
   # Test DNS resolution
   nslookup api.fda.gov

   # Test HTTP connectivity
   curl -I https://api.fda.gov/device/510k.json

   # Test with timeout
   curl --max-time 30 "https://api.fda.gov/device/510k.json?search=device_class:II&limit=1"
   ```

2. **Check Network Configuration:**

   ```bash
   # Check proxy settings
   echo $HTTP_PROXY
   echo $HTTPS_PROXY

   # Check firewall rules
   sudo iptables -L | grep 443
   ```

**Solutions:**

1. **Configure Proxy Settings:**

   ```python
   import httpx

   proxies = {
       "http://": "http://proxy.company.com:8080",
       "https://": "http://proxy.company.com:8080"
   }

   http_client = httpx.AsyncClient(proxies=proxies)
   service = OpenFDAService(http_client=http_client)
   ```

2. **Increase Timeout Values:**

   ```python
   service = OpenFDAService(
       timeout=60,  # Increase from 30 to 60 seconds
       max_retries=5  # Increase retry attempts
   )
   ```

3. **Configure DNS Settings:**
   ```bash
   # Add to /etc/resolv.conf
   nameserver 8.8.8.8
   nameserver 8.8.4.4
   ```

### Issue: "SSL Certificate verification failed"

**Symptoms:**

- SSL/TLS certificate errors
- Certificate verification failures

**Solutions:**

1. **Update CA Certificates:**

   ```bash
   # Ubuntu/Debian
   sudo apt-get update && sudo apt-get install ca-certificates

   # CentOS/RHEL
   sudo yum update ca-certificates

   # macOS
   brew install ca-certificates
   ```

2. **Configure Certificate Bundle:**

   ```python
   import httpx
   import certifi

   http_client = httpx.AsyncClient(
       verify=certifi.where()
   )
   ```

3. **Disable SSL Verification (NOT RECOMMENDED for production):**
   ```python
   # Only for testing/debugging
   http_client = httpx.AsyncClient(verify=False)
   ```

## Cache-Related Issues

### Issue: "Redis connection failed"

**Symptoms:**

- Cache errors in logs
- Slower API responses
- Redis connection timeouts

**Diagnosis:**

1. **Test Redis Connectivity:**

   ```bash
   # Test Redis connection
   redis-cli ping

   # Check Redis status
   redis-cli info server
   ```

2. **Check Redis Configuration:**
   ```bash
   echo $REDIS_URL
   # Should output: redis://localhost:6379 or similar
   ```

**Solutions:**

1. **Start Redis Server:**

   ```bash
   # Ubuntu/Debian
   sudo systemctl start redis-server

   # macOS with Homebrew
   brew services start redis

   # Docker
   docker run -d -p 6379:6379 redis:alpine
   ```

2. **Configure Redis URL:**

   ```bash
   export REDIS_URL="redis://localhost:6379"
   # Or for remote Redis
   export REDIS_URL="redis://username:password@host:port/db"
   ```

3. **Disable Cache (Fallback):**
   ```python
   # Service works without cache, just slower
   service = OpenFDAService(redis_client=None)
   ```

### Issue: "Cache key collision" or "Invalid cache data"

**Symptoms:**

- Unexpected search results
- Cache-related errors
- Inconsistent data

**Solutions:**

1. **Clear Cache:**

   ```bash
   redis-cli FLUSHDB
   # Or clear specific keys
   redis-cli DEL "openfda:*"
   ```

2. **Update Cache Key Generation:**

   ```python
   # Force cache refresh
   results = await service._make_request(
       "device/510k.json",
       params=params,
       use_cache=False
   )
   ```

3. **Reduce Cache TTL:**
   ```python
   service = OpenFDAService(
       cache_ttl=1800  # 30 minutes instead of 1 hour
   )
   ```

## Performance Problems

### Issue: "Slow API responses"

**Symptoms:**

- High response times (>10 seconds)
- Timeout errors
- Poor user experience

**Diagnosis:**

1. **Measure Response Times:**

   ```bash
   poetry run python -c "
   import asyncio
   import time
   from services.openfda import create_production_openfda_service

   async def measure_performance():
       service = await create_production_openfda_service()

       start_time = time.time()
       results = await service.search_predicates(['pacemaker'])
       end_time = time.time()

       print(f'Response time: {end_time - start_time:.2f} seconds')
       print(f'Results count: {len(results)}')

       await service.close()

   asyncio.run(measure_performance())
   "
   ```

2. **Check Cache Hit Rate:**
   ```bash
   redis-cli info stats | grep keyspace
   ```

**Solutions:**

1. **Optimize Query Parameters:**

   ```python
   # Use specific search terms
   results = await service.search_predicates(
       search_terms=["cardiac pacemaker"],  # Specific terms
       product_code="DXX",                  # Filter by product code
       limit=50                             # Limit results
   )
   ```

2. **Implement Connection Pooling:**

   ```python
   import httpx

   http_client = httpx.AsyncClient(
       limits=httpx.Limits(
           max_keepalive_connections=20,
           max_connections=50,
           keepalive_expiry=30
       )
   )
   ```

3. **Use Parallel Processing:**
   ```python
   # Process multiple requests in parallel
   tasks = [
       service.search_predicates(["term1"]),
       service.search_predicates(["term2"]),
       service.search_predicates(["term3"])
   ]
   results = await asyncio.gather(*tasks)
   ```

### Issue: "Memory usage growing over time"

**Symptoms:**

- Increasing memory consumption
- Out of memory errors
- Performance degradation

**Solutions:**

1. **Implement Proper Cleanup:**

   ```python
   async def process_searches():
       service = await create_openfda_service()
       try:
           # Process searches
           pass
       finally:
           await service.close()  # Always cleanup
   ```

2. **Limit Cache Size:**

   ```bash
   # Configure Redis memory limit
   redis-cli CONFIG SET maxmemory 100mb
   redis-cli CONFIG SET maxmemory-policy allkeys-lru
   ```

3. **Monitor Memory Usage:**

   ```python
   import psutil
   import gc

   def monitor_memory():
       process = psutil.Process()
       print(f"Memory usage: {process.memory_info().rss / 1024 / 1024:.2f} MB")
       gc.collect()  # Force garbage collection
   ```

## Circuit Breaker Issues

### Issue: "Circuit breaker is OPEN - API temporarily unavailable"

**Symptoms:**

- All API requests failing immediately
- Circuit breaker OPEN state
- No actual API calls being made

**Diagnosis:**

1. **Check Circuit Breaker State:**

   ```bash
   poetry run python -c "
   import asyncio
   from services.openfda import create_production_openfda_service

   async def check_circuit_breaker():
       service = await create_production_openfda_service()
       health = await service.health_check()
       print(f'Circuit breaker state: {health[\"circuit_breaker_state\"]}')
       await service.close()

   asyncio.run(check_circuit_breaker())
   "
   ```

**Solutions:**

1. **Wait for Recovery:**

   ```bash
   # Circuit breaker will automatically attempt recovery after timeout
   # Default recovery timeout: 60 seconds
   sleep 60
   ```

2. **Manual Reset (if needed):**

   ```python
   # Reset circuit breaker manually
   service.circuit_breaker.state = "CLOSED"
   service.circuit_breaker.failure_count = 0
   ```

3. **Adjust Circuit Breaker Settings:**

   ```python
   from services.openfda import CircuitBreaker

   # More lenient settings
   circuit_breaker = CircuitBreaker(
       failure_threshold=10,    # Allow more failures
       recovery_timeout=30      # Shorter recovery time
   )
   ```

## Data Quality Issues

### Issue: "Unexpected or missing data in results"

**Symptoms:**

- Empty search results for valid queries
- Missing fields in returned data
- Inconsistent data formats

**Diagnosis:**

1. **Test Query Directly:**

   ```bash
   curl "https://api.fda.gov/device/510k.json?search=device_class:II&limit=5" | jq .
   ```

2. **Check Query Construction:**
   ```python
   # Debug query building
   search_terms = ["pacemaker"]
   query = f'device_name:"{search_terms[0]}" OR statement_or_summary:"{search_terms[0]}"'
   print(f"Generated query: {query}")
   ```

**Solutions:**

1. **Improve Query Building:**

   ```python
   # Use more flexible search terms
   results = await service.search_predicates(
       search_terms=["cardiac", "pacemaker", "implantable"],
       device_class="II"
   )
   ```

2. **Handle Missing Fields:**

   ```python
   # Robust data extraction
   device_name = item.get("device_name", "Unknown Device")
   intended_use = item.get("statement_or_summary", "No description available")
   ```

3. **Validate Data Quality:**

   ```python
   def validate_fda_result(result: FDASearchResult) -> bool:
       return (
           result.k_number and
           result.device_name and
           len(result.k_number) >= 7  # K-numbers are at least 7 characters
       )

   # Filter valid results
   valid_results = [r for r in results if validate_fda_result(r)]
   ```

## Monitoring and Debugging

### Enable Debug Logging

```python
import logging

# Enable detailed logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger("services.openfda")
logger.setLevel(logging.DEBUG)
```

### Custom Monitoring

```python
import time
from datetime import datetime

class FDAAPIMonitor:
    def __init__(self):
        self.request_count = 0
        self.error_count = 0
        self.total_response_time = 0

    async def monitor_request(self, func, *args, **kwargs):
        start_time = time.time()
        try:
            result = await func(*args, **kwargs)
            self.request_count += 1
            return result
        except Exception as e:
            self.error_count += 1
            raise
        finally:
            self.total_response_time += time.time() - start_time

    def get_stats(self):
        avg_response_time = (
            self.total_response_time / self.request_count
            if self.request_count > 0 else 0
        )
        return {
            "requests": self.request_count,
            "errors": self.error_count,
            "error_rate": self.error_count / max(self.request_count, 1),
            "avg_response_time": avg_response_time
        }
```

### Health Check Endpoint

```python
from fastapi import FastAPI

app = FastAPI()

@app.get("/health/fda-api")
async def fda_api_health():
    service = await create_production_openfda_service()
    try:
        health = await service.health_check()
        return health
    finally:
        await service.close()
```

## Emergency Procedures

### Complete Service Reset

```bash
# 1. Stop all services
pkill -f "uvicorn main:app"

# 2. Clear cache
redis-cli FLUSHDB

# 3. Reset environment
unset FDA_API_KEY
export USE_REAL_FDA_API=false

# 4. Restart with mock service
poetry run uvicorn main:app --reload
```

### Fallback to Mock Service

```python
# In case of complete FDA API failure
import os
os.environ["USE_REAL_FDA_API"] = "false"

# Service will automatically use mock data
service = await create_production_openfda_service()
```

### Contact Information

- **FDA API Support**: https://open.fda.gov/contact/
- **System Administrator**: [Your contact information]
- **Emergency Escalation**: [Emergency contact]

## Preventive Measures

1. **Regular Health Checks**: Implement automated health monitoring
2. **Cache Warming**: Pre-populate cache with common queries
3. **Rate Limit Monitoring**: Track API usage patterns
4. **Error Rate Alerts**: Set up alerts for high error rates
5. **Performance Baselines**: Establish performance benchmarks
6. **Backup Strategies**: Implement fallback mechanisms

This troubleshooting guide should help resolve most FDA API integration issues. For persistent problems, enable debug logging and contact the system administrator with detailed error information.
