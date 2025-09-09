# Backend Health System Fix - Design Document

## Overview

This design document provides a comprehensive solution to fix the persistent database connection error in the Medical Device Regulatory Assistant backend. The core issue is an improper implementation of async context managers for SQLite database connections, which is causing the "'async_generator' object does not support the asynchronous context manager protocol" error.

## Architecture

### Root Cause Analysis

The error occurs because the current implementation attempts to use an async generator as an async context manager, which is not supported in Python. The issue is likely in one of these areas:

1. **Database Session Factory**: Incorrect async context manager implementation
2. **Dependency Injection**: FastAPI dependency that yields instead of returning a proper async context manager
3. **SQLite Async Library**: Incompatible or incorrectly configured async SQLite library
4. **Health Check Implementation**: Improper use of database sessions in health checks

### Solution Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI Application                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   Health    │  │  Database   │  │   Session   │         │
│  │   Check     │  │ Connection  │  │ Management  │         │
│  │  Service    │  │   Manager   │  │   Factory   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                 Database Layer (aiosqlite)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Connection  │  │ Transaction │  │   Query     │         │
│  │    Pool     │  │  Manager    │  │  Executor   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│                     SQLite Database                         │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Database Connection Manager

```python
# backend/database/connection.py
import aiosqlite
import asyncio
from typing import AsyncGenerator, Optional
from contextlib import asynccontextmanager
import logging

logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self, database_url: str):
        self.database_url = database_url
        self._connection: Optional[aiosqlite.Connection] = None
        self._lock = asyncio.Lock()
    
    async def initialize(self) -> None:
        """Initialize database connection and create tables if needed"""
        async with self._lock:
            if self._connection is None:
                try:
                    self._connection = await aiosqlite.connect(
                        self.database_url,
                        check_same_thread=False
                    )
                    # Enable foreign keys
                    await self._connection.execute("PRAGMA foreign_keys = ON")
                    await self._connection.commit()
                    logger.info(f"Database connection established: {self.database_url}")
                except Exception as e:
                    logger.error(f"Failed to initialize database: {e}")
                    raise
    
    async def close(self) -> None:
        """Close database connection"""
        async with self._lock:
            if self._connection:
                await self._connection.close()
                self._connection = None
                logger.info("Database connection closed")
    
    @asynccontextmanager
    async def get_connection(self) -> AsyncGenerator[aiosqlite.Connection, None]:
        """Get database connection with proper async context manager"""
        if self._connection is None:
            await self.initialize()
        
        try:
            yield self._connection
        except Exception as e:
            logger.error(f"Database operation failed: {e}")
            raise
    
    async def health_check(self) -> dict:
        """Perform database health check"""
        try:
            async with self.get_connection() as conn:
                # Simple query to test connectivity
                cursor = await conn.execute("SELECT 1")
                result = await cursor.fetchone()
                await cursor.close()
                
                if result and result[0] == 1:
                    return {
                        "healthy": True,
                        "status": "connected",
                        "database_url": self.database_url,
                        "message": "Database connection successful"
                    }
                else:
                    return {
                        "healthy": False,
                        "status": "query_failed",
                        "error": "Test query returned unexpected result"
                    }
        except Exception as e:
            return {
                "healthy": False,
                "status": "disconnected",
                "error": str(e)
            }

# Global database manager instance
db_manager: Optional[DatabaseManager] = None

def get_database_manager() -> DatabaseManager:
    """Get the global database manager instance"""
    global db_manager
    if db_manager is None:
        raise RuntimeError("Database manager not initialized")
    return db_manager

async def init_database(database_url: str) -> DatabaseManager:
    """Initialize the global database manager"""
    global db_manager
    db_manager = DatabaseManager(database_url)
    await db_manager.initialize()
    return db_manager

async def close_database() -> None:
    """Close the global database manager"""
    global db_manager
    if db_manager:
        await db_manager.close()
        db_manager = None
```

