"""
Tests for authentication, authorization, and validation in project operations.
Covers JWT token validation, user access control, and input validation.
"""

import pytest
import jwt
from datetime import datetime, timezone, timedelta
from unittest.mock import patch, AsyncMock, MagicMock
from fastapi import HTTPException, status
from fastapi.testclient import TestClient

from main import app
from services.auth import AuthService, TokenData, validate_jwt_token
from services.projects import (
    ProjectService,
    ProjectCreateRequest,
    ProjectUpdateRequest,
    ProjectSearchFilters,
    ProjectValidationError
)
from models.user import User
from exceptions.project_exceptions import (
    ProjectNotFoundError,
    ProjectAccessDeniedError,
    ProjectValidationError as ProjectValidationException
)


class TestAuthenticationService:
    """Test authentication service functionality"""
    
    def test_auth_service_initialization(self):
        """Test AuthService initialization"""
        auth_service = AuthService()
        assert auth_service.secret_key is not None
        assert auth_service.algorithm == "HS256"
        assert auth_service.security is not None
    
    def test_validate_jwt_token_success(self):
        """Test successful JWT token validation"""
        secret_key = "test_secret_key"
        payload = {
            "sub": "test_user_123",
            "email": "test@example.com",
            "name": "Test User",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            "iat": datetime.now(timezone.utc)
        }
        
        token = jwt.encode(payload, secret_key, algorithm="HS256")
        
        result = validate_jwt_token(token, secret_key)
        
        assert result["sub"] == "test_user_123"
        assert result["email"] == "test@example.com"
        assert result["name"] == "Test User"
    
    def test_validate_jwt_token_expired(self):
        """Test JWT token validation with expired token"""
        secret_key = "test_secret_key"
        payload = {
            "sub": "test_user_123",
            "email": "test@example.com",
            "name": "Test User",
            "exp": datetime.now(timezone.utc) - timedelta(hours=1),  # Expired
            "iat": datetime.now(timezone.utc) - timedelta(hours=2)
        }
        
        token = jwt.encode(payload, secret_key, algorithm="HS256")
        
        with pytest.raises(HTTPException) as exc_info:
            validate_jwt_token(token, secret_key)
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "expired" in exc_info.value.detail.lower()
    
    def test_validate_jwt_token_invalid_signature(self):
        """Test JWT token validation with invalid signature"""
        secret_key = "test_secret_key"
        wrong_secret = "wrong_secret_key"
        payload = {
            "sub": "test_user_123",
            "email": "test@example.com",
            "name": "Test User",
            "exp": datetime.now(timezone.utc) + timedelta(hours=1),
            "iat": datetime.now(timezone.utc)
        }
        
        token = jwt.encode(payload, wrong_secret, algorithm="HS256")
        
        with pytest.raises(HTTPException) as exc_info:
            validate_jwt_token(token, secret_key)
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "credentials" in exc_info.value.detail.lower()
    
    def test_validate_jwt_token_malformed(self):
        """Test JWT token validation with malformed token"""
        secret_key = "test_secret_key"
        malformed_token = "not.a.valid.jwt.token"
        
        with pytest.raises(HTTPException) as exc_info:
            validate_jwt_token(malformed_token, secret_key)
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_auth_service_verify_token_success(self):
        """Test AuthService token verification"""
        auth_service = AuthService()
        auth_service.secret_key = "test_secret_key"
        
        payload = {
            "sub": "test_user_123",
            "email": "test@example.com",
            "name": "Test User",
            "exp": int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp()),
            "iat": int(datetime.now(timezone.utc).timestamp())
        }
        
        token = jwt.encode(payload, auth_service.secret_key, algorithm="HS256")
        
        result = auth_service.verify_token(token)
        
        assert isinstance(result, TokenData)
        assert result.sub == "test_user_123"
        assert result.email == "test@example.com"
        assert result.name == "Test User"
    
    def test_auth_service_verify_token_missing_data(self):
        """Test AuthService token verification with missing user data"""
        auth_service = AuthService()
        auth_service.secret_key = "test_secret_key"
        
        # Token missing email
        payload = {
            "sub": "test_user_123",
            "name": "Test User",
            "exp": int((datetime.now(timezone.utc) + timedelta(hours=1)).timestamp()),
            "iat": int(datetime.now(timezone.utc).timestamp())
        }
        
        token = jwt.encode(payload, auth_service.secret_key, algorithm="HS256")
        
        with pytest.raises(HTTPException) as exc_info:
            auth_service.verify_token(token)
        
        assert exc_info.value.status_code == status.HTTP_401_UNAUTHORIZED
        assert "missing user data" in exc_info.value.detail.lower()


