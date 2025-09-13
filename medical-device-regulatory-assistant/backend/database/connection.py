"""
Database connection management and session handling
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional, Dict, Any, Union

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from .config import DatabaseConfig
from .exceptions import (
    DatabaseError,
    ConnectionError,
    InitializationError,
    HealthCheckError,
    handle_connection_errors,
    handle_health_check_errors,
    DatabaseErrorRecovery
)

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Database connection and session manager using SQLAlchemy"""
    
    def __init__(self, database_config: Union[str, DatabaseConfig]):
        # Handle both string URLs and DatabaseConfig objects
        if isinstance(database_config, str):
            self.config = DatabaseConfig(database_url=database_config)
        elif isinstance(database_config, DatabaseConfig):
            self.config = database_config
        else:
            raise ValueError("database_config must be either a string URL or DatabaseConfig object")
            
        self._engine: Optional[AsyncEngine] = None
        self._session_factory: Optional[async_sessionmaker] = None
        self._lock = asyncio.Lock()
        self._error_recovery = None
    
    @property
    def error_recovery(self) -> DatabaseErrorRecovery:
        """Get error recovery utility instance"""
        if self._error_recovery is None:
            self._error_recovery = DatabaseErrorRecovery(self)
        return self._error_recovery
    
    @property
    def engine(self) -> AsyncEngine:
        """Get or create the database engine"""
        if self._engine is None:
            # Configure engine based on database URL
            if self.config.database_url.startswith("sqlite"):
                # For SQLite, use StaticPool for in-memory databases
                if ":memory:" in self.config.database_url:
                    self._engine = create_async_engine(
                        self.config.database_url,
                        poolclass=StaticPool,
                        connect_args={
                            "check_same_thread": False,
                        },
                        echo=False
                    )
                else:
                    self._engine = create_async_engine(
                        self.config.database_url,
                        echo=False
                    )
            else:
                self._engine = create_async_engine(
                    self.config.database_url,
                    pool_size=self.config.pool_size,
                    max_overflow=self.config.max_overflow,
                    pool_timeout=self.config.pool_timeout,
                    pool_recycle=self.config.pool_recycle,
                    echo=False
                )
        return self._engine
    
    @property
    def session_factory(self) -> async_sessionmaker:
        """Get or create the session factory"""
        if self._session_factory is None:
            self._session_factory = async_sessionmaker(
                bind=self.engine,
                class_=AsyncSession,
                expire_on_commit=False
            )
        return self._session_factory
    
    @handle_connection_errors
    async def initialize(self) -> None:
        """Initialize database engine"""
        async with self._lock:
            if self._engine is None:
                try:
                    # Create engine (this will be done lazily via property)
                    engine = self.engine
                    
                    # Test connection
                    async with engine.begin() as conn:
                        from sqlalchemy import text
                        await conn.execute(text("SELECT 1"))
                    
                    logger.info(f"Database engine initialized: {self.config.database_url}")
                    
                except Exception as e:
                    logger.error(f"Database initialization failed: {e}")
                    raise InitializationError(
                        f"Database initialization failed: {str(e)}",
                        initialization_step="engine_setup",
                        original_error=e
                    )
    
    @handle_connection_errors
    async def close(self) -> None:
        """Close database engine"""
        async with self._lock:
            if self._engine:
                try:
                    await self._engine.dispose()
                    self._engine = None
                    self._session_factory = None
                    logger.info("Database engine closed")
                except Exception as e:
                    logger.error(f"Error closing database engine: {e}")
                    # Set engine to None even if close fails to prevent reuse
                    self._engine = None
                    self._session_factory = None
                    raise ConnectionError(
                        "Failed to close database engine properly",
                        original_error=e
                    )
    
    @handle_connection_errors
    async def create_tables(self) -> None:
        """Create database tables using SQLAlchemy metadata"""
        try:
            from models.base import Base
            
            async with self.engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            
            logger.info("Database tables created successfully")
            
        except Exception as e:
            logger.error(f"Error creating database tables: {e}")
            raise DatabaseError(
                f"Failed to create database tables: {str(e)}",
                original_error=e,
                context={"database_url": self.config.database_url}
            )
    
    @handle_connection_errors
    async def drop_tables(self) -> None:
        """Drop all database tables using SQLAlchemy metadata"""
        try:
            from models.base import Base
            
            async with self.engine.begin() as conn:
                await conn.run_sync(Base.metadata.drop_all)
            
            logger.info("Database tables dropped successfully")
            
        except Exception as e:
            logger.error(f"Error dropping database tables: {e}")
            raise DatabaseError(
                f"Failed to drop database tables: {str(e)}",
                original_error=e,
                context={"database_url": self.config.database_url}
            )
    
    @asynccontextmanager
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get database session for SQLAlchemy-style usage"""
        async with self.session_factory() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()
    
    @asynccontextmanager
    async def get_connection(self):
        """Get database connection for raw SQL operations"""
        async with self.engine.begin() as conn:
            try:
                yield conn
            except Exception as e:
                logger.error(f"Database operation failed: {e}")
                raise DatabaseError(
                    f"Database operation failed: {str(e)}",
                    original_error=e,
                    context={"database_url": self.config.database_url}
                )
    
    @handle_health_check_errors
    async def health_check(self) -> Dict[str, Any]:
        """Perform database health check"""
        try:
            async with self.get_connection() as conn:
                # Simple query to test connectivity
                from sqlalchemy import text
                result = await conn.execute(text("SELECT 1"))
                test_result = result.scalar()
                
                if test_result == 1:
                    return {
                        "healthy": True,
                        "status": "connected",
                        "database_path": str(self.config.database_path) if self.config.database_path else self.config.database_url,
                        "message": "Database connection successful"
                    }
                else:
                    raise HealthCheckError(
                        "Test query returned unexpected result",
                        check_type="connectivity_test"
                    )
                    
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "healthy": False,
                "status": "disconnected",
                "database_path": str(self.config.database_path) if self.config.database_path else self.config.database_url,
                "message": f"Database connection failed: {str(e)}"
            }


# Global database manager instance
db_manager: Optional[DatabaseManager] = None


def get_database_manager() -> DatabaseManager:
    """Get the global database manager instance"""
    global db_manager
    if db_manager is None:
        raise RuntimeError("Database manager not initialized")
    return db_manager


@handle_connection_errors
async def init_database(database_url: str = None) -> DatabaseManager:
    """Initialize the global database manager"""
    global db_manager
    
    if database_url is None:
        database_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./medical_device_assistant.db")
    
    try:
        db_manager = DatabaseManager(database_url)
        await db_manager.initialize()
        logger.info(f"Global database manager initialized successfully: {database_url}")
        return db_manager
    except Exception as e:
        logger.error(f"Failed to initialize global database manager: {e}")
        raise InitializationError(
            f"Global database manager initialization failed: {str(e)}",
            initialization_step="global_manager_setup",
            original_error=e
        )


@handle_connection_errors
async def close_database() -> None:
    """Close the global database manager"""
    global db_manager
    if db_manager:
        try:
            await db_manager.close()
            db_manager = None
            logger.info("Global database manager closed successfully")
        except Exception as e:
            logger.error(f"Error closing global database manager: {e}")
            # Set to None even if close fails to prevent reuse
            db_manager = None
            raise ConnectionError(
                "Failed to close global database manager properly",
                original_error=e
            )


def initialize_database_manager():
    """Initialize database manager for current environment"""
    global db_manager
    if db_manager is None:
        database_url = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./medical_device_assistant.db")
        db_manager = DatabaseManager(database_url)
        logger.info(f"Database manager initialized for environment: {database_url}")


@asynccontextmanager
async def get_db_session():
    """Get database session context manager for transactions"""
    db_manager = get_database_manager()
    async with db_manager.get_session() as session:
        yield session