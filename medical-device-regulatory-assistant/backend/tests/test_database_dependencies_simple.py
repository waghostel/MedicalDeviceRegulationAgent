"""
Simple integration tests for FastAPI database dependencies.
"""

import pytest
import tempfile
import os
import asyncio
from unittest.mock import patch
from fastapi import HTTPException

from database.dependencies import (
    get_db_connection,
    DatabaseDependency,
    get_db_session,
    get_manual_db_connection
)
from database.connection import init_database, close_database


class TestDatabaseDependenciesSimple:
    """Simple test suite for database dependency injection."""
    
    def setup_method(self):
        """Setup for each test method."""
        # Ensure clean state
        asyncio.run(self._cleanup())
    
    def teardown_method(self):
        """Teardown for each test method."""
        # Cleanup after each test
        asyncio.run(self._cleanup())
    
    async def _cleanup(self):
        """Helper to cleanup database state."""
        try:
            await close_database()
        except:
            pass
    
    @pytest.mark.asyncio
    async def test_get_db_connection_without_initialization(self):
        """Test database connection dependency when not initialized."""
        # Ensure database is not initialized
        await self._cleanup()
        
        # Try to get connection without initialization
        with pytest.raises(HTTPException) as exc_info:
            async for conn in get_db_connection():
                pass
        
        assert exc_info.value.status_code == 503
        assert "manager not initialized" in exc_info.value.detail
    
    @pytest.mark.asyncio
    async def test_get_db_connection_with_initialization(self):
        """Test successful database connection dependency."""
        # Create temporary database
        temp_fd, temp_path = tempfile.mkstemp(suffix='.db')
        os.close(temp_fd)
        
        try:
            # Initialize database
            await init_database(f"sqlite:{temp_path}")
            
            # Test the dependency function
            connection_count = 0
            async for conn in get_db_connection():
                connection_count += 1
                assert conn is not None
                
                # Test that we can execute queries
                cursor = await conn.execute("SELECT 1 as test")
                result = await cursor.fetchone()
                await cursor.close()
                
                assert result[0] == 1
                break  # Only test first yield
            
            assert connection_count == 1
            
        finally:
            await close_database()
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    @pytest.mark.asyncio
    async def test_class_based_dependency(self):
        """Test class-based database dependency."""
        # Create temporary database
        temp_fd, temp_path = tempfile.mkstemp(suffix='.db')
        os.close(temp_fd)
        
        try:
            # Initialize database
            await init_database(f"sqlite:{temp_path}")
            
            # Create test table
            async for conn in get_db_connection():
                await conn.execute("""
                    CREATE TABLE test_table (
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
                cursor = await conn.execute("INSERT INTO test_table (name, value) VALUES (?, ?)", ("test", 42))
                await cursor.close()
                
                cursor = await conn.execute("SELECT name, value FROM test_table WHERE name = ?", ("test",))
                result = await cursor.fetchone()
                await cursor.close()
                
                assert result[0] == "test"
                assert result[1] == 42
                break
            
        finally:
            await close_database()
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    @pytest.mark.asyncio
    async def test_class_based_dependency_health_check(self):
        """Test health check functionality."""
        # Create temporary database
        temp_fd, temp_path = tempfile.mkstemp(suffix='.db')
        os.close(temp_fd)
        
        try:
            # Initialize database
            await init_database(f"sqlite:{temp_path}")
            
            dependency = DatabaseDependency()
            
            # Test successful health check
            is_healthy = await dependency.health_check()
            assert is_healthy is True
            
        finally:
            await close_database()
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    @pytest.mark.asyncio
    async def test_class_based_dependency_health_check_failure(self):
        """Test health check when database is unavailable."""
        # Ensure no database is initialized
        await self._cleanup()
        
        dependency = DatabaseDependency()
        is_healthy = await dependency.health_check()
        assert is_healthy is False
    
    @pytest.mark.asyncio
    async def test_legacy_get_db_session_compatibility(self):
        """Test legacy get_db_session function."""
        # Create temporary database
        temp_fd, temp_path = tempfile.mkstemp(suffix='.db')
        os.close(temp_fd)
        
        try:
            # Initialize database
            await init_database(f"sqlite:{temp_path}")
            
            async for conn in get_db_session():
                assert conn is not None
                
                # Verify it works like a normal connection
                cursor = await conn.execute("SELECT 1")
                result = await cursor.fetchone()
                await cursor.close()
                
                assert result[0] == 1
                break
            
        finally:
            await close_database()
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    @pytest.mark.asyncio
    async def test_error_handling_with_mock(self):
        """Test error handling with mocked database manager."""
        with patch('database.dependencies.get_database_manager') as mock_get_manager:
            mock_get_manager.side_effect = RuntimeError("Manager not initialized")
            
            with pytest.raises(HTTPException) as exc_info:
                async for conn in get_db_connection():
                    pass
            
            assert exc_info.value.status_code == 503
            assert "manager not initialized" in exc_info.value.detail


if __name__ == "__main__":
    pytest.main([__file__, "-v"])