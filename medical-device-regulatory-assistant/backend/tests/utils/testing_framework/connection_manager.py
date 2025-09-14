"""
Database connection management specifically for test environments.

This module provides enhanced connection pooling, retry logic, and graceful
failure handling specifically designed for testing scenarios.
"""

import asyncio
import logging
import time
from contextlib import asynccontextmanager
from typing import Dict, Any, Optional, List, Callable, AsyncGenerator
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine
from sqlalchemy.pool import StaticPool, QueuePool
from sqlalchemy.exc import SQLAlchemyError, DisconnectionError, TimeoutError as SQLTimeoutError
from sqlalchemy import text, event

from database.connection import DatabaseManager, DatabaseConfig
from database.exceptions import DatabaseError, ConnectionError, HealthCheckError

logger = logging.getLogger(__name__)


class ConnectionState(Enum):
    """Connection state enumeration."""
    DISCONNECTED = "disconnected"
    CONNECTING = "connecting"
    CONNECTED = "connected"
    RECONNECTING = "reconnecting"
    FAILED = "failed"


@dataclass
class ConnectionMetrics:
    """Connection metrics for monitoring."""
    total_connections: int = 0
    active_connections: int = 0
    failed_connections: int = 0
    retry_attempts: int = 0
    average_connection_time: float = 0.0
    last_connection_time: Optional[datetime] = None
    last_failure_time: Optional[datetime] = None
    connection_times: List[float] = field(default_factory=list)


@dataclass
class RetryConfig:
    """Configuration for connection retry logic."""
    max_retries: int = 3
    base_delay: float = 1.0
    max_delay: float = 30.0
    exponential_base: float = 2.0
    jitter: bool = True


