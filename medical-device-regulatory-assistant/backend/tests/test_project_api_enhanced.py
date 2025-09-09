"""
Enhanced comprehensive tests for Project API endpoints.
Tests cover all endpoints, request scenarios, edge cases, validation, and authentication.
"""

import pytest
import json
from datetime import datetime, timezone
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi.testclient import TestClient
from fastapi import status

from main import app
from services.auth import TokenData
from services.projects import (
    ProjectService,
    ProjectCreateRequest,
    ProjectUpdateRequest,
    ProjectResponse,
    ProjectDashboardData,
    ProjectExportData,
    ProjectStatus
)
from exceptions.project_exceptions import (
    ProjectNotFoundError,
    ProjectAccessDeniedError,
    ProjectValidationError
)


@pytest.fixture
def mock_token_data():
    """Mock authenticated user token data"""
    return TokenData(
        sub="google_test_123",
        email="test@example.com",
        name="Test User",
        exp=datetime.now(timezone.utc),
        iat=datetime.now(timezone.utc)
    )


@pytest.fixture
def mock_project_response():
    """Mock project response data"""
    return ProjectResponse(
        id=1,
        name="Test Device",
        description="A test medical device",
        device_type="Class II",
        intended_use="For testing purposes",
        status=ProjectStatus.DRAFT,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc)
    )


@pytest.fixture
def authenticated_client(mock_token_data):
    """Create test client with mocked authentication"""
    def override_get_current_user():
        return mock_token_data
    
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    with TestClient(app) as client:
        yield client
    
    # Clean up
    app.dependency_overrides.clear()


