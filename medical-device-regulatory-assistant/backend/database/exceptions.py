"""
Database exception classes and error handling utilities for the Medical Device Regulatory Assistant.

This module provides custom exception classes and error handling decorators
to improve database error reporting and recovery capabilities.
"""

import functools
import logging
import traceback
from typing import Callable, Any, Optional, Dict, Union
import aiosqlite
import asyncio

logger = logging.getLogger(__name__)


class DatabaseError(Exception):
    """Base database error class for all database-related exceptions."""
    
    def __init__(self, message: str, original_error: Optional[Exception] = None, context: Optional[Dict[str, Any]] = None):
        self.message = message
        self.original_error = original_error
        self.context = context or {}
        super().__init__(message)
    
    def __str__(self) -> str:
        error_msg = self.message
        if self.original_error:
            error_msg += f" (Original: {str(self.original_error)})"
        if self.context:
            error_msg += f" (Context: {self.context})"
        return error_msg


class ConnectionError(DatabaseError):
    """Database connection error - raised when connection cannot be established or is lost."""
    
    def __init__(self, message: str, database_path: Optional[str] = None, original_error: Optional[Exception] = None):
        context = {"database_path": database_path} if database_path else {}
        super().__init__(message, original_error, context)


class QueryError(DatabaseError):
    """Database query error - raised when SQL queries fail to execute."""
    
    def __init__(self, message: str, query: Optional[str] = None, parameters: Optional[tuple] = None, original_error: Optional[Exception] = None):
        context = {}
        if query:
            context["query"] = query
        if parameters:
            context["parameters"] = parameters
        super().__init__(message, original_error, context)


class AsyncContextError(DatabaseError):
    """Async context manager error - raised when async context manager operations fail."""
    
    def __init__(self, message: str, operation: Optional[str] = None, original_error: Optional[Exception] = None):
        context = {"operation": operation} if operation else {}
        super().__init__(message, original_error, context)


class TransactionError(DatabaseError):
    """Transaction error - raised when database transaction operations fail."""
    
    def __init__(self, message: str, transaction_state: Optional[str] = None, original_error: Optional[Exception] = None):
        context = {"transaction_state": transaction_state} if transaction_state else {}
        super().__init__(message, original_error, context)


class InitializationError(DatabaseError):
    """Database initialization error - raised when database setup fails."""
    
    def __init__(self, message: str, initialization_step: Optional[str] = None, original_error: Optional[Exception] = None):
        context = {"initialization_step": initialization_step} if initialization_step else {}
        super().__init__(message, original_error, context)


class HealthCheckError(DatabaseError):
    """Health check error - raised when database health checks fail."""
    
    def __init__(self, message: str, check_type: Optional[str] = None, original_error: Optional[Exception] = None):
        context = {"check_type": check_type} if check_type else {}
        super().__init__(message, original_error, context)


class PoolExhaustedError(DatabaseError):
    """Connection pool exhausted error - raised when no connections are available."""
    
    def __init__(self, message: str, pool_size: Optional[int] = None, max_overflow: Optional[int] = None, original_error: Optional[Exception] = None):
        context = {}
        if pool_size is not None:
            context["pool_size"] = pool_size
        if max_overflow is not None:
            context["max_overflow"] = max_overflow
        super().__init__(message, original_error, context)