class TestConnectionManager:
    """
    Enhanced database connection manager for test environments.
    
    This manager provides:
    - Connection pooling optimized for tests
    - Retry logic with exponential backoff
    - Graceful failure handling
    - Connection health monitoring
    - Resource cleanup and management
    """
    
    def __init__(self, 
                 database_config: DatabaseConfig,
                 retry_config: Optional[RetryConfig] = None,
                 pool_size: int = 5,
                 max_overflow: int = 10,
                 pool_timeout: int = 30):
        """
        Initialize the test connection manager.
        
        Args:
            database_config: Database configuration
            retry_config: Retry configuration for failed connections
            pool_size: Size of the connection pool
            max_overflow: Maximum overflow connections
            pool_timeout: Pool timeout in seconds
        """
        self.config = database_config
        self.retry_config = retry_config or RetryConfig()
        self.pool_size = pool_size
        self.max_overflow = max_overflow
        self.pool_timeout = pool_timeout
        
        self._engine: Optional[AsyncEngine] = None
        self._state = ConnectionState.DISCONNECTED
        self._metrics = ConnectionMetrics()
        self._lock = asyncio.Lock()
        self._health_check_interval = 30.0  # seconds
        self._last_health_check: Optional[datetime] = None
        self._connection_callbacks: List[Callable] = []
        
    @property
    def state(self) -> ConnectionState:
        """Get current connection state."""
        return self._state
    
    @property
    def metrics(self) -> ConnectionMetrics:
        """Get connection metrics."""
        return self._metrics
    
    def add_connection_callback(self, callback: Callable[[ConnectionState], None]) -> None:
        """
        Add a callback to be called when connection state changes.
        
        Args:
            callback: Function to call with new connection state
        """
        self._connection_callbacks.append(callback)
    
    def _notify_state_change(self, new_state: ConnectionState) -> None:
        """Notify callbacks of state change."""
        old_state = self._state
        self._state = new_state
        
        for callback in self._connection_callbacks:
            try:
                callback(new_state)
            except Exception as e:
                logger.error(f"Error in connection state callback: {e}")
        
        logger.debug(f"Connection state changed: {old_state.value} -> {new_state.value}")
    
    async def initialize(self) -> None:
        """Initialize the connection manager and create engine."""
        async with self._lock:
            if self._engine is not None:
                logger.warning("Connection manager already initialized")
                return
            
            self._notify_state_change(ConnectionState.CONNECTING)
            
            try:
                start_time = time.time()
                
                # Create engine with test-optimized settings
                if self.config.database_url.startswith("sqlite"):
                    # SQLite-specific configuration for tests
                    if ":memory:" in self.config.database_url:
                        # In-memory database
                        self._engine = create_async_engine(
                            self.config.database_url,
                            poolclass=StaticPool,
                            connect_args={
                                "check_same_thread": False,
                            },
                            echo=False,
                            future=True
                        )
                    else:
                        # File-based SQLite
                        self._engine = create_async_engine(
                            self.config.database_url,
                            echo=False,
                            future=True
                        )
                else:
                    # Other databases (PostgreSQL, MySQL, etc.)
                    self._engine = create_async_engine(
                        self.config.database_url,
                        poolclass=QueuePool,
                        pool_size=self.pool_size,
                        max_overflow=self.max_overflow,
                        pool_timeout=self.pool_timeout,
                        pool_recycle=3600,  # 1 hour
                        echo=False,
                        future=True
                    )
                
                # Add event listeners for monitoring
                self._setup_event_listeners()
                
                # Test the connection
                await self._test_connection()
                
                connection_time = time.time() - start_time
                self._metrics.connection_times.append(connection_time)
                self._metrics.average_connection_time = sum(self._metrics.connection_times) / len(self._metrics.connection_times)
                self._metrics.last_connection_time = datetime.utcnow()
                self._metrics.total_connections += 1
                
                self._notify_state_change(ConnectionState.CONNECTED)
                logger.info(f"Test connection manager initialized successfully in {connection_time:.3f}s")
                
            except Exception as e:
                self._metrics.failed_connections += 1
                self._metrics.last_failure_time = datetime.utcnow()
                self._notify_state_change(ConnectionState.FAILED)
                logger.error(f"Failed to initialize connection manager: {e}")
                raise ConnectionError(
                    f"Failed to initialize test connection manager: {str(e)}",
                    original_error=e
                )
    
    def _setup_event_listeners(self) -> None:
        """Setup SQLAlchemy event listeners for monitoring."""
        if self._engine is None:
            return
        
        @event.listens_for(self._engine.sync_engine, "connect")
        def on_connect(dbapi_connection, connection_record):
            self._metrics.active_connections += 1
            logger.debug("Database connection established")
        
        @event.listens_for(self._engine.sync_engine, "close")
        def on_close(dbapi_connection, connection_record):
            self._metrics.active_connections = max(0, self._metrics.active_connections - 1)
            logger.debug("Database connection closed")
    
    async def _test_connection(self) -> None:
        """Test the database connection."""
        if self._engine is None:
            raise ConnectionError("Engine not initialized")
        
        async with self._engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
    
    async def close(self) -> None:
        """Close the connection manager and cleanup resources."""
        async with self._lock:
            if self._engine is None:
                return
            
            try:
                await self._engine.dispose()
                self._engine = None
                self._notify_state_change(ConnectionState.DISCONNECTED)
                logger.info("Test connection manager closed successfully")
                
            except Exception as e:
                logger.error(f"Error closing connection manager: {e}")
                raise ConnectionError(
                    f"Failed to close test connection manager: {str(e)}",
                    original_error=e
                )
    
    @asynccontextmanager
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """
        Get a database session with retry logic and error handling.
        
        Yields:
            AsyncSession: Database session
        """
        if self._engine is None:
            raise ConnectionError("Connection manager not initialized")
        
        session = None
        retry_count = 0
        
        while retry_count <= self.retry_config.max_retries:
            try:
                from sqlalchemy.ext.asyncio import async_sessionmaker
                
                session_factory = async_sessionmaker(
                    bind=self._engine,
                    class_=AsyncSession,
                    expire_on_commit=False
                )
                
                session = session_factory()
                
                # Test the session
                await session.execute(text("SELECT 1"))
                
                yield session
                return
                
            except (SQLAlchemyError, DisconnectionError, SQLTimeoutError) as e:
                self._metrics.retry_attempts += 1
                
                if session:
                    try:
                        await session.close()
                    except Exception:
                        pass
                    session = None
                
                if retry_count >= self.retry_config.max_retries:
                    logger.error(f"Failed to get session after {retry_count} retries: {e}")
                    raise ConnectionError(
                        f"Failed to get database session after {retry_count} retries: {str(e)}",
                        original_error=e
                    )
                
                # Calculate delay with exponential backoff
                delay = min(
                    self.retry_config.base_delay * (self.retry_config.exponential_base ** retry_count),
                    self.retry_config.max_delay
                )
                
                # Add jitter if enabled
                if self.retry_config.jitter:
                    import random
                    delay *= (0.5 + random.random() * 0.5)
                
                logger.warning(f"Session creation failed (attempt {retry_count + 1}), retrying in {delay:.2f}s: {e}")
                await asyncio.sleep(delay)
                retry_count += 1
                
                # Try to reconnect if needed
                if retry_count <= self.retry_config.max_retries:
                    await self._attempt_reconnection()
            
            except Exception as e:
                if session:
                    try:
                        await session.close()
                    except Exception:
                        pass
                
                logger.error(f"Unexpected error getting session: {e}")
                raise DatabaseError(
                    f"Unexpected error getting database session: {str(e)}",
                    original_error=e
                )
            
            finally:
                if session:
                    try:
                        await session.close()
                    except Exception as e:
                        logger.error(f"Error closing session: {e}")
    
    async def _attempt_reconnection(self) -> None:
        """Attempt to reconnect to the database."""
        if self._state == ConnectionState.RECONNECTING:
            return  # Already reconnecting
        
        self._notify_state_change(ConnectionState.RECONNECTING)
        
        try:
            # Close existing engine
            if self._engine:
                await self._engine.dispose()
                self._engine = None
            
            # Reinitialize
            await self.initialize()
            
        except Exception as e:
            self._notify_state_change(ConnectionState.FAILED)
            logger.error(f"Reconnection failed: {e}")
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform comprehensive health check.
        
        Returns:
            Dict containing health check results
        """
        health_result = {
            "healthy": False,
            "state": self._state.value,
            "metrics": {
                "total_connections": self._metrics.total_connections,
                "active_connections": self._metrics.active_connections,
                "failed_connections": self._metrics.failed_connections,
                "retry_attempts": self._metrics.retry_attempts,
                "average_connection_time": self._metrics.average_connection_time,
            },
            "last_check": datetime.utcnow().isoformat(),
            "errors": []
        }
        
        try:
            if self._engine is None:
                health_result["errors"].append("Engine not initialized")
                return health_result
            
            # Test connection
            start_time = time.time()
            async with self._engine.begin() as conn:
                result = await conn.execute(text("SELECT 1 as test_value"))
                test_value = result.scalar()
                
                if test_value != 1:
                    health_result["errors"].append("Test query returned unexpected result")
                    return health_result
            
            connection_time = time.time() - start_time
            health_result["connection_test_time"] = connection_time
            
            # Check pool status (if applicable)
            if hasattr(self._engine.pool, 'size'):
                health_result["pool_status"] = {
                    "size": self._engine.pool.size(),
                    "checked_in": self._engine.pool.checkedin(),
                    "checked_out": self._engine.pool.checkedout(),
                    "overflow": getattr(self._engine.pool, 'overflow', 0),
                }
            
            health_result["healthy"] = True
            self._last_health_check = datetime.utcnow()
            
        except Exception as e:
            health_result["errors"].append(str(e))
            logger.error(f"Health check failed: {e}")
        
        return health_result
    
    async def validate_test_environment(self) -> Dict[str, Any]:
        """
        Validate that the connection manager is properly configured for testing.
        
        Returns:
            Dict containing validation results
        """
        validation_result = {
            "valid": False,
            "checks": {},
            "recommendations": []
        }
        
        try:
            # Check if using test database
            is_test_db = (
                ":memory:" in self.config.database_url or
                "test" in self.config.database_url.lower() or
                self.config.database_url.startswith("sqlite+aiosqlite:///:memory:")
            )
            
            validation_result["checks"]["using_test_database"] = is_test_db
            if not is_test_db:
                validation_result["recommendations"].append(
                    "Consider using an in-memory or test-specific database for testing"
                )
            
            # Check pool configuration
            pool_config_ok = self.pool_size <= 10 and self.max_overflow <= 20
            validation_result["checks"]["pool_configuration"] = pool_config_ok
            if not pool_config_ok:
                validation_result["recommendations"].append(
                    "Consider smaller pool sizes for test environments"
                )
            
            # Check retry configuration
            retry_config_ok = self.retry_config.max_retries <= 5
            validation_result["checks"]["retry_configuration"] = retry_config_ok
            if not retry_config_ok:
                validation_result["recommendations"].append(
                    "Consider fewer retry attempts for faster test execution"
                )
            
            # Check connection health
            health_result = await self.health_check()
            validation_result["checks"]["connection_healthy"] = health_result["healthy"]
            
            # Overall validation
            validation_result["valid"] = all(validation_result["checks"].values())
            
        except Exception as e:
            validation_result["error"] = str(e)
            logger.error(f"Test environment validation failed: {e}")
        
        return validation_result


# Convenience functions for creating test connection managers

def create_test_connection_manager(
    database_url: str,
    retry_config: Optional[RetryConfig] = None,
    **kwargs
) -> TestConnectionManager:
    """
    Create a test connection manager with the given database URL.
    
    Args:
        database_url: Database connection URL
        retry_config: Optional retry configuration
        **kwargs: Additional arguments for TestConnectionManager
        
    Returns:
        TestConnectionManager: Configured test connection manager
    """
    config = DatabaseConfig(database_url=database_url)
    return TestConnectionManager(config, retry_config, **kwargs)


def create_memory_test_manager(retry_config: Optional[RetryConfig] = None) -> TestConnectionManager:
    """
    Create a test connection manager with in-memory SQLite database.
    
    Args:
        retry_config: Optional retry configuration
        
    Returns:
        TestConnectionManager: Configured test connection manager for in-memory database
    """
    return create_test_connection_manager(
        "sqlite+aiosqlite:///:memory:",
        retry_config,
        pool_size=1,  # In-memory databases don't need large pools
        max_overflow=0
    )