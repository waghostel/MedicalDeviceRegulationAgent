"""
Unit tests for database connection manager
"""

import pytest
import pytest_asyncio
import asyncio
import tempfile
import os
from unittest.mock import patch, AsyncMock

from database.connection import DatabaseManager, init_database, close_database, get_database_manager


@pytest.fixture
def temp_database_path():
    """Create temporary database path for testing"""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
        db_path = tmp.name
    
    yield f"sqlite:{db_path}"
    
    try:
        os.unlink(db_path)
    except FileNotFoundError:
        pass


@pytest_asyncio.fixture
async def temp_database(temp_database_path):
    """Create temporary database for testing"""
    db_manager = DatabaseManager(temp_database_path)
    await db_manager.initialize()
    
    yield db_manager
    
    await db_manager.close()


class TestDatabaseManager:
    """Test cases for DatabaseManager class"""
    
    @pytest.mark.asyncio
    async def test_database_manager_initialization(self, temp_database):
        """Test database manager initializes correctly"""
        db_manager = temp_database
        
        # Test health check
        health = await db_manager.health_check()
        assert health["healthy"] is True
        assert health["status"] == "connected"
        assert "database_path" in health
        assert health["message"] == "Database connection successful"
    
    @pytest.mark.asyncio
    async def test_database_connection_context_manager(self, temp_database):
        """Test async context manager works correctly"""
        db_manager = temp_database
        
        async with db_manager.get_connection() as conn:
            cursor = await conn.execute("SELECT 1")
            result = await cursor.fetchone()
            await cursor.close()
            assert result[0] == 1
    
    @pytest.mark.asyncio
    async def test_concurrent_database_access(self, temp_database):
        """Test multiple concurrent database operations"""
        db_manager = temp_database
        
        async def query_database():
            async with db_manager.get_connection() as conn:
                cursor = await conn.execute("SELECT 1")
                result = await cursor.fetchone()
                await cursor.close()
                return result[0]
        
        # Run multiple concurrent queries
        tasks = [query_database() for _ in range(10)]
        results = await asyncio.gather(*tasks)
        
        assert all(result == 1 for result in results)
    
    @pytest.mark.asyncio
    async def test_database_manager_close(self, temp_database_path):
        """Test database manager closes properly"""
        db_manager = DatabaseManager(temp_database_path)
        await db_manager.initialize()
        
        # Verify connection is established
        health = await db_manager.health_check()
        assert health["healthy"] is True
        
        # Close the connection
        await db_manager.close()
        
        # Verify connection is closed (should reinitialize on next use)
        health = await db_manager.health_check()
        assert health["healthy"] is True  # Should reinitialize automatically
    
    @pytest.mark.asyncio
    async def test_database_manager_error_handling(self):
        """Test database manager handles errors gracefully"""
        # Test with invalid database path
        db_manager = DatabaseManager("sqlite:/invalid/path/database.db")
        
        health = await db_manager.health_check()
        assert health["healthy"] is False
        assert health["status"] == "disconnected"
        assert "error" in health
    
    @pytest.mark.asyncio
    async def test_database_manager_pragma_settings(self, temp_database):
        """Test that SQLite PRAGMA settings are applied correctly"""
        db_manager = temp_database
        
        async with db_manager.get_connection() as conn:
            # Check foreign keys are enabled
            cursor = await conn.execute("PRAGMA foreign_keys")
            result = await cursor.fetchone()
            await cursor.close()
            assert result[0] == 1  # Foreign keys should be ON
            
            # Check journal mode is WAL
            cursor = await conn.execute("PRAGMA journal_mode")
            result = await cursor.fetchone()
            await cursor.close()
            assert result[0].upper() == "WAL"


