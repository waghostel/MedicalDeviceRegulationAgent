"""
FastAPI dependency injection for database connections
"""

import logging
from typing import AsyncGenerator, Optional
import aiosqlite
from fastapi import HTTPException, status

from .connection import get_database_manager, DatabaseManager

logger = logging.getLogger(__name__)


async def get_db_connection() -> AsyncGenerator[aiosqlite.Connection, None]:
    """
    FastAPI dependency to get database connection with proper error handling.
    
    This function provides a database connection that is properly managed
    and cleaned up after use. It handles connection failures gracefully
    and provides meaningful error messages.
    
    Yields:
        aiosqlite.Connection: Database connection
        
    Raises:
        HTTPException: 503 if database is unavailable
    """
    db_manager: Optional[DatabaseManager] = None
    
    try:
        db_manager = get_database_manager()
    except RuntimeError as e:
        logger.error(f"Database manager not initialized: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable - manager not initialized"
        )
    
    try:
        async with db_manager.get_connection() as conn:
            # Verify connection is working
            await conn.execute("SELECT 1")
            yield conn
    except Exception as e:
        logger.error(f"Database connection failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable - connection failed"
        )


class DatabaseDependency:
    """
    Class-based database dependency with enhanced error handling and logging.
    
    This provides an alternative approach to function-based dependencies
    and allows for better error handling and connection management.
    """
    
    def __init__(self):
        """Initialize the database dependency."""
        self._db_manager: Optional[DatabaseManager] = None
        self._initialized = False
    
    def _ensure_initialized(self) -> DatabaseManager:
        """
        Ensure the database manager is initialized.
        
        Returns:
            DatabaseManager: The initialized database manager
            
        Raises:
            HTTPException: If database manager is not available
        """
        if not self._initialized:
            try:
                self._db_manager = get_database_manager()
                self._initialized = True
            except RuntimeError as e:
                logger.error(f"Database manager not initialized: {e}")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Database service unavailable - manager not initialized"
                )
        
        return self._db_manager
    
    async def __call__(self) -> AsyncGenerator[aiosqlite.Connection, None]:
        """
        Get database connection with proper error handling.
        
        Yields:
            aiosqlite.Connection: Database connection
            
        Raises:
            HTTPException: 503 if database is unavailable
        """
        db_manager = self._ensure_initialized()
        
        try:
            async with db_manager.get_connection() as conn:
                # Verify connection is working with a simple query
                cursor = await conn.execute("SELECT 1")
                await cursor.close()
                
                logger.debug("Database connection established successfully")
                yield conn
                
        except Exception as e:
            logger.error(f"Database connection failed in class dependency: {e}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Database service unavailable - connection failed: {str(e)}"
            )
    
    async def health_check(self) -> bool:
        """
        Perform a health check on the database connection.
        
        Returns:
            bool: True if database is healthy, False otherwise
        """
        try:
            db_manager = self._ensure_initialized()
            health_result = await db_manager.health_check()
            return health_result.get("healthy", False)
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return False


# Create instance of class-based dependency
get_db = DatabaseDependency()


# Legacy compatibility function for existing code that might use get_db_session
async def get_db_session() -> AsyncGenerator[aiosqlite.Connection, None]:
    """
    Legacy compatibility function for existing code.
    
    **Deprecated**: Use get_db_connection() instead.
    This function is provided for backward compatibility with existing code
    that might be using SQLAlchemy-style session naming.
    
    Yields:
        aiosqlite.Connection: Database connection (not a session)
    """
    logger.warning(
        "get_db_session() is deprecated. Use get_db_connection() instead. "
        "Note: This returns an aiosqlite.Connection, not a SQLAlchemy session."
    )
    
    async for conn in get_db_connection():
        yield conn


# Utility function for manual connection management
async def get_manual_db_connection() -> aiosqlite.Connection:
    """
    Get a database connection for manual management.
    
    **Warning**: This connection must be manually closed by the caller.
    Use get_db_connection() dependency for automatic management.
    
    Returns:
        aiosqlite.Connection: Database connection that must be manually closed
        
    Raises:
        HTTPException: 503 if database is unavailable
    """
    try:
        db_manager = get_database_manager()
        # Note: This bypasses the context manager, so caller must close
        if db_manager._connection is None:
            await db_manager.initialize()
        return db_manager._connection
    except Exception as e:
        logger.error(f"Manual database connection failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database service unavailable for manual connection"
        )