"""
Tests for ProjectService dependency injection functionality.

This test file specifically tests the dependency injection fixes for ProjectService
to ensure that the service can be properly instantiated and configured for testing.
"""

import pytest
import pytest_asyncio
from unittest.mock import Mock, AsyncMock
from datetime import datetime, timezone

from services.projects import ProjectService, ProjectCreateRequest, ProjectStatus
from services.factories import create_project_service
from database.connection import DatabaseManager
from models.user import User
from models.project import Project


class TestProjectServiceDependencyInjection:
    """Test ProjectService dependency injection functionality"""
    
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
    
    def test_project_service_lazy_initialization(self):
        """Test ProjectService lazy initialization when no db_manager provided"""
        # Create service without dependency
        service = ProjectService()
        
        # The db_manager should be None initially
        assert service._db_manager is None
        
        # When accessed, it should get the global database manager
        # In test environment, this is initialized by fixtures
        db_manager = service.db_manager
        assert db_manager is not None
    
    def test_project_service_factory_function(self):
        """Test project service factory function"""
        # Create mock database manager
        mock_db_manager = Mock(spec=DatabaseManager)
        
        # Create service using factory
        service = create_project_service(db_manager=mock_db_manager)
        
        # Verify service was created correctly
        assert isinstance(service, ProjectService)
        assert service.db_manager is mock_db_manager
    
    @pytest.mark.asyncio
    async def test_project_service_with_mock_database_operations(self, test_db_session):
        """Test ProjectService operations with mocked database"""
        # Create mock database manager with proper async context manager
        mock_db_manager = Mock(spec=DatabaseManager)
        
        # Create async context manager mock
        async_context_mock = AsyncMock()
        async_context_mock.__aenter__.return_value = test_db_session
        async_context_mock.__aexit__.return_value = None
        mock_db_manager.get_session.return_value = async_context_mock
        
        # Create service with mock
        service = ProjectService(db_manager=mock_db_manager)
        
        # Create test user in the session
        user = User(
            email="test@example.com",
            name="Test User",
            google_id="google_test_123"
        )
        test_db_session.add(user)
        await test_db_session.commit()
        await test_db_session.refresh(user)
        
        # Create project data
        project_data = ProjectCreateRequest(
            name="Test Device",
            description="A test medical device",
            device_type="Class II",
            intended_use="For testing purposes"
        )
        
        # Test project creation
        result = await service.create_project(project_data, user.google_id)
        
        # Verify result
        assert result.name == "Test Device"
        assert result.description == "A test medical device"
        assert result.device_type == "Class II"
        assert result.intended_use == "For testing purposes"
        assert result.status == ProjectStatus.DRAFT
        assert result.id is not None
        
        # Verify mock was called
        mock_db_manager.get_session.assert_called()
    
    @pytest.mark.asyncio
    async def test_project_service_get_project_with_mock(self, test_db_session):
        """Test ProjectService get_project with mocked database"""
        # Create mock database manager
        mock_db_manager = Mock(spec=DatabaseManager)
        
        # Create async context manager mock
        async_context_mock = AsyncMock()
        async_context_mock.__aenter__.return_value = test_db_session
        async_context_mock.__aexit__.return_value = None
        mock_db_manager.get_session.return_value = async_context_mock
        
        # Create service with mock
        service = ProjectService(db_manager=mock_db_manager)
        
        # Create test user and project in the session
        user = User(
            email="test@example.com",
            name="Test User",
            google_id="google_test_123"
        )
        test_db_session.add(user)
        await test_db_session.commit()
        await test_db_session.refresh(user)
        
        project = Project(
            user_id=user.id,
            name="Test Project",
            description="Test description",
            device_type="Class I",
            intended_use="Test use",
            status=ProjectStatus.DRAFT
        )
        test_db_session.add(project)
        await test_db_session.commit()
        await test_db_session.refresh(project)
        
        # Test project retrieval
        result = await service.get_project(project.id, user.google_id)
        
        # Verify result
        assert result.id == project.id
        assert result.name == "Test Project"
        assert result.description == "Test description"
        
        # Verify mock was called
        mock_db_manager.get_session.assert_called()
    
    def test_project_service_property_access(self):
        """Test that db_manager property works correctly"""
        # Create mock database manager
        mock_db_manager = Mock(spec=DatabaseManager)
        
        # Create service with injected dependency
        service = ProjectService(db_manager=mock_db_manager)
        
        # Access property multiple times
        db1 = service.db_manager
        db2 = service.db_manager
        
        # Should return the same instance
        assert db1 is mock_db_manager
        assert db2 is mock_db_manager
        assert db1 is db2
    
    def test_project_service_setter_overrides_constructor(self):
        """Test that setter can override constructor-injected dependency"""
        # Create initial mock database manager
        initial_mock = Mock(spec=DatabaseManager)
        
        # Create service with initial dependency
        service = ProjectService(db_manager=initial_mock)
        
        # Verify initial dependency
        assert service.db_manager is initial_mock
        
        # Create new mock and set it
        new_mock = Mock(spec=DatabaseManager)
        service.set_db_manager(new_mock)
        
        # Verify new dependency
        assert service.db_manager is new_mock
        assert service.db_manager is not initial_mock


class TestProjectServiceIntegrationWithFactories:
    """Test ProjectService integration with service factories"""
    
    def test_factory_creates_service_with_no_args(self):
        """Test factory can create service without arguments"""
        service = create_project_service()
        
        # Verify service was created
        assert isinstance(service, ProjectService)
        # In test environment, db_manager is provided by factory
        assert service._db_manager is not None
    
    def test_factory_creates_service_with_db_manager(self):
        """Test factory can create service with database manager"""
        mock_db_manager = Mock(spec=DatabaseManager)
        
        service = create_project_service(db_manager=mock_db_manager)
        
        # Verify service was created with dependency
        assert isinstance(service, ProjectService)
        assert service.db_manager is mock_db_manager
    
    def test_multiple_services_from_factory_are_independent(self):
        """Test that multiple services created from factory are independent"""
        mock_db1 = Mock(spec=DatabaseManager)
        mock_db2 = Mock(spec=DatabaseManager)
        
        service1 = create_project_service(db_manager=mock_db1)
        service2 = create_project_service(db_manager=mock_db2)
        
        # Verify services are different instances
        assert service1 is not service2
        assert service1.db_manager is mock_db1
        assert service2.db_manager is mock_db2
        assert service1.db_manager is not service2.db_manager


class TestProjectServiceErrorHandling:
    """Test ProjectService error handling with dependency injection"""
    
    @pytest.mark.asyncio
    async def test_service_handles_database_errors_gracefully(self):
        """Test service handles database errors gracefully"""
        # Create mock database manager that raises errors
        mock_db_manager = Mock(spec=DatabaseManager)
        mock_db_manager.get_session.side_effect = Exception("Database connection failed")
        
        # Create service with mock
        service = ProjectService(db_manager=mock_db_manager)
        
        # Create project data
        project_data = ProjectCreateRequest(
            name="Test Device",
            description="A test medical device"
        )
        
        # Test that service handles the error
        with pytest.raises(Exception):  # Should propagate the database error
            await service.create_project(project_data, "test_user")
    
    def test_service_handles_missing_database_manager(self):
        """Test service handles missing database manager gracefully"""
        # Create service without database manager
        service = ProjectService()
        
        # In test environment, db_manager is available through global initialization
        # So we test that the service can access it
        db_manager = service.db_manager
        assert db_manager is not None