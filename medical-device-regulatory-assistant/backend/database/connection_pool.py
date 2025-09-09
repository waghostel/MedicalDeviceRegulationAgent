"""
Enhanced database connection pooling and management
"""

import asyncio
import logging
import time
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional, AsyncGenerator
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.pool import QueuePool, StaticPool
from sqlalchemy.engine.events import event
from sqlalchemy import text

from .config import DatabaseConfig
from .exceptions import ConnectionError, PoolExhaustedError

logger = logging.getLogger(__name__)


@dataclass
class ConnectionMetrics:
    """Connection pool metrics tracking"""
    total_connections: int = 0
    active_connections: int = 0
    idle_connections: int = 0
    checked_out_connections: int = 0
    overflow_connections: int = 0
    invalidated_connections: int = 0
    
    # Performance metrics
    connection_requests: int = 0
    successful_connections: int = 0
    failed_connections: int = 0
    average_connection_time: float = 0.0
    
    # Timing metrics
    last_reset: datetime = field(default_factory=datetime.now)
    connection_times: list = field(default_factory=list)
    
    def add_connection_time(self, duration: float) -> None:
        """Add connection time for average calculation"""
        self.connection_times.append(duration)
        # Keep only last 100 measurements
        if len(self.connection_times) > 100:
            self.connection_times = self.connection_times[-100:]
        
        self.average_connection_time = sum(self.connection_times) / len(self.connection_times)
    
    def reset_metrics(self) -> None:
        """Reset performance metrics"""
        self.connection_requests = 0
        self.successful_connections = 0
        self.failed_connections = 0
        self.connection_times = []
        self.average_connection_time = 0.0
        self.last_reset = datetime.now()


