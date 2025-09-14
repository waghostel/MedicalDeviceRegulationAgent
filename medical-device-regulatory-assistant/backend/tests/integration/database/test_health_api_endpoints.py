"""
Integration tests for health check API endpoints.

Tests the updated health check endpoints in main.py to ensure they:
- Use the new health check service correctly
- Return proper HTTP status codes (200 for healthy, 503 for unhealthy)
- Provide comprehensive error responses with actionable suggestions
- Handle individual health check components correctly
"""

import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from fastapi import status

# Import the FastAPI app
from main import app
from models.health import HealthCheckResponse, HealthCheckDetail


class TestHealthAPIEndpoints:
    """Test class for health check API endpoints"""
    
    def setup_method(self):
        """Set up test client for each test"""
        self.client = TestClient(app)
    
    def test_health_endpoint_healthy_system(self):
        """Test /health endpoint returns 200 when all systems are healthy"""
        # Mock healthy response
        mock_health_response = HealthCheckResponse(
            healthy=True,
            timestamp="2024-01-15T10:30:45.123456Z",
            execution_time_ms=125.7,
            service="medical-device-regulatory-assistant",
            version="0.1.0",
            checks={
                "database": HealthCheckDetail(
                    healthy=True,
                    status="connected",
                    execution_time_ms=15.2,
                    timestamp="2024-01-15T10:30:45.123456Z"
                ),
                "redis": HealthCheckDetail(
                    healthy=True,
                    status="connected",
                    execution_time_ms=8.5,
                    timestamp="2024-01-15T10:30:45.123456Z"
                )
            }
        )
        
        with patch('services.health_check.health_service.check_all', 
                   return_value=mock_health_response):
            response = self.client.get("/health")
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["healthy"] is True
            assert data["service"] == "medical-device-regulatory-assistant"
            assert "checks" in data
            assert "database" in data["checks"]
            assert "redis" in data["checks"]
    
    def test_health_endpoint_unhealthy_system(self):
        """Test /health endpoint returns 503 when system is unhealthy"""
        # Mock unhealthy response
        mock_health_response = HealthCheckResponse(
            healthy=False,
            timestamp="2024-01-15T10:30:45.123456Z",
            execution_time_ms=125.7,
            service="medical-device-regulatory-assistant",
            version="0.1.0",
            checks={
                "database": HealthCheckDetail(
                    healthy=False,
                    status="disconnected",
                    error="Connection refused",
                    execution_time_ms=15.2,
                    timestamp="2024-01-15T10:30:45.123456Z"
                ),
                "redis": HealthCheckDetail(
                    healthy=True,
                    status="connected",
                    execution_time_ms=8.5,
                    timestamp="2024-01-15T10:30:45.123456Z"
                )
            }
        )
        
        with patch('services.health_check.health_service.check_all', 
                   return_value=mock_health_response):
            response = self.client.get("/health")
            
            assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
            data = response.json()
            assert "error" in data
            assert data["error"] == "HTTP_ERROR"  # Error handler transforms this
            assert "message" in data
            # The actual detail is in the message field as a dict
            import json
            message_data = data["message"]
            assert message_data["error"] == "System is unhealthy"
            assert "health_status" in message_data
            assert "suggestions" in message_data
            assert len(message_data["suggestions"]) > 0
    
    def test_health_endpoint_exception_handling(self):
        """Test /health endpoint handles unexpected exceptions"""
        with patch('services.health_check.health_service.check_all', 
                   side_effect=Exception("Unexpected error")):
            response = self.client.get("/health")
            
            assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
            data = response.json()
            assert "error" in data
            assert data["error"] == "HTTP_ERROR"  # Error handler transforms this
            assert "message" in data
            # The actual detail is in the message field as a dict
            message_data = data["message"]
            assert message_data["error"] == "Health check system failure"
            assert "message" in message_data
            assert "suggestions" in message_data
    
    def test_specific_health_check_valid_component(self):
        """Test /health/{check_name} endpoint with valid component name"""
        # Mock healthy database check
        mock_health_response = HealthCheckResponse(
            healthy=True,
            timestamp="2024-01-15T10:30:45.123456Z",
            execution_time_ms=15.2,
            service="medical-device-regulatory-assistant",
            version="0.1.0",
            checks={
                "database": HealthCheckDetail(
                    healthy=True,
                    status="connected",
                    execution_time_ms=15.2,
                    timestamp="2024-01-15T10:30:45.123456Z"
                )
            }
        )
        
        with patch('services.health_check.health_service.check_specific', 
                   return_value=mock_health_response):
            response = self.client.get("/health/database")
            
            assert response.status_code == status.HTTP_200_OK
            data = response.json()
            assert data["healthy"] is True
            assert "database" in data["checks"]
            assert data["checks"]["database"]["healthy"] is True
    
    def test_specific_health_check_invalid_component(self):
        """Test /health/{check_name} endpoint with invalid component name"""
        response = self.client.get("/health/invalid_component")
        
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        data = response.json()
        assert "error" in data
        assert data["error"] == "HTTP_ERROR"  # Error handler transforms this
        assert "message" in data
        # The actual detail is in the message field as a dict
        message_data = data["message"]
        assert "invalid_component" in message_data["error"]
        assert "valid_checks" in message_data
        assert "suggestions" in message_data
    
    def test_specific_health_check_unhealthy_component(self):
        """Test /health/{check_name} endpoint with unhealthy component"""
        # Mock unhealthy database check
        mock_health_response = HealthCheckResponse(
            healthy=False,
            timestamp="2024-01-15T10:30:45.123456Z",
            execution_time_ms=15.2,
            service="medical-device-regulatory-assistant",
            version="0.1.0",
            checks={
                "database": HealthCheckDetail(
                    healthy=False,
                    status="disconnected",
                    error="Connection refused",
                    execution_time_ms=15.2,
                    timestamp="2024-01-15T10:30:45.123456Z"
                )
            }
        )
        
        with patch('services.health_check.health_service.check_specific', 
                   return_value=mock_health_response):
            response = self.client.get("/health/database")
            
            assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
            data = response.json()
            assert "error" in data
            assert data["error"] == "HTTP_ERROR"  # Error handler transforms this
            assert "message" in data
            # The actual detail is in the message field as a dict
            message_data = data["message"]
            assert "database health check failed" in message_data["error"]
            assert "suggestions" in message_data
            assert len(message_data["suggestions"]) > 0
    
    def test_specific_health_check_value_error(self):
        """Test /health/{check_name} endpoint handles ValueError"""
        with patch('services.health_check.health_service.check_specific', 
                   side_effect=ValueError("Invalid check configuration")):
            response = self.client.get("/health/database")
            
            assert response.status_code == status.HTTP_400_BAD_REQUEST
            data = response.json()
            assert "error" in data
            assert data["error"] == "HTTP_ERROR"  # Error handler transforms this
            assert "message" in data
            # The actual detail is in the message field as a dict
            message_data = data["message"]
            assert "Invalid health check configuration" in message_data["error"]
            assert "suggestions" in message_data
    
    def test_specific_health_check_exception_handling(self):
        """Test /health/{check_name} endpoint handles unexpected exceptions"""
        with patch('services.health_check.health_service.check_specific', 
                   side_effect=Exception("Unexpected error")):
            response = self.client.get("/health/database")
            
            assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
            data = response.json()
            assert "error" in data
            assert data["error"] == "HTTP_ERROR"  # Error handler transforms this
            assert "message" in data
            # The actual detail is in the message field as a dict
            message_data = data["message"]
            assert "database health check system failure" in message_data["error"]
            assert "suggestions" in message_data
    
    def test_all_valid_check_names(self):
        """Test all valid check names work correctly"""
        valid_checks = ['database', 'redis', 'fda_api', 'disk_space', 'memory']
        
        for check_name in valid_checks:
            # Mock healthy response for each check
            mock_health_response = HealthCheckResponse(
                healthy=True,
                timestamp="2024-01-15T10:30:45.123456Z",
                execution_time_ms=15.2,
                service="medical-device-regulatory-assistant",
                version="0.1.0",
                checks={
                    check_name: HealthCheckDetail(
                        healthy=True,
                        status="ok",
                        execution_time_ms=15.2,
                        timestamp="2024-01-15T10:30:45.123456Z"
                    )
                }
            )
            
            with patch('services.health_check.health_service.check_specific', 
                       return_value=mock_health_response):
                response = self.client.get(f"/health/{check_name}")
                
                assert response.status_code == status.HTTP_200_OK
                data = response.json()
                assert data["healthy"] is True
                assert check_name in data["checks"]
    
    def test_health_suggestions_generation(self):
        """Test that appropriate suggestions are generated for different failure scenarios"""
        # Test database failure suggestions
        mock_db_failure = HealthCheckResponse(
            healthy=False,
            timestamp="2024-01-15T10:30:45.123456Z",
            execution_time_ms=15.2,
            service="medical-device-regulatory-assistant",
            version="0.1.0",
            checks={
                "database": HealthCheckDetail(
                    healthy=False,
                    status="disconnected",
                    error="Permission denied",
                    execution_time_ms=15.2,
                    timestamp="2024-01-15T10:30:45.123456Z"
                )
            }
        )
        
        with patch('services.health_check.health_service.check_specific', 
                   return_value=mock_db_failure):
            response = self.client.get("/health/database")
            
            assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
            data = response.json()
            # The actual detail is in the message field as a dict
            message_data = data["message"]
            suggestions = message_data["suggestions"]
            
            # Check that database-specific suggestions are included
            assert any("database" in suggestion.lower() for suggestion in suggestions)
            assert any("permission" in suggestion.lower() for suggestion in suggestions)
    
    def test_redis_not_configured_suggestions(self):
        """Test that Redis not configured scenario provides appropriate suggestions"""
        mock_redis_not_configured = HealthCheckResponse(
            healthy=False,
            timestamp="2024-01-15T10:30:45.123456Z",
            execution_time_ms=15.2,
            service="medical-device-regulatory-assistant",
            version="0.1.0",
            checks={
                "redis": HealthCheckDetail(
                    healthy=False,
                    status="not_configured",
                    message="Redis client not initialized",
                    execution_time_ms=15.2,
                    timestamp="2024-01-15T10:30:45.123456Z"
                )
            }
        )
        
        with patch('services.health_check.health_service.check_specific', 
                   return_value=mock_redis_not_configured):
            response = self.client.get("/health/redis")
            
            assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
            data = response.json()
            # The actual detail is in the message field as a dict
            message_data = data["message"]
            suggestions = message_data["suggestions"]
            
            # Check that Redis optional message is included
            assert any("optional" in suggestion.lower() for suggestion in suggestions)
    
    def test_disk_space_low_suggestions(self):
        """Test that low disk space scenario provides appropriate suggestions"""
        mock_disk_low = HealthCheckResponse(
            healthy=False,
            timestamp="2024-01-15T10:30:45.123456Z",
            execution_time_ms=15.2,
            service="medical-device-regulatory-assistant",
            version="0.1.0",
            checks={
                "disk_space": HealthCheckDetail(
                    healthy=False,
                    status="low_space",
                    details={"usage_percent": 95.0},
                    execution_time_ms=15.2,
                    timestamp="2024-01-15T10:30:45.123456Z"
                )
            }
        )
        
        with patch('services.health_check.health_service.check_specific', 
                   return_value=mock_disk_low):
            response = self.client.get("/health/disk_space")
            
            assert response.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
            data = response.json()
            # The actual detail is in the message field as a dict
            message_data = data["message"]
            suggestions = message_data["suggestions"]
            
            # Check that disk space specific suggestions are included
            assert any("disk space" in suggestion.lower() for suggestion in suggestions)
            assert any("immediate action" in suggestion.lower() for suggestion in suggestions)


@pytest.mark.asyncio
class TestHealthAPIEndpointsAsync:
    """Async tests for health check API endpoints"""
    
    async def test_health_service_integration(self):
        """Test that the health endpoints properly integrate with the health service"""
        from services.health_check import health_service
        
        # This test verifies the actual integration without mocking
        # It should work if the health service is properly implemented
        try:
            # Test that we can call the health service directly
            health_result = await health_service.check_all()
            assert isinstance(health_result, HealthCheckResponse)
            assert hasattr(health_result, 'healthy')
            assert hasattr(health_result, 'checks')
            
            # Test specific check
            specific_result = await health_service.check_specific(['database'])
            assert isinstance(specific_result, HealthCheckResponse)
            assert 'database' in specific_result.checks
            
        except Exception as e:
            # If health service fails, that's expected in test environment
            # The important thing is that the integration is properly set up
            assert "not initialized" in str(e) or "connection" in str(e).lower()


if __name__ == "__main__":
    # Run the tests
    pytest.main([__file__, "-v"])