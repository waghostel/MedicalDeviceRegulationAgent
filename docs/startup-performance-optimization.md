# Startup Performance Optimization Guide

## Overview

This guide provides strategies and tools for optimizing the startup performance of the Medical Device Regulatory Assistant. The goal is to reduce startup time from 8+ seconds to under 5 seconds while maintaining reliability.

## Current Performance Baseline

### Typical Startup Times (Before Optimization)
- **Backend**: 6-8 seconds
- **Frontend**: 4-6 seconds  
- **Total**: 8-12 seconds
- **Memory Usage**: 150-200MB

### Performance Targets (After Optimization)
- **Backend**: < 3 seconds
- **Frontend**: < 2 seconds
- **Total**: < 5 seconds
- **Memory Usage**: < 150MB

## Optimization Strategies

### 1. Parallel Service Initialization

#### Before (Sequential)
```
Database Init → Redis Init → FDA API Init → App Start
   2s      →     3s     →      1s      →    2s    = 8s
```

#### After (Parallel)
```
Database Init ┐
Redis Init    ├─→ App Start
FDA API Init  ┘
   2s max     →     1s     = 3s
```

#### Implementation
```python
# main.py - Optimized lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize services in parallel
    tasks = []
    
    # Database (critical - must complete)
    tasks.append(init_database())
    
    # Optional services (can fail gracefully)
    tasks.append(init_redis_optional())
    tasks.append(init_fda_service_optional())
    
    # Wait for all with timeout
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Handle results...
    yield
```

### 2. Lazy Loading and Import Optimization

#### Heavy Import Analysis
```python
# Identify slow imports
import time

def time_import(module_name):
    start = time.time()
    __import__(module_name)
    return (time.time() - start) * 1000

# Results:
# fastapi: 150ms
# uvicorn: 200ms
# aiosqlite: 50ms
# redis: 100ms
# httpx: 80ms
```

#### Optimization Techniques
```python
# 1. Lazy imports inside functions
def get_fda_service():
    from services.openfda import OpenFDAService  # Import when needed
    return OpenFDAService()

# 2. Optional imports with fallbacks
try:
    import redis.asyncio as redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

# 3. Conditional imports based on environment
if os.getenv("ENABLE_REDIS", "false").lower() == "true":
    from services.cache import init_redis
```

### 3. Database Optimization

#### Connection Settings
```python
# Optimized SQLite settings
await connection.execute("PRAGMA journal_mode = WAL")
await connection.execute("PRAGMA synchronous = NORMAL")  # Instead of FULL
await connection.execute("PRAGMA cache_size = 2000")     # Increased cache
await connection.execute("PRAGMA temp_store = MEMORY")
await connection.execute("PRAGMA mmap_size = 268435456") # 256MB mmap
```

#### Schema Optimization
```sql
-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_agent_interactions_project_id ON agent_interactions(project_id);
```

### 4. Service Health Check Optimization

#### Fast Health Checks
```python
class OptimizedHealthCheck:
    def __init__(self):
        self.cache_ttl = 5  # Cache results for 5 seconds
        self.last_check = {}
    
    async def quick_health_check(self):
        """Lightweight health check for startup"""
        checks = {
            "database": self._quick_db_check(),
            "memory": self._quick_memory_check()
        }
        
        # Skip slow checks during startup
        if not os.getenv("SKIP_HEALTH_CHECKS"):
            checks["fda_api"] = self._quick_fda_check()
        
        return await asyncio.gather(*checks.values())
```

### 5. Environment-Based Optimization

#### Development Mode Optimizations
```bash
# .env.development
UVICORN_LOG_LEVEL=warning
DISABLE_TELEMETRY=true
SKIP_HEALTH_CHECKS=true
DISABLE_REDIS=true
FAST_STARTUP=true
```

#### Production Mode Settings
```bash
# .env.production
UVICORN_LOG_LEVEL=info
ENABLE_REDIS=true
SKIP_HEALTH_CHECKS=false
FAST_STARTUP=false
```

## Optimized Startup Scripts

### Backend Optimization

#### start-backend-optimized.ps1
```powershell
# Set performance environment variables
$env:PYTHONPATH = "."
$env:UVICORN_LOG_LEVEL = "warning"
$env:DISABLE_REDIS = "true"  # For development
$env:SKIP_HEALTH_CHECKS = "true"

# Start with optimized settings
poetry run uvicorn main:app `
    --host 0.0.0.0 `
    --port 8000 `
    --reload `
    --log-level warning `
    --access-log `
    --reload-exclude "*.log" `
    --reload-exclude "*.db*"
```

### Frontend Optimization

#### start-frontend-optimized.ps1
```powershell
# Set performance environment variables
$env:NODE_ENV = "development"
$env:NEXT_TELEMETRY_DISABLED = "1"
$env:NEXT_WEBPACK_USEPOLLING = "false"

