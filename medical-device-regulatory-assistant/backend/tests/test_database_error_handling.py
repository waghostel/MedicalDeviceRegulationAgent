"""
Unit tests for database error handling and recovery functionality.

This module tests the custom database exception classes, error handling decorators,
and recovery mechanisms to ensure robust database operations.
"""

import pytest
import asyncio
import tempfile
import os
import aiosqlite
from unittest.mock import AsyncMock, MagicMock, patch
from typing import AsyncGenerator

from database.exceptions import (
    DatabaseError,
    ConnectionError,
    QueryError,
    AsyncContextError,
    TransactionError,
    InitializationError,
    HealthCheckError,
    handle_database_errors,
    handle_connection_errors,
    handle_query_errors,
    handle_health_check_errors,
    DatabaseErrorRecovery
)
from database.connection import DatabaseManager, init_database, close_database


class TestDatabaseExceptions:
    """Test custom database exception classes."""
    
    def test_database_error_basic(self):
        """Test basic DatabaseError functionality."""
        error = DatabaseError("Test error message")
        assert str(error) == "Test error message"
        assert error.message == "Test error message"
        assert error.original_error is None
        assert error.context == {}
    
    def test_database_error_with_original_error(self):
        """Test DatabaseError with original exception."""
        original = ValueError("Original error")
        error = DatabaseError("Test error", original_error=original)
        
        assert "Test error" in str(error)
        assert "Original: Original error" in str(error)
        assert error.original_error == original
    
    def test_database_error_with_context(self):
        """Test DatabaseError with context information."""
        context = {"query": "SELECT * FROM test", "parameters": (1, 2)}
        error = DatabaseError("Test error", context=context)
        
        assert "Test error" in str(error)
        assert "Context:" in str(error)
        assert error.context == context
    
    def test_connection_error_with_database_path(self):
        """Test ConnectionError with database path context."""
        error = ConnectionError("Connection failed", database_path="/path/to/db.sqlite")
        
        assert "Connection failed" in str(error)
        assert error.context["database_path"] == "/path/to/db.sqlite"
    
    def test_query_error_with_query_context(self):
        """Test QueryError with query and parameters context."""
        error = QueryError(
            "Query failed",
            query="SELECT * FROM users WHERE id = ?",
            parameters=(123,)
        )
        
        assert "Query failed" in str(error)
        assert error.context["query"] == "SELECT * FROM users WHERE id = ?"
        assert error.context["parameters"] == (123,)
    
    def test_async_context_error_with_operation(self):
        """Test AsyncContextError with operation context."""
        error = AsyncContextError("Context manager failed", operation="get_connection")
        
        assert "Context manager failed" in str(error)
        assert error.context["operation"] == "get_connection"


class TestErrorHandlingDecorators:
    """Test error handling decorators."""
    
    @pytest.mark.asyncio
    async def test_handle_database_errors_success(self):
        """Test decorator with successful operation."""
        
        @handle_database_errors(operation_name="test_operation")
        async def successful_operation():
            return "success"
        
        result = await successful_operation()
        assert result == "success"
    
    @pytest.mark.asyncio
    async def test_handle_database_errors_aiosqlite_error(self):
        """Test decorator handling aiosqlite errors."""
        
        @handle_database_errors(operation_name="test_operation")
        async def failing_operation():
            raise aiosqlite.Error("SQLite error")
        
        with pytest.raises(QueryError) as exc_info:
            await failing_operation()
        
        assert "SQLite error in test_operation" in str(exc_info.value)
        assert isinstance(exc_info.value.original_error, aiosqlite.Error)
    
    @pytest.mark.asyncio
    async def test_handle_database_errors_timeout(self):
        """Test decorator handling timeout errors."""
        
        @handle_database_errors(operation_name="test_operation")
        async def timeout_operation():
            raise asyncio.TimeoutError("Operation timed out")
        
        with pytest.raises(ConnectionError) as exc_info:
            await timeout_operation()
        
        assert "timeout" in str(exc_info.value).lower()
        assert isinstance(exc_info.value.original_error, asyncio.TimeoutError)
    
    @pytest.mark.asyncio
    async def test_handle_database_errors_async_context_manager_error(self):
        """Test decorator handling async context manager errors."""
        
        @handle_database_errors(operation_name="test_operation")
        async def context_manager_error():
            raise AttributeError("'async_generator' object does not support the asynchronous context manager protocol")
        
        with pytest.raises(AsyncContextError) as exc_info:
            await context_manager_error()
        
        assert "Async context manager protocol error" in str(exc_info.value)
        assert exc_info.value.context["operation"] == "test_operation"
    
    @pytest.mark.asyncio
    async def test_handle_database_errors_no_reraise(self):
        """Test decorator with reraise=False."""
        
        @handle_database_errors(operation_name="test_operation", reraise=False, fallback_value="fallback")
        async def failing_operation():
            raise aiosqlite.Error("SQLite error")
        
        result = await failing_operation()
        assert result == "fallback"
    
    def test_handle_database_errors_sync_function(self):
        """Test decorator with synchronous function."""
        
        @handle_database_errors(operation_name="sync_operation")
        def sync_failing_operation():
            raise ValueError("Sync error")
        
        with pytest.raises(DatabaseError) as exc_info:
            sync_failing_operation()
        
        assert "Database error in sync_operation" in str(exc_info.value)
    
    @pytest.mark.asyncio
    async def test_handle_connection_errors_decorator(self):
        """Test connection-specific error decorator."""
        
        @handle_connection_errors
        async def connection_operation():
            raise aiosqlite.Error("Connection failed")
        
        with pytest.raises(QueryError):
            await connection_operation()
    
    @pytest.mark.asyncio
    async def test_handle_health_check_errors_decorator(self):
        """Test health check error decorator with fallback."""
        
        @handle_health_check_errors
        async def health_check_operation():
            raise aiosqlite.Error("Health check failed")
        
        result = await health_check_operation()
        assert result["healthy"] is False
        assert result["status"] == "error"