class EnhancedConnectionManager:
    """Enhanced database connection manager with monitoring and optimization"""
    
    def __init__(self, config: DatabaseConfig):
        self.config = config
        self._engine: Optional[AsyncEngine] = None
        self._metrics = ConnectionMetrics()
        self._lock = asyncio.Lock()
        self._health_check_interval = 60  # seconds
        self._last_health_check = datetime.now()
        self._connection_timeout = 30  # seconds
        
    @property
    def engine(self) -> AsyncEngine:
        """Get or create the database engine with enhanced configuration"""
        if self._engine is None:
            self._engine = self._create_optimized_engine()
        return self._engine
    
    def _create_optimized_engine(self) -> AsyncEngine:
        """Create an optimized database engine with proper pooling"""
        connect_args = {}
        pool_class = QueuePool
        
        if self.config.database_url.startswith("sqlite"):
            # SQLite-specific optimizations
            connect_args = {
                "check_same_thread": False,
                # SQLite performance optimizations
                "timeout": self._connection_timeout,
            }
            
            # Use StaticPool for in-memory databases
            if ":memory:" in self.config.database_url:
                pool_class = StaticPool
                connect_args["connect_args"] = {"check_same_thread": False}
            
            engine = create_async_engine(
                self.config.database_url,
                poolclass=pool_class,
                connect_args=connect_args,
                pool_size=self.config.pool_size,
                max_overflow=self.config.max_overflow,
                pool_timeout=self.config.pool_timeout,
                pool_recycle=self.config.pool_recycle,
                pool_pre_ping=True,  # Verify connections before use
                echo=False,
                future=True
            )
        else:
            # PostgreSQL/MySQL optimizations
            engine = create_async_engine(
                self.config.database_url,
                poolclass=QueuePool,
                pool_size=self.config.pool_size,
                max_overflow=self.config.max_overflow,
                pool_timeout=self.config.pool_timeout,
                pool_recycle=self.config.pool_recycle,
                pool_pre_ping=True,
                echo=False,
                future=True
            )
        
        # Set up event listeners for monitoring
        self._setup_event_listeners(engine)
        
        return engine
    
    def _setup_event_listeners(self, engine: AsyncEngine) -> None:
        """Set up SQLAlchemy event listeners for monitoring"""
        
        @event.listens_for(engine.sync_engine, "connect")
        def on_connect(dbapi_connection, connection_record):
            """Handle new database connections"""
            self._metrics.total_connections += 1
            self._metrics.successful_connections += 1
            
            # SQLite-specific optimizations
            if self.config.database_url.startswith("sqlite"):
                cursor = dbapi_connection.cursor()
                # Enable WAL mode for better concurrency
                cursor.execute("PRAGMA journal_mode=WAL")
                # Optimize synchronous mode
                cursor.execute("PRAGMA synchronous=NORMAL")
                # Set cache size (negative value = KB)
                cursor.execute("PRAGMA cache_size=-64000")  # 64MB cache
                # Enable foreign key constraints
                cursor.execute("PRAGMA foreign_keys=ON")
                # Optimize temp store
                cursor.execute("PRAGMA temp_store=MEMORY")
                cursor.close()
        
        @event.listens_for(engine.sync_engine, "checkout")
        def on_checkout(dbapi_connection, connection_record, connection_proxy):
            """Handle connection checkout from pool"""
            self._metrics.checked_out_connections += 1
            self._metrics.connection_requests += 1
        
        @event.listens_for(engine.sync_engine, "checkin")
        def on_checkin(dbapi_connection, connection_record):
            """Handle connection checkin to pool"""
            self._metrics.checked_out_connections = max(0, self._metrics.checked_out_connections - 1)
        
        @event.listens_for(engine.sync_engine, "invalidate")
        def on_invalidate(dbapi_connection, connection_record, exception):
            """Handle connection invalidation"""
            self._metrics.invalidated_connections += 1
            self._metrics.failed_connections += 1
            logger.warning(f"Database connection invalidated: {exception}")
    
    @asynccontextmanager
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get database session with timing and error handling"""
        start_time = time.time()
        session = None
        
        try:
            async with AsyncSession(self.engine, expire_on_commit=False) as session:
                connection_time = time.time() - start_time
                self._metrics.add_connection_time(connection_time)
                
                yield session
                
        except Exception as e:
            self._metrics.failed_connections += 1
            logger.error(f"Database session error: {e}")
            if session:
                await session.rollback()
            raise ConnectionError(f"Database session failed: {str(e)}", original_error=e)
        finally:
            if session:
                await session.close()
    
    @asynccontextmanager
    async def get_connection(self):
        """Get raw database connection with monitoring"""
        start_time = time.time()
        
        try:
            async with self.engine.begin() as conn:
                connection_time = time.time() - start_time
                self._metrics.add_connection_time(connection_time)
                
                yield conn
                
        except Exception as e:
            self._metrics.failed_connections += 1
            logger.error(f"Database connection error: {e}")
            raise ConnectionError(f"Database connection failed: {str(e)}", original_error=e)
    
    async def health_check(self) -> Dict[str, Any]:
        """Comprehensive database health check"""
        health_data = {
            "healthy": False,
            "timestamp": datetime.now().isoformat(),
            "connection_pool": {},
            "performance": {},
            "database": {}
        }
        
        try:
            # Test basic connectivity
            async with self.get_connection() as conn:
                result = await conn.execute(text("SELECT 1"))
                test_result = result.scalar()
                
                if test_result != 1:
                    raise Exception("Test query returned unexpected result")
            
            # Get pool statistics
            pool = self.engine.pool
            health_data["connection_pool"] = {
                "size": pool.size(),
                "checked_in": pool.checkedin(),
                "checked_out": pool.checkedout(),
                "overflow": pool.overflow(),
                "invalid": pool.invalid()
            }
            
            # Get performance metrics
            health_data["performance"] = {
                "total_connections": self._metrics.total_connections,
                "successful_connections": self._metrics.successful_connections,
                "failed_connections": self._metrics.failed_connections,
                "average_connection_time_ms": round(self._metrics.average_connection_time * 1000, 2),
                "connection_requests": self._metrics.connection_requests
            }
            
            # Get database-specific info
            async with self.get_connection() as conn:
                if self.config.database_url.startswith("sqlite"):
                    # SQLite-specific checks
                    pragma_checks = [
                        ("journal_mode", "PRAGMA journal_mode"),
                        ("synchronous", "PRAGMA synchronous"),
                        ("cache_size", "PRAGMA cache_size"),
                        ("foreign_keys", "PRAGMA foreign_keys")
                    ]
                    
                    db_info = {}
                    for name, query in pragma_checks:
                        try:
                            result = await conn.execute(text(query))
                            db_info[name] = result.scalar()
                        except Exception as e:
                            db_info[name] = f"error: {e}"
                    
                    health_data["database"] = db_info
            
            health_data["healthy"] = True
            self._last_health_check = datetime.now()
            
        except Exception as e:
            health_data["error"] = str(e)
            logger.error(f"Database health check failed: {e}")
        
        return health_data
    
    async def get_performance_metrics(self) -> Dict[str, Any]:
        """Get detailed performance metrics"""
        pool = self.engine.pool if self._engine else None
        
        metrics = {
            "connection_pool": {
                "configured_size": self.config.pool_size,
                "max_overflow": self.config.max_overflow,
                "timeout": self.config.pool_timeout,
                "recycle_time": self.config.pool_recycle,
                "current_size": pool.size() if pool else 0,
                "checked_in": pool.checkedin() if pool else 0,
                "checked_out": pool.checkedout() if pool else 0,
                "overflow": pool.overflow() if pool else 0,
                "invalid": pool.invalid() if pool else 0
            },
            "performance": {
                "total_connections": self._metrics.total_connections,
                "active_connections": self._metrics.active_connections,
                "successful_connections": self._metrics.successful_connections,
                "failed_connections": self._metrics.failed_connections,
                "connection_requests": self._metrics.connection_requests,
                "average_connection_time_ms": round(self._metrics.average_connection_time * 1000, 2),
                "invalidated_connections": self._metrics.invalidated_connections
            },
            "timing": {
                "last_health_check": self._last_health_check.isoformat(),
                "metrics_reset": self._metrics.last_reset.isoformat(),
                "uptime_seconds": (datetime.now() - self._metrics.last_reset).total_seconds()
            }
        }
        
        return metrics
    
    async def optimize_connection_pool(self) -> Dict[str, Any]:
        """Optimize connection pool based on current metrics"""
        optimization_results = {}
        
        try:
            # Analyze current pool usage
            pool = self.engine.pool
            current_usage = pool.checkedout() / (pool.size() + pool.overflow()) if pool.size() > 0 else 0
            
            recommendations = []
            
            # Check if pool is frequently exhausted
            if self._metrics.failed_connections > self._metrics.successful_connections * 0.1:
                recommendations.append("Consider increasing pool_size or max_overflow")
            
            # Check if pool is underutilized
            if current_usage < 0.3 and pool.size() > 5:
                recommendations.append("Pool may be oversized, consider reducing pool_size")
            
            # Check connection time performance
            if self._metrics.average_connection_time > 0.1:  # 100ms
                recommendations.append("High connection times detected, check database performance")
            
            optimization_results = {
                "current_pool_usage": round(current_usage * 100, 2),
                "recommendations": recommendations,
                "metrics_analyzed": {
                    "success_rate": round(
                        (self._metrics.successful_connections / max(self._metrics.connection_requests, 1)) * 100, 2
                    ),
                    "average_connection_time_ms": round(self._metrics.average_connection_time * 1000, 2),
                    "pool_utilization": round(current_usage * 100, 2)
                }
            }
            
        except Exception as e:
            optimization_results["error"] = str(e)
            logger.error(f"Connection pool optimization analysis failed: {e}")
        
        return optimization_results
    
    async def reset_metrics(self) -> None:
        """Reset performance metrics"""
        async with self._lock:
            self._metrics.reset_metrics()
            logger.info("Connection pool metrics reset")
    
    async def close(self) -> None:
        """Close the database engine and cleanup"""
        if self._engine:
            await self._engine.dispose()
            self._engine = None
            logger.info("Database engine closed and disposed")


# Global enhanced connection manager
_enhanced_manager: Optional[EnhancedConnectionManager] = None


def get_enhanced_connection_manager() -> EnhancedConnectionManager:
    """Get the global enhanced connection manager"""
    global _enhanced_manager
    if _enhanced_manager is None:
        raise RuntimeError("Enhanced connection manager not initialized")
    return _enhanced_manager


async def init_enhanced_connection_manager(config: DatabaseConfig) -> EnhancedConnectionManager:
    """Initialize the global enhanced connection manager"""
    global _enhanced_manager
    _enhanced_manager = EnhancedConnectionManager(config)
    logger.info("Enhanced connection manager initialized")
    return _enhanced_manager


async def close_enhanced_connection_manager() -> None:
    """Close the global enhanced connection manager"""
    global _enhanced_manager
    if _enhanced_manager:
        await _enhanced_manager.close()
        _enhanced_manager = None
        logger.info("Enhanced connection manager closed")