# Start with optimized settings
pnpm dev --port 3000 --turbo
```

### Combined Optimized Startup

#### start-dev-optimized.ps1
- Parallel service startup
- Progress indicators
- Performance timing
- Fast mode option
- Verbose mode option
- Service-specific startup options

## Performance Monitoring

### Startup Performance Metrics

```python
class StartupMetrics:
    def __init__(self):
        self.start_time = time.time()
        self.milestones = {}
    
    def record_milestone(self, name: str):
        elapsed = (time.time() - self.start_time) * 1000
        self.milestones[name] = elapsed
        print(f"✅ {name}: {elapsed:.1f}ms")
    
    def get_summary(self):
        total_time = (time.time() - self.start_time) * 1000
        return {
            "total_time_ms": total_time,
            "milestones": self.milestones,
            "performance_rating": self._get_rating(total_time)
        }
```

### Automated Performance Testing

```python
# test_startup_performance.py
def test_startup_performance():
    """Test that startup completes within target time"""
    start_time = time.time()
    
    # Start server
    process = subprocess.Popen([...])
    
    # Wait for ready
    wait_for_server_ready("http://localhost:8000/health")
    
    startup_time = (time.time() - start_time) * 1000
    
    # Assert performance target
    assert startup_time < 5000, f"Startup took {startup_time}ms (target: <5000ms)"
    
    process.terminate()
```

## Troubleshooting Slow Startup

### Common Bottlenecks

#### 1. Database Initialization
**Symptoms**: Long pause during "Database connection established"
**Solutions**:
- Check database file permissions
- Optimize SQLite settings
- Use WAL mode instead of DELETE mode
- Increase cache size

#### 2. Redis Connection Timeout
**Symptoms**: 4+ second delay with Redis connection errors
**Solutions**:
- Disable Redis for development: `DISABLE_REDIS=true`
- Install Redis locally
- Reduce Redis connection timeout
- Make Redis truly optional

#### 3. FDA API Health Check
**Symptoms**: Delay during health check phase
**Solutions**:
- Skip FDA API check during startup: `SKIP_HEALTH_CHECKS=true`
- Reduce FDA API timeout
- Make health checks asynchronous

#### 4. Heavy Imports
**Symptoms**: Long pause before any output
**Solutions**:
- Profile import times
- Use lazy imports
- Split heavy modules
- Use conditional imports

### Diagnostic Tools

#### 1. Import Profiler
```python
# profile_imports.py
import time
import sys

class ImportProfiler:
    def __init__(self):
        self.import_times = {}
        self.original_import = __builtins__.__import__
        __builtins__.__import__ = self.timed_import
    
    def timed_import(self, name, *args, **kwargs):
        start = time.time()
        result = self.original_import(name, *args, **kwargs)
        duration = (time.time() - start) * 1000
        self.import_times[name] = duration
        return result
```

#### 2. Startup Tracer
```python
# startup_tracer.py
import functools
import time

def trace_startup(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        duration = (time.time() - start) * 1000
        print(f"⏱️  {func.__name__}: {duration:.1f}ms")
        return result
    return wrapper
```

## Performance Benchmarks

### Target Benchmarks

| Component | Current | Target | Optimized |
|-----------|---------|--------|-----------|
| Import Time | 500ms | 200ms | 150ms |
| Database Init | 2000ms | 500ms | 300ms |
| Service Init | 3000ms | 1000ms | 500ms |
| Health Checks | 2000ms | 500ms | 100ms |
| **Total** | **8000ms** | **5000ms** | **3000ms** |

### Memory Usage Targets

| Component | Current | Target | Optimized |
|-----------|---------|--------|-----------|
| Base Python | 30MB | 30MB | 30MB |
| FastAPI | 40MB | 35MB | 30MB |
| Dependencies | 80MB | 60MB | 50MB |
| Application | 50MB | 40MB | 30MB |
| **Total** | **200MB** | **165MB** | **140MB** |

## Implementation Checklist

### Phase 1: Quick Wins (< 1 hour)
- [ ] Add fast startup mode to scripts
- [ ] Disable Redis for development
- [ ] Skip health checks during startup
- [ ] Reduce log verbosity
- [ ] Add progress indicators

### Phase 2: Service Optimization (2-4 hours)
- [ ] Implement parallel service initialization
- [ ] Optimize database connection settings
- [ ] Make Redis truly optional
- [ ] Implement lazy imports for heavy modules
- [ ] Add startup performance monitoring

### Phase 3: Advanced Optimization (4-8 hours)
- [ ] Profile and optimize import times
- [ ] Implement service health check caching
- [ ] Add startup performance tests
- [ ] Create environment-specific configurations
- [ ] Implement automatic port conflict detection

### Phase 4: Monitoring and Maintenance (2-4 hours)
- [ ] Add performance regression tests
- [ ] Create startup performance dashboard
- [ ] Implement automated performance alerts
- [ ] Document performance troubleshooting
- [ ] Create performance optimization playbook

## Measuring Success

### Key Performance Indicators (KPIs)
- **Startup Time**: < 5 seconds (target: < 3 seconds)
- **Memory Usage**: < 150MB (target: < 140MB)
- **Time to First Request**: < 6 seconds total
- **Developer Experience**: Consistent startup times
- **Reliability**: 99%+ successful startups

### Monitoring Tools
- Startup performance tests in CI/CD
- Performance regression detection
- Memory usage monitoring
- Startup success rate tracking
- Developer feedback collection

This optimization guide provides a comprehensive approach to reducing startup time while maintaining system reliability and developer experience.