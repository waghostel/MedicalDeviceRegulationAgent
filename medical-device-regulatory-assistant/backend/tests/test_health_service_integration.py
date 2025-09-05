"""
Integration tests for health check service with Pydantic models
"""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from backend.services.health_check import HealthCheckService
from backend.models.health import HealthCheckResponse, HealthCheckDetail


class TestHealthCheckServiceIntegration:
    """Test HealthCheckService integration with Pydantic models"""
    
    @pytest.fixture
    def health_service(self):
        """Create a HealthCheckService instance"""
        return HealthCheckService()
    
    @pytest.mark.asyncio
    async def test_check_all_returns_pydantic_model(self, health_service):
        """Test that check_all returns a proper HealthCheckResponse model"""
        # Mock all the dependencies to avoid actual connections
        with patch('backend.services.health_check.get_database_manager') as mock_db, \
             patch('backend.services.health_check.get_redis_client') as mock_redis, \
             patch('backend.services.health_check.OpenFDAService') as mock_fda, \
             patch('shutil.disk_usage') as mock_disk:
            
            # Mock database health check
            mock_db_manager = AsyncMock()
            mock_db_manager.health_check.return_value = {
                'healthy': True,
                'status': 'connected',
                'message': 'Database connection successful'
            }
            mock_db.return_value = mock_db_manager
            
            # Mock Redis health check
            mock_redis_client = AsyncMock()
            mock_redis_client.ping.return_value = True
            mock_redis_client.info.return_value = {
                'redis_version': '7.0.0',
                'connected_clients': 1,
                'used_memory_human': '1M'
            }
            mock_redis.return_value = mock_redis_client
            
            # Mock FDA API health check
            mock_fda_service = AsyncMock()
            mock_fda_service.search_predicates.return_value = [{'k_number': 'K123456'}]
            mock_fda.return_value = mock_fda_service
            
            # Mock disk usage
            mock_disk.return_value = (1000000000000, 500000000000, 500000000000)  # 1TB total, 500GB used, 500GB free
            
            # Run the health check (psutil will handle ImportError gracefully)
            result = await health_service.check_all()
            
            # Verify it returns a HealthCheckResponse instance
            assert isinstance(result, HealthCheckResponse)
            
            # Verify the structure
            assert result.healthy is True
            assert result.service == 'medical-device-regulatory-assistant'
            assert result.version == '0.1.0'
            assert isinstance(result.checks, dict)
            
            # Verify individual checks are HealthCheckDetail instances
            for check_name, check_result in result.checks.items():
                assert isinstance(check_result, HealthCheckDetail)
                assert hasattr(check_result, 'healthy')
                assert hasattr(check_result, 'status')
                assert hasattr(check_result, 'execution_time_ms')
                assert hasattr(check_result, 'timestamp')
            
            # Verify memory check handles missing psutil gracefully
            memory_check = result.checks.get('memory')
            if memory_check:
                # Should be healthy even if psutil is not available
                assert memory_check.healthy is True
                # Status should indicate psutil is not available
                assert memory_check.status in ['not_available', 'ok']
    
    @pytest.mark.asyncio
    async def test_check_specific_returns_pydantic_model(self, health_service):
        """Test that check_specific returns a proper HealthCheckResponse model"""
        with patch('backend.services.health_check.get_database_manager') as mock_db:
            # Mock database health check
            mock_db_manager = AsyncMock()
            mock_db_manager.health_check.return_value = {
                'healthy': True,
                'status': 'connected',
                'message': 'Database connection successful'
            }
            mock_db.return_value = mock_db_manager
            
            # Run specific health check
            result = await health_service.check_specific(['database'])
            
            # Verify it returns a HealthCheckResponse instance
            assert isinstance(result, HealthCheckResponse)
            
            # Verify only the requested check is included
            assert len(result.checks) == 1
            assert 'database' in result.checks
            assert isinstance(result.checks['database'], HealthCheckDetail)
    
    @pytest.mark.asyncio
    async def test_health_check_with_errors_returns_pydantic_model(self, health_service):
        """Test that health checks with errors still return proper Pydantic models"""
        with patch('backend.services.health_check.get_database_manager') as mock_db:
            # Mock database health check to raise an exception
            mock_db.side_effect = Exception("Database connection failed")
            
            # Run the health check
            result = await health_service.check_all(['database'])
            
            # Verify it returns a HealthCheckResponse instance
            assert isinstance(result, HealthCheckResponse)
            
            # Verify the overall health is False due to the error
            assert result.healthy is False
            
            # Verify the database check shows the error
            db_check = result.checks['database']
            assert isinstance(db_check, HealthCheckDetail)
            assert db_check.healthy is False
            assert db_check.status == 'error'
            assert db_check.error == "Database connection failed"
    
    @pytest.mark.asyncio
    async def test_invalid_check_names_raises_error(self, health_service):
        """Test that invalid check names raise appropriate errors"""
        with pytest.raises(ValueError) as exc_info:
            await health_service.check_specific(['invalid_check'])
        
        assert "Invalid health check names" in str(exc_info.value)
        assert "invalid_check" in str(exc_info.value)
    
    def test_health_check_response_serialization(self, health_service):
        """Test that HealthCheckResponse can be serialized to JSON"""
        # Create a sample response
        check_detail = HealthCheckDetail(
            healthy=True,
            status="connected",
            execution_time_ms=15.5,
            timestamp="2024-01-15T10:30:45.123456Z"
        )
        
        response = HealthCheckResponse(
            healthy=True,
            timestamp="2024-01-15T10:30:45.123456Z",
            execution_time_ms=125.7,
            service="medical-device-regulatory-assistant",
            version="0.1.0",
            checks={"database": check_detail}
        )
        
        # Test JSON serialization
        json_str = response.model_dump_json()
        assert isinstance(json_str, str)
        
        # Test dict serialization
        dict_data = response.model_dump()
        assert isinstance(dict_data, dict)
        assert dict_data["healthy"] is True
        assert dict_data["service"] == "medical-device-regulatory-assistant"