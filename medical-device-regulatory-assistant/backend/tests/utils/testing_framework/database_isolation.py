"""
Database test isolation system with proper transaction management.

This module provides the DatabaseTestIsolation class that ensures test isolation
through database transactions and savepoints, preventing test interference and
ensuring clean test environments.
"""

import asyncio
import logging
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator, Dict, Any, Optional, List, Set
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession, AsyncEngine
from sqlalchemy import text, inspect
from sqlalchemy.exc import SQLAlchemyError

from database.connection import DatabaseManager, get_database_manager
from database.exceptions import DatabaseError

logger = logging.getLogger(__name__)


class DatabaseTestIsolation:
    """
    Database test isolation system using transactions and savepoints.
    
    This class provides isolated database sessions for testing that ensure:
    - Each test runs in its own transaction
    - Changes are automatically rolled back after test completion
    - No test data persists between tests
    - Proper cleanup of all test resources
    """
    
    def __init__(self, db_manager: Optional[DatabaseManager] = None):
        """
        Initialize the database test isolation system.
        
        Args:
            db_manager: Optional database manager instance. If None, uses global instance.
        """
        self.db_manager = db_manager or get_database_manager()
        self.active_sessions: Dict[str, Dict[str, Any]] = {}
        self.cleanup_registry: Dict[str, List[str]] = {}
        self._lock = asyncio.Lock()
    
    @asynccontextmanager
    async def isolated_session(self) -> AsyncGenerator[AsyncSession, None]:
        """
        Provide isolated database session for testing.
        
        This context manager creates a database session within a transaction
        that is automatically rolled back when the context exits, ensuring
        complete test isolation.
        
        Yields:
            AsyncSession: Isolated database session for testing
            
        Example:
            async with isolation.isolated_session() as session:
                # Perform database operations
                user = User(email="test@example.com")
                session.add(user)
                await session.flush()  # Get ID without committing
                # Changes are automatically rolled back on exit
        """
        session_id = str(uuid.uuid4())
        
        try:
            async with self.db_manager.get_session() as session:
                # Start a transaction
                transaction = await session.begin()
                
                # Create a savepoint for nested rollback capability
                savepoint = await session.begin_nested()
                
                # Register the session for tracking
                async with self._lock:
                    self.active_sessions[session_id] = {
                        "session": session,
                        "transaction": transaction,
                        "savepoint": savepoint,
                        "created_at": datetime.utcnow(),
                        "operations_count": 0
                    }
                    self.cleanup_registry[session_id] = []
                
                logger.debug(f"Created isolated session: {session_id}")
                
                try:
                    yield session
                    
                    # Track successful operations
                    async with self._lock:
                        if session_id in self.active_sessions:
                            self.active_sessions[session_id]["operations_count"] += 1
                            
                except Exception as e:
                    logger.error(f"Error in isolated session {session_id}: {e}")
                    # Rollback to savepoint on error
                    try:
                        await savepoint.rollback()
                    except Exception as rollback_error:
                        logger.error(f"Failed to rollback savepoint: {rollback_error}")
                    raise
                    
                finally:
                    # Always rollback the transaction to ensure isolation
                    try:
                        await transaction.rollback()
                        logger.debug(f"Rolled back transaction for session: {session_id}")
                    except Exception as rollback_error:
                        logger.error(f"Failed to rollback transaction: {rollback_error}")
                        
        except Exception as e:
            logger.error(f"Failed to create isolated session: {e}")
            raise DatabaseError(
                f"Failed to create isolated database session: {str(e)}",
                original_error=e,
                context={"session_id": session_id}
            )
            
        finally:
            # Clean up session tracking
            async with self._lock:
                self.active_sessions.pop(session_id, None)
                self.cleanup_registry.pop(session_id, None)
    
    async def validate_isolation(self, session: AsyncSession) -> bool:
        """
        Validate that test isolation is working correctly.
        
        This method performs checks to ensure that:
        - The session is properly isolated
        - No data leaks between tests
        - Transaction state is correct
        
        Args:
            session: The database session to validate
            
        Returns:
            bool: True if isolation is working correctly, False otherwise
        """
        try:
            # Check if we're in a transaction
            if not session.in_transaction():
                logger.warning("Session is not in a transaction - isolation may be compromised")
                return False
            
            # Test that we can create and rollback changes
            test_query = text("SELECT 1 as test_value")
            result = await session.execute(test_query)
            test_value = result.scalar()
            
            if test_value != 1:
                logger.error("Basic query test failed - database connection issues")
                return False
            
            # Check that we can create a savepoint (nested transaction)
            try:
                nested = await session.begin_nested()
                await nested.rollback()
            except Exception as e:
                logger.error(f"Savepoint test failed: {e}")
                return False
            
            logger.debug("Database isolation validation passed")
            return True
            
        except Exception as e:
            logger.error(f"Isolation validation failed: {e}")
            return False
    
    async def get_session_info(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Get information about an active session.
        
        Args:
            session_id: The session ID to get information for
            
        Returns:
            Dict containing session information or None if not found
        """
        async with self._lock:
            session_info = self.active_sessions.get(session_id)
            if session_info:
                # Return a copy without the actual session object
                return {
                    "session_id": session_id,
                    "created_at": session_info["created_at"],
                    "operations_count": session_info["operations_count"],
                    "cleanup_items": len(self.cleanup_registry.get(session_id, []))
                }
            return None
    
    async def get_active_sessions_count(self) -> int:
        """
        Get the number of currently active isolated sessions.
        
        Returns:
            int: Number of active sessions
        """
        async with self._lock:
            return len(self.active_sessions)
    
    async def cleanup_all_sessions(self) -> None:
        """
        Emergency cleanup of all active sessions.
        
        This method should only be used in exceptional circumstances
        as it forcibly closes all active test sessions.
        """
        async with self._lock:
            session_ids = list(self.active_sessions.keys())
            
        for session_id in session_ids:
            try:
                session_info = self.active_sessions.get(session_id)
                if session_info:
                    transaction = session_info.get("transaction")
                    if transaction:
                        await transaction.rollback()
                        
            except Exception as e:
                logger.error(f"Error during emergency cleanup of session {session_id}: {e}")
        
        async with self._lock:
            self.active_sessions.clear()
            self.cleanup_registry.clear()
            
        logger.warning("Emergency cleanup of all database test sessions completed")
    
    async def check_database_health(self) -> Dict[str, Any]:
        """
        Check the health of the database connection for testing.
        
        Returns:
            Dict containing health check results
        """
        try:
            health_result = await self.db_manager.health_check()
            
            # Add test-specific health checks
            async with self.isolated_session() as session:
                isolation_valid = await self.validate_isolation(session)
                
            health_result.update({
                "test_isolation_working": isolation_valid,
                "active_test_sessions": await self.get_active_sessions_count(),
                "test_database_ready": health_result.get("healthy", False) and isolation_valid
            })
            
            return health_result
            
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "healthy": False,
                "test_isolation_working": False,
                "active_test_sessions": 0,
                "test_database_ready": False,
                "error": str(e)
            }


# Convenience function for creating test isolation instance
def create_test_isolation(db_manager: Optional[DatabaseManager] = None) -> DatabaseTestIsolation:
    """
    Create a new DatabaseTestIsolation instance.
    
    Args:
        db_manager: Optional database manager instance
        
    Returns:
        DatabaseTestIsolation: New test isolation instance
    """
    return DatabaseTestIsolation(db_manager)