class TestDatabaseErrorRecovery:
    """Test database error recovery functionality."""
    
    @pytest.fixture
    def temp_database_manager(self):
        """Create temporary database manager for testing."""
        async def _create_manager():
            with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
                db_path = tmp.name
            
            db_manager = DatabaseManager(f"sqlite:{db_path}")
            await db_manager.initialize()
            return db_manager, db_path
        
        return _create_manager
    
    @pytest.mark.asyncio
    async def test_error_recovery_initialization(self, temp_database_manager):
        """Test error recovery utility initialization."""
        db_manager, db_path = await temp_database_manager()
        
        try:
            recovery = DatabaseErrorRecovery(db_manager)
            assert recovery.database_manager == db_manager
            assert recovery.logger is not None
            
        finally:
            await db_manager.close()
            os.unlink(db_path)
    
    @pytest.mark.asyncio
    async def test_attempt_reconnection_success(self, temp_database_manager):
        """Test successful database reconnection."""
        db_manager, db_path = await temp_database_manager()
        
        try:
            recovery = DatabaseErrorRecovery(db_manager)
            
            # Simulate connection loss
            await db_manager.close()
            
            # Attempt reconnection
            success = await recovery.attempt_reconnection(max_retries=2, delay=0.1)
            assert success is True
            
            # Verify connection works
            health_result = await db_manager.health_check()
            assert health_result["healthy"] is True
            
        finally:
            await db_manager.close()
            os.unlink(db_path)
    
    @pytest.mark.asyncio
    async def test_attempt_reconnection_failure(self):
        """Test failed database reconnection."""
        # Create manager with invalid path
        db_manager = DatabaseManager("sqlite:/invalid/path/database.db")
        recovery = DatabaseErrorRecovery(db_manager)
        
        success = await recovery.attempt_reconnection(max_retries=2, delay=0.1)
        assert success is False
    
    @pytest.mark.asyncio
    async def test_validate_database_state_success(self, temp_database_manager):
        """Test database state validation with healthy database."""
        db_manager, db_path = await temp_database_manager()
        
        try:
            recovery = DatabaseErrorRecovery(db_manager)
            
            validation_result = await recovery.validate_database_state()
            
            assert validation_result["connection_valid"] is True
            assert validation_result["schema_valid"] is True
            assert validation_result["foreign_keys_enabled"] is True
            assert validation_result["wal_mode_enabled"] is True
            assert len(validation_result["errors"]) == 0
            
        finally:
            await db_manager.close()
            os.unlink(db_path)
    
    @pytest.mark.asyncio
    async def test_validate_database_state_failure(self):
        """Test database state validation with unhealthy database."""
        # Create manager with invalid path
        db_manager = DatabaseManager("sqlite:/invalid/path/database.db")
        recovery = DatabaseErrorRecovery(db_manager)
        
        validation_result = await recovery.validate_database_state()
        
        assert validation_result["connection_valid"] is False
        assert validation_result["schema_valid"] is False
        assert len(validation_result["errors"]) > 0
    
    @pytest.mark.asyncio
    async def test_repair_database_configuration(self, temp_database_manager):
        """Test database configuration repair."""
        db_manager, db_path = await temp_database_manager()
        
        try:
            recovery = DatabaseErrorRecovery(db_manager)
            
            success = await recovery.repair_database_configuration()
            assert success is True
            
            # Verify configuration is correct
            validation_result = await recovery.validate_database_state()
            assert validation_result["foreign_keys_enabled"] is True
            assert validation_result["wal_mode_enabled"] is True
            
        finally:
            await db_manager.close()
            os.unlink(db_path)


