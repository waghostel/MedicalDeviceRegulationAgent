"""
Integration tests for FastAPI application lifespan management.

Tests startup and shutdown procedures, service initialization order,
and error handling during application lifecycle events.
"""

import asyncio
import os
import pytest
import tempfile
from unittest.mock import AsyncMock, patch, MagicMock
from contextlib import asynccontextmanager
from fastapi.testclient import TestClient

# Import the main application
from main import app, lifespan


class TestApplicationLifespan:
    """Test suite for application lifespan management"""
    
    @pytest.fixture
    def temp_db_path(self):
        """Create a temporary database file for testing"""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tmp:
            yield tmp.name
        # Cleanup
        if os.path.exists(tmp.name):
            os.unlink(tmp.name)
    
    @pytest.fixture
    def mock_env_vars(self, temp_db_path):
        """Mock environment variables for testing"""
        env_vars = {
            "DATABASE_URL": f"sqlite:{temp_db_path}",
            "REDIS_URL": "redis://localhost:6379",
            "FDA_API_KEY": "test_api_key",
            "LOG_TO_FILE": "false"
        }
        
        with patch.dict(os.environ, env_vars):
            yield env_vars
    
    @pytest.mark.asyncio
    async def test_successful_startup_and_shutdown(self, mock_env_vars):
        """Test successful application startup and shutdown with all services"""
        
        # Mock all service initialization functions
        with patch("database.connection.init_database") as mock_init_db, \
             patch("services.cache.init_redis") as mock_init_redis, \
             patch("services.cache.get_redis_client") as mock_get_redis, \
             patch("services.openfda.create_openfda_service") as mock_create_fda, \
             patch("database.connection.close_database") as mock_close_db, \
             patch("services.cache.close_redis_client") as mock_close_redis:
            
            # Setup mocks for successful initialization
            mock_db_manager = AsyncMock()
            mock_init_db.return_value = mock_db_manager
            
            mock_redis_client = AsyncMock()
            mock_get_redis.return_value = mock_redis_client
            
            mock_fda_service = AsyncMock()
            mock_create_fda.return_value = mock_fda_service
            
            # Create a mock FastAPI app state
            mock_app = MagicMock()
            mock_app.state = MagicMock()
            
            # Test the lifespan context manager
            async with lifespan(mock_app):
                # Verify startup calls
                mock_init_db.assert_called_once()
                mock_init_redis.assert_called_once()
                mock_create_fda.assert_called_once()
                
                # Verify app state is set
                assert hasattr(mock_app.state, 'db_manager')
                assert hasattr(mock_app.state, 'fda_service')
            
            # Verify shutdown calls
            mock_fda_service.close.assert_called_once()
            mock_close_redis.assert_called_once()
            mock_close_db.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_database_initialization_failure(self, mock_env_vars):
        """Test application startup failure when database initialization fails"""
        
        with patch("database.connection.init_database") as mock_init_db:
            # Mock database initialization failure
            mock_init_db.side_effect = Exception("Database connection failed")
            
            mock_app = MagicMock()
            mock_app.state = MagicMock()
            
            # Test that startup fails with database error
            with pytest.raises(RuntimeError, match="Critical service initialization failed"):
                async with lifespan(mock_app):
                    pass
    
    @pytest.mark.asyncio
    async def test_fda_service_initialization_failure(self, mock_env_vars):
        """Test application startup failure when FDA service initialization fails"""
        
        with patch("database.connection.init_database") as mock_init_db, \
             patch("services.cache.init_redis") as mock_init_redis, \
             patch("services.cache.get_redis_client") as mock_get_redis, \
             patch("services.openfda.create_openfda_service") as mock_create_fda, \
             patch("database.connection.close_database") as mock_close_db:
            
            # Setup successful database and Redis initialization
            mock_db_manager = AsyncMock()
            mock_init_db.return_value = mock_db_manager
            
            mock_redis_client = AsyncMock()
            mock_get_redis.return_value = mock_redis_client
            
            # Mock FDA service initialization failure
            mock_create_fda.side_effect = Exception("FDA API connection failed")
            
            mock_app = MagicMock()
            mock_app.state = MagicMock()
            
            # Test that startup fails with FDA service error
            with pytest.raises(RuntimeError, match="Critical service initialization failed"):
                async with lifespan(mock_app):
                    pass
            
            # Verify database cleanup is called even on startup failure
            mock_close_db.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_redis_optional_failure(self, mock_env_vars):
        """Test that Redis initialization failure doesn't prevent startup"""
        
        with patch("database.connection.init_database") as mock_init_db, \
             patch("services.cache.init_redis") as mock_init_redis, \
             patch("services.cache.get_redis_client") as mock_get_redis, \
             patch("services.openfda.create_openfda_service") as mock_create_fda, \
             patch("database.connection.close_database") as mock_close_db, \
             patch("services.cache.close_redis_client") as mock_close_redis:
            
            # Setup successful database initialization
            mock_db_manager = AsyncMock()
            mock_init_db.return_value = mock_db_manager
            
            # Mock Redis initialization failure
            mock_init_redis.side_effect = Exception("Redis connection failed")
            mock_get_redis.return_value = None
            
            # Setup successful FDA service initialization
            mock_fda_service = AsyncMock()
            mock_create_fda.return_value = mock_fda_service
            
            mock_app = MagicMock()
            mock_app.state = MagicMock()
            
            # Test that startup succeeds despite Redis failure
            async with lifespan(mock_app):
                # Verify database and FDA service are still initialized
                mock_init_db.assert_called_once()
                mock_create_fda.assert_called_once()
                
                # Verify Redis client is set to None
                assert mock_app.state.redis_client is None
            
            # Verify cleanup calls (Redis cleanup should not be called since it failed to initialize)
            mock_fda_service.close.assert_called_once()
            mock_close_db.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_shutdown_error_handling(self, mock_env_vars):
        """Test that shutdown errors are handled gracefully"""
        
        with patch("database.connection.init_database") as mock_init_db, \
             patch("services.cache.init_redis") as mock_init_redis, \
             patch("services.cache.get_redis_client") as mock_get_redis, \
             patch("services.openfda.create_openfda_service") as mock_create_fda, \
             patch("database.connection.close_database") as mock_close_db, \
             patch("services.cache.close_redis_client") as mock_close_redis:
            
            # Setup successful initialization
            mock_db_manager = AsyncMock()
            mock_init_db.return_value = mock_db_manager
            
            mock_redis_client = AsyncMock()
            mock_get_redis.return_value = mock_redis_client
            
            mock_fda_service = AsyncMock()
            mock_create_fda.return_value = mock_fda_service
            
            # Mock shutdown errors
            mock_fda_service.close.side_effect = Exception("FDA service close error")
            mock_close_redis.side_effect = Exception("Redis close error")
            mock_close_db.side_effect = Exception("Database close error")
            
            mock_app = MagicMock()
            mock_app.state = MagicMock()
            
            # Test that shutdown completes despite errors
            async with lifespan(mock_app):
                pass
            
            # Verify all cleanup methods were called despite errors
            mock_fda_service.close.assert_called_once()
            mock_close_redis.assert_called_once()
            mock_close_db.assert_called_once()
    
    def test_application_creation(self):
        """Test that the FastAPI application is created correctly with lifespan"""
        
        # Verify the app is created with the lifespan context manager
        assert app.title == "Medical Device Regulatory Assistant API"
        assert app.version == "0.1.0"
        
        # Verify lifespan is set
        assert app.router.lifespan_context is not None
    
    @pytest.mark.asyncio
    async def test_service_initialization_order(self, mock_env_vars):
        """Test that services are initialized in the correct dependency order"""
        
        call_order = []
        
        def track_calls(service_name):
            def wrapper(*args, **kwargs):
                call_order.append(service_name)
                return AsyncMock()
            return wrapper
        
        with patch("database.connection.init_database", side_effect=track_calls("database")), \
             patch("services.cache.init_redis", side_effect=track_calls("redis")), \
             patch("services.cache.get_redis_client") as mock_get_redis, \
             patch("services.openfda.create_openfda_service", side_effect=track_calls("fda")), \
             patch("database.connection.close_database") as mock_close_db, \
             patch("services.cache.close_redis_client") as mock_close_redis:
            
            mock_redis_client = AsyncMock()
            mock_get_redis.return_value = mock_redis_client
            
            mock_app = MagicMock()
            mock_app.state = MagicMock()
            
            async with lifespan(mock_app):
                pass
            
            # Verify initialization order: database -> redis -> fda
            assert call_order == ["database", "redis", "fda"]
    
    def test_environment_variable_handling(self, temp_db_path):
        """Test that environment variables are properly handled"""
        
        # Test default values
        with patch.dict(os.environ, {}, clear=True):
            with patch("database.connection.init_database") as mock_init_db, \
                 patch("services.cache.init_redis"), \
                 patch("services.cache.get_redis_client"), \
                 patch("services.openfda.create_openfda_service"), \
                 patch("database.connection.close_database"), \
                 patch("services.cache.close_redis_client"):
                
                mock_app = MagicMock()
                mock_app.state = MagicMock()
                
                async def run_test():
                    async with lifespan(mock_app):
                        pass
                
                # This should use default database URL
                asyncio.run(run_test())
                
                # Verify init_database was called with default URL
                mock_init_db.assert_called_once()
                args, kwargs = mock_init_db.call_args
                assert "sqlite:./medical_device_assistant.db" in args[0]