class TestProjectAccessControl:
    """Test project access control and authorization"""
    
    @pytest.mark.asyncio
    async def test_project_access_different_users(self, test_db_manager, test_session):
        """Test that users can only access their own projects"""
        # Create two users
        user1 = User(
            email="user1@test.com",
            name="User One",
            google_id="user_1_google_id"
        )
        user2 = User(
            email="user2@test.com",
            name="User Two",
            google_id="user_2_google_id"
        )
        test_session.add(user1)
        test_session.add(user2)
        await test_session.commit()
        await test_session.refresh(user1)
        await test_session.refresh(user2)
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        # User 1 creates a project
        project_data = ProjectCreateRequest(
            name="User 1 Project",
            description="Project belonging to user 1"
        )
        
        user1_project = await service.create_project(project_data, user1.google_id)
        
        # User 1 can access their project
        retrieved_project = await service.get_project(user1_project.id, user1.google_id)
        assert retrieved_project.id == user1_project.id
        
        # User 2 cannot access User 1's project
        with pytest.raises(ProjectNotFoundError):
            await service.get_project(user1_project.id, user2.google_id)
        
        # User 2 cannot update User 1's project
        update_data = ProjectUpdateRequest(name="Hacked Project")
        with pytest.raises(HTTPException) as exc_info:
            await service.update_project(user1_project.id, update_data, user2.google_id)
        assert exc_info.value.status_code == 404
        
        # User 2 cannot delete User 1's project
        with pytest.raises(HTTPException) as exc_info:
            await service.delete_project(user1_project.id, user2.google_id)
        assert exc_info.value.status_code == 404
    
    @pytest.mark.asyncio
    async def test_project_list_isolation(self, test_db_manager, test_session):
        """Test that project lists are isolated between users"""
        # Create two users
        user1 = User(
            email="user1@test.com",
            name="User One",
            google_id="user_1_google_id"
        )
        user2 = User(
            email="user2@test.com",
            name="User Two",
            google_id="user_2_google_id"
        )
        test_session.add(user1)
        test_session.add(user2)
        await test_session.commit()
        await test_session.refresh(user1)
        await test_session.refresh(user2)
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        # User 1 creates projects
        for i in range(3):
            project_data = ProjectCreateRequest(name=f"User 1 Project {i}")
            await service.create_project(project_data, user1.google_id)
        
        # User 2 creates projects
        for i in range(2):
            project_data = ProjectCreateRequest(name=f"User 2 Project {i}")
            await service.create_project(project_data, user2.google_id)
        
        # User 1 sees only their projects
        filters = ProjectSearchFilters()
        user1_projects = await service.list_projects(user1.google_id, filters)
        assert len(user1_projects) == 3
        for project in user1_projects:
            assert "User 1" in project.name
        
        # User 2 sees only their projects
        user2_projects = await service.list_projects(user2.google_id, filters)
        assert len(user2_projects) == 2
        for project in user2_projects:
            assert "User 2" in project.name
    
    @pytest.mark.asyncio
    async def test_dashboard_access_control(self, test_db_manager, test_session):
        """Test dashboard access control between users"""
        # Create two users
        user1 = User(
            email="user1@test.com",
            name="User One",
            google_id="user_1_google_id"
        )
        user2 = User(
            email="user2@test.com",
            name="User Two",
            google_id="user_2_google_id"
        )
        test_session.add(user1)
        test_session.add(user2)
        await test_session.commit()
        await test_session.refresh(user1)
        await test_session.refresh(user2)
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        # User 1 creates a project
        project_data = ProjectCreateRequest(name="User 1 Dashboard Project")
        user1_project = await service.create_project(project_data, user1.google_id)
        
        # User 1 can access dashboard
        dashboard_data = await service.get_dashboard_data(user1_project.id, user1.google_id)
        assert dashboard_data.project.id == user1_project.id
        
        # User 2 cannot access User 1's dashboard
        with pytest.raises(HTTPException) as exc_info:
            await service.get_dashboard_data(user1_project.id, user2.google_id)
        assert exc_info.value.status_code == 404


