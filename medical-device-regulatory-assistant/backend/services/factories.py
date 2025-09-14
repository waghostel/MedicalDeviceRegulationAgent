"""
Service factory functions for dependency injection and testing.

This module provides factory functions that create service instances with proper
dependency injection, making it easy to mock services in test environments.
"""

import os
import logging
from typing import Optional, Dict, Any
from unittest.mock import Mock, AsyncMock

from database.connection import DatabaseManager, get_database_manager
from services.projects import ProjectService
from services.openfda import OpenFDAService, create_openfda_service
from services.auth import AuthService
from services.health import HealthChecker
from services.document_service import DocumentService

logger = logging.getLogger(__name__)


class ServiceContainer:
    """
    Dependency injection container for services.
    
    This container manages service instances and their dependencies,
    allowing for easy mocking and testing.
    """
    
    def __init__(self):
        self._services: Dict[str, Any] = {}
        self._factories: Dict[str, callable] = {}
        self._overrides: Dict[str, Any] = {}
    
    def register_service(self, name: str, service: Any) -> None:
        """Register a service instance"""
        self._services[name] = service
    
    def register_factory(self, name: str, factory: callable) -> None:
        """Register a service factory"""
        self._factories[name] = factory
    
    def get_service(self, name: str):
        """Get a service by name"""
        # Check overrides first (for testing)
        if name in self._overrides:
            return self._overrides[name]
        
        # Check registered services
        if name in self._services:
            return self._services[name]
        
        # Check factories
        if name in self._factories:
            service = self._factories[name]()
            self._services[name] = service
            return service
        
        raise ValueError(f"Service '{name}' not found")
    
    def override_service(self, name: str, service: Any) -> None:
        """Override a service (useful for testing)"""
        self._overrides[name] = service
    
    def clear_overrides(self) -> None:
        """Clear all service overrides"""
        self._overrides.clear()
    
    def clear_all(self) -> None:
        """Clear all services and overrides"""
        self._services.clear()
        self._factories.clear()
        self._overrides.clear()


# Global service container
_service_container = ServiceContainer()


def get_service_container() -> ServiceContainer:
    """Get the global service container"""
    return _service_container


# Service Factory Functions

def create_project_service(db_manager: Optional[DatabaseManager] = None) -> ProjectService:
    """
    Create ProjectService instance with dependency injection.
    
    Args:
        db_manager: Database manager instance. If None, uses global instance.
        
    Returns:
        ProjectService: Configured service instance
    """
    if db_manager is None:
        try:
            db_manager = get_database_manager()
        except RuntimeError:
            # Database manager not initialized - this is expected in some test scenarios
            logger.warning("Database manager not initialized, ProjectService will use lazy initialization")
    
    return ProjectService(db_manager=db_manager)


async def create_openfda_service_factory(
    api_key: Optional[str] = None,
    redis_url: Optional[str] = None,
    cache_ttl: int = 3600
) -> OpenFDAService:
    """
    Create OpenFDAService instance with dependency injection.
    
    Args:
        api_key: FDA API key (optional but recommended)
        redis_url: Redis connection URL
        cache_ttl: Cache time-to-live in seconds
        
    Returns:
        OpenFDAService: Configured service instance
    """
    return await create_openfda_service(
        api_key=api_key,
        redis_url=redis_url,
        cache_ttl=cache_ttl
    )


def create_auth_service(
    secret_key: Optional[str] = None,
    algorithm: str = "HS256"
) -> AuthService:
    """
    Create AuthService instance with dependency injection.
    
    Args:
        secret_key: JWT secret key. If None, uses environment variables.
        algorithm: JWT algorithm to use.
        
    Returns:
        AuthService: Configured service instance
    """
    return AuthService(secret_key=secret_key, algorithm=algorithm)


def create_health_checker(
    database_path: Optional[str] = None,
    fda_api_url: Optional[str] = None
) -> HealthChecker:
    """
    Create HealthChecker instance with dependency injection.
    
    Args:
        database_path: Path to database file.
        fda_api_url: FDA API URL.
        
    Returns:
        HealthChecker: Configured service instance
    """
    return HealthChecker(database_path=database_path, fda_api_url=fda_api_url)


def create_document_service(
    db_session=None,
    config=None,
    processing_tool=None
) -> DocumentService:
    """
    Create DocumentService instance with dependency injection.
    
    Args:
        db_session: Database session.
        config: Document processing configuration.
        processing_tool: Document processing tool instance.
        
    Returns:
        DocumentService: Configured service instance
    """
    return DocumentService(
        db_session=db_session,
        config=config,
        processing_tool=processing_tool
    )


# Mock Service Factories for Testing

def create_mock_project_service() -> Mock:
    """
    Create mock ProjectService for testing.
    
    Returns:
        Mock: Mock service with standard methods
    """
    mock_service = Mock(spec=ProjectService)
    
    # Mock async methods
    mock_service.create_project = AsyncMock()
    mock_service.get_project = AsyncMock()
    mock_service.update_project = AsyncMock()
    mock_service.delete_project = AsyncMock()
    mock_service.list_projects = AsyncMock()
    mock_service.get_dashboard_data = AsyncMock()
    mock_service.export_project = AsyncMock()
    
    return mock_service


