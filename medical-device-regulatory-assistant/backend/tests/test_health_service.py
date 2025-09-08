"""Integration tests for health service."""

import pytest
from unittest.mock import patch, AsyncMock
import aiosqlite
import httpx

from services.health import HealthChecker, HealthStatus, SystemHealth


class TestHealthChecker:
    """Test health checker service."""
    
    @pytest.mark.asyncio
    async def test_database_health_success(self):
        """Test successful database health check."""
        checker = HealthChecker()
        
        # Mock successful database connection
        with patch('aiosqlite.connect') as mock_connect:
            mock_db = AsyncMock()
            mock_connect.return_value.__aenter__.return_value = mock_db
            
            result = await checker.check_database()
            
            assert isinstance(result, HealthStatus)
            assert result.service == "database"
            assert result.status == "healthy"
            assert result.response_time_ms > 0
            assert "database_path" in result.details
    
    @pytest.mark.asyncio
    async def test_database_health_failure(self):
        """Test database health check failure."""
        checker = HealthChecker()
        
        # Mock database connection failure
        with patch('aiosqlite.connect') as mock_connect:
            mock_connect.side_effect = Exception("Database connection failed")
            
            result = await checker.check_database()
            
            assert isinstance(result, HealthStatus)
            assert result.service == "database"
            assert result.status == "unhealthy"
            assert result.response_time_ms > 0
            assert "error" in result.details
            assert "Database connection failed" in result.details["error"]
    
    @pytest.mark.asyncio
    async def test_fda_api_health_success(self):
        """Test successful FDA API health check."""
        checker = HealthChecker()
        
        # Mock successful FDA API response
        with patch('httpx.AsyncClient') as mock_client:
            mock_response = AsyncMock()
            mock_response.status_code = 200
            mock_response.raise_for_status.return_value = None
            
            mock_client.return_value.__aenter__.return_value.get.return_value = mock_response
            
            result = await checker.check_fda_api()
            
            assert isinstance(result, HealthStatus)
            assert result.service == "fda_api"
            assert result.status == "healthy"
            assert result.response_time_ms > 0
            assert "api_url" in result.details
            assert result.details["status_code"] == 200
    
    @pytest.mark.asyncio
    async def test_fda_api_health_failure(self):
        """Test FDA API health check failure."""
        checker = HealthChecker()
        
        # Mock FDA API failure
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.get.side_effect = \
                httpx.RequestError("API request failed")
            
            result = await checker.check_fda_api()
            
            assert isinstance(result, HealthStatus)
            assert result.service == "fda_api"
            assert result.status == "unhealthy"
            assert result.response_time_ms > 0
            assert "error" in result.details
    
    @pytest.mark.asyncio
    async def test_redis_cache_health_simulated(self):
        """Test Redis cache health check (simulated for MVP)."""
        checker = HealthChecker()
        
        result = await checker.check_redis_cache()
        
        assert isinstance(result, HealthStatus)
        assert result.service == "redis_cache"
        assert result.status == "healthy"  # Simulated as healthy
        assert result.response_time_ms > 0
        assert "note" in result.details
        assert "simulated" in result.details["note"]
    
    @pytest.mark.asyncio
    async def test_check_all_healthy(self):
        """Test comprehensive health check with all services healthy."""
        checker = HealthChecker()
        
        # Mock all services as healthy
        with patch.object(checker, 'check_database') as mock_db, \
             patch.object(checker, 'check_fda_api') as mock_fda, \
             patch.object(checker, 'check_redis_cache') as mock_redis:
            
            from datetime import datetime, timezone
            
            mock_db.return_value = HealthStatus(
                service="database",
                status="healthy",
                response_time_ms=50.0,
                timestamp=datetime.now(timezone.utc),
                details={}
            )
            
            mock_fda.return_value = HealthStatus(
                service="fda_api",
                status="healthy",
                response_time_ms=200.0,
                timestamp=datetime.now(timezone.utc),
                details={}
            )
            
            mock_redis.return_value = HealthStatus(
                service="redis_cache",
                status="healthy",
                response_time_ms=10.0,
                timestamp=datetime.now(timezone.utc),
                details={}
            )
            
            result = await checker.check_all()
            
            assert isinstance(result, SystemHealth)
            assert result.status == "healthy"
            assert len(result.services) == 3
            assert result.overall_response_time_ms > 0
    
    @pytest.mark.asyncio
    async def test_check_all_degraded(self):
        """Test comprehensive health check with some services unhealthy."""
        checker = HealthChecker()
        
        # Mock mixed service health
        with patch.object(checker, 'check_database') as mock_db, \
             patch.object(checker, 'check_fda_api') as mock_fda, \
             patch.object(checker, 'check_redis_cache') as mock_redis:
            
            from datetime import datetime, timezone
            
            mock_db.return_value = HealthStatus(
                service="database",
                status="healthy",
                response_time_ms=50.0,
                timestamp=datetime.now(timezone.utc),
                details={}
            )
            
            mock_fda.return_value = HealthStatus(
                service="fda_api",
                status="unhealthy",
                response_time_ms=5000.0,
                timestamp=datetime.now(timezone.utc),
                details={"error": "API timeout"}
            )
            
            mock_redis.return_value = HealthStatus(
                service="redis_cache",
                status="healthy",
                response_time_ms=10.0,
                timestamp=datetime.now(timezone.utc),
                details={}
            )
            
            result = await checker.check_all()
            
            assert isinstance(result, SystemHealth)
            assert result.status == "degraded"
            assert len(result.services) == 3
            assert result.overall_response_time_ms > 0
    
    @pytest.mark.asyncio
    async def test_check_all_unhealthy(self):
        """Test comprehensive health check with all services unhealthy."""
        checker = HealthChecker()
        
        # Mock all services as unhealthy
        with patch.object(checker, 'check_database') as mock_db, \
             patch.object(checker, 'check_fda_api') as mock_fda, \
             patch.object(checker, 'check_redis_cache') as mock_redis:
            
            from datetime import datetime, timezone
            
            mock_db.return_value = HealthStatus(
                service="database",
                status="unhealthy",
                response_time_ms=10.0,
                timestamp=datetime.now(timezone.utc),
                details={"error": "Connection failed"}
            )
            
            mock_fda.return_value = HealthStatus(
                service="fda_api",
                status="unhealthy",
                response_time_ms=20.0,
                timestamp=datetime.now(timezone.utc),
                details={"error": "API unavailable"}
            )
            
            mock_redis.return_value = HealthStatus(
                service="redis_cache",
                status="unhealthy",
                response_time_ms=5.0,
                timestamp=datetime.now(timezone.utc),
                details={"error": "Cache unavailable"}
            )
            
            result = await checker.check_all()
            
            assert isinstance(result, SystemHealth)
            assert result.status == "unhealthy"
            assert len(result.services) == 3
            assert result.overall_response_time_ms > 0
    
    @pytest.mark.asyncio
    async def test_check_all_with_exceptions(self):
        """Test comprehensive health check with exceptions during checks."""
        checker = HealthChecker()
        
        # Mock exceptions during health checks
        with patch.object(checker, 'check_database') as mock_db, \
             patch.object(checker, 'check_fda_api') as mock_fda, \
             patch.object(checker, 'check_redis_cache') as mock_redis:
            
            from datetime import datetime, timezone
            
            mock_db.side_effect = Exception("Database check failed")
            mock_fda.return_value = HealthStatus(
                service="fda_api",
                status="healthy",
                response_time_ms=200.0,
                timestamp=datetime.now(timezone.utc),
                details={}
            )
            mock_redis.return_value = HealthStatus(
                service="redis_cache",
                status="healthy",
                response_time_ms=10.0,
                timestamp=datetime.now(timezone.utc),
                details={}
            )
            
            result = await checker.check_all()
            
            assert isinstance(result, SystemHealth)
            assert len(result.services) == 3
            
            # Check that exception was handled and converted to error status
            error_service = next(
                (s for s in result.services if s.service == "unknown"), 
                None
            )
            assert error_service is not None
            assert error_service.status == "error"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])