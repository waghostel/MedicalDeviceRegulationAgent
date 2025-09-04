"""
Database connection management and session handling
"""

import aiosqlite
import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional, Dict, Any

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
    """Database connection and session manager using aiosqlite"""
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self._connection: Optional[aiosqlite.Connection] = None
        self._lock = asyncio.Lock()
        self._error_recovery = None
        
        # Extract database path from URL
        if database_url.startswith("sqlite:"):
            self.database_path = database_url.replace("sqlite:", "")
        else:
            self.database_path = database_url
    
    @property
    def error_recovery(self) -> DatabaseErrorRecovery:
        """Get error recovery utility instance"""
        if self._error_recovery is None:
            self._error_recovery = DatabaseErrorRecovery(self)
        return self._error_recovery
    
    @handle_connection_errors
    async def initialize(self) -> None:
        """Initialize database connection and create tables if needed"""
        async with self._lock:
            if self._connection is None:
                try:
                    # Validate database path exists and is accessible
                    if not os.path.exists(os.path.dirname(self.database_path) or "."):
                        os.makedirs(os.path.dirname(self.database_path), exist_ok=True)
                    
                    self._connection = await aiosqlite.connect(
                        self.database_path,
                        check_same_thread=False
                    )
                    
                    # Enable foreign keys
                    await self._connection.execute("PRAGMA foreign_keys = ON")
                    await self._connection.execute("PRAGMA journal_mode = WAL")
                    await self._connection.execute("PRAGMA synchronous = NORMAL")
                    await self._connection.execute("PRAGMA cache_size = 1000")
                    await self._connection.execute("PRAGMA temp_store = MEMORY")
                    await self._connection.commit()
                    
                    logger.info(f"Database connection established: {self.database_path}")
                    
                except aiosqlite.Error as e:
                    logger.error(f"SQLite error during initialization: {e}")
                    raise ConnectionError(
                        f"Failed to connect to database at {self.database_path}",
                        database_path=self.database_path,
                        original_error=e
                    )
                except OSError as e:
                    logger.error(f"File system error during initialization: {e}")
                    raise InitializationError(
                        f"Cannot access database file at {self.database_path}",
                        initialization_step="file_access",
                        original_error=e
                    )
                except Exception as e:
                    logger.error(f"Unexpected error during initialization: {e}")
                    raise InitializationError(
                        f"Database initialization failed: {str(e)}",
                        initialization_step="connection_setup",
                        original_error=e
                    )
    
    @handle_connection_errors
    async def close(self) -> None:
        """Close database connection"""
        async with self._lock:
            if self._connection:
                try:
                    await self._connection.close()
                    self._connection = None
                    logger.info("Database connection closed")
                except Exception as e:
                    logger.error(f"Error closing database connection: {e}")
                    # Set connection to None even if close fails to prevent reuse
                    self._connection = None
                    raise ConnectionError(
                        "Failed to close database connection properly",
                        database_path=self.database_path,
                        original_error=e
                    )
    
    @asynccontextmanager
    async def get_connection(self) -> AsyncGenerator[aiosqlite.Connection, None]:
        """Get database connection with proper async context manager"""
        if self._connection is None:
            try:
                await self.initialize()
            except Exception as e:
                logger.error(f"Failed to initialize database connection: {e}")
                raise ConnectionError(
                    "Cannot establish database connection",
                    database_path=self.database_path,
                    original_error=e
                )
        
        # Verify connection is still valid
        try:
            # Quick test to ensure connection is alive
            await self._connection.execute("SELECT 1")
        except Exception as e:
            logger.warning(f"Database connection test failed, attempting reconnection: {e}")
            try:
                await self.close()
                await self.initialize()
            except Exception as reconnect_error:
                logger.error(f"Failed to reconnect to database: {reconnect_error}")
                raise ConnectionError(
                    "Database connection lost and reconnection failed",
                    database_path=self.database_path,
                    original_error=reconnect_error
                )
        
        try:
            yield self._connection
        except aiosqlite.Error as e:
            logger.error(f"SQLite operation failed: {e}")
            raise DatabaseError(
                f"Database operation failed: {str(e)}",
                original_error=e,
                context={"database_path": self.database_path}
            )
        except Exception as e:
            logger.error(f"Unexpected error during database operation: {e}")
            raise DatabaseError(
                f"Unexpected database error: {str(e)}",
                original_error=e,
                context={"database_path": self.database_path}
            )
    
    @handle_health_check_errors
    async def health_check(self) -> Dict[str, Any]:
        """Perform database health check"""
        try:
            async with self.get_connection() as conn:
                # Simple query to test connectivity
                cursor = await conn.execute("SELECT 1")
                result = await cursor.fetchone()
                await cursor.close()
                
                if result and result[0] == 1:
                    # Additional health checks
                    health_details = {
                        "healthy": True,
                        "status": "connected",
                        "database_path": self.database_path,
                        "message": "Database connection successful"
                    }
                    
                    # Check database configuration
                    try:
                        # Check foreign keys
                        cursor = await conn.execute("PRAGMA foreign_keys")
                        fk_result = await cursor.fetchone()
                        await cursor.close()
                        health_details["foreign_keys_enabled"] = bool(fk_result and fk_result[0])
                        
                        # Check journal mode
                        cursor = await conn.execute("PRAGMA journal_mode")
                        journal_result = await cursor.fetchone()
                        await cursor.close()
                        health_details["journal_mode"] = journal_result[0] if journal_result else "unknown"
                        
                    except Exception as config_error:
                        logger.warning(f"Could not retrieve database configuration: {config_error}")
                        health_details["configuration_warning"] = str(config_error)
                    
                    return health_details
                else:
                    raise HealthCheckError(
                        "Test query returned unexpected result",
                        check_type="connectivity_test"
                    )
                    
        except ConnectionError as e:
            logger.error(f"Database health check failed - connection error: {e}")
            return {
                "healthy": False,
                "status": "connection_failed",
                "error": str(e),
                "database_path": self.database_path,
                "suggestion": "Check database file permissions and path accessibility"
            }
        except DatabaseError as e:
            logger.error(f"Database health check failed - database error: {e}")
            return {
                "healthy": False,
                "status": "database_error",
                "error": str(e),
                "database_path": self.database_path,
                "suggestion": "Check database integrity and schema"
            }
        except Exception as e:
            logger.error(f"Database health check failed - unexpected error: {e}")
            raise HealthCheckError(
                f"Health check failed: {str(e)}",
                check_type="general_health_check",
                original_error=e
            )


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
        database_url = os.getenv("DATABASE_URL", "sqlite:./medical_device_assistant.db")
    
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


@asynccontextmanager
async def get_db_session():
    """Get database session context manager for transactions"""
    db_manager = get_database_manager()
    async with db_manager.get_connection() as conn:
        yield conn