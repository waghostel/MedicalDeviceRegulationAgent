"""
Tests for service dependency injection fixes.

This test file verifies that all services can be properly instantiated with
dependency injection and that the service factory functions work correctly.
"""

import pytest
import pytest_asyncio
from unittest.mock import Mock, AsyncMock
from datetime import datetime, timezone, timedelta

from services.projects import ProjectService
from services.openfda import OpenFDAService
from services.auth import AuthService, TokenData
from services.health import HealthChecker
from services.document_service import DocumentService
from services.factories import (
    ServiceContainer,
    create_project_service,
    create_openfda_service_factory,
    create_auth_service,
    create_health_checker,
    create_document_service,
    create_mock_project_service,
    create_mock_openfda_service,
    create_mock_auth_service,
    create_mock_health_checker,
    create_mock_document_service,
    get_service_container
)
from database.connection import DatabaseManager


class TestServiceDependencyInjection:
    """Test service dependency injection functionality"""
    
    def test_project_service_constructor_injection(self):
        """Test ProjectService accepts database manager through constructor"""
        # Create mock database manager
        mock_db_manager = Mock(spec=DatabaseManager)
        
        # Create service with injected dependency
        service = ProjectService(db_manager=mock_db_manager)
        
        # Verify dependency was injected
        assert service.db_manager is mock_db_manager
    
    def test_project_service_setter_injection(self):
        """Test ProjectService allows setting database manager for testing"""
        # Create service without dependency
        service = ProjectService()
        
        # Create mock database manager
        mock_db_manager = Mock(spec=DatabaseManager)
        
        # Set dependency using setter
        service.set_db_manager(mock_db_manager)
        
        # Verify dependency was set
        assert service.db_manager is mock_db_manager
    
    def test_openfda_service_constructor_injection(self):
        """Test OpenFDAService accepts dependencies through constructor"""
        # Create mock dependencies
        mock_redis = AsyncMock()
        mock_http_client = AsyncMock()
        
        # Create service with injected dependencies
        service = OpenFDAService(
            api_key="test_key",
            redis_client=mock_redis,
            http_client=mock_http_client,
            cache_ttl=1800
        )
        
        # Verify dependencies were injected
        assert service.api_key == "test_key"
        assert service.redis_client is mock_redis
        assert service.http_client is mock_http_client
        assert service.cache_ttl == 1800
    
    def test_auth_service_constructor_injection(self):
        """Test AuthService accepts secret key through constructor"""
        # Create service with injected secret key
        service = AuthService(secret_key="test_secret", algorithm="HS512")
        
        # Verify dependencies were injected
        assert service.secret_key == "test_secret"
        assert service.algorithm == "HS512"
    
    def test_health_checker_constructor_injection(self):
        """Test HealthChecker accepts dependencies through constructor"""
        # Create service with injected dependencies
        service = HealthChecker(
            database_path="/test/path/db.sqlite",
            fda_api_url="https://test.fda.gov/api"
        )
        
        # Verify dependencies were injected
        assert service.database_path == "/test/path/db.sqlite"
        assert service.fda_api_url == "https://test.fda.gov/api"
    
    def test_document_service_constructor_injection(self):
        """Test DocumentService accepts dependencies through constructor"""
        # Create mock dependencies
        mock_db_session = AsyncMock()
        mock_config = Mock()
        mock_processing_tool = Mock()
        
        # Create service with injected dependencies
        service = DocumentService(
            db_session=mock_db_session,
            config=mock_config,
            processing_tool=mock_processing_tool
        )
        
        # Verify dependencies were injected
        assert service.db is mock_db_session
        assert service.config is mock_config
        assert service.processing_tool is mock_processing_tool
    
    def test_document_service_setter_injection(self):
        """Test DocumentService allows setting database session for testing"""
        # Create service without dependency
        service = DocumentService()
        
        # Create mock database session
        mock_db_session = AsyncMock()
        
        # Set dependency using setter
        service.set_db_session(mock_db_session)
        
        # Verify dependency was set
        assert service.db is mock_db_session