class TestApplicationIntegration:
    """Integration tests for the complete application"""
    
    def test_application_startup_with_test_client(self):
        """Test application startup using FastAPI TestClient"""
        
        with patch("database.connection.init_database") as mock_init_db, \
             patch("services.cache.init_redis"), \
             patch("services.cache.get_redis_client"), \
             patch("services.openfda.create_openfda_service") as mock_create_fda, \
             patch("database.connection.close_database"), \
             patch("services.cache.close_redis_client"):
            
            # Setup mocks
            mock_init_db.return_value = AsyncMock()
            mock_create_fda.return_value = AsyncMock()
            
            # Create test client (this will trigger lifespan events)
            with TestClient(app) as client:
                # Test basic endpoint
                response = client.get("/")
                assert response.status_code == 200
                assert response.json()["message"] == "Medical Device Regulatory Assistant API"
                
                # Test health endpoint
                response = client.get("/health")
                assert response.status_code == 200
                assert response.json()["status"] == "healthy"
    
    def test_cors_configuration(self):
        """Test CORS middleware configuration"""
        
        with patch("database.connection.init_database"), \
             patch("services.cache.init_redis"), \
             patch("services.cache.get_redis_client"), \
             patch("services.openfda.create_openfda_service"), \
             patch("database.connection.close_database"), \
             patch("services.cache.close_redis_client"):
            
            with TestClient(app) as client:
                # Test CORS preflight request
                response = client.options(
                    "/",
                    headers={
                        "Origin": "http://localhost:3000",
                        "Access-Control-Request-Method": "GET"
                    }
                )
                
                # Should allow the request
                assert response.status_code == 200
                assert "access-control-allow-origin" in response.headers