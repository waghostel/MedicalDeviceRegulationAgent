"""
Test-specific database configuration that bypasses the global database manager.

This module provides isolated database instances for testing with proper
StaticPool configuration for SQLite in-memory databases.
"""

import asyncio
import logging
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional, Dict, Any

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import event, text

from .config import DatabaseConfig
from .exceptions import DatabaseError, ConnectionError, InitializationError

logger = logging.getLogger(__name__)


class IsolatedTestDatabaseConfig:
    """
    Test-specific database configuration that creates isolated database instances.
    
    This class bypasses the global database manager entirely and creates
    completely isolated database instances for each test, ensuring proper
    test isolation and cleanup.
    """
    
    def __init__(self, database_url: Optional[str] = None):
        """
        Initialize test database configuration.
        
        Args:
            database_url: Optional database URL. Defaults to in-memory SQLite.
        """
        self.test_id = str(uuid.uuid4())[:8]
        # Use in-memory database by default for fastest tests
        # Each instance gets a completely separate in-memory database
        if database_url is None:
            self.database_url = "sqlite+aiosqlite:///:memory:"
        else:
            self.database_url = database_url
        self._engine: Optional[AsyncEngine] = None
        self._session_factory: Optional[async_sessionmaker] = None
        self._lock = asyncio.Lock()
        self._disposed = False
    
    @property
    def engine(self) -> AsyncEngine:
        """Get or create the test database engine with proper SQLite configuration."""
        if self._engine is None:
            # Configure engine specifically for testing
            if "sqlite" in self.database_url:
                # Use StaticPool for in-memory databases to maintain connection
                connect_args = {
                    "check_same_thread": False,
                }
                
                # Add SQLite-specific PRAGMA settings
                if ":memory:" in self.database_url:
                    self._engine = create_async_engine(
                        self.database_url,
                        poolclass=StaticPool,
                        connect_args=connect_args,
                        echo=False,
                        # Ensure proper connection handling
                        pool_pre_ping=True,
                        pool_recycle=-1,  # Don't recycle connections for in-memory DB
                    )
                else:
                    self._engine = create_async_engine(
                        self.database_url,
                        connect_args=connect_args,
                        echo=False,
                        pool_pre_ping=True,
                    )
                
                # Configure SQLite PRAGMA settings
                @event.listens_for(self._engine.sync_engine, "connect")
                def set_sqlite_pragma(dbapi_connection, connection_record):
                    """Set SQLite PRAGMA settings for proper test behavior."""
                    cursor = dbapi_connection.cursor()
                    # Enable foreign key constraints
                    cursor.execute("PRAGMA foreign_keys=ON")
                    # Set WAL mode for better concurrency (if not in-memory)
                    if ":memory:" not in self.database_url:
                        cursor.execute("PRAGMA journal_mode=WAL")
                    # Set synchronous mode for better performance in tests
                    cursor.execute("PRAGMA synchronous=NORMAL")
                    cursor.close()
            else:
                # For non-SQLite databases (future support)
                self._engine = create_async_engine(
                    self.database_url,
                    echo=False,
                    pool_pre_ping=True,
                )
        
        return self._engine
    
    @property
    def session_factory(self) -> async_sessionmaker:
        """Get or create the session factory."""
        if self._session_factory is None:
            self._session_factory = async_sessionmaker(
                bind=self.engine,
                class_=AsyncSession,
                expire_on_commit=False,
                # Ensure proper cleanup
                autoflush=True,
                autocommit=False,
            )
        return self._session_factory
    
    async def initialize(self) -> None:
        """Initialize the test database and create tables."""
        async with self._lock:
            try:
                # Test connection
                async with self.engine.begin() as conn:
                    await conn.execute(text("SELECT 1"))
                
                # Create all tables
                from models.base import Base
                async with self.engine.begin() as conn:
                    await conn.run_sync(Base.metadata.create_all)
                
                logger.debug(f"Test database initialized: {self.test_id}")
                
            except Exception as e:
                logger.error(f"Test database initialization failed: {e}")
                raise InitializationError(
                    f"Test database initialization failed: {str(e)}",
                    initialization_step="test_database_setup",
                    original_error=e
                )
    
    async def cleanup(self) -> None:
        """Clean up the test database and close connections."""
        async with self._lock:
            if self._engine:
                try:
                    # Drop all tables for clean slate
                    from models.base import Base
                    async with self.engine.begin() as conn:
                        await conn.run_sync(Base.metadata.drop_all)
                    
                    # Close engine and mark as disposed
                    await self._engine.dispose()
                    self._engine = None
                    self._session_factory = None
                    self._disposed = True  # Mark as disposed for health checks
                    
                    logger.debug(f"Test database cleaned up: {self.test_id}")
                    
                except Exception as e:
                    logger.warning(f"Error during test database cleanup: {e}")
                    # Set to None even if cleanup fails
                    self._engine = None
                    self._session_factory = None
                    self._disposed = True
    
    @asynccontextmanager
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """
        Get an isolated database session for testing.
        
        This session is completely isolated from other tests and will be
        automatically rolled back and cleaned up.
        """
        async with self.session_factory() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
    
    @asynccontextmanager
    async def get_connection(self) -> AsyncGenerator[Any, None]:
        """Get a raw database connection for testing."""
        async with self.engine.begin() as conn:
            try:
                yield conn
            except Exception as e:
                logger.error(f"Test database operation failed: {e}")
                raise DatabaseError(
                    f"Test database operation failed: {str(e)}",
                    original_error=e,
                    context={"test_id": self.test_id, "database_url": self.database_url}
                )
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on the test database."""
        # Check if already disposed
        if self._disposed or self._engine is None:
            return {
                "healthy": False,
                "status": "disposed",
                "test_id": self.test_id,
                "database_url": self.database_url,
                "message": "Test database has been disposed"
            }
        
        try:
            async with self.get_connection() as conn:
                result = await conn.execute(text("SELECT 1"))
                test_result = result.scalar()
                
                if test_result == 1:
                    return {
                        "healthy": True,
                        "status": "connected",
                        "test_id": self.test_id,
                        "database_url": self.database_url,
                        "message": "Test database connection successful"
                    }
                else:
                    return {
                        "healthy": False,
                        "status": "test_failed",
                        "test_id": self.test_id,
                        "database_url": self.database_url,
                        "message": "Test query returned unexpected result"
                    }
                    
        except Exception as e:
            logger.error(f"Test database health check failed: {e}")
            return {
                "healthy": False,
                "status": "disconnected",
                "test_id": self.test_id,
                "database_url": self.database_url,
                "message": f"Test database connection failed: {str(e)}"
            }


class IsolatedTestDatabaseManager:
    """
    Manager for test database instances that ensures proper isolation.
    
    This manager creates and manages isolated database instances for testing,
    ensuring that each test gets a completely clean database environment.
    """
    
    def __init__(self):
        """Initialize the test database manager."""
        self._active_configs: Dict[str, IsolatedTestDatabaseConfig] = {}
        self._lock = asyncio.Lock()
    
    async def create_test_database(self, test_name: Optional[str] = None) -> IsolatedTestDatabaseConfig:
        """
        Create a new isolated test database configuration.
        
        Args:
            test_name: Optional name for the test (for debugging)
            
        Returns:
            IsolatedTestDatabaseConfig: Isolated database configuration
        """
        async with self._lock:
            config = IsolatedTestDatabaseConfig()
            await config.initialize()
            
            # Track active configurations for cleanup
            config_id = f"{test_name or 'test'}_{config.test_id}"
            self._active_configs[config_id] = config
            
            logger.debug(f"Created test database: {config_id}")
            return config
    
    async def cleanup_test_database(self, config: IsolatedTestDatabaseConfig) -> None:
        """
        Clean up a test database configuration.
        
        Args:
            config: The test database configuration to clean up
        """
        async with self._lock:
            try:
                await config.cleanup()
                
                # Remove from active configurations
                config_id = None
                for cid, cfg in self._active_configs.items():
                    if cfg is config:
                        config_id = cid
                        break
                
                if config_id:
                    del self._active_configs[config_id]
                    logger.debug(f"Cleaned up test database: {config_id}")
                
            except Exception as e:
                logger.warning(f"Error cleaning up test database: {e}")
    
    async def cleanup_all(self) -> None:
        """Clean up all active test database configurations."""
        async with self._lock:
            for config_id, config in list(self._active_configs.items()):
                try:
                    await config.cleanup()
                    logger.debug(f"Cleaned up test database: {config_id}")
                except Exception as e:
                    logger.warning(f"Error cleaning up test database {config_id}: {e}")
            
            self._active_configs.clear()
    
    def get_active_count(self) -> int:
        """Get the number of active test database configurations."""
        return len(self._active_configs)


# Global test database manager instance
_test_db_manager: Optional[IsolatedTestDatabaseManager] = None


def get_test_database_manager() -> IsolatedTestDatabaseManager:
    """Get the global test database manager instance."""
    global _test_db_manager
    if _test_db_manager is None:
        _test_db_manager = IsolatedTestDatabaseManager()
    return _test_db_manager


@asynccontextmanager
async def isolated_test_database(test_name: Optional[str] = None) -> AsyncGenerator[IsolatedTestDatabaseConfig, None]:
    """
    Context manager for creating an isolated test database.
    
    This is the recommended way to get a test database configuration.
    It ensures proper cleanup even if the test fails.
    
    Args:
        test_name: Optional name for the test (for debugging)
        
    Yields:
        IsolatedTestDatabaseConfig: Isolated database configuration
    """
    manager = get_test_database_manager()
    config = await manager.create_test_database(test_name)
    
    try:
        yield config
    finally:
        await manager.cleanup_test_database(config)


@asynccontextmanager
async def isolated_test_session(test_name: Optional[str] = None) -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager for creating an isolated test database session.
    
    This is a convenience function that combines database creation and
    session management in a single context manager.
    
    Args:
        test_name: Optional name for the test (for debugging)
        
    Yields:
        AsyncSession: Isolated database session
    """
    async with isolated_test_database(test_name) as config:
        async with config.get_session() as session:
            yield session