class TestProjectAPICreate:
    """Test project creation endpoint"""
    
    @patch('api.projects.project_service')
    def test_create_project_success(self, mock_service, authenticated_client, mock_project_response):
        """Test successful project creation"""
        mock_service.create_project = AsyncMock(return_value=mock_project_response)
        
        response = authenticated_client.post(
            "/api/projects/",
            json={
                "name": "Test Device",
                "description": "A test medical device",
                "device_type": "Class II",
                "intended_use": "For testing purposes"
            }
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["name"] == "Test Device"
        assert data["device_type"] == "Class II"
        assert data["status"] == "draft"
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data
    
    @patch('api.projects.project_service')
    def test_create_project_minimal_data(self, mock_service, authenticated_client):
        """Test project creation with minimal required data"""
        minimal_response = ProjectResponse(
            id=2,
            name="Minimal Device",
            description=None,
            device_type=None,
            intended_use=None,
            status=ProjectStatus.DRAFT,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc)
        )
        mock_service.create_project = AsyncMock(return_value=minimal_response)
        
        response = authenticated_client.post(
            "/api/projects/",
            json={"name": "Minimal Device"}
        )
        
        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["name"] == "Minimal Device"
        assert data["description"] is None
        assert data["device_type"] is None
        assert data["intended_use"] is None
    
    def test_create_project_validation_error_empty_name(self, authenticated_client):
        """Test validation error for empty project name"""
        response = authenticated_client.post(
            "/api/projects/",
            json={"name": ""}
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        data = response.json()
        assert "detail" in data
        # Check that validation error mentions name field
        assert any("name" in str(error).lower() for error in data["detail"])
    
    def test_create_project_validation_error_missing_name(self, authenticated_client):
        """Test validation error for missing project name"""
        response = authenticated_client.post(
            "/api/projects/",
            json={"description": "Device without name"}
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_create_project_validation_error_long_fields(self, authenticated_client):
        """Test validation error for fields exceeding length limits"""
        response = authenticated_client.post(
            "/api/projects/",
            json={
                "name": "A" * 300,  # Exceeds 255 character limit
                "description": "B" * 3000,  # Exceeds 1000 character limit
                "device_type": "C" * 300,  # Exceeds 255 character limit
                "intended_use": "D" * 6000  # Exceeds 2000 character limit
            }
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    @patch('api.projects.project_service')
    def test_create_project_service_error(self, mock_service, authenticated_client):
        """Test handling of service layer errors"""
        mock_service.create_project = AsyncMock(
            side_effect=ProjectNotFoundError(project_id=0, user_id="test_user")
        )
        
        response = authenticated_client.post(
            "/api/projects/",
            json={"name": "Test Device"}
        )
        
        # Should return appropriate error status
        assert response.status_code >= 400
    
    def test_create_project_unauthorized(self):
        """Test project creation without authentication"""
        with TestClient(app) as client:
            response = client.post(
                "/api/projects/",
                json={"name": "Test Device"}
            )
            
            # Should return unauthorized status
            assert response.status_code in [401, 403]


class TestProjectAPIRead:
    """Test project retrieval endpoints"""
    
    @patch('api.projects.project_service')
    def test_get_project_success(self, mock_service, authenticated_client, mock_project_response):
        """Test successful project retrieval"""
        mock_service.get_project = AsyncMock(return_value=mock_project_response)
        
        response = authenticated_client.get("/api/projects/1")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["id"] == 1
        assert data["name"] == "Test Device"
        assert data["device_type"] == "Class II"
    
    @patch('api.projects.project_service')
    def test_get_project_not_found(self, mock_service, authenticated_client):
        """Test getting non-existent project"""
        mock_service.get_project = AsyncMock(
            side_effect=ProjectNotFoundError(project_id=999, user_id="test_user")
        )
        
        response = authenticated_client.get("/api/projects/999")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    @patch('api.projects.project_service')
    def test_list_projects_success(self, mock_service, authenticated_client, mock_project_response):
        """Test successful project listing"""
        mock_service.list_projects = AsyncMock(return_value=[mock_project_response])
        
        response = authenticated_client.get("/api/projects/")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == "Test Device"
    
    @patch('api.projects.project_service')
    def test_list_projects_empty(self, mock_service, authenticated_client):
        """Test listing projects when user has none"""
        mock_service.list_projects = AsyncMock(return_value=[])
        
        response = authenticated_client.get("/api/projects/")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) == 0
    
    @patch('api.projects.project_service')
    def test_list_projects_with_search(self, mock_service, authenticated_client, mock_project_response):
        """Test project listing with search parameters"""
        mock_service.list_projects = AsyncMock(return_value=[mock_project_response])
        
        response = authenticated_client.get(
            "/api/projects/?search=cardiac&status=draft&device_type=monitor&limit=10&offset=0"
        )
        
        assert response.status_code == status.HTTP_200_OK
        
        # Verify service was called with correct filters
        call_args = mock_service.list_projects.call_args
        filters = call_args[0][1]  # Second argument is filters
        assert filters.search == "cardiac"
        assert filters.status == ProjectStatus.DRAFT
        assert filters.device_type == "monitor"
        assert filters.limit == 10
        assert filters.offset == 0
    
    def test_list_projects_invalid_parameters(self, authenticated_client):
        """Test project listing with invalid parameters"""
        # Test invalid limit (too high)
        response = authenticated_client.get("/api/projects/?limit=200")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        # Test invalid offset (negative)
        response = authenticated_client.get("/api/projects/?offset=-1")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        
        # Test invalid status
        response = authenticated_client.get("/api/projects/?status=invalid_status")
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestProjectAPIUpdate:
    """Test project update endpoint"""
    
    @patch('api.projects.project_service')
    def test_update_project_success(self, mock_service, authenticated_client, mock_project_response):
        """Test successful project update"""
        updated_response = mock_project_response.model_copy(
            update={"name": "Updated Device", "status": ProjectStatus.IN_PROGRESS}
        )
        mock_service.update_project = AsyncMock(return_value=updated_response)
        
        response = authenticated_client.put(
            "/api/projects/1",
            json={
                "name": "Updated Device",
                "description": "Updated description",
                "status": "in_progress"
            }
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "Updated Device"
        assert data["status"] == "in_progress"
    
    @patch('api.projects.project_service')
    def test_update_project_partial(self, mock_service, authenticated_client, mock_project_response):
        """Test partial project update"""
        updated_response = mock_project_response.model_copy(update={"name": "Partially Updated"})
        mock_service.update_project = AsyncMock(return_value=updated_response)
        
        response = authenticated_client.put(
            "/api/projects/1",
            json={"name": "Partially Updated"}
        )
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["name"] == "Partially Updated"
    
    @patch('api.projects.project_service')
    def test_update_project_not_found(self, mock_service, authenticated_client):
        """Test updating non-existent project"""
        mock_service.update_project = AsyncMock(
            side_effect=ProjectNotFoundError(project_id=999, user_id="test_user")
        )
        
        response = authenticated_client.put(
            "/api/projects/999",
            json={"name": "Updated Name"}
        )
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_update_project_validation_error(self, authenticated_client):
        """Test update with validation errors"""
        response = authenticated_client.put(
            "/api/projects/1",
            json={
                "name": "",  # Empty name should fail
                "status": "invalid_status"  # Invalid status
            }
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_update_project_invalid_id(self, authenticated_client):
        """Test update with invalid project ID"""
        response = authenticated_client.put(
            "/api/projects/invalid_id",
            json={"name": "Updated Name"}
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestProjectAPIDelete:
    """Test project deletion endpoint"""
    
    @patch('api.projects.project_service')
    def test_delete_project_success(self, mock_service, authenticated_client):
        """Test successful project deletion"""
        mock_service.delete_project = AsyncMock(
            return_value={"message": "Project 'Test Device' deleted successfully"}
        )
        
        response = authenticated_client.delete("/api/projects/1")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "deleted successfully" in data["message"]
    
    @patch('api.projects.project_service')
    def test_delete_project_not_found(self, mock_service, authenticated_client):
        """Test deleting non-existent project"""
        mock_service.delete_project = AsyncMock(
            side_effect=ProjectNotFoundError(project_id=999, user_id="test_user")
        )
        
        response = authenticated_client.delete("/api/projects/999")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND
    
    def test_delete_project_invalid_id(self, authenticated_client):
        """Test delete with invalid project ID"""
        response = authenticated_client.delete("/api/projects/invalid_id")
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestProjectAPIDashboard:
    """Test project dashboard endpoint"""
    
    @patch('api.projects.project_service')
    def test_get_dashboard_success(self, mock_service, authenticated_client, mock_project_response):
        """Test successful dashboard data retrieval"""
        mock_dashboard_data = ProjectDashboardData(
            project=mock_project_response,
            classification=None,
            predicate_devices=[],
            progress={
                "overallProgress": 25.0,
                "nextActions": ["Complete device classification"]
            },
            recent_activity=[],
            statistics={
                "totalPredicates": 0,
                "selectedPredicates": 0,
                "averageConfidence": 0.0,
                "completionPercentage": 25.0
            },
            predicate_count=0,
            selected_predicates=0,
            document_count=0,
            interaction_count=0,
            completion_percentage=25.0
        )
        mock_service.get_dashboard_data = AsyncMock(return_value=mock_dashboard_data)
        
        response = authenticated_client.get("/api/projects/1/dashboard")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["project"]["id"] == 1
        assert data["progress"]["overallProgress"] == 25.0
        assert data["statistics"]["totalPredicates"] == 0
    
    @patch('api.projects.project_service')
    def test_get_dashboard_not_found(self, mock_service, authenticated_client):
        """Test dashboard for non-existent project"""
        mock_service.get_dashboard_data = AsyncMock(
            side_effect=ProjectNotFoundError(project_id=999, user_id="test_user")
        )
        
        response = authenticated_client.get("/api/projects/999/dashboard")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestProjectAPIExport:
    """Test project export endpoints"""
    
    @patch('api.projects.project_service')
    def test_export_project_json(self, mock_service, authenticated_client, mock_project_response):
        """Test JSON project export"""
        mock_export_data = ProjectExportData(
            project=mock_project_response,
            classifications=[],
            predicates=[],
            documents=[],
            interactions=[]
        )
        mock_service.export_project = AsyncMock(return_value=mock_export_data)
        
        response = authenticated_client.get("/api/projects/1/export?format_type=json")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.headers["content-type"] == "application/json"
        assert "attachment" in response.headers.get("content-disposition", "")
    
    @patch('api.projects.export_service')
    def test_export_project_pdf(self, mock_export_service, authenticated_client):
        """Test PDF project export"""
        mock_export_service.export_project_enhanced = AsyncMock(
            return_value=b"PDF content"
        )
        
        response = authenticated_client.get("/api/projects/1/export?format_type=pdf")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.headers["content-type"] == "application/pdf"
        assert "attachment" in response.headers.get("content-disposition", "")
    
    @patch('api.projects.project_service')
    def test_export_project_csv(self, mock_service, authenticated_client, mock_project_response):
        """Test CSV project export"""
        mock_export_data = ProjectExportData(
            project=mock_project_response,
            classifications=[],
            predicates=[],
            documents=[],
            interactions=[]
        )
        mock_service.export_project = AsyncMock(return_value=mock_export_data)
        
        response = authenticated_client.get("/api/projects/1/export?format_type=csv")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.headers["content-type"] == "text/csv; charset=utf-8"
        assert "attachment" in response.headers.get("content-disposition", "")
    
    def test_export_project_invalid_format(self, authenticated_client):
        """Test export with invalid format"""
        response = authenticated_client.get("/api/projects/1/export?format_type=invalid")
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    @patch('api.projects.project_service')
    def test_export_project_not_found(self, mock_service, authenticated_client):
        """Test export for non-existent project"""
        mock_service.export_project = AsyncMock(
            side_effect=ProjectNotFoundError(project_id=999, user_id="test_user")
        )
        
        response = authenticated_client.get("/api/projects/999/export")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND


class TestProjectAPIBackup:
    """Test project backup endpoints"""
    
    @patch('api.projects.export_service')
    def test_create_backup_success(self, mock_export_service, authenticated_client):
        """Test successful project backup creation"""
        mock_export_service.create_project_backup = AsyncMock(
            return_value={
                "success": True,
                "backup_id": "backup_123",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "integrity_verified": True
            }
        )
        
        response = authenticated_client.post("/api/projects/1/backup?backup_type=full")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["success"] is True
        assert "backup_id" in data
        assert data["integrity_verified"] is True
    
    @patch('api.projects.export_service')
    def test_create_backup_failure(self, mock_export_service, authenticated_client):
        """Test backup creation failure"""
        mock_export_service.create_project_backup = AsyncMock(
            return_value={
                "success": False,
                "error": "Insufficient storage space"
            }
        )
        
        response = authenticated_client.post("/api/projects/1/backup")
        
        assert response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR
    
    def test_create_backup_invalid_type(self, authenticated_client):
        """Test backup with invalid backup type"""
        response = authenticated_client.post("/api/projects/1/backup?backup_type=invalid")
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


class TestProjectAPIValidation:
    """Test project data validation endpoints"""
    
    @patch('api.projects.export_service')
    def test_validate_export_data_success(self, mock_export_service, authenticated_client):
        """Test successful export data validation"""
        mock_export_service.export_project_enhanced = AsyncMock(
            return_value={
                "validation": {
                    "is_valid": True,
                    "errors": [],
                    "warnings": [],
                    "validation_time_ms": 150,
                    "validated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        mock_export_service.verify_export_integrity = MagicMock(return_value=True)
        
        response = authenticated_client.get("/api/projects/1/export/validate")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["validation_status"] == "passed"
        assert len(data["errors"]) == 0
        assert data["integrity_verified"] is True
    
    @patch('api.projects.export_service')
    def test_validate_export_data_with_errors(self, mock_export_service, authenticated_client):
        """Test export data validation with errors"""
        mock_export_service.export_project_enhanced = AsyncMock(
            return_value={
                "validation": {
                    "is_valid": False,
                    "errors": ["Missing required field: intended_use"],
                    "warnings": ["Low confidence score for classification"],
                    "validation_time_ms": 200,
                    "validated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        mock_export_service.verify_export_integrity = MagicMock(return_value=False)
        
        response = authenticated_client.get("/api/projects/1/export/validate")
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["validation_status"] == "failed"
        assert len(data["errors"]) == 1
        assert len(data["warnings"]) == 1
        assert data["integrity_verified"] is False


class TestProjectAPIAuthentication:
    """Test authentication and authorization"""
    
    def test_all_endpoints_require_authentication(self):
        """Test that all endpoints require authentication"""
        with TestClient(app) as client:
            endpoints = [
                ("POST", "/api/projects/", {"name": "Test"}),
                ("GET", "/api/projects/", None),
                ("GET", "/api/projects/1", None),
                ("PUT", "/api/projects/1", {"name": "Updated"}),
                ("DELETE", "/api/projects/1", None),
                ("GET", "/api/projects/1/dashboard", None),
                ("GET", "/api/projects/1/export", None),
                ("POST", "/api/projects/1/backup", None),
                ("GET", "/api/projects/1/export/validate", None)
            ]
            
            for method, url, json_data in endpoints:
                if method == "POST":
                    response = client.post(url, json=json_data)
                elif method == "PUT":
                    response = client.put(url, json=json_data)
                elif method == "DELETE":
                    response = client.delete(url)
                else:  # GET
                    response = client.get(url)
                
                # Should return unauthorized status
                assert response.status_code in [401, 403], f"Endpoint {method} {url} should require authentication"
    
    @patch('api.projects.get_current_user')
    def test_invalid_token_handling(self, mock_get_user):
        """Test handling of invalid authentication tokens"""
        mock_get_user.side_effect = Exception("Invalid token")
        
        with TestClient(app) as client:
            response = client.get("/api/projects/")
            
            # Should return error status
            assert response.status_code >= 400


class TestProjectAPIErrorHandling:
    """Test comprehensive error handling"""
    
    @patch('api.projects.project_service')
    def test_service_exception_handling(self, mock_service, authenticated_client):
        """Test handling of various service exceptions"""
        # Test different exception types
        exceptions_to_test = [
            (ProjectNotFoundError(project_id=1, user_id="test"), 404),
            (ProjectAccessDeniedError(project_id=1, user_id="test"), 403),
            (ProjectValidationError("name", "", "required"), 400),
            (Exception("Unexpected error"), 500)
        ]
        
        for exception, expected_status in exceptions_to_test:
            mock_service.get_project = AsyncMock(side_effect=exception)
            
            response = authenticated_client.get("/api/projects/1")
            
            # Should return appropriate status code
            assert response.status_code >= 400
    
    @patch('api.projects.project_service')
    def test_malformed_request_handling(self, mock_service, authenticated_client):
        """Test handling of malformed requests"""
        # Test invalid JSON
        response = authenticated_client.post(
            "/api/projects/",
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
    
    def test_method_not_allowed(self, authenticated_client):
        """Test method not allowed responses"""
        # PATCH is not supported
        response = authenticated_client.patch("/api/projects/1", json={"name": "Test"})
        
        assert response.status_code == status.HTTP_405_METHOD_NOT_ALLOWED
    
    def test_content_type_validation(self, authenticated_client):
        """Test content type validation for POST/PUT requests"""
        # Test without content-type header
        response = authenticated_client.post(
            "/api/projects/",
            data='{"name": "Test"}',
            headers={"Content-Type": "text/plain"}
        )
        
        # Should handle gracefully
        assert response.status_code in [400, 415, 422]


# Import the get_current_user dependency for mocking
from api.projects import get_current_user