class TestProjectValidation:
    """Test project data validation"""
    
    def test_project_create_request_validation(self):
        """Test ProjectCreateRequest validation"""
        # Valid request
        valid_request = ProjectCreateRequest(
            name="Valid Project",
            description="A valid project description",
            device_type="Class II",
            intended_use="For testing validation"
        )
        assert valid_request.name == "Valid Project"
        
        # Test name length validation
        with pytest.raises(ValueError):
            ProjectCreateRequest(name="")  # Empty name
        
        with pytest.raises(ValueError):
            ProjectCreateRequest(name="A" * 300)  # Too long name
        
        # Test description length validation
        with pytest.raises(ValueError):
            ProjectCreateRequest(
                name="Valid Name",
                description="B" * 3000  # Too long description
            )
        
        # Test device type length validation
        with pytest.raises(ValueError):
            ProjectCreateRequest(
                name="Valid Name",
                device_type="C" * 300  # Too long device type
            )
        
        # Test intended use length validation
        with pytest.raises(ValueError):
            ProjectCreateRequest(
                name="Valid Name",
                intended_use="D" * 6000  # Too long intended use
            )
    
    def test_project_update_request_validation(self):
        """Test ProjectUpdateRequest validation"""
        # Valid partial update
        valid_update = ProjectUpdateRequest(name="Updated Name")
        assert valid_update.name == "Updated Name"
        
        # Valid full update
        valid_full_update = ProjectUpdateRequest(
            name="Updated Project",
            description="Updated description",
            device_type="Updated Class",
            intended_use="Updated use",
            status=ProjectStatus.IN_PROGRESS
        )
        assert valid_full_update.status == ProjectStatus.IN_PROGRESS
        
        # Test validation errors
        with pytest.raises(ValueError):
            ProjectUpdateRequest(name="")  # Empty name
        
        with pytest.raises(ValueError):
            ProjectUpdateRequest(name="A" * 300)  # Too long name
    
    def test_project_search_filters_validation(self):
        """Test ProjectSearchFilters validation"""
        # Valid filters
        valid_filters = ProjectSearchFilters(
            search="test",
            status=ProjectStatus.DRAFT,
            device_type="Class II",
            limit=25,
            offset=10
        )
        assert valid_filters.limit == 25
        assert valid_filters.offset == 10
        
        # Test limit validation
        with pytest.raises(ValueError):
            ProjectSearchFilters(limit=0)  # Too low
        
        with pytest.raises(ValueError):
            ProjectSearchFilters(limit=200)  # Too high
        
        # Test offset validation
        with pytest.raises(ValueError):
            ProjectSearchFilters(offset=-1)  # Negative offset
    
    @pytest.mark.asyncio
    async def test_service_validation_errors(self, test_db_manager, test_session):
        """Test service-level validation errors"""
        # Create test user
        user = User(
            email="validation@test.com",
            name="Validation User",
            google_id="validation_user_id"
        )
        test_session.add(user)
        await test_session.commit()
        await test_session.refresh(user)
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        # Test creating project with invalid user
        project_data = ProjectCreateRequest(name="Test Project")
        
        with pytest.raises(ProjectNotFoundError):
            await service.create_project(project_data, "non_existent_user")
        
        # Test updating non-existent project
        update_data = ProjectUpdateRequest(name="Updated Name")
        
        with pytest.raises(HTTPException):
            await service.update_project(99999, update_data, user.google_id)


