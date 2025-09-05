"""
Comprehensive database integration tests for the Medical Device Regulatory Assistant.

This test suite covers:
- Database manager initialization, connection management, and cleanup
- Concurrent database access and connection pooling
- Health check functionality with both successful and failure scenarios
- FastAPI dependency injection with database connections
- Error handling and recovery scenarios
- Integration with health check service

Requirements covered: 1.1, 1.2, 1.3, 1.4, 1.5
"""

import pytest
import pytest_asyncio
import asyncio
import tempfile
import os
import time
from unittest.mock import patch, AsyncMock, MagicMock
from typing import List, Dict, Any
from contextlib import asynccontextmanager

# Import database components
from database.connection import (
    DatabaseManager,
    init_database,
    close_database,
    get_database_manager,
    get_db_session
)
from database.dependencies import (
    get_db_connection,
    DatabaseDependency,
    get_db_session as dep_get_db_session
)
from database.exceptions import (
    DatabaseError,
    ConnectionError,
    AsyncContextError,
    HealthCheckError,
    InitializationError
)

# Import health check service
from services.health_check import HealthCheckService

# Import FastAPI components for testing
from fastapi import HTTPException


class TestDatabaseManagerIntegration:
    """Comprehensive tests for DatabaseManager initialization, connection management, and cleanup."""
    
    @pytest.fixture
    def temp_database_path(self):
        """Create temporary database path for testing."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
            db_path = tmp.name
        
        yield f"sqlite:{db_path}"
        
        try:
            os.unlink(db_path)
        except FileNotFoundError:
            pass
    
    @pytest_asyncio.fixture
    async def temp_database_manager(self, temp_database_path):
        """Create temporary database manager for testing."""
        db_manager = DatabaseManager(temp_database_path)
        await db_manager.initialize()
        
        yield db_manager
        
        await db_manager.close()
    
    @pytest.mark.asyncio
    async def test_database_manager_initialization_success(self, temp_database_path):
        """Test successful database manager initialization."""
        db_manager = DatabaseManager(temp_database_path)
        
        # Test initialization
        await db_manager.initialize()
        
        # Verify connection is established
        assert db_manager._connection is not None
        
        # Test basic functionality
        async with db_manager.get_connection() as conn:
            cursor = await conn.execute("SELECT 1")
            result = await cursor.fetchone()
            await cursor.close()
            assert result[0] == 1
        
        # Test health check
        health = await db_manager.health_check()
        assert health["healthy"] is True
        assert health["status"] == "connected"
        assert "database_path" in health
        
        # Cleanup
        await db_manager.close()
    
    @pytest.mark.asyncio
    async def test_database_manager_initialization_failure(self):
        """Test database manager initialization with invalid path."""
        # Test with invalid database path
        db_manager = DatabaseManager("sqlite:/invalid/nonexistent/path/database.db")
        
        # The error handling decorator converts InitializationError to DatabaseError
        with pytest.raises((InitializationError, DatabaseError)):
            await db_manager.initialize()
    
    @pytest.mark.asyncio
    async def test_database_manager_connection_management(self, temp_database_manager):
        """Test database connection management and context manager behavior."""
        db_manager = temp_database_manager
        
        # Test multiple sequential connections
        for i in range(5):
            async with db_manager.get_connection() as conn:
                cursor = await conn.execute("SELECT ? as iteration", (i,))
                result = await cursor.fetchone()
                await cursor.close()
                assert result[0] == i
        
        # Test nested connections (should reuse same connection)
        async with db_manager.get_connection() as conn1:
            cursor1 = await conn1.execute("CREATE TEMPORARY TABLE test_nested (id INTEGER)")
            await cursor1.close()
            
            async with db_manager.get_connection() as conn2:
                # Should be the same connection
                cursor2 = await conn2.execute("INSERT INTO test_nested (id) VALUES (1)")
                await cursor2.close()
                
                cursor3 = await conn2.execute("SELECT COUNT(*) FROM test_nested")
                result = await cursor3.fetchone()
                await cursor3.close()
                assert result[0] == 1
    
    @pytest.mark.asyncio
    async def test_database_manager_cleanup(self, temp_database_path):
        """Test database manager cleanup and resource management."""
        db_manager = DatabaseManager(temp_database_path)
        await db_manager.initialize()
        
        # Verify connection exists
        assert db_manager._connection is not None
        
        # Test cleanup
        await db_manager.close()
        assert db_manager._connection is None
        
        # Test that operations after close reinitialize connection
        health = await db_manager.health_check()
        assert health["healthy"] is True
        
        # Final cleanup
        await db_manager.close()
    
    @pytest.mark.asyncio
    async def test_database_manager_error_recovery(self, temp_database_manager):
        """Test database manager error handling and recovery."""
        db_manager = temp_database_manager
        
        # Test recovery from connection issues
        original_connection = db_manager._connection
        
        # Simulate connection loss by closing the connection directly
        await original_connection.close()
        
        # The next operation should detect the broken connection and recover
        async with db_manager.get_connection() as conn:
            cursor = await conn.execute("SELECT 1")
            result = await cursor.fetchone()
            await cursor.close()
            assert result[0] == 1
        
        # Verify new connection was established
        assert db_manager._connection is not original_connection


class TestConcurrentDatabaseAccess:
    """Test concurrent database access and connection pooling behavior."""
    
    @pytest.fixture
    def temp_database_path(self):
        """Create temporary database path for testing."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
            db_path = tmp.name
        
        yield f"sqlite:{db_path}"
        
        try:
            os.unlink(db_path)
        except FileNotFoundError:
            pass
    
    @pytest_asyncio.fixture
    async def shared_database_manager(self, temp_database_path):
        """Create shared database manager for concurrent testing."""
        db_manager = DatabaseManager(temp_database_path)
        await db_manager.initialize()
        
        # Create test table for concurrent operations
        async with db_manager.get_connection() as conn:
            await conn.execute("""
                CREATE TABLE concurrent_test (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    worker_id INTEGER,
                    operation_time REAL,
                    data TEXT
                )
            """)
            await conn.commit()
        
        yield db_manager
        
        await db_manager.close()
    
    @pytest.mark.asyncio
    async def test_concurrent_read_operations(self, shared_database_manager):
        """Test multiple concurrent read operations."""
        db_manager = shared_database_manager
        
        async def read_worker(worker_id: int) -> Dict[str, Any]:
            start_time = time.time()
            results = []
            
            for i in range(10):
                async with db_manager.get_connection() as conn:
                    cursor = await conn.execute("SELECT ? as worker_id, ? as iteration", (worker_id, i))
                    result = await cursor.fetchone()
                    await cursor.close()
                    results.append(result)
            
            return {
                "worker_id": worker_id,
                "results_count": len(results),
                "execution_time": time.time() - start_time
            }
        
        # Run 10 concurrent read workers
        tasks = [read_worker(i) for i in range(10)]
        results = await asyncio.gather(*tasks)
        
        # Verify all workers completed successfully
        assert len(results) == 10
        for result in results:
            assert result["results_count"] == 10
            assert result["execution_time"] > 0
    
    @pytest.mark.asyncio
    async def test_concurrent_write_operations(self, shared_database_manager):
        """Test multiple concurrent write operations."""
        db_manager = shared_database_manager
        
        async def write_worker(worker_id: int) -> Dict[str, Any]:
            start_time = time.time()
            operations_completed = 0
            
            for i in range(5):
                async with db_manager.get_connection() as conn:
                    cursor = await conn.execute(
                        "INSERT INTO concurrent_test (worker_id, operation_time, data) VALUES (?, ?, ?)",
                        (worker_id, time.time(), f"data_{worker_id}_{i}")
                    )
                    await cursor.close()
                    await conn.commit()
                    operations_completed += 1
            
            return {
                "worker_id": worker_id,
                "operations_completed": operations_completed,
                "execution_time": time.time() - start_time
            }
        
        # Run 5 concurrent write workers
        tasks = [write_worker(i) for i in range(5)]
        results = await asyncio.gather(*tasks)
        
        # Verify all workers completed successfully
        assert len(results) == 5
        for result in results:
            assert result["operations_completed"] == 5
        
        # Verify all data was written
        async with db_manager.get_connection() as conn:
            cursor = await conn.execute("SELECT COUNT(*) FROM concurrent_test")
            count_result = await cursor.fetchone()
            await cursor.close()
            assert count_result[0] == 25  # 5 workers * 5 operations each
    
    @pytest.mark.asyncio
    async def test_concurrent_mixed_operations(self, shared_database_manager):
        """Test mixed concurrent read and write operations."""
        db_manager = shared_database_manager
        
        async def mixed_worker(worker_id: int, operation_type: str) -> Dict[str, Any]:
            start_time = time.time()
            operations = 0
            
            for i in range(3):
                async with db_manager.get_connection() as conn:
                    if operation_type == "read":
                        cursor = await conn.execute("SELECT COUNT(*) FROM concurrent_test")
                        await cursor.fetchone()
                        await cursor.close()
                    else:  # write
                        cursor = await conn.execute(
                            "INSERT INTO concurrent_test (worker_id, operation_time, data) VALUES (?, ?, ?)",
                            (worker_id, time.time(), f"mixed_{worker_id}_{i}")
                        )
                        await cursor.close()
                        await conn.commit()
                    operations += 1
            
            return {
                "worker_id": worker_id,
                "operation_type": operation_type,
                "operations": operations,
                "execution_time": time.time() - start_time
            }
        
        # Create mixed workload: 3 readers and 2 writers
        tasks = []
        tasks.extend([mixed_worker(i, "read") for i in range(3)])
        tasks.extend([mixed_worker(i + 10, "write") for i in range(2)])
        
        results = await asyncio.gather(*tasks)
        
        # Verify all workers completed
        assert len(results) == 5
        read_results = [r for r in results if r["operation_type"] == "read"]
        write_results = [r for r in results if r["operation_type"] == "write"]
        
        assert len(read_results) == 3
        assert len(write_results) == 2
        
        for result in results:
            assert result["operations"] == 3
    
    @pytest.mark.asyncio
    async def test_connection_pooling_behavior(self, shared_database_manager):
        """Test connection pooling and reuse behavior."""
        db_manager = shared_database_manager
        
        # Track connection objects to verify reuse
        connection_objects = set()
        
        async def connection_tracker(worker_id: int):
            async with db_manager.get_connection() as conn:
                connection_objects.add(id(conn))
                await asyncio.sleep(0.1)  # Hold connection briefly
                cursor = await conn.execute("SELECT ? as worker", (worker_id,))
                result = await cursor.fetchone()
                await cursor.close()
                return result[0]
        
        # Run multiple workers that should reuse the same connection
        tasks = [connection_tracker(i) for i in range(10)]
        results = await asyncio.gather(*tasks)
        
        # Verify all operations completed
        assert len(results) == 10
        assert results == list(range(10))
        
        # With SQLite and our current implementation, we expect connection reuse
        # (single connection shared across operations)
        assert len(connection_objects) == 1