class TestGlobalDatabaseManager:
    """Test cases for global database manager functions"""
    
    @pytest.mark.asyncio
    async def test_init_database_function(self, temp_database_path):
        """Test init_database function works correctly"""
        # Initialize database
        db_manager = await init_database(temp_database_path)
        
        assert db_manager is not None
        
        # Test that get_database_manager returns the same instance
        global_manager = get_database_manager()
        assert global_manager is db_manager
        
        # Clean up
        await close_database()
    
    @pytest.mark.asyncio
    async def test_get_database_manager_not_initialized(self):
        """Test get_database_manager raises error when not initialized"""
        # Ensure no global manager exists
        await close_database()
        
        with pytest.raises(RuntimeError, match="Database manager not initialized"):
            get_database_manager()
    
    @pytest.mark.asyncio
    async def test_close_database_function(self, temp_database_path):
        """Test close_database function works correctly"""
        # Initialize database
        await init_database(temp_database_path)
        
        # Verify manager exists
        manager = get_database_manager()
        assert manager is not None
        
        # Close database
        await close_database()
        
        # Verify manager is cleared
        with pytest.raises(RuntimeError):
            get_database_manager()
    
    @pytest.mark.asyncio
    async def test_init_database_with_default_url(self):
        """Test init_database with default URL from environment"""
        with patch.dict(os.environ, {"DATABASE_URL": "sqlite:./test_default.db"}):
            db_manager = await init_database()
            
            assert db_manager is not None
            assert "test_default.db" in db_manager.database_path
            
            # Clean up
            await close_database()
            try:
                os.unlink("./test_default.db")
            except FileNotFoundError:
                pass


class TestDatabaseManagerThreadSafety:
    """Test cases for thread-safe initialization"""
    
    @pytest.mark.asyncio
    async def test_concurrent_initialization(self, temp_database_path):
        """Test concurrent initialization is thread-safe"""
        db_manager = DatabaseManager(temp_database_path)
        
        async def initialize_database():
            await db_manager.initialize()
            return True
        
        # Run multiple concurrent initializations
        tasks = [initialize_database() for _ in range(5)]
        results = await asyncio.gather(*tasks)
        
        # All should succeed
        assert all(results)
        
        # Verify database is properly initialized
        health = await db_manager.health_check()
        assert health["healthy"] is True
        
        await db_manager.close()
    
    @pytest.mark.asyncio
    async def test_concurrent_close(self, temp_database):
        """Test concurrent close operations are thread-safe"""
        db_manager = temp_database
        
        async def close_database_connection():
            await db_manager.close()
            return True
        
        # Run multiple concurrent close operations
        tasks = [close_database_connection() for _ in range(3)]
        results = await asyncio.gather(*tasks)
        
        # All should succeed without errors
        assert all(results)


class TestDatabaseManagerIntegration:
    """Integration tests for database manager with health checks"""
    
    @pytest.mark.asyncio
    async def test_health_check_integration(self, temp_database_path):
        """Test health check integration with database manager"""
        # Initialize global database manager
        await init_database(temp_database_path)
        
        # Import and test health check service
        from services.health_check import HealthCheckService
        
        health_service = HealthCheckService()
        result = await health_service.check_specific(['database'])
        
        assert 'database' in result['checks']
        assert result['checks']['database']['healthy'] is True
        assert result['checks']['database']['status'] == 'connected'
        assert isinstance(result['healthy'], bool)
        assert 'execution_time_ms' in result
        
        # Clean up
        await close_database()
    
    @pytest.mark.asyncio
    async def test_health_check_with_database_error(self):
        """Test health check handles database errors gracefully"""
        # Initialize with invalid database path - this should fail
        try:
            await init_database("sqlite:/invalid/path/database.db")
        except Exception:
            # Expected to fail, now test that health check handles it gracefully
            pass
        
        from services.health_check import HealthCheckService
        
        health_service = HealthCheckService()
        result = await health_service.check_specific(['database'])
        
        assert 'database' in result['checks']
        assert result['checks']['database']['healthy'] is False
        assert result['checks']['database']['status'] in ['disconnected', 'error']
        assert 'error' in result['checks']['database']
        
        # Clean up
        await close_database()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])