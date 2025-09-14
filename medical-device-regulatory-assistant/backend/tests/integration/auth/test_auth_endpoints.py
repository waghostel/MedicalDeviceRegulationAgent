"""
Authentication endpoint tests for the Medical Device Regulatory Assistant API.

This module tests authentication functionality for all protected endpoints,
ensuring proper JWT token validation and error handling.
"""

import pytest
from fastapi.testclient import TestClient
from fastapi import status
from unittest.mock import patch, AsyncMock

from main import app


class TestProjectsAuthentication:
    """Test authentication for projects API endpoints"""
    
    @pytest.fixture
    def client(self):
        """FastAPI test client"""
        return TestClient(app)
    
    def test_create_project_valid_auth(self, client, authenticated_headers):
        """Test creating project with valid authentication"""
        from services.auth import TokenData, get_current_user
        from datetime import datetime, timezone, timedelta
        from main import app
        
        # Create project data
        project_data = {
            "name": "Test Medical Device Project",
            "description": "A test project for regulatory pathway discovery",
            "device_type": "Class II Medical Device",
            "intended_use": "For diagnostic testing in clinical settings"
        }
        
        # Create mock user data
        mock_user = TokenData(
            sub="test_user",
            email="test@example.com",
            name="Test User",
            exp=datetime.now(timezone.utc) + timedelta(hours=1),
            iat=datetime.now(timezone.utc)
        )
        
        # Override the dependency
        async def mock_get_current_user():
            return mock_user
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        
        try:
            # Mock the project service
            with patch('api.projects.project_service.create_project') as mock_create:
                mock_create.return_value = {
                    "id": 1,
                    "name": project_data["name"],
                    "description": project_data["description"],
                    "device_type": project_data["device_type"],
                    "intended_use": project_data["intended_use"],
                    "status": "active",
                    "created_at": "2025-09-06T10:00:00Z",
                    "updated_at": "2025-09-06T10:00:00Z"
                }
                
                # Make authenticated request
                response = client.post("/api/projects/", json=project_data, headers=authenticated_headers)
                
                # Debug: Print response details if test fails
                if response.status_code != status.HTTP_201_CREATED:
                    print(f"Response status: {response.status_code}")
                    print(f"Response content: {response.content}")
                    print(f"Response headers: {dict(response.headers)}")
                
                # Verify response
                assert response.status_code == status.HTTP_201_CREATED
                assert mock_create.called
        finally:
            # Clean up dependency override
            app.dependency_overrides.clear()
    
    def test_create_project_no_auth(self, client, unauthenticated_headers):
        """Test creating project without authentication"""
        project_data = {
            "name": "Test Medical Device Project",
            "description": "A test project for regulatory pathway discovery",
            "device_type": "Class II Medical Device",
            "intended_use": "For diagnostic testing in clinical settings"
        }
        
        response = client.post("/api/projects/", json=project_data, headers=unauthenticated_headers)
        
        # Should return 403 Forbidden (FastAPI HTTPBearer behavior for missing auth)
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_create_project_invalid_token(self, client):
        """Test creating project with invalid token"""
        project_data = {
            "name": "Test Medical Device Project",
            "description": "A test project for regulatory pathway discovery",
            "device_type": "Class II Medical Device",
            "intended_use": "For diagnostic testing in clinical settings"
        }
        
        invalid_headers = {"Authorization": "Bearer invalid.token.here"}
        
        response = client.post("/api/projects/", json=project_data, headers=invalid_headers)
        
        # Should return 401 Unauthorized
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_list_projects_valid_auth(self, client, authenticated_headers):
        """Test listing projects with valid authentication"""
        from services.auth import TokenData, get_current_user
        from datetime import datetime, timezone, timedelta
        from main import app
        
        # Create mock user data
        mock_user = TokenData(
            sub="test_user",
            email="test@example.com",
            name="Test User",
            exp=datetime.now(timezone.utc) + timedelta(hours=1),
            iat=datetime.now(timezone.utc)
        )
        
        # Override the dependency
        async def mock_get_current_user():
            return mock_user
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        
        try:
            with patch('api.projects.project_service.list_projects') as mock_list:
                mock_list.return_value = [
                    {
                        "id": 1,
                        "name": "Test Project",
                        "description": "Test Description",
                        "device_type": "Class II Medical Device",
                        "intended_use": "For testing purposes",
                        "status": "active",
                        "created_at": "2025-09-06T10:00:00Z",
                        "updated_at": "2025-09-06T10:00:00Z"
                    }
                ]
                
                response = client.get("/api/projects/", headers=authenticated_headers)
                
                assert response.status_code == status.HTTP_200_OK
                assert mock_list.called
        finally:
            app.dependency_overrides.clear()
    
    def test_list_projects_no_auth(self, client, unauthenticated_headers):
        """Test listing projects without authentication"""
        response = client.get("/api/projects/", headers=unauthenticated_headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN
    
    def test_get_project_valid_auth(self, client, authenticated_headers):
        """Test getting specific project with valid authentication"""
        from services.auth import TokenData, get_current_user
        from datetime import datetime, timezone, timedelta
        from main import app
        
        # Create mock user data
        mock_user = TokenData(
            sub="test_user",
            email="test@example.com",
            name="Test User",
            exp=datetime.now(timezone.utc) + timedelta(hours=1),
            iat=datetime.now(timezone.utc)
        )
        
        # Override the dependency
        async def mock_get_current_user():
            return mock_user
        
        app.dependency_overrides[get_current_user] = mock_get_current_user
        
        try:
            with patch('api.projects.project_service.get_project') as mock_get:
                mock_get.return_value = {
                    "id": 1,
                    "name": "Test Project",
                    "description": "Test Description",
                    "device_type": "Class II Medical Device",
                    "intended_use": "For testing purposes",
                    "status": "active",
                    "created_at": "2025-09-06T10:00:00Z",
                    "updated_at": "2025-09-06T10:00:00Z"
                }
                
                response = client.get("/api/projects/1", headers=authenticated_headers)
                
                assert response.status_code == status.HTTP_200_OK
                assert mock_get.called
        finally:
            app.dependency_overrides.clear()
    
    def test_get_project_no_auth(self, client, unauthenticated_headers):
        """Test getting specific project without authentication"""
        response = client.get("/api/projects/1", headers=unauthenticated_headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN


if __name__ == "__main__":
    pytest.main([__file__, "-v"])