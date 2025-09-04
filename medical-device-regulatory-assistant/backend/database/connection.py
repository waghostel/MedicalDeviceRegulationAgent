"""
Database connection management and session handling
"""

import aiosqlite
import asyncio
import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Optional, Dict, Any

logger = logging.getLogger(__name__)


class DatabaseManager:
    """Database connection and session manager using aiosqlite"""
    
    def __init__(self, database_url: str):
        self.database_url = database_url
        self._connection: Optional[aiosqlite.Connection] = None
        self._lock = asyncio.Lock()
        
        # Extract database path from URL
        if database_url.startswith("sqlite:"):
            self.database_path = database_url.replace("sqlite:", "")
        else:
            self.database_path = database_url
    
    async def initialize(self) -> None:
        """Initialize database connection and create tables if needed"""
        async with self._lock:
            if self._connection is None:
                try:
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
    
    async def health_check(self) -> Dict[str, Any]:
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
                        "database_path": self.database_path,
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


async def init_database(database_url: str = None) -> DatabaseManager:
    """Initialize the global database manager"""
    global db_manager
    
    if database_url is None:
        database_url = os.getenv("DATABASE_URL", "sqlite:./medical_device_assistant.db")
    
    db_manager = DatabaseManager(database_url)
    await db_manager.initialize()
    return db_manager


async def close_database() -> None:
    """Close the global database manager"""
    global db_manager
    if db_manager:
        await db_manager.close()
        db_manager = None