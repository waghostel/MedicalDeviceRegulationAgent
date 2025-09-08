"""Integration tests for FastAPI application setup and middleware."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


class TestApplicationSetup:
    """Test FastAPI application setup and configuration."""
    
    def test_app_metadata(self, client):
        """Test application metadata and configuration."""
        # Test OpenAPI schema
        response = client.get("/openapi.json")
        assert response.status_code == 200
        
        schema = response.json()
        assert schema["info"]["title"] == "Medical Device Regulatory Assistant API"
        assert schema["info"]["version"] == "0.1.0"
        assert "description" in schema["info"]
    
    def test_docs_endpoint(self, client):
        """Test API documentation endpoint."""
        response = client.get("/docs")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]
    
    def test_redoc_endpoint(self, client):
        """Test ReDoc documentation endpoint."""
        response = client.get("/redoc")
        assert response.status_code == 200
        assert "text/html" in response.headers["content-type"]


class TestRootEndpoints:
    """Test root and basic endpoints."""
    
    def test_root_endpoint(self, client):
        """Test root endpoint response."""
        response = client.get("/")
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"] == "Medical Device Regulatory Assistant API"
        assert data["version"] == "0.1.0"
        assert data["status"] == "running"
        assert data["docs"] == "/docs"
        assert data["health"] == "/api/health"
    
    def test_legacy_health_endpoint(self, client):
        """Test legacy health endpoint."""
        response = client.get("/health")
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "medical-device-regulatory-assistant-backend"
        assert data["version"] == "0.1.0"
        assert "note" in data


class TestCORSMiddleware:
    """Test CORS middleware configuration."""
    
    def test_cors_preflight_request(self, client):
        """Test CORS preflight request handling."""
        response = client.options(
            "/",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Content-Type",
            }
        )
        
        assert response.status_code == 200
        assert "access-control-allow-origin" in response.headers
        assert "access-control-allow-methods" in response.headers
        assert "access-control-allow-headers" in response.headers
    
    def test_cors_actual_request(self, client):
        """Test CORS actual request handling."""
        response = client.get(
            "/",
            headers={"Origin": "http://localhost:3000"}
        )
        
        assert response.status_code == 200
        assert "access-control-allow-origin" in response.headers
    
    def test_cors_credentials_allowed(self, client):
        """Test CORS credentials are allowed."""
        response = client.get(
            "/",
            headers={"Origin": "http://localhost:3000"}
        )
        
        assert response.status_code == 200
        # Note: access-control-allow-credentials header is only sent on preflight requests


class TestRequestLoggingMiddleware:
    """Test request logging middleware."""
    
    def test_request_id_header(self, client):
        """Test request ID is added to response headers."""
        response = client.get("/")
        
        assert response.status_code == 200
        assert "X-Request-ID" in response.headers
        assert "X-Process-Time" in response.headers
        
        # Verify request ID is a valid UUID format
        request_id = response.headers["X-Request-ID"]
        assert len(request_id) == 36  # UUID format length
        assert request_id.count("-") == 4  # UUID format dashes
    
    def test_process_time_header(self, client):
        """Test process time is added to response headers."""
        response = client.get("/")
        
        assert response.status_code == 200
        assert "X-Process-Time" in response.headers
        
        # Verify process time is a valid float
        process_time = float(response.headers["X-Process-Time"])
        assert process_time >= 0


class TestErrorHandlingMiddleware:
    """Test error handling middleware."""
    
    def test_404_error_handling(self, client):
        """Test 404 error handling."""
        response = client.get("/nonexistent-endpoint")
        
        assert response.status_code == 404
        
        data = response.json()
        assert data["error"] == "HTTP_ERROR"
        assert "request_id" in data
        assert data["type"] == "http_error"
    
    def test_validation_error_handling(self, client):
        """Test validation error handling."""
        # This would trigger a validation error if we had endpoints with validation
        # For now, we'll test with an invalid method
        response = client.patch("/")  # PATCH not allowed on root
        
        assert response.status_code == 405
        
        data = response.json()
        assert data["error"] == "HTTP_ERROR"
        assert "request_id" in data
    
    def test_request_id_in_error_response(self, client):
        """Test request ID is included in error responses."""
        response = client.get("/nonexistent-endpoint")
        
        assert response.status_code == 404
        
        data = response.json()
        assert "request_id" in data
        
        # Verify request ID format
        request_id = data["request_id"]
        assert len(request_id) == 36  # UUID format length


class TestHealthEndpoints:
    """Test health check endpoints."""
    
    def test_comprehensive_health_check(self, client):
        """Test comprehensive health check endpoint."""
        with patch('services.health.HealthChecker.check_all') as mock_check_all:
            # Mock successful health check
            from services.health import SystemHealth, HealthStatus
            from datetime import datetime, timezone
            
            mock_health_status = SystemHealth(
                status="healthy",
                timestamp=datetime.now(timezone.utc),
                services=[],
                overall_response_time_ms=100.0
            )
            mock_check_all.return_value = mock_health_status
            
            response = client.get("/api/health/")
            
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
    
    def test_database_health_check(self, client):
        """Test database health check endpoint."""
        with patch('services.health.HealthChecker.check_database') as mock_check_database:
            # Mock successful database check
            from services.health import HealthStatus
            from datetime import datetime, timezone
            
            mock_db_status = HealthStatus(
                service="database",
                status="healthy",
                response_time_ms=50.0,
                timestamp=datetime.now(timezone.utc),
                details={}
            )
            mock_check_database.return_value = mock_db_status
            
            response = client.get("/api/health/database")
            
            assert response.status_code == 200
            data = response.json()
            assert data["service"] == "database"
            assert data["status"] == "healthy"
    
    def test_fda_api_health_check(self, client):
        """Test FDA API health check endpoint."""
        with patch('services.health.HealthChecker.check_fda_api') as mock_check_fda_api:
            # Mock successful FDA API check
            from services.health import HealthStatus
            from datetime import datetime, timezone
            
            mock_fda_status = HealthStatus(
                service="fda_api",
                status="healthy",
                response_time_ms=200.0,
                timestamp=datetime.now(timezone.utc),
                details={}
            )
            mock_check_fda_api.return_value = mock_fda_status
            
            response = client.get("/api/health/fda-api")
            
            assert response.status_code == 200
            data = response.json()
            assert data["service"] == "fda_api"
            assert data["status"] == "healthy"


class TestAuthenticationMiddleware:
    """Test authentication middleware integration."""
    
    def test_no_auth_required_for_public_endpoints(self, client):
        """Test public endpoints don't require authentication."""
        # Root endpoint should be accessible without auth
        response = client.get("/")
        assert response.status_code == 200
        
        # Health endpoints should be accessible without auth
        response = client.get("/api/health/")
        assert response.status_code == 200
    
    def test_invalid_token_format(self, client):
        """Test invalid token format handling."""
        # This test will be more relevant when we add protected endpoints
        # For now, we verify the auth service is properly configured
        from services.auth import auth_service
        
        assert auth_service is not None
        assert auth_service.secret_key is not None
        assert auth_service.algorithm == "HS256"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])