class TestDatabaseManagerErrorHandling:
    """Test error handling in DatabaseManager class."""
    
    @pytest.mark.asyncio
    async def test_initialize_with_invalid_path(self):
        """Test initialization with invalid database path."""
        db_manager = DatabaseManager("sqlite:/invalid/readonly/path/database.db")
        
        with pytest.raises((InitializationError, ConnectionError, DatabaseError)):
            await db_manager.initialize()
    
    @pytest.mark.asyncio
    async def test_get_connection_with_uninitialized_manager(self):
        """Test get_connection with uninitialized manager."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
            db_path = tmp.name
        
        db_manager = DatabaseManager(f"sqlite:{db_path}")
        
        try:
            # Should initialize automatically
            async with db_manager.get_connection() as conn:
                cursor = await conn.execute("SELECT 1")
                result = await cursor.fetchone()
                await cursor.close()
                assert result[0] == 1
        finally:
            await db_manager.close()
            os.unlink(db_path)
    
    @pytest.mark.asyncio
    async def test_health_check_with_connection_error(self):
        """Test health check with connection error."""
        db_manager = DatabaseManager("sqlite:/invalid/path/database.db")
        
        health_result = await db_manager.health_check()
        
        assert health_result["healthy"] is False
        assert health_result["status"] == "connection_failed"
        assert "error" in health_result
        assert "suggestion" in health_result
    
    @pytest.mark.asyncio
    async def test_close_with_no_connection(self):
        """Test closing manager with no active connection."""
        db_manager = DatabaseManager("sqlite:test.db")
        
        # Should not raise error
        await db_manager.close()
    
    @pytest.mark.asyncio
    async def test_error_recovery_property(self):
        """Test error recovery property access."""
        db_manager = DatabaseManager("sqlite:test.db")
        
        recovery1 = db_manager.error_recovery
        recovery2 = db_manager.error_recovery
        
        # Should return same instance
        assert recovery1 is recovery2
        assert isinstance(recovery1, DatabaseErrorRecovery)


class TestGlobalDatabaseFunctions:
    """Test global database management functions with error handling."""
    
    @pytest.mark.asyncio
    async def test_init_database_success(self):
        """Test successful global database initialization."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
            db_path = tmp.name
        
        try:
            db_manager = await init_database(f"sqlite:{db_path}")
            assert db_manager is not None
            
            # Test that global manager is accessible
            from database.connection import get_database_manager
            global_manager = get_database_manager()
            assert global_manager is db_manager
            
        finally:
            await close_database()
            os.unlink(db_path)
    
    @pytest.mark.asyncio
    async def test_init_database_failure(self):
        """Test global database initialization failure."""
        with pytest.raises((InitializationError, DatabaseError)):
            await init_database("sqlite:/invalid/readonly/path/database.db")
    
    @pytest.mark.asyncio
    async def test_close_database_success(self):
        """Test successful global database closure."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
            db_path = tmp.name
        
        try:
            await init_database(f"sqlite:{db_path}")
            await close_database()
            
            # Should raise error after closing
            from database.connection import get_database_manager
            with pytest.raises(RuntimeError):
                get_database_manager()
                
        finally:
            # Cleanup in case test fails
            try:
                await close_database()
            except:
                pass
            os.unlink(db_path)


class TestIntegrationScenarios:
    """Test integration scenarios with error handling."""
    
    @pytest.mark.asyncio
    async def test_connection_recovery_scenario(self):
        """Test complete connection recovery scenario."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
            db_path = tmp.name
        
        try:
            # Initialize database
            db_manager = await init_database(f"sqlite:{db_path}")
            
            # Verify initial health
            health = await db_manager.health_check()
            assert health["healthy"] is True
            
            # Simulate connection loss
            await db_manager.close()
            
            # Attempt recovery
            recovery_success = await db_manager.error_recovery.attempt_reconnection()
            assert recovery_success is True
            
            # Verify recovery
            health = await db_manager.health_check()
            assert health["healthy"] is True
            
        finally:
            await close_database()
            os.unlink(db_path)
    
    @pytest.mark.asyncio
    async def test_concurrent_operations_with_errors(self):
        """Test concurrent database operations with error handling."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
            db_path = tmp.name
        
        try:
            db_manager = await init_database(f"sqlite:{db_path}")
            
            @handle_database_errors(operation_name="concurrent_test")
            async def database_operation(operation_id: int):
                async with db_manager.get_connection() as conn:
                    cursor = await conn.execute("SELECT ?", (operation_id,))
                    result = await cursor.fetchone()
                    await cursor.close()
                    return result[0]
            
            # Run multiple concurrent operations
            tasks = [database_operation(i) for i in range(10)]
            results = await asyncio.gather(*tasks)
            
            assert results == list(range(10))
            
        finally:
            await close_database()
            os.unlink(db_path)
    
    @pytest.mark.asyncio
    async def test_error_handling_with_malformed_database(self):
        """Test error handling with corrupted database file."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
            # Write invalid data to create corrupted database
            tmp.write(b"This is not a valid SQLite database file")
            db_path = tmp.name
        
        try:
            db_manager = DatabaseManager(f"sqlite:{db_path}")
            
            with pytest.raises((ConnectionError, InitializationError)):
                await db_manager.initialize()
                
        finally:
            os.unlink(db_path)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])