def handle_database_errors(
    operation_name: Optional[str] = None,
    reraise: bool = True,
    fallback_value: Any = None,
    log_level: int = logging.ERROR
) -> Callable:
    """
    Decorator to handle database errors gracefully with detailed logging and context.
    
    Args:
        operation_name: Name of the operation for logging context
        reraise: Whether to reraise the exception after handling
        fallback_value: Value to return if reraise=False and error occurs
        log_level: Logging level for error messages
    
    Returns:
        Decorated function with error handling
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs) -> Any:
            operation = operation_name or func.__name__
            
            try:
                return await func(*args, **kwargs)
                
            except aiosqlite.Error as e:
                # Handle aiosqlite-specific errors
                error_msg = f"SQLite error in {operation}: {str(e)}"
                logger.log(log_level, error_msg, exc_info=True)
                
                if "database is locked" in str(e).lower():
                    db_error = ConnectionError(
                        f"Database is locked during {operation}",
                        original_error=e
                    )
                elif "no such table" in str(e).lower() or "no such column" in str(e).lower():
                    db_error = QueryError(
                        f"Schema error in {operation}: {str(e)}",
                        original_error=e
                    )
                else:
                    db_error = QueryError(
                        f"SQLite error in {operation}: {str(e)}",
                        original_error=e
                    )
                
                if reraise:
                    raise db_error
                return fallback_value
                
            except asyncio.TimeoutError as e:
                # Handle timeout errors
                error_msg = f"Timeout error in {operation}: {str(e)}"
                logger.log(log_level, error_msg, exc_info=True)
                
                db_error = ConnectionError(
                    f"Database operation timeout in {operation}",
                    original_error=e
                )
                
                if reraise:
                    raise db_error
                return fallback_value
                
            except AttributeError as e:
                # Handle async context manager protocol errors
                if "async_generator" in str(e) or "context manager" in str(e):
                    error_msg = f"Async context manager error in {operation}: {str(e)}"
                    logger.log(log_level, error_msg, exc_info=True)
                    
                    db_error = AsyncContextError(
                        f"Async context manager protocol error in {operation}",
                        operation=operation,
                        original_error=e
                    )
                    
                    if reraise:
                        raise db_error
                    return fallback_value
                else:
                    # Re-raise non-context manager AttributeErrors
                    raise
                    
            except ConnectionError as e:
                # Re-raise our custom ConnectionError
                logger.log(log_level, f"Connection error in {operation}: {str(e)}", exc_info=True)
                if reraise:
                    raise
                return fallback_value
                
            except Exception as e:
                # Handle all other exceptions
                error_msg = f"Unexpected error in {operation}: {str(e)}"
                logger.log(log_level, error_msg, exc_info=True)
                
                # Check if it's a connection-related error
                if any(keyword in str(e).lower() for keyword in ["connection", "connect", "disconnect"]):
                    db_error = ConnectionError(
                        f"Connection error in {operation}: {str(e)}",
                        original_error=e
                    )
                else:
                    db_error = DatabaseError(
                        f"Database error in {operation}: {str(e)}",
                        original_error=e
                    )
                
                if reraise:
                    raise db_error
                return fallback_value
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs) -> Any:
            operation = operation_name or func.__name__
            
            try:
                return func(*args, **kwargs)
                
            except Exception as e:
                error_msg = f"Error in {operation}: {str(e)}"
                logger.log(log_level, error_msg, exc_info=True)
                
                db_error = DatabaseError(
                    f"Database error in {operation}: {str(e)}",
                    original_error=e
                )
                
                if reraise:
                    raise db_error
                return fallback_value
        
        # Return appropriate wrapper based on whether function is async
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


def handle_connection_errors(func: Callable) -> Callable:
    """
    Specialized decorator for connection-related operations.
    
    This decorator specifically handles connection establishment,
    initialization, and cleanup operations.
    """
    return handle_database_errors(
        operation_name=f"connection_{func.__name__}",
        reraise=True,
        log_level=logging.ERROR
    )(func)


def handle_query_errors(func: Callable) -> Callable:
    """
    Specialized decorator for query operations.
    
    This decorator handles SQL query execution errors
    and provides detailed query context in error messages.
    """
    return handle_database_errors(
        operation_name=f"query_{func.__name__}",
        reraise=True,
        log_level=logging.ERROR
    )(func)


def handle_health_check_errors(func: Callable) -> Callable:
    """
    Specialized decorator for health check operations.
    
    This decorator handles health check failures gracefully
    and returns appropriate health status information.
    """
    return handle_database_errors(
        operation_name=f"health_check_{func.__name__}",
        reraise=False,
        fallback_value={
            "healthy": False,
            "status": "error",
            "error": "Health check failed due to database error"
        },
        log_level=logging.WARNING
    )(func)


class DatabaseErrorRecovery:
    """
    Utility class for database error recovery operations.
    
    Provides methods to attempt recovery from common database errors
    and validate database state after errors.
    """
    
    def __init__(self, database_manager):
        self.database_manager = database_manager
        self.logger = logging.getLogger(f"{__name__}.{self.__class__.__name__}")
    
    async def attempt_reconnection(self, max_retries: int = 3, delay: float = 1.0) -> bool:
        """
        Attempt to reconnect to the database after a connection error.
        
        Args:
            max_retries: Maximum number of reconnection attempts
            delay: Delay between attempts in seconds
        
        Returns:
            True if reconnection successful, False otherwise
        """
        for attempt in range(max_retries):
            try:
                self.logger.info(f"Attempting database reconnection (attempt {attempt + 1}/{max_retries})")
                
                # Close existing connection if any
                await self.database_manager.close()
                
                # Wait before retry
                if attempt > 0:
                    await asyncio.sleep(delay * attempt)
                
                # Attempt to reinitialize
                await self.database_manager.initialize()
                
                # Test the connection
                health_result = await self.database_manager.health_check()
                if health_result.get("healthy", False):
                    self.logger.info("Database reconnection successful")
                    return True
                
            except Exception as e:
                self.logger.warning(f"Reconnection attempt {attempt + 1} failed: {str(e)}")
                
        self.logger.error(f"Failed to reconnect after {max_retries} attempts")
        return False
    
    async def validate_database_state(self) -> Dict[str, Any]:
        """
        Validate the current state of the database connection and schema.
        
        Returns:
            Dictionary with validation results
        """
        validation_results = {
            "connection_valid": False,
            "schema_valid": False,
            "foreign_keys_enabled": False,
            "wal_mode_enabled": False,
            "errors": []
        }
        
        try:
            # Test basic connection
            async with self.database_manager.get_connection() as conn:
                # Test basic query
                cursor = await conn.execute("SELECT 1")
                result = await cursor.fetchone()
                await cursor.close()
                
                if result and result[0] == 1:
                    validation_results["connection_valid"] = True
                
                # Check foreign keys
                cursor = await conn.execute("PRAGMA foreign_keys")
                fk_result = await cursor.fetchone()
                await cursor.close()
                
                if fk_result and fk_result[0] == 1:
                    validation_results["foreign_keys_enabled"] = True
                
                # Check WAL mode
                cursor = await conn.execute("PRAGMA journal_mode")
                wal_result = await cursor.fetchone()
                await cursor.close()
                
                if wal_result and wal_result[0].upper() == "WAL":
                    validation_results["wal_mode_enabled"] = True
                
                validation_results["schema_valid"] = True
                
        except Exception as e:
            validation_results["errors"].append(str(e))
            self.logger.error(f"Database validation failed: {str(e)}")
        
        return validation_results
    
    async def repair_database_configuration(self) -> bool:
        """
        Attempt to repair database configuration issues.
        
        Returns:
            True if repair successful, False otherwise
        """
        try:
            async with self.database_manager.get_connection() as conn:
                # Re-enable foreign keys if disabled
                await conn.execute("PRAGMA foreign_keys = ON")
                
                # Set WAL mode if not enabled
                await conn.execute("PRAGMA journal_mode = WAL")
                
                # Optimize settings
                await conn.execute("PRAGMA synchronous = NORMAL")
                await conn.execute("PRAGMA cache_size = 1000")
                await conn.execute("PRAGMA temp_store = MEMORY")
                
                await conn.commit()
                
                self.logger.info("Database configuration repaired successfully")
                return True
                
        except Exception as e:
            self.logger.error(f"Failed to repair database configuration: {str(e)}")
            return False