class TestHealthCheckIntegration:
    """Test health check functionality with both successful and failure scenarios."""
    
    @pytest.fixture
    def temp_database_path(self):
        """Create temporary database path for testing."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
            db_path = tmp.name
        
        yield f"sqlite:{db_path}"
        
        try:
            os.unlink(db_path)
        except FileNotFoundError:
            pass
    
    @pytest.mark.asyncio
    async def test_health_check_success_scenario(self, temp_database_path):
        """Test health check with successful database connection."""
        # Initialize global database manager
        await init_database(temp_database_path)
        
        try:
            # Test direct database manager health check
            db_manager = get_database_manager()
            health_result = await db_manager.health_check()
            
            assert health_result["healthy"] is True
            assert health_result["status"] == "connected"
            assert "database_path" in health_result
            assert health_result["message"] == "Database connection successful"
            
            # Test health check service integration
            health_service = HealthCheckService()
            service_result = await health_service.check_specific(['database'])
            
            assert service_result.healthy is True
            assert 'database' in service_result.checks
            assert service_result.checks['database'].healthy is True
            assert service_result.checks['database'].status == 'connected'
            assert service_result.checks['database'].execution_time_ms > 0
            
        finally:
            await close_database()
    
    @pytest.mark.asyncio
    async def test_health_check_failure_scenarios(self):
        """Test health check with various failure scenarios."""
        # Scenario 1: Database manager not initialized
        await close_database()  # Ensure clean state
        
        health_service = HealthCheckService()
        result = await health_service.check_specific(['database'])
        
        assert result.healthy is False
        assert 'database' in result.checks
        assert result.checks['database'].healthy is False
        assert result.checks['database'].status == 'error'
        assert 'error' in result.checks['database'].model_dump()
        
        # Scenario 2: Invalid database path
        try:
            await init_database("sqlite:/invalid/path/database.db")
        except Exception:
            pass  # Expected to fail
        
        result = await health_service.check_specific(['database'])
        assert result.healthy is False
        assert result.checks['database'].healthy is False
    
    @pytest.mark.asyncio
    async def test_health_check_performance_monitoring(self, temp_database_path):
        """Test health check performance and timing."""
        await init_database(temp_database_path)
        
        try:
            health_service = HealthCheckService()
            
            # Run multiple health checks and measure performance
            execution_times = []
            
            for _ in range(5):
                start_time = time.time()
                result = await health_service.check_specific(['database'])
                execution_time = time.time() - start_time
                
                execution_times.append(execution_time)
                
                assert result.healthy is True
                assert result.checks['database'].execution_time_ms > 0
                # Health check should complete quickly (under 1 second)
                assert execution_time < 1.0
            
            # Verify consistent performance
            avg_time = sum(execution_times) / len(execution_times)
            assert avg_time < 0.5  # Average should be under 500ms
            
        finally:
            await close_database()
    
    @pytest.mark.asyncio
    async def test_health_check_concurrent_execution(self, temp_database_path):
        """Test concurrent health check execution."""
        await init_database(temp_database_path)
        
        try:
            health_service = HealthCheckService()
            
            async def run_health_check(check_id: int):
                result = await health_service.check_specific(['database'])
                return {
                    "check_id": check_id,
                    "healthy": result.healthy,
                    "execution_time": result.checks['database'].execution_time_ms
                }
            
            # Run 10 concurrent health checks
            tasks = [run_health_check(i) for i in range(10)]
            results = await asyncio.gather(*tasks)
            
            # Verify all health checks succeeded
            assert len(results) == 10
            for result in results:
                assert result["healthy"] is True
                assert result["execution_time"] > 0
            
        finally:
            await close_database()
    
    @pytest.mark.asyncio
    async def test_health_check_error_recovery(self, temp_database_path):
        """Test health check error recovery capabilities."""
        await init_database(temp_database_path)
        
        try:
            db_manager = get_database_manager()
            health_service = HealthCheckService()
            
            # Verify initial healthy state
            result = await health_service.check_specific(['database'])
            assert result.healthy is True
            
            # Simulate connection issue by closing the connection
            if db_manager._connection:
                await db_manager._connection.close()
            
            # Health check should detect and recover from the issue
            result = await health_service.check_specific(['database'])
            # Should still be healthy due to automatic reconnection
            assert result.healthy is True
            
        finally:
            await close_database()


class TestFastAPIDependencyIntegration:
    """Test FastAPI dependency injection with database connections."""
    
    @pytest.fixture
    def temp_database_path(self):
        """Create temporary database path for testing."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
            db_path = tmp.name
        
        yield f"sqlite:{db_path}"
        
        try:
            os.unlink(db_path)
        except FileNotFoundError:
            pass
    
    @pytest.mark.asyncio
    async def test_get_db_connection_dependency_success(self, temp_database_path):
        """Test successful database connection dependency."""
        await init_database(temp_database_path)
        
        try:
            # Test the dependency function
            connection_count = 0
            async for conn in get_db_connection():
                connection_count += 1
                assert conn is not None
                
                # Test database operations
                cursor = await conn.execute("SELECT 1 as test")
                result = await cursor.fetchone()
                await cursor.close()
                
                assert result[0] == 1
                break  # Only test first yield
            
            assert connection_count == 1
            
        finally:
            await close_database()
    
    @pytest.mark.asyncio
    async def test_get_db_connection_dependency_failure(self):
        """Test database connection dependency failure handling."""
        # Ensure no database is initialized
        await close_database()
        
        # Try to get connection without initialization
        with pytest.raises(HTTPException) as exc_info:
            async for conn in get_db_connection():
                pass
        
        assert exc_info.value.status_code == 503
        assert "manager not initialized" in exc_info.value.detail
    
    @pytest.mark.asyncio
    async def test_class_based_dependency_success(self, temp_database_path):
        """Test class-based database dependency."""
        await init_database(temp_database_path)
        
        try:
            # Create test table
            async for conn in get_db_connection():
                await conn.execute("""
                    CREATE TABLE dependency_test (
                        id INTEGER PRIMARY KEY,
                        name TEXT NOT NULL,
                        value INTEGER
                    )
                """)
                await conn.commit()
                break
            
            # Test class-based dependency
            dependency = DatabaseDependency()
            
            async for conn in dependency():
                assert conn is not None
                
                # Test database operations
                cursor = await conn.execute(
                    "INSERT INTO dependency_test (name, value) VALUES (?, ?)",
                    ("test_item", 42)
                )
                await cursor.close()
                await conn.commit()
                
                cursor = await conn.execute(
                    "SELECT name, value FROM dependency_test WHERE name = ?",
                    ("test_item",)
                )
                result = await cursor.fetchone()
                await cursor.close()
                
                assert result[0] == "test_item"
                assert result[1] == 42
                break
            
        finally:
            await close_database()
    
    @pytest.mark.asyncio
    async def test_class_based_dependency_health_check(self, temp_database_path):
        """Test class-based dependency health check functionality."""
        await init_database(temp_database_path)
        
        try:
            dependency = DatabaseDependency()
            
            # Test successful health check
            is_healthy = await dependency.health_check()
            assert is_healthy is True
            
        finally:
            await close_database()
    
    @pytest.mark.asyncio
    async def test_dependency_concurrent_usage(self, temp_database_path):
        """Test concurrent usage of database dependencies."""
        await init_database(temp_database_path)
        
        try:
            # Create test table
            async for conn in get_db_connection():
                await conn.execute("""
                    CREATE TABLE concurrent_dependency_test (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        worker_id INTEGER,
                        timestamp REAL
                    )
                """)
                await conn.commit()
                break
            
            async def dependency_worker(worker_id: int):
                async for conn in get_db_connection():
                    cursor = await conn.execute(
                        "INSERT INTO concurrent_dependency_test (worker_id, timestamp) VALUES (?, ?)",
                        (worker_id, time.time())
                    )
                    await cursor.close()
                    await conn.commit()
                    
                    cursor = await conn.execute(
                        "SELECT COUNT(*) FROM concurrent_dependency_test WHERE worker_id = ?",
                        (worker_id,)
                    )
                    result = await cursor.fetchone()
                    await cursor.close()
                    
                    return result[0]
            
            # Run multiple concurrent workers
            tasks = [dependency_worker(i) for i in range(5)]
            results = await asyncio.gather(*tasks)
            
            # Verify all workers completed successfully
            assert len(results) == 5
            assert all(count == 1 for count in results)
            
            # Verify total records
            async for conn in get_db_connection():
                cursor = await conn.execute("SELECT COUNT(*) FROM concurrent_dependency_test")
                total_count = await cursor.fetchone()
                await cursor.close()
                assert total_count[0] == 5
                break
            
        finally:
            await close_database()
    
    @pytest.mark.asyncio
    async def test_legacy_compatibility_functions(self, temp_database_path):
        """Test legacy compatibility functions."""
        await init_database(temp_database_path)
        
        try:
            # Test legacy get_db_session function
            async for conn in dep_get_db_session():
                assert conn is not None
                
                cursor = await conn.execute("SELECT 1")
                result = await cursor.fetchone()
                await cursor.close()
                
                assert result[0] == 1
                break
            
            # Test get_db_session from connection module
            async with get_db_session() as conn:
                cursor = await conn.execute("SELECT 2")
                result = await cursor.fetchone()
                await cursor.close()
                
                assert result[0] == 2
            
        finally:
            await close_database()