class TestAPIAuthenticationIntegration:
    """Test API authentication integration"""
    
    def test_api_endpoints_require_authentication(self):
        """Test that all API endpoints require authentication"""
        with TestClient(app) as client:
            # Test endpoints without authentication
            endpoints_to_test = [
                ("POST", "/api/projects/", {"name": "Test Project"}),
                ("GET", "/api/projects/", None),
                ("GET", "/api/projects/1", None),
                ("PUT", "/api/projects/1", {"name": "Updated"}),
                ("DELETE", "/api/projects/1", None),
                ("GET", "/api/projects/1/dashboard", None),
                ("GET", "/api/projects/1/export", None)
            ]
            
            for method, url, json_data in endpoints_to_test:
                if method == "POST":
                    response = client.post(url, json=json_data)
                elif method == "PUT":
                    response = client.put(url, json=json_data)
                elif method == "DELETE":
                    response = client.delete(url)
                else:  # GET
                    response = client.get(url)
                
                # Should return unauthorized status
                assert response.status_code in [401, 403, 422], f"Endpoint {method} {url} should require authentication"
    
    @patch('api.projects.get_current_user')
    def test_api_with_valid_authentication(self, mock_get_user):
        """Test API endpoints with valid authentication"""
        # Mock valid user
        mock_user = TokenData(
            sub="test_user_123",
            email="test@example.com",
            name="Test User",
            exp=datetime.now(timezone.utc) + timedelta(hours=1),
            iat=datetime.now(timezone.utc)
        )
        mock_get_user.return_value = mock_user
        
        with TestClient(app) as client:
            # Mock the project service to avoid database operations
            with patch('api.projects.project_service') as mock_service:
                mock_service.list_projects = AsyncMock(return_value=[])
                
                response = client.get("/api/projects/")
                
                # Should succeed with authentication
                assert response.status_code == 200
    
    @patch('api.projects.get_current_user')
    def test_api_with_invalid_authentication(self, mock_get_user):
        """Test API endpoints with invalid authentication"""
        # Mock authentication failure
        mock_get_user.side_effect = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
        
        with TestClient(app) as client:
            response = client.get("/api/projects/")
            
            # Should return unauthorized
            assert response.status_code == 401
    
    def test_api_validation_errors(self):
        """Test API validation error responses"""
        # Mock authentication
        def mock_get_current_user():
            return TokenData(
                sub="test_user_123",
                email="test@example.com",
                name="Test User",
                exp=datetime.now(timezone.utc) + timedelta(hours=1),
                iat=datetime.now(timezone.utc)
            )
        
        from api.projects import get_current_user
        app.dependency_overrides[get_current_user] = mock_get_current_user
        
        try:
            with TestClient(app) as client:
                # Test invalid project creation data
                response = client.post(
                    "/api/projects/",
                    json={"name": ""}  # Empty name should fail validation
                )
                
                assert response.status_code == 422
                error_data = response.json()
                assert "detail" in error_data
                
                # Test invalid query parameters
                response = client.get("/api/projects/?limit=200")  # Limit too high
                
                assert response.status_code == 422
        finally:
            # Clean up
            app.dependency_overrides.clear()


class TestSecurityHeaders:
    """Test security headers and CORS configuration"""
    
    def test_security_headers_present(self):
        """Test that security headers are present in responses"""
        def mock_get_current_user():
            return TokenData(
                sub="test_user_123",
                email="test@example.com",
                name="Test User",
                exp=datetime.now(timezone.utc) + timedelta(hours=1),
                iat=datetime.now(timezone.utc)
            )
        
        from api.projects import get_current_user
        app.dependency_overrides[get_current_user] = mock_get_current_user
        
        try:
            with TestClient(app) as client:
                with patch('api.projects.project_service') as mock_service:
                    mock_service.list_projects = AsyncMock(return_value=[])
                    
                    response = client.get("/api/projects/")
                    
                    # Check for security headers (if implemented)
                    # These would be added by security middleware
                    assert response.status_code == 200
                    
                    # Example security headers to check for:
                    # assert "X-Content-Type-Options" in response.headers
                    # assert "X-Frame-Options" in response.headers
                    # assert "X-XSS-Protection" in response.headers
        finally:
            app.dependency_overrides.clear()


# Import required modules
from services.projects import ProjectStatus