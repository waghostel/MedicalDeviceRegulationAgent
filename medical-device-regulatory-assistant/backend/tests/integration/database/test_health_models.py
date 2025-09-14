"""
Unit tests for health check Pydantic models
"""

import pytest
from datetime import datetime, timezone
from pydantic import ValidationError
import json

from backend.models.health import (
    HealthCheckDetail,
    HealthCheckResponse,
    DatabaseHealthDetail,
    RedisHealthDetail,
    FDAAPIHealthDetail,
    SystemResourceHealthDetail,
)


class TestHealthCheckDetail:
    """Test HealthCheckDetail model"""
    
    def test_valid_health_check_detail(self):
        """Test creating a valid HealthCheckDetail"""
        data = {
            "healthy": True,
            "status": "connected",
            "error": None,
            "message": "Service is running",
            "details": {"version": "1.0.0"},
            "execution_time_ms": 15.5,
            "timestamp": "2024-01-15T10:30:45.123456Z"
        }
        
        detail = HealthCheckDetail(**data)
        
        assert detail.healthy is True
        assert detail.status == "connected"
        assert detail.error is None
        assert detail.message == "Service is running"
        assert detail.details == {"version": "1.0.0"}
        assert detail.execution_time_ms == 15.5
        assert detail.timestamp == "2024-01-15T10:30:45.123456Z"
    
    def test_minimal_health_check_detail(self):
        """Test creating HealthCheckDetail with minimal required fields"""
        data = {
            "healthy": False,
            "status": "error",
            "execution_time_ms": 100.0,
            "timestamp": "2024-01-15T10:30:45.123456Z"
        }
        
        detail = HealthCheckDetail(**data)
        
        assert detail.healthy is False
        assert detail.status == "error"
        assert detail.error is None
        assert detail.message is None
        assert detail.details is None
        assert detail.execution_time_ms == 100.0
    
    def test_health_check_detail_validation_error(self):
        """Test validation errors for HealthCheckDetail"""
        # Missing required fields
        with pytest.raises(ValidationError) as exc_info:
            HealthCheckDetail(healthy=True)
        
        errors = exc_info.value.errors()
        required_fields = {error['loc'][0] for error in errors if error['type'] == 'missing'}
        assert 'status' in required_fields
        assert 'execution_time_ms' in required_fields
        assert 'timestamp' in required_fields
    
    def test_health_check_detail_serialization(self):
        """Test JSON serialization of HealthCheckDetail"""
        data = {
            "healthy": True,
            "status": "connected",
            "execution_time_ms": 15.5,
            "timestamp": "2024-01-15T10:30:45.123456Z"
        }
        
        detail = HealthCheckDetail(**data)
        json_str = detail.model_dump_json()
        
        # Should be valid JSON
        parsed = json.loads(json_str)
        assert parsed["healthy"] is True
        assert parsed["status"] == "connected"
        assert parsed["execution_time_ms"] == 15.5


class TestDatabaseHealthDetail:
    """Test DatabaseHealthDetail model"""
    
    def test_valid_database_health_detail(self):
        """Test creating a valid DatabaseHealthDetail"""
        data = {
            "healthy": True,
            "status": "connected",
            "database_url": "sqlite:./test.db",
            "message": "Database connection successful"
        }
        
        detail = DatabaseHealthDetail(**data)
        
        assert detail.healthy is True
        assert detail.status == "connected"
        assert detail.database_url == "sqlite:./test.db"
        assert detail.message == "Database connection successful"
        assert detail.error is None
    
    def test_database_health_detail_with_error(self):
        """Test DatabaseHealthDetail with error"""
        data = {
            "healthy": False,
            "status": "disconnected",
            "error": "Connection timeout"
        }
        
        detail = DatabaseHealthDetail(**data)
        
        assert detail.healthy is False
        assert detail.status == "disconnected"
        assert detail.error == "Connection timeout"
        assert detail.database_url is None
        assert detail.message is None


