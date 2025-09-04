"""
FastAPI dependency injection for database connections
"""

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