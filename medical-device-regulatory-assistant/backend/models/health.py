"""
Pydantic models for health check responses
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Dict, Any, Optional
from datetime import datetime


class HealthCheckDetail(BaseModel):
    """Model for individual health check component details"""
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "healthy": True,
                "status": "connected",
                "error": None,
                "message": "Database connection successful",
                "details": {"version": "3.45.0", "connections": 1},
                "execution_time_ms": 15.2,
                "timestamp": "2024-01-15T10:30:45.123456Z"
            }
        }
    )
    
    healthy: bool = Field(
        description="Whether this health check component is healthy"
    )
    status: str = Field(
        description="Status of the health check component (e.g., 'connected', 'disconnected', 'error')"
    )
    error: Optional[str] = Field(
        default=None,
        description="Error message if the health check failed"
    )
    message: Optional[str] = Field(
        default=None,
        description="Additional informational message about the health check"
    )
    details: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional details about the health check component"
    )
    execution_time_ms: float = Field(
        description="Time taken to execute this health check in milliseconds"
    )
    timestamp: str = Field(
        description="ISO timestamp when this health check was performed"
    )


class DatabaseHealthDetail(BaseModel):
    """Model for database-specific health check details"""
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "healthy": True,
                "status": "connected",
                "database_url": "sqlite:./medical_device_assistant.db",
                "error": None,
                "message": "Database connection successful"
            }
        }
    )
    
    healthy: bool = Field(
        description="Whether the database is healthy and accessible"
    )
    status: str = Field(
        description="Database connection status (e.g., 'connected', 'disconnected', 'query_failed')"
    )
    database_url: Optional[str] = Field(
        default=None,
        description="Database connection URL (sensitive info may be masked)"
    )
    error: Optional[str] = Field(
        default=None,
        description="Database error message if connection failed"
    )
    message: Optional[str] = Field(
        default=None,
        description="Additional message about database health status"
    )


class HealthCheckResponse(BaseModel):
    """Model for complete health check response"""
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "healthy": True,
                "timestamp": "2024-01-15T10:30:45.123456Z",
                "execution_time_ms": 125.7,
                "service": "medical-device-regulatory-assistant",
                "version": "0.1.0",
                "checks": {
                    "database": {
                        "healthy": True,
                        "status": "connected",
                        "execution_time_ms": 15.2,
                        "timestamp": "2024-01-15T10:30:45.123456Z"
                    },
                    "redis": {
                        "healthy": True,
                        "status": "connected",
                        "execution_time_ms": 8.5,
                        "timestamp": "2024-01-15T10:30:45.123456Z"
                    }
                }
            }
        }
    )
    
    healthy: bool = Field(
        description="Overall health status - true if all checks pass"
    )
    timestamp: str = Field(
        description="ISO timestamp when the health check was performed"
    )
    execution_time_ms: float = Field(
        description="Total time taken to execute all health checks in milliseconds"
    )
    service: str = Field(
        description="Name of the service being health checked"
    )
    version: str = Field(
        description="Version of the service"
    )
    checks: Dict[str, HealthCheckDetail] = Field(
        description="Dictionary of individual health check results keyed by check name"
    )


class RedisHealthDetail(BaseModel):
    """Model for Redis-specific health check details"""
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "healthy": True,
                "status": "connected",
                "details": {
                    "version": "7.0.0",
                    "connected_clients": 5,
                    "used_memory_human": "1.2M"
                }
            }
        }
    )
    
    healthy: bool = Field(
        description="Whether Redis is healthy and accessible"
    )
    status: str = Field(
        description="Redis connection status (e.g., 'connected', 'disconnected', 'not_configured')"
    )
    details: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Redis server information and statistics"
    )
    error: Optional[str] = Field(
        default=None,
        description="Redis error message if connection failed"
    )
    message: Optional[str] = Field(
        default=None,
        description="Additional message about Redis health status"
    )


class FDAAPIHealthDetail(BaseModel):
    """Model for FDA API-specific health check details"""
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "healthy": True,
                "status": "accessible",
                "details": {
                    "requests_remaining": None,
                    "rate_limit_reset": None,
                    "total_results": 1
                }
            }
        }
    )
    
    healthy: bool = Field(
        description="Whether the FDA API is accessible"
    )
    status: str = Field(
        description="FDA API accessibility status (e.g., 'accessible', 'inaccessible')"
    )
    details: Optional[Dict[str, Any]] = Field(
        default=None,
        description="FDA API rate limiting and response information"
    )
    error: Optional[str] = Field(
        default=None,
        description="FDA API error message if request failed"
    )


class SystemResourceHealthDetail(BaseModel):
    """Model for system resource health check details (disk, memory)"""
    
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "healthy": True,
                "status": "ok",
                "details": {
                    "total_gb": 500.0,
                    "used_gb": 250.0,
                    "free_gb": 250.0,
                    "usage_percent": 50.0
                }
            }
        }
    )
    
    healthy: bool = Field(
        description="Whether the system resource is within healthy limits"
    )
    status: str = Field(
        description="Resource status (e.g., 'ok', 'low_space', 'high_usage', 'error')"
    )
    details: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Resource usage statistics and metrics"
    )
    error: Optional[str] = Field(
        default=None,
        description="Error message if resource check failed"
    )
    message: Optional[str] = Field(
        default=None,
        description="Additional message about resource status"
    )