class TestErrorHandlingAndRecovery:
    """Test comprehensive error handling and recovery scenarios."""
    
    @pytest.fixture
    def temp_database_path(self):
        """Create temporary database path for testing."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
            db_path = tmp.name
        
        yield f"sqlite:{db_path}"
        
        try:
            os.unlink(db_path)
        except FileNotFoundError:
            pass
    
    @pytest.mark.asyncio
    async def test_connection_error_recovery(self, temp_database_path):
        """Test recovery from connection errors."""
        db_manager = DatabaseManager(temp_database_path)
        await db_manager.initialize()
        
        try:
            # Verify initial connection works
            async with db_manager.get_connection() as conn:
                cursor = await conn.execute("SELECT 1")
                result = await cursor.fetchone()
                await cursor.close()
                assert result[0] == 1
            
            # Simulate connection loss
            original_connection = db_manager._connection
            await original_connection.close()
            
            # Next operation should detect broken connection and recover
            async with db_manager.get_connection() as conn:
                cursor = await conn.execute("SELECT 2")
                result = await cursor.fetchone()
                await cursor.close()
                assert result[0] == 2
            
            # Verify new connection was established
            assert db_manager._connection is not original_connection
            
        finally:
            await db_manager.close()
    
    @pytest.mark.asyncio
    async def test_initialization_error_handling(self):
        """Test handling of initialization errors."""
        # Test with completely invalid path
        db_manager = DatabaseManager("sqlite:/invalid/nonexistent/path/database.db")
        
        # The error handling decorator converts InitializationError to DatabaseError
        with pytest.raises((InitializationError, DatabaseError)):
            await db_manager.initialize()
        
        # Test health check after failed initialization
        health_result = await db_manager.health_check()
        assert health_result["healthy"] is False
        assert health_result["status"] == "connection_failed"
        assert "error" in health_result
    
    @pytest.mark.asyncio
    async def test_async_context_manager_error_handling(self, temp_database_path):
        """Test async context manager error handling."""
        db_manager = DatabaseManager(temp_database_path)
        await db_manager.initialize()
        
        try:
            # Test error within context manager
            with pytest.raises(Exception):
                async with db_manager.get_connection() as conn:
                    # Simulate an error during operation
                    raise RuntimeError("Simulated operation error")
            
            # Verify connection is still usable after error
            async with db_manager.get_connection() as conn:
                cursor = await conn.execute("SELECT 1")
                result = await cursor.fetchone()
                await cursor.close()
                assert result[0] == 1
            
        finally:
            await db_manager.close()
    
    @pytest.mark.asyncio
    async def test_error_recovery_utility(self, temp_database_path):
        """Test database error recovery utility functions."""
        db_manager = DatabaseManager(temp_database_path)
        await db_manager.initialize()
        
        try:
            error_recovery = db_manager.error_recovery
            
            # Test database state validation
            validation_result = await error_recovery.validate_database_state()
            
            assert validation_result["connection_valid"] is True
            assert validation_result["schema_valid"] is True
            assert validation_result["foreign_keys_enabled"] is True
            assert validation_result["wal_mode_enabled"] is True
            assert len(validation_result["errors"]) == 0
            
            # Test configuration repair (should succeed even if not needed)
            repair_result = await error_recovery.repair_database_configuration()
            assert repair_result is True
            
        finally:
            await db_manager.close()
    
    @pytest.mark.asyncio
    async def test_global_manager_error_scenarios(self, temp_database_path):
        """Test error scenarios with global database manager."""
        # Ensure clean state first
        await close_database()
        
        # Test initialization with invalid path
        # The error handling decorator converts InitializationError to ConnectionError
        with pytest.raises((InitializationError, ConnectionError, DatabaseError)):
            await init_database("sqlite:/invalid/path/database.db")
        
        # After failed initialization, the manager exists but is not properly initialized
        # So we need to clean it up manually for this test
        await close_database()
        
        # Now verify manager is not set after cleanup
        with pytest.raises(RuntimeError):
            get_database_manager()
        
        # Test successful initialization after failure
        await init_database(temp_database_path)
        
        # Verify manager is now available
        manager = get_database_manager()
        assert manager is not None
        
        # Test health check works
        health = await manager.health_check()
        assert health["healthy"] is True
        
        # Cleanup
        await close_database()


class TestIntegrationWithHealthCheckService:
    """Test complete integration with health check service."""
    
    @pytest.fixture
    def temp_database_path(self):
        """Create temporary database path for testing."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
            db_path = tmp.name
        
        yield f"sqlite:{db_path}"
        
        try:
            os.unlink(db_path)
        except FileNotFoundError:
            pass
    
    @pytest.mark.asyncio
    async def test_complete_health_check_integration(self, temp_database_path):
        """Test complete integration between database and health check service."""
        await init_database(temp_database_path)
        
        try:
            health_service = HealthCheckService()
            
            # Test only database health check to avoid Redis/FDA API dependencies
            db_only_result = await health_service.check_specific(['database'])
            
            assert db_only_result.healthy is True
            assert len(db_only_result.checks) == 1
            assert 'database' in db_only_result.checks
            assert db_only_result.checks['database'].healthy is True
            assert db_only_result.checks['database'].status == 'connected'
            assert db_only_result.service == 'medical-device-regulatory-assistant'
            assert db_only_result.version == '0.1.0'
            assert db_only_result.execution_time_ms > 0
            
        finally:
            await close_database()
    
    @pytest.mark.asyncio
    async def test_health_check_service_error_handling(self):
        """Test health check service error handling with database issues."""
        # Ensure no database is initialized
        await close_database()
        
        health_service = HealthCheckService()
        
        # Test health check with uninitialized database
        result = await health_service.check_all()
        
        assert result.healthy is False
        assert 'database' in result.checks
        assert result.checks['database'].healthy is False
        assert result.checks['database'].status == 'error'
        assert 'error' in result.checks['database'].model_dump()
    
    @pytest.mark.asyncio
    async def test_health_check_service_performance_with_database(self, temp_database_path):
        """Test health check service performance with database operations."""
        await init_database(temp_database_path)
        
        try:
            health_service = HealthCheckService()
            
            # Run multiple health checks and measure performance
            start_time = time.time()
            
            for _ in range(10):
                result = await health_service.check_specific(['database'])
                assert result.healthy is True
            
            total_time = time.time() - start_time
            
            # 10 health checks should complete quickly
            assert total_time < 5.0  # Should complete in under 5 seconds
            
            # Average time per check should be reasonable
            avg_time = total_time / 10
            assert avg_time < 0.5  # Average under 500ms per check
            
        finally:
            await close_database()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])