class TestServiceFactories:
    """Test service factory functions"""
    
    def test_create_project_service_factory(self):
        """Test project service factory function"""
        # Create mock database manager
        mock_db_manager = Mock(spec=DatabaseManager)
        
        # Create service using factory
        service = create_project_service(db_manager=mock_db_manager)
        
        # Verify service was created correctly
        assert isinstance(service, ProjectService)
        assert service.db_manager is mock_db_manager
    
    def test_create_project_service_factory_no_db_manager(self):
        """Test project service factory without database manager"""
        # Create service using factory without db_manager
        service = create_project_service()
        
        # Verify service was created
        assert isinstance(service, ProjectService)
        # db_manager will be None initially and lazy-loaded when accessed
    
    @pytest.mark.asyncio
    async def test_create_openfda_service_factory(self):
        """Test OpenFDA service factory function"""
        # Create service using factory
        service = await create_openfda_service_factory(
            api_key="test_key",
            cache_ttl=1800
        )
        
        # Verify service was created correctly
        assert isinstance(service, OpenFDAService)
        assert service.api_key == "test_key"
        assert service.cache_ttl == 1800
    
    def test_create_auth_service_factory(self):
        """Test auth service factory function"""
        # Create service using factory
        service = create_auth_service(
            secret_key="test_secret",
            algorithm="HS512"
        )
        
        # Verify service was created correctly
        assert isinstance(service, AuthService)
        assert service.secret_key == "test_secret"
        assert service.algorithm == "HS512"
    
    def test_create_health_checker_factory(self):
        """Test health checker factory function"""
        # Create service using factory
        service = create_health_checker(
            database_path="/test/db.sqlite",
            fda_api_url="https://test.fda.gov"
        )
        
        # Verify service was created correctly
        assert isinstance(service, HealthChecker)
        assert service.database_path == "/test/db.sqlite"
        assert service.fda_api_url == "https://test.fda.gov"
    
    def test_create_document_service_factory(self):
        """Test document service factory function"""
        # Create mock dependencies
        mock_db_session = AsyncMock()
        mock_processing_tool = Mock()
        
        # Create service using factory with processing tool to avoid config issues
        service = create_document_service(
            db_session=mock_db_session,
            processing_tool=mock_processing_tool
        )
        
        # Verify service was created correctly
        assert isinstance(service, DocumentService)
        assert service.db is mock_db_session
        assert service.processing_tool is mock_processing_tool


class TestMockServiceFactories:
    """Test mock service factory functions"""
    
    def test_create_mock_project_service(self):
        """Test mock project service factory"""
        mock_service = create_mock_project_service()
        
        # Verify mock was created with correct spec
        assert hasattr(mock_service, 'create_project')
        assert hasattr(mock_service, 'get_project')
        assert hasattr(mock_service, 'update_project')
        assert hasattr(mock_service, 'delete_project')
        assert hasattr(mock_service, 'list_projects')
        assert hasattr(mock_service, 'get_dashboard_data')
        assert hasattr(mock_service, 'export_project')
        
        # Verify methods are async mocks
        assert isinstance(mock_service.create_project, AsyncMock)
        assert isinstance(mock_service.get_project, AsyncMock)
    
    def test_create_mock_openfda_service(self):
        """Test mock OpenFDA service factory"""
        mock_service = create_mock_openfda_service()
        
        # Verify mock was created with correct methods
        assert hasattr(mock_service, 'search_predicates')
        assert hasattr(mock_service, 'get_device_details')
        assert hasattr(mock_service, 'health_check')
        
        # Verify methods are async mocks
        assert isinstance(mock_service.search_predicates, AsyncMock)
        assert isinstance(mock_service.get_device_details, AsyncMock)
        assert isinstance(mock_service.health_check, AsyncMock)
    
    def test_create_mock_auth_service(self):
        """Test mock auth service factory"""
        mock_service = create_mock_auth_service()
        
        # Verify mock was created with correct methods
        assert hasattr(mock_service, 'verify_token')
        
        # Test default return value
        token_data = mock_service.verify_token("test_token")
        assert isinstance(token_data, TokenData)
        assert token_data.sub == "test_user_id"
        assert token_data.email == "test@example.com"
    
    def test_create_mock_health_checker(self):
        """Test mock health checker factory"""
        mock_service = create_mock_health_checker()
        
        # Verify mock was created with correct methods
        assert hasattr(mock_service, 'check_database')
        assert hasattr(mock_service, 'check_fda_api')
        assert hasattr(mock_service, 'check_redis_cache')
        assert hasattr(mock_service, 'check_all')
        
        # Verify methods are async mocks
        assert isinstance(mock_service.check_database, AsyncMock)
        assert isinstance(mock_service.check_all, AsyncMock)
    
    def test_create_mock_document_service(self):
        """Test mock document service factory"""
        mock_service = create_mock_document_service()
        
        # Verify mock was created with correct methods
        assert hasattr(mock_service, 'process_document')
        assert hasattr(mock_service, 'search_documents')
        assert hasattr(mock_service, 'get_document_by_id')
        
        # Verify methods are async mocks
        assert isinstance(mock_service.process_document, AsyncMock)
        assert isinstance(mock_service.search_documents, AsyncMock)


