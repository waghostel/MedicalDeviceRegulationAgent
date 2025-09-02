"""
Tests for project API endpoints
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock

from main import app
from models.user import User
from services.projects import ProjectCreateRequest, ProjectResponse, ProjectStatus


@pytest.fixture
def client(mock_user):
    """Create test client with mocked authentication"""
    from api.projects import get_current_user
    from services.projects import ProjectService
    
    # Override dependencies
    def override_get_current_user():
        return mock_user
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    client = TestClient(app)
    
    yield client
    
    # Clean up
    app.dependency_overrides.clear()


@pytest.fixture
def mock_user():
    """Mock authenticated user"""
    return User(
        id=1,
        email="test@example.com",
        name="Test User",
        google_id="google_test_123"
    )


@pytest.fixture
def mock_project_response():
    """Mock project response"""
    return ProjectResponse(
        id=1,
        name="Test Device",
        description="A test medical device",
        device_type="Class II",
        intended_use="For testing purposes",
        status=ProjectStatus.DRAFT,
        created_at="2023-01-01T00:00:00",
        updated_at="2023-01-01T00:00:00"
    )


class TestProjectAPI:
    """Test cases for Project API endpoints"""
    
    @patch('services.projects.ProjectService')
    def test_create_project_success(self, mock_service_class, client, mock_user, mock_project_response):
        """Test successful project creation via API"""
        # Setup mocks
        mock_service = AsyncMock()
        mock_service.create_project.return_value = mock_project_response
        mock_service_class.return_value = mock_service
        
        # Make request
        response = client.post(
            "/api/projects/",
            json={
                "name": "Test Device",
                "description": "A test medical device",
                "device_type": "Class II",
                "intended_use": "For testing purposes"
            }
        )
        
        # Verify response
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Test Device"
        assert data["device_type"] == "Class II"
        assert data["status"] == "draft"
    
    @patch('api.projects.get_current_user')
    @patch('api.projects.ProjectService')
    def test_get_project_success(self, mock_service_class, mock_get_user, client, mock_user, mock_project_response):
        """Test successful project retrieval via API"""
        # Setup mocks
        mock_get_user.return_value = mock_user
        mock_service = AsyncMock()
        mock_service.get_project.return_value = mock_project_response
        mock_service_class.return_value = mock_service
        
        # Make request
        response = client.get("/api/projects/1")
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 1
        assert data["name"] == "Test Device"
    
    @patch('api.projects.get_current_user')
    @patch('api.projects.ProjectService')
    def test_list_projects_success(self, mock_service_class, mock_get_user, client, mock_user, mock_project_response):
        """Test successful project listing via API"""
        # Setup mocks
        mock_get_user.return_value = mock_user
        mock_service = AsyncMock()
        mock_service.list_projects.return_value = [mock_project_response]
        mock_service_class.return_value = mock_service
        
        # Make request
        response = client.get("/api/projects/")
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Test Device"
    
    @patch('api.projects.get_current_user')
    @patch('api.projects.ProjectService')
    def test_update_project_success(self, mock_service_class, mock_get_user, client, mock_user, mock_project_response):
        """Test successful project update via API"""
        # Setup mocks
        mock_get_user.return_value = mock_user
        mock_service = AsyncMock()
        updated_response = mock_project_response.model_copy(update={"name": "Updated Device"})
        mock_service.update_project.return_value = updated_response
        mock_service_class.return_value = mock_service
        
        # Make request
        response = client.put(
            "/api/projects/1",
            json={"name": "Updated Device"}
        )
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Device"
    
    @patch('api.projects.get_current_user')
    @patch('api.projects.ProjectService')
    def test_delete_project_success(self, mock_service_class, mock_get_user, client, mock_user):
        """Test successful project deletion via API"""
        # Setup mocks
        mock_get_user.return_value = mock_user
        mock_service = AsyncMock()
        mock_service.delete_project.return_value = {"message": "Project deleted successfully"}
        mock_service_class.return_value = mock_service
        
        # Make request
        response = client.delete("/api/projects/1")
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert "deleted successfully" in data["message"]
    
    def test_create_project_validation_error(self, client):
        """Test project creation with validation errors"""
        response = client.post(
            "/api/projects/",
            json={"name": ""}  # Empty name should fail validation
        )
        
        assert response.status_code == 422  # Validation error
    
    @patch('api.projects.get_current_user')
    def test_unauthorized_access(self, mock_get_user, client):
        """Test unauthorized access to protected endpoints"""
        mock_get_user.side_effect = Exception("Unauthorized")
        
        response = client.get("/api/projects/")
        
        # Should return error (exact status depends on auth implementation)
        assert response.status_code >= 400