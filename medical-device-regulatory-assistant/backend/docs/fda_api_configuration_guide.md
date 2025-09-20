# FDA API Configuration Guide

## Overview

This guide provides detailed documentation for all FDA API configuration options in the Medical Device Regulatory Assistant. It covers environment variables, service parameters, performance tuning, and deployment-specific configurations.

## Table of Contents

1. [Environment Variables](#environment-variables)
2. [Service Configuration](#service-configuration)
3. [Performance Tuning](#performance-tuning)
4. [Security Configuration](#security-configuration)
5. [Caching Configuration](#caching-configuration)
6. [Monitoring Configuration](#monitoring-configuration)
7. [Development vs Production](#development-vs-production)
8. [Docker Configuration](#docker-configuration)
9. [Kubernetes Configuration](#kubernetes-configuration)

## Environment Variables

### Core FDA API Configuration

#### `FDA_API_KEY`

- **Type**: String
- **Required**: Optional (recommended for production)
- **Default**: None
- **Description**: FDA API key for authenticated requests
- **Rate Limits**:
  - With key: 240 requests/minute
  - Without key: 40 requests/minute
- **Example**: `FDA_API_KEY=your-fda-api-key-here`
- **Security**: Sensitive - store securely

```bash
# Development
export FDA_API_KEY="your-development-key"

# Production (use secrets management)
export FDA_API_KEY_FILE="/run/secrets/fda_api_key"
```

#### `USE_REAL_FDA_API`

- **Type**: Boolean
- **Required**: No
- **Default**: `false`
- **Description**: Enable real FDA API integration vs mock service
- **Values**: `true`, `false`
- **Example**: `USE_REAL_FDA_API=true`

```bash
# Enable real API
export USE_REAL_FDA_API=true

# Use mock service (default)
export USE_REAL_FDA_API=false
```

### Cache Configuration

#### `REDIS_URL`

- **Type**: String (URL)
- **Required**: Optional (recommended for production)
- **Default**: None (no caching)
- **Description**: Redis connection URL for caching
- **Format**: `redis://[username:password@]host:port[/db]`
- **Examples**:

  ```bash
  # Local Redis
  export REDIS_URL="redis://localhost:6379"

  # Redis with authentication
  export REDIS_URL="redis://user:password@redis.example.com:6379/0"

  # Redis Cluster
  export REDIS_URL="redis://redis-cluster.example.com:6379"

  # Redis with SSL
  export REDIS_URL="rediss://redis.example.com:6380"
  ```

#### `CACHE_TTL`

- **Type**: Integer (seconds)
- **Required**: No
- **Default**: `3600` (1 hour)
- **Description**: Cache time-to-live in seconds
- **Range**: 300-86400 (5 minutes to 24 hours)
- **Example**: `CACHE_TTL=7200`

```bash
# Short cache (15 minutes)
export CACHE_TTL=900

# Long cache (4 hours)
export CACHE_TTL=14400
```

### Rate Limiting Configuration

#### `RATE_LIMIT_REQUESTS`

- **Type**: Integer
- **Required**: No
- **Default**: `240` (with API key) or `40` (without)
- **Description**: Maximum requests per minute
- **FDA Limits**:
  - With API key: 240/minute
  - Without API key: 40/minute
- **Example**: `RATE_LIMIT_REQUESTS=240`

```bash
# Conservative rate limiting
export RATE_LIMIT_REQUESTS=200

# Maximum rate (with API key)
export RATE_LIMIT_REQUESTS=240
```

### Network Configuration

#### `FDA_API_TIMEOUT`

- **Type**: Integer (seconds)
- **Required**: No
- **Default**: `30`
- **Description**: HTTP request timeout
- **Range**: 10-120 seconds
- **Example**: `FDA_API_TIMEOUT=60`

#### `FDA_API_MAX_RETRIES`

- **Type**: Integer
- **Required**: No
- **Default**: `3`
- **Description**: Maximum retry attempts for failed requests
- **Range**: 0-10
- **Example**: `FDA_API_MAX_RETRIES=5`

#### `FDA_API_BASE_URL`

- **Type**: String (URL)
- **Required**: No
- **Default**: `https://api.fda.gov`
- **Description**: FDA API base URL (for testing or proxies)
- **Example**: `FDA_API_BASE_URL=https://api.fda.gov`

### Circuit Breaker Configuration

#### `CIRCUIT_BREAKER_FAILURE_THRESHOLD`

- **Type**: Integer
- **Required**: No
- **Default**: `5`
- **Description**: Number of failures before opening circuit
- **Range**: 3-20
- **Example**: `CIRCUIT_BREAKER_FAILURE_THRESHOLD=10`

#### `CIRCUIT_BREAKER_RECOVERY_TIMEOUT`

- **Type**: Integer (seconds)
- **Required**: No
- **Default**: `60`
- **Description**: Time to wait before attempting recovery
- **Range**: 30-300 seconds
- **Example**: `CIRCUIT_BREAKER_RECOVERY_TIMEOUT=120`

### Logging Configuration

#### `FDA_API_LOG_LEVEL`

- **Type**: String
- **Required**: No
- **Default**: `INFO`
- **Description**: Logging level for FDA API operations
- **Values**: `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`
- **Example**: `FDA_API_LOG_LEVEL=DEBUG`

```bash
# Detailed debugging
export FDA_API_LOG_LEVEL=DEBUG

# Production logging
export FDA_API_LOG_LEVEL=WARNING
```

## Service Configuration

### Basic Service Configuration

```python
from services.openfda import OpenFDAService

# Minimal configuration
service = OpenFDAService()

# Full configuration
service = OpenFDAService(
    api_key="your-api-key",
    redis_client=redis_client,
    cache_ttl=3600,
    max_retries=3,
    timeout=30,
    http_client=custom_client
)
```

### Advanced Service Configuration

```python
import httpx
import redis.asyncio as redis
from services.openfda import OpenFDAService, AsyncRateLimiter, CircuitBreaker

# Custom HTTP client
http_client = httpx.AsyncClient(
    timeout=httpx.Timeout(60.0),
    limits=httpx.Limits(
        max_keepalive_connections=20,
        max_connections=50,
        keepalive_expiry=30
    ),
    headers={
        "User-Agent": "MedicalDeviceAssistant/1.0"
    }
)

# Custom rate limiter
rate_limiter = AsyncRateLimiter(
    max_requests=240,
    time_window=60
)

# Custom circuit breaker
circuit_breaker = CircuitBreaker(
    failure_threshold=10,
    recovery_timeout=120
)

# Redis client with custom configuration
redis_client = redis.from_url(
    "redis://localhost:6379",
    encoding="utf-8",
    decode_responses=True,
    socket_timeout=5,
    socket_connect_timeout=5,
    retry_on_timeout=True,
    max_connections=20
)

# Fully configured service
service = OpenFDAService(
    api_key=os.getenv("FDA_API_KEY"),
    redis_client=redis_client,
    cache_ttl=7200,
    max_retries=5,
    timeout=60,
    http_client=http_client
)
service.rate_limiter = rate_limiter
service.circuit_breaker = circuit_breaker
```

## Performance Tuning

### Connection Pool Configuration

```python
import httpx

# High-performance connection pool
http_client = httpx.AsyncClient(
    timeout=httpx.Timeout(
        connect=10.0,    # Connection timeout
        read=30.0,       # Read timeout
        write=10.0,      # Write timeout
        pool=5.0         # Pool timeout
    ),
    limits=httpx.Limits(
        max_keepalive_connections=50,  # Keep-alive connections
        max_connections=100,           # Total connections
        keepalive_expiry=60           # Keep-alive expiry
    ),
    http2=True  # Enable HTTP/2 for better performance
)
```

### Cache Optimization

```python
# Redis configuration for performance
redis_client = redis.from_url(
    "redis://localhost:6379",
    encoding="utf-8",
    decode_responses=True,
    socket_timeout=2,
    socket_connect_timeout=2,
    retry_on_timeout=True,
    max_connections=50,
    connection_pool_kwargs={
        "max_connections": 50,
        "retry_on_timeout": True
    }
)

# Cache configuration
service = OpenFDAService(
    redis_client=redis_client,
    cache_ttl=14400,  # 4 hours for better hit rate
)
```

### Rate Limiting Optimization

```python
# Optimized rate limiter for high throughput
rate_limiter = AsyncRateLimiter(
    max_requests=230,  # Slightly below FDA limit for safety
    time_window=60
)

# Batch processing configuration
async def batch_process_searches(search_terms_list, batch_size=10):
    results = []
    for i in range(0, len(search_terms_list), batch_size):
        batch = search_terms_list[i:i + batch_size]
        batch_tasks = [
            service.search_predicates(terms)
            for terms in batch
        ]
        batch_results = await asyncio.gather(*batch_tasks)
        results.extend(batch_results)
    return results
```

## Security Configuration

### API Key Management

```bash
# Environment variable (development)
export FDA_API_KEY="your-api-key"

# File-based (production)
echo "your-api-key" > /etc/secrets/fda_api_key
chmod 600 /etc/secrets/fda_api_key
export FDA_API_KEY_FILE="/etc/secrets/fda_api_key"
```

```python
# Secure API key loading
import os

def load_api_key():
    # Try file-based first (more secure)
    key_file = os.getenv("FDA_API_KEY_FILE")
    if key_file and os.path.exists(key_file):
        with open(key_file, 'r') as f:
            return f.read().strip()

    # Fallback to environment variable
    return os.getenv("FDA_API_KEY")

api_key = load_api_key()
```

### Network Security

```python
# SSL/TLS configuration
import ssl
import httpx

# Custom SSL context
ssl_context = ssl.create_default_context()
ssl_context.check_hostname = True
ssl_context.verify_mode = ssl.CERT_REQUIRED

http_client = httpx.AsyncClient(
    verify=ssl_context,
    cert=("/path/to/client.crt", "/path/to/client.key")  # Client certificates if needed
)
```

### Proxy Configuration

```python
# Corporate proxy configuration
proxies = {
    "http://": "http://proxy.company.com:8080",
    "https://": "http://proxy.company.com:8080"
}

http_client = httpx.AsyncClient(
    proxies=proxies,
    auth=("proxy_user", "proxy_pass")  # If proxy requires auth
)
```

## Caching Configuration

### Redis Configuration Options

```bash
# Basic Redis configuration
REDIS_URL=redis://localhost:6379

# Redis with database selection
REDIS_URL=redis://localhost:6379/1

# Redis with authentication
REDIS_URL=redis://user:password@localhost:6379

# Redis Sentinel (high availability)
REDIS_SENTINEL_HOSTS=sentinel1:26379,sentinel2:26379,sentinel3:26379
REDIS_SENTINEL_SERVICE=mymaster

# Redis Cluster
REDIS_CLUSTER_NODES=node1:7000,node2:7000,node3:7000
```

### Cache Strategy Configuration

```python
# Cache configuration for different environments
cache_configs = {
    "development": {
        "ttl": 1800,      # 30 minutes
        "max_memory": "100mb"
    },
    "staging": {
        "ttl": 3600,      # 1 hour
        "max_memory": "500mb"
    },
    "production": {
        "ttl": 7200,      # 2 hours
        "max_memory": "2gb"
    }
}

# Environment-specific cache TTL
env = os.getenv("ENVIRONMENT", "development")
cache_ttl = cache_configs[env]["ttl"]
```

### Cache Key Strategies

```python
# Custom cache key generation
class CustomCacheKeyGenerator:
    def __init__(self, prefix="fda_api"):
        self.prefix = prefix

    def generate_key(self, endpoint, params, user_id=None):
        # Include user context in cache key if needed
        key_parts = [self.prefix, endpoint]

        if user_id:
            key_parts.append(f"user:{user_id}")

        # Sort params for consistent keys
        sorted_params = sorted(params.items())
        param_string = urlencode(sorted_params)
        key_parts.append(hashlib.md5(param_string.encode()).hexdigest())

        return ":".join(key_parts)
```

## Monitoring Configuration

### Health Check Configuration

```python
# Health check intervals
HEALTH_CHECK_INTERVAL = 60  # seconds
HEALTH_CHECK_TIMEOUT = 10   # seconds

# Health check thresholds
RESPONSE_TIME_WARNING = 5.0    # seconds
RESPONSE_TIME_CRITICAL = 10.0  # seconds
ERROR_RATE_WARNING = 0.05      # 5%
ERROR_RATE_CRITICAL = 0.10     # 10%
```

### Metrics Configuration

```python
# Prometheus metrics configuration
from prometheus_client import Counter, Histogram, Gauge

# FDA API metrics
fda_requests_total = Counter(
    'fda_api_requests_total',
    'Total FDA API requests',
    ['endpoint', 'status', 'method']
)

fda_request_duration = Histogram(
    'fda_api_request_duration_seconds',
    'FDA API request duration',
    ['endpoint']
)

fda_cache_hits = Counter(
    'fda_api_cache_hits_total',
    'FDA API cache hits',
    ['endpoint']
)

fda_circuit_breaker_state = Gauge(
    'fda_api_circuit_breaker_state',
    'FDA API circuit breaker state (0=closed, 1=open, 2=half-open)'
)
```

### Logging Configuration

```python
import logging
import structlog

# Structured logging configuration
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    wrapper_class=structlog.stdlib.BoundLogger,
    cache_logger_on_first_use=True,
)

# FDA API logger
fda_logger = structlog.get_logger("services.openfda")
```

## Development vs Production

### Development Configuration

```bash
# .env.development
FDA_API_KEY=development-key
USE_REAL_FDA_API=false
REDIS_URL=redis://localhost:6379
CACHE_TTL=900
FDA_API_LOG_LEVEL=DEBUG
RATE_LIMIT_REQUESTS=40
FDA_API_TIMEOUT=30
FDA_API_MAX_RETRIES=3
```

```python
# Development service configuration
async def create_development_service():
    return OpenFDAService(
        api_key=os.getenv("FDA_API_KEY"),
        cache_ttl=900,  # 15 minutes
        max_retries=3,
        timeout=30
    )
```

### Production Configuration

```bash
# .env.production
FDA_API_KEY_FILE=/run/secrets/fda_api_key
USE_REAL_FDA_API=true
REDIS_URL=redis://redis-cluster:6379
CACHE_TTL=7200
FDA_API_LOG_LEVEL=WARNING
RATE_LIMIT_REQUESTS=240
FDA_API_TIMEOUT=60
FDA_API_MAX_RETRIES=5
CIRCUIT_BREAKER_FAILURE_THRESHOLD=10
CIRCUIT_BREAKER_RECOVERY_TIMEOUT=120
```

```python
# Production service configuration
async def create_production_service():
    # Load API key from file
    api_key = None
    key_file = os.getenv("FDA_API_KEY_FILE")
    if key_file:
        with open(key_file, 'r') as f:
            api_key = f.read().strip()

    # Redis with connection pooling
    redis_client = redis.from_url(
        os.getenv("REDIS_URL"),
        max_connections=50,
        retry_on_timeout=True
    )

    # High-performance HTTP client
    http_client = httpx.AsyncClient(
        timeout=httpx.Timeout(60.0),
        limits=httpx.Limits(
            max_keepalive_connections=50,
            max_connections=100
        )
    )

    return OpenFDAService(
        api_key=api_key,
        redis_client=redis_client,
        cache_ttl=7200,  # 2 hours
        max_retries=5,
        timeout=60,
        http_client=http_client
    )
```

## Docker Configuration

### Dockerfile Configuration

```dockerfile
# Dockerfile
FROM python:3.11-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV FDA_API_KEY_FILE=/run/secrets/fda_api_key
ENV USE_REAL_FDA_API=true
ENV REDIS_URL=redis://redis:6379
ENV CACHE_TTL=7200

# Copy application
COPY . /app
WORKDIR /app

# Install Python dependencies
RUN pip install poetry
RUN poetry install --no-dev

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health/fda-api || exit 1

# Run application
CMD ["poetry", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '8000:8000'
    environment:
      - USE_REAL_FDA_API=true
      - REDIS_URL=redis://redis:6379
      - CACHE_TTL=7200
      - FDA_API_LOG_LEVEL=INFO
    secrets:
      - fda_api_key
    depends_on:
      - redis
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:8000/health/fda-api']
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    command: redis-server --maxmemory 1gb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 3

secrets:
  fda_api_key:
    file: ./secrets/fda_api_key.txt

volumes:
  redis_data:
```

## Kubernetes Configuration

### ConfigMap

```yaml
# fda-api-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fda-api-config
data:
  USE_REAL_FDA_API: 'true'
  REDIS_URL: 'redis://redis-service:6379'
  CACHE_TTL: '7200'
  FDA_API_LOG_LEVEL: 'INFO'
  RATE_LIMIT_REQUESTS: '240'
  FDA_API_TIMEOUT: '60'
  FDA_API_MAX_RETRIES: '5'
  CIRCUIT_BREAKER_FAILURE_THRESHOLD: '10'
  CIRCUIT_BREAKER_RECOVERY_TIMEOUT: '120'
```

### Secret

```yaml
# fda-api-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: fda-api-secret
type: Opaque
data:
  fda-api-key: <base64-encoded-api-key>
```

### Deployment

```yaml
# fda-api-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: medical-device-assistant
spec:
  replicas: 3
  selector:
    matchLabels:
      app: medical-device-assistant
  template:
    metadata:
      labels:
        app: medical-device-assistant
    spec:
      containers:
        - name: app
          image: medical-device-assistant:latest
          ports:
            - containerPort: 8000
          envFrom:
            - configMapRef:
                name: fda-api-config
          env:
            - name: FDA_API_KEY
              valueFrom:
                secretKeyRef:
                  name: fda-api-secret
                  key: fda-api-key
          livenessProbe:
            httpGet:
              path: /health/fda-api
              port: 8000
            initialDelaySeconds: 30
            periodSeconds: 30
          readinessProbe:
            httpGet:
              path: /health/fda-api
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 10
          resources:
            requests:
              memory: '256Mi'
              cpu: '250m'
            limits:
              memory: '512Mi'
              cpu: '500m'
```

## Configuration Validation

### Validation Script

```python
# validate_config.py
import os
import asyncio
from services.openfda import create_production_openfda_service

async def validate_configuration():
    """Validate FDA API configuration"""
    print("Validating FDA API configuration...")

    # Check required environment variables
    required_vars = ["USE_REAL_FDA_API"]
    optional_vars = ["FDA_API_KEY", "REDIS_URL", "CACHE_TTL"]

    print("\nEnvironment Variables:")
    for var in required_vars + optional_vars:
        value = os.getenv(var)
        status = "✓" if value else "✗"
        required = "Required" if var in required_vars else "Optional"
        print(f"  {status} {var}: {value or 'Not set'} ({required})")

    # Test service creation
    try:
        service = await create_production_openfda_service()
        print("\n✓ Service creation successful")

        # Test configuration validation
        validation = await service.validate_api_configuration()
        print(f"\n✓ API Key Configured: {validation['api_key_configured']}")
        print(f"✓ Base URL Accessible: {validation['base_url_accessible']}")
        print(f"✓ Cache Configured: {validation['cache_configured']}")

        if validation['errors']:
            print("\nErrors:")
            for error in validation['errors']:
                print(f"  ✗ {error}")

        if validation['warnings']:
            print("\nWarnings:")
            for warning in validation['warnings']:
                print(f"  ⚠ {warning}")

        # Test health check
        health = await service.health_check()
        print(f"\n✓ Health Status: {health['status']}")

        await service.close()

    except Exception as e:
        print(f"\n✗ Configuration validation failed: {e}")
        return False

    print("\n✓ Configuration validation completed successfully")
    return True

if __name__ == "__main__":
    asyncio.run(validate_configuration())
```

Run validation:

```bash
cd medical-device-regulatory-assistant/backend
poetry run python validate_config.py
```

This configuration guide provides comprehensive documentation for all FDA API configuration options, from basic setup to advanced production deployments.