class TestRedisHealthDetail:
    """Test RedisHealthDetail model"""
    
    def test_valid_redis_health_detail(self):
        """Test creating a valid RedisHealthDetail"""
        data = {
            "healthy": True,
            "status": "connected",
            "details": {
                "version": "7.0.0",
                "connected_clients": 5,
                "used_memory_human": "1.2M"
            }
        }
        
        detail = RedisHealthDetail(**data)
        
        assert detail.healthy is True
        assert detail.status == "connected"
        assert detail.details["version"] == "7.0.0"
        assert detail.details["connected_clients"] == 5
    
    def test_redis_health_detail_not_configured(self):
        """Test RedisHealthDetail when not configured"""
        data = {
            "healthy": False,
            "status": "not_configured",
            "message": "Redis client not initialized"
        }
        
        detail = RedisHealthDetail(**data)
        
        assert detail.healthy is False
        assert detail.status == "not_configured"
        assert detail.message == "Redis client not initialized"


class TestFDAAPIHealthDetail:
    """Test FDAAPIHealthDetail model"""
    
    def test_valid_fda_api_health_detail(self):
        """Test creating a valid FDAAPIHealthDetail"""
        data = {
            "healthy": True,
            "status": "accessible",
            "details": {
                "requests_remaining": None,
                "rate_limit_reset": None,
                "total_results": 1
            }
        }
        
        detail = FDAAPIHealthDetail(**data)
        
        assert detail.healthy is True
        assert detail.status == "accessible"
        assert detail.details["total_results"] == 1
    
    def test_fda_api_health_detail_inaccessible(self):
        """Test FDAAPIHealthDetail when inaccessible"""
        data = {
            "healthy": False,
            "status": "inaccessible",
            "error": "Network timeout"
        }
        
        detail = FDAAPIHealthDetail(**data)
        
        assert detail.healthy is False
        assert detail.status == "inaccessible"
        assert detail.error == "Network timeout"


class TestSystemResourceHealthDetail:
    """Test SystemResourceHealthDetail model"""
    
    def test_valid_system_resource_health_detail(self):
        """Test creating a valid SystemResourceHealthDetail"""
        data = {
            "healthy": True,
            "status": "ok",
            "details": {
                "total_gb": 500.0,
                "used_gb": 250.0,
                "free_gb": 250.0,
                "usage_percent": 50.0
            }
        }
        
        detail = SystemResourceHealthDetail(**data)
        
        assert detail.healthy is True
        assert detail.status == "ok"
        assert detail.details["usage_percent"] == 50.0
    
    def test_system_resource_health_detail_low_space(self):
        """Test SystemResourceHealthDetail with low space"""
        data = {
            "healthy": False,
            "status": "low_space",
            "details": {
                "total_gb": 100.0,
                "used_gb": 95.0,
                "free_gb": 5.0,
                "usage_percent": 95.0
            },
            "message": "Disk space critically low"
        }
        
        detail = SystemResourceHealthDetail(**data)
        
        assert detail.healthy is False
        assert detail.status == "low_space"
        assert detail.details["usage_percent"] == 95.0
        assert detail.message == "Disk space critically low"