class TestServiceContainer:
    """Test service container functionality"""
    
    def test_service_container_register_and_get_service(self):
        """Test service container can register and retrieve services"""
        container = ServiceContainer()
        
        # Create mock service
        mock_service = Mock()
        
        # Register service
        container.register_service("test_service", mock_service)
        
        # Retrieve service
        retrieved_service = container.get_service("test_service")
        
        # Verify it's the same instance
        assert retrieved_service is mock_service
    
    def test_service_container_register_and_get_factory(self):
        """Test service container can register and use factories"""
        container = ServiceContainer()
        
        # Create mock factory
        mock_service = Mock()
        mock_factory = Mock(return_value=mock_service)
        
        # Register factory
        container.register_factory("test_service", mock_factory)
        
        # Get service (should call factory)
        retrieved_service = container.get_service("test_service")
        
        # Verify factory was called and service returned
        mock_factory.assert_called_once()
        assert retrieved_service is mock_service
    
    def test_service_container_override_service(self):
        """Test service container can override services for testing"""
        container = ServiceContainer()
        
        # Register original service
        original_service = Mock()
        container.register_service("test_service", original_service)
        
        # Override with mock
        mock_service = Mock()
        container.override_service("test_service", mock_service)
        
        # Get service (should return override)
        retrieved_service = container.get_service("test_service")
        
        # Verify override was returned
        assert retrieved_service is mock_service
        assert retrieved_service is not original_service
    
    def test_service_container_clear_overrides(self):
        """Test service container can clear overrides"""
        container = ServiceContainer()
        
        # Register original service
        original_service = Mock()
        container.register_service("test_service", original_service)
        
        # Override with mock
        mock_service = Mock()
        container.override_service("test_service", mock_service)
        
        # Clear overrides
        container.clear_overrides()
        
        # Get service (should return original)
        retrieved_service = container.get_service("test_service")
        
        # Verify original was returned
        assert retrieved_service is original_service
    
    def test_service_container_service_not_found(self):
        """Test service container raises error for unknown services"""
        container = ServiceContainer()
        
        # Try to get non-existent service
        with pytest.raises(ValueError, match="Service 'unknown_service' not found"):
            container.get_service("unknown_service")
    
    def test_global_service_container(self):
        """Test global service container functionality"""
        # Get global container
        container = get_service_container()
        
        # Verify it's a ServiceContainer instance
        assert isinstance(container, ServiceContainer)
        
        # Verify it's the same instance on subsequent calls
        container2 = get_service_container()
        assert container is container2


class TestServiceIntegration:
    """Test service integration with dependency injection"""
    
    def test_project_service_with_mock_db_manager(self, test_db_session):
        """Test ProjectService works with mock database manager"""
        # Create mock database manager with proper async context manager
        mock_db_manager = Mock(spec=DatabaseManager)
        
        # Create async context manager mock
        async_context_mock = AsyncMock()
        async_context_mock.__aenter__.return_value = test_db_session
        async_context_mock.__aexit__.return_value = None
        mock_db_manager.get_session.return_value = async_context_mock
        
        # Create service with mock
        service = ProjectService(db_manager=mock_db_manager)
        
        # Verify service can be used
        assert service.db_manager is mock_db_manager
    
    def test_auth_service_with_test_secret(self):
        """Test AuthService works with test secret key"""
        # Create service with test secret
        service = AuthService(secret_key="test_secret_for_testing")
        
        # Create test token
        import jwt
        from datetime import datetime, timezone, timedelta
        
        payload = {
            "sub": "test_user",
            "email": "test@example.com",
            "name": "Test User",
            "exp": int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp()),
            "iat": int(datetime.now(timezone.utc).timestamp())
        }
        
        token = jwt.encode(payload, "test_secret_for_testing", algorithm="HS256")
        
        # Verify token can be validated
        token_data = service.verify_token(token)
        assert token_data.sub == "test_user"
        assert token_data.email == "test@example.com"
    
    def test_health_checker_with_test_paths(self):
        """Test HealthChecker works with test paths"""
        # Create service with test paths
        service = HealthChecker(
            database_path=":memory:",
            fda_api_url="https://httpbin.org/json"
        )
        
        # Verify paths were set
        assert service.database_path == ":memory:"
        assert service.fda_api_url == "https://httpbin.org/json"