def create_mock_openfda_service() -> Mock:
    """
    Create mock OpenFDAService for testing.
    
    Returns:
        Mock: Mock service with standard methods and default responses
    """
    mock_service = Mock(spec=OpenFDAService)
    
    # Default search results
    default_results = [
        {
            "k_number": "K123456",
            "device_name": "Test Device",
            "intended_use": "Test indication",
            "product_code": "ABC",
            "clearance_date": "2023-01-01"
        }
    ]
    
    # Mock async methods with default responses
    mock_service.search_predicates = AsyncMock(return_value=default_results)
    mock_service.get_device_details = AsyncMock(return_value={
        "k_number": "K123456",
        "device_name": "Test Device",
        "intended_use": "Test indication",
        "product_code": "ABC",
        "clearance_date": "2023-01-01",
        "detailed_info": "Additional device information"
    })
    mock_service.lookup_device_classification = AsyncMock(return_value=[])
    mock_service.search_adverse_events = AsyncMock(return_value=[])
    mock_service.get_product_code_info = AsyncMock(return_value=None)
    mock_service.health_check = AsyncMock(return_value={
        "status": "healthy",
        "response_time_seconds": 0.1,
        "circuit_breaker_state": "CLOSED",
        "rate_limiter_requests": 0,
        "timestamp": "2023-01-01T00:00:00"
    })
    mock_service.close = AsyncMock()
    
    return mock_service


def create_mock_auth_service() -> Mock:
    """
    Create mock AuthService for testing.
    
    Returns:
        Mock: Mock service with standard methods
    """
    from services.auth import TokenData
    from datetime import datetime, timezone, timedelta
    
    mock_service = Mock(spec=AuthService)
    
    # Default user data
    default_token_data = TokenData(
        sub="test_user_id",
        email="test@example.com",
        name="Test User",
        exp=datetime.now(timezone.utc) + timedelta(hours=1),
        iat=datetime.now(timezone.utc)
    )
    
    # Mock methods
    mock_service.verify_token = Mock(return_value=default_token_data)
    
    return mock_service


def create_mock_health_checker() -> Mock:
    """
    Create mock HealthChecker for testing.
    
    Returns:
        Mock: Mock service with standard methods
    """
    from services.health import HealthStatus, SystemHealth
    from datetime import datetime, timezone
    
    mock_service = Mock(spec=HealthChecker)
    
    # Default health status
    default_health_status = HealthStatus(
        service="test_service",
        status="healthy",
        response_time_ms=10.0,
        timestamp=datetime.now(timezone.utc),
        details={}
    )
    
    default_system_health = SystemHealth(
        status="healthy",
        timestamp=datetime.now(timezone.utc),
        services=[default_health_status],
        overall_response_time_ms=10.0
    )
    
    # Mock async methods
    mock_service.check_database = AsyncMock(return_value=default_health_status)
    mock_service.check_fda_api = AsyncMock(return_value=default_health_status)
    mock_service.check_redis_cache = AsyncMock(return_value=default_health_status)
    mock_service.check_all = AsyncMock(return_value=default_system_health)
    
    return mock_service


def create_mock_document_service() -> Mock:
    """
    Create mock DocumentService for testing.
    
    Returns:
        Mock: Mock service with standard methods
    """
    mock_service = Mock(spec=DocumentService)
    
    # Mock async methods
    mock_service.process_document = AsyncMock(return_value={
        "success": True,
        "document_id": "test_doc_123",
        "document": None,
        "processing_summary": {
            "conversion_success": True,
            "extraction_success": True,
            "summary_success": True
        }
    })
    mock_service.search_documents = AsyncMock(return_value={
        "success": True,
        "results": [],
        "total_documents_searched": 0,
        "query": "test query"
    })
    mock_service.get_document_by_id = AsyncMock(return_value=None)
    mock_service.update_document = AsyncMock(return_value={"success": True})
    mock_service.delete_document = AsyncMock(return_value={"success": True})
    mock_service.get_fda_guidance_documents = AsyncMock(return_value=[])
    mock_service.analyze_document_compliance = AsyncMock(return_value={
        "success": True,
        "compliance_score": 0.8,
        "compliance_issues": [],
        "recommendations": []
    })
    
    return mock_service


# Service Registration Functions

def register_default_services() -> None:
    """Register default service factories in the container"""
    container = get_service_container()
    
    # Register factories
    container.register_factory("project_service", create_project_service)
    container.register_factory("auth_service", create_auth_service)
    container.register_factory("health_checker", create_health_checker)
    container.register_factory("document_service", create_document_service)


def register_mock_services() -> None:
    """Register mock services for testing"""
    container = get_service_container()
    
    # Override with mock services
    container.override_service("project_service", create_mock_project_service())
    container.override_service("openfda_service", create_mock_openfda_service())
    container.override_service("auth_service", create_mock_auth_service())
    container.override_service("health_checker", create_mock_health_checker())
    container.override_service("document_service", create_mock_document_service())


# Convenience Functions

def get_project_service() -> ProjectService:
    """Get ProjectService instance from container"""
    return get_service_container().get_service("project_service")


def get_openfda_service() -> OpenFDAService:
    """Get OpenFDAService instance from container"""
    return get_service_container().get_service("openfda_service")


def get_auth_service() -> AuthService:
    """Get AuthService instance from container"""
    return get_service_container().get_service("auth_service")


def get_health_checker() -> HealthChecker:
    """Get HealthChecker instance from container"""
    return get_service_container().get_service("health_checker")


def get_document_service() -> DocumentService:
    """Get DocumentService instance from container"""
    return get_service_container().get_service("document_service")


# Initialize default services
register_default_services()