class TestHealthCheckResponse:
    """Test HealthCheckResponse model"""
    
    def test_valid_health_check_response(self):
        """Test creating a valid HealthCheckResponse"""
        check_detail = HealthCheckDetail(
            healthy=True,
            status="connected",
            execution_time_ms=15.5,
            timestamp="2024-01-15T10:30:45.123456Z"
        )
        
        data = {
            "healthy": True,
            "timestamp": "2024-01-15T10:30:45.123456Z",
            "execution_time_ms": 125.7,
            "service": "medical-device-regulatory-assistant",
            "version": "0.1.0",
            "checks": {
                "database": check_detail
            }
        }
        
        response = HealthCheckResponse(**data)
        
        assert response.healthy is True
        assert response.service == "medical-device-regulatory-assistant"
        assert response.version == "0.1.0"
        assert "database" in response.checks
        assert response.checks["database"].healthy is True
    
    def test_health_check_response_with_multiple_checks(self):
        """Test HealthCheckResponse with multiple checks"""
        db_check = HealthCheckDetail(
            healthy=True,
            status="connected",
            execution_time_ms=15.5,
            timestamp="2024-01-15T10:30:45.123456Z"
        )
        
        redis_check = HealthCheckDetail(
            healthy=False,
            status="disconnected",
            error="Connection refused",
            execution_time_ms=5000.0,
            timestamp="2024-01-15T10:30:45.123456Z"
        )
        
        data = {
            "healthy": False,  # Overall unhealthy due to Redis
            "timestamp": "2024-01-15T10:30:45.123456Z",
            "execution_time_ms": 5020.5,
            "service": "medical-device-regulatory-assistant",
            "version": "0.1.0",
            "checks": {
                "database": db_check,
                "redis": redis_check
            }
        }
        
        response = HealthCheckResponse(**data)
        
        assert response.healthy is False
        assert len(response.checks) == 2
        assert response.checks["database"].healthy is True
        assert response.checks["redis"].healthy is False
        assert response.checks["redis"].error == "Connection refused"
    
    def test_health_check_response_validation_error(self):
        """Test validation errors for HealthCheckResponse"""
        # Missing required fields
        with pytest.raises(ValidationError) as exc_info:
            HealthCheckResponse(healthy=True)
        
        errors = exc_info.value.errors()
        required_fields = {error['loc'][0] for error in errors if error['type'] == 'missing'}
        assert 'timestamp' in required_fields
        assert 'execution_time_ms' in required_fields
        assert 'service' in required_fields
        assert 'version' in required_fields
        assert 'checks' in required_fields
    
    def test_health_check_response_serialization(self):
        """Test JSON serialization of complete HealthCheckResponse"""
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
        
        json_str = response.model_dump_json()
        
        # Should be valid JSON
        parsed = json.loads(json_str)
        assert parsed["healthy"] is True
        assert parsed["service"] == "medical-device-regulatory-assistant"
        assert "database" in parsed["checks"]
        assert parsed["checks"]["database"]["healthy"] is True
    
    def test_health_check_response_deserialization(self):
        """Test creating HealthCheckResponse from JSON"""
        json_data = {
            "healthy": True,
            "timestamp": "2024-01-15T10:30:45.123456Z",
            "execution_time_ms": 125.7,
            "service": "medical-device-regulatory-assistant",
            "version": "0.1.0",
            "checks": {
                "database": {
                    "healthy": True,
                    "status": "connected",
                    "execution_time_ms": 15.5,
                    "timestamp": "2024-01-15T10:30:45.123456Z"
                }
            }
        }
        
        response = HealthCheckResponse(**json_data)
        
        assert response.healthy is True
        assert isinstance(response.checks["database"], HealthCheckDetail)
        assert response.checks["database"].status == "connected"


class TestModelIntegration:
    """Test integration between different health models"""
    
    def test_health_response_with_specialized_details(self):
        """Test HealthCheckResponse with specialized health detail models"""
        # This tests that the generic HealthCheckDetail can work with 
        # specialized models through proper data structure
        
        db_data = {
            "healthy": True,
            "status": "connected",
            "database_url": "sqlite:./test.db",
            "execution_time_ms": 15.5,
            "timestamp": "2024-01-15T10:30:45.123456Z"
        }
        
        # Create as HealthCheckDetail (the response model uses this)
        db_check = HealthCheckDetail(**db_data)
        
        response = HealthCheckResponse(
            healthy=True,
            timestamp="2024-01-15T10:30:45.123456Z",
            execution_time_ms=125.7,
            service="medical-device-regulatory-assistant",
            version="0.1.0",
            checks={"database": db_check}
        )
        
        assert response.checks["database"].healthy is True
        # The specialized fields are preserved in the generic model
        # through the flexible structure
    
    def test_model_field_descriptions(self):
        """Test that models have proper field descriptions for API documentation"""
        # Check that key models have field descriptions
        response_fields = HealthCheckResponse.model_fields
        assert 'healthy' in response_fields
        assert response_fields['healthy'].description is not None
        
        detail_fields = HealthCheckDetail.model_fields
        assert 'status' in detail_fields
        assert detail_fields['status'].description is not None
        
        db_fields = DatabaseHealthDetail.model_fields
        assert 'database_url' in db_fields
        assert db_fields['database_url'].description is not None