### 2. FastAPI Dependency Injection

```python
# backend/database/dependencies.py
from fastapi import Depends
from typing import AsyncGenerator
import aiosqlite
from .connection import get_database_manager, DatabaseManager

async def get_db_connection() -> AsyncGenerator[aiosqlite.Connection, None]:
    """FastAPI dependency to get database connection"""
    db_manager = get_database_manager()
    async with db_manager.get_connection() as conn:
        yield conn

# Alternative approach using a class-based dependency
class DatabaseDependency:
    def __init__(self):
        self.db_manager = get_database_manager()
    
    async def __call__(self) -> AsyncGenerator[aiosqlite.Connection, None]:
        async with self.db_manager.get_connection() as conn:
            yield conn

get_db = DatabaseDependency()
```

### 3. Health Check Service

```python
# backend/services/health_check.py
import time
import asyncio
from typing import Dict, Any, List
import logging
from ..database.connection import get_database_manager
from .cache import get_redis_client
from .openfda import OpenFDAService
import shutil
import os

logger = logging.getLogger(__name__)

class HealthCheckService:
    def __init__(self):
        self.checks = {
            'database': self._check_database,
            'redis': self._check_redis,
            'fda_api': self._check_fda_api,
            'disk_space': self._check_disk_space,
            'memory': self._check_memory
        }
    
    async def check_all(self, include_checks: List[str] = None) -> Dict[str, Any]:
        """Run all health checks or specified subset"""
        start_time = time.time()
        
        if include_checks is None:
            include_checks = list(self.checks.keys())
        
        results = {}
        overall_healthy = True
        
        for check_name in include_checks:
            if check_name in self.checks:
                check_start = time.time()
                try:
                    result = await self.checks[check_name]()
                    result['execution_time_ms'] = round((time.time() - check_start) * 1000, 2)
                    result['timestamp'] = time.strftime('%Y-%m-%dT%H:%M:%S.%fZ')
                    results[check_name] = result
                    
                    if not result.get('healthy', False):
                        overall_healthy = False
                        
                except Exception as e:
                    logger.error(f"Health check {check_name} failed: {e}")
                    results[check_name] = {
                        'healthy': False,
                        'status': 'error',
                        'error': str(e),
                        'execution_time_ms': round((time.time() - check_start) * 1000, 2),
                        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.%fZ')
                    }
                    overall_healthy = False
        
        return {
            'healthy': overall_healthy,
            'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.%fZ'),
            'execution_time_ms': round((time.time() - start_time) * 1000, 2),
            'service': 'medical-device-regulatory-assistant',
            'version': '0.1.0',
            'checks': results
        }
    
    async def _check_database(self) -> Dict[str, Any]:
        """Check database connectivity"""
        try:
            db_manager = get_database_manager()
            return await db_manager.health_check()
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                'healthy': False,
                'status': 'error',
                'error': str(e)
            }
    
    async def _check_redis(self) -> Dict[str, Any]:
        """Check Redis connectivity"""
        try:
            redis_client = get_redis_client()
            if redis_client is None:
                return {
                    'healthy': False,
                    'status': 'not_configured',
                    'message': 'Redis client not initialized'
                }
            
            # Test Redis connection
            await redis_client.ping()
            info = await redis_client.info()
            
            return {
                'healthy': True,
                'status': 'connected',
                'details': {
                    'version': info.get('redis_version', 'unknown'),
                    'connected_clients': info.get('connected_clients', 0),
                    'used_memory_human': info.get('used_memory_human', 'unknown')
                }
            }
        except Exception as e:
            return {
                'healthy': False,
                'status': 'disconnected',
                'error': str(e)
            }
    
    async def _check_fda_api(self) -> Dict[str, Any]:
        """Check FDA API accessibility"""
        try:
            fda_service = OpenFDAService()
            # Test with a simple query
            results = await fda_service.search_predicates(
                search_terms=["device"],
                limit=1
            )
            
            return {
                'healthy': True,
                'status': 'accessible',
                'details': {
                    'requests_remaining': None,  # FDA doesn't provide this info
                    'rate_limit_reset': None,
                    'total_results': len(results) if results else 0
                }
            }
        except Exception as e:
            return {
                'healthy': False,
                'status': 'inaccessible',
                'error': str(e)
            }
    
    async def _check_disk_space(self) -> Dict[str, Any]:
        """Check available disk space"""
        try:
            total, used, free = shutil.disk_usage("/")
            usage_percent = (used / total) * 100
            
            return {
                'healthy': usage_percent < 90,  # Alert if >90% full
                'status': 'ok' if usage_percent < 90 else 'low_space',
                'details': {
                    'total_gb': round(total / (1024**3), 2),
                    'used_gb': round(used / (1024**3), 2),
                    'free_gb': round(free / (1024**3), 2),
                    'usage_percent': round(usage_percent, 2)
                }
            }
        except Exception as e:
            return {
                'healthy': False,
                'status': 'error',
                'error': str(e)
            }
    
    async def _check_memory(self) -> Dict[str, Any]:
        """Check memory usage (optional, requires psutil)"""
        try:
            import psutil
            memory = psutil.virtual_memory()
            
            return {
                'healthy': memory.percent < 90,
                'status': 'ok' if memory.percent < 90 else 'high_usage',
                'details': {
                    'total_gb': round(memory.total / (1024**3), 2),
                    'available_gb': round(memory.available / (1024**3), 2),
                    'used_percent': memory.percent
                }
            }
        except ImportError:
            return {
                'healthy': True,
                'status': 'not_available',
                'message': 'psutil not installed, memory check skipped'
            }
        except Exception as e:
            return {
                'healthy': False,
                'status': 'error',
                'error': str(e)
            }
```

### 4. FastAPI Application Integration

```python
# backend/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging
import os
from .database.connection import init_database, close_database
from .services.health_check import HealthCheckService
from .services.cache import init_redis, close_redis
from .services.openfda import create_openfda_service

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    try:
        # Initialize database
        database_url = os.getenv("DATABASE_URL", "sqlite:./medical_device_assistant.db")
        await init_database(database_url)
        logger.info("Database initialized successfully")
        
        # Initialize Redis (optional)
        try:
            await init_redis()
            logger.info("Redis initialized successfully")
        except Exception as e:
            logger.warning(f"Redis initialization failed: {e}")
        
        # Initialize FDA service
        try:
            create_openfda_service()
            logger.info("FDA service initialized successfully")
        except Exception as e:
            logger.warning(f"FDA service initialization failed: {e}")
        
        logger.info("Application startup completed")
        
    except Exception as e:
        logger.error(f"Application startup failed: {e}")
        raise
    
    yield
    
    # Shutdown
    try:
        await close_database()
        await close_redis()
        logger.info("Application shutdown completed")
    except Exception as e:
        logger.error(f"Application shutdown failed: {e}")

app = FastAPI(
    title="Medical Device Regulatory Assistant API",
    version="0.1.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Comprehensive health check endpoint"""
    health_service = HealthCheckService()
    health_status = await health_service.check_all()
    
    if not health_status["healthy"]:
        raise HTTPException(status_code=503, detail=health_status)
    
    return health_status

@app.get("/health/{check_name}")
async def specific_health_check(check_name: str):
    """Check specific health component"""
    health_service = HealthCheckService()
    
    valid_checks = ['database', 'redis', 'fda_api', 'disk_space', 'memory']
    if check_name not in valid_checks:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid check name. Valid options: {valid_checks}"
        )
    
    health_status = await health_service.check_all([check_name])
    
    if not health_status["healthy"]:
        raise HTTPException(status_code=503, detail=health_status)
    
    return health_status

# Root endpoint
@app.get("/")
async def root():
    return {
        "message": "Medical Device Regulatory Assistant API",
        "version": "0.1.0",
        "status": "running"
    }
```

## Data Models

### Health Check Response Model

```python
# backend/models/health.py
from pydantic import BaseModel
from typing import Dict, Any, Optional, List
from datetime import datetime

class HealthCheckDetail(BaseModel):
    healthy: bool
    status: str
    error: Optional[str] = None
    message: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    execution_time_ms: float
    timestamp: str

class HealthCheckResponse(BaseModel):
    healthy: bool
    timestamp: str
    execution_time_ms: float
    service: str
    version: str
    checks: Dict[str, HealthCheckDetail]

class DatabaseHealthDetail(BaseModel):
    healthy: bool
    status: str
    database_url: Optional[str] = None
    error: Optional[str] = None
    message: Optional[str] = None
```

## Error Handling

### Database Error Recovery

```python
# backend/database/exceptions.py
class DatabaseError(Exception):
    """Base database error"""
    pass

class ConnectionError(DatabaseError):
    """Database connection error"""
    pass

class QueryError(DatabaseError):
    """Database query error"""
    pass

class AsyncContextError(DatabaseError):
    """Async context manager error"""
    pass

# Error handling decorator
import functools
from typing import Callable, Any

def handle_database_errors(func: Callable) -> Callable:
    """Decorator to handle database errors gracefully"""
    @functools.wraps(func)
    async def wrapper(*args, **kwargs) -> Any:
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            logger.error(f"Database operation failed in {func.__name__}: {e}")
            if "async_generator" in str(e) or "context manager" in str(e):
                raise AsyncContextError(f"Async context manager error: {e}")
            elif "connection" in str(e).lower():
                raise ConnectionError(f"Database connection error: {e}")
            else:
                raise QueryError(f"Database query error: {e}")
    return wrapper
```

## Testing Strategy

### Unit Tests for Database Manager

```python
# backend/tests/test_database_connection.py
import pytest
import asyncio
import tempfile
import os
from backend.database.connection import DatabaseManager, init_database, close_database

@pytest.fixture
async def temp_database():
    """Create temporary database for testing"""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name
    
    db_manager = DatabaseManager(f"sqlite:{db_path}")
    await db_manager.initialize()
    
    yield db_manager
    
    await db_manager.close()
    os.unlink(db_path)

@pytest.mark.asyncio
async def test_database_manager_initialization(temp_database):
    """Test database manager initializes correctly"""
    db_manager = temp_database
    
    # Test health check
    health = await db_manager.health_check()
    assert health["healthy"] is True
    assert health["status"] == "connected"

@pytest.mark.asyncio
async def test_database_connection_context_manager(temp_database):
    """Test async context manager works correctly"""
    db_manager = temp_database
    
    async with db_manager.get_connection() as conn:
        cursor = await conn.execute("SELECT 1")
        result = await cursor.fetchone()
        await cursor.close()
        assert result[0] == 1

@pytest.mark.asyncio
async def test_concurrent_database_access(temp_database):
    """Test multiple concurrent database operations"""
    db_manager = temp_database
    
    async def query_database():
        async with db_manager.get_connection() as conn:
            cursor = await conn.execute("SELECT 1")
            result = await cursor.fetchone()
            await cursor.close()
            return result[0]
    
    # Run multiple concurrent queries
    tasks = [query_database() for _ in range(10)]
    results = await asyncio.gather(*tasks)
    
    assert all(result == 1 for result in results)

@pytest.mark.asyncio
async def test_health_check_service():
    """Test health check service"""
    from backend.services.health_check import HealthCheckService
    
    # This will use the global database manager
    health_service = HealthCheckService()
    result = await health_service.check_all(['database'])
    
    assert 'database' in result['checks']
    assert isinstance(result['healthy'], bool)
    assert 'execution_time_ms' in result
```

This design provides a comprehensive solution that addresses the root cause of the async context manager error while implementing a robust, scalable health check system for the Medical Device Regulatory Assistant backend.