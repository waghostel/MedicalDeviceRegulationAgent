# FDA API Integration Guide

## Overview

This guide provides comprehensive documentation for integrating with the FDA's openFDA API in the Medical Device Regulatory Assistant. The integration supports predicate device searches, device classification lookups, and adverse event monitoring with production-ready features including rate limiting, caching, circuit breakers, and comprehensive error handling.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Configuration](#configuration)
3. [API Features](#api-features)
4. [Rate Limiting](#rate-limiting)
5. [Caching Strategy](#caching-strategy)
6. [Error Handling](#error-handling)
7. [Circuit Breaker Pattern](#circuit-breaker-pattern)
8. [Performance Optimization](#performance-optimization)
9. [Security Considerations](#security-considerations)
10. [Monitoring and Logging](#monitoring-and-logging)

## Quick Start

### Basic Setup

```python
from services.openfda import create_openfda_service

# Create service with minimal configuration
service = await create_openfda_service()

# Search for predicate devices
results = await service.search_predicates(
    search_terms=["cardiac pacemaker"],
    product_code="DXX",
    limit=10
)

# Get device details
device = await service.get_device_details("K123456")
```

### Production Setup

```python
import os
from services.openfda import create_production_openfda_service

# Create production service with full configuration
service = await create_production_openfda_service()

# Validate configuration
validation = await service.validate_api_configuration()
if validation["errors"]:
    print(f"Configuration errors: {validation['errors']}")
```

## Configuration

### Environment Variables

#### Required Configuration

```bash
# FDA API Configuration
FDA_API_KEY=your-fda-api-key-here          # Recommended for production
USE_REAL_FDA_API=true                      # Enable real API integration

# Redis Cache Configuration (Optional but recommended)
REDIS_URL=redis://localhost:6379           # For caching and performance
```

#### Optional Configuration

```bash
# Logging Configuration
LOG_LEVEL=INFO                             # DEBUG, INFO, WARNING, ERROR, CRITICAL

# Performance Tuning
RATE_LIMIT_REQUESTS=240                    # FDA API limit: 240/minute
CACHE_TTL=3600                            # Cache time-to-live in seconds
```

### Service Configuration Options

```python
service = OpenFDAService(
    api_key="your-api-key",                # FDA API key (optional but recommended)
    redis_client=redis_client,             # Redis client for caching
    cache_ttl=3600,                        # Cache TTL in seconds (default: 1 hour)
    max_retries=3,                         # Maximum retry attempts
    timeout=30,                            # Request timeout in seconds
    http_client=custom_client              # Custom HTTP client (for testing)
)
```

## API Features

### 1. Predicate Device Search

Search for predicate devices using multiple criteria:

```python
# Basic search
results = await service.search_predicates(
    search_terms=["cardiac", "pacemaker"],
    product_code="DXX",
    device_class="II",
    limit=50
)

# Advanced search with pagination
results = await service.search_predicates(
    search_terms=["implantable cardioverter defibrillator"],
    product_code="MKJ",
    limit=100,
    skip=50  # For pagination
)
```

**Search Parameters:**
- `search_terms`: List of keywords for device name and intended use
- `product_code`: FDA product code filter (e.g., "DXX", "MKJ")
- `device_class`: Device class filter ("I", "II", "III")
- `limit`: Maximum results (1-1000, default: 100)
- `skip`: Results to skip for pagination

### 2. Device Classification Lookup

Look up device classification information:

```python
# By product code
classifications = await service.lookup_device_classification(
    product_code="DXX"
)

# By device name
classifications = await service.lookup_device_classification(
    device_name="cardiac pacemaker"
)

# By regulation number
classifications = await service.lookup_device_classification(
    regulation_number="870.3610"
)
```

### 3. Device Details Retrieval

Get detailed information for specific K-numbers:

```python
# Get device details
device = await service.get_device_details("K123456")

if device:
    print(f"Device: {device.device_name}")
    print(f"Intended Use: {device.intended_use}")
    print(f"Clearance Date: {device.clearance_date}")
```

### 4. Adverse Event Monitoring

Search for adverse events related to devices:

```python
# Search adverse events
events = await service.search_adverse_events(
    product_code="DXX",
    device_name="pacemaker",
    date_from="2023-01-01",
    date_to="2023-12-31",
    limit=100
)
```

## Rate Limiting

The FDA API has strict rate limits: **240 requests per minute**. Our service implements automatic rate limiting:

### Rate Limiter Features

- **Automatic Throttling**: Requests are automatically delayed to stay within limits
- **Request Queue**: Requests are queued when rate limit is reached
- **Exponential Backoff**: Failed requests use exponential backoff strategy
- **Rate Limit Headers**: Respects `Retry-After` headers from FDA API

### Rate Limiting Configuration

```python
# Custom rate limiter configuration
from services.openfda import AsyncRateLimiter

rate_limiter = AsyncRateLimiter(
    max_requests=240,    # FDA limit: 240 requests
    time_window=60       # Per 60 seconds
)

service = OpenFDAService(rate_limiter=rate_limiter)
```

### Monitoring Rate Limits

```python
# Check current rate limit status
health = await service.health_check()
print(f"Current requests in window: {health['rate_limiter_requests']}")
```

## Caching Strategy

Caching significantly improves performance and reduces API usage:

### Cache Configuration

```python
import redis.asyncio as redis

# Redis cache setup
redis_client = redis.from_url("redis://localhost:6379")

service = OpenFDAService(
    redis_client=redis_client,
    cache_ttl=3600  # 1 hour cache
)
```

### Cache Key Strategy

Cache keys are generated using MD5 hashes of:
- API endpoint
- Query parameters (sorted for consistency)
- Request method

Example cache key: `openfda:a1b2c3d4e5f6...`

### Cache Behavior

- **Cache Hit**: Returns cached data immediately
- **Cache Miss**: Makes API request and caches result
- **Cache Expiration**: Configurable TTL (default: 1 hour)
- **Cache Errors**: Gracefully handled, doesn't break functionality

### Manual Cache Control

```python
# Bypass cache for fresh data
results = await service._make_request(
    "device/510k.json",
    params={"search": "device_class:II"},
    use_cache=False
)
```

## Error Handling

Comprehensive error handling for all failure scenarios:

### Error Types

```python
from services.openfda import (
    FDAAPIError,              # Base FDA API error
    RateLimitExceededError,   # Rate limit exceeded
    PredicateNotFoundError    # No results found
)

try:
    results = await service.search_predicates(["nonexistent device"])
except PredicateNotFoundError:
    print("No predicates found for search criteria")
except RateLimitExceededError as e:
    print(f"Rate limit exceeded: {e}")
except FDAAPIError as e:
    print(f"FDA API error: {e} (Status: {e.status_code})")
```

### HTTP Status Code Handling

| Status Code | Error Type | Description | Action |
|-------------|------------|-------------|---------|
| 200 | Success | Request successful | Return data |
| 401 | Authentication | Invalid API key | Check FDA_API_KEY |
| 403 | Forbidden | API key expired/invalid | Renew API key |
| 404 | Not Found | No data found | Return empty results |
| 429 | Rate Limited | Too many requests | Automatic retry with backoff |
| 500+ | Server Error | FDA server issues | Retry with exponential backoff |

### Retry Strategy

```python
# Automatic retry configuration
service = OpenFDAService(
    max_retries=3,           # Maximum retry attempts
    timeout=30               # Request timeout in seconds
)
```

**Retry Logic:**
1. **Network Errors**: Exponential backoff (2^attempt seconds)
2. **Rate Limits**: Respect `Retry-After` header
3. **Server Errors**: Exponential backoff up to max_retries
4. **Authentication Errors**: No retry (immediate failure)

## Circuit Breaker Pattern

Protects against cascading failures when FDA API is unavailable:

### Circuit Breaker States

1. **CLOSED**: Normal operation, requests pass through
2. **OPEN**: API is failing, requests are blocked
3. **HALF_OPEN**: Testing if API has recovered

### Configuration

```python
from services.openfda import CircuitBreaker

circuit_breaker = CircuitBreaker(
    failure_threshold=5,     # Open after 5 failures
    recovery_timeout=60      # Test recovery after 60 seconds
)

service = OpenFDAService(circuit_breaker=circuit_breaker)
```

### Circuit Breaker Monitoring

```python
# Check circuit breaker status
health = await service.health_check()
print(f"Circuit breaker state: {health['circuit_breaker_state']}")
```

## Performance Optimization

### Connection Pooling

```python
import httpx

# Custom HTTP client with connection pooling
http_client = httpx.AsyncClient(
    timeout=httpx.Timeout(30.0),
    limits=httpx.Limits(
        max_keepalive_connections=10,
        max_connections=20
    )
)

service = OpenFDAService(http_client=http_client)
```

### Batch Operations

```python
# Efficient batch processing
async def process_k_numbers(k_numbers: List[str]):
    tasks = []
    for k_number in k_numbers:
        task = service.get_device_details(k_number)
        tasks.append(task)
    
    # Process in parallel (respecting rate limits)
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return results
```

### Query Optimization

```python
# Optimized search queries
results = await service.search_predicates(
    search_terms=["specific", "device", "terms"],  # Use specific terms
    product_code="DXX",                            # Filter by product code
    device_class="II",                             # Filter by class
    limit=50                                       # Limit results
)
```

## Security Considerations

### API Key Management

```bash
# Environment variable (recommended)
export FDA_API_KEY="your-secure-api-key"

# Docker secrets (production)
docker run -e FDA_API_KEY_FILE=/run/secrets/fda_api_key myapp

# Kubernetes secrets (production)
kubectl create secret generic fda-api-key --from-literal=key=your-api-key
```

### Data Privacy

- **No PHI**: FDA API doesn't contain Protected Health Information
- **Public Data**: All FDA data is publicly available
- **Audit Logging**: All API requests are logged for compliance

### Network Security

```python
# HTTPS only (enforced by FDA API)
service = OpenFDAService(
    base_url="https://api.fda.gov"  # Always HTTPS
)

# Certificate verification (enabled by default)
import httpx
http_client = httpx.AsyncClient(verify=True)
```

## Monitoring and Logging

### Health Checks

```python
# Comprehensive health check
health = await service.health_check()

print(f"Status: {health['status']}")
print(f"Response Time: {health['response_time_seconds']}s")
print(f"Circuit Breaker: {health['circuit_breaker_state']}")
print(f"Rate Limiter: {health['rate_limiter_requests']}/240")
```

### Logging Configuration

```python
import logging

# Configure FDA API logging
logging.getLogger("services.openfda").setLevel(logging.INFO)

# Log levels:
# DEBUG: Detailed request/response information
# INFO: API calls and results
# WARNING: Rate limits and retries
# ERROR: API failures and errors
```

### Metrics Collection

```python
# Custom metrics integration
import time
from prometheus_client import Counter, Histogram

# Request metrics
fda_requests_total = Counter('fda_requests_total', 'Total FDA API requests', ['endpoint', 'status'])
fda_request_duration = Histogram('fda_request_duration_seconds', 'FDA API request duration')

# Usage in service
start_time = time.time()
try:
    result = await service.search_predicates(["device"])
    fda_requests_total.labels(endpoint='510k', status='success').inc()
finally:
    fda_request_duration.observe(time.time() - start_time)
```

### Error Tracking

```python
# Sentry integration for error tracking
import sentry_sdk

try:
    results = await service.search_predicates(["device"])
except FDAAPIError as e:
    sentry_sdk.capture_exception(e)
    # Handle error gracefully
```

## Best Practices

### 1. Service Initialization

```python
# Singleton pattern for service instance
class FDAServiceManager:
    _instance = None
    
    @classmethod
    async def get_instance(cls):
        if cls._instance is None:
            cls._instance = await create_production_openfda_service()
        return cls._instance
```

### 2. Error Handling

```python
# Graceful error handling
async def safe_predicate_search(search_terms: List[str]) -> List[FDASearchResult]:
    try:
        return await service.search_predicates(search_terms)
    except PredicateNotFoundError:
        return []  # Return empty list instead of error
    except FDAAPIError as e:
        logger.error(f"FDA API error: {e}")
        return []  # Graceful degradation
```

### 3. Resource Management

```python
# Proper resource cleanup
async def main():
    service = await create_openfda_service()
    try:
        # Use service
        results = await service.search_predicates(["device"])
    finally:
        # Always cleanup
        await service.close()
```

### 4. Testing

```python
# Mock service for testing
from unittest.mock import AsyncMock

# Create mock service
mock_service = AsyncMock(spec=OpenFDAService)
mock_service.search_predicates.return_value = [
    FDASearchResult(
        k_number="K123456",
        device_name="Test Device",
        intended_use="Test use",
        product_code="ABC",
        clearance_date="2023-01-01"
    )
]
```

## Troubleshooting

See [FDA API Troubleshooting Guide](./fda_api_troubleshooting_guide.md) for detailed troubleshooting information.

## Migration Guide

See [FDA API Migration Guide](./fda_api_migration_guide.md) for migrating from mock to real API.

## Performance Tuning

See [FDA API Performance Tuning Guide](./fda_api_performance_guide.md) for optimization strategies.

## Maintenance Procedures

See [FDA API Maintenance Guide](./fda_api_maintenance_guide.md